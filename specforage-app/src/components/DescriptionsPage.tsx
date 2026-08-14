"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  DESCRIPTION_CHANNELS,
  AVAILABLE_TOKENS,
  DescriptionChannelConfig,
  FormulaToken,
  ChannelType,
} from "@/data/descriptionData";
import { SAMPLE_RECORDS, ProductRecord } from "@/data/sampleRecords";
import {
  ClipboardText,
  CheckCircle,
  Warning,
  Copy,
  Check,
  Sparkle,
  Sliders,
  ArrowRight,
  Code,
  Tag,
} from "@phosphor-icons/react";

export default function DescriptionsPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord>(SAMPLE_RECORDS[0]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("SHORT");
  const [channelFormulas, setChannelFormulas] = useState<Record<ChannelType, string>>({
    MOBILE: "[Brand] [Size] [InstallType] [Commodity] [PrimarySpec]",
    INVOICE: "[Brand] [Size] [InstallType] [Commodity] [KeyFeature1] [PrimarySpec] [FinishAbbr]",
    SHORT: "[Brand] [Size] [InstallType] [Commodity] [KeyFeature1] [PrimarySpec] [Finish]",
    LONG: "[Brand] [Size] [InstallType] [Commodity] with [KeyFeature1] Drying System, [PrimarySpec], [Finish] Interior, [SecondarySpec], Front Controls",
    RETAIL: "[Brand] [Size] [Finish] [InstallType] [Commodity] — [PrimarySpec] [KeyFeature1], [SecondarySpec], Front Controls",
    MARKETING: "Experience quiet, efficient operation with the [Brand] [MPN]. Built-In installation, [Size] profile, [KeyFeature1] technology, and a [PrimarySpec] operation level make it a standout choice for modern commercial and residential installations.",
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const activeChannelConfig =
    DESCRIPTION_CHANNELS.find((c) => c.channel === selectedChannel) ||
    DESCRIPTION_CHANNELS[0];

  // Token map for current selected product
  const tokenValues = useMemo(() => {
    const p = selectedProduct;
    const findAttr = (name: string) =>
      p.attributes.find((a) => a.name.toLowerCase().includes(name.toLowerCase()))
        ?.normalizedValue || "";

    const finishVal = findAttr("FINISH") || "Stainless Steel";
    const finishAbbr = finishVal === "Stainless Steel" ? "SS" : finishVal;

    let primarySpec = "47 dB";
    let sizeVal = "24 in";
    let materialVal = "Stainless Steel";
    let materialAbbr = "SS";
    let secondarySpec = "14 Place Settings";
    let keyFeature = "EvenDry™";

    if (p.mpn === "PF-90-SS-075") {
      primarySpec = "5100 psi";
      sizeVal = "3/4 in";
      materialVal = "316 Stainless Steel";
      materialAbbr = "316SS";
      secondarySpec = "FNPT x FNPT";
      keyFeature = "High Pressure";
    } else if (p.mpn === "QO120") {
      primarySpec = "10 kA AIR";
      sizeVal = "20 A";
      materialVal = "Molded Case";
      materialAbbr = "MC";
      secondarySpec = "120/240 VAC";
      keyFeature = "Visi-Trip™";
    } else if (p.mpn === "BV-BR-100") {
      primarySpec = "600 psi CWP";
      sizeVal = "1 in";
      materialVal = "Cast Bronze";
      materialAbbr = "Bronze";
      secondarySpec = "Full Port";
      keyFeature = "Lead-Free NSF 61";
    }

    return {
      "[Brand]": p.brand,
      "[MPN]": p.mpn,
      "[Manufacturer]": p.canonicalManufacturer,
      "[Commodity]": p.class.split("—")[1]?.trim() || "Product",
      "[Size]": sizeVal,
      "[Material]": materialVal,
      "[MaterialAbbr]": materialAbbr,
      "[Finish]": finishVal,
      "[FinishAbbr]": finishAbbr,
      "[Type]": findAttr("INSTALLATION TYPE") || findAttr("FITTING TYPE") || "Standard",
      "[InstallType]": findAttr("INSTALLATION TYPE") || findAttr("FITTING TYPE") || "Standard",
      "[PrimarySpec]": primarySpec,
      "[SecondarySpec]": secondarySpec,
      "[KeyFeature1]": keyFeature,
      "[Certifications]": "UL / NSF Listed",
    };
  }, [selectedProduct]);

  // Compile a formula template for a product
  function compileFormula(template: string) {
    let result = template;
    Object.entries(tokenValues).forEach(([token, val]) => {
      result = result.split(token).join(val);
    });
    // Clean redundant multiple spaces
    return result.replace(/\s+/g, " ").trim();
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  }

  function insertToken(tokenKey: string) {
    setChannelFormulas((prev) => ({
      ...prev,
      [selectedChannel]: `${prev[selectedChannel]} ${tokenKey}`.trim(),
    }));
  }

  const activeCompiledText = compileFormula(channelFormulas[selectedChannel]);
  const activeLen = activeCompiledText.length;
  const activeLimit = activeChannelConfig.charLimit;
  const activePct = (activeLen / activeLimit) * 100;
  const isOverLimit = activeLen > activeLimit;

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 56 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            minHeight: "calc(100dvh - 56px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Top Header ── */}
          <div
            style={{
              padding: "36px 48px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <div
                className="text-mono-label"
                style={{ color: "var(--accent)", marginBottom: 8 }}
              >
                [ GENERATION ENGINE / FORMULA-BASED DESCRIPTION STUDIO ]
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                FORMULA VARIANTS.
              </h1>
            </div>

            {/* Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, auto)",
                gap: 24,
                borderLeft: "1px solid var(--border)",
                paddingLeft: 24,
              }}
            >
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  VARIANT CHANNELS
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  6 FORMULAS
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--status-ok)" }}>
                  HALLUCINATIONS
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  0.0% ZERO
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--status-ok)" }}>
                  TOKEN COVERAGE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  100% GOVERNED
                </div>
              </div>
            </div>
          </div>

          {/* ── Product Selector Strip ── */}
          <div
            style={{
              padding: "16px 48px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span className="text-mono-label" style={{ fontSize: 10, color: "var(--mono-meta)" }}>
              TARGET PRODUCT RECORD:
            </span>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {SAMPLE_RECORDS.map((p) => {
                const isSel = p.id === selectedProduct.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    style={{
                      background: isSel ? "var(--fg-primary)" : "transparent",
                      color: isSel ? "var(--bg-root)" : "var(--fg-secondary)",
                      border: "1px solid var(--border)",
                      padding: "6px 12px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.mpn}</span>
                    <span style={{ opacity: 0.7 }}>({p.brand})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Split Workspace ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "340px 1fr",
              flex: 1,
            }}
          >
            {/* ── LEFT: Channel Navigator ── */}
            <div
              style={{
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-root)",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  backgroundColor: "var(--bg-elevated)",
                  borderBottom: "1px solid var(--border-dim)",
                }}
              >
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                  [ 6 PURPOSE-BUILT CHANNELS ]
                </span>
              </div>

              {DESCRIPTION_CHANNELS.map((ch) => {
                const isSel = ch.channel === selectedChannel;
                const compiled = compileFormula(channelFormulas[ch.channel]);
                const over = compiled.length > ch.charLimit;

                return (
                  <button
                    key={ch.channel}
                    onClick={() => setSelectedChannel(ch.channel)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px 20px",
                      border: "none",
                      borderTop: "1px solid var(--border-dim)",
                      background: isSel ? "var(--bg-surface)" : "transparent",
                      borderLeft: `3px solid ${isSel ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="text-mono-data" style={{ color: isSel ? "var(--accent)" : "var(--fg-primary)", fontSize: 12, fontWeight: 500 }}>
                        {ch.channel}
                      </span>
                      <span
                        className="badge badge-dim"
                        style={{
                          fontSize: 8.5,
                          color: over ? "var(--accent)" : "var(--status-ok)",
                        }}
                      >
                        {compiled.length}/{ch.charLimit} CHARS
                      </span>
                    </div>

                    <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-secondary)", lineHeight: 1.3 }}>
                      {ch.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── RIGHT: Formula Editor & Multi-Variant Inspector ── */}
            <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
              {/* Active Channel Details */}
              <div style={{ border: "1px solid var(--border)", padding: "20px", backgroundColor: "var(--bg-surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <span className="badge" style={{ color: "var(--accent)", borderColor: "var(--accent)", marginBottom: 4 }}>
                      CHANNEL: {activeChannelConfig.channel} (MAX {activeChannelConfig.charLimit} CHARACTERS)
                    </span>
                    <h3 className="text-display" style={{ fontSize: "1.5rem" }}>
                      {activeChannelConfig.label}.
                    </h3>
                  </div>

                  <button
                    onClick={() => copyToClipboard(activeCompiledText, activeChannelConfig.channel)}
                    className="btn-primary"
                    style={{ padding: "8px 14px", fontSize: 11 }}
                  >
                    {copiedType === activeChannelConfig.channel ? <Check size={14} /> : <Copy size={14} />}
                    {copiedType === activeChannelConfig.channel ? "COPIED" : "COPY OUTPUT"}
                  </button>
                </div>

                <p className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 16 }}>
                  USE CASE: {activeChannelConfig.useCase}
                </p>

                {/* Compiled Output Card */}
                <div style={{ border: "1px solid var(--border)", padding: "16px", backgroundColor: "var(--bg-root)", marginBottom: 12 }}>
                  <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 6 }}>
                    COMPILED OUTPUT (DETERMINISTIC SLOT REPLACEMENT)
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--fg-primary)",
                      fontFamily: activeChannelConfig.fontFamily === "mono" ? "var(--font-mono)" : "var(--font-body)",
                      marginBottom: 12,
                    }}
                  >
                    {activeCompiledText}
                  </p>

                  {/* Length Bar */}
                  <div style={{ height: 3, backgroundColor: "var(--border)", position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${Math.min(activePct, 100)}%`,
                        backgroundColor: isOverLimit ? "var(--accent)" : "var(--status-ok)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span className="text-mono-label" style={{ fontSize: 9.5, color: isOverLimit ? "var(--accent)" : "var(--fg-secondary)" }}>
                      {activeLen} / {activeLimit} CHARACTERS ({Math.round(activePct)}% of budget)
                    </span>
                    {isOverLimit && (
                      <span className="text-mono-label" style={{ fontSize: 9.5, color: "var(--accent)" }}>
                        ⚠ OVERRUN: TRUNCATION REQUIRED
                      </span>
                    )}
                  </div>
                </div>

                {/* Formula Syntax Editor */}
                <div>
                  <label className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", display: "block", marginBottom: 4 }}>
                    FORMULA SYNTAX TEMPLATE (EDITABLE TOKENS)
                  </label>
                  <textarea
                    rows={2}
                    value={channelFormulas[selectedChannel]}
                    onChange={(e) =>
                      setChannelFormulas((prev) => ({
                        ...prev,
                        [selectedChannel]: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--bg-root)",
                      border: "1px solid var(--border)",
                      color: "var(--accent)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                </div>

                {/* Token Insertion Toolbar */}
                <div style={{ marginTop: 12 }}>
                  <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--mono-meta)", marginBottom: 6 }}>
                    CLICK TOKEN TO INSERT INTO TEMPLATE:
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {AVAILABLE_TOKENS.map((token) => (
                      <button
                        key={token.key}
                        onClick={() => insertToken(token.key)}
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-dim)",
                          padding: "3px 8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--fg-primary)",
                          cursor: "pointer",
                        }}
                      >
                        + {token.key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* All 6 Channels Side-by-Side Suite */}
              <div style={{ border: "1px solid var(--border)" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "var(--bg-elevated)",
                    borderBottom: "1px solid var(--border-dim)",
                  }}
                >
                  <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                    [ ALL 6 CHANNELS GENERATED SIMULTANEOUSLY FOR {selectedProduct.mpn} ]
                  </span>
                </div>

                {DESCRIPTION_CHANNELS.map((ch) => {
                  const compiled = compileFormula(channelFormulas[ch.channel]);
                  const isCopied = copiedType === ch.channel;
                  return (
                    <div
                      key={ch.channel}
                      style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--border-dim)",
                        display: "grid",
                        gridTemplateColumns: "140px 1fr auto",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-primary)", display: "block" }}>
                          {ch.channel}
                        </span>
                        <span className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>
                          {compiled.length}/{ch.charLimit} ch
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 12.5,
                          color: "var(--fg-primary)",
                          fontFamily: ch.fontFamily === "mono" ? "var(--font-mono)" : "var(--font-body)",
                          lineHeight: 1.4,
                        }}
                      >
                        {compiled}
                      </p>

                      <button
                        onClick={() => copyToClipboard(compiled, ch.channel)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: isCopied ? "var(--status-ok)" : "var(--fg-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                        }}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? "COPIED" : "COPY"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
