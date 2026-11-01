import { NextResponse } from "next/server";
import type { z } from "zod";
import { FlowError } from "./services/lotFlowService";

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}


/**
 * Reads the JSON body and validates it with a zod schema.
 * Returns the typed body, or the 400 response to send back.
 */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<{ body: z.infer<S>; response?: undefined } | { body?: undefined; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: apiError("INVALID_JSON", "Malformed JSON request body", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400) };
  }
  return { body: parsed.data };
}

/**
 * Maps expected business-rule failures to their API error; anything else becomes a generic 500.
 */
export function apiErrorFrom(err: unknown) {
  if (err instanceof FlowError) {
    return apiError(err.code, err.message, err.status);
  }
  console.error("API error:", err);
  return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}
