const scenarios = {
  INFO441: { title: "INFO 441 — Server-Side Development", rows: [["A", ["Alex Chen"]], ["B", ["Jordan Lee"]]] },
  CSE142: { title: "CSE 142 — Computer Programming I", rows: [["A", ["Alex Chen", "Sam Rivera"]]] },
  INFO200: { title: "INFO 200 — Intellectual Foundations of Informatics", rows: [["A", ["Morgan Example"]]] },
};
function update() {
  const live = document.querySelector("#live-mode").checked;
  const name = document.querySelector("#real-professor").value.trim();
  const scenario = live ? { title: "U PLAN 100 — 公开教授评分实验", rows: [["本地测试行", [name || "Kevin Lin"]]] } : scenarios[document.querySelector("#scenario").value];
  document.querySelector("main").dataset.uPlanSource = live ? "live" : "demo";
  document.querySelector("#source-notice").textContent = live ? "教授评分来自 RMP。课程行与课评为演示，不代表此教授的实际开课信息。未使用 AWS / Railway。" : "教授姓名、评分与课评均为示例。默认不请求 AWS、Railway 或 RMP。";
  document.querySelector("h1").textContent = scenario.title;
  const tbody = document.querySelector("#sections"); tbody.replaceChildren();
  for (const [section, names] of scenario.rows) {
    const row = document.createElement("tr");
    const sectionCell = document.createElement("td"); sectionCell.textContent = section;
    const people = document.createElement("td");
    for (const name of names) { const line = document.createElement("div"); line.className="teacher-line"; const span=document.createElement("span"); span.dataset.instructorName=name; span.textContent=name; line.append(span); people.append(line); }
    const time = document.createElement("td"); time.textContent = "示例时间"; row.append(sectionCell, people, time); tbody.append(row);
  }
  document.querySelector("main").dataset.uPlanCampus=document.querySelector("#campus").value;
}
document.querySelector("#scenario").addEventListener("change", update);
document.querySelector("#campus").addEventListener("change", update);
document.querySelector("#live-mode").addEventListener("change", () => {
  const live = document.querySelector("#live-mode").checked;
  document.querySelector("#real-professor").disabled = !live;
  document.querySelector("#live-query").disabled = !live;
  document.querySelector("#scenario").disabled = live;
  if (!live) update();
});
document.querySelector("#live-form").addEventListener("submit", (event) => { event.preventDefault(); update(); });
