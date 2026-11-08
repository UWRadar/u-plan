export type Campus = "seattle" | "bothell" | "tacoma";
export const CAMPUSES: Record<Campus, { label: string; schoolId: string; schoolNumber: number }> = {
  seattle: { label: "UW Seattle", schoolId: "U2Nob29sLTE1MzA=", schoolNumber: 1530 },
  bothell: { label: "UW Bothell", schoolId: "U2Nob29sLTQ0NjY=", schoolNumber: 4466 },
  tacoma: { label: "UW Tacoma", schoolId: "U2Nob29sLTQ3NDQ=", schoolNumber: 4744 },
};

export type CourseRating = {
  code: string;
  status: "available" | "unavailable";
  rating: number | null;
  difficulty: number | null;
  count: number;
  partial: boolean;
};

export type Professor = {
  courseRating?: CourseRating;
  id: string;
  legacyId: number;
  firstName: string;
  lastName: string;
  schoolId: string;
  department: string;
  rating: number | null;
  difficulty: number | null;
  wouldTakeAgain: number | null;
  ratingCount: number;
};

export type RatingResult = {
  status: "matched" | "ambiguous" | "not-found" | "disabled" | "unavailable";
  source: "demo" | "rmp";
  candidates: Professor[];
};

export function normalizeName(raw: string): string {
  const name = raw.trim().replace(/^(?:professor|prof\.?|dr\.?)\s+/i, "");
  const pieces = name.split(",").map((p) => p.trim());
  const ordered = pieces.length === 2 ? `${pieces[1]} ${pieces[0]}` : name;
  return ordered.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "").replace(/\s+/g, " ").trim();
}

export function courseCode(raw: string): string | null {
  const match = raw.trim().match(/^([A-Za-z&][A-Za-z&\s]{0,15}?)\s*(\d{3}[A-Za-z]?)(?:\b|\s|$)/);
  return match ? `${match[1].replace(/\s/g, "").toUpperCase()}${match[2].toUpperCase()}` : null;
}

function nameMatch(raw: string, p: Professor): "exact" | "possible" | null {
  const tokens = normalizeName(raw).split(" ");
  const candidate = normalizeName(`${p.firstName} ${p.lastName}`).split(" ");
  if (tokens.length < 2 || candidate.length < 2) return null;
  if (tokens.join(" ") === candidate.join(" ")) return "exact";
  if (tokens.at(-1) !== candidate.at(-1)) return null;
  if (tokens[0] === candidate[0]) {
    const middle = tokens.slice(1, -1);
    const otherMiddle = candidate.slice(1, -1);
    const compatible = (a: string, b?: string) => !b || a === b || (a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b));
    if (middle.every((t, i) => compatible(t, otherMiddle[i])) && otherMiddle.every((t, i) => compatible(t, middle[i]))) return "exact";
  }
  return tokens[0].length === 1 && candidate[0].startsWith(tokens[0]) ? "possible" : null;
}

export function matchProfessor(name: string, campus: Campus, all: Professor[], source: "demo" | "rmp"): RatingResult {
  const candidates = all.filter((p) => p.schoolId === CAMPUSES[campus].schoolId && nameMatch(name, p));
  if (!candidates.length) return { status: "not-found", source, candidates: [] };
  const exact = candidates.filter((p) => nameMatch(name, p) === "exact");
  if (exact.length === 1) return { status: "matched", source, candidates: exact };
  return { status: "ambiguous", source, candidates: exact.length ? exact : candidates };
}

export function professorUrl(p: Professor): string {
  return `https://www.ratemyprofessors.com/professor/${p.legacyId}`;
}

export function searchUrl(name: string, campus: Campus): string {
  return `https://www.ratemyprofessors.com/search/professors/${CAMPUSES[campus].schoolNumber}?q=${encodeURIComponent(name)}`;
}

export function validLookup(value: unknown): value is { name: string; campus: Campus; course?: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as { name?: unknown; campus?: unknown; course?: unknown };
  return typeof v.name === "string" && v.name.trim().length >= 3 && v.name.length <= 100 &&
    !/[\u0000-\u001f]/.test(v.name) && typeof v.campus === "string" && Object.hasOwn(CAMPUSES, v.campus) &&
    (v.course === undefined || (typeof v.course === "string" && /^[A-Z&]{1,16}\d{3}[A-Z]?$/.test(v.course)));
}

export function cacheKey(name: string, campus: Campus, course?: string): string {
  return `rmp:v1:${campus}:${normalizeName(name)}${course ? `:course-v2:${course}` : ""}`;
}

function score(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}

export function parseProfessor(raw: unknown): Professor | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const school = p.school as Record<string, unknown> | undefined;
  if (typeof p.id !== "string" || !Number.isSafeInteger(p.legacyId) || (p.legacyId as number) <= 0 ||
    typeof p.firstName !== "string" || typeof p.lastName !== "string" || typeof school?.id !== "string") return null;
  return {
    id: p.id, legacyId: p.legacyId as number, firstName: p.firstName, lastName: p.lastName,
    schoolId: school.id, department: typeof p.department === "string" ? p.department : "",
    rating: score(p.avgRating, 5), difficulty: score(p.avgDifficulty, 5), wouldTakeAgain: score(p.wouldTakeAgainPercent, 100),
    ratingCount: typeof p.numRatings === "number" && Number.isSafeInteger(p.numRatings) && p.numRatings >= 0 ? p.numRatings : 0,
  };
}

export function ratingTone(value: number | null, difficulty = false): string {
  if (value === null) return "missing";
  if (difficulty) return value <= 2.5 ? "excellent" : value < 4 ? "average" : "poor";
  return value >= 4 ? "excellent" : value >= 2.5 ? "average" : "poor";
}
