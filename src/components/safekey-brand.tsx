import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SafeKeyBrandProps = {
  href?: string;
  variant?: "compact" | "logo" | "lockup";
  className?: string;
  priority?: boolean;
};

const variantConfig = {
  compact: {
    alt: "SafeKey icon",
    className: "h-12 w-12 sm:h-[52px] sm:w-[52px]",
    height: 768,
    sizes: "52px",
    src: "/brand/safekey/icon/safekey-icon.png",
    width: 768,
  },
  lockup: {
    alt: "SafeKey logo",
    className: "h-auto max-h-28 w-auto sm:max-h-32",
    height: 576,
    sizes: "(max-width: 640px) 360px, 520px",
    src: "/brand/safekey/logo/safekey-logo.PNG",
    width: 1024,
  },
  logo: {
    alt: "SafeKey logo",
    className: "h-auto max-h-[88px] w-auto sm:max-h-[112px]",
    height: 576,
    sizes: "(max-width: 640px) 360px, 560px",
    src: "/brand/safekey/logo/safekey-logo.PNG",
    width: 1024,
  },
} as const;

export function SafeKeyBrand({
  href = "/",
  variant = "logo",
  className,
  priority = false,
}: SafeKeyBrandProps) {
  const asset = variantConfig[variant];

  const content = (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        alt={asset.alt}
        className={cn("w-auto object-contain", asset.className)}
        height={asset.height}
        priority={priority}
        sizes={asset.sizes}
        src={asset.src}
        width={asset.width}
      />
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link className="inline-flex items-center" href={href}>
      {content}
    </Link>
  );
}
