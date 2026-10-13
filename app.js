const STORE_KEY = "medhist_static_data_v1";
const USER_KEY = "midhist_user";
const ATTACHMENT_DB = "medhist_static_attachments";
const SAMPLE_DATA_VERSION = 1;

const sampleRecords = [
  { title: "Fictional Cardiac Report Layout", category: "Cardiac", doctor: "Dr. Mira Sample (fictional)", notes: "Invented example text used only to preview this report card. No real test, result, or diagnosis is represented.", date: "2026-10-03", fileName: "sample-cardiac-report.pdf" },
  { title: "Fictional HbA1c Example — 5.7%", category: "Sugar", doctor: "Dr. Arif Example (fictional)", notes: "Invented demonstration values only: simulated HbA1c 5.7% and fasting glucose 92 mg/dL. These are not measurements and cannot be used for diagnosis.", date: "2026-10-06", fileName: "sample-glucose-report.pdf" },
  { title: "Fictional Blood Pressure Report", category: "BP", doctor: "Dr. Nila Fiction (fictional)", notes: "Invented example only. See the separate labeled graph for simulated blood pressure values; no real person was measured.", date: "2026-10-09", fileName: "sample-blood-pressure-report.pdf" },
  { title: "Fictional Knee Imaging Summary", category: "Ortho", doctor: "Dr. Rohan Demo (fictional)", notes: "Invented text for a sample orthopedic report layout. No scan or examination took place.", date: "2026-10-12", fileName: "sample-knee-report.pdf" },
  { title: "Fictional Respiratory Visit Summary", category: "General", doctor: "Dr. Sana Example (fictional)", notes: "Placeholder report content for demonstrating a general-health category. It does not describe a real visit or provide treatment guidance.", date: "2026-10-13", fileName: "sample-respiratory-summary.pdf" },
  { title: "Fictional Wellness Snapshot", category: "General", doctor: "Dr. Mira Sample (fictional)", notes: "Fictional sample record for layout demonstration. All details are invented and are not personal health data.", date: "2026-10-13", fileName: "sample-wellness-snapshot.pdf" }
];

const sampleMedicines = [
  { name: "CardioSample-A (fictional)", condition: "Cardiac", status: "active", dosage: "Placeholder only — not a real medicine; no dose.", doctor: "Dr. Mira Sample (fictional)" },
  { name: "GlucoSample-B (fictional)", condition: "Sugar", status: "active", dosage: "Placeholder only — not a real medicine; no dose.", doctor: "Dr. Arif Example (fictional)" },
  { name: "PressureSample-C (fictional)", condition: "BP", status: "active", dosage: "Placeholder only — not a real medicine; no dose.", doctor: "Dr. Nila Fiction (fictional)" },
  { name: "JointSample-D (fictional)", condition: "Ortho", status: "active", dosage: "Placeholder only — not a real medicine; no dose.", doctor: "Dr. Rohan Demo (fictional)" },
  { name: "RespiraSample-E (fictional)", condition: "General", status: "active", dosage: "Placeholder only — not a real medicine; no dose.", doctor: "Dr. Sana Example (fictional)" }
];

