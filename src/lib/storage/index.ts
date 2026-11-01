import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";
const STORAGE_LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || "./uploads";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
});

export interface PresignedUploadResponse {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export function sanitizeStorageKey(storageKey: string): string | null {
  if (!storageKey || typeof storageKey !== "string") return null;
  // Disallow any path traversal characters, null bytes, Windows drive prefixes, or absolute paths
  if (
    storageKey.includes("..") ||
    storageKey.includes("\0") ||
    storageKey.startsWith("/") ||
    storageKey.startsWith("\\") ||
    /^[a-zA-Z]:/.test(storageKey)
  ) {
    return null;
  }
  // Normalize path and ensure it does not escape
  const normalized = path.normalize(storageKey).replace(/\\/g, "/");
  if (
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    path.isAbsolute(normalized) ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function validateStorageKey(storageKey: string, userId: string): boolean {
  if (!storageKey || typeof storageKey !== "string") return false;
  const sanitized = sanitizeStorageKey(storageKey);
  if (!sanitized) return false;
  const expectedPrefix = `images/${userId}/`;
  return sanitized.startsWith(expectedPrefix);
}

export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string = "image/jpeg"
): Promise<PresignedUploadResponse> {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storageKey = `images/${userId}/${uniqueId}_${sanitizedFilename}`;

  if (STORAGE_DRIVER === "s3") {
    const bucket = process.env.S3_BUCKET || "ewaste-media";
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return {
      uploadUrl,
      storageKey,
      expiresInSeconds: 3600,
    };
  }

  // Local development driver:
  // Points to local endpoint: /api/v1/uploads/local?key=...
  const uploadUrl = `/api/v1/uploads/local?key=${encodeURIComponent(storageKey)}`;
  return {
    uploadUrl,
    storageKey,
    expiresInSeconds: 3600,
  };
}

export async function saveLocalFile(storageKey: string, buffer: Buffer): Promise<void> {
  const cleanKey = sanitizeStorageKey(storageKey);
  if (!cleanKey) {
    throw new Error("Invalid or unsafe storage key");
  }
  const baseDir = path.resolve(process.cwd(), STORAGE_LOCAL_DIR);
  const fullPath = path.resolve(baseDir, cleanKey);
  if (!fullPath.startsWith(baseDir)) {
    throw new Error("Directory traversal detected");
  }
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

export async function readLocalFile(storageKey: string): Promise<Buffer | null> {
  try {
    const cleanKey = sanitizeStorageKey(storageKey);
    if (!cleanKey) return null;
    const baseDir = path.resolve(process.cwd(), STORAGE_LOCAL_DIR);
    const fullPath = path.resolve(baseDir, cleanKey);
    if (!fullPath.startsWith(baseDir)) return null;
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Stores a lot photo under images/{userId}/ and returns its storage key.
 */
export async function saveLotImage(userId: string, buffer: Buffer, contentType: string): Promise<string> {
  const ext = IMAGE_TYPES[contentType];
  if (!ext) throw new Error("Only JPEG, PNG or WebP photos are allowed");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) throw new Error("Photo must be smaller than 5 MB");

  const storageKey = `images/${userId}/${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
  if (STORAGE_DRIVER === "s3") {
    await s3Client.send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET || "ewaste-media", Key: storageKey, Body: buffer, ContentType: contentType })
    );
  } else {
    await saveLocalFile(storageKey, buffer);
  }
  return storageKey;
}

/**
 * URL a browser or app can load a stored photo from (valid for 1 hour on S3).
 */
export async function getImageUrl(storageKey: string): Promise<string> {
  if (STORAGE_DRIVER === "s3") {
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET || "ewaste-media", Key: storageKey });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }
  return `/api/v1/uploads/local?key=${encodeURIComponent(storageKey)}`;
}

export function imageContentType(storageKey: string): string {
  const ext = storageKey.split(".").pop()?.toLowerCase();
  return Object.entries(IMAGE_TYPES).find(([, e]) => e === ext || (ext === "jpeg" && e === "jpg"))?.[0] ?? "image/jpeg";
}

/**
 * True when the object behind [storageKey] has been uploaded. Used by the sync engine so a
 * `lot_image` mutation that arrives before its file is answered with a retryable reject.
 * Returns false (never throws) for unsafe keys and missing objects; throws only on storage outages
 * other than "not found" so the caller can treat them as retryable processing errors.
 */
export async function storageObjectExists(storageKey: string): Promise<boolean> {
  const cleanKey = sanitizeStorageKey(storageKey);
  if (!cleanKey) return false;
  if (STORAGE_DRIVER === "s3") {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET || "ewaste-media", Key: cleanKey }));
      return true;
    } catch (err: unknown) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === "NotFound" || e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }
  const baseDir = path.resolve(process.cwd(), STORAGE_LOCAL_DIR);
  const fullPath = path.resolve(baseDir, cleanKey);
  if (!fullPath.startsWith(baseDir)) return false;
  try {
    const st = await fs.stat(fullPath);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}
