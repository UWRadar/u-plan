import { courseCode, matchProfessor, type Campus, type RatingResult } from "./model";
import { mountBadge, mountCoursePanel, mountRatingHeadings, type Lookup } from "./panel";
import { readLanguage, type Language } from "./language";

const demo = __LOCAL_BUILD__ && ["localhost", "127.0.0.1"].includes(location.hostname) && location.pathname === "/demo/";
const lookup: Lookup = async (name, campus, course) => {
  if (__LOCAL_BUILD__ && demo) {
    if (document.querySelector<HTMLElement>("main")?.dataset.uPlanSource !== "live") {
      const { DEMO_PROFESSORS } = await import("./demo-data");
      const result = matchProfessor(name, campus, DEMO_PROFESSORS, "demo");
      if (course) result.candidates = result.candidates.map(p => ({ ...p, courseRating: {
        code: course, status: "available", rating: 3.8, difficulty: 2.4, count: 6, partial: false,
      } }));
      return result;
    }
    const response = await fetch(`/api/ratings?${new URLSearchParams({ name, campus, ...(course ? { course } : {}) })}`, { credentials: "omit" });
    return response.ok ? await response.json() as RatingResult : { status: "unavailable", source: "rmp", candidates: [] };
  }
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return { status: "disabled", source: "rmp", candidates: [] };
  return await chrome.runtime.sendMessage({ type: "lookup", name, campus, course }) as RatingResult;
};

let signature = "";
let preferredCampus: Campus = "seattle";
let language: Language = "zh";
let previousNodes: Element[] = [];
const expandedSpans = new Map<HTMLTableCellElement, number>();

function originalSpan(cell: HTMLTableCellElement) {
  const span = expandedSpans.get(cell);
  return span !== undefined && cell.colSpan === span + 1 ? span : cell.colSpan;
}