const sampleHealthCharts = [
  {
    id: "bpSampleChart", title: "Fictional blood pressure example", unit: "mmHg", min: 60, max: 140,
    labels: ["Oct 03", "Oct 05", "Oct 07", "Oct 09", "Oct 11", "Oct 13"],
    series: [
      { label: "Systolic", color: "#b91c1c", values: [118, 124, 121, 116, 126, 120] },
      { label: "Diastolic", color: "#0369a1", values: [76, 80, 78, 74, 82, 77] }
    ]
  },
  {
    id: "glucoseSampleChart", title: "Fictional fasting glucose example", unit: "mg/dL", min: 60, max: 160,
    labels: ["Oct 03", "Oct 05", "Oct 07", "Oct 09", "Oct 11", "Oct 13"],
    series: [{ label: "Glucose", color: "#b45309", values: [92, 101, 96, 105, 98, 94] }]
  },
  {
    id: "a1cSampleChart", title: "Fictional HbA1c example", unit: "%", min: 4, max: 9,
    labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    series: [{ label: "HbA1c", color: "#7c3aed", values: [5.5, 5.7, 5.6, 5.8, 5.7, 5.6] }]
  },
  {
    id: "pulseSampleChart", title: "Fictional resting pulse example", unit: "bpm", min: 50, max: 110,
    labels: ["Oct 03", "Oct 05", "Oct 07", "Oct 09", "Oct 11", "Oct 13"],
    series: [{ label: "Pulse", color: "#0f766e", values: [72, 75, 73, 78, 74, 71] }]
  }
];

let currentUser = null;
let dataStore;
let recordsList = [];
let medsList = [];
const elementCache = new Map();

function getElement(id) {
  if (!id) return null;
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    dataStore = {
      records: [],
      medicines: [],
      nextRecordId: 1,
      nextMedicineId: 1
    };
  } else {
    dataStore = JSON.parse(saved);
    if (!Array.isArray(dataStore.records) || !Array.isArray(dataStore.medicines)) {
      throw new Error("Saved MedHist data is invalid. Clear this site's storage and reload.");
    }
  }

  const legacyRecordTitles = new Set([
    "False X-Ray Scan Report", "False Cardiac Health Report", "False Sugar Pressure Summary",
    "Ambulatory Blood Pressure", "2D Echocardiogram", "HbA1c & Fasting Glucose", "Right Knee Joint X-Ray"
  ]);
  const legacyMedicineNames = new Set([
    "False Sugar Pressure Tablet", "Fake Cardiatic Control Tablet", "Demo Sugar Balance Tablet",
    "Telmisartan 40mg", "Metformin 500mg", "Glimepiride 1mg", "Atorvastatin 10mg"
  ]);
  if ((Number(dataStore.sampleCleanupVersion) || 0) < 1) {
    dataStore.records = dataStore.records.filter(record => !record.isSample && !legacyRecordTitles.has(record.title));
    dataStore.medicines = dataStore.medicines.filter(medicine => !medicine.isSample && !legacyMedicineNames.has(medicine.name));
    dataStore.sampleCleanupVersion = 1;
  }
  dataStore.nextRecordId = Math.max(1, Number(dataStore.nextRecordId) || 1, ...dataStore.records.map(record => (Number(record.id) || 0) + 1));
  dataStore.nextMedicineId = Math.max(1, Number(dataStore.nextMedicineId) || 1, ...dataStore.medicines.map(medicine => (Number(medicine.id) || 0) + 1));

  if ((Number(dataStore.sampleDataVersion) || 0) < SAMPLE_DATA_VERSION) {
    for (const record of sampleRecords) {
      dataStore.records.push({ ...record, id: dataStore.nextRecordId++, isSample: true });
    }
    for (const medicine of sampleMedicines) {
      dataStore.medicines.push({ ...medicine, id: dataStore.nextMedicineId++, isSample: true });
    }
    dataStore.sampleDataVersion = SAMPLE_DATA_VERSION;
  }

  saveStore();
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(dataStore));
    return true;
  } catch (error) {
    console.error("Unable to save MedHist data in this browser.", error);
    alert("MedHist could not save data in this browser. Browser storage may be full or disabled.");
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    loadStore();
  } catch (error) {
    alert(error.message);
    return;
  }

  try {
    const savedUser = JSON.parse(localStorage.getItem(USER_KEY));
    if (savedUser?.isLoggedIn && savedUser?.id === "MH-LOCAL-0001") currentUser = savedUser;
  } catch (error) {
    console.warn("Clearing invalid saved MedHist session.", error);
    localStorage.removeItem(USER_KEY);
  }

  const dateInput = getElement("recDate");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  const loginModal = getElement("loginModal");
  if (loginModal) loginModal.classList.remove("open");

  updateUserDisplay();
  setAppView(Boolean(currentUser));
  if (currentUser) refreshDashboard();
  if (window.lucide) lucide.createIcons();
});

