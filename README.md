# Bibliocrunch

**A numerical hermeneutics workbench for folding Biblical address structures into explorable geometry.**

Concept and direction by **Christopher W. Mahl**.

Bibliocrunch treats a received scriptural corpus as a structured numerical object. Every verse carries an address and derived signature—book, chapter, verse, canonical ordinal, reverse ordinal, digital root, divisor count, word and letter counts, and a declared English A1Z26 sum. A fold schema maps those values into three-dimensional coordinates. Only after the geometry exists does the reader inspect the passages that have become neighbors, edges, mirrors, or paths.

> Numbers first. Interpretation second.

## What the α 0.1 prototype does

- Loads all **31,102 verses** and **66 books** of the KJV 1769 corpus locally.
- Generates five deterministic geometries:
  - canonical lattice;
  - tri-mirror tower;
  - canonical spiral;
  - nine-feature PCA signature manifold;
  - adjustable modular crystal.
- Draws six declared relation types from any selected verse:
  - chapter mirror;
  - proportional book mirror;
  - canonical mirror;
  - reciprocal chapter/verse address;
  - shared ordinal digital root;
  - equal English A1Z26 sum.
- Classifies the resulting point field using measured variance, effective dimensionality, radial dispersion, and axis skew.
- Extracts approximate X, Y, and Z edges, nearest-neighbor readings, canonical neighborhoods, and rule orbits.
- Includes a deterministic **null control** that keeps the geometry fixed while shuffling passage identities among numeric slots.
- Exports readings to Obsidian-compatible Markdown with `[[wikilinks]]`, coordinates, schema, seed, and null-control status.
- Supports mouse, touch, keyboard rotation, zooming, point selection, and responsive layouts.

## Run locally

Bibliocrunch requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The terminal will print the local URL. Open it in a browser.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm test
```

`npm test` performs the full production build, validates the generated worker artifact, runs the numerical engine tests, and verifies server-rendered output.

## Fold schemas

| Fold | Coordinate rule | What it exposes |
|---|---|---|
| Canonical lattice | X = book; Y = normalized chapter; Z = normalized verse | The received address system as a direct field |
| Tri-mirror tower | X = folded book distance; Y = folded chapter distance; Z = signed verse position | Contacts created by reflecting outer books and chapters inward |
| Canonical spiral | angle = book + chapter fraction; radius = verse fraction; Z = ordinal | Repeated canonical cycles rising through sequence |
| Signature manifold | PCA over nine standardized numeric features | The three strongest joint axes present in the selected signatures |
| Modular crystal | X/Y/Z = ordinal residues modulo configurable integers | Congruence classes and repeating arithmetic cells |

The exact active formula is always shown in the interface. No semantic embedding or language model determines point placement.

## Epistemic discipline

Bibliocrunch is a **hypothesis generator**, not a machine that proves hidden authorial intent.

Chapter and verse divisions are later editorial structures, book order differs by canon, and English A1Z26 values belong to this translation rather than to the Hebrew or Greek source texts. Those facts do not make the received structure uninteresting; they define what object is actually being studied.

The shuffle control is essential. If an apparently meaningful edge remains equally persuasive when arbitrary passages occupy the same coordinates, the interpretation is likely produced by selection and human pattern-recognition rather than by the textual structure. See [docs/METHOD.md](docs/METHOD.md) for the formal model and controls.

## Corpus and future canons

The current prototype uses the public-domain KJV text distributed by the `es-kjv` package. Corpus ingestion is separated from coordinate generation so future profiles can declare:

- Protestant, Catholic, Orthodox, Ethiopian, and custom book orders;
- Deuterocanonical and apocryphal collections;
- alternative chapter/verse systems;
- Hebrew and Greek editions with explicit manuscript and orthographic normalization;
- multiple gematria/isopsephy functions without silently combining them.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the path from this prototype to the full geometry-search apparatus.

## Project structure

```text
app/components/BibliocrunchApp.tsx  Interface and experiment controls
app/components/GeometryCanvas.tsx   Interactive 3D projection renderer
lib/bibliocrunch.ts                 Corpus, folds, relations, PCA, paths, controls
tests/bibliocrunch.test.ts          Numerical and corpus invariants
docs/METHOD.md                      Formal method and interpretive limits
docs/ROADMAP.md                     Planned corpora and geometry search
```

## Ownership

Copyright © 2026 Christopher W. Mahl. All rights reserved. The source is publicly inspectable but is not released under an open-source license. Third-party packages and corpus data retain their own licensing terms. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

