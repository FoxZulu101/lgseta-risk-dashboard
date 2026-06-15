const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, "data", "dashboardData.json");
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function readDashboardData() {
  const rawData = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(rawData);
}

function writeDashboardData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ─── MULTER SETUP ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  const allowed = [".xlsx", ".xls", ".csv"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only Excel and CSV files are allowed"));
}});

// ─── BASIC ROUTES ────────────────────────────────────────────────
app.get("/", (req, res) => res.send("LGSETA BJMAPEX GRC Intelligence Center — Backend Running"));

app.get("/api/dashboard", (req, res) => {
  try { res.json(readDashboardData()); }
  catch (e) { res.status(500).json({ message: "Failed to load data", error: e.message }); }
});

app.get("/api/risks", (req, res) => {
  try { res.json(readDashboardData().risks || []); }
  catch (e) { res.status(500).json({ message: "Failed to load risks", error: e.message }); }
});

app.get("/api/kris", (req, res) => {
  try { res.json(readDashboardData().kris || []); }
  catch (e) { res.status(500).json({ message: "Failed to load KRIs", error: e.message }); }
});

app.get("/api/treatments", (req, res) => {
  try { res.json(readDashboardData().treatmentActions || []); }
  catch (e) { res.status(500).json({ message: "Failed to load treatments", error: e.message }); }
});

app.get("/api/opportunities", (req, res) => {
  try { res.json(readDashboardData().opportunityRisks || []); }
  catch (e) { res.status(500).json({ message: "Failed to load opportunities", error: e.message }); }
});

app.get("/api/appetite", (req, res) => {
  try { res.json(readDashboardData().appetiteDashboard || []); }
  catch (e) { res.status(500).json({ message: "Failed to load appetite", error: e.message }); }
});

// ─── UPDATE ROUTES ───────────────────────────────────────────────
app.put("/api/dashboard", (req, res) => {
  try { writeDashboardData(req.body); res.json({ message: "Dashboard updated successfully" }); }
  catch (e) { res.status(500).json({ message: "Failed to update", error: e.message }); }
});

