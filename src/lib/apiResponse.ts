import { NextResponse } from "next/server";

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
