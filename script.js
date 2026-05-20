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
const STORAGE_BUCKET = "plc-files";
const FILE_FIELDS = ["quiz", "powerpoint", "notes"];
const SUPABASE_URL = "https://kegiqnqfexqrpvvnxzqh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2lxbnFmZXhxcnB2dm54enFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg0MzYsImV4cCI6MjA5NDc5NDQzNn0.l_Q89WwUInbzzhhLuvKW11sJlycR6yB_lHnyQxTV8Sw";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
const itemDeleteBtn = document.getElementById("itemDeleteBtn");

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

let pendingResources = {
  quiz: null,
  powerpoint: null,
  notes: null,
  tasks: [],
  videos: []
};

function resetPendingResources() {
  pendingResources = {
  quiz: item.quiz || null,
  powerpoint: item.powerpoint || null,
  notes: item.notes || null,
  tasks: Array.isArray(item.tasks) ? [...item.tasks] : [],
  videos: Array.isArray(item.videos)
    ? item.videos.map(video => typeof video === "string" ? video : (video.url || ""))
    : []
};
}

function clearDetails() {
  detailTitle.textContent = "";
  detailCourse.textContent = "";
  detailEU.textContent = "";
  detailObjectives.innerHTML = "";
 detailQuiz.innerHTML = "";
detailPpt.innerHTML = "";
detailNotes.innerHTML = "";
  detailTasks.innerHTML = "";
  detailVideos.innerHTML = "";
}

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
async function uploadResourceFile(file, fieldName) {
  const folderMap = {
    quiz: "quizzes",
    powerpoint: "powerpoints",
    notes: "notes",
    tasks: "tasks"
  };

  const folder = folderMap[fieldName] || "misc";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { data, error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return {
    name: file.name,
    path: data.path,
    type: file.type,
    size: file.size
  };
}

async function getSignedFileUrl(path) {
  const { data, error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}
async function showDetails(itemId) {
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

  detailQuiz.innerHTML = "";
  detailPpt.innerHTML = "";
  detailNotes.innerHTML = "";

  async function renderFileLink(container, fileObj) {
    if (!fileObj || !fileObj.path) return;

    const a = document.createElement("a");
    a.textContent = fileObj.name || "Open file";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.href = "#";

    try {
      const signedUrl = await getSignedFileUrl(fileObj.path);
      a.href = signedUrl;
    } catch (err) {
      a.textContent = `${fileObj.name || "File"} (unavailable)`;
    }

    container.appendChild(a);
  }

  await renderFileLink(detailQuiz, item.quiz);
  await renderFileLink(detailPpt, item.powerpoint);
  await renderFileLink(detailNotes, item.notes);

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

function refreshResourcePreviews() {
  const quizPreview = document.getElementById("quizPreview");
  const powerpointPreview = document.getElementById("powerpointPreview");
  const notesPreview = document.getElementById("notesPreview");
  const tasksPreview = document.getElementById("tasksPreview");
  const videosPreview = document.getElementById("videosPreview");

  if (quizPreview) quizPreview.textContent = pendingResources.quiz ? "Added" : "";
  if (powerpointPreview) powerpointPreview.textContent = pendingResources.powerpoint ? "Added" : "";
  if (notesPreview) notesPreview.textContent = pendingResources.notes ? "Added" : "";
  if (tasksPreview) tasksPreview.textContent = pendingResources.tasks.length ? `${pendingResources.tasks.length} added` : "";
  if (videosPreview) videosPreview.textContent = pendingResources.videos.length ? `${pendingResources.videos.length} added` : "";
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

      <div class="resource-row">
        <span>Quiz:</span>
        <span id="quizPreview"></span>
        <button type="button" onclick="openResourcePopout('quiz')">+</button>
      </div>

      <div class="resource-row">
        <span>PowerPoint:</span>
        <span id="powerpointPreview"></span>
        <button type="button" onclick="openResourcePopout('powerpoint')">+</button>
      </div>

      <div class="resource-row">
        <span>Notes:</span>
        <span id="notesPreview"></span>
        <button type="button" onclick="openResourcePopout('notes')">+</button>
      </div>

      <div class="resource-row">
        <span>Tasks:</span>
        <span id="tasksPreview"></span>
        <button type="button" onclick="openResourcePopout('tasks')">+</button>
      </div>

      <div class="resource-row">
        <span>Videos:</span>
        <span id="videosPreview"></span>
        <button type="button" onclick="openResourcePopout('videos')">+</button>
      </div>
    `;

    refreshResourcePreviews();
  } else {
    categoryFields.innerHTML = `<p>Category layout not implemented yet.</p>`;
  }
}

function openItemPopout(dateStr) {
  editingItemId = null;
  currentEditingDate = dateStr;
  resetPendingResources();
  itemDateDisplay.textContent = `Date: ${dateStr}`;
  itemCategory.value = "Topic";
  renderCategoryFields("Topic");
  if (itemDeleteBtn) itemDeleteBtn.style.display = "none";
  itemModal.classList.remove("hidden");
}

function openEditItemPopout(itemId) {
  const item = calendarItems.find(it => it.id === itemId);
  if (!item) return;

  editingItemId = itemId;
  currentEditingDate = item.date;

  pendingResources = {
    quiz: item.quiz || "",
    powerpoint: item.powerpoint || "",
    notes: item.notes || "",
    tasks: Array.isArray(item.tasks) ? [...item.tasks] : [],
    videos: Array.isArray(item.videos)
      ? item.videos.map(video => typeof video === "string" ? video : (video.url || ""))
      : []
  };

  itemDateDisplay.textContent = `Date: ${item.date}`;
  itemCategory.value = item.category || "Topic";
  renderCategoryFields(item.category || "Topic");
  if (itemDeleteBtn) itemDeleteBtn.style.display = "inline-block";
  itemModal.classList.remove("hidden");

  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectivesEl = document.getElementById("fieldObjectives");

  if (titleEl) titleEl.value = item.title || "";
  if (euEl) euEl.value = item.essentialUnderstanding || "";
  if (objectivesEl) objectivesEl.value = (item.objectives || []).join("\n");

  refreshResourcePreviews();
}

function closeItemPopout() {
  itemModal.classList.add("hidden");
}

function openResourcePopout(fieldName) {
  currentResourceField = fieldName;
  resourceModal.classList.remove("hidden");
}

function closeResourcePopout() {
  resourceModal.classList.add("hidden");
}

itemSaveBtn.addEventListener("click", () => {
  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectivesEl = document.getElementById("fieldObjectives");

  const title = titleEl ? titleEl.value.trim() : "";
  const essentialUnderstanding = euEl ? euEl.value.trim() : "";
  const objectives = objectivesEl
    ? objectivesEl.value.split("\n").map(s => s.trim()).filter(Boolean)
    : [];

  const quiz = pendingResources.quiz;
  const powerpoint = pendingResources.powerpoint;
  const notes = pendingResources.notes;
  const tasks = pendingResources.tasks;
  const videos = pendingResources.videos.map(v => ({ label: v, url: v }));

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

if (resourceSaveBtn) {
  resourceSaveBtn.addEventListener("click", async () => {
    const selectedType = document.querySelector("input[name='resType']:checked");
    const linkInput = document.getElementById("resourceLinkInput");
    const fileInput = document.getElementById("resourceFileInput");

    if (!selectedType) {
      closeResourcePopout();
      return;
    }

    const type = selectedType.value;
    const linkValue = linkInput ? linkInput.value.trim() : "";
    let value = null;

    try {
      if (type === "link") {
        value = linkValue;
      } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
        value = await uploadResourceFile(fileInput.files[0], currentResourceField);
      }
    } catch (err) {
      alert("File upload failed: " + err.message);
      return;
    }

    if (!currentResourceField || !value) {
      closeResourcePopout();
      return;
    }

    if (currentResourceField === "tasks" || currentResourceField === "videos") {
      pendingResources[currentResourceField].push(value);
    } else {
      pendingResources[currentResourceField] = value;
    }

    refreshResourcePreviews();

    if (linkInput) linkInput.value = "";
    if (fileInput) fileInput.value = "";

    closeResourcePopout();
  });
}

if (resourceCancelBtn) {
  resourceCancelBtn.addEventListener("click", closeResourcePopout);
}

if (itemDeleteBtn) {
  itemDeleteBtn.addEventListener("click", () => {
    if (!editingItemId) return;

    const confirmed = confirm("Delete this calendar item?");
    if (!confirmed) return;

    const index = calendarItems.findIndex(item => item.id === editingItemId);
    if (index !== -1) {
      calendarItems.splice(index, 1);
    }

    editingItemId = null;
    closeItemPopout();
    renderCalendar();
    clearDetails();
  });
}

itemCancelBtn.addEventListener("click", closeItemPopout);
monthSelect.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

initMonthYear();
renderCalendar();
