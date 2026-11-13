import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildExtension, root } from "./build.mjs";

// Run on macOS/Linux with the standard zip command. Packages only the clean
// production build, never the repository, development build or local demo.
await buildExtension();
const directory = path.join(root, "dist");
const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+(?:\.\d+){0,3}$/);
assert.ok(manifest.version.split(".").every(n => Number(n) <= 65535));
assert.deepEqual(manifest.permissions, ["storage"]);
assert.deepEqual(manifest.optional_host_permissions, ["https://www.ratemyprofessors.com/*"]);
assert.deepEqual(manifest.content_scripts.flatMap(script => script.matches), ["https://myplan.uw.edu/course/*", "https://uwclassmate.com/*"]);
assert.ok(!manifest.host_permissions?.length);
assert.ok(!manifest.externally_connectable);

const files = ["manifest.json", "options.html", "options.css", "scripts/background.js", "scripts/content.js", "scripts/course-frame.js", "scripts/options.js", "scripts/table.css", ...new Set(Object.values(manifest.icons))].sort();
const actual = [];
async function walk(relative = "") {
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await walk(name);
    else { assert.ok(entry.isFile(), `Unexpected non-file: ${name}`); actual.push(name); }
  }
}
await walk();
assert.deepEqual(actual.sort(), files, "Unexpected or missing production files");
for (const name of files.filter(name => name.endsWith(".js"))) {
  const code = await readFile(path.join(directory, name), "utf8");
  if (/localhost:3011|127\.0\.0\.1:3011|demo-alex|demo-jordan-a|demo-other-campus/.test(code)) throw new Error(`Demo code leaked into ${name}`);
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(code)) throw new Error(`Dynamic code execution in ${name}`);
}

const output = path.join(root, "artifacts");
await mkdir(output, { recursive: true });
const archive = path.join(output, `u-plan-${manifest.version}-store-candidate.zip`);
await rm(archive, { force: true });
execFileSync("zip", ["-q", "-X", archive, ...files], { cwd: directory });
const bytes = await readFile(archive);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(`${archive}.sha256`, `${sha256}  ${path.basename(archive)}\n`);
console.log(JSON.stringify({ archive, version: manifest.version, fileCount: files.length, bytes: bytes.length, sha256, status: "Candidate only; live MyPlan testing and publisher review required" }, null, 2));
