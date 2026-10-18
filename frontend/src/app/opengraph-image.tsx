import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/config/site";

export const runtime = "edge";
export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default WhatsApp / Facebook / Twitter card (Elena Pos–style share image). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px 80px",
          background: "linear-gradient(145deg, #07140c 0%, #0f2418 45%, #1a3d2a 100%)",
          color: "#e8f5ec",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 999,
              background: "rgba(61, 255, 138, 0.22)",
              border: "3px solid #3dff8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3dff8a",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
            {siteName}
          </div>
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 600,
            color: "#9fd9b4",
            maxWidth: 820,
            lineHeight: 1.25,
          }}
        >
          {siteTagline}
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 26,
            color: "#3dff8a",
            fontWeight: 700,
          }}
        >
          Cuidá a tu michi · Personalizalo · Jugá
        </div>
      </div>
    ),
    { ...size },
  );
}