function refreshDashboard() {
  recordsList = [...dataStore.records].sort((a, b) => b.date.localeCompare(a.date));
  medsList = dataStore.medicines;

  requestAnimationFrame(() => {
    renderRecords(recordsList, "recordsContainer");
    updateCounts();
    renderMeds();
    renderSampleHealthCharts();
  });
}

function setAppView(isAuthenticated) {
  document.body.classList.toggle("is-authenticated", Boolean(isAuthenticated));
  const dashboard = getElement("dashboardApp");
  const home = getElement("homePage");
  if (dashboard) dashboard.setAttribute("aria-hidden", String(!isAuthenticated));
  if (home) home.setAttribute("aria-hidden", String(Boolean(isAuthenticated)));
  const headerActions = document.querySelector(".nav-actions");
  if (headerActions) headerActions.classList.toggle("guest-mode", !isAuthenticated);
  if (window.lucide) lucide.createIcons();
}

function requireLogin() {
  if (currentUser) return true;
  const loginModal = getElement("loginModal");
  if (loginModal) loginModal.classList.add("open");
  return false;
}

function openModal(id) {
  const target = getElement(id);
  const loginModal = getElement("loginModal");

  if (id !== "loginModal" && !currentUser) {
    if (loginModal) loginModal.classList.add("open");
    return;
  }

  if (target) {
    target.classList.add("open");
    if (window.lucide) lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = getElement(id);
  if (modal) modal.classList.remove("open");
}

function switchTab(tabId, button) {
  if (!requireLogin()) return;
  document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  document.getElementById(`tab-${tabId}`)?.classList.add("active");
  const categories = {
    "cardiac-view": ["Cardiac", "cardiacSpecialGrid"],
    "sugar-view": ["Sugar", "sugarSpecialGrid"],
    "bp-view": ["BP", "bpSpecialGrid"],
    "ortho-view": ["Ortho", "orthoSpecialGrid"]
  };
  if (categories[tabId]) renderCategoryTo(...categories[tabId]);
}

function getBadge(category) {
  const badges = {
    Cardiac: '<span class="badge badge-cardiac"><i data-lucide="heart"></i> Cardiac</span>',
    Sugar: '<span class="badge badge-sugar"><i data-lucide="activity"></i> Sugar</span>',
    BP: '<span class="badge badge-bp"><i data-lucide="gauge"></i> BP</span>',
    Ortho: '<span class="badge badge-ortho"><i data-lucide="bone"></i> Orthopedic</span>'
  };
  return badges[category] || '<span class="badge badge-general">General</span>';
}

function renderRecords(items, containerId) {
  const container = getElement(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--slate-400);">No records saved in this section.</div>';
    return;
  }
  container.innerHTML = items.map(record => `
    <article class="record-card">
      <div>
        <div class="record-header">
          <h4 class="record-title">${escapeHtml(record.title)}</h4>
          ${getBadge(record.category)}
        </div>
        ${record.isSample ? '<span class="sample-tag">FICTIONAL SAMPLE</span>' : ""}
        <div style="font-size:0.8rem;color:var(--slate-600);margin:0.25rem 0;">
          <i data-lucide="user-check" style="width:14px;display:inline;"></i> ${escapeHtml(record.doctor || "Self Log")}
        </div>
        <p class="record-details">${escapeHtml(record.notes || "No doctor commentary provided.")}</p>
      </div>
      <div>
        <button class="btn btn-outline" onclick="downloadReportPdf(${record.id})" style="display:inline-flex;margin-bottom:0.5rem;">
          <i data-lucide="download" style="width:14px;"></i> Read / Download PDF
        </button>
        ${record.fileName ? `<div style="font-size:0.75rem;color:var(--slate-600);margin-bottom:0.4rem;">Attachment name: ${escapeHtml(record.fileName)} (demo filename only)</div>` : ""}
        <div class="record-footer">
          <span>Date: ${escapeHtml(record.date)}</span>
          <button class="btn btn-danger" style="padding:0.25rem 0.6rem;" onclick="deleteRecordItem(${record.id})" aria-label="Delete ${escapeHtml(record.title)}">
            <i data-lucide="trash-2" style="width:12px;"></i>
          </button>
        </div>
      </div>
    </article>
  `).join("");
  lucide.createIcons();
}

