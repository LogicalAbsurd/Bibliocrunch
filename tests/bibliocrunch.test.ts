import assert from "node:assert/strict";
import test from "node:test";
import { verses as kjvVerseMap } from "es-kjv";
import {
  analyzeGeometry,
  buildCorpus,
  computeCoordinates,
  countDivisors,
  createNullAssignments,
  digitRoot,
  englishA1Z26,
  extractReadingPath,
  findRelations,
  makeObsidianMarkdown,
  parseReference,
  type FoldMode,
} from "../lib/bibliocrunch";

const toyMap = {
  "Genesis 1:1": "In the beginning.",
  "Genesis 1:2": "Without form and void.",
  "Genesis 1:3": "Let there be light.",
  "Genesis 2:1": "The heavens were finished.",
  "Genesis 2:2": "He rested.",
  "Genesis 2:3": "God blessed the seventh day.",
  "Exodus 1:1": "These are the names.",
  "Exodus 1:2": "Reuben, Simeon, Levi, and Judah.",
  "Exodus 1:3": "Issachar, Zebulun, and Benjamin.",
};

test("parses multiword and numbered book references", () => {
  assert.deepEqual(parseReference("Song of Solomon 3:4"), {
    book: "Song of Solomon",
    chapter: 3,
    verse: 4,
  });
  assert.deepEqual(parseReference("1 John 1:1"), {
    book: "1 John",
    chapter: 1,
    verse: 1,
  });
  assert.equal(parseReference("not a reference"), null);
});

test("calculates declared numeric features", () => {
  assert.equal(digitRoot(31102), 7);
  assert.equal(countDivisors(12), 6);
  assert.equal(countDivisors(13), 2);
  assert.equal(englishA1Z26("Abba"), 6);
});

test("builds a stable address corpus with chapter metadata", () => {
  const corpus = buildCorpus(toyMap);
  assert.equal(corpus.length, 9);
  assert.equal(corpus[0].reference, "Genesis 1:1");
  assert.equal(corpus[0].bookChapterCount, 2);
  assert.equal(corpus[0].chapterVerseCount, 3);
  assert.equal(corpus[8].reverseOrdinal, 1);
  assert.equal(corpus[1].wordCount, 4);
});

test("loads the complete integrated KJV corpus", () => {
  const corpus = buildCorpus(kjvVerseMap as Record<string, string>);
  assert.equal(corpus.length, 31_102);
  assert.equal(new Set(corpus.map((verse) => verse.book)).size, 66);
  assert.match(
    corpus.find((verse) => verse.reference === "John 3:16")?.text ?? "",
    /everlasting life/i,
  );
});

test("every fold is deterministic and finite", () => {
  const corpus = buildCorpus(toyMap);
  const parameters = { modulusX: 7, modulusY: 12, modulusZ: 40 };
  const modes: FoldMode[] = [
    "canonical-lattice",
    "tri-mirror",
    "canon-spiral",
    "signature-pca",
    "modular-crystal",
  ];
  for (const mode of modes) {
    const first = computeCoordinates(corpus, mode, parameters);
    const second = computeCoordinates(corpus, mode, parameters);
    assert.deepEqual(first, second);
    assert.equal(first.length, corpus.length);
    assert.ok(first.every((point) => [point.x, point.y, point.z].every(Number.isFinite)));
  }
});

test("geometry analysis reports bounded, explicit measurements", () => {
  const corpus = buildCorpus(toyMap);
  const points = computeCoordinates(corpus, "canonical-lattice", {
    modulusX: 7,
    modulusY: 12,
    modulusZ: 40,
  });
  const result = analyzeGeometry(points);
  assert.ok(result.effectiveDimensions >= 1 && result.effectiveDimensions <= 3);
  assert.ok(result.bilateralSymmetry >= 0 && result.bilateralSymmetry <= 1);
  assert.equal(result.eigenvalues.length, 3);
});

test("relation rules produce chapter, canon, and reciprocal edges without semantics", () => {
  const corpus = buildCorpus(toyMap);
  const selectedIndex = corpus.findIndex((verse) => verse.reference === "Genesis 1:2");
  const relations = findRelations(corpus, selectedIndex, [
    "chapter-mirror",
    "canon-mirror",
    "reciprocal-address",
  ]);
  const targets = relations.map((relation) => corpus[relation.targetIndex].reference);
  assert.ok(targets.includes("Genesis 2:1"));
  assert.ok(relations.some((relation) => relation.rule === "canon-mirror"));
});

test("seeded null assignment is repeatable and preserves every passage", () => {
  const corpus = buildCorpus(toyMap);
  const first = createNullAssignments(corpus, true, "fold-001");
  const second = createNullAssignments(corpus, true, "fold-001");
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((assignment) => assignment.source.reference).sort(),
    corpus.map((verse) => verse.reference).sort(),
  );
  assert.ok(first.some((assignment) => assignment.slot.reference !== assignment.source.reference));
});

test("axis readings include the anchor and export Obsidian wikilinks", () => {
  const corpus = buildCorpus(toyMap);
  const points = computeCoordinates(corpus, "tri-mirror", {
    modulusX: 7,
    modulusY: 12,
    modulusZ: 40,
  });
  const selectedIndex = 1;
  const path = extractReadingPath(points, selectedIndex, "z-axis", 6);
  assert.ok(path.includes(selectedIndex));
  const assignments = createNullAssignments(corpus, false, "fold-001");
  const markdown = makeObsidianMarkdown({
    title: "Test fold",
    mode: "tri-mirror",
    scope: "all",
    seed: "fold-001",
    nullControl: false,
    pathKind: "z-axis",
    path,
    assignments,
    points,
  });
  assert.match(markdown, /\[\[Genesis 1:2\]\]/);
  assert.match(markdown, /Numerical adjacency is a hypothesis generator/);
});
