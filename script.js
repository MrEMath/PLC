const calendarItems = [
  {
    id: "item-1",
    date: "2026-08-03",
    course: "LMS 8th Grade Math",
    category: "Topic",
    title: "Topic 1-1 Rational Numbers",
    essentialUnderstanding: "Repeating decimals can be represented as an equivalent rational number.",
    objectives: [
      "Locate repeating decimals on a number line.",
      "Write repeating decimals as fractions."
    ],
    quiz: "",
    powerpoint: "",
    notes: "",
    tasks: [],
    videos: []
  }
];

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const calendarGrid = document.getElementById("calendarGrid");

const detailTitle = document.getElementById("detailTitle");
const detailCourse = document.getElementById("detailCourse");
const detailEU = document.getElementById("detailEU");
const detailObjectives = document.getElementById("detailObjectives");
const detailQuiz = document.getElementById("detailQuiz");
const detailPpt = document.getElementById("detailPpt");
const detailNotes = document.getElementById("detailNotes");
const detailTasks = document.getElementById("detailTasks");
const detailVideos = document.getElementById("detailVideos");

const itemModal = document.getElementById("itemModal");
const itemDateDisplay = document.getElementById("itemDateDisplay");
const itemCategory = document.getElementById("itemCategory");
const categoryFields = document.getElementById("categoryFields");
const itemSaveBtn = document.getElementById("itemSaveBtn");
const itemCancelBtn = document.getElementById("itemCancelBtn");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let currentEditingDate = null;
let editingItemId = null;

