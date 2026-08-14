"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  TAXONOMY_TREE,
  UNSPSC_VERSION,
  CommodityItem,
  ClassItem,
  FamilyItem,
  SegmentItem,
} from "@/data/taxonomyData";
import {
  MagnifyingGlass,
  TreeStructure,
  FolderSimple,
  FolderOpen,
  Tag,
  Sparkle,
  ArrowRight,
  CheckCircle,
  CaretRight,
  CaretDown,
  ListBullets,
  FileCode,
  Sliders,
} from "@phosphor-icons/react";

export default function TaxonomyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityItem>(
    TAXONOMY_TREE[0].families[0].classes[0].commodities[0]
  );
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({
    "40": true,
    "39": true,
    "23": true,
  });
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({
    "4018": true,
    "4014": true,
    "3912": true,
    "2315": true,
  });
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({
    "401815": true,
    "401416": true,
    "391216": true,
  });

  // Sandbox Classifier state
  const [sandboxInput, setSandboxInput] = useState(
    "Swagelok 3/4 in 316 Stainless Steel 90 Deg FNPT Pipe Elbow 5100 psig"
  );
  const [classifiedResult, setClassifiedResult] = useState<{
    code: string;
    title: string;
    classpath: string;
    confidence: number;
    extractedAttrs: { name: string; val: string }[];
  } | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  // Flattened commodities for quick search lookup
  const allCommodities = useMemo(() => {
    const list: {
      commodity: CommodityItem;
      classpath: string;
      segment: SegmentItem;
      family: FamilyItem;
      classItem: ClassItem;
    }[] = [];
    TAXONOMY_TREE.forEach((seg) => {
      seg.families.forEach((fam) => {
        fam.classes.forEach((cls) => {
          cls.commodities.forEach((com) => {
            list.push({
              commodity: com,
              classpath: `${seg.title} → ${fam.title} → ${cls.title} → ${com.title}`,
              segment: seg,
              family: fam,
              classItem: cls,
            });
          });
        });
      });
    });
    return list;
  }, []);

  // Filtered tree or search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allCommodities.filter(
      (item) =>
        item.commodity.code.includes(q) ||
        item.commodity.title.toLowerCase().includes(q) ||
        item.commodity.description.toLowerCase().includes(q) ||
        item.classItem.title.toLowerCase().includes(q) ||
        item.family.title.toLowerCase().includes(q)
    );
  }, [searchQuery, allCommodities]);

  const toggleSegment = (code: string) => {
    setExpandedSegments((p) => ({ ...p, [code]: !p[code] }));
  };
  const toggleFamily = (code: string) => {
    setExpandedFamilies((p) => ({ ...p, [code]: !p[code] }));
  };
  const toggleClass = (code: string) => {
    setExpandedClasses((p) => ({ ...p, [code]: !p[code] }));
  };

  // Live classifier engine simulation
  function runClassification(text: string) {
    const t = text.toLowerCase();
    let matched = allCommodities[0];
    let conf = 0.88;
    const extracted: { name: string; val: string }[] = [];

    if (t.includes("dishwasher")) {
      matched = allCommodities.find((c) => c.commodity.code === "40181501") || allCommodities[0];
      conf = 0.98;
      if (t.includes("24")) extracted.push({ name: "WIDTH", val: "24 in" });
      if (t.includes("built-in") || t.includes("built in")) extracted.push({ name: "INSTALLATION TYPE", val: "Built-In" });
      if (t.includes("47db") || t.includes("47 db") || t.includes("44 dba")) extracted.push({ name: "NOISE LEVEL", val: "47 dB" });
      if (t.includes("stainless")) extracted.push({ name: "FINISH", val: "Stainless Steel" });
    } else if (t.includes("elbow") || t.includes("fitting") || t.includes("90 deg") || t.includes("90°")) {
      matched = allCommodities.find((c) => c.commodity.code === "40141720") || allCommodities[0];
      conf = 0.99;
      extracted.push({ name: "FITTING TYPE", val: "90° Elbow" });
      if (t.includes("316") || t.includes("stainless")) extracted.push({ name: "MATERIAL", val: "316 Stainless Steel" });
      if (t.includes("3/4")) extracted.push({ name: "PIPE SIZE", val: "3/4 in" });
      if (t.includes("fnpt") || t.includes("npt")) extracted.push({ name: "CONNECTION TYPE", val: "Female NPT x Female NPT" });
      if (t.includes("5100")) extracted.push({ name: "MAX WORKING PRESSURE", val: "5100 psi" });
    } else if (t.includes("breaker") || t.includes("pole") || t.includes("120v") || t.includes("qo")) {
      matched = allCommodities.find((c) => c.commodity.code === "39121603") || allCommodities[0];
      conf = 0.97;
      if (t.includes("20a") || t.includes("20-amp") || t.includes("20 amp")) extracted.push({ name: "AMPERAGE", val: "20 A" });
      if (t.includes("1-pole") || t.includes("single-pole") || t.includes("1 pole")) extracted.push({ name: "POLE COUNT", val: "1 Pole" });
      if (t.includes("120/240v") || t.includes("120v")) extracted.push({ name: "VOLTAGE RATING", val: "120/240 VAC" });
      if (t.includes("10ka") || t.includes("10 ka")) extracted.push({ name: "INTERRUPTING RATING", val: "10 kA AIR" });
      if (t.includes("plug-on") || t.includes("plug-in")) extracted.push({ name: "MOUNTING TYPE", val: "Plug-On" });
    } else if (t.includes("valve") || t.includes("ball valve") || t.includes("cwp")) {
      matched = allCommodities.find((c) => c.commodity.code === "40141607") || allCommodities[0];
      conf = 0.96;
      if (t.includes("1 in") || t.includes("1-in") || t.includes('1"')) extracted.push({ name: "VALVE SIZE", val: "1 in" });
      if (t.includes("bronze") || t.includes("brass")) extracted.push({ name: "BODY MATERIAL", val: "Cast Bronze" });
      if (t.includes("full port")) extracted.push({ name: "PORT TYPE", val: "Full Port" });
      if (t.includes("600")) extracted.push({ name: "PRESSURE CLASS", val: "600 psi CWP" });
    } else if (t.includes("pump") || t.includes("gpm") || t.includes("hp")) {
      matched = allCommodities.find((c) => c.commodity.code === "23151501") || allCommodities[0];
      conf = 0.94;
      if (t.includes("1.5 hp") || t.includes("5 hp")) extracted.push({ name: "HORSEPOWER", val: "1.5 HP" });
      if (t.includes("85 gpm") || t.includes("150 gpm")) extracted.push({ name: "FLOW RATE MAX", val: "85 GPM" });
    }

    setClassifiedResult({
      code: matched.commodity.code,
      title: matched.commodity.title,
      classpath: matched.classpath,
      confidence: conf,
      extractedAttrs: extracted,
    });
    setSelectedCommodity(matched.commodity);
  }

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 56 }}>
        <div
          style={{
            width: "100%",
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
                style={{ color: "var(--accent)", marginBottom: 8, fontSize: 11, fontWeight: 600 }}
              >
                Taxonomy & Classification Engine · {UNSPSC_VERSION}
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                UNSPSC STANDARDS.
              </h1>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
              }}
            >
              <div className="badge badge-dim" style={{ fontSize: 12 }}>
                PUBLIC TAXONOMY · ZERO CUSTOM PROPRIETARY SCHEMAS
              </div>
              <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                55,000+ COMMODITY CODES ACROSS ALL INDUSTRIAL VERTICALS
              </div>
            </div>
          </div>

          {/* ── Classification Sandbox Section ── */}
          <div
            style={{
              padding: "24px 48px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkle size={15} style={{ color: "var(--accent)" }} />
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                  Live Classification Sandbox
                </span>
              </div>
              <span className="text-mono-label" style={{ fontSize: 12 }}>
                TEST ANY INDUSTRIAL CATALOG STRING
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <input
                  type="text"
                  className="input-underline"
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  placeholder="Paste or type raw description..."
                  style={{
                    backgroundColor: "var(--bg-root)",
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <button
                onClick={() => runClassification(sandboxInput)}
                className="btn-primary"
                style={{ padding: "10px 20px", fontSize: 11 }}
              >
                CLASSIFY STRING
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>

            {/* Preloaded Sample Prompts */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--mono-meta)" }}>
                SAMPLE INPUTS:
              </span>
              {[
                "24 in Built-In Dishwasher w/ EvenDry 47dB Stainless Steel",
                "Swagelok 3/4 in 316 Stainless Steel 90 Deg FNPT Pipe Elbow 5100 psig",
                "Square D QO120 20A 1-Pole 120/240V 10kA Miniature Circuit Breaker",
                "Apollo 1 in Full Port Bronze Ball Valve 600 CWP NPT Lever Handle",
                "Goulds Water Technology 1.5 HP Stainless Steel Centrifugal Pump 85 GPM",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setSandboxInput(sample);
                    runClassification(sample);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-dim)",
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--fg-secondary)",
                    cursor: "pointer",
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Classification Result Card */}
            {classifiedResult && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
                style={{
                  marginTop: 16,
                  padding: "16px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-root)",
                  display: "grid",
                  gridTemplateColumns: "180px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                    ✓ MATCHED COMMODITY
                  </div>
                  <div className="text-mono-data" style={{ fontSize: 14, color: "var(--accent)", marginTop: 2 }}>
                    UNSPSC {classifiedResult.code}
                  </div>
                </div>

                <div>
                  <div className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)", fontWeight: 500 }}>
                    {classifiedResult.title}
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-secondary)", marginTop: 2 }}>
                    {classifiedResult.classpath}
                  </div>

                  {classifiedResult.extractedAttrs.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {classifiedResult.extractedAttrs.map((attr) => (
                        <span key={attr.name} className="badge badge-dim" style={{ fontSize: 11 }}>
                          {attr.name}: <span style={{ color: "var(--fg-primary)" }}>{attr.val}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    className="badge"
                    style={{
                      color: "var(--status-ok)",
                      borderColor: "var(--status-ok)",
                      fontSize: 12,
                    }}
                  >
                    {(classifiedResult.confidence * 100).toFixed(0)}% CONFIDENCE
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Main Split View: Left Tree / Right Schema Inspector ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "440px 1fr",
              flex: 1,
            }}
          >
            {/* ── LEFT: Interactive Taxonomy Hierarchy ── */}
            <div
              style={{
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                maxHeight: "calc(100vh - 340px)",
              }}
            >
              {/* Search in Tree */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <MagnifyingGlass size={14} style={{ color: "var(--fg-dim)" }} />
                <input
                  type="text"
                  placeholder="FILTER CODES OR COMMODITIES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-primary)",
                    width: "100%",
                  }}
                />
              </div>

              {/* Tree Content */}
              <div style={{ padding: "12px 0" }}>
                {searchResults ? (
                  // Search Results List
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 20px", color: "var(--accent)" }} className="text-mono-label">
                      {searchResults.length} COMMODITIES FOUND
                    </div>
                    {searchResults.map((item) => {
                      const isSelected = selectedCommodity.code === item.commodity.code;
                      return (
                        <button
                          key={item.commodity.code}
                          onClick={() => setSelectedCommodity(item.commodity)}
                          style={{
                            textAlign: "left",
                            padding: "10px 20px",
                            border: "none",
                            background: isSelected ? "var(--bg-surface)" : "transparent",
                            borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span className="text-mono-data" style={{ color: isSelected ? "var(--accent)" : "var(--fg-primary)", fontSize: 12 }}>
                              {item.commodity.code}
                            </span>
                            <span className="text-mono-label" style={{ fontSize: 11.5 }}>
                              {item.classItem.title}
                            </span>
                          </div>
                          <span className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                            {item.commodity.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Hierarchical Tree
                  TAXONOMY_TREE.map((seg) => {
                    const isSegOpen = !!expandedSegments[seg.code];
                    return (
                      <div key={seg.code} style={{ marginBottom: 4 }}>
                        {/* Segment Row */}
                        <div
                          onClick={() => toggleSegment(seg.code)}
                          style={{
                            padding: "8px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            backgroundColor: "rgba(255,255,255,0.02)",
                          }}
                        >
                          {isSegOpen ? <CaretDown size={12} /> : <CaretRight size={12} />}
                          <span className="text-mono-data" style={{ color: "var(--accent)", fontSize: 11, fontWeight: "bold" }}>
                            [{seg.code}]
                          </span>
                          <span className="text-mono-label" style={{ color: "var(--fg-primary)", fontSize: 12, flex: 1 }}>
                            SEGMENT {seg.code}
                          </span>
                        </div>

                        {/* Families */}
                        {isSegOpen && (
                          <div style={{ paddingLeft: 18, borderLeft: "1px solid var(--border-dim)", marginLeft: 20 }}>
                            {seg.families.map((fam) => {
                              const isFamOpen = !!expandedFamilies[fam.code];
                              return (
                                <div key={fam.code} style={{ marginTop: 4 }}>
                                  <div
                                    onClick={() => toggleFamily(fam.code)}
                                    style={{
                                      padding: "6px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {isFamOpen ? <CaretDown size={11} /> : <CaretRight size={11} />}
                                    <span className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                                      {fam.code}
                                    </span>
                                    <span className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                                      {fam.title}
                                    </span>
                                  </div>

                                  {/* Classes */}
                                  {isFamOpen && (
                                    <div style={{ paddingLeft: 16, borderLeft: "1px solid var(--border-dim)", marginLeft: 16 }}>
                                      {fam.classes.map((cls) => {
                                        const isClsOpen = !!expandedClasses[cls.code];
                                        return (
                                          <div key={cls.code} style={{ marginTop: 2 }}>
                                            <div
                                              onClick={() => toggleClass(cls.code)}
                                              style={{
                                                padding: "5px 10px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                cursor: "pointer",
                                              }}
                                            >
                                              {isClsOpen ? <FolderOpen size={12} style={{ color: "var(--fg-dim)" }} /> : <FolderSimple size={12} style={{ color: "var(--fg-dim)" }} />}
                                              <span className="text-mono-data" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                                                {cls.code}
                                              </span>
                                              <span className="text-mono-data" style={{ fontSize: 12, color: "var(--fg-primary)" }}>
                                                {cls.title}
                                              </span>
                                            </div>

                                            {/* Commodities */}
                                            {isClsOpen && (
                                              <div style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 1 }}>
                                                {cls.commodities.map((com) => {
                                                  const isSelected = selectedCommodity.code === com.code;
                                                  return (
                                                    <button
                                                      key={com.code}
                                                      onClick={() => setSelectedCommodity(com)}
                                                      style={{
                                                        textAlign: "left",
                                                        border: "none",
                                                        background: isSelected ? "var(--bg-surface)" : "transparent",
                                                        borderLeft: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                                                        padding: "6px 12px",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                      }}
                                                    >
                                                      <Tag size={11} style={{ color: isSelected ? "var(--accent)" : "var(--mono-meta)" }} />
                                                      <span className="text-mono-data" style={{ color: isSelected ? "var(--accent)" : "var(--fg-primary)", fontSize: 11 }}>
                                                        {com.code}
                                                      </span>
                                                      <span className="text-mono-label" style={{ color: isSelected ? "var(--fg-primary)" : "var(--fg-secondary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {com.title}
                                                      </span>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── RIGHT: Commodity Schema & Attribute Inspector ── */}
            <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {/* Commodity Title Banner */}
              <div
                style={{
                  padding: "24px 36px",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="badge badge-dim">UNSPSC LEVEL 4</span>
                  <span className="text-mono-data" style={{ color: "var(--accent)", fontSize: 14, fontWeight: "bold" }}>
                    {selectedCommodity.code}
                  </span>
                </div>

                <h2 className="text-display" style={{ fontSize: "2rem", marginBottom: 6 }}>
                  {selectedCommodity.title}.
                </h2>

                <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                  {selectedCommodity.description}
                </p>
              </div>

              {/* Governed Schema Table */}
              <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ border: "1px solid var(--border)" }}>
                  <div
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "var(--bg-elevated)",
                      borderBottom: "1px solid var(--border-dim)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                      Expected Attribute Definitions for {selectedCommodity.code}
                    </span>
                    <span className="text-mono-label" style={{ fontSize: 12 }}>
                      {selectedCommodity.expectedAttributes.length} GOVERNED PROPERTIES
                    </span>
                  </div>

                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 90px 90px 1fr 180px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    {["ATTRIBUTE NAME", "DATA TYPE", "REQ / OPT", "ALLOWED VALUES / REGISTRY", "NORMALIZATION RULE"].map((h, i) => (
                      <div
                        key={h}
                        className="text-mono-label"
                        style={{
                          padding: "8px 12px",
                          fontSize: 11.5,
                          color: "var(--fg-dim)",
                          borderRight: i < 4 ? "1px solid var(--border-dim)" : "none",
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {selectedCommodity.expectedAttributes.map((attr, idx) => (
                    <div
                      key={attr.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 90px 90px 1fr 180px",
                        borderTop: idx > 0 ? "1px solid var(--border-dim)" : "none",
                      }}
                    >
                      <div className="text-mono-label" style={{ padding: "10px 12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                        {attr.name}
                      </div>
                      <div className="text-mono-data" style={{ padding: "10px 12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-secondary)" }}>
                        {attr.type} {attr.uom ? `(${attr.uom})` : ""}
                      </div>
                      <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border-dim)" }}>
                        <span
                          className="badge"
                          style={{
                            color: attr.required ? "var(--status-warn)" : "var(--fg-dim)",
                            borderColor: attr.required ? "var(--status-warn)" : "var(--border-dim)",
                            fontSize: 11,
                          }}
                        >
                          {attr.required ? "REQUIRED" : "OPTIONAL"}
                        </span>
                      </div>
                      <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border-dim)" }}>
                        {attr.allowedValues ? (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {attr.allowedValues.map((v) => (
                              <span key={v} className="badge badge-dim" style={{ fontSize: 11 }}>
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--mono-meta)" }}>
                            OPEN RANGE / NUMERIC
                          </span>
                        )}
                      </div>
                      <div className="text-mono-label" style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--fg-secondary)" }}>
                        {attr.normalizationRule}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Training / Test Descriptions for this Commodity */}
                <div style={{ border: "1px solid var(--border)" }}>
                  <div
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "var(--bg-elevated)",
                      borderBottom: "1px solid var(--border-dim)",
                    }}
                  >
                    <span className="text-mono-label" style={{ color: "var(--fg-secondary)", fontSize: 12, fontWeight: 600 }}>
                      Sample Distributor Records for {selectedCommodity.code}
                    </span>
                  </div>

                  {selectedCommodity.sampleDescriptions.map((desc, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 16px",
                        borderTop: i > 0 ? "1px solid var(--border-dim)" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-primary)" }}>
                        {desc}
                      </code>
                      <button
                        onClick={() => {
                          setSandboxInput(desc);
                          runClassification(desc);
                        }}
                        className="btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 11.5 }}
                      >
                        RUN IN SANDBOX
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
