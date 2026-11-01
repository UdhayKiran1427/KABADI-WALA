import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

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

export function validateStorageKey(storageKey: string, userId: string): boolean {
  if (!storageKey || typeof storageKey !== "string") return false;
  const expectedPrefix = `images/${userId}/`;
  return storageKey.startsWith(expectedPrefix);
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
  const fullPath = path.join(process.cwd(), STORAGE_LOCAL_DIR, storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

export async function readLocalFile(storageKey: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), STORAGE_LOCAL_DIR, storageKey);
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

