import css from "./widget.css";
import { CAMPUSES, professorUrl, searchUrl, type Campus, type Professor, type RatingResult } from "./model";

export type Lookup = (name: string, campus: Campus) => Promise<RatingResult>;
let nextId = 0;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function style(root: ShadowRoot) { root.append(el("style", "", css)); }
function link(label: string, href: string) {
  const a = el("a", "profile", label);
  a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
  return a;
}

export function mountBadge(name: string, campus: Campus, lookup: Lookup, demo: boolean): HTMLElement {
  const host = el("span");
  host.dataset.uPlanBadge = "";
  const root = host.attachShadow({ mode: "open" });
  style(root);
  const button = el("button", "badge", "RMP ↗");
  button.type = "button";
  button.setAttribute("aria-label", `查看 ${name} 的教授评分`);
  button.setAttribute("aria-expanded", "false");
  const popup = el("div", "popup");
  popup.id = `u-plan-professor-${++nextId}`;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", `${name} 教授评分`);
  button.setAttribute("aria-controls", popup.id);
  // The popover top layer prevents course-table overflow from clipping cards.
  if (typeof popup.showPopover === "function") popup.setAttribute("popover", "manual");
  root.append(button, popup);
  let open = false;
  let pinned = false;
  let started = false;
  let closeTimer: ReturnType<typeof setTimeout>;
  const hide = () => {
    open = false; pinned = false;
    if (popup.hasAttribute("popover") && popup.matches(":popover-open")) popup.hidePopover();
    popup.classList.remove("open"); button.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", escape);
    document.removeEventListener("pointerdown", outside);
  };
  const escape = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
  const outside = (event: PointerEvent) => { if (!event.composedPath().includes(host)) hide(); };
  function dismissButton() {
    const close = el("button", "dismiss", "×"); close.type = "button";
    close.setAttribute("aria-label", "关闭教授评分"); close.addEventListener("click", hide);
    popup.append(close);
  }

  function position() {
    const rect = button.getBoundingClientRect();
    popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 322))}px`;
    popup.style.top = `${Math.max(12, Math.min(rect.bottom + 9, window.innerHeight - popup.offsetHeight - 12))}px`;
  }

  function summary(p: Professor, source: "demo" | "rmp") {
    clearTimeout(closeTimer);
    popup.replaceChildren();
    dismissButton();
    popup.append(el("p", "eyebrow", source === "demo" ? "本地交互预览" : "Rate My Professors"));
    popup.append(el("h3", "", `${p.firstName} ${p.lastName}`));
    popup.append(el("p", "sub", `${CAMPUSES[campus].label} · ${p.department}`));
    const summaryRow = el("div", "summary");
    const rating = el("div", "score", p.ratingCount && p.rating !== null ? p.rating.toFixed(1) : "—");
    rating.append(el("small", "", " / 5"));
    const count = el("div", "count");
    count.append(el("strong", "", "教授综合评分"), el("span", "", `${p.ratingCount} 条评价`));
    summaryRow.append(rating, count);
    popup.append(summaryRow);
    const stats = el("div", "stats");
    for (const [label, value] of [["难度 Difficulty", p.difficulty === null ? "暂无" : `${p.difficulty.toFixed(1)} / 5`], ["Would take again", p.wouldTakeAgain === null ? "暂无" : `${Math.round(p.wouldTakeAgain)}%`]]) {
      const metric = el("div", "metric"); metric.append(el("span", "", label), el("strong", "", value)); stats.append(metric);
    }
    popup.append(stats);
    popup.append(link(source === "demo" ? "在 RMP 搜索此姓名 ↗" : "查看 RMP 完整评价 ↗", source === "demo" ? searchUrl(name, campus) : professorUrl(p)));
    popup.append(el("p", `source ${source === "demo" ? "demo" : ""}`, source === "demo" ? "示例人物与评分，用于本地界面测试，非真实 RMP 评价。" : "来源：Rate My Professors · 教授整体评价，未按本课程或本学期筛选。"));
    button.textContent = p.ratingCount && p.rating !== null ? `★ ${p.rating.toFixed(1)}` : "暂无评分";
    button.className = `badge ${p.rating !== null && p.rating >= 4 ? "good" : ""} ${source === "demo" ? "sample" : ""}`;
    if (open) {
      position();
      if (pinned) { popup.tabIndex = -1; popup.focus({ preventScroll: true }); }
    }
  }

  function render(result: RatingResult) {
    if (!host.isConnected) return;
    if (result.status === "matched") return summary(result.candidates[0], result.source);
    popup.replaceChildren(el("p", "eyebrow", result.source === "demo" ? "示例匹配" : "Rate My Professors"), el("h3", "", name));
    dismissButton();
    if (result.status === "ambiguous") {
      button.textContent = "确认教授";
      popup.append(el("p", "help", "找到多个可能的同名教授，请核对院系后选择。"));
      for (const p of result.candidates) {
        const choice = el("button", "choice", `${p.firstName} ${p.lastName}`);
        choice.type = "button"; choice.append(el("small", "", `${p.department} · ${CAMPUSES[campus].label}`));
        choice.addEventListener("click", () => summary(p, result.source)); popup.append(choice);
      }
    } else if (result.status === "disabled") {
      popup.append(el("p", "help", "可以直接打开 RMP 搜索。实时评分是可选功能，需要在插件设置中开启。"));
      const settings = el("button", "options", "打开插件设置"); settings.type = "button";
      settings.addEventListener("click", () => { void chrome.runtime.sendMessage({ type: "open-options" }); }); popup.append(settings);
    } else {
      button.textContent = result.status === "not-found" ? "暂无匹配" : "RMP ↗";
      popup.append(el("p", "help", result.status === "not-found" ? "未在所选校区找到可靠匹配。" : "暂时无法读取评分，可以查看 RMP 原站。"));
    }
    popup.append(link("在 RMP 搜索 ↗", searchUrl(name, campus)));
    if (result.source === "demo") popup.append(el("p", "source demo", "当前为本地示例数据，未请求 RMP。"));
    if (open) position();
  }

  async function load() {
    if (started) return;
    started = true;
    popup.replaceChildren(el("p", "help", "正在读取教授评分…"));
    dismissButton();
    try { render(await lookup(name, campus)); }
    catch { render({ status: "unavailable", source: "rmp", candidates: [] }); }
  }
  function show() {
    clearTimeout(closeTimer); open = true;
    popup.classList.add("open");
    if (popup.hasAttribute("popover") && !popup.matches(":popover-open")) popup.showPopover();
    button.setAttribute("aria-expanded", "true"); position();
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    void load();
  }
  button.addEventListener("pointerenter", show);
  button.addEventListener("focus", show);
  button.addEventListener("click", () => { pinned = true; show(); });
  const soonHide = () => { if (!pinned) closeTimer = setTimeout(() => { if (!pinned) hide(); }, 160); };
  button.addEventListener("pointerleave", soonHide);
  popup.addEventListener("pointerenter", () => clearTimeout(closeTimer));
  popup.addEventListener("pointerdown", () => { pinned = true; clearTimeout(closeTimer); });
  popup.addEventListener("pointerleave", soonHide);
  root.addEventListener("focusout", (event) => { if (!root.contains((event as FocusEvent).relatedTarget as Node)) soonHide(); });
  host.addEventListener("u-plan-dispose", () => { clearTimeout(closeTimer); hide(); });
  // Local examples preload to demonstrate the same automatic inline behavior.
  if (demo) queueMicrotask(() => { if (host.isConnected) void load(); });
  else if (typeof chrome !== "undefined" && chrome.storage?.local) void chrome.storage.local.get("liveRatingsEnabled").then((s) => { if (s.liveRatingsEnabled && host.isConnected) void load(); });
  return host;
}

export function mountCoursePanel(code: string, names: string[], campus: Campus, lookup: Lookup, demo: boolean, liveDemo = false): HTMLElement {
  const host = el("section"); host.id = "u-plan-combined";
  const root = host.attachShadow({ mode: "open" }); style(root);
  host.addEventListener("u-plan-dispose", () => root.querySelectorAll("[data-u-plan-badge]").forEach(e => e.dispatchEvent(new Event("u-plan-dispose"))));
  const panel = el("section", "combined");
  const bar = el("div", "bar");
  const brand = el("div", "brand", "华大课友 · U Plan");
  brand.append(el("small", "", `${code} · 课程课评与教授评分${demo ? " · 本地示例预览" : ""}`));
  const tabs = el("div", "tabs"); tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "课程与教授信息");
  const reviews = el("div", "body"); reviews.id = "u-plan-reviews"; reviews.setAttribute("role", "tabpanel");
  const frame = el("iframe", "course-frame"); frame.title = `${code} 华大课友课程评价`;
  frame.loading = "lazy"; frame.referrerPolicy = "no-referrer";
  frame.src = demo ? `/demo/course-review.html?course=${encodeURIComponent(code)}` : `https://uwclassmate.com/CourseDetail/${encodeURIComponent(code)}`;
  reviews.append(frame);
  const professors = el("div", "prof-list"); professors.id = "u-plan-professors"; professors.setAttribute("role", "tabpanel"); professors.hidden = true;
  for (const name of names) {
    const item = el("div", "prof-item"); item.append(el("span", "prof-name", name), mountBadge(name, campus, lookup, demo)); professors.append(item);
  }
  if (!names.length) professors.append(el("p", "help", "本页面尚未列出任课教授。"));
  const tabButtons: HTMLButtonElement[] = [];
  for (const [index, label] of ["课友课程评价", "授课教授评分"].entries()) {
    const tab = el("button", "", label); tab.type = "button"; tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(index === 0)); tab.tabIndex = index === 0 ? 0 : -1;
    const id = index === 0 ? reviews.id : professors.id;
    tab.id = `${id}-tab`; tab.setAttribute("aria-controls", id);
    (index === 0 ? reviews : professors).setAttribute("aria-labelledby", tab.id);
    tab.addEventListener("click", () => {
      for (const [i, button] of tabButtons.entries()) { button.setAttribute("aria-selected", String(i === index)); button.tabIndex = i === index ? 0 : -1; }
      reviews.hidden = index !== 0; professors.hidden = index === 0;
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === "Home" ? 0 : event.key === "End" ? 1 : index === 0 ? 1 : 0;
      tabButtons[target].click(); tabButtons[target].focus();
    });
    tabButtons.push(tab); tabs.append(tab);
  }
  bar.append(brand, tabs); panel.append(bar, reviews, professors, el("p", "note", liveDemo ? "本地课程页面与课评为示例；教授评分来自 RMP 实时查询。未使用 AWS / Railway。" : demo ? "本地演示：示例课评与示例教授评分。无 AWS / Railway / RMP 请求。" : "课程评价来自华大课友；教授评分来自 RMP。两种评价分别展示。")); root.append(panel);
  return host;
}
