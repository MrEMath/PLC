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

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const CATEGORY_COLORS = {
  "Topic": "#577590",
  "Quiz": "#F8961E",
  "No School": "#43AA8B",
  "No Students": "#90BE6D",
  "CPA": "#F3722C",
  "Benchmark": "#F94144",
  "Diagnostic": "#F9C74F"
};

let currentEditingDate = null;
let editingItemId = null;
let currentResourceField = null;

let pendingResources = {
  quiz: [],
  powerpoint: [],
  notes: [],
  task: [],
  videos: []
};

function resetPendingResources() {
  pendingResources = {
    quiz: [],
    powerpoint: [],
    notes: [],
    task: [],
    videos: []
  };
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
    reason: item.reason || ""
  };

  const { data, error } = await supabaseClient
    .from("calendar_items")
    .upsert(payload)
    .select();

  if (error) throw error;
  return data;
}

async function loadCalendarItems() {
  const { data, error } = await supabaseClient
    .from("calendar_items")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("Error loading calendar items:", error);
    return;
  }

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
    reason: row.reason || ""
  }));

  renderCalendar();
}

async function deleteCalendarItem(itemId) {
  const { error } = await supabaseClient
    .from("calendar_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

async function uploadResourceFiles(files, fieldName, altText = "") {
  const folderMap = {
    quiz: "quizzes",
    powerpoint: "powerpoints",
    notes: "notes",
    task: "tasks",
    videos: "videos"
  };

  const folder = folderMap[fieldName] || "misc";
  const uploaded = [];

  for (const file of files) {
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

    uploaded.push({
      name: file.name,
      path: data.path,
      type: file.type,
      size: file.size,
      url: null,
      altText
    });
  }

  return uploaded;
}

async function getSignedFileUrl(path) {
  const { data, error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

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
  const quizPreview = document.getElementById("quizPreview");
  const powerpointPreview = document.getElementById("powerpointPreview");
  const notesPreview = document.getElementById("notesPreview");
  const taskPreview = document.getElementById("taskPreview");
  const videosPreview = document.getElementById("videosPreview");

  if (quizPreview) quizPreview.textContent = pendingResources.quiz.length ? `${pendingResources.quiz.length} added` : "";
  if (powerpointPreview) powerpointPreview.textContent = pendingResources.powerpoint.length ? `${pendingResources.powerpoint.length} added` : "";
  if (notesPreview) notesPreview.textContent = pendingResources.notes.length ? `${pendingResources.notes.length} added` : "";
  if (taskPreview) taskPreview.textContent = pendingResources.task.length ? `${pendingResources.task.length} added` : "";
  if (videosPreview) videosPreview.textContent = pendingResources.videos.length ? `${pendingResources.videos.length} added` : "";
}

function renderCategoryFields(category) {
  if (category === "Topic") {
    categoryFields.innerHTML = `
      abel>Title: <input type="text" id="fieldTitle"></label>
      abel>Essential Understanding: <textarea id="fieldEU" rows="3"></textarea></label>
      abel>Objectives (one per line): <textarea id="fieldObjectives" rows="4"></textarea></label>
      <div class="resourceRow"><span>Quiz:</span><button type="button" onclick="openResourcePopout('quiz')">+</button><span id="quizPreview"></span></div>
      <div class="resourceRow"><span>PowerPoint:</span><button type="button" onclick="openResourcePopout('powerpoint')">+</button><span id="powerpointPreview"></span></div>
      <div class="resourceRow"><span>Notes:</span><button type="button" onclick="openResourcePopout('notes')">+</button><span id="notesPreview"></span></div>
      <div class="resourceRow"><span>Task:</span><button type="button" onclick="openResourcePopout('task')">+</button><span id="taskPreview"></span></div>
      <div class="resourceRow"><span>Videos:</span><button type="button" onclick="openResourcePopout('videos')">+</button><span id="videosPreview"></span></div>
    `;
    refreshResourcePreviews();
  } else if (category === "No Students") {
    categoryFields.innerHTML = `
      abel>Reason: <textarea id="fieldReason" rows="3"></textarea></label>
    `;
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
    quiz: Array.isArray(item.quiz) ? [...item.quiz] : [],
    powerpoint: Array.isArray(item.powerpoint) ? [...item.powerpoint] : [],
    notes: Array.isArray(item.notes) ? [...item.notes] : [],
    task: Array.isArray(item.task) ? [...item.task] : [],
    videos: Array.isArray(item.videos) ? [...item.videos] : []
  };

  itemDateDisplay.textContent = `Date: ${item.date}`;
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

  detailTitle.textContent = item.title || "";
  detailEU.textContent = item.essentialUnderstanding || "";

  const detailReasonRow = document.getElementById("detailReasonRow");
  const detailReason = document.getElementById("detailReason");
  if (item.category === "No Students") {
    if (detailReasonRow) detailReasonRow.style.display = "block";
    if (detailReason) detailReason.textContent = item.reason || "";
  } else {
    if (detailReasonRow) detailReasonRow.style.display = "none";
    if (detailReason) detailReason.textContent = "";
  }

  if (item.objectives) {
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
        a.textContent = fileObj.altText?.
