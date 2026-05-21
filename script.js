let calendarItems = [];

const STORAGE_BUCKET = "plc-files";
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
const resourceSaveBtn = document.getElementById("resourceSaveBtn");
const resourceCancelBtn = document.getElementById("resourceCancelBtn");

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CATEGORY_COLORS = {
  "Topic": "#577590",
  "Quiz": "#F8961E",
  "No School": "#43AA8B",
  "No Students": "#90BE6D",
  "CPA": "#F3722C",
  "Benchmark": "#F94144",
  "Diagnostic": "#F9C74F"
};
const CATEGORY_TEXT_COLORS = {
  "Topic": "#ffffff",
  "Quiz": "#000000",
  "No School": "#ffffff",
  "No Students": "#000000",
  "CPA": "#ffffff",
  "Benchmark": "#ffffff",
  "Diagnostic": "#000000"
};
let currentEditingDate = null;
let editingItemId = null;
let currentResourceField = null;

let pendingResources = { quiz: [], powerpoint: [], notes: [], task: [], videos: [] };

function resetPendingResources() {
  pendingResources = { quiz: [], powerpoint: [], notes: [], task: [], videos: [] };
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

function clearDetails() {
  detailTitle.textContent = "";
  if (detailCourse) detailCourse.textContent = "";
  detailEU.textContent = "";
  detailObjectives.innerHTML = "";
  detailQuiz.innerHTML = "";
  detailPpt.innerHTML = "";
  detailNotes.innerHTML = "";
  detailTasks.innerHTML = "";
  detailVideos.innerHTML = "";
  const dr = document.getElementById("detailReason");
  if (dr) dr.textContent = "";
  const drRow = document.getElementById("detailReasonRow");
  if (drRow) drRow.style.display = "none";
}

async function saveCalendarItem(item) {
  const payload = {
    id: item.id, date: item.date, category: item.category || "",
    title: item.title || "", essential_understanding: item.essentialUnderstanding || "",
    objectives: item.objectives || "", quiz: item.quiz || null,
    powerpoint: item.powerpoint || null, notes: item.notes || null,
    task: item.task || null, videos: item.videos || null, reason: item.reason || ""
  };
  const { data, error } = await supabaseClient.from("calendar_items").upsert(payload).select();
  if (error) throw error;
  return data;
}

async function loadCalendarItems() {
  const { data, error } = await supabaseClient.from("calendar_items").select("*").order("date", { ascending: true });
  if (error) { console.error("Error loading:", error); return; }
  calendarItems = (data || []).map(row => ({
    id: row.id, date: row.date, category: row.category || "", title: row.title || "",
    essentialUnderstanding: row.essential_understanding || "", objectives: row.objectives || "",
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
    powerpoint: Array.isArray(row.powerpoint) ? row.powerpoint : [],
    notes: Array.isArray(row.notes) ? row.notes : [],
    task: Array.isArray(row.task) ? row.task : [],
    videos: Array.isArray(row.videos) ? row.videos : [],
    reason: row.reason || ""
  }));
  renderCalendar();
}

async function deleteCalendarItem(itemId) {
  const { error } = await supabaseClient.from("calendar_items").delete().eq("id", itemId);
  if (error) throw error;
}

async function uploadResourceFiles(files, fieldName, altText = "") {
  const folderMap = { quiz: "quizzes", powerpoint: "powerpoints", notes: "notes", task: "tasks", videos: "videos" };
  const folder = folderMap[fieldName] || "misc";
  const uploaded = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = folder + "/" + Date.now() + "-" + safeName;
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    uploaded.push({ name: file.name, path: data.path, type: file.type, size: file.size, url: null, altText });
  }
  return uploaded;
}

