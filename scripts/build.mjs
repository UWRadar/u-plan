import { build } from "esbuild";
import { mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../", import.meta.url));
export async function buildExtension() {
  const manifest = JSON.parse(await readFile(`${root}/manifest.json`, "utf8"));
  for (const [outdir, local] of [["dist", false], ["dist-dev", true]]) {
    const base = `${root}/${outdir}`;
    await rm(base, { recursive: true, force: true });
    await mkdir(`${base}/scripts`, { recursive: true });
    const settings = { bundle: true, target: "chrome120", platform: "browser", sourcemap: false, minify: !local, define: { __LOCAL_BUILD__: JSON.stringify(local) }, loader: { ".css": "text" } };
    await build({ ...settings, entryPoints: [`${root}/src/content.ts`], outfile: `${base}/scripts/content.js`, format: "iife" });
    await build({ ...settings, entryPoints: { background: `${root}/src/background.ts`, options: `${root}/src/options.ts` }, outdir: `${base}/scripts`, format: "esm" });
    await cp(`${root}/src/table.css`, `${base}/scripts/table.css`);
    await cp(`${root}/images`, `${base}/images`, { recursive: true });
    for (const file of ["options.html", "options.css"]) await cp(`${root}/${file}`, `${base}/${file}`);
    const outputManifest = structuredClone(manifest);
    if (local) {
      outputManifest.name += " · Local Preview";
      outputManifest.content_scripts[0].matches.push("http://localhost:3011/demo/*", "http://127.0.0.1:3011/demo/*");
    }
    await writeFile(`${base}/manifest.json`, JSON.stringify(outputManifest, null, 2) + "\n");
  }
  console.log("Built dist/ and dist-dev/ (no runtime dependencies).");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildExtension();
