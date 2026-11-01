import { NextRequest, NextResponse } from "next/server";
import { saveLocalFile, readLocalFile, sanitizeStorageKey, validateStorageKey, imageContentType, MAX_IMAGE_BYTES } from "@/lib/storage";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";

/**
 * Local-disk upload target returned by POST /uploads/presign (dev storage driver).
 * Requires the same Bearer token, and the key must be in the caller's own images/{userId}/ folder.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key || !validateStorageKey(key, user.userId)) {
      return apiError("INVALID_KEY", "Use the upload URL returned by /uploads/presign", 400);
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return apiError("INVALID_TYPE", "Only images can be uploaded", 415);
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return apiError("INVALID_SIZE", "Photo must be smaller than 5 MB", 413);
    }

    const cleanKey = sanitizeStorageKey(key)!;
    await saveLocalFile(cleanKey, buffer);
    return apiSuccess({
      message: "File uploaded successfully to local storage",
      storageKey: cleanKey,
      bytes: buffer.length,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const cleanKey = sanitizeStorageKey(req.nextUrl.searchParams.get("key") || "");
    if (!cleanKey || !cleanKey.startsWith("images/")) {
      return apiError("INVALID_KEY", "Invalid or unsafe storage key", 400);
    }

    const fileBuffer = await readLocalFile(cleanKey);
    if (!fileBuffer) {
      return apiError("NOT_FOUND", "File not found", 404);
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": imageContentType(cleanKey),
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
