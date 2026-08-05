export type Testament = "Old Testament" | "New Testament";

export type CorpusVerse = {
  reference: string;
  book: string;
  bookIndex: number;
  chapter: number;
  verse: number;
  ordinal: number;
  reverseOrdinal: number;
  bookChapterCount: number;
  chapterVerseCount: number;
  testament: Testament;
  text: string;
  wordCount: number;
  letterCount: number;
  a1z26: number;
  digitRoot: number;
  divisorCount: number;
};

export type Point3 = { x: number; y: number; z: number };

export type FoldMode =
  | "canonical-lattice"
  | "tri-mirror"
  | "canon-spiral"
  | "signature-pca"
  | "modular-crystal";

export type FoldParameters = {
  modulusX: number;
  modulusY: number;
  modulusZ: number;
};

export type RelationRule =
  | "chapter-mirror"
  | "book-mirror"
  | "canon-mirror"
  | "reciprocal-address"
  | "digital-root"
  | "a1z26-equality";

export type Relation = {
  sourceIndex: number;
  targetIndex: number;
  rule: RelationRule;
  label: string;
};

export type GeometryAnalysis = {
  label: string;
  effectiveDimensions: number;
  linearity: number;
  planarity: number;
  radialCoherence: number;
  bilateralSymmetry: number;
  eigenvalues: [number, number, number];
};

export type NullAssignment = {
  slot: CorpusVerse;
  source: CorpusVerse;
};

const referencePattern = /^(.+?)\s+(\d+):(\d+)$/;

export const FOLD_LABELS: Record<FoldMode, string> = {
  "canonical-lattice": "Canonical lattice",
  "tri-mirror": "Tri-mirror tower",
  "canon-spiral": "Canonical spiral",
  "signature-pca": "Signature manifold",
  "modular-crystal": "Modular crystal",
};

export const FOLD_FORMULAS: Record<FoldMode, string> = {
  "canonical-lattice": "x = book; y = chapter/book chapters; z = verse/chapter verses",
  "tri-mirror": "x = 1−|book|; y = 1−|chapter|; z = signed verse position",
  "canon-spiral": "angle = book + chapter fraction; radius = verse fraction; z = canon ordinal",
  "signature-pca": "PCA(book, chapter, verse, ordinal, digit root, factors, word/letter counts, A1Z26)",
  "modular-crystal": "x = ordinal mod p; y = ordinal mod q; z = ordinal mod r",
};

export const RELATION_LABELS: Record<RelationRule, string> = {
  "chapter-mirror": "Chapter mirror",
  "book-mirror": "Book mirror",
  "canon-mirror": "Canon mirror",
  "reciprocal-address": "Reciprocal address",
  "digital-root": "Shared digital root",
  "a1z26-equality": "Equal English A1Z26 sum",
};

export function parseReference(reference: string) {
  const match = reference.match(referencePattern);
  if (!match) return null;
  return {
    book: match[1],
    chapter: Number(match[2]),
    verse: Number(match[3]),
  };
}