function loadRecords(category = "all") {
  if (!requireLogin()) return;
  recordsList = [...dataStore.records].sort((a, b) => b.date.localeCompare(a.date));
  const visibleRecords = category === "all"
    ? recordsList
    : recordsList.filter(record => record.category === category);
  renderRecords(visibleRecords, "recordsContainer");
  updateCounts();
}

function renderCategoryTo(category, containerId) {
  renderRecords(recordsList.filter(record => record.category === category), containerId);
}

function filterRecords(category, button) {
  document.querySelectorAll("#filterPills .chip-btn").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  loadRecords(category);
}

function filterByCategory(category) {
  const allRecordsButton = document.querySelector(".tab-btn");
  switchTab("all-records", allRecordsButton);
  const chip = [...document.querySelectorAll("#filterPills .chip-btn")]
    .find(button => button.textContent.toLowerCase().includes(category.toLowerCase()));
  if (chip) chip.click();
}

function deleteRecordItem(id) {
  if (!requireLogin() || !confirm("Delete this record from your vault?")) return;
  dataStore.records = dataStore.records.filter(record => record.id !== id);
  if (saveStore()) refreshDashboard();
}

function renderMeds() {
  const activeContainer = getElement("activeMedsContainer");
  const pastContainer = getElement("pastMedsContainer");
  if (!activeContainer || !pastContainer) return;
  const active = medsList.filter(medicine => medicine.status === "active");
  const past = medsList.filter(medicine => medicine.status === "past");
  activeContainer.innerHTML = active.length ? active.map(medicine => `
    <div class="med-item">
      <div>
        <div style="font-weight:700;">${escapeHtml(medicine.name)}</div>
        ${medicine.isSample ? '<span class="sample-tag">FICTIONAL PLACEHOLDER — NOT MEDICINE</span>' : ""}
        <div style="font-size:0.8rem;color:var(--slate-600);">${escapeHtml(medicine.condition)} | ${escapeHtml(medicine.dosage)}</div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <button class="btn btn-outline" title="Archive to past" style="padding:0.4rem;" onclick="toggleMedStatus(${medicine.id}, 'past')"><i data-lucide="archive" style="width:14px;"></i></button>
        <button class="btn btn-danger" title="Delete" style="padding:0.4rem;" onclick="deleteMedItem(${medicine.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
      </div>
    </div>`).join("") : '<p style="font-size:0.85rem;color:var(--slate-400);">No active medicines logged.</p>';
  pastContainer.innerHTML = past.length ? past.map(medicine => `
    <div class="med-item" style="opacity:0.85;">
      <div>
        <div style="font-weight:700;">${escapeHtml(medicine.name)}</div>
        ${medicine.isSample ? '<span class="sample-tag">FICTIONAL PLACEHOLDER — NOT MEDICINE</span>' : ""}
        <div style="font-size:0.8rem;color:var(--slate-600);">Past Condition: ${escapeHtml(medicine.condition)} | ${escapeHtml(medicine.dosage)}</div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <button class="btn btn-outline" title="Reactivate" style="padding:0.4rem;" onclick="toggleMedStatus(${medicine.id}, 'active')"><i data-lucide="rotate-ccw" style="width:14px;"></i></button>
        <button class="btn btn-danger" title="Delete" style="padding:0.4rem;" onclick="deleteMedItem(${medicine.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
      </div>
    </div>`).join("") : '<p style="font-size:0.85rem;color:var(--slate-400);">No past illness medications recorded.</p>';
  lucide.createIcons();
}

