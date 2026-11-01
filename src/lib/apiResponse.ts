import { NextResponse } from "next/server";
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
 * Maps expected business-rule failures to their API error; anything else becomes a generic 500.
 */
export function apiErrorFrom(err: unknown) {
  if (err instanceof FlowError) {
    return apiError(err.code, err.message, err.status);
  }
  console.error("API error:", err);
  return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}