export function cleanVerseText(text: string) {
  return text.replace(/^#\s*/, "").replace(/\[([^\]]+)\]/g, "$1").trim();
}

export function digitRoot(value: number) {
  const n = Math.abs(Math.trunc(value));
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

export function countDivisors(value: number) {
  const n = Math.max(1, Math.abs(Math.trunc(value)));
  let count = 0;
  for (let factor = 1; factor * factor <= n; factor += 1) {
    if (n % factor === 0) count += factor * factor === n ? 1 : 2;
  }
  return count;
}

export function englishA1Z26(text: string) {
  let total = 0;
  for (const character of text.toUpperCase()) {
    const code = character.charCodeAt(0);
    if (code >= 65 && code <= 90) total += code - 64;
  }
  return total;
}

export function buildCorpus(verseMap: Record<string, string>): CorpusVerse[] {
  const raw = Object.entries(verseMap)
    .map(([reference, text]) => {
      const parsed = parseReference(reference);
      return parsed ? { reference, text: cleanVerseText(text), ...parsed } : null;
    })
    .filter((verse): verse is NonNullable<typeof verse> => verse !== null);

  const books = Array.from(new Set(raw.map((verse) => verse.book)));
  const bookIndex = new Map(books.map((book, index) => [book, index]));
  const bookChapterCounts = new Map<string, number>();
  const chapterVerseCounts = new Map<string, number>();

  for (const item of raw) {
    bookChapterCounts.set(
      item.book,
      Math.max(bookChapterCounts.get(item.book) ?? 0, item.chapter),
    );
    const chapterKey = `${item.book}\u0000${item.chapter}`;
    chapterVerseCounts.set(
      chapterKey,
      Math.max(chapterVerseCounts.get(chapterKey) ?? 0, item.verse),
    );
  }

  return raw.map((item, ordinal) => {
    const letters = item.text.match(/[A-Za-z]/g)?.length ?? 0;
    const words = item.text.match(/[A-Za-z0-9']+/g)?.length ?? 0;
    const absoluteOrdinal = ordinal + 1;
    const index = bookIndex.get(item.book) ?? 0;
    return {
      ...item,
      bookIndex: index,
      ordinal,
      reverseOrdinal: raw.length - ordinal,
      bookChapterCount: bookChapterCounts.get(item.book) ?? 1,
      chapterVerseCount:
        chapterVerseCounts.get(`${item.book}\u0000${item.chapter}`) ?? 1,
      testament: index < 39 ? "Old Testament" : "New Testament",
      wordCount: words,
      letterCount: letters,
      a1z26: englishA1Z26(item.text),
      digitRoot: digitRoot(absoluteOrdinal),
      divisorCount: countDivisors(absoluteOrdinal),
    };
  });
}

export function filterCorpus(corpus: CorpusVerse[], scope: string) {
  if (scope === "all") return corpus;
  if (scope === "old") {
    return corpus.filter((verse) => verse.testament === "Old Testament");
  }
  if (scope === "new") {
    return corpus.filter((verse) => verse.testament === "New Testament");
  }
  if (scope.startsWith("book:")) {
    const book = scope.slice(5);
    return corpus.filter((verse) => verse.book === book);
  }
  return corpus;
}

function normalize(value: number, minimum: number, maximum: number) {
  if (maximum === minimum) return 0;
  return ((value - minimum) / (maximum - minimum)) * 2 - 1;
}

function centerAndScale(points: Point3[]) {
  if (points.length === 0) return [];
  const centroid = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  centroid.x /= points.length;
  centroid.y /= points.length;
  centroid.z /= points.length;
  let maximum = 0;
  for (const point of points) {
    maximum = Math.max(
      maximum,
      Math.abs(point.x - centroid.x),
      Math.abs(point.y - centroid.y),
      Math.abs(point.z - centroid.z),
    );
  }
  const scale = maximum || 1;
  return points.map((point) => ({
    x: (point.x - centroid.x) / scale,
    y: (point.y - centroid.y) / scale,
    z: (point.z - centroid.z) / scale,
  }));
}

function identityMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)),
  );
}

function symmetricEigenDecomposition(input: number[][]) {
  const size = input.length;
  const matrix = input.map((row) => [...row]);
  const vectors = identityMatrix(size);
  const iterations = Math.max(48, size * size * 8);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        const value = Math.abs(matrix[row][column]);
        if (value > largest) {
          largest = value;
          p = row;
          q = column;
        }
      }
    }
    if (largest < 1e-10) break;

    const angle =
      matrix[p][p] === matrix[q][q]
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    for (let index = 0; index < size; index += 1) {
      if (index === p || index === q) continue;
      const mip = matrix[index][p];
      const miq = matrix[index][q];
      matrix[index][p] = matrix[p][index] = cosine * mip - sine * miq;
      matrix[index][q] = matrix[q][index] = sine * mip + cosine * miq;
    }

    const mpp = matrix[p][p];
    const mqq = matrix[q][q];
    const mpq = matrix[p][q];
    matrix[p][p] = cosine * cosine * mpp - 2 * sine * cosine * mpq + sine * sine * mqq;
    matrix[q][q] = sine * sine * mpp + 2 * sine * cosine * mpq + cosine * cosine * mqq;
    matrix[p][q] = matrix[q][p] = 0;

    for (let row = 0; row < size; row += 1) {
      const vip = vectors[row][p];
      const viq = vectors[row][q];
      vectors[row][p] = cosine * vip - sine * viq;
      vectors[row][q] = sine * vip + cosine * viq;
    }
  }

  return Array.from({ length: size }, (_, index) => ({
    value: Math.max(0, matrix[index][index]),
    vector: vectors.map((row) => row[index]),
  })).sort((a, b) => b.value - a.value);
}

