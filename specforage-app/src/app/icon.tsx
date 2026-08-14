import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "6px",
          border: "1.5px solid #2B303C",
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
            fontSize: "18px",
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
