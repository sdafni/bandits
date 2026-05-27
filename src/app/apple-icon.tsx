import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(180deg, #102947 0%, #0f2343 100%)",
          color: "white",
          display: "flex",
          fontFamily: "Inter, sans-serif",
          fontSize: 76,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.08em",
          width: "100%",
        }}
      >
        SK
      </div>
    ),
    size,
  );
}