function principalComponentPoints(features: number[][]): Point3[] {
  if (features.length === 0) return [];
  const columns = features[0].length;
  const means = Array(columns).fill(0);
  const deviations = Array(columns).fill(0);

  for (const row of features) {
    row.forEach((value, index) => {
      means[index] += value;
    });
  }
  means.forEach((_, index) => {
    means[index] /= features.length;
  });
  for (const row of features) {
    row.forEach((value, index) => {
      deviations[index] += (value - means[index]) ** 2;
    });
  }
  deviations.forEach((_, index) => {
    deviations[index] = Math.sqrt(deviations[index] / Math.max(1, features.length - 1)) || 1;
  });

  const standardized = features.map((row) =>
    row.map((value, index) => (value - means[index]) / deviations[index]),
  );
  const covariance = Array.from({ length: columns }, () => Array(columns).fill(0));
  for (const row of standardized) {
    for (let a = 0; a < columns; a += 1) {
      for (let b = a; b < columns; b += 1) {
        covariance[a][b] += row[a] * row[b];
      }
    }
  }
  for (let a = 0; a < columns; a += 1) {
    for (let b = a; b < columns; b += 1) {
      covariance[a][b] /= Math.max(1, standardized.length - 1);
      covariance[b][a] = covariance[a][b];
    }
  }
  const eigenvectors = symmetricEigenDecomposition(covariance).slice(0, 3);
  const projected = standardized.map((row) => {
    const components = eigenvectors.map(({ vector }) =>
      row.reduce((sum, value, index) => sum + value * vector[index], 0),
    );
    return { x: components[0] ?? 0, y: components[1] ?? 0, z: components[2] ?? 0 };
  });
  return centerAndScale(projected);
}

function centeredResidue(value: number, modulus: number) {
  const safeModulus = Math.max(2, Math.round(modulus));
  return normalize(((value % safeModulus) + safeModulus) % safeModulus, 0, safeModulus - 1);
}

export function computeCoordinates(
  verses: CorpusVerse[],
  mode: FoldMode,
  parameters: FoldParameters,
): Point3[] {
  if (verses.length === 0) return [];
  const bookIndexes = verses.map((verse) => verse.bookIndex);
  const minBook = Math.min(...bookIndexes);
  const maxBook = Math.max(...bookIndexes);
  const minOrdinal = Math.min(...verses.map((verse) => verse.ordinal));
  const maxOrdinal = Math.max(...verses.map((verse) => verse.ordinal));

  if (mode === "signature-pca") {
    const features = verses.map((verse) => [
      normalize(verse.bookIndex, minBook, maxBook),
      normalize(verse.chapter, 1, verse.bookChapterCount),
      normalize(verse.verse, 1, verse.chapterVerseCount),
      normalize(verse.ordinal, minOrdinal, maxOrdinal),
      verse.digitRoot / 9,
      Math.log1p(verse.divisorCount),
      Math.log1p(verse.wordCount),
      Math.log1p(verse.letterCount),
      (verse.a1z26 % 997) / 997,
    ]);
    return principalComponentPoints(features);
  }

  const points = verses.map((verse) => {
    const book = normalize(verse.bookIndex, minBook, maxBook);
    const chapter = normalize(verse.chapter, 1, verse.bookChapterCount);
    const localVerse = normalize(verse.verse, 1, verse.chapterVerseCount);
    const ordinal = normalize(verse.ordinal, minOrdinal, maxOrdinal);

    if (mode === "tri-mirror") {
      return {
        x: 1 - Math.abs(book),
        y: 1 - Math.abs(chapter),
        z: localVerse,
      };
    }

    if (mode === "canon-spiral") {
      const chapterFraction =
        verse.bookChapterCount === 1
          ? 0
          : (verse.chapter - 1) / (verse.bookChapterCount - 1);
      const angle = Math.PI * 2 * (verse.bookIndex - minBook + chapterFraction);
      const radius = 0.28 + 0.72 * ((localVerse + 1) / 2);
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: ordinal,
      };
    }

    if (mode === "modular-crystal") {
      const n = verse.ordinal + 1;
      return {
        x: centeredResidue(n, parameters.modulusX) + (verse.digitRoot - 5) * 0.004,
        y: centeredResidue(n, parameters.modulusY) + ((verse.divisorCount % 7) - 3) * 0.004,
        z: centeredResidue(n, parameters.modulusZ) + ((verse.wordCount % 9) - 4) * 0.003,
      };
    }

    return { x: book, y: chapter, z: localVerse };
  });
  return centerAndScale(points);
}

