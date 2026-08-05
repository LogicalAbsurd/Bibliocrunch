"use client";

import { FormEvent, useDeferredValue, useMemo, useState } from "react";
import { verses as kjvVerseMap } from "es-kjv";
import {
  FOLD_FORMULAS,
  FOLD_LABELS,
  RELATION_LABELS,
  analyzeGeometry,
  buildCorpus,
  computeCoordinates,
  createNullAssignments,
  extractReadingPath,
  filterCorpus,
  findRelations,
  makeObsidianMarkdown,
  type FoldMode,
  type FoldParameters,
  type RelationRule,
} from "@/lib/bibliocrunch";
import { GeometryCanvas } from "./GeometryCanvas";

const foldDescriptions: Record<FoldMode, string> = {
  "canonical-lattice": "The received address system as a three-axis field.",
  "tri-mirror": "Fold books and chapters inward; retain verse height.",
  "canon-spiral": "Wind canonical sequence around a rising verse-radius helix.",
  "signature-pca": "Let nine normalized numeric features choose the strongest axes.",
  "modular-crystal": "Project ordinal residues through three adjustable moduli.",
};

const relationDescriptions: Record<RelationRule, string> = {
  "chapter-mirror": "v pairs with V + 1 − v inside its chapter",
  "book-mirror": "proportional address across reversed book order",
  "canon-mirror": "n pairs with N + 1 − n in the active scope",
  "reciprocal-address": "chapter:verse is exchanged with verse:chapter",
  "digital-root": "nearest ordinals with the same digital root",
  "a1z26-equality": "equal A=1 … Z=26 sums in the English text",
};

const allRules = Object.keys(relationDescriptions) as RelationRule[];
const foldModes = Object.keys(foldDescriptions) as FoldMode[];

type PathKind =
  | "z-axis"
  | "y-axis"
  | "x-axis"
  | "nearest"
  | "canonical"
  | "relations";

const pathLabels: Record<PathKind, string> = {
  "z-axis": "Vertical edge",
  "y-axis": "Depth edge",
  "x-axis": "Cross edge",
  nearest: "Nearest points",
  canonical: "Canonical neighborhood",
  relations: "Rule orbit",
};

