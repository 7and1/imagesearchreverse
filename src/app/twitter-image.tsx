import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 675,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#12100f",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        color: "#f6efe5",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#efe5d7",
        }}
      >
        ImageSearchReverse
      </div>
      <div style={{ marginTop: 24, fontSize: 60, fontWeight: 600 }}>
        Reverse image search
        <br />
        that finds the source.
      </div>
      <div style={{ marginTop: 28, fontSize: 24, color: "#cbb9a5" }}>
        Powered by Cloudflare Edge + DataForSEO.
      </div>
    </div>,
    {
      ...size,
    },
  );
}