function covariance3(points: Point3[]) {
  const mean = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y, z: sum.z + point.z }),
    { x: 0, y: 0, z: 0 },
  );
  const count = Math.max(1, points.length);
  mean.x /= count;
  mean.y /= count;
  mean.z /= count;
  const covariance = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const centered: Point3[] = [];
  for (const point of points) {
    const x = point.x - mean.x;
    const y = point.y - mean.y;
    const z = point.z - mean.z;
    centered.push({ x, y, z });
    covariance[0][0] += x * x;
    covariance[0][1] += x * y;
    covariance[0][2] += x * z;
    covariance[1][1] += y * y;
    covariance[1][2] += y * z;
    covariance[2][2] += z * z;
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = row; column < 3; column += 1) {
      covariance[row][column] /= Math.max(1, points.length - 1);
      covariance[column][row] = covariance[row][column];
    }
  }
  return { covariance, centered };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function analyzeGeometry(points: Point3[]): GeometryAnalysis {
  if (points.length < 3) {
    return {
      label: "insufficient field",
      effectiveDimensions: 0,
      linearity: 0,
      planarity: 0,
      radialCoherence: 0,
      bilateralSymmetry: 0,
      eigenvalues: [0, 0, 0],
    };
  }
  const { covariance, centered } = covariance3(points);
  const values = symmetricEigenDecomposition(covariance)
    .slice(0, 3)
    .map((entry) => entry.value);
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const normalized = values.map((value) => value / total) as [number, number, number];
  const effectiveDimensions =
    1 / normalized.reduce((sum, value) => sum + value * value, 0);
  const linearity = clamp01((normalized[0] - normalized[1]) / Math.max(normalized[0], 1e-9));
  const planarity = clamp01((normalized[1] - normalized[2]) / Math.max(normalized[0], 1e-9));
  const radii = centered.map((point) => Math.hypot(point.x, point.y, point.z));
  const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
  const radialDeviation = Math.sqrt(
    radii.reduce((sum, radius) => sum + (radius - meanRadius) ** 2, 0) / radii.length,
  );
  const radialCoherence = clamp01(1 - radialDeviation / Math.max(meanRadius, 1e-9));

  const axisSkews = (["x", "y", "z"] as const).map((axis) => {
    const valuesOnAxis = centered.map((point) => point[axis]);
    const variance =
      valuesOnAxis.reduce((sum, value) => sum + value * value, 0) / valuesOnAxis.length;
    const sigma = Math.sqrt(variance) || 1;
    return Math.abs(
      valuesOnAxis.reduce((sum, value) => sum + (value / sigma) ** 3, 0) /
        valuesOnAxis.length,
    );
  });
  const bilateralSymmetry = clamp01(
    1 - axisSkews.reduce((sum, skew) => sum + Math.min(2, skew), 0) / 6,
  );

  let label = "volumetric lattice";
  if (normalized[0] > 0.86) label = "axial filament";
  else if (normalized[2] < 0.035) label = "planar folio";
  else if (radialCoherence > 0.86 && effectiveDimensions > 2.45) label = "radial shell";
  else if (linearity > 0.48 && effectiveDimensions < 2.2) label = "stratified tower";
  else if (bilateralSymmetry > 0.88) label = "bilateral volume";

  return {
    label,
    effectiveDimensions,
    linearity,
    planarity,
    radialCoherence,
    bilateralSymmetry,
    eigenvalues: normalized,
  };
}

