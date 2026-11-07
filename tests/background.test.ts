import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const built = await build({ entryPoints: [fileURLToPath(new URL("../src/background.ts", import.meta.url))], bundle: true, format: "iife", platform: "browser", write: false });
function worker(enabled: boolean, permission: boolean) {
  let listener: (message: unknown, sender: unknown, reply: (value: unknown) => void) => unknown;
  let networkCalls = 0;
  const values: Record<string, unknown> = { liveRatingsEnabled: enabled };
  const chrome = {
    action: { onClicked: { addListener() {} } },
    runtime: { id: "u-plan-test", onMessage: { addListener(fn: typeof listener) { listener = fn; } }, async openOptionsPage() {} },
    permissions: { async contains() { return permission; } },
    storage: { local: {
      async get() { return values; }, async set(items: object) { Object.assign(values, items); },
      async remove(keys: string[]) { keys.forEach(key => delete values[key]); },
    } },
  };
  vm.runInNewContext(built.outputFiles[0].text, {
    chrome, URL, AbortSignal, setTimeout, clearTimeout,
    fetch: async () => { networkCalls++; return Response.json({ data: { newSearch: { teachers: { edges: [] } } } }); },
  });
  return {
    get networkCalls() { return networkCalls; },
    async query(message: unknown, sender = { id: "u-plan-test", url: "https://myplan.uw.edu/course/#/detail" }) {
      let response: { status: string } | undefined;
      listener!(message, sender, value => { response = value as { status: string }; });
      await new Promise(resolve => setImmediate(resolve));
      return response;
    },
  };
}

test("live requests are off until the user enables them", async () => {
  const w = worker(false, true);
  assert.equal((await w.query({ type: "lookup", name: "Kevin Lin", campus: "seattle" }))?.status, "disabled");
  assert.equal(w.networkCalls, 0);
});

test("a setting alone cannot bypass the browser's optional host permission", async () => {
  const w = worker(true, false);
  assert.equal((await w.query({ type: "lookup", name: "Kevin Lin", campus: "seattle" }))?.status, "disabled");
  assert.equal(w.networkCalls, 0);
});

test("unrelated pages and invalid lookup messages cannot request ratings", async () => {
  const w = worker(true, true);
  assert.equal(await w.query({ type: "lookup", name: "Kevin Lin", campus: "seattle" }, { id: "u-plan-test", url: "https://example.com" }), undefined);
  assert.equal(await w.query({ type: "lookup", name: "Kevin Lin", campus: "__proto__" }), undefined);
  assert.equal(w.networkCalls, 0);
});

test("authorized messages reach the provider once and use its cached response", async () => {
  const w = worker(true, true);
  const message = { type: "lookup", name: "Kevin Lin", campus: "seattle" };
  assert.equal((await w.query(message))?.status, "not-found");
  assert.equal((await w.query(message))?.status, "not-found");
  assert.equal(w.networkCalls, 1);
});
