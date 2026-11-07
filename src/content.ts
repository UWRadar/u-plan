import { courseCode, matchProfessor, type Campus, type RatingResult } from "./model";
import { mountBadge, mountCoursePanel, type Lookup } from "./panel";

const demo = __LOCAL_BUILD__ && ["localhost", "127.0.0.1"].includes(location.hostname) && location.pathname === "/demo/";
const lookup: Lookup = async (name, campus) => {
  if (__LOCAL_BUILD__ && demo) {
    if (document.querySelector<HTMLElement>("main")?.dataset.uPlanSource !== "live") {
      const { DEMO_PROFESSORS } = await import("./demo-data");
      return matchProfessor(name, campus, DEMO_PROFESSORS, "demo");
    }
    const response = await fetch(`/api/ratings?${new URLSearchParams({ name, campus })}`, { credentials: "omit" });
    return response.ok ? await response.json() as RatingResult : { status: "unavailable", source: "rmp", candidates: [] };
  }
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return { status: "disabled", source: "rmp", candidates: [] };
  return await chrome.runtime.sendMessage({ type: "lookup", name, campus }) as RatingResult;
};

let signature = "";
let preferredCampus: Campus = "seattle";
function clearWidgets() {
  document.querySelectorAll("#u-plan-combined, [data-u-plan-badge]").forEach(element => {
    element.dispatchEvent(new Event("u-plan-dispose")); element.remove();
  });
}
function inject() {
  const heading = document.querySelector(".cdpCourseDetails h1, main h1, h1");
  const code = heading ? courseCode(heading.textContent ?? "") : null;
  if (!code) { clearWidgets(); signature = ""; return; }
  const details = document.querySelector(".cdpCourseDetails");
  if (!details) return;
  // A name per DOM node handles team-taught sections without joining names.
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[data-instructor-name], .instructor a, .instructors a, .instructor-name, .cdpInstructor a, td.instructor, td.instructors, .cdpCourseDetails td .mb-1"))
    .filter((node) => !node.closest("#u-plan-combined"));
  const nodes = candidates.filter(node => !candidates.some(other => other !== node && node.contains(other)));
  const instructors = nodes.map((node) => ({ node, name: (node.dataset.instructorName ?? node.innerText ?? node.textContent ?? "").trim() }))
    .filter(({name}) => name.length >= 3 && name.length <= 100 && !/^(?:staff|tba|to be announced)$/i.test(name));
  const names = [...new Set(instructors.map((i) => i.name))];
  const campusValue = document.querySelector<HTMLElement>("[data-u-plan-campus]")?.dataset.uPlanCampus;
  const campus: Campus = campusValue === "bothell" || campusValue === "tacoma" || campusValue === "seattle" ? campusValue : preferredCampus;
  const liveDemo = demo && document.querySelector<HTMLElement>("main")?.dataset.uPlanSource === "live";
  const next = JSON.stringify([code, names, campus, liveDemo]);
  if (next === signature && document.querySelector("#u-plan-combined")) return;
  signature = next;
  clearWidgets();
  for (const { node, name } of instructors) {
    const badge = mountBadge(name, campus, lookup, demo);
    if (node.tagName === "TD") node.append(badge);
    else node.insertAdjacentElement("afterend", badge);
  }
  details.append(mountCoursePanel(code, names, campus, lookup, demo, liveDemo));
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
    const applySettings = (settings: { preferredCampus?: unknown }) => {
      preferredCampus = settings.preferredCampus === "bothell" || settings.preferredCampus === "tacoma" ? settings.preferredCampus : "seattle";
      signature = ""; schedule();
    };
    void chrome.storage.local.get("preferredCampus").then(applySettings);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || (!changes.preferredCampus && !changes.liveRatingsEnabled)) return;
      void chrome.storage.local.get("preferredCampus").then(applySettings);
    });
  }
  inject();
}
