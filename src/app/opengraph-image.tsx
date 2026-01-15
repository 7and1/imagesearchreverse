import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #f6efe5, #efe5d7)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        color: "#1d1a16",
      }}
    >
      <div
        style={{
          fontSize: 26,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#6b6258",
          marginBottom: 24,
        }}
      >
        ImageSearchReverse
      </div>
      <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>
        Find the original source of any image.
      </div>
      <div
        style={{
          marginTop: 32,
          fontSize: 26,
          color: "#3a352f",
          maxWidth: 840,
        }}
      >
        Reverse image search built on Cloudflare Edge, optimized for speed and
        provenance.
      </div>
      <div
        style={{
          marginTop: 50,
          padding: "14px 26px",
          borderRadius: 999,
          border: "2px solid #1d1a16",
          fontSize: 20,
          alignSelf: "flex-start",
        }}
      >
        imagesearchreverse.com
      </div>
    </div>,
    {
      ...size,
    },
  );
}
