import css from "./widget.css";
import { copy, type Language } from "./language";
import { CAMPUSES, ratingTone, professorUrl, searchUrl, type Campus, type Professor, type RatingResult } from "./model";

export type Lookup = (name: string, campus: Campus, course?: string) => Promise<RatingResult>;
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

function ratingLabels(language: Language) {
  return language === "en" ? ["Rating", "Difficulty", "Course"] : ["评分", "难度", "本课"];
}

export function mountRatingHeadings(language: Language): HTMLElement {
  const host = el("span");
  host.lang = language;
  const root = host.attachShadow({ mode: "open" });
  style(root);
  const headings = el("span", "table-ratings rating-headings");
  headings.append(...ratingLabels(language).map(label => el("span", "", label)));
  root.append(headings);
  return host;
}

export function mountBadge(name: string, campus: Campus, lookup: Lookup, demo: boolean, language: Language, course?: string, inRatingColumn = false): HTMLElement {
  const t = (zh: string, en: string) => copy(language, zh, en);
  const [ratingLabel, difficultyLabel, courseRatingLabel] = ratingLabels(language);
  const host = el("span");
  host.dataset.uPlanBadge = "";
  host.lang = language;
  const root = host.attachShadow({ mode: "open" });
  style(root);
  const button = el("button", inRatingColumn ? "badge table-rating-trigger" : "badge", "RMP ↗");
  button.type = "button";
  button.setAttribute("aria-label", t(`查看 ${name} 的教授评分`, `View ratings for ${name}`));
  button.setAttribute("aria-expanded", "false");
  const popup = el("div", "popup");
  popup.id = `u-plan-professor-${++nextId}`;
  popup.tabIndex = -1;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", t(`${name} 教授评分`, `${name} ratings`));
  button.setAttribute("aria-controls", popup.id);
  // The popover top layer prevents course-table overflow from clipping cards.
  if (typeof popup.showPopover === "function") popup.setAttribute("popover", "manual");
  root.append(button, popup);
  let open = false;
  let started = false;
  let above = false;
  const hide = () => {
    open = false;
    if (popup.hasAttribute("popover") && popup.matches(":popover-open")) popup.hidePopover();
    popup.classList.remove("open"); button.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", escape);
    document.removeEventListener("pointerdown", outside);
    window.removeEventListener("scroll", position, true);
    window.removeEventListener("resize", fitPopup);
  };
  const dismiss = () => { hide(); button.focus({ preventScroll: true }); };
  const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
  const outside = (event: PointerEvent) => { if (!event.composedPath().includes(host)) hide(); };
  function dismissButton() {
    const close = el("button", "dismiss", "×"); close.type = "button";
    close.setAttribute("aria-label", t("关闭教授评分", "Close ratings")); close.addEventListener("click", dismiss);
    popup.append(close);
  }

  function position() {
    const rect = button.getBoundingClientRect();
    popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 12))}px`;
    popup.style.top = `${above ? rect.top - popup.offsetHeight - 9 : rect.bottom + 9}px`;
  }

  function fitPopup() {
    const rect = button.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      popup.style.maxHeight = "";
      const spaceBelow = window.innerHeight - rect.bottom;
      above = spaceBelow < popup.offsetHeight + 21 && rect.top > spaceBelow;
      const availableHeight = (above ? rect.top : spaceBelow) - 21;
      popup.style.maxHeight = `${Math.max(0, availableHeight)}px`;
    }
    position();
  }

  function metric(label: string, value: number | null, difficulty = false) {
    const cell = el("span", "inline-metric");
    cell.append(el("span", "metric-label", label), el("strong", `rating-value ${ratingTone(value, difficulty)}`, value === null ? "—" : value.toFixed(1)));
    return cell;
  }

  function courseLabel(p: Professor) {
    const result = p.courseRating;
    if (!result || result.status === "unavailable") return t("本课程评分暂不可用", "Course rating unavailable");
    if (!result.count) return result.partial ? t("已读取评价中暂无本课程记录", "No course reviews in the data loaded") : t("暂无本课程评价", "No course reviews");
    return t(`${result.partial ? "部分数据 · " : ""}${result.count} 条本课程评价`, `${result.partial ? "Partial data · " : ""}${result.count} course ${result.count === 1 ? "review" : "reviews"}`);
  }

  function summary(p: Professor, source: "demo" | "rmp") {
    const courseResult = p.courseRating;
    const courseScore = courseResult?.status === "available" ? courseResult.rating : null;
    const courseDifficulty = courseResult?.status === "available" ? courseResult.difficulty : null;
    const overallScore = p.ratingCount ? p.rating : null;
    const overallDifficulty = p.ratingCount ? p.difficulty : null;
    const overall = t("总体评分", "Overall rating");
    const courseName = course ?? t("本课程", "This course");
    const courseFirst = courseScore !== null;
    const primaryScore = courseScore ?? overallScore;
    const formatScore = (score: number | null) => score?.toFixed(1) ?? "—";

    popup.replaceChildren();
    dismissButton();
    popup.append(el("p", "eyebrow", source === "demo" ? t("本地交互预览", "Local preview") : "Rate My Professors"));
    popup.append(el("h3", "", `${p.firstName} ${p.lastName}`));
    popup.append(el("p", "sub", `${CAMPUSES[campus].label} · ${p.department}`));
    const summary = el("div", "score-summary");
    function scoreRow(label: string, value: number | null, difficulty = false) {
      const row = el("div", "summary");
      const score = el("div", `score ${ratingTone(value, difficulty)}`, formatScore(value));
      const caption = el("div", "count");
      caption.append(el("strong", "", label));
      row.append(score, caption);
      summary.append(row);
      return caption;
    }
    if (courseFirst) {
      const caption = scoreRow(t(`${courseName} 评分`, `${courseName} rating`), primaryScore);
      caption.append(el("span", "", courseLabel(p)));
      scoreRow(t(`${courseName} 难度`, `${courseName} difficulty`), courseDifficulty, true);
    } else {
      const caption = scoreRow(overall, primaryScore);
      caption.append(el("span", "", t(`${p.ratingCount} 条评价`, `${p.ratingCount} ${p.ratingCount === 1 ? "review" : "reviews"}`)));
      if (course) caption.append(el("div", "", courseLabel(p)));
    }
    popup.append(summary);
    const stats = el("div", "stats");
    const details = [
      { label: t("总体难度", "Overall difficulty"), value: formatScore(overallDifficulty), tone: ratingTone(overallDifficulty, true) },
      { label: t("愿意再选", "Would take again"), value: p.wouldTakeAgain === null ? "—" : `${Math.round(p.wouldTakeAgain)}%`, tone: "" },
    ];
    if (courseFirst) {
      details.unshift({ label: overall, value: formatScore(overallScore), tone: ratingTone(overallScore) });
    }
    for (const { label, value, tone } of details) {
      const detail = el("div", `metric ${tone}`);
      detail.append(el("span", "", label), el("strong", "", value));
      stats.append(detail);
    }
    popup.append(stats);
    popup.append(link(source === "demo" ? t("在 RMP 搜索此姓名 ↗", "Search this name on RMP ↗") : t("查看 RMP 完整评价 ↗", "View all reviews on RMP ↗"), source === "demo" ? searchUrl(name, campus) : professorUrl(p)));
    button.className = inRatingColumn ? "badge rating-strip table-ratings" : "badge rating-strip";
    button.replaceChildren(
      metric(ratingLabel, overallScore),
      metric(difficultyLabel, overallDifficulty, true),
      metric(courseRatingLabel, courseScore),
    );
    const values = `${overall} ${overallScore?.toFixed(1) ?? "—"} · ${difficultyLabel} ${overallDifficulty?.toFixed(1) ?? "—"} · ${courseName} ${ratingLabel} ${courseScore?.toFixed(1) ?? "—"}`;
    if (courseResult?.partial && courseScore !== null) {
      button.lastElementChild?.querySelector(".rating-value")?.append(el("sup", "", "*"));
    }
    button.setAttribute("aria-label", `${name} · ${values} · ${courseLabel(p)} · ${t("查看详情", "View details")}`);
    if (open) {
      fitPopup();
      popup.focus({ preventScroll: true });
    }
  }

  function render(result: RatingResult) {
    if (!host.isConnected) return;
    if (result.status === "matched") return summary(result.candidates[0], result.source);
    popup.replaceChildren(el("p", "eyebrow", result.source === "demo" ? t("示例匹配", "Sample match") : "Rate My Professors"), el("h3", "", name));
    dismissButton();
    if (result.status === "ambiguous") {
      button.textContent = t("确认教授", "Choose professor");
      popup.append(el("p", "help", t("找到多个可能的同名教授，请核对院系后选择。", "Several professors match this name. Check the department before choosing.")));
      for (const p of result.candidates) {
        const choice = el("button", "choice", `${p.firstName} ${p.lastName}`);
        choice.type = "button"; choice.append(el("small", "", `${p.department} · ${CAMPUSES[campus].label}`));
        choice.addEventListener("click", () => summary(p, result.source)); popup.append(choice);
      }
    } else if (result.status === "disabled") {
      popup.append(el("p", "help", t("可在插件设置中开启实时评分，或直接打开 RMP 搜索。", "Enable live ratings in extension settings or search RMP directly.")));
      const settings = el("button", "options", t("打开插件设置", "Open extension settings")); settings.type = "button";
      settings.addEventListener("click", () => { void chrome.runtime.sendMessage({ type: "open-options" }); }); popup.append(settings);
    } else {
      button.textContent = result.status === "not-found" ? t("暂无匹配", "No match") : "RMP ↗";
      popup.append(el("p", "help", result.status === "not-found" ? t("未在所选校区找到可靠匹配。", "No reliable match at the selected campus.") : t("暂时无法读取评分，可以查看 RMP 原站。", "Ratings are temporarily unavailable. You can still open RMP.")));
    }
    popup.append(link(t("在 RMP 搜索 ↗", "Search on RMP ↗"), searchUrl(name, campus)));
    if (result.source === "demo") popup.append(el("p", "source demo", t("当前为本地示例数据，未请求 RMP。", "The local preview uses sample data.")));
    if (open) fitPopup();
  }

  async function load() {
    if (started) return;
    started = true;
    popup.replaceChildren(el("p", "help", t("正在读取教授评分…", "Loading professor ratings…")));
    dismissButton();
    try { render(await lookup(name, campus, course)); }
    catch { render({ status: "unavailable", source: "rmp", candidates: [] }); }
  }
  function show() {
    open = true;
    above = false;
    popup.classList.add("open");
    if (popup.hasAttribute("popover") && !popup.matches(":popover-open")) popup.showPopover();
    button.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    // Follow the button through both page scrolling and nested course-table scrolling.
    window.addEventListener("scroll", position, { capture: true, passive: true });
    window.addEventListener("resize", fitPopup);
    void load();
    fitPopup();
    popup.focus({ preventScroll: true });
  }
  button.addEventListener("click", () => { if (open) dismiss(); else show(); });
  host.addEventListener("u-plan-dispose", hide);
  // Local examples preload to demonstrate the same automatic inline behavior.
  if (demo) queueMicrotask(() => { if (host.isConnected) void load(); });
  else if (typeof chrome !== "undefined" && chrome.storage?.local) void chrome.storage.local.get("liveRatingsEnabled").then((s) => { if (s.liveRatingsEnabled && host.isConnected) void load(); });
  return host;
}

export function mountCoursePanel(code: string, names: string[], campus: Campus, lookup: Lookup, demo: boolean, liveDemo: boolean, language: Language): HTMLElement {
  const t = (zh: string, en: string) => copy(language, zh, en);
  const host = el("section"); host.id = "u-plan-combined"; host.lang = language;
  const root = host.attachShadow({ mode: "open" }); style(root);
  host.addEventListener("u-plan-dispose", () => root.querySelectorAll("[data-u-plan-badge]").forEach(e => e.dispatchEvent(new Event("u-plan-dispose"))));
  const panel = el("section", "combined");
  const bar = el("div", "bar");
  const brand = el("div", "brand", t("华大课友 · U Plan", "UW Classmates · U Plan"));
  brand.append(el("small", "", `${code} · ${t("课程课评与教授评分", "Course and professor reviews")}${demo ? t(" · 本地示例预览", " · Local preview") : ""}`));
  const tabs = el("div", "tabs"); tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", t("课程与教授信息", "Course and professor information"));
  const reviews = el("div", "body"); reviews.id = "u-plan-reviews"; reviews.setAttribute("role", "tabpanel");
  const frame = el("iframe", "course-frame"); frame.title = t(`${code} 华大课友课程评价`, `UW Classmates reviews for ${code}`);
  frame.loading = "lazy"; frame.referrerPolicy = "no-referrer";
  frame.src = demo ? `/demo/course-review.html?course=${encodeURIComponent(code)}` : `https://uwclassmate.com/CourseDetail/${encodeURIComponent(code)}`;
  reviews.append(frame);
  const professors = el("div", "prof-list"); professors.id = "u-plan-professors"; professors.setAttribute("role", "tabpanel"); professors.hidden = true;
  for (const name of names) {
    const item = el("div", "prof-item"); item.append(el("span", "prof-name", name), mountBadge(name, campus, lookup, demo, language, code)); professors.append(item);
  }
  if (!names.length) professors.append(el("p", "help", t("本页面尚未列出任课教授。", "No instructors are listed for this course.")));
  const tabButtons: HTMLButtonElement[] = [];
  for (const [index, label] of [t("课友课程评价", "Course reviews"), t("授课教授评分", "Professor ratings")].entries()) {
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
  bar.append(brand, tabs);
  const note = liveDemo
    ? t("课程页面与课评为示例，教授评分来自 RMP 实时查询。", "The course and reviews are examples. Professor ratings are from live RMP lookups.")
    : demo
      ? t("本地演示使用示例课评与教授评分。", "The local preview uses sample course reviews and professor ratings.")
      : t("课程评价来自华大课友，教授评分来自 RMP。", "Course reviews come from UW Classmates. Professor ratings come from RMP.");
  panel.append(bar, reviews, professors, el("p", "note", note));
  root.append(panel);
  return host;
}