async function getSignedFileUrl(path) {
  const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function toggleResourceInput(type) {
  const linkFields = document.getElementById("resourceLinkFields");
  const fileFields = document.getElementById("resourceFileFields");
  if (!linkFields || !fileFields) return;
  if (type === "link") { linkFields.style.display = "block"; fileFields.style.display = "none"; }
  else { linkFields.style.display = "none"; fileFields.style.display = "block"; }
}

function refreshResourcePreviews() {
  const qp = document.getElementById("quizPreview");
  const pp = document.getElementById("powerpointPreview");
  const np = document.getElementById("notesPreview");
  const tp = document.getElementById("taskPreview");
  const vp = document.getElementById("videosPreview");
  if (qp) qp.textContent = pendingResources.quiz.length ? pendingResources.quiz.length + " added" : "";
  if (pp) pp.textContent = pendingResources.powerpoint.length ? pendingResources.powerpoint.length + " added" : "";
  if (np) np.textContent = pendingResources.notes.length ? pendingResources.notes.length + " added" : "";
  if (tp) tp.textContent = pendingResources.task.length ? pendingResources.task.length + " added" : "";
  if (vp) vp.textContent = pendingResources.videos.length ? pendingResources.videos.length + " added" : "";
}

function renderCategoryFields(category) {
  if (category === "Topic") {
    categoryFields.innerHTML = '<label>Title: <input type="text" id="fieldTitle"></label>' +
      '<label>Essential Understanding: <textarea id="fieldEU" rows="3"></textarea></label>' +
      '<label>Objectives (one per line): <textarea id="fieldObjectives" rows="4"></textarea></label>' +
      '<div class="resourceRow"><span>Quiz:</span><button type="button" onclick="openResourcePopout(\'quiz\')">+</button><span id="quizPreview"></span></div>' +
      '<div class="resourceRow"><span>PowerPoint:</span><button type="button" onclick="openResourcePopout(\'powerpoint\')">+</button><span id="powerpointPreview"></span></div>' +
      '<div class="resourceRow"><span>Notes:</span><button type="button" onclick="openResourcePopout(\'notes\')">+</button><span id="notesPreview"></span></div>' +
      '<div class="resourceRow"><span>Task:</span><button type="button" onclick="openResourcePopout(\'task\')">+</button><span id="taskPreview"></span></div>' +
      '<div class="resourceRow"><span>Videos:</span><button type="button" onclick="openResourcePopout(\'videos\')">+</button><span id="videosPreview"></span></div>';
    refreshResourcePreviews();
  } else if (category === "No Students") {
    categoryFields.innerHTML = '<label>Reason: <textarea id="fieldReason" rows="3"></textarea></label>';
  } else {
    categoryFields.innerHTML = '<p>Category layout not implemented yet.</p>';
  }
}
function openItemPopout(dateStr) {
  editingItemId = null;
  currentEditingDate = dateStr;
  resetPendingResources();
  itemDateDisplay.textContent = "Date: " + dateStr;
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
    quiz: Array.isArray(item.quiz) ? [...item.quiz] : [],
    powerpoint: Array.isArray(item.powerpoint) ? [...item.powerpoint] : [],
    notes: Array.isArray(item.notes) ? [...item.notes] : [],
    task: Array.isArray(item.task) ? [...item.task] : [],
    videos: Array.isArray(item.videos) ? [...item.videos] : []
  };
  itemDateDisplay.textContent = "Date: " + item.date;
  itemCategory.value = item.category || "Topic";
  renderCategoryFields(item.category || "Topic");
  if (itemDeleteBtn) itemDeleteBtn.style.display = "inline-block";
  itemModal.classList.remove("hidden");
  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectivesEl = document.getElementById("fieldObjectives");
  const reasonEl = document.getElementById("fieldReason");
  if (titleEl) titleEl.value = item.title || "";
  if (euEl) euEl.value = item.essentialUnderstanding || "";
  if (objectivesEl) objectivesEl.value = item.objectives || "";
  if (reasonEl) reasonEl.value = item.reason || "";
  refreshResourcePreviews();
}

function closeItemPopout() {
  itemModal.classList.add("hidden");
}

function openResourcePopout(field) {
  currentResourceField = field;
  const linkRadio = document.querySelector("input[name='resType'][value='link']");
  if (linkRadio) linkRadio.checked = true;
  toggleResourceInput("link");
  const fileInput = document.getElementById("resourceFileInput");
  const selectedFileName = document.getElementById("selectedFileName");
  const linkInput = document.getElementById("resourceLinkInput");
  const altInput = document.getElementById("resourceAltInput");
  if (fileInput) fileInput.value = "";
  if (selectedFileName) selectedFileName.textContent = "";
  if (linkInput) linkInput.value = "";
  if (altInput) altInput.value = "";
  resourceModal.classList.remove("hidden");
}

