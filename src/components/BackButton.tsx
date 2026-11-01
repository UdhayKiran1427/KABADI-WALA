"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Goes back to the previous screen, or to `fallback` when the page was opened directly. */
export function BackButton({ fallback = "/", label = "Back", className }: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeft size={16} aria-hidden="true" /> {label}
    </button>
  );
}
