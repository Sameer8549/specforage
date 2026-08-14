export default function Loading() {
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
          padding: "24px 36px",
          backgroundColor: "var(--bg-surface)",
          maxWidth: 480,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
            [ SYSTEM / WORKER BUSY ]
          </span>
          <span className="badge" style={{ color: "var(--status-warn)", borderColor: "var(--status-warn)" }}>
            INITIALIZING PIPELINE
          </span>
        </div>

        <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: "40%",
              backgroundColor: "var(--accent)",
              animation: "scanline-pulse 1.2s infinite ease-in-out",
            }}
          />
        </div>

        <div className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
          MOUNTING UNSPSC INDEX & RETRIEVING GOVERNANCE PROFILES...
        </div>
      </div>
    </div>
  );
}