function initMonthYear() {
  monthSelect.innerHTML = "";
  yearSelect.innerHTML = "";

  monthNames.forEach((name, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });

  for (let y = 2024; y <= 2030; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  monthSelect.value = "7";
  yearSelect.value = "2026";
}

function renderCalendar() {
  const month = parseInt(monthSelect.value, 10);
  const year = parseInt(yearSelect.value, 10);

  calendarGrid.innerHTML = "";

  const headerRow = document.createElement("div");
  headerRow.className = "calendar-row header-row";

  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach(dayName => {
    const headerCell = document.createElement("div");
    headerCell.className = "calendar-cell header-cell";
    headerCell.textContent = dayName;
    headerRow.appendChild(headerCell);
  });

  calendarGrid.appendChild(headerRow);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let currentDate = 1;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement("div");
    row.className = "calendar-row";

    for (let weekday = 1; weekday <= 5; weekday++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";

      while (currentDate <= daysInMonth) {
        const jsDay = new Date(year, month, currentDate).getDay();
        if (jsDay >= 1 && jsDay <= 5) break;
        currentDate++;
      }

      if (currentDate <= daysInMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(currentDate).padStart(2, "0")}`;

        const dayLabel = document.createElement("div");
        dayLabel.className = "day-label";
        dayLabel.textContent = currentDate;
        cell.appendChild(dayLabel);

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = "addItemBtn";
        plusBtn.textContent = "+";
        plusBtn.addEventListener("click", () => openItemPopout(dateStr));
        cell.appendChild(plusBtn);

        const itemsForDay = calendarItems.filter(item => item.date === dateStr);
        itemsForDay.forEach(item => {
          const itemBtn = document.createElement("button");
          itemBtn.type = "button";
          itemBtn.className = "calendarItemBtn";
          itemBtn.textContent = item.title;
         itemBtn.addEventListener("click", () => {
  document.querySelectorAll(".calendarItemBtn").forEach(btn => {
    btn.classList.remove("selected");
  });
  itemBtn.classList.add("selected");
  showDetails(item.id);
});

itemBtn.addEventListener("dblclick", () => openEditItemPopout(item.id));
          cell.appendChild(itemBtn);
        });

        currentDate++;
      }

      row.appendChild(cell);
    }

    calendarGrid.appendChild(row);
  }
}

function showDetails(itemId) {
  const item = calendarItems.find(it => it.id === itemId);
  if (!item) return;

  detailTitle.textContent = item.title || "";
  detailCourse.textContent = item.course || "";
  detailEU.textContent = item.essentialUnderstanding || "";

  detailObjectives.innerHTML = "";
  (item.objectives || []).forEach(objective => {
    const li = document.createElement("li");
    li.textContent = objective;
    detailObjectives.appendChild(li);
  });

  detailQuiz.textContent = item.quiz || "";
  detailPpt.textContent = item.powerpoint || "";
  detailNotes.textContent = item.notes || "";

  detailTasks.innerHTML = "";
  (item.tasks || []).forEach(task => {
    const li = document.createElement("li");
    li.textContent = task;
    detailTasks.appendChild(li);
  });

  detailVideos.innerHTML = "";
  (item.videos || []).forEach(video => {
    const li = document.createElement("li");
    if (typeof video === "string") {
      li.textContent = video;
    } else {
      const a = document.createElement("a");
      a.href = video.url || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = video.label || video.url || "Video";
      li.appendChild(a);
    }
    detailVideos.appendChild(li);
  });
}

function openItemPopout(dateStr) {
  editingItemId = null;
  currentEditingDate = dateStr;
  itemDateDisplay.textContent = `Date: ${dateStr}`;
  itemCategory.value = "Topic";
  renderCategoryFields("Topic");
  itemModal.classList.remove("hidden");
}

function openEditItemPopout(itemId) {
  const item = calendarItems.find(it => it.id === itemId);
  if (!item) return;

  editingItemId = itemId;
  currentEditingDate = item.date;
  itemDateDisplay.textContent = `Date: ${item.date}`;
  itemCategory.value = item.category || "Topic";
  renderCategoryFields(item.category || "Topic");
  itemModal.classList.remove("hidden");

  document.getElementById("fieldTitle").value = item.title || "";
  document.getElementById("fieldEU").value = item.essentialUnderstanding || "";
  document.getElementById("fieldObjectives").value = (item.objectives || []).join("\n");
  document.getElementById("fieldQuiz").value = item.quiz || "";
  document.getElementById("fieldPpt").value = item.powerpoint || "";
  document.getElementById("fieldNotes").value = item.notes || "";
  document.getElementById("fieldTasks").value = (item.tasks || []).join("\n");
  document.getElementById("fieldVideos").value = (item.videos || [])
    .map(video => typeof video === "string" ? video : (video.url || ""))
    .join("\n");
}

function closeItemPopout() {
  itemModal.classList.add("hidden");
}

function renderCategoryFields(category) {
  if (category === "Topic") {
    categoryFields.innerHTML = `
      <label>Title:
        <input type="text" id="fieldTitle">
      </label>

      <label>Essential Understanding:
        <textarea id="fieldEU" rows="3"></textarea>
      </label>

      <label>Objectives (one per line):
        <textarea id="fieldObjectives" rows="4"></textarea>
      </label>

      <label>Quiz:
        <input type="text" id="fieldQuiz">
      </label>

      <label>PowerPoint:
        <input type="text" id="fieldPpt">
      </label>

      <label>Notes:
        <textarea id="fieldNotes" rows="4"></textarea>
      </label>

      <label>Tasks (one per line):
        <textarea id="fieldTasks" rows="4"></textarea>
      </label>

      <label>Videos (one URL per line):
        <textarea id="fieldVideos" rows="4"></textarea>
      </label>
    `;
  } else {
    categoryFields.innerHTML = `<p>Category layout not implemented yet.</p>`;
  }
}
}
itemSaveBtn.addEventListener("click", () => {
  const title = document.getElementById("fieldTitle").value.trim();
  const essentialUnderstanding = document.getElementById("fieldEU").value.trim();
  const objectives = document.getElementById("fieldObjectives").value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
  const quiz = document.getElementById("fieldQuiz").value.trim();
  const powerpoint = document.getElementById("fieldPpt").value.trim();
  const notes = document.getElementById("fieldNotes").value.trim();
  const tasks = document.getElementById("fieldTasks").value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
  const videos = document.getElementById("fieldVideos").value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .map(url => ({ label: url, url }));

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  if (editingItemId) {
    const item = calendarItems.find(it => it.id === editingItemId);
    if (item) {
      item.title = title;
      item.essentialUnderstanding = essentialUnderstanding;
      item.objectives = objectives;
      item.quiz = quiz;
      item.powerpoint = powerpoint;
      item.notes = notes;
      item.tasks = tasks;
      item.videos = videos;
      item.date = currentEditingDate;
    }
    closeItemPopout();
    renderCalendar();
    showDetails(editingItemId);
    editingItemId = null;
    return;
  }

  const newItem = {
    id: "item-" + Date.now(),
    date: currentEditingDate,
    course: "LMS 8th Grade Math",
    category: "Topic",
    title,
    essentialUnderstanding,
    objectives,
    quiz,
    powerpoint,
    notes,
    tasks,
    videos
  };

  calendarItems.push(newItem);
  closeItemPopout();
  renderCalendar();
  showDetails(newItem.id);
});

itemCancelBtn.addEventListener("click", closeItemPopout);
monthSelect.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

initMonthYear();
renderCalendar();