function toggleMedStatus(id, status) {
  if (!requireLogin()) return;
  const medicine = dataStore.medicines.find(item => item.id === id);
  if (!medicine) return;
  medicine.status = status;
  if (saveStore()) refreshDashboard();
}

function deleteMedItem(id) {
  if (!requireLogin() || !confirm("Delete this medication?")) return;
  dataStore.medicines = dataStore.medicines.filter(medicine => medicine.id !== id);
  if (saveStore()) refreshDashboard();
}

function handleUploadSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const fileInput = getElement("fileInput");
  const recTitle = getElement("recTitle");
  const recCategory = getElement("recCategory");
  const recDoctor = getElement("recDoctor");
  const recNotes = getElement("recNotes");
  const recDate = getElement("recDate");
  const selectedFileName = getElement("selectedFileName");

  const file = fileInput?.files?.[0];
  const record = {
    id: dataStore.nextRecordId++,
    title: recTitle?.value.trim() || "",
    category: recCategory?.value || "General",
    doctor: recDoctor?.value.trim() || "",
    notes: recNotes?.value.trim() || "",
    date: recDate?.value || new Date().toISOString().slice(0, 10),
    fileName: file?.name || ""
  };

  dataStore.records.push(record);
  if (!saveStore()) return;
  closeModal("uploadModal");
  event.target.reset();
  if (selectedFileName) selectedFileName.textContent = "";
  if (recDate) recDate.value = new Date().toISOString().slice(0, 10);
  refreshDashboard();
}

function handleFileSelected(input) {
  const file = input.files?.[0];
  const selectedFileName = getElement("selectedFileName");
  if (selectedFileName) {
    selectedFileName.textContent = file
      ? `Selected: ${file.name} (name only; the file itself is not uploaded)`
      : "";
  }
}

function handleMedSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const medName = getElement("medName");
  const medCondition = getElement("medCondition");
  const medStatus = getElement("medStatus");
  const medDosage = getElement("medDosage");
  const medDoc = getElement("medDoc");

  dataStore.medicines.push({
    id: dataStore.nextMedicineId++,
    name: medName?.value.trim() || "",
    condition: medCondition?.value || "General",
    status: medStatus?.value || "active",
    dosage: medDosage?.value.trim() || "",
    doctor: medDoc?.value.trim() || ""
  });

  if (!saveStore()) return;
  closeModal("addMedModal");
  event.target.reset();
  refreshDashboard();
}

function updateCounts() {
  for (const [category, id] of [["Cardiac", "cardiacCount"], ["Sugar", "sugarCount"], ["BP", "bpCount"], ["Ortho", "orthoCount"]]) {
    const count = recordsList.filter(record => record.category === category).length;
    const countNode = getElement(id);
    if (countNode) countNode.textContent = `${count} ${count === 1 ? "Record" : "Records"}`;
  }
}

