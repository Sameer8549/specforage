import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0B0E",
          borderRadius: "36px",
          border: "6px solid #2B303C",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: "-0.05em",
            fontSize: "105px",
          }}
        >
          <span style={{ color: "#FF2B2B" }}>S</span>
          <span style={{ color: "#FFFFFF" }}>F</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