function nearestByOrdinal(
  verses: CorpusVerse[],
  selected: CorpusVerse,
  predicate: (verse: CorpusVerse) => boolean,
  limit: number,
) {
  return verses
    .map((verse, index) => ({ verse, index }))
    .filter(({ verse }) => verse.reference !== selected.reference && predicate(verse))
    .sort(
      (a, b) =>
        Math.abs(a.verse.ordinal - selected.ordinal) -
        Math.abs(b.verse.ordinal - selected.ordinal),
    )
    .slice(0, limit)
    .map(({ index }) => index);
}

export function findRelations(
  verses: CorpusVerse[],
  selectedIndex: number,
  activeRules: Iterable<RelationRule>,
): Relation[] {
  const selected = verses[selectedIndex];
  if (!selected) return [];
  const rules = new Set(activeRules);
  const referenceIndex = new Map(verses.map((verse, index) => [verse.reference, index]));
  const relations: Relation[] = [];
  const add = (targetIndex: number | undefined, rule: RelationRule, label: string) => {
    if (targetIndex === undefined || targetIndex === selectedIndex) return;
    if (relations.some((relation) => relation.targetIndex === targetIndex && relation.rule === rule)) {
      return;
    }
    relations.push({ sourceIndex: selectedIndex, targetIndex, rule, label });
  };

  if (rules.has("chapter-mirror")) {
    const targetVerse = selected.chapterVerseCount + 1 - selected.verse;
    add(
      referenceIndex.get(`${selected.book} ${selected.chapter}:${targetVerse}`),
      "chapter-mirror",
      `v + v′ = ${selected.chapterVerseCount + 1}`,
    );
  }

  if (rules.has("canon-mirror")) {
    add(
      verses.length - 1 - selectedIndex,
      "canon-mirror",
      `n + n′ = ${verses.length + 1}`,
    );
  }

  if (rules.has("book-mirror")) {
    const books = Array.from(new Set(verses.map((verse) => verse.book)));
    const sourceBookPosition = books.indexOf(selected.book);
    const targetBook = books[books.length - 1 - sourceBookPosition];
    if (targetBook) {
      const targetBookVerses = verses.filter((verse) => verse.book === targetBook);
      const targetChapterCount = targetBookVerses[0]?.bookChapterCount ?? 1;
      const chapterRatio =
        selected.bookChapterCount === 1
          ? 0
          : (selected.chapter - 1) / (selected.bookChapterCount - 1);
      const targetChapter = Math.round(chapterRatio * (targetChapterCount - 1)) + 1;
      const targetChapterVerses = targetBookVerses.filter(
        (verse) => verse.chapter === targetChapter,
      );
      const targetVerseCount = targetChapterVerses[0]?.chapterVerseCount ?? 1;
      const verseRatio =
        selected.chapterVerseCount === 1
          ? 0
          : (selected.verse - 1) / (selected.chapterVerseCount - 1);
      const targetVerse = Math.round(verseRatio * (targetVerseCount - 1)) + 1;
      add(
        referenceIndex.get(`${targetBook} ${targetChapter}:${targetVerse}`),
        "book-mirror",
        `proportional mirror across ${books.length} books`,
      );
    }
  }

  if (rules.has("reciprocal-address")) {
    const candidates = verses
      .map((verse, index) => ({ verse, index }))
      .filter(
        ({ verse }) =>
          verse.chapter === selected.verse && verse.verse === selected.chapter,
      )
      .sort(
        (a, b) =>
          Math.abs(a.verse.bookIndex - selected.bookIndex) -
          Math.abs(b.verse.bookIndex - selected.bookIndex),
      )
      .slice(0, 6);
    for (const candidate of candidates) {
      add(
        candidate.index,
        "reciprocal-address",
        `${selected.chapter}:${selected.verse} ↔ ${selected.verse}:${selected.chapter}`,
      );
    }
  }

  if (rules.has("digital-root")) {
    for (const index of nearestByOrdinal(
      verses,
      selected,
      (verse) => verse.digitRoot === selected.digitRoot,
      2,
    )) {
      add(index, "digital-root", `digital root = ${selected.digitRoot}`);
    }
  }

  if (rules.has("a1z26-equality")) {
    for (const index of nearestByOrdinal(
      verses,
      selected,
      (verse) => verse.a1z26 === selected.a1z26,
      4,
    )) {
      add(index, "a1z26-equality", `English A1Z26 = ${selected.a1z26}`);
    }
  }

  return relations;
}

