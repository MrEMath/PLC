let calendarItems = [];

const STORAGE_BUCKET = "plc-files";
const SUPABASE_URL = "https://kegiqnqfexqrpvvnxzqh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2lxbnFmZXhxcnB2dm54enFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg0MzYsImV4cCI6MjA5NDc5NDQzNn0.l_Q89WwUInbzzhhLuvKW11sJlycR6yB_lHnyQxTV8Sw";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const calendarGrid = document.getElementById("calendarGrid");
const detailTitle = document.getElementById("detailTitle");
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
let pendingResources = { quiz: [], powerpoint: [], notes: [], task: [], videos: [], links: [] };

function resetPendingResources() {
  pendingResources = { quiz: [], powerpoint: [], notes: [], task: [], videos: [], links: [] };
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
  const detailEU = document.getElementById("detailEU");
  if (detailEU) detailEU.textContent = "";
  detailObjectives.innerHTML = "";
  detailQuiz.innerHTML = "";
  detailPpt.innerHTML = "";
  detailNotes.innerHTML = "";
  detailTasks.innerHTML = "";
  detailVideos.innerHTML = "";
  const dr = document.getElementById("detailReason");
  if (dr) dr.textContent = "";
  const dl = document.getElementById("detailLinks");
  if (dl) dl.innerHTML = "";
  const dt = document.getElementById("detailTopic");
  if (dt) dt.textContent = "";
}

async function saveCalendarItem(item) {
  const payload = {
    id: item.id,
    date: item.date,
    category: item.category || "",
    title: item.title || "",
    essential_understanding: item.essentialUnderstanding || "",
    objectives: item.objectives || "",
    quiz: item.quiz || null,
    powerpoint: item.powerpoint || null,
    notes: item.notes || null,
    task: item.task || null,
    videos: item.videos || null,
    links: item.links || null,
    reason: item.reason || ""
  };
  const { data, error } = await supabaseClient.from("calendar_items").upsert(payload).select();
  if (error) throw error;
  return data;
}

async function loadCalendarItems() {
  const { data, error } = await supabaseClient.from("calendar_items").select("*").order("date", { ascending: true });
  if (error) { console.error("Error loading:", error); return; }
  calendarItems = (data || []).map(row => ({
    id: row.id,
    date: row.date,
    category: row.category || "",
    title: row.title || "",
    essentialUnderstanding: row.essential_understanding || "",
    objectives: row.objectives || "",
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
    powerpoint: Array.isArray(row.powerpoint) ? row.powerpoint : [],
    notes: Array.isArray(row.notes) ? row.notes : [],
    task: Array.isArray(row.task) ? row.task : [],
    videos: Array.isArray(row.videos) ? row.videos : [],
    links: Array.isArray(row.links) ? row.links : [],
    reason: row.reason || ""
  }));
  renderCalendar();
}

async function deleteCalendarItem(itemId) {
  const { error } = await supabaseClient.from("calendar_items").delete().eq("id", itemId);
  if (error) throw error;
}

async function uploadResourceFiles(files, fieldName, altText = "") {
  const folderMap = { quiz: "quizzes", powerpoint: "powerpoints", notes: "notes", task: "tasks", videos: "videos", links: "links" };
  const folder = folderMap[fieldName] || "misc";
  const uploaded = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = folder + "/" + Date.now() + "-" + safeName;
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
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
  if (type === "link") {
    linkFields.style.display = "block";
    fileFields.style.display = "none";
  } else {
    linkFields.style.display = "none";
    fileFields.style.display = "block";
  }
}

function refreshResourcePreviews() {
  ["quiz","powerpoint","notes","task","videos","links"].forEach(field => {
    const container = document.getElementById(field + "Preview");
    if (!container) return;
    container.innerHTML = "";
    pendingResources[field].forEach((fileObj, index) => {
      const row = document.createElement("div");
      row.className = "attachment-row";
      const label = document.createElement("span");
      label.className = "attachment-label";
      label.textContent = fileObj.altText && fileObj.altText.trim()
        ? fileObj.altText
        : (fileObj.name || fileObj.url || "Resource");
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.className = "attachment-btn edit-btn";
      editBtn.addEventListener("click", () => openAttachmentEdit(field, index));
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "attachment-btn delete-btn";
      deleteBtn.addEventListener("click", () => {
        pendingResources[field].splice(index, 1);
        refreshResourcePreviews();
      });
      row.appendChild(label);
      row.appendChild(editBtn);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });
  });
}

let editingAttachmentField = null;
let editingAttachmentIndex = null;

function openAttachmentEdit(field, index) {
  editingAttachmentField = field;
  editingAttachmentIndex = index;
  const fileObj = pendingResources[field][index];
  const altInput = document.getElementById("attachmentAltInput");
  if (altInput) altInput.value = fileObj.altText || "";
  document.getElementById("attachmentEditModal").classList.remove("hidden");
}

function renderCategoryFields(category) {
  if (category === "Topic") {
    categoryFields.innerHTML =
      '<div class="field-group"><b>Title:</b><input type="text" id="fieldTitle"></div>' +
      '<div class="field-group"><b>Essential Understanding:</b><textarea id="fieldEU" rows="3"></textarea></div>' +
      '<div class="field-group"><b>Objectives (one per line):</b><textarea id="fieldObjectives" rows="3"></textarea></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Quiz:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'quiz\')">+</button></div><div id="quizPreview" class="resource-preview"></div></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">PowerPoint:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'powerpoint\')">+</button></div><div id="powerpointPreview" class="resource-preview"></div></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Notes:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'notes\')">+</button></div><div id="notesPreview" class="resource-preview"></div></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Task:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'task\')">+</button></div><div id="taskPreview" class="resource-preview"></div></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Videos:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'videos\')">+</button></div><div id="videosPreview" class="resource-preview"></div></div>';
    refreshResourcePreviews();
  } else if (category === "No Students" || category === "No School") {
    categoryFields.innerHTML =
      '<div class="field-group"><b>Reason:</b><input type="text" id="fieldReason"></div>';
  } else if (category === "Quiz") {
    categoryFields.innerHTML =
      '<div class="field-group"><b>Topic:</b><input type="text" id="fieldTitle"></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Links:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'links\')">+</button></div><div id="linksPreview" class="resource-preview"></div></div>';
    refreshResourcePreviews();
  } else if (category === "CPA" || category === "Benchmark" || category === "Diagnostic") {
    categoryFields.innerHTML =
      '<div class="field-group"><b>Title:</b><input type="text" id="fieldTitle"></div>' +
      '<div class="resource-section"><div class="resource-header"><span class="resource-label">Links:</span><button type="button" class="add-resource-btn" onclick="openResourcePopout(\'links\')">+</button></div><div id="linksPreview" class="resource-preview"></div></div>';
    refreshResourcePreviews();
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
    videos: Array.isArray(item.videos) ? [...item.videos] : [],
    links: Array.isArray(item.links) ? [...item.links] : []
  };
  itemDateDisplay.textContent = "Date: " + item.date;
  itemCategory.value = item.category || "Topic";
  renderCategoryFields(item.category || "Topic");
  if (itemDeleteBtn) itemDeleteBtn.style.display = "inline-block";
  itemModal.classList.remove("hidden");
  const titleEl = document.getElementById("fieldTitle");
  const euEl = document.getElementById("fieldEU");
  const objectiv
