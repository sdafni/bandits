"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { readTenantUploadDraft } from "@/lib/tenant-upload-draft";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const uploadToken = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const match = window.location.pathname.match(/^\/upload\/([^/]+)/);
    return match?.[1] ?? "";
  }, []);
  const draft = uploadToken ? readTenantUploadDraft(uploadToken) : null;
  const isUploadRoute = Boolean(uploadToken);

  useEffect(() => {
    console.error("[safekey:error]", {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
      uploadToken: uploadToken || undefined,
    });
  }, [error.digest, error.message, error.stack, uploadToken]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="card max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b6b17]">
          {isUploadRoute ? "Secure upload" : "Something went wrong"}
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-950">
            {isUploadRoute ? "Something interrupted your upload" : "The workflow could not be completed"}
          </h1>
          <p className="text-sm leading-7 text-slate-600">
            {isUploadRoute
              ? "Your saved draft and uploaded documents are still stored. Retry to continue where you left off."
              : "SafeKey hit an unexpected error while loading this step. You can retry the request or return to the previous page."}
          </p>
          {draft?.fullName || draft?.email ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Draft found for {draft.fullName || "your application"}
              {draft.email ? ` (${draft.email})` : ""}.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="primary-action rounded-full px-5 py-3" onClick={reset} type="button">
            Try again
          </button>
          {isUploadRoute ? (
            <Link
              className="rounded-full border border-[#d8c490] px-5 py-3 text-sm font-semibold text-[#0f2343]"
              href={`/upload/${uploadToken}`}
            >
              Return to saved upload
            </Link>
          ) : (
            <button
              className="rounded-full border border-[#d8c490] px-5 py-3 text-sm font-semibold text-[#0f2343]"
              onClick={() => window.history.back()}
              type="button"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
