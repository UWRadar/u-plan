import { CAMPUSES, cacheKey, matchProfessor, parseProfessor, type Campus, type RatingResult } from "./model";

export type CacheEntry = { expiresAt: number; value: RatingResult };
export type RatingCache = { get(key: string): Promise<CacheEntry | undefined>; set(key: string, entry: CacheEntry): Promise<void> };
export const RMP_ENDPOINT = "https://www.ratemyprofessors.com/graphql";
const SEARCH = `query UPlanProfessorSearch($text: String!, $schoolID: ID!) {
  newSearch { teachers(query: {text: $text, schoolID: $schoolID}) {
    edges { node { id legacyId firstName lastName department avgRating avgDifficulty numRatings wouldTakeAgainPercent school { id name } } }
  } }
}`;

export function createRatingProvider(cache: RatingCache, fetcher: typeof fetch = fetch, clock = Date.now) {
  const pending = new Map<string, Promise<RatingResult>>();
  let recentRequests: number[] = [];

  async function load(name: string, campus: Campus): Promise<RatingResult> {
    const key = cacheKey(name, campus);
    const cached = await cache.get(key);
    if (cached && cached.expiresAt > clock()) return cached.value;
    recentRequests = recentRequests.filter((time) => clock() - time < 60_000);
    if (recentRequests.length >= 20) return { status: "unavailable", source: "rmp", candidates: [] };
    recentRequests.push(clock());
    let result: RatingResult = { status: "unavailable", source: "rmp", candidates: [] };
    try {
      const response = await fetcher(RMP_ENDPOINT, {
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
    const ttl = result.status === "matched" || result.status === "ambiguous" ? 24 * 60 * 60_000 : 5 * 60_000;
    await cache.set(key, { value: result, expiresAt: clock() + ttl });
    return result;
  }

  return (name: string, campus: Campus) => {
    const key = cacheKey(name, campus);
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = load(name, campus).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
}
