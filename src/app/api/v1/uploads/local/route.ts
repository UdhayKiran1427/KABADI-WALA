import { NextRequest, NextResponse } from "next/server";
import { saveLocalFile, readLocalFile } from "@/lib/storage";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return apiError("MISSING_KEY", "Storage key is required as query parameter ?key=...", 400);
    }

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await saveLocalFile(key, buffer);

    return apiSuccess({
      message: "File uploaded successfully to local storage",
      storageKey: key,
      bytes: buffer.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("UPLOAD_FAILED", errorMsg, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return apiError("MISSING_KEY", "Storage key is required", 400);
    }

    const fileBuffer = await readLocalFile(key);
    if (!fileBuffer) {
      return apiError("NOT_FOUND", "File not found", 404);
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("FILE_ERROR", errorMsg, 500);
  }
}