function renderSampleHealthCharts() {
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 24, bottom: 42, left: 48 };

  for (const config of sampleHealthCharts) {
    const chart = getElement(config.id);
    if (!chart) continue;

    const x = index => padding.left + index * (width - padding.left - padding.right) / (config.labels.length - 1);
    const y = value => padding.top + (config.max - value) * (height - padding.top - padding.bottom) / (config.max - config.min);
    const step = (config.max - config.min) / 4;
    const ticks = Array.from({ length: 5 }, (_, index) => config.min + index * step);
    const grid = ticks.map(value => `
      <g>
        <line x1="${padding.left}" y1="${y(value)}" x2="${width - padding.right}" y2="${y(value)}" class="chart-gridline"></line>
        <text x="${padding.left - 8}" y="${y(value) + 4}" text-anchor="end" class="chart-axis-label">${Number.isInteger(value) ? value : value.toFixed(1)}</text>
      </g>`).join("");
    const labels = config.labels.map((label, index) => `
      <text x="${x(index)}" y="${height - 12}" text-anchor="middle" class="chart-axis-label">${label}</text>`).join("");
    const seriesLines = config.series.map(series => {
      const points = series.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
      const circles = series.values.map((value, index) => `
        <circle cx="${x(index)}" cy="${y(value)}" r="4" class="chart-point" style="fill:${series.color}">
          <title>${config.labels[index]}: fictional ${series.label.toLowerCase()} ${value} ${config.unit}</title>
        </circle>`).join("");
      return `<polyline points="${points}" class="chart-line" style="stroke:${series.color}"></polyline>${circles}`;
    }).join("");
    const tableHead = config.series.map(series => `<th scope="col">${series.label} (${config.unit})</th>`).join("");
    const tableRows = config.labels.map((label, index) => `
      <tr><th scope="row">${label}</th>${config.series.map(series => `<td>${series.values[index]} ${config.unit}</td>`).join("")}</tr>`).join("");

    chart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${config.id}-title ${config.id}-description">
        <title id="${config.id}-title">${config.title}</title>
        <desc id="${config.id}-description">Invented example values for demonstration only, not measurements of a real person.</desc>
        ${grid}${seriesLines}${labels}
      </svg>
      <div class="chart-legend" aria-hidden="true">
        ${config.series.map(series => `<span><i class="legend-dot" style="background:${series.color}"></i> ${series.label} (${config.unit})</span>`).join("")}
      </div>
      <div class="chart-table-wrap">
        <table class="chart-data-table">
          <caption>${config.title} — fictional example values</caption>
          <thead><tr><th scope="col">Date</th>${tableHead}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const loginMessage = getElement("loginMessage");
  const authEmail = getElement("authEmail");
  const authPin = getElement("authPin");
  const authName = getElement("authName");
  const authRole = getElement("authRole");

  const email = authEmail?.value.trim().toLowerCase() || "";
  const password = authPin?.value || "";

  if (email !== "demo@example.com" || password !== "pass123") {
    if (loginMessage) {
      loginMessage.textContent = "Demo sign-in only: use demo@example.com and pass123.";
      loginMessage.style.color = "var(--danger)";
    }
    return;
  }

  currentUser = {
    id: "MH-LOCAL-0001",
    name: authName?.value.trim() || "Sk Anisur Rahaman",
    email,
    role: authRole?.value || "patient",
    isLoggedIn: true
  };

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  } catch (error) {
    console.warn("Unable to persist MedHist login state.", error);
  }

  updateUserDisplay();
  closeModal("loginModal");
  setAppView(true);
  refreshDashboard();
}

