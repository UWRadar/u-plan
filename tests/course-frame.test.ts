import assert from "node:assert/strict";
import test from "node:test";
import { signInUrl } from "../src/course-frame.ts";

const origin = "https://uwclassmate.com";

test("sign-in links in the embedded course page open in a new tab", () => {
  assert.equal(signInUrl("/sign-in", origin), "https://uwclassmate.com/sign-in");
  assert.equal(signInUrl("https://uwclassmate.com/sign-up/verify", origin), "https://uwclassmate.com/sign-up/verify");
  assert.equal(signInUrl("/api/auth/uw/start?return_to=%2FCourseDetail%2FCSE457", origin),
    "https://uwclassmate.com/api/auth/uw/start?return_to=%2FCourseDetail%2FCSE457");
});

test("other links keep navigating inside the course frame", () => {
  assert.equal(signInUrl("/CourseDetail/CSE457", origin), null);
  assert.equal(signInUrl("/sign-in-help", origin), null);
  assert.equal(signInUrl("https://evil.example/sign-in", origin), null);
  assert.equal(signInUrl("http://[bad", origin), null);
});