function clearWidgets() {
  document.querySelectorAll("#u-plan-combined, [data-u-plan-badge]").forEach(element => {
    element.dispatchEvent(new Event("u-plan-dispose")); element.remove();
  });
  document.querySelectorAll("[data-u-plan-rating-cell]").forEach(cell => cell.remove());
  for (const [cell, span] of expandedSpans) {
    if (cell.colSpan === span + 1) cell.colSpan = span;
  }
  expandedSpans.clear();
}
function inject() {
  const heading = document.querySelector(".cdpCourseDetails h1, main h1, h1");
  const code = heading ? courseCode(heading.textContent ?? "") : null;
  if (!code) { clearWidgets(); signature = ""; return; }
  const details = document.querySelector(".cdpCourseDetails");
  if (!details) return;
  const ratingTables = new Set<HTMLTableElement>();
  const ratingCells = new Map<HTMLTableCellElement, "heading" | "scores" | "span">();
  for (const table of details.querySelectorAll("table")) {
    const header = table.tHead?.rows[0];
    if (!header || table.tHead?.rows.length !== 1) continue;
    const rows = Array.from(table.rows, row => Array.from(row.cells).filter(cell => !cell.hasAttribute("data-u-plan-rating-cell")));
    if (rows.some(row => row.some(cell => cell.rowSpan !== 1))) continue;
    let instructorColumn = 0;
    const headingCell = rows[0].find(cell => {
      if (/^instructors?$/i.test(cell.textContent?.trim() ?? "") && originalSpan(cell) === 1) return true;
      instructorColumn += originalSpan(cell);
      return false;
    });
    if (!headingCell) continue;
    ratingTables.add(table);
    ratingCells.set(headingCell, "heading");
    for (const row of rows.slice(1)) {
      let column = 0;
      for (const cell of row) {
        const span = originalSpan(cell);
        if (column + span > instructorColumn) {
          ratingCells.set(cell, span === 1 ? "scores" : "span");
          break;
        }
        column += span;
      }
    }
  }
  // A name per DOM node handles team-taught sections without joining names.
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-instructor-name], .instructor a, .instructors a, .instructor-name, .cdpInstructor a, td.instructor, td.instructors, .cdpCourseDetails td .mb-1"))
    .filter(node => {
      if (node.closest("#u-plan-combined")) return false;
      const table = node.closest("table");
      const cell = node.closest("td");
      return !table || !ratingTables.has(table) || (cell && ratingCells.get(cell) === "scores");
    });
  const nodes = candidates.filter(node => !candidates.some(other => other !== node && node.contains(other)));
  const instructors = nodes.map((node) => ({ node, name: (node.dataset.instructorName ?? node.innerText ?? node.textContent ?? "").trim() }))
    .filter(({name}) => name.length >= 3 && name.length <= 100 && !/^(?:staff|tba|to be announced)$/i.test(name));
  const names = [...new Set(instructors.map((i) => i.name))];
  const campusValue = document.querySelector<HTMLElement>("[data-u-plan-campus]")?.dataset.uPlanCampus;
  const campus: Campus = campusValue === "bothell" || campusValue === "tacoma" || campusValue === "seattle" ? campusValue : preferredCampus;
  const liveDemo = demo && document.querySelector<HTMLElement>("main")?.dataset.uPlanSource === "live";
  const next = JSON.stringify([code, instructors.map(({ name }) => name), campus, liveDemo, language,
    Array.from(ratingCells, ([cell, kind]) => [kind, originalSpan(cell)])]);
  const currentNodes = [...ratingCells.keys(), ...instructors.map(({ node }) => node)];
  if (next === signature && currentNodes.length === previousNodes.length &&
    currentNodes.every((node, index) => node === previousNodes[index]) &&
    document.querySelector("#u-plan-combined")) return;
  signature = next;
  previousNodes = currentNodes;
  const previousPanel = document.querySelector("#u-plan-combined")?.shadowRoot;
  const professorsSelected = previousPanel?.querySelector("#u-plan-professors-tab")?.getAttribute("aria-selected") === "true";
  clearWidgets();
  const scoreCells = new Map<HTMLTableCellElement, HTMLTableCellElement>();
  for (const [cell, kind] of ratingCells) {
    if (kind === "span") {
      expandedSpans.set(cell, cell.colSpan);
      cell.colSpan++;
      continue;
    }
    const added = document.createElement(kind === "heading" ? "th" : "td");
    added.dataset.uPlanRatingCell = "";
    if (kind === "heading") {
      added.scope = "col";
      added.append(mountRatingHeadings(language));
    } else {
      scoreCells.set(cell, added);
    }
    cell.after(added);
  }
  for (const { node, name } of instructors) {
    const instructorCell = node.closest("td");
    const scoreCell = instructorCell && scoreCells.get(instructorCell);
    const badge = mountBadge(name, campus, lookup, demo, language, code, Boolean(scoreCell));
    if (scoreCell) {
      const line = document.createElement("div");
      line.append(badge);
      scoreCell.append(line);
    } else if (node.tagName === "TD") node.append(badge);
    else node.insertAdjacentElement("afterend", badge);
  }
  const panel = mountCoursePanel(code, names, campus, lookup, demo, liveDemo, language);
  details.append(panel);
  if (professorsSelected) panel.shadowRoot?.querySelector<HTMLButtonElement>("#u-plan-professors-tab")?.click();
}

// The standalone local page and an unpacked extension can both load this file.
// Claim the document once to avoid two observers rebuilding the same widgets.
if (!document.documentElement.hasAttribute("data-u-plan-initialized")) {
  document.documentElement.setAttribute("data-u-plan-initialized", "2");
  document.querySelector("iframe#u-plan")?.remove();
  let scheduled: ReturnType<typeof setTimeout>;
  const schedule = () => { clearTimeout(scheduled); scheduled = setTimeout(inject, 150); };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("popstate", schedule);
  if (!demo && typeof chrome !== "undefined" && chrome.storage?.local) {
    const applySettings = (settings: { preferredCampus?: unknown; uiLanguage?: unknown }) => {
      preferredCampus = settings.preferredCampus === "bothell" || settings.preferredCampus === "tacoma" ? settings.preferredCampus : "seattle";
      language = readLanguage(settings.uiLanguage);
      schedule();
    };
    const keys = ["preferredCampus", "uiLanguage"];
    void chrome.storage.local.get(keys).then(applySettings);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || (!changes.preferredCampus && !changes.liveRatingsEnabled && !changes.uiLanguage)) return;
      if (changes.liveRatingsEnabled) signature = "";
      void chrome.storage.local.get(keys).then(applySettings);
    });
  }
  inject();
}