function handleAuthClick() {
  if (!currentUser) {
    openModal("loginModal");
    return;
  }
  if (confirm(`Log out ${currentUser.name}?`)) {
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    updateUserDisplay();
    setAppView(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateUserDisplay() {
  const name = currentUser?.name || "Sk Anisur Rahaman";
  const patientNameDisplay = getElement("patientNameDisplay");
  const patientIdDisplay = getElement("patientIdDisplay");
  const avatarLetter = getElement("avatarLetter");
  const authBtnText = getElement("authBtnText");

  if (patientNameDisplay) patientNameDisplay.textContent = name;
  if (patientIdDisplay) patientIdDisplay.textContent = currentUser?.id || "Not signed in";
  if (avatarLetter) avatarLetter.textContent = name.charAt(0).toUpperCase();
  if (authBtnText) authBtnText.textContent = currentUser ? "Logout" : "Login";
}

function pdfEscape(text) {
  return String(text).normalize("NFKD").replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function downloadReportPdf(id) {
  if (!requireLogin()) return;
  const report = dataStore.records.find(record => record.id === id);
  if (!report) {
    alert("This report no longer exists.");
    return;
  }
  const wrapText = (text, maxLength = 78) => {
    const output = [];
    let line = "";
    for (const word of String(text).split(/\s+/)) {
      if (line && `${line} ${word}`.length > maxLength) {
        output.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) output.push(line);
    return output;
  };
  const lines = [
    ["MedHist - Report", 18],
    ...(report.isSample ? [["FICTIONAL SAMPLE - NOT REAL MEDICAL DATA", 14]] : []),
    ...(report.isSample ? [["Invented example only. Not for diagnosis, treatment, or medication decisions.", 10]] : []),
    ["", 10],
    ...wrapText(`Report: ${report.title}`).map(text => [text, 12]),
    ...wrapText(`Category: ${report.category}`).map(text => [text, 11]),
    ...wrapText(`Date: ${report.date}`).map(text => [text, 11]),
    ...wrapText(`Provider: ${report.doctor || "Not specified"}`).map(text => [text, 11]),
    ["", 10],
    ["Notes:", 12],
    ...wrapText(report.notes || "No notes provided.").map(text => [text, 11])
  ];
  const pages = [];
  for (let offset = 0; offset < lines.length; offset += 34) pages.push(lines.slice(offset, offset + 34));
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  const objects = new Array(3 + pages.length * 2);
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    const commands = [];
    let y = 750;
    for (const [text, size] of pageLines) {
      if (text) commands.push(`BT /F1 ${size} Tf 50 ${y} Td (${pdfEscape(text)}) Tj ET`);
      y -= size >= 14 ? 25 : 19;
    }
    const stream = commands.join("\n");
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  link.download = `medhist-report-${id}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function generateConsultSummary() {
  if (!requireLogin()) return;

  const summaryContent = getElement("summaryContent");
  if (!summaryContent) return;

  const activeMeds = medsList.filter(medicine => medicine.status === "active");
  const pastMeds = medsList.filter(medicine => medicine.status === "past");
  const countFor = category => recordsList.filter(record => record.category === category).length;
  summaryContent.innerHTML = `
    <h3 style="margin-bottom:0.5rem;">MedHist Consultation Brief</h3>
    <p style="font-size:0.8rem;color:var(--slate-600);margin-bottom:1rem;">Patient: <strong>${escapeHtml(currentUser.name)}</strong> | ID: <strong>${escapeHtml(currentUser.id)}</strong></p>
    <h4 style="color:var(--primary);margin-top:0.75rem;">1. Saved Records by Category</h4>
    <ul style="padding-left:1.25rem;">
      <li><strong>Cardiac:</strong> ${countFor("Cardiac")} records saved</li>
      <li><strong>Blood Sugar:</strong> ${countFor("Sugar")} records saved</li>
      <li><strong>Blood Pressure:</strong> ${countFor("BP")} records saved</li>
      <li><strong>Orthopedic:</strong> ${countFor("Ortho")} records saved</li>
    </ul>
    <h4 style="color:var(--primary);margin-top:0.75rem;">2. Active Medication Entries</h4>
    <ul style="padding-left:1.25rem;">${activeMeds.length ? activeMeds.map(m => `<li><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.condition)}) — ${escapeHtml(m.dosage)}</li>`).join("") : "<li>None</li>"}</ul>
    <h4 style="color:var(--primary);margin-top:0.75rem;">3. Past Medication Entries</h4>
    <ul style="padding-left:1.25rem;">${pastMeds.length ? pastMeds.map(m => `<li><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.condition)}) — ${escapeHtml(m.dosage)}</li>`).join("") : "<li>None</li>"}</ul>
    <p><strong>Sample graphs and clinician names elsewhere on this page are fictional examples, not medical advice.</strong></p>`;
  openModal("summaryModal");
}
