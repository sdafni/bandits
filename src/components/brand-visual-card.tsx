import Image from "next/image";
import { FileSearch, Shield, Sparkles } from "lucide-react";
import { SafeKeyBrand } from "@/components/safekey-brand";
import { cn } from "@/lib/utils";

type BrandVisualCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  className?: string;
};

export function BrandVisualCard({
  title,
  description,
  imageSrc,
  imageAlt,
  className,
}: BrandVisualCardProps) {
  const featurePills = [
    { icon: Shield, label: "Secure upload links" },
    { icon: FileSearch, label: "Verified documents" },
    { icon: Sparkles, label: "AI-ready review" },
  ];

  return (
    <section className={cn("brand-visual-card", className)}>
      <div className="relative z-[1] space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#42526b]">SafeKey visual</p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="relative z-[1] grid gap-3 sm:grid-cols-3">
        {featurePills.map((item) => (
          <div
            className="rounded-[22px] border border-[#dfe5ef] bg-white/96 px-4 py-4 text-sm text-slate-700 shadow-[0_4px_12px_rgba(15,35,67,0.03)]"
            key={item.label}
          >
            <item.icon className="h-4 w-4 text-[#183454]" />
            <p className="mt-3 font-medium text-[#0f2343]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="brand-visual-frame relative z-[1]">
        <div className="absolute left-4 top-4 z-[1] max-w-[260px] rounded-[24px] border border-white/80 bg-white/94 p-3 shadow-[0_12px_24px_rgba(15,35,67,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <SafeKeyBrand className="shrink-0" href="" variant="compact" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#42526b]">Verification desk</p>
              <p className="text-sm font-semibold text-[#0f2343]">Secure document chain with review-ready signals</p>
            </div>
          </div>
        </div>
        <Image
          alt={imageAlt}
          className="h-auto w-full rounded-[28px]"
          height={640}
          src={imageSrc}
          width={900}
        />
      </div>

      <div className="relative z-[1] grid gap-3 sm:grid-cols-2">
        <div className="brand-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#42526b]">Document verification</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Upload requests, identity checks, and extracted text are organized in one calm review workspace.
          </p>
        </div>
        <div className="brand-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#42526b]">Decision support</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Landlords and property teams get clear screening signals without sacrificing trust or professionalism.
          </p>
        </div>
      </div>
    </section>
  );
}
