const toggle = document.querySelector<HTMLInputElement>("#live-ratings")!;
const status = document.querySelector<HTMLElement>("#status")!;
const campus = document.querySelector<HTMLSelectElement>("#campus")!;
void chrome.storage.local.get(["liveRatingsEnabled", "preferredCampus"]).then((settings) => {
  toggle.checked = Boolean(settings.liveRatingsEnabled);
  campus.value = settings.preferredCampus === "bothell" || settings.preferredCampus === "tacoma" ? settings.preferredCampus : "seattle";
});
campus.addEventListener("change", () => { void chrome.storage.local.set({ preferredCampus: campus.value }); });
document.querySelector<HTMLButtonElement>("#clear-cache")!.addEventListener("click", async () => {
  const values = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(values).filter(key => key.startsWith("rmp:v1:")));
  status.textContent = "本机教授评分缓存已清除。刷新 MyPlan 后会重新查询。";
});
toggle.addEventListener("change", async () => {
  if (toggle.checked) {
    const granted = await chrome.permissions.request({ origins: ["https://www.ratemyprofessors.com/*"] });
    toggle.checked = granted;
    await chrome.storage.local.set({ liveRatingsEnabled: granted });
    status.textContent = granted ? "已启用。浏览 MyPlan 课程时会查询页面中的教授；点击 RMP 按钮可查看详情。" : "未授予权限，仍可打开 RMP 原站。";
  } else {
    await chrome.storage.local.set({ liveRatingsEnabled: false });
    await chrome.permissions.remove({ origins: ["https://www.ratemyprofessors.com/*"] });
    status.textContent = "已关闭实时查询。";
  }
});
export {};
