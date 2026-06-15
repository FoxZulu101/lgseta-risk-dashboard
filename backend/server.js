const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dataPath   = path.join(__dirname, "data", "dashboardData.json");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function readData()      { return JSON.parse(fs.readFileSync(dataPath, "utf8")); }
function writeData(data) { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }

// ── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  [".xlsx",".xls",".csv"].includes(ext) ? cb(null, true) : cb(new Error("Only Excel/CSV allowed"));
}});

// ── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("LGSETA BJMAPEX GRC Intelligence Center — Backend Running"));

// ── Dashboard (full data dump) ───────────────────────────────────────────────
app.get("/api/dashboard", (req, res) => {
  try { res.json(readData()); }
  catch (e) { res.status(500).json({ message:"Failed to load data", error:e.message }); }
});

app.put("/api/dashboard", (req, res) => {
  try { writeData(req.body); res.json({ message:"Dashboard updated" }); }
  catch (e) { res.status(500).json({ message:"Failed to update", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGIC RISKS  —  GET / POST / PUT / DELETE
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/risks", (req, res) => {
  try { res.json(readData().risks || []); }
  catch (e) { res.status(500).json({ message:"Failed to load risks", error:e.message }); }
});

app.post("/api/risks", (req, res) => {
  try {
    const data = readData();
    if (!data.risks) data.risks = [];
    const newRisk = { ...req.body, createdAt: new Date().toISOString() };
    data.risks.push(newRisk);
    if (data.summary) data.summary.totalRisks = data.risks.length;
    writeData(data);
    res.json({ message:"Risk added", risk:newRisk });
  } catch (e) { res.status(500).json({ message:"Failed to add risk", error:e.message }); }
});

app.put("/api/risks/:id", (req, res) => {
  try {
    const data = readData();
    const idx  = (data.risks||[]).findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message:"Risk not found" });
    data.risks[idx] = { ...data.risks[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(data);
    res.json({ message:"Risk updated", risk:data.risks[idx] });
  } catch (e) { res.status(500).json({ message:"Failed to update risk", error:e.message }); }
});

app.delete("/api/risks/:id", (req, res) => {
  try {
    const data = readData();
    data.risks = (data.risks||[]).filter(r => r.id !== req.params.id);
    if (data.summary) data.summary.totalRisks = data.risks.length;
    writeData(data);
    res.json({ message:"Risk deleted" });
  } catch (e) { res.status(500).json({ message:"Failed to delete risk", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KRI MONITORING  —  GET / POST / PUT / DELETE  ← NEW
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/kris", (req, res) => {
  try { res.json(readData().kris || []); }
  catch (e) { res.status(500).json({ message:"Failed to load KRIs", error:e.message }); }
});

app.post("/api/kris", (req, res) => {
  try {
    const data = readData();
    if (!data.kris) data.kris = [];
    const newKri = { ...req.body, createdAt: new Date().toISOString() };
    data.kris.push(newKri);
    writeData(data);
    res.json({ message:"KRI added", kri:newKri });
  } catch (e) { res.status(500).json({ message:"Failed to add KRI", error:e.message }); }
});

app.put("/api/kris/:id", (req, res) => {
  try {
    const data = readData();
    const idx  = (data.kris||[]).findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message:"KRI not found" });
    data.kris[idx] = { ...data.kris[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(data);
    res.json({ message:"KRI updated", kri:data.kris[idx] });
  } catch (e) { res.status(500).json({ message:"Failed to update KRI", error:e.message }); }
});

app.delete("/api/kris/:id", (req, res) => {
  try {
    const data = readData();
    data.kris = (data.kris||[]).filter(k => k.id !== req.params.id);
    writeData(data);
    res.json({ message:"KRI deleted" });
  } catch (e) { res.status(500).json({ message:"Failed to delete KRI", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TREATMENT ACTIONS  —  GET / POST / PUT / DELETE
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/treatments", (req, res) => {
  try { res.json(readData().treatmentActions || []); }
  catch (e) { res.status(500).json({ message:"Failed to load treatments", error:e.message }); }
});

app.post("/api/treatments", (req, res) => {
  try {
    const data = readData();
    if (!data.treatmentActions) data.treatmentActions = [];
    const newT = { ...req.body, createdAt: new Date().toISOString() };
    data.treatmentActions.push(newT);
    writeData(data);
    res.json({ message:"Treatment added", treatment:newT });
  } catch (e) { res.status(500).json({ message:"Failed to add treatment", error:e.message }); }
});

app.put("/api/treatments/:id", (req, res) => {
  try {
    const data = readData();
    const idx  = (data.treatmentActions||[]).findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message:"Treatment not found" });
    data.treatmentActions[idx] = { ...data.treatmentActions[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(data);
    res.json({ message:"Treatment updated", treatment:data.treatmentActions[idx] });
  } catch (e) { res.status(500).json({ message:"Failed to update treatment", error:e.message }); }
});

app.delete("/api/treatments/:id", (req, res) => {
  try {
    const data = readData();
    data.treatmentActions = (data.treatmentActions||[]).filter(t => t.id !== req.params.id);
    writeData(data);
    res.json({ message:"Treatment deleted" });
  } catch (e) { res.status(500).json({ message:"Failed to delete treatment", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/opportunities", (req, res) => {
  try { res.json(readData().opportunityRisks || []); }
  catch (e) { res.status(500).json({ message:"Failed to load opportunities", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK APPETITE
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/appetite", (req, res) => {
  try { res.json(readData().appetiteDashboard || []); }
  catch (e) { res.status(500).json({ message:"Failed to load appetite", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BCM INCIDENTS  —  GET / POST
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/bcm/incidents", (req, res) => {
  try { res.json((readData().bcmResilience || {}).incidents || []); }
  catch (e) { res.status(500).json({ message:"Failed to load incidents", error:e.message }); }
});

app.post("/api/bcm/incidents", (req, res) => {
  try {
    const data = readData();
    if (!data.bcmResilience) data.bcmResilience = {};
    if (!data.bcmResilience.incidents) data.bcmResilience.incidents = [];
    const newI = { ...req.body, createdAt: new Date().toISOString() };
    data.bcmResilience.incidents.push(newI);
    writeData(data);
    res.json({ message:"Incident added", incident:newI });
  } catch (e) { res.status(500).json({ message:"Failed to add incident", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UIFW EXPENDITURE  —  GET / POST / PUT / DELETE
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/uifw", (req, res) => {
  try { res.json((readData().uifwExpenditure || {}).cases || []); }
  catch (e) { res.status(500).json({ message:"Failed to load UIFW", error:e.message }); }
});

app.post("/api/uifw", (req, res) => {
  try {
    const data = readData();
    if (!data.uifwExpenditure) data.uifwExpenditure = { cases:[], summary:{} };
    if (!data.uifwExpenditure.cases) data.uifwExpenditure.cases = [];
    const newU = { ...req.body, amount: Number(req.body.amount)||0, createdAt: new Date().toISOString() };
    data.uifwExpenditure.cases.push(newU);
    recalcUIFW(data);
    writeData(data);
    res.json({ message:"UIFW case added", case:newU });
  } catch (e) { res.status(500).json({ message:"Failed to add UIFW", error:e.message }); }
});

app.put("/api/uifw/:id", (req, res) => {
  try {
    const data = readData();
    const idx  = (data.uifwExpenditure?.cases||[]).findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message:"UIFW case not found" });
    data.uifwExpenditure.cases[idx] = { ...data.uifwExpenditure.cases[idx], ...req.body, amount: Number(req.body.amount)||0, updatedAt: new Date().toISOString() };
    recalcUIFW(data);
    writeData(data);
    res.json({ message:"UIFW updated", case:data.uifwExpenditure.cases[idx] });
  } catch (e) { res.status(500).json({ message:"Failed to update UIFW", error:e.message }); }
});

app.delete("/api/uifw/:id", (req, res) => {
  try {
    const data = readData();
    data.uifwExpenditure.cases = (data.uifwExpenditure?.cases||[]).filter(c => c.id !== req.params.id);
    recalcUIFW(data);
    writeData(data);
    res.json({ message:"UIFW case deleted" });
  } catch (e) { res.status(500).json({ message:"Failed to delete UIFW", error:e.message }); }
});

function recalcUIFW(data) {
  const cases = data.uifwExpenditure?.cases || [];
  data.uifwExpenditure.summary = {
    totalIrregular:   cases.filter(c=>c.type==="Irregular").reduce((s,c)=>s+c.amount,0),
    totalUnauthorised:cases.filter(c=>c.type==="Unauthorised").reduce((s,c)=>s+c.amount,0),
    totalFruitless:   cases.filter(c=>c.type==="Fruitless & Wasteful").reduce((s,c)=>s+c.amount,0),
    grandTotal:       cases.reduce((s,c)=>s+c.amount,0),
    openCases:        cases.filter(c=>["Open","Under Investigation"].includes(c.status)).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTING PERIOD
// ═══════════════════════════════════════════════════════════════════════════════
app.put("/api/period", (req, res) => {
  try {
    const data = readData();
    data.reportingPeriod = { ...data.reportingPeriod, ...req.body };
    writeData(data);
    res.json({ message:"Period updated", period:data.reportingPeriod });
  } catch (e) { res.status(500).json({ message:"Failed to update period", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
const TEMPLATES = {
  risks: {
    headers: ["id","title","category","description","inherentRating","residualRating","currentRating","targetRating","currentStatus","appetite","owner","department","response","controlEffectiveness","trend","reviewDate"],
    sample:  ["SR-011","Example Risk Title","Strategic Risk","Description",20,15,15,8,"Outside Tolerance","Low","CEO","Office of CEO","Treat","Partially Effective","Stable","2026-09-30"]
  },
  kris: {
    headers: ["id","indicator","linkedRisk","category","target","currentPeriodValue","previousPeriodValue","currentStatus","previousStatus","trend","greenThreshold","amberThreshold","redThreshold"],
    sample:  ["KRI-009","KRI Name","SR-001","Strategic Performance","95%","88%","82%","Outside Tolerance","Outside Tolerance","Improving","95%-100%","85%-94%","Below 85%"]
  },
  treatments: {
    headers: ["id","riskId","action","owner","dueDate","status","priority","progress","budget"],
    sample:  ["TA-009","SR-001","Treatment description","Risk Owner","2026-09-30","In Progress","High",50,100000]
  },
  uifw: {
    headers: ["id","type","description","amount","department","dateIdentified","status","responsibleOfficer","condoned","recoverable","referredTo"],
    sample:  ["UIFW-009","Irregular","Description",500000,"Finance","2026-06-14","Open","Finance Manager","false","true","Internal Audit"]
  },
  incidents: {
    headers: ["id","title","date","type","affectedUnit","severity","duration","rtoBreached","impact","actionsTaken","status"],
    sample:  ["INC-004","Incident Title","2026-06-14","ICT Outage","All Departments","High","4 hours","Yes","High impact","Actions taken","Open"]
  },
};

app.get("/api/templates/:type", (req, res) => {
  const tmpl = TEMPLATES[req.params.type];
  if (!tmpl) return res.status(404).json({ message:"Template not found" });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([tmpl.headers, tmpl.sample]);
  ws["!cols"] = tmpl.headers.map(()=>({ wch:22 }));
  XLSX.utils.book_append_sheet(wb, ws, req.params.type.toUpperCase());
  const buf = XLSX.write(wb, { type:"buffer", bookType:"xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename=LGSETA_${req.params.type}_template.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/upload/:type", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message:"No file uploaded" });
    const wb   = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (!rows.length) return res.status(400).json({ message:"File is empty" });

    const data = readData();
    const type = req.params.type;
    let added=0, updated=0;

    if (type==="risks") {
      if (!data.risks) data.risks=[];
      rows.forEach(row=>{
        const idx=data.risks.findIndex(r=>r.id===row.id);
        const risk={ ...row, inherentRating:Number(row.inherentRating), residualRating:Number(row.residualRating),
          currentRating:Number(row.currentRating), targetRating:Number(row.targetRating), importedAt:new Date().toISOString() };
        idx>=0 ? (data.risks[idx]=risk, updated++) : (data.risks.push(risk), added++);
      });
      if (data.summary) data.summary.totalRisks=data.risks.length;
    }
    else if (type==="kris") {
      if (!data.kris) data.kris=[];
      rows.forEach(row=>{
        const idx=data.kris.findIndex(k=>k.id===row.id);
        const kri={ ...row, currentPeriodValue:String(row.currentPeriodValue), previousPeriodValue:String(row.previousPeriodValue), importedAt:new Date().toISOString() };
        idx>=0 ? (data.kris[idx]=kri, updated++) : (data.kris.push(kri), added++);
      });
    }
    else if (type==="treatments") {
      if (!data.treatmentActions) data.treatmentActions=[];
      rows.forEach(row=>{
        const idx=data.treatmentActions.findIndex(t=>t.id===row.id);
        const t={ ...row, progress:Number(row.progress), budget:Number(row.budget), importedAt:new Date().toISOString() };
        idx>=0 ? (data.treatmentActions[idx]=t, updated++) : (data.treatmentActions.push(t), added++);
      });
    }
    else if (type==="uifw") {
      if (!data.uifwExpenditure) data.uifwExpenditure={ cases:[], summary:{} };
      if (!data.uifwExpenditure.cases) data.uifwExpenditure.cases=[];
      rows.forEach(row=>{
        const idx=data.uifwExpenditure.cases.findIndex(c=>c.id===row.id);
        const u={ ...row, amount:Number(row.amount)||0, condoned:row.condoned==="true"||row.condoned===true,
          recoverable:row.recoverable==="true"||row.recoverable===true, importedAt:new Date().toISOString() };
        idx>=0 ? (data.uifwExpenditure.cases[idx]=u, updated++) : (data.uifwExpenditure.cases.push(u), added++);
      });
      recalcUIFW(data);
    }
    else if (type==="incidents") {
      if (!data.bcmResilience) data.bcmResilience={};
      if (!data.bcmResilience.incidents) data.bcmResilience.incidents=[];
      rows.forEach(row=>{
        const idx=data.bcmResilience.incidents.findIndex(i=>i.id===row.id);
        const inc={ ...row, importedAt:new Date().toISOString() };
        idx>=0 ? (data.bcmResilience.incidents[idx]=inc, updated++) : (data.bcmResilience.incidents.push(inc), added++);
      });
    }

    writeData(data);
    fs.unlinkSync(req.file.path);
    res.json({ message:"Import successful", type, added, updated, total:added+updated });
  } catch (e) { res.status(500).json({ message:"Upload failed", error:e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`LGSETA GRC Backend running on port ${PORT}`));

// ═══════════════════════════════════════════════════════════════════════════════
// QUARTERLY REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
const { generateReport } = require("./reportGenerator");

app.post("/api/reports/:type", async (req, res) => {
  const type = req.params.type; // excom | arc | board
  if (!["excom","arc","board"].includes(type)) {
    return res.status(400).json({ message:"Invalid report type. Use: excom, arc, or board" });
  }
  try {
    const data   = readData();
    const buffer = await generateReport(type, data);
    const date   = new Date().toISOString().slice(0,10);
    const labels = { excom:"EXCOM", arc:"ARC", board:"Board" };
    res.setHeader("Content-Disposition", `attachment; filename=LGSETA_${labels[type]}_GRC_Report_${date}.docx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  } catch (e) {
    console.error("Report generation error:", e);
    res.status(500).json({ message:"Report generation failed", error:e.message });
  }
});