const corpus = buildCorpus(kjvVerseMap as Record<string, string>);
const books = Array.from(new Set(corpus.map((verse) => verse.book)));

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function BibliocrunchApp() {
  const [scope, setScope] = useState("all");
  const [foldMode, setFoldMode] = useState<FoldMode>("tri-mirror");
  const [parameters, setParameters] = useState<FoldParameters>({
    modulusX: 7,
    modulusY: 12,
    modulusZ: 40,
  });
  const [activeRules, setActiveRules] = useState<RelationRule[]>([
    "chapter-mirror",
    "book-mirror",
    "canon-mirror",
    "reciprocal-address",
    "digital-root",
  ]);
  const [selectedReference, setSelectedReference] = useState("John 1:1");
  const [pathKind, setPathKind] = useState<PathKind>("z-axis");
  const [pathLength, setPathLength] = useState(12);
  const [nullControl, setNullControl] = useState(false);
  const [seed, setSeed] = useState("BIBLIOCRUNCH-001");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const scopedVerses = useMemo(() => filterCorpus(corpus, scope), [scope]);
  const selectedIndex = useMemo(() => {
    const index = scopedVerses.findIndex((verse) => verse.reference === selectedReference);
    return index >= 0 ? index : 0;
  }, [scopedVerses, selectedReference]);
  const coordinates = useMemo(
    () => computeCoordinates(scopedVerses, foldMode, parameters),
    [foldMode, parameters, scopedVerses],
  );
  const geometry = useMemo(() => analyzeGeometry(coordinates), [coordinates]);
  const assignments = useMemo(
    () => createNullAssignments(scopedVerses, nullControl, seed),
    [nullControl, scopedVerses, seed],
  );
  const relations = useMemo(
    () => findRelations(scopedVerses, selectedIndex, activeRules),
    [activeRules, scopedVerses, selectedIndex],
  );
  const path = useMemo(() => {
    if (pathKind === "relations") {
      return Array.from(
        new Set([selectedIndex, ...relations.map((relation) => relation.targetIndex)]),
      ).slice(0, pathLength);
    }
    return extractReadingPath(coordinates, selectedIndex, pathKind, pathLength);
  }, [coordinates, pathKind, pathLength, relations, selectedIndex]);

  const selected = assignments[selectedIndex];
  const searchResults = useMemo(() => {
    if (deferredSearch.length < 2) return [];
    return corpus
      .map((verse) => {
        const reference = verse.reference.toLowerCase();
        const text = verse.text.toLowerCase();
        let score = 0;
        if (reference === deferredSearch) score = 100;
        else if (reference.startsWith(deferredSearch)) score = 70;
        else if (reference.includes(deferredSearch)) score = 55;
        else if (text.includes(deferredSearch)) score = 20;
        return { verse, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.verse.ordinal - b.verse.ordinal)
      .slice(0, 7)
      .map((result) => result.verse);
  }, [deferredSearch]);

  const exportTitle = `Bibliocrunch — ${pathLabels[pathKind]} from ${selected?.source.reference ?? "unknown"}`;
  const exportMarkdown = useMemo(
    () =>
      makeObsidianMarkdown({
        title: exportTitle,
        mode: foldMode,
        scope,
        seed,
        nullControl,
        pathKind,
        path,
        assignments,
        points: coordinates,
      }),
    [assignments, coordinates, exportTitle, foldMode, nullControl, path, pathKind, scope, seed],
  );

  const selectReference = (reference: string) => {
    if (!scopedVerses.some((verse) => verse.reference === reference)) setScope("all");
    setSelectedReference(reference);
    setSearch("");
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (searchResults[0]) selectReference(searchResults[0].reference);
  };

  const setModulus = (axis: keyof FoldParameters, value: number) => {
    setParameters((current) => ({
      ...current,
      [axis]: Math.max(2, Math.min(144, Math.round(value || 2))),
    }));
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="eyebrow">Numerical hermeneutics workbench</p>
            <h1>Bibliocrunch</h1>
          </div>
        </div>
        <div className="header-meta">
          <span>KJV 1769</span>
          <span>31,102 verses</span>
          <span className="alpha-badge">α 0.1</span>
        </div>
      </header>

      <section className="thesis-strip">
        <p>
          Fold the canon by declared numerical rules. Then read the passages that the geometry makes adjacent.
        </p>
        <strong>Numbers first. Interpretation second.</strong>
      </section>

      <div className="workbench">
        <aside className="control-rail" aria-label="Folding controls">
          <section className="panel-section search-section">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div><h2>Find an anchor</h2><p>Reference or phrase</p></div>
            </div>
            <form className="search-form" onSubmit={submitSearch}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="John 1:1 or ‘without form’"
                aria-label="Search Bible reference or verse text"
              />
              <button type="submit">Go</button>
            </form>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((verse) => (
                  <button key={verse.reference} type="button" onClick={() => selectReference(verse.reference)}>
                    <strong>{verse.reference}</strong>
                    <span>{verse.text}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div><h2>Choose the field</h2><p>Versification scope</p></div>
            </div>
            <label className="field-label" htmlFor="scope">Corpus scope</label>
            <select
              id="scope"
              value={scope}
              onChange={(event) => {
                const nextScope = event.target.value;
                const nextVerses = filterCorpus(corpus, nextScope);
                setScope(nextScope);
                if (!nextVerses.some((verse) => verse.reference === selectedReference)) {
                  setSelectedReference(nextVerses[0]?.reference ?? "Genesis 1:1");
                }
              }}
            >
              <option value="all">Whole Protestant canon</option>
              <option value="old">Old Testament</option>
              <option value="new">New Testament</option>
              <optgroup label="Single book">
                {books.map((book) => <option key={book} value={`book:${book}`}>{book}</option>)}
              </optgroup>
            </select>
            <div className="scope-readout">
              <strong>{scopedVerses.length.toLocaleString()}</strong>
              <span>numeric addresses active</span>
            </div>
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <span className="section-number">03</span>
              <div><h2>Select a fold</h2><p>Coordinate schema</p></div>
            </div>
            <div className="fold-list">
              {foldModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={foldMode === mode ? "fold-option active" : "fold-option"}
                  aria-pressed={foldMode === mode}
                  onClick={() => setFoldMode(mode)}
                >
                  <span className="fold-radio" />
                  <span><strong>{FOLD_LABELS[mode]}</strong><small>{foldDescriptions[mode]}</small></span>
                </button>
              ))}
            </div>
            <div className="formula-readout"><span>ƒ</span><code>{FOLD_FORMULAS[foldMode]}</code></div>
            {foldMode === "modular-crystal" && (
              <div className="modulus-grid">
                {(["modulusX", "modulusY", "modulusZ"] as const).map((axis, index) => (
                  <label key={axis}>
                    <span>{["X", "Y", "Z"][index]} modulus</span>
                    <input
                      type="number"
                      min="2"
                      max="144"
                      value={parameters[axis]}
                      onChange={(event) => setModulus(axis, Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <span className="section-number">04</span>
              <div><h2>Relation overlays</h2><p>Edges from the anchor</p></div>
            </div>
            <div className="rule-list">
              {allRules.map((rule) => {
                const checked = activeRules.includes(rule);
                return (
                  <label key={rule} className="rule-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setActiveRules((current) =>
                          checked ? current.filter((item) => item !== rule) : [...current, rule],
                        )
                      }
                    />
                    <span className="checkmark" />
                    <span><strong>{RELATION_LABELS[rule]}</strong><small>{relationDescriptions[rule]}</small></span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="panel-section control-section">
            <div className="section-heading">
              <span className="section-number">05</span>
              <div><h2>Null control</h2><p>Test the interpretation</p></div>
            </div>
            <label className="switch-row">
              <input type="checkbox" checked={nullControl} onChange={() => setNullControl((value) => !value)} />
              <span className="switch" />
              <span><strong>Shuffle passage identities</strong><small>Geometry remains fixed; texts move among numeric slots.</small></span>
            </label>
            <label className="field-label seed-label">
              Seed
              <input value={seed} disabled={!nullControl} onChange={(event) => setSeed(event.target.value)} />
            </label>
          </section>
        </aside>

        <section className="geometry-column" aria-label="Folded geometry">
          <div className="geometry-header">
            <div>
              <p className="eyebrow">Active structure</p>
              <h2>{geometry.label}</h2>
            </div>
            <div className="geometry-stats">
              <span><b>{geometry.effectiveDimensions.toFixed(2)}</b> effective dimensions</span>
              <span><b>{percentage(geometry.bilateralSymmetry)}</b> bilateral balance</span>
            </div>
          </div>
          <GeometryCanvas
            points={coordinates}
            assignments={assignments}
            selectedIndex={selectedIndex}
            relations={relations}
            path={path}
            nullControl={nullControl}
            onSelect={(index) => setSelectedReference(scopedVerses[index]?.reference ?? selectedReference)}
          />
          <div className="metric-bar" aria-label="Geometry measurements">
            <div><span>Linearity</span><i><b style={{ width: percentage(geometry.linearity) }} /></i><strong>{percentage(geometry.linearity)}</strong></div>
            <div><span>Planarity</span><i><b style={{ width: percentage(geometry.planarity) }} /></i><strong>{percentage(geometry.planarity)}</strong></div>
            <div><span>Radial coherence</span><i><b style={{ width: percentage(geometry.radialCoherence) }} /></i><strong>{percentage(geometry.radialCoherence)}</strong></div>
          </div>
          <details className="method-note">
            <summary>Read the method before reading meaning</summary>
            <p>
              Positions are produced only by the displayed numeric schema. Semantic similarity does not place points.
              The shape label is calculated from variance, dimensionality, radial dispersion, and axis skew. It is descriptive,
              not a claim that an ancient author encoded this structure. Use the shuffle control to see whether an apparent
              interpretive pattern survives random passage assignment.
            </p>
          </details>
        </section>

        <aside className="reading-rail" aria-label="Selected verse and generated reading">
          <section className="anchor-card">
            <div className="anchor-kicker">
              <span>Anchor passage</span>
              <b>n = {(selected?.slot.ordinal ?? 0) + 1}</b>
            </div>
            <h2>{selected?.source.reference}</h2>
            {nullControl && selected?.slot.reference !== selected?.source.reference && (
              <p className="null-slot">occupying numeric slot <strong>{selected?.slot.reference}</strong></p>
            )}
            <blockquote>{selected?.source.text}</blockquote>
            <div className="signature-grid">
              <span><b>B</b>{(selected?.slot.bookIndex ?? 0) + 1}</span>
              <span><b>C</b>{selected?.slot.chapter}</span>
              <span><b>V</b>{selected?.slot.verse}</span>
              <span><b>DR</b>{selected?.slot.digitRoot}</span>
              <span><b>τ</b>{selected?.slot.divisorCount}</span>
              <span><b>Σ</b>{selected?.source.a1z26.toLocaleString()}</span>
              <span><b>W</b>{selected?.source.wordCount}</span>
              <span><b>↤</b>{selected?.slot.reverseOrdinal.toLocaleString()}</span>
            </div>
          </section>

          <section className="reading-section">
            <div className="reading-heading">
              <div><p className="eyebrow">Generated reading</p><h2>{pathLabels[pathKind]}</h2></div>
              <span>{path.length} passages</span>
            </div>
            <div className="path-controls">
              {(Object.keys(pathLabels) as PathKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={pathKind === kind ? "active" : ""}
                  aria-pressed={pathKind === kind}
                  onClick={() => setPathKind(kind)}
                >
                  {pathLabels[kind]}
                </button>
              ))}
            </div>
            <label className="range-row">
              <span>Path length <b>{pathLength}</b></span>
              <input type="range" min="6" max="24" value={pathLength} onChange={(event) => setPathLength(Number(event.target.value))} />
            </label>
            <ol className="reading-list">
              {path.map((index) => {
                const item = assignments[index];
                if (!item) return null;
                return (
                  <li key={`${index}-${item.source.reference}`} className={index === selectedIndex ? "selected" : ""}>
                    <button type="button" onClick={() => setSelectedReference(item.slot.reference)}>
                      <span className="path-index">{String(path.indexOf(index) + 1).padStart(2, "0")}</span>
                      <span className="path-copy">
                        <strong>{item.source.reference}</strong>
                        {nullControl && item.slot.reference !== item.source.reference && <em>slot {item.slot.reference}</em>}
                        <small>{item.source.text}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="relation-section">
            <div className="reading-heading compact">
              <div><p className="eyebrow">Declared edges</p><h2>Anchor relations</h2></div>
              <span>{relations.length}</span>
            </div>
            {relations.length === 0 ? (
              <p className="empty-state">No active rule produces another point from this anchor in the current scope.</p>
            ) : (
              <ul className="relation-list">
                {relations.map((relation, index) => {
                  const target = assignments[relation.targetIndex];
                  return (
                    <li key={`${relation.rule}-${relation.targetIndex}-${index}`}>
                      <button type="button" onClick={() => setSelectedReference(target.slot.reference)}>
                        <span>{RELATION_LABELS[relation.rule]}</span>
                        <strong>{target.source.reference}</strong>
                        <small>{relation.label}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="export-section">
            <div><p className="eyebrow">Carry the fold outward</p><h2>Obsidian export</h2></div>
            <p>Creates a Markdown reading with wikilinks, coordinates, schema, seed, and control status.</p>
            <div className="export-actions">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(exportMarkdown);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? "Copied" : "Copy wikilinks"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => downloadText(`bibliocrunch-${selected?.source.reference.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`, exportMarkdown)}
              >
                Download .md
              </button>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p><strong>Bibliocrunch</strong> · Concept and direction by Christopher W. Mahl · Numerical adjacency is a hypothesis generator, not proof of hidden intent.</p>
        <p>English A1Z26 is explicitly translation-derived. Hebrew and Greek gematria require separately declared source texts and normalization rules.</p>
      </footer>
    </main>
  );
}
