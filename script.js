// --- Data model ---
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
    videos: [
      { label: "Intro video", url: "https://example.com/video1" }
    ]
  }
];

// --- Calendar elements ---
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const calendarGrid = document.getElementById("calendarGrid");

// --- Detail elements ---
const detailTitle = document.getElementById("detailTitle");
const detailCourse = document.getElementById("detailCourse");
const detailEU = document.getElementById("detailEU");
const detailObjectives = document.getElementById("detailObjectives");
const detailQuiz = document.getElementById("detailQuiz");
const detailPpt = document.getElementById("detailPpt");
const detailNotes = document.getElementById("detailNotes");
const detailTasks = document.getElementById("detailTasks");
const detailVideos = document.getElementById("detailVideos");

// --- Modal elements ---
const itemModal = document.getElementById("itemModal");
const itemDateDisplay = document.getElementById("itemDateDisplay");
const itemCategory = document.getElementById("itemCategory");
const categoryFields = document.getElementById("categoryFields");
const itemSaveBtn = document.getElementById("itemSaveBtn");
const itemCancelBtn = document.getElementById("itemCancelBtn");

const resourceModal = document.getElementById("resourceModal");
const resourceLinkFields = document.getElementById("resourceLinkFields");
const resourceFileFields = document.getElementById("resourceFileFields");
const resourceSaveBtn = document.getElementById("resourceSaveBtn");
const resourceCancelBtn = document.getElementById("resourceCancelBtn");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let currentEditingDate = null;
let editingItemId = null;
let currentResourceField = null;

// --- Init ---
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

  monthSelect.value = "7"; // August
  yearSelect.value = "2026";
}

// --- Calendar render ---
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

  let firstVisibleDate = 1;
  while (firstVisibleDate <= daysInMonth) {
    const d = new Date(year, month, firstVisibleDate).getDay();
    if (d >= 1 && d <= 5) break;
    firstVisibleDate++;
  }

  let currentDate = firstVisibleDate;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement("div");
    row.className = "calendar-row";

    for (let weekday = 0; weekday < 5; weekday++) {
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

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.textContent = "+";
        plusBtn.className = "addItemBtn";
        plusBtn.addEventListener("click", () => openItemPopout(dateStr));

        cell.appendChild(dayLabel);
        cell.appendChild(plusBtn);

        const itemsForDay = calendarItems.filter(item => item.date === dateStr);
        itemsForDay.forEach(item => {
          const itemBtn = document.createElement("button");
          itemBtn.type = "button";
          itemBtn.textContent = item.title;
          itemBtn.className = "calendarItemBtn";
          itemBtn.addEventListener("click", () => showDetails(item.id));
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

// --- Details panel ---
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
      a.textContent = video.label || "Video";
      li.appendChild(a);
    }
    detailVideos.appendChild(li);
  });
}

// --- Item modal ---
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

  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectivesEl = document.getElementById("fieldObjectives");

  if (titleEl) titleEl.value = item.title || "";
  if (euEl) euEl.value = item.essentialUnderstanding || "";
  if (objectivesEl) objectivesEl.value = (item.objectives || []).join("\n");
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
        <textarea id="fieldEU"></textarea>
      </label>

      <label>Objectives:
        <textarea id="fieldObjectives" placeholder="One per line"></textarea>
      </label>

      <div class="field-row">
        <span>Quiz</span>
        <button type="button" onclick="openResourcePopout('quiz')">+</button>
      </div>

      <div class="field-row">
        <span>PowerPoint</span>
        <button type="button" onclick="openResourcePopout('ppt')">+</button>
      </div>

      <div class="field-row">
        <span>Notes</span>
        <button type="button" onclick="openResourcePopout('notes')">+</button>
      </div>

      <div class="field-row">
        <span>Tasks</span>
        <button type="button" onclick="openResourcePopout('tasks')">+</button>
      </div>

      <div class="field-row">
        <span>Videos</span>
        <button type="button" onclick="openResourcePopout('videos')">+</button>
      </div>
    `;
  } else {
    categoryFields.innerHTML = `<p>Category layout not implemented yet.</p>`;
  }
}

// --- Resource modal ---
function openResourcePopout(fieldName) {
  currentResourceField = fieldName;
  resourceModal.classList.remove("hidden");
}

function closeResourcePopout() {
  resourceModal.classList.add("hidden");
}

// --- Events ---
monthSelect.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

itemCancelBtn.addEventListener("click", closeItemPopout);

itemCategory.addEventListener("change", () => {
  renderCategoryFields(itemCategory.value);
});

itemSaveBtn.addEventListener("click", () => {
  const category = itemCategory.value;

  if (category !== "Topic") {
    alert("Only Topic is set up right now.");
    return;
  }

  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectivesEl = document.getElementById("fieldObjectives");

  const title = titleEl ? titleEl.value.trim() : "";
  const essentialUnderstanding = euEl ? euEl.value.trim() : "";
  const objectives = objectivesEl
    ? objectivesEl.value.split("\n").map(s => s.trim()).filter(Boolean)
    : [];

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  if (editingItemId) {
    const existingItem = calendarItems.find(it => it.id === editingItemId);
    if (existingItem) {
      existingItem.title = title;
      existingItem.essentialUnderstanding = essentialUnderstanding;
      existingItem.objectives = objectives;
      existingItem.date = currentEditingDate;
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
    quiz: "",
    powerpoint: "",
    notes: "",
    tasks: [],
    videos: []
  };

  calendarItems.push(newItem);
  closeItemPopout();
  renderCalendar();
  showDetails(newItem.id);
});

resourceCancelBtn.addEventListener("click", closeResourcePopout);

document.querySelectorAll("input[name='resType']").forEach(radio => {
  radio.addEventListener("change", () => {
    const type = document.querySelector("input[name='resType']:checked").value;
    if (type === "link") {
      resourceLinkFields.classList.remove("hidden");
      resourceFileFields.classList.add("hidden");
    } else {
      resourceLinkFields.classList.add("hidden");
      resourceFileFields.classList.remove("hidden");
    }
  });
});

resourceSaveBtn.addEventListener("click", () => {
  closeResourcePopout();
});

// --- Start ---
initMonthYear();
renderCalendar();
