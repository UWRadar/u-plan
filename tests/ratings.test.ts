import assert from "node:assert/strict";
import test from "node:test";
import { CAMPUSES, courseCode, matchProfessor, normalizeName, parseProfessor, searchUrl, validLookup, type Professor } from "../src/model.ts";
import { createRatingProvider, type CacheEntry, type RatingCache } from "../src/provider.ts";

const alex: Professor = {
  id: "teacher-1", legacyId: 123, firstName: "Alex", lastName: "Chen",
  schoolId: CAMPUSES.seattle.schoolId, department: "Informatics", rating: 4.6,
  difficulty: 3.2, wouldTakeAgain: 90, ratingCount: 42,
};
const row = (p: Professor) => ({
  ...p, school: { id: p.schoolId }, avgRating: p.rating, avgDifficulty: p.difficulty,
  wouldTakeAgainPercent: p.wouldTakeAgain, numRatings: p.ratingCount,
});
const response = (people: Professor[] = [alex]) => Response.json({ data: { newSearch: { teachers: { edges: people.map((p) => ({ node: row(p) })) } } } });
function memory(): RatingCache {
  const entries = new Map<string, CacheEntry>();
  return { async get(key) { return entries.get(key); }, async set(key, entry) { entries.set(key, entry); } };
}

test("normalizes accents, titles, reversed names, and multiword course subjects", () => {
  assert.equal(normalizeName(" Prof. García, María "), "maria garcia");
  assert.equal(courseCode("GEN ST 199 — University Community"), "GENST199");
  assert.equal(courseCode("CSE 142: Computer Programming"), "CSE142");
  assert.equal(courseCode("Find Courses"), null);
});

test("campus boundaries prevent a matching name at a different UW school", () => {
  assert.equal(matchProfessor("Alex Chen", "bothell", [alex], "rmp").status, "not-found");
  const bothell = { ...alex, id: "teacher-2", schoolId: CAMPUSES.bothell.schoolId, rating: 2 };
  assert.equal(matchProfessor("Alex Chen", "seattle", [bothell, alex], "rmp").candidates[0].rating, 4.6);
});

test("duplicate names and abbreviated first names require the user's choice", () => {
  const duplicate = { ...alex, id: "teacher-2", department: "Computer Science" };
  assert.equal(matchProfessor("Alex Chen", "seattle", [alex, duplicate], "rmp").status, "ambiguous");
  assert.equal(matchProfessor("A. Chen", "seattle", [alex], "rmp").status, "ambiguous");
  assert.equal(matchProfessor("Alexa Chen", "seattle", [alex], "rmp").status, "not-found");
});

test("middle initials are compatible but contradictory middle names are not", () => {
  const named = { ...alex, firstName: "Alex James" };
  assert.equal(matchProfessor("Alex J. Chen", "seattle", [named], "rmp").status, "matched");
  assert.equal(matchProfessor("Alex K. Chen", "seattle", [named], "rmp").status, "not-found");
});

test("untrusted messages, malformed records, and missing scores are handled safely", () => {
  assert.equal(validLookup({ name: "Alex Chen", campus: "__proto__" }), false);
  assert.equal(validLookup({ name: "Alex\nChen", campus: "seattle" }), false);
  assert.equal(validLookup({ name: "Alex Chen", campus: "seattle" }), true);
  assert.equal(parseProfessor({ ...row(alex), legacyId: -5 }), null);
  const parsed = parseProfessor({ ...row(alex), avgRating: 15, avgDifficulty: Number.NaN, wouldTakeAgainPercent: -1 });
  assert.equal(parsed?.rating, null);
  assert.equal(parsed?.difficulty, null);
  assert.equal(parsed?.wouldTakeAgain, null);
  assert.match(searchUrl("A & B", "tacoma"), /4744\?q=A%20%26%20B$/);
});

test("parallel lookups deduplicate requests and cached scores expire after 24 hours", async () => {
  let time = 1_000, calls = 0;
  const lookup = createRatingProvider(memory(), async () => { calls++; return response(); }, () => time);
  const both = await Promise.all([lookup("Alex Chen", "seattle"), lookup("Alex Chen", "seattle")]);
  assert.equal(calls, 1);
  assert.equal(both[0].status, "matched");
  await lookup("Chen, Alex", "seattle");
  assert.equal(calls, 1);
  time += 24 * 60 * 60_000 + 1;
  await lookup("Alex Chen", "seattle");
  assert.equal(calls, 2);
});

test("external queries omit cookies and authorization tokens and send only name and campus", async () => {
  const lookup = createRatingProvider(memory(), async (url, init) => {
    assert.equal(url, "https://www.ratemyprofessors.com/graphql");
    assert.equal(init?.credentials, "omit");
    assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
    assert.deepEqual(JSON.parse(String(init?.body)).variables, { text: "Alex Chen", schoolID: CAMPUSES.seattle.schoolId });
    return response([{ ...alex, schoolId: CAMPUSES.bothell.schoolId }]);
  });
  assert.equal((await lookup("Alex Chen", "seattle")).status, "not-found");
});

test("403 failures back off for five minutes without retrying or bypassing access controls", async () => {
  let time = 1_000, calls = 0;
  const lookup = createRatingProvider(memory(), async () => { calls++; return new Response("Forbidden", { status: 403 }); }, () => time);
  assert.equal((await lookup("Alex Chen", "seattle")).status, "unavailable");
  await lookup("Alex Chen", "seattle");
  assert.equal(calls, 1);
  time += 5 * 60_000 + 1;
  await lookup("Alex Chen", "seattle");
  assert.equal(calls, 2);
});

test("network bursts are bounded even when every requested name is different", async () => {
  let calls = 0;
  const lookup = createRatingProvider(memory(), async () => { calls++; return response([]); }, () => 1_000);
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => lookup(`Professor ${i}`, "seattle")));
  assert.equal(calls, 20);
  assert.equal(results.filter((r) => r.status === "unavailable").length, 10);
});
