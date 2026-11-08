import { copy, readLanguage, type Language } from "./language";

const toggle = document.querySelector<HTMLInputElement>("#live-ratings")!;
const status = document.querySelector<HTMLElement>("#status")!;
const campus = document.querySelector<HTMLSelectElement>("#campus")!;
const picker = document.querySelector<HTMLSelectElement>("#language")!;
const labels: Record<string, readonly [string, string]> = {
  heading: ["教授评分设置", "Professor rating settings"],
  intro: ["课程课评与教授评分分别标注来源。无需提供 NetID、密码或课表。", "Course reviews and professor ratings show their sources. No NetID, password, or class schedule is required."],
  language: ["显示语言", "Display language"],
  display: ["显示与校区", "Display and campus"],
  ratings: ["Rate My Professors 评分", "Rate My Professors ratings"],
  campus: ["UW 校区", "UW campus"],
  campusHelp: ["按所选校区匹配教授，避免同名教师配错学校。", "The selected campus helps match professors with the correct school."],
  live: ["启用 RMP 实时查询", "Enable live RMP lookups"],
  liveHelp: ["启用后，插件会向 Rate My Professors 发送教授姓名和 UW 校区来查询评分。结果缓存在本机。", "When enabled, the extension sends the professor's name and UW campus to Rate My Professors. Results are cached locally."],
  fallback: ["这是可选的实验性接入。RMP 不可用时仍可通过按钮打开原站，评分以原站为准。", "This integration is optional and experimental. If a lookup fails, you can still open RMP to see ratings at the source."],
  clear: ["清除本机评分缓存", "Clear cached ratings"],
};
let language: Language = "zh";
let statusCopy: readonly [string, string] = ["", ""];

function renderLanguage(value: Language) {
  language = value;
  document.documentElement.lang = value;
  document.title = copy(value, "U Plan 设置", "U Plan settings");
  picker.value = value;
  document.querySelectorAll<HTMLElement>("[data-copy]").forEach(element => {
    element.textContent = copy(value, ...labels[element.dataset.copy!]);
  });
  status.textContent = copy(value, ...statusCopy);
}

function showStatus(chinese: string, english: string) {
  statusCopy = [chinese, english];
  status.textContent = copy(language, chinese, english);
}

void chrome.storage.local.get(["liveRatingsEnabled", "preferredCampus", "uiLanguage"]).then(settings => {
  toggle.checked = Boolean(settings.liveRatingsEnabled);
  campus.value = settings.preferredCampus === "bothell" || settings.preferredCampus === "tacoma" ? settings.preferredCampus : "seattle";
  renderLanguage(readLanguage(settings.uiLanguage));
});
picker.addEventListener("change", () => {
  const value = readLanguage(picker.value);
  renderLanguage(value);
  void chrome.storage.local.set({ uiLanguage: value });
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.uiLanguage) renderLanguage(readLanguage(changes.uiLanguage.newValue));
});
campus.addEventListener("change", () => { void chrome.storage.local.set({ preferredCampus: campus.value }); });
document.querySelector<HTMLButtonElement>("#clear-cache")!.addEventListener("click", async () => {
  const values = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(values).filter(key => key.startsWith("rmp:v1:")));
  showStatus("本机教授评分缓存已清除。刷新 MyPlan 后会重新查询。", "Cached ratings cleared. Refresh MyPlan to look them up again.");
});
toggle.addEventListener("change", async () => {
  if (toggle.checked) {
    const granted = await chrome.permissions.request({ origins: ["https://www.ratemyprofessors.com/*"] });
    toggle.checked = granted;
    await chrome.storage.local.set({ liveRatingsEnabled: granted });
    if (granted) showStatus("已启用。打开 MyPlan 查看评分，点击评分可看详情。", "Live ratings are enabled. Open MyPlan and select a rating to see details.");
    else showStatus("未授予权限，仍可打开 RMP 原站。", "Permission was declined. You can still open RMP.");
  } else {
    await chrome.storage.local.set({ liveRatingsEnabled: false });
    await chrome.permissions.remove({ origins: ["https://www.ratemyprofessors.com/*"] });
    showStatus("已关闭实时查询。", "Live lookups are off.");
  }
});
