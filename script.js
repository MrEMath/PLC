// --- Data model: start with 1 sample item like your Topic 1-1 slide ---
const calendarItems = [
  {
    id: "item-1",
    date: "2025-08-03",
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

// --- Month/year and calendar grid ---
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const calendarGrid = document.getElementById("calendarGrid");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function initMonthYear() {
  monthSelect.innerHTML = "";
  yearSelect.innerHTML = "";

  monthNames.forEach((name, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });

  const startYear = 2024;
  const endYear = 2030;
  for (let y = startYear; y <= endYear; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  monthSelect.value = "7";   // August
  yearSelect.value = "2026";
}

function renderCalendar() {
  const month = parseInt(monthSelect.value, 10);
  const year = parseInt(yearSelect.value, 10);

  calendarGrid.innerHTML = "";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.className = "calendar-row header-row";

  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach(dayName => {
    const headerCell = document.createElement("div");
    headerCell.className = "calendar-cell header-cell";
    headerCell.textContent = dayName;
    headerRow.appendChild(headerCell);
  });

  calendarGrid.appendChild(headerRow);

  const firstOfMonth = new Date(year, month, 1);
  let weekdayOfFirst = (firstOfMonth.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // If month starts on Sat/Sun, start visible grid on Monday
  if (weekdayOfFirst >= 5) {
    weekdayOfFirst = 0;
  }

  let day = 1;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement("div");
    row.className = "calendar-row";

    for (let weekday = 0; weekday < 5; weekday++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";

      if (week === 0 && weekday < weekdayOfFirst) {
        // Blank cells before first visible school day
      } else if (day <= daysInMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const dayLabel = document.createElement("div");
        dayLabel.className = "day-label";
        dayLabel.textContent = day;

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
          cell.appendChild(itemBtn);
        });

        day++;
      }

      row.appendChild(cell);
    }

    calendarGrid.appendChild(row);
  }
}

monthSelect.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

// --- Details panel ---
function showDetails(itemId) {
  const item = calendarItems.find(it => it.id === itemId);
  if (!item) return;

  document.getElementById("detailTitle").textContent = item.title || "";
  document.getElementById("detailCourse").textContent = item.course || "";
  document.getElementById("detailEU").textContent = item.essentialUnderstanding || "";

  const objUl = document.getElementById("detailObjectives");
  objUl.innerHTML = "";
  (item.objectives || []).forEach(objective => {
    const li = document.createElement("li");
    li.textContent = objective;
    objUl.appendChild(li);
  });

  document.getElementById("detailQuiz").textContent = item.quiz || "";
  document.getElementById("detailPpt").textContent = item.powerpoint || "";
  document.getElementById("detailNotes").textContent = item.notes || "";

  const tasksUl = document.getElementById("detailTasks");
  tasksUl.innerHTML = "";
  (item.tasks || []).forEach(task => {
    const li = document.createElement("li");
    li.textContent = task;
    tasksUl.appendChild(li);
  });

  const videosUl = document.getElementById("detailVideos");
  videosUl.innerHTML = "";
  (item.videos || []).forEach(video => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = video.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = video.label || video.url;
    li.appendChild(a);
    videosUl.appendChild(li);
  });
}

// --- Item popout ---
const itemModal = document.getElementById("itemModal");
const itemDateDisplay = document.getElementById("itemDateDisplay");
const itemCategory = document.getElementById("itemCategory");
const categoryFields = document.getElementById("categoryFields");
const itemSaveBtn = document.getElementById("itemSaveBtn");
const itemCancelBtn = document.getElementById("itemCancelBtn");

let currentEditingDate = null;

function openItemPopout(dateStr) {
  currentEditingDate = dateStr;
  itemDateDisplay.textContent = `Date: ${dateStr}`;
  itemCategory.value = "Topic";
  renderCategoryFields("Topic");
  itemModal.classList.remove("hidden");
}

function closeItemPopout() {
  itemModal.classList.add("hidden");
}

itemCancelBtn.addEventListener("click", closeItemPopout);

itemCategory.addEventListener("change", () => {
  renderCategoryFields(itemCategory.value);
});

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

// --- Resource popout ---
const resourceModal = document.getElementById("resourceModal");
const resourceLinkFields = document.getElementById("resourceLinkFields");
const resourceFileFields = document.getElementById("resourceFileFields");
const resourceSaveBtn = document.getElementById("resourceSaveBtn");
const resourceCancelBtn = document.getElementById("resourceCancelBtn");

let currentResourceField = null;

function openResourcePopout(fieldName) {
  currentResourceField = fieldName;
  resourceModal.classList.remove("hidden");
}

function closeResourcePopout() {
  resourceModal.classList.add("hidden");
}

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

// --- Kick everything off ---
initMonthYear();
renderCalendar();