# Bibliocrunch method

## 1. The object being folded

For each verse \(i\), Bibliocrunch constructs a declared numerical signature:

\[
S_i = (b_i, c_i, v_i, n_i, \bar{n}_i, d_i, \tau_i, w_i, \ell_i, a_i)
\]

where:

- \(b\) is zero-based book order in the active corpus;
- \(c\) and \(v\) are chapter and verse numbers;
- \(n\) and \(\bar{n}\) are forward and reverse canonical ordinals;
- \(d\) is the digital root of the one-based ordinal;
- \(\tau\) is the ordinal's number of positive divisors;
- \(w\) and \(\ell\) are English word and ASCII-letter counts;
- \(a\) is the English A1Z26 sum, with A=1 through Z=26.

Each corpus profile must state its text edition, book order, versification, and numeric normalization. Changing any of those choices changes the object under study.

## 2. Folding

A fold is a deterministic function:

\[
F(S_i; \theta) \rightarrow p_i \in \mathbb{R}^3
\]

where \(\theta\) contains any declared parameters, such as modular bases. The same corpus, fold, and parameters must always produce the same point field.

The current prototype implements direct address projection, reflection, spiral projection, principal-component projection, and modular projection. It centers and scales the final field by one common scalar so that axis proportions are preserved.

## 3. Relations

Relations are labeled edges computed from explicit arithmetic predicates. They do not affect point placement in the current prototype; they are overlays used to inspect an anchor passage.

Examples:

- local verse mirror: \(v_i + v_j = V_{chapter} + 1\);
- canonical mirror: \(n_i + n_j = N + 1\);
- reciprocal address: \((c_i, v_i) = (v_j, c_j)\);
- A1Z26 equality: \(a_i = a_j\).

Keeping relations separate from folds makes the causal sequence inspectable. A later constraint-solver mode may allow selected relation families to generate the embedding, but it must record every edge weight and directional convention.

## 4. Geometry description

Bibliocrunch computes the covariance eigenvalues of the point field, normalizes them to total variance, and reports:

- effective dimensionality (inverse participation ratio);
- linearity;
- planarity;
- radial coherence;
- approximate bilateral balance based on axis skew.

The label—such as *axial filament*, *planar folio*, *radial shell*, or *bilateral volume*—summarizes those measurements. It is not an ontological declaration that the corpus "is" that shape.

## 5. Reading paths

An axis reading selects the points with the least perpendicular distance from the chosen anchor's X, Y, or Z line and then sorts them along that axis. A nearest reading uses Euclidean distance. Canonical readings preserve received sequence. Rule-orbit readings contain the anchor and the targets produced by active arithmetic relations.

These are generated juxtapositions. Interpretation occurs after path extraction.

## 6. Null control

Given a seed, Bibliocrunch performs a deterministic Fisher–Yates permutation of passage identities within the active scope. Numeric slots and geometry remain fixed, while verse references and texts move.

This control asks a precise question:

> Is this path persuasive because of the received passage-to-number assignment, or would an arbitrary assignment produce an equally persuasive reading?

Future controls should also include:

- randomized chapter and verse boundaries while preserving book lengths;
- alternate historical versifications;
- alternate canonical book orders;
- matched synthetic corpora preserving length and vocabulary distributions;
- correction for the number of folds and paths searched.

## 7. Interpretation policy

The apparatus distinguishes four layers:

1. **Data:** text, edition, canon, address, and declared features.
2. **Transformation:** the exact function producing coordinates or edges.
3. **Observation:** measured shape, adjacency, or path.
4. **Interpretation:** a human claim about conceptual, theological, literary, or mystical significance.

Only the first three are computed. The fourth remains an argument to be made, compared against controls, and preserved with its provenance.

