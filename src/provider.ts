import { CAMPUSES, cacheKey, matchProfessor, parseProfessor, type Campus, type RatingResult, type CourseRating } from "./model";

export type CacheEntry = { expiresAt: number; value: RatingResult };
export type RatingCache = { get(key: string): Promise<CacheEntry | undefined>; set(key: string, entry: CacheEntry): Promise<void> };
export const RMP_ENDPOINT = "https://www.ratemyprofessors.com/graphql";
const SEARCH = `query UPlanProfessorSearch($text: String!, $schoolID: ID!) {
  newSearch { teachers(query: {text: $text, schoolID: $schoolID}) {
    edges { node { id legacyId firstName lastName department avgRating avgDifficulty numRatings wouldTakeAgainPercent school { id name } } }
  } }
}`;

const COURSE_RATINGS = `query UPlanCourseRatings($id: ID!, $after: String) {
  node(id: $id) { ... on Teacher {
    ratings(first: 100, after: $after) {
      edges { node { id class qualityRating difficultyRatingRounded } }
      pageInfo { hasNextPage endCursor }
    }
  } }
}`;

export function createRatingProvider(cache: RatingCache, fetcher: typeof fetch = fetch, clock = Date.now) {
  const pending = new Map<string, Promise<RatingResult>>();
  let recentRequests: number[] = [];

  function reserveRequest() {
    recentRequests = recentRequests.filter((time) => clock() - time < 60_000);
    if (recentRequests.length >= 20) return false;
    recentRequests.push(clock());
    return true;
  }

  async function loadCourse(id: string, code: string): Promise<CourseRating> {
    const unavailable: CourseRating = { code, status: "unavailable", rating: null, difficulty: null, count: 0, partial: false };
    let after: string | null = null;
    let ratingSum = 0, difficultySum = 0, count = 0, difficultyCount = 0;
    const seen = new Set<string>();
    const cursors = new Set<string>();
    try {
      // Bound large profiles to 500 reviews and explicitly label incomplete averages.
      for (let page = 0; page < 5; page++) {
        if (!reserveRequest()) return unavailable;
        const response: Response = await fetcher(RMP_ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit",
          body: JSON.stringify({ query: COURSE_RATINGS, variables: { id, after } }),
          signal: AbortSignal.timeout(6_000),
        });
        if (!response.ok) return unavailable;
        const body = await response.json();
        const ratings = body?.data?.node?.ratings;
        if (body.errors?.length || !Array.isArray(ratings?.edges) || typeof ratings?.pageInfo?.hasNextPage !== "boolean") return unavailable;
        for (const { node } of ratings.edges) {
          if (!node || typeof node.id !== "string" || typeof node.class !== "string" || seen.has(node.id)) continue;
          seen.add(node.id);
          if (node.class.replace(/[\s-]/g, "").toUpperCase() !== code) continue;
          if (typeof node.qualityRating !== "number" || !Number.isFinite(node.qualityRating) || node.qualityRating < 1 || node.qualityRating > 5) continue;
          ratingSum += node.qualityRating;
          count++;
          if (typeof node.difficultyRatingRounded === "number" && Number.isFinite(node.difficultyRatingRounded) && node.difficultyRatingRounded >= 1 && node.difficultyRatingRounded <= 5) {
            difficultySum += node.difficultyRatingRounded;
            difficultyCount++;
          }
        }
        const partial = ratings.pageInfo.hasNextPage;
        if (!partial || page === 4) return {
          code, status: "available", rating: count ? ratingSum / count : null,
          difficulty: difficultyCount ? difficultySum / difficultyCount : null, count, partial,
        };
        after = ratings.pageInfo.endCursor;
        if (typeof after !== "string" || !after || cursors.has(after)) return unavailable;
        cursors.add(after);
      }
    } catch { /* Keep the overall rating usable when course reviews cannot be read. */ }
    return unavailable;
  }

  async function load(name: string, campus: Campus, course?: string): Promise<RatingResult> {
    const key = cacheKey(name, campus, course);
    const cached = await cache.get(key);
    if (cached && cached.expiresAt > clock()) return cached.value;
    if (!reserveRequest()) return { status: "unavailable", source: "rmp", candidates: [] };
    let result: RatingResult = { status: "unavailable", source: "rmp", candidates: [] };
    try {
      const response: Response = await fetcher(RMP_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit",
        body: JSON.stringify({ query: SEARCH, variables: { text: name, schoolID: CAMPUSES[campus].schoolId } }),
        signal: AbortSignal.timeout(6_000),
      });
      if (response.ok) {
        const body = await response.json();
        const edges = body?.data?.newSearch?.teachers?.edges;
        if (!body.errors?.length && Array.isArray(edges)) {
          const candidates = edges.slice(0, 20).map((e: { node?: unknown }) => parseProfessor(e.node)).filter((p): p is NonNullable<typeof p> => p !== null);
          result = matchProfessor(name, campus, candidates, "rmp");
        }
      }
    } catch { /* Offline, rate-limited, or changed APIs fall back to the source link. */ }
    if (course) {
      for (const professor of result.candidates) professor.courseRating = await loadCourse(professor.id, course);
    }
    const courseUnavailable = result.candidates.some(p => p.courseRating?.status === "unavailable");
    const ttl = !courseUnavailable && (result.status === "matched" || result.status === "ambiguous") ? 24 * 60 * 60_000 : 5 * 60_000;
    await cache.set(key, { value: result, expiresAt: clock() + ttl });
    return result;
  }

  return (name: string, campus: Campus, course?: string) => {
    const key = cacheKey(name, campus, course);
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = load(name, campus, course).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
}