function closeResourcePopout() {
  resourceModal.classList.add("hidden");
}

async function showDetails(itemId) {
  const item = calendarItems.find(it => it.id === itemId);
  if (!item) return;
  clearDetails();
  const isNoStudents = item.category === "No Students";

const topicRow = document.getElementById("detailTitleRow");
const euRow = document.getElementById("detailEURow");
const objectivesRow = document.getElementById("detailObjectivesRow");
const quizRow = document.getElementById("detailQuizRow");
const pptRow = document.getElementById("detailPptRow");
const notesRow = document.getElementById("detailNotesRow");
const tasksRow = document.getElementById("detailTasksRow");
const videosRow = document.getElementById("detailVideosRow");

const topicRows = [topicRow, euRow, objectivesRow, quizRow, pptRow, notesRow, tasksRow, videosRow];
topicRows.forEach(row => { if (row) row.style.display = isNoStudents ? "none" : "block"; });

detailTitle.textContent = item.title || "";
detailEU.textContent = item.essentialUnderstanding || "";
  const detailReasonRow = document.getElementById("detailReasonRow");
  const detailReason = document.getElementById("detailReason");
  if (isNoStudents) {
    if (detailReasonRow) detailReasonRow.style.display = "block";
    if (detailReason) detailReason.textContent = item.reason || "";
  } else {
    if (detailReasonRow) detailReasonRow.style.display = "none";
  }
  if (!isNoStudents && item.objectives) {
    item.objectives.split("\n").filter(Boolean).forEach(obj => {
      const li = document.createElement("li");
      li.textContent = obj;
      detailObjectives.appendChild(li);
    });
  }
  async function renderFileLinks(container, items) {
    if (!container || !Array.isArray(items) || !items.length) return;
    for (const fileObj of items) {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "0.75rem";
      if (fileObj.type === "link" && fileObj.url) {
        const a = document.createElement("a");
        a.textContent = fileObj.altText && fileObj.altText.trim() ? fileObj.altText : (fileObj.name || fileObj.url);
        a.href = fileObj.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        wrapper.appendChild(a);
      } else if (fileObj.path) {
        const a = document.createElement("a");
        a.textContent = fileObj.altText && fileObj.altText.trim() ? fileObj.altText : (fileObj.name || "Open file");
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.href = "#";
        try {
          const signedUrl = await getSignedFileUrl(fileObj.path);
          a.href = signedUrl;
        } catch (err) {
          a.textContent = (fileObj.name || "File") + " (unavailable)";
        }
        wrapper.appendChild(a);
      }
      container.appendChild(wrapper);
    }
  }
  if (!isNoStudents) {
    await renderFileLinks(detailQuiz, item.quiz);
    await renderFileLinks(detailPpt, item.powerpoint);
    await renderFileLinks(detailNotes, item.notes);
    await renderFileLinks(detailTasks, item.task);
    await renderFileLinks(detailVideos, item.videos);
  }
}

