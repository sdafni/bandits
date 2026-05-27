import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "SafeKey social preview";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%)",
          color: "#0f2343",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px 72px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            color: "#8b6b17",
            display: "flex",
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {siteConfig.tagline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: "920px" }}>
          <div
            style={{
              color: "#0f2343",
              display: "flex",
              fontFamily: "Inter, sans-serif",
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: "-0.07em",
              lineHeight: 0.96,
            }}
          >
            Know Who Gets the Key.
          </div>
          <div
            style={{
              color: "#102947",
              display: "flex",
              fontFamily: "Inter, sans-serif",
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            AI-powered tenant screening and rental protection infrastructure for the Greek rental market.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(15, 35, 67, 0.12)",
              borderRadius: 999,
              color: "#334155",
              display: "flex",
              fontFamily: "Inter, sans-serif",
              fontSize: 24,
              fontWeight: 600,
              padding: "16px 24px",
            }}
          >
            Built for the Greek rental market
          </div>
          <div
            style={{
              color: "#0f2343",
              display: "flex",
              fontFamily: "Inter, sans-serif",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: "-0.05em",
            }}
          >
            SafeKey
          </div>
        </div>
      </div>
    ),
    size,
  );
}
