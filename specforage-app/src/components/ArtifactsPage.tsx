import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import manufacturerBrand from "../../public/artifacts/manufacturer_brand_vocabulary.json";
import attributeVocabulary from "../../public/artifacts/attribute_vocabulary.json";
import uomRules from "../../public/artifacts/uom_rules.json";
import taxonomyBridge from "../../public/artifacts/taxonomy_bridge.json";

const DOWNLOADS = [
  ["Manufacturer + brand vocabulary", "/artifacts/manufacturer_brand_vocabulary.json", "JSON"],
  ["Attribute vocabulary snapshot", "/artifacts/attribute_vocabulary.json", "JSON"],
  ["UOM + fraction rules", "/artifacts/uom_rules.json", "JSON"],
  ["Taxonomy bridge", "/artifacts/taxonomy_bridge.json", "JSON"],
  ["Taxonomy bridge", "/artifacts/taxonomy_bridge.csv", "CSV"],
  ["Methodology + examples", "/artifacts/VOCABULARIES.md", "MD"],
] as const;

function Percent({ value }: { value: number }) {
  return <span className="text-mono-data">{value.toFixed(2)}%</span>;
}

export default function ArtifactsPage() {
  const entityRows = [
    { name: "Manufacturers", data: manufacturerBrand.manufacturers },
    { name: "Brands", data: manufacturerBrand.brands },
  ];

  return <main className="artifacts-page">
    <div className="noise-overlay" aria-hidden="true" />
    <header className="artifacts-hero">
      <div>
        <div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 12 }}>[ Reference / Published Artifacts ]</div>
        <h1 className="text-display">Inspect the rules.</h1>
      </div>
      <p>Versioned snapshots derived from the supplied catalog files and published pipeline traces. These are inspectable evidence—not hidden configuration and not external standards.</p>
    </header>

    <section className="artifact-metrics" aria-label="Artifact summary">
      <div><span className="text-mono-label">Manufacturers</span><strong>{manufacturerBrand.manufacturers.canonical_entries}</strong><small>{manufacturerBrand.manufacturers.unique_observed_strings} observed strings</small></div>
      <div><span className="text-mono-label">Brands</span><strong>{manufacturerBrand.brands.canonical_entries}</strong><small>{manufacturerBrand.brands.unique_observed_strings} observed strings</small></div>
      <div><span className="text-mono-label">Attribute values</span><strong>{attributeVocabulary.canonical_entries}</strong><small>{attributeVocabulary.observed_values} observations</small></div>
      <div><span className="text-mono-label">UOM</span><strong>{uomRules.canonical_uom_count}</strong><small>{uomRules.alias_count_including_canonical} accepted spellings</small></div>
      <div><span className="text-mono-label">Bridge coverage</span><strong>{taxonomyBridge.coverage.mapped_unspsc_commodities}</strong><small>UNSPSC commodities</small></div>
    </section>

    <section className="artifact-section" aria-labelledby="downloads-title">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Source files</div><h2 id="downloads-title" className="text-display">Download artifacts.</h2></div><p>Static production files; no login or API call required.</p></div>
      <div className="artifact-downloads">{DOWNLOADS.map(([label, href, format]) => <a key={`${href}-${format}`} className="artifact-download" href={href} download>
        <span><strong>{label}</strong><small className="text-mono-label">{format}</small></span><DownloadSimple size={18} aria-hidden="true" />
      </a>)}</div>
    </section>

    <section className="artifact-section" aria-labelledby="entities-title">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Self-derived</div><h2 id="entities-title" className="text-display">Entity vocabulary.</h2></div><p>96% fuzzy clustering after comparison-only legal-suffix, punctuation, vendor-code, and case normalization. Display values retain sourced spellings.</p></div>
      <div className="artifact-rule"><span className="text-mono-label">Trailing legal suffixes</span><div>{manufacturerBrand.legal_suffix_normalization.suffixes_removed_when_trailing.join(" · ")}</div></div>
      {entityRows.map(({ name, data }) => <details className="artifact-disclosure" key={name}>
        <summary><span>{name}</span><span className="text-mono-label">{data.canonical_entries} canonical · <Percent value={data.fuzzy_collapsed_percent} /> fuzzy-collapsed</span></summary>
        <div className="artifact-table-wrap"><table className="artifact-table"><thead><tr><th>Canonical</th><th>Frequency</th><th>Observed aliases</th></tr></thead><tbody>
          {data.entries.map((entry) => <tr key={entry.canonical_name}><td>{entry.canonical_name}</td><td className="text-mono-data">{entry.frequency}</td><td>{entry.aliases.map((alias) => alias.observed).join(" · ")}</td></tr>)}
        </tbody></table></div>
      </details>)}
    </section>

    <section className="artifact-section" aria-labelledby="attributes-title">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Self-building snapshot</div><h2 id="attributes-title" className="text-display">Attribute vocabulary.</h2></div><p>{attributeVocabulary.note}</p></div>
      <div className="artifact-table-wrap"><table className="artifact-table"><thead><tr><th>Attribute</th><th>Canonical value</th><th>UOM</th><th>Source scope</th></tr></thead><tbody>
        {attributeVocabulary.entries.map((entry, index) => <tr key={`${entry.classpath}-${entry.label}-${index}`}><td>{entry.label}</td><td>{entry.canonical_value}</td><td className="text-mono-data">{entry.canonical_uom || "—"}</td><td title={entry.classpath}>{entry.classpath.split(">").at(-1)}</td></tr>)}
      </tbody></table></div>
    </section>

    <section className="artifact-section" aria-labelledby="uom-title">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Universal code table</div><h2 id="uom-title" className="text-display">UOM + fractions.</h2></div><p>{uomRules.decimal_to_fraction.rounding}. {uomRules.decimal_to_fraction.application}</p></div>
      <div className="uom-grid">{Object.entries(uomRules.uom_aliases).map(([canonical, aliases]) => <div className="uom-row" key={canonical}><strong className="text-mono-data">{canonical}</strong><span>{aliases.join(" · ")}</span></div>)}</div>
      <div className="fraction-examples">{uomRules.decimal_to_fraction.examples.map((example) => <div key={example.before}><code>{example.before}</code><span>→</span><code>{example.after}</code></div>)}</div>
    </section>

    <section className="artifact-section" aria-labelledby="bridge-title">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Manual, limited coverage</div><h2 id="bridge-title" className="text-display">Taxonomy bridge.</h2></div><p>{taxonomyBridge.method} Only one private classpath was observed; every inferred path carries its own confidence and caveat.</p></div>
      <div className="artifact-table-wrap"><table className="artifact-table bridge-table"><thead><tr><th>UNSPSC</th><th>Commodity</th><th>Proposed Unilog-style classpath</th><th>Confidence</th><th>Caveat</th></tr></thead><tbody>
        {taxonomyBridge.mappings.map((mapping) => <tr key={mapping.unspsc_code}><td className="text-mono-data">{mapping.unspsc_code}</td><td>{mapping.commodity}</td><td>{mapping.unilog_style_classpath.replaceAll(">", " › ")}</td><td><span className={`badge ${mapping.confidence === "high" ? "badge-ok" : mapping.confidence === "low" ? "badge-warn" : "badge-dim"}`}>{mapping.confidence}</span></td><td>{mapping.caveat}</td></tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