// Update a single risk
app.put("/api/risks/:id", (req, res) => {
  try {
    const data = readDashboardData();
    const idx = data.risks.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Risk not found" });
    data.risks[idx] = { ...data.risks[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeDashboardData(data);
    res.json({ message: "Risk updated", risk: data.risks[idx] });
  } catch (e) { res.status(500).json({ message: "Failed to update risk", error: e.message }); }
});

// Add a new risk
app.post("/api/risks", (req, res) => {
  try {
    const data = readDashboardData();
    const newRisk = { ...req.body, createdAt: new Date().toISOString() };
    data.risks.push(newRisk);
    data.summary.totalRisks = data.risks.length;
    writeDashboardData(data);
    res.json({ message: "Risk added", risk: newRisk });
  } catch (e) { res.status(500).json({ message: "Failed to add risk", error: e.message }); }
});

// Delete a risk
app.delete("/api/risks/:id", (req, res) => {
  try {
    const data = readDashboardData();
    data.risks = data.risks.filter(r => r.id !== req.params.id);
    data.summary.totalRisks = data.risks.length;
    writeDashboardData(data);
    res.json({ message: "Risk deleted" });
  } catch (e) { res.status(500).json({ message: "Failed to delete risk", error: e.message }); }
});

// Update a treatment action
app.put("/api/treatments/:id", (req, res) => {
  try {
    const data = readDashboardData();
    const idx = data.treatmentActions.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Treatment not found" });
    data.treatmentActions[idx] = { ...data.treatmentActions[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeDashboardData(data);
    res.json({ message: "Treatment updated", treatment: data.treatmentActions[idx] });
  } catch (e) { res.status(500).json({ message: "Failed to update treatment", error: e.message }); }
});

// Update a KRI
app.put("/api/kris/:id", (req, res) => {
  try {
    const data = readDashboardData();
    const idx = data.kris.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "KRI not found" });
    data.kris[idx] = { ...data.kris[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeDashboardData(data);
    res.json({ message: "KRI updated", kri: data.kris[idx] });
  } catch (e) { res.status(500).json({ message: "Failed to update KRI", error: e.message }); }
});

// Update BCM incident
app.post("/api/bcm/incidents", (req, res) => {
  try {
    const data = readDashboardData();
    const newIncident = { ...req.body, createdAt: new Date().toISOString() };
    data.bcmResilience.incidents.push(newIncident);
    writeDashboardData(data);
    res.json({ message: "Incident added", incident: newIncident });
  } catch (e) { res.status(500).json({ message: "Failed to add incident", error: e.message }); }
});

// Update reporting period
app.put("/api/period", (req, res) => {
  try {
    const data = readDashboardData();
    data.reportingPeriod = { ...data.reportingPeriod, ...req.body };
    writeDashboardData(data);
    res.json({ message: "Reporting period updated", period: data.reportingPeriod });
  } catch (e) { res.status(500).json({ message: "Failed to update period", error: e.message }); }
});

// ─── EXCEL UPLOAD ROUTES ─────────────────────────────────────────

// Download Excel template
app.get("/api/templates/:type", (req, res) => {
  const type = req.params.type;
  const templates = {
    risks: {
      headers: ["id","title","category","description","inherentRating","residualRating","currentRating","targetRating","currentStatus","previousStatus","appetite","tolerance","owner","department","controlEffectiveness","trend","treatmentAction","cause","consequence","response","reviewDate","assuranceProvider"],
      sample: ["SR-009","Example Risk Title","Strategic Risk","Description of the risk",20,15,15,8,"Red","Amber","Low","Outside Tolerance","CEO","Office of the CEO","Partially Effective","stable","Treatment action description","Root cause","Consequence description","Treat","2026-09-30","Internal Audit"]
    },
    treatments: {
      headers: ["id","riskId","action","owner","ownerInitials","dueDate","status","priority","progress","budget"],
      sample: ["TA-008","SR-001","Treatment action description","Risk Owner","RO","2026-09-30","In Progress","High",50,100000]
    },
    kris: {
      headers: ["id","indicator","linkedRisk","category","greenThreshold","amberThreshold","redThreshold","currentPeriodValue","previousPeriodValue","currentStatus","previousStatus","trend","target"],
      sample: ["KRI-009","KRI Indicator Name","SR-001","Strategic Performance","95%-100%","85%-94%","Below 85%","88%","82%","Amber","Red","Improving","95%"]
    },
    incidents: {
      headers: ["id","title","date","type","affectedUnit","affectedService","severity","startTime","endTime","duration","rtoBreached","rpoBreached","impact","actionsTaken","escalatedTo","lessonsLearned","status"],
      sample: ["INC-004","Incident Title","2026-06-14","ICT System Outage","All Departments","Core Services","High","08:00","12:00","4 hours","Yes","No","Impact description","Actions taken","CIO","Lessons learned","Open"]
    },
    uifw: {
      headers: ["id","type","description","amount","department","dateIdentified","status","responsibleOfficer","condoned","recoverable","referredTo"],
      sample: ["UIFW-008","Irregular","Description of UIFW","500000","Finance","2026-06-14","Open","Finance Manager","false","true","Internal Audit"]
    }
  };

  const template = templates[type];
  if (!template) return res.status(404).json({ message: "Template type not found" });

  const wb = XLSX.utils.book_new();
  const wsData = [template.headers, template.sample];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row width
  ws["!cols"] = template.headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename=LGSETA_${type}_template.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
});

// Upload and process Excel file
app.post("/api/upload/:type", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });

    const data = readDashboardData();
    const type = req.params.type;
    let added = 0, updated = 0;

    if (type === "risks") {
      rows.forEach(row => {
        const existingIdx = data.risks.findIndex(r => r.id === row.id);
        const risk = {
          id: row.id, title: row.title, category: row.category,
          description: row.description, inherentRating: Number(row.inherentRating),
          residualRating: Number(row.residualRating), currentRating: Number(row.currentRating),
          targetRating: Number(row.targetRating), currentStatus: row.currentStatus,
          previousStatus: row.previousStatus, appetite: row.appetite,
          tolerance: row.tolerance, owner: row.owner, department: row.department,
          controlEffectiveness: row.controlEffectiveness, trend: row.trend,
          treatmentAction: row.treatmentAction, cause: row.cause,
          consequence: row.consequence, response: row.response,
          reviewDate: row.reviewDate, assuranceProvider: row.assuranceProvider,
          importedAt: new Date().toISOString()
        };
        if (existingIdx >= 0) { data.risks[existingIdx] = risk; updated++; }
        else { data.risks.push(risk); added++; }
      });
      data.summary.totalRisks = data.risks.length;
    }

    else if (type === "treatments") {
      rows.forEach(row => {
        const existingIdx = data.treatmentActions.findIndex(t => t.id === row.id);
        const treatment = {
          id: row.id, riskId: row.riskId, action: row.action,
          owner: row.owner, ownerInitials: row.ownerInitials,
          dueDate: row.dueDate, status: row.status, priority: row.priority,
          progress: Number(row.progress), budget: Number(row.budget),
          importedAt: new Date().toISOString()
        };
        if (existingIdx >= 0) { data.treatmentActions[existingIdx] = treatment; updated++; }
        else { data.treatmentActions.push(treatment); added++; }
      });
    }

    else if (type === "kris") {
      rows.forEach(row => {
        const existingIdx = data.kris.findIndex(k => k.id === row.id);
        const kri = {
          id: row.id, indicator: row.indicator, linkedRisk: row.linkedRisk,
          category: row.category, greenThreshold: row.greenThreshold,
          amberThreshold: row.amberThreshold, redThreshold: row.redThreshold,
          currentPeriodValue: String(row.currentPeriodValue),
          previousPeriodValue: String(row.previousPeriodValue),
          currentStatus: row.currentStatus, previousStatus: row.previousStatus,
          trend: row.trend, target: String(row.target),
          importedAt: new Date().toISOString()
        };
        if (existingIdx >= 0) { data.kris[existingIdx] = kri; updated++; }
        else { data.kris.push(kri); added++; }
      });
    }

    else if (type === "uifw") {
      rows.forEach(row => {
        const existingIdx = data.uifwExpenditure.cases.findIndex(c => c.id === row.id);
        const uifw = {
          id: row.id, type: row.type, description: row.description,
          amount: Number(row.amount), department: row.department,
          dateIdentified: row.dateIdentified, status: row.status,
          responsibleOfficer: row.responsibleOfficer,
          condoned: row.condoned === "true" || row.condoned === true,
          recoverable: row.recoverable === "true" || row.recoverable === true,
          referredTo: row.referredTo,
          importedAt: new Date().toISOString()
        };
        if (existingIdx >= 0) { data.uifwExpenditure.cases[existingIdx] = uifw; updated++; }
        else { data.uifwExpenditure.cases.push(uifw); added++; }
        // Recalculate totals
        data.uifwExpenditure.summary.totalIrregular = data.uifwExpenditure.cases.filter(c => c.type === "Irregular").reduce((s, c) => s + c.amount, 0);
        data.uifwExpenditure.summary.totalUnauthorised = data.uifwExpenditure.cases.filter(c => c.type === "Unauthorised").reduce((s, c) => s + c.amount, 0);
        data.uifwExpenditure.summary.totalFruitless = data.uifwExpenditure.cases.filter(c => c.type === "Fruitless & Wasteful").reduce((s, c) => s + c.amount, 0);
        data.uifwExpenditure.summary.grandTotal = data.uifwExpenditure.cases.reduce((s, c) => s + c.amount, 0);
        data.uifwExpenditure.summary.openCases = data.uifwExpenditure.cases.filter(c => c.status === "Open" || c.status === "Under Investigation").length;
      });
    }

    writeDashboardData(data);
    fs.unlinkSync(req.file.path); // Clean up uploaded file

    res.json({
      message: `Import successful`,
      type, added, updated,
      total: added + updated
    });

  } catch (e) {
    res.status(500).json({ message: "Upload failed", error: e.message });
  }
});

// ─── START SERVER ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`LGSETA BJMAPEX GRC Intelligence Center — Backend running on http://localhost:${PORT}`);
});