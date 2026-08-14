import Link from "next/link";
import { ArrowLeft, TreeStructure } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-root)",
        fontFamily: "var(--font-mono)",
        padding: 24,
      }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          padding: "36px 48px",
          backgroundColor: "var(--bg-surface)",
          maxWidth: 540,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11 }}>
            [ 404 / RESOURCE UNRESOLVED ]
          </span>
          <span className="badge badge-dim" style={{ fontSize: 9 }}>
            NULL ROUTE
          </span>
        </div>

        <div>
          <h1 className="text-display" style={{ fontSize: "2.2rem", color: "var(--fg-primary)", marginBottom: 8 }}>
            ROUTE NOT INDEXED.
          </h1>
          <p className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
            The requested URI does not match any registered telemetry controller or taxonomy endpoint.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Link href="/" className="btn-primary" style={{ padding: "8px 16px", fontSize: 11 }}>
            <ArrowLeft size={14} weight="bold" />
            RETURN TO ROOT
          </Link>
          <Link href="/taxonomy" className="btn-ghost" style={{ padding: "8px 16px", fontSize: 11 }}>
            TAXONOMY INDEX
          </Link>
        </div>
      </div>
    </div>
  );
}