function squaredDistance(a: Point3, b: Point3) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

export function extractReadingPath(
  points: Point3[],
  selectedIndex: number,
  kind: "x-axis" | "y-axis" | "z-axis" | "nearest" | "canonical",
  count = 12,
) {
  const selected = points[selectedIndex];
  if (!selected) return [];
  if (kind === "canonical") {
    const start = Math.max(0, selectedIndex - Math.floor(count / 2));
    return Array.from(
      { length: Math.min(count, points.length - start) },
      (_, offset) => start + offset,
    );
  }
  if (kind === "nearest") {
    return points
      .map((point, index) => ({ index, distance: squaredDistance(point, selected) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count)
      .map(({ index }) => index);
  }
  const axis = kind[0] as keyof Point3;
  const perpendicularAxes = (["x", "y", "z"] as (keyof Point3)[]).filter(
    (candidate) => candidate !== axis,
  );
  return points
    .map((point, index) => ({
      index,
      coordinate: point[axis],
      perpendicular:
        (point[perpendicularAxes[0]] - selected[perpendicularAxes[0]]) ** 2 +
        (point[perpendicularAxes[1]] - selected[perpendicularAxes[1]]) ** 2,
    }))
    .sort((a, b) => a.perpendicular - b.perpendicular)
    .slice(0, count)
    .sort((a, b) => a.coordinate - b.coordinate)
    .map(({ index }) => index);
}

function seedHash(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createNullAssignments(
  verses: CorpusVerse[],
  enabled: boolean,
  seed: string,
): NullAssignment[] {
  if (!enabled) return verses.map((verse) => ({ slot: verse, source: verse }));
  const indexes = verses.map((_, index) => index);
  const random = seededRandom(seedHash(seed || "BIBLIOCRUNCH"));
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [indexes[index], indexes[swap]] = [indexes[swap], indexes[index]];
  }
  return verses.map((slot, index) => ({ slot, source: verses[indexes[index]] }));
}

export function makeObsidianMarkdown(options: {
  title: string;
  mode: FoldMode;
  scope: string;
  seed: string;
  nullControl: boolean;
  pathKind: string;
  path: number[];
  assignments: NullAssignment[];
  points: Point3[];
}) {
  const lines = [
    "---",
    `title: "${options.title.replace(/"/g, "\\\"")}"`,
    "type: bibliocrunch-reading",
    `fold: ${options.mode}`,
    `scope: "${options.scope.replace(/"/g, "\\\"")}"`,
    `path: ${options.pathKind}`,
    `null_control: ${options.nullControl}`,
    `seed: "${options.seed.replace(/"/g, "\\\"")}"`,
    `generated: "${new Date().toISOString()}"`,
    "---",
    "",
    `# ${options.title}`,
    "",
    `> ${FOLD_LABELS[options.mode]} · ${FOLD_FORMULAS[options.mode]}`,
    "",
  ];
  options.path.forEach((index, order) => {
    const assignment = options.assignments[index];
    const point = options.points[index];
    if (!assignment || !point) return;
    const sourceNote = `[[${assignment.source.reference}]]`;
    const slotNote = `[[${assignment.slot.reference}]]`;
    const location = `(${point.x.toFixed(4)}, ${point.y.toFixed(4)}, ${point.z.toFixed(4)})`;
    if (options.nullControl) {
      lines.push(
        `${order + 1}. ${slotNote} ← ${sourceNote} ${location}`,
        `   ${assignment.source.text}`,
      );
    } else {
      lines.push(`${order + 1}. ${sourceNote} ${location}`, `   ${assignment.source.text}`);
    }
  });
  lines.push(
    "",
    "---",
    "Generated by Bibliocrunch. Numerical adjacency is a hypothesis generator, not evidence of authorial intent.",
  );
  return lines.join("\n");
}