function renderCalendar() {
  const month = parseInt(monthSelect.value, 10);
  const year = parseInt(yearSelect.value, 10);
  calendarGrid.innerHTML = "";
  const headerRow = document.createElement("div");
  headerRow.className = "calendar-row header-row";
  ["Monday","Tuesday","Wednesday","Thursday","Friday"].forEach(dayName => {
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
        const dateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(currentDate).padStart(2, "0");
        cell.addEventListener("dragover", (e) => {
  e.preventDefault();
  cell.classList.add("drag-over");
});
cell.addEventListener("dragleave", () => {
  cell.classList.remove("drag-over");
});
cell.addEventListener("drop", async (e) => {
  e.preventDefault();
  cell.classList.remove("drag-over");
  const itemId = e.dataTransfer.getData("itemId");
  const draggedItem = calendarItems.find(it => it.id === itemId);
  if (!draggedItem || draggedItem.date === dateStr) return;
  draggedItem.date = dateStr;
  try {
    await saveCalendarItem(draggedItem);
    renderCalendar();
  } catch (err) {
    console.error("Drop save error:", err);
    alert("Failed to move item: " + err.message);
  }
});
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
          itemBtn.draggable = true;
          itemBtn.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("itemId", item.id);
          });
          itemBtn.textContent = item.category === "No Students" ? (item.reason || "No Students") : (item.title || item.category || "Item");
          const color = CATEGORY_COLORS[item.category];
          if (color) {
            itemBtn.style.backgroundColor = color;
            itemBtn.style.borderColor = color;
            itemBtn.style.color = CATEGORY_TEXT_COLORS[item.category] || "#000";
          }
          itemBtn.addEventListener("click", () => {
            document.querySelectorAll(".calendarItemBtn").forEach(btn => btn.classList.remove("selected"));
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

itemSaveBtn.addEventListener("click", async () => {
  const category = itemCategory.value;
  const title = document.getElementById("fieldTitle") ? document.getElementById("fieldTitle").value.trim() : "";
  const essentialUnderstanding = document.getElementById("fieldEU") ? document.getElementById("fieldEU").value.trim() : "";
  const objectives = document.getElementById("fieldObjectives") ? document.getElementById("fieldObjectives").value.trim() : "";
  const reason = document.getElementById("fieldReason") ? document.getElementById("fieldReason").value.trim() : "";
  const item = {
    id: editingItemId || crypto.randomUUID(),
    date: currentEditingDate,
    category, title, essentialUnderstanding, objectives, reason,
    quiz: pendingResources.quiz || [],
    powerpoint: pendingResources.powerpoint || [],
    notes: pendingResources.notes || [],
    task: pendingResources.task || [],
    videos: pendingResources.videos || []
  };
  const existingIndex = calendarItems.findIndex(x => x.id === item.id);
  if (existingIndex >= 0) { calendarItems[existingIndex] = item; } else { calendarItems.push(item); }
  try {
    await saveCalendarItem(item);
    closeItemPopout();
    renderCalendar();
  } catch (error) {
    console.error("Error saving item:", error);
    alert("Failed to save event to Supabase.");
  }
});

if (resourceSaveBtn) {
  resourceSaveBtn.addEventListener("click", async () => {
    const selectedType = document.querySelector("input[name='resType']:checked");
    const linkInput = document.getElementById("resourceLinkInput");
    const fileInput = document.getElementById("resourceFileInput");
    const altInput = document.getElementById("resourceAltInput");
    if (!selectedType || !currentResourceField) { closeResourcePopout(); return; }
    const type = selectedType.value;
    const linkValue = linkInput ? linkInput.value.trim() : "";
    const altText = altInput ? altInput.value.trim() : "";
    try {
      if (type === "link") {
        if (!linkValue) { closeResourcePopout(); return; }
        pendingResources[currentResourceField].push({ name: linkValue, path: null, type: "link", size: null, url: linkValue, altText });
      } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const uploadedFiles = await uploadResourceFiles(fileInput.files, currentResourceField, altText);
        pendingResources[currentResourceField].push(...uploadedFiles);
      }
      refreshResourcePreviews();
      if (linkInput) linkInput.value = "";
      if (fileInput) fileInput.value = "";
      if (altInput) altInput.value = "";
      const sfn = document.getElementById("selectedFileName");
      if (sfn) sfn.textContent = "";
      closeResourcePopout();
    } catch (err) {
      alert("Resource upload failed: " + err.message);
    }
  });
}

if (resourceCancelBtn) { resourceCancelBtn.addEventListener("click", closeResourcePopout); }

if (itemDeleteBtn) {
  itemDeleteBtn.addEventListener("click", async () => {
    if (!editingItemId) return;
    if (!confirm("Delete this calendar item?")) return;
    try {
      await deleteCalendarItem(editingItemId);
      const index = calendarItems.findIndex(item => item.id === editingItemId);
      if (index !== -1) calendarItems.splice(index, 1);
      editingItemId = null;
      closeItemPopout();
      renderCalendar();
      clearDetails();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete event from Supabase.");
    }
  });
}

itemCancelBtn.addEventListener("click", closeItemPopout);
itemCategory.addEventListener("change", () => renderCategoryFields(itemCategory.value));
monthSelect.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "resourceFileInput") {
    const sfn = document.getElementById("selectedFileName");
    if (sfn) sfn.textContent = e.target.files.length ? e.target.files[0].name : "";
  }
});

initMonthYear();
loadCalendarItems();
