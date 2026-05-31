import { notFound } from "next/navigation";
import { UploadLinkUxPreview } from "@/components/dev/upload-link-ux-preview";

export const dynamic = "force-dynamic";

const VALID_STATES = ["no-plan", "with-plan", "modal", "link-ready"] as const;

export default async function UploadLinkUxDevPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { state = "no-plan" } = await searchParams;

  if (!VALID_STATES.includes(state as (typeof VALID_STATES)[number])) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100/80 px-4 py-6">
      <div className="mx-auto max-w-lg">
        <UploadLinkUxPreview state={state as (typeof VALID_STATES)[number]} />
      </div>
    </main>
  );
}
