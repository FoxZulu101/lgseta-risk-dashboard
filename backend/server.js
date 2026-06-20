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

// Persistent-disk storage: the live data file lives on the Render disk mounted
// at /data so it survives redeploys. The repo's data/dashboardData.json is used
// only as the first-run seed.
const DISK_DIR  = process.env.DATA_DIR || "/data";
const dataPath  = path.join(DISK_DIR, "dashboardData.json");
const seedPath  = path.join(__dirname, "data", "dashboardData.json");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// On first run the disk is empty — seed it once from the file committed in the repo.
try {
  if (!fs.existsSync(DISK_DIR)) fs.mkdirSync(DISK_DIR, { recursive: true });
  if (!fs.existsSync(dataPath) && fs.existsSync(seedPath)) {
    fs.copyFileSync(seedPath, dataPath);
    console.log("Seeded persistent data file from repo on first run.");
  }
} catch (e) {
  console.error("Persistent-disk init failed, falling back to repo path:", e.message);
}

function readData()      { return JSON.parse(fs.readFileSync(fs.existsSync(dataPath) ? dataPath : seedPath, "utf8")); }
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
// ─── LGSETA Report Generator ──────────────────────────────────────────────────
// Place this file at: backend/reportGenerator.js
// Called by server.js routes: POST /api/reports/:type
// ─────────────────────────────────────────────────────────────────────────────
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak,
  TabStopType, TabStopPosition,
} = require("docx");

// ── Colour palette ────────────────────────────────────────────────────────────
const NAVY   = "0F2044";
const BLUE   = "2563EB";
const RED    = "DC2626";
const AMBER  = "D97706";
const GREEN  = "16A34A";
const GREY   = "6B7280";
const LGREY  = "F3F4F6";
const WHITE  = "FFFFFF";
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n) => `R${Number(n||0).toLocaleString("en-ZA")}`;
const fmtM = (n) => `R${(Number(n||0)/1e6).toFixed(2)}M`;
const pct  = (n) => `${Number(n||0)}%`;

function statusColor(s) {
  const v = (s||"").toLowerCase();
  if (v.includes("outside")||v.includes("red")||v.includes("critical")||v.includes("overdue")) return RED;
  if (v.includes("within")||v.includes("complete")||v.includes("green")||v.includes("on track")) return GREEN;
  return AMBER;
}

function para(text, opts={}) {
  return new Paragraph({
    spacing: { before: opts.before||0, after: opts.after||120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({
      text, font:"Arial",
      size:   opts.size   || 20,
      bold:   opts.bold   || false,
      color:  opts.color  || "1F2937",
      italics:opts.italic || false,
    })],
  });
}

function heading1(text, color=NAVY) {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border:  { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    children: [new TextRun({ text, font:"Arial", size:32, bold:true, color })],
  });
}

function heading2(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font:"Arial", size:24, bold:true, color:NAVY })],
  });
}

function cell(text, opts={}) {
  return new TableCell({
    borders: opts.noBorder ? NO_BORDERS : BORDERS,
    width: { size: opts.width||1440, type: WidthType.DXA },
    shading: { fill: opts.fill||WHITE, type: ShadingType.CLEAR },
    margins: { top:80, bottom:80, left:120, right:120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text: String(text||"—"), font:"Arial",
        size:  opts.size  || 18,
        bold:  opts.bold  || false,
        color: opts.color || "1F2937",
      })],
    })],
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l,i) => cell(l, { fill:NAVY, bold:true, color:WHITE, width:widths[i], size:18 })),
  });
}

function kpiTable(items, pageWidth=9026) {
  const colW = Math.floor(pageWidth / items.length);
  return new Table({
    width: { size:pageWidth, type:WidthType.DXA },
    columnWidths: items.map(()=>colW),
    rows: [
      new TableRow({ children: items.map(([label])=>
        cell(label, { fill:NAVY, bold:true, color:WHITE, width:colW, size:16, align:AlignmentType.CENTER })
      )}),
      new TableRow({ children: items.map(([,value,,bgColor])=>
        cell(value, { fill:bgColor||LGREY, bold:true, color:bgColor?WHITE:NAVY, width:colW, size:28, align:AlignmentType.CENTER })
      )}),
      new TableRow({ children: items.map(([,,sub])=>
        cell(sub||"", { fill:LGREY, color:GREY, width:colW, size:14, align:AlignmentType.CENTER })
      )}),
    ],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before:120, after:120 },
    border: { bottom:{ style:BorderStyle.SINGLE, size:2, color:"E5E7EB" } },
    children: [],
  });
}

// -- Analysis & Implications (data-driven narrative) --
function analysis(text) {
  return [
    new Paragraph({ spacing:{ before:120, after:60 }, shading:{ type:"clear", fill:"F1F5F9" }, children:[ new TextRun({ text:"Analysis & Implications", font:"Arial", size:18, bold:true, color:NAVY }) ] }),
    new Paragraph({ spacing:{ after:160 }, shading:{ type:"clear", fill:"F8FAFC" }, children:[ new TextRun({ text:text, font:"Arial", size:18, color:"1F2937" }) ] }),
  ];
}

function pageBreak() {
  return new Paragraph({ children:[new PageBreak()] });
}

// ── Cover page ────────────────────────────────────────────────────────────────
function coverPage(title, subtitle, data) {
  const period = data.reportingPeriod || {};
  const date   = new Date().toLocaleDateString("en-ZA", { day:"2-digit", month:"long", year:"numeric" });
  return [
    new Paragraph({ spacing:{ before:1440, after:0 }, children:[] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before:0, after:240 },
      children:  [new TextRun({ text:"LGSETA — BJMAPEX", font:"Arial", size:48, bold:true, color:NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before:0, after:480 },
      children:  [new TextRun({ text:"GRC Intelligence Center", font:"Arial", size:28, color:BLUE })],
    }),
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:160},
      children:[new TextRun({ text:title, font:"Arial", size:56, bold:true, color:NAVY })]}),
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:480},
      children:[new TextRun({ text:subtitle, font:"Arial", size:28, color:GREY })]}),
    new Table({
      width: { size:6000, type:WidthType.DXA },
      columnWidths:[3000,3000],
      rows:[
        new TableRow({ children:[
          cell("Reporting Period", { fill:LGREY, bold:true, width:3000, size:18 }),
          cell(period.current||"Q2 2026/27",  { width:3000, size:18 }),
        ]}),
        new TableRow({ children:[
          cell("Report Date",      { fill:LGREY, bold:true, width:3000, size:18 }),
          cell(date,               { width:3000, size:18 }),
        ]}),
        new TableRow({ children:[
          cell("Classification",   { fill:LGREY, bold:true, width:3000, size:18 }),
          cell("CONFIDENTIAL",     { width:3000, size:18, bold:true, color:RED }),
        ]}),
        new TableRow({ children:[
          cell("Prepared by",      { fill:LGREY, bold:true, width:3000, size:18 }),
          cell("BJMAPEX Risk Management Unit", { width:3000, size:18 }),
        ]}),
      ],
    }),
    pageBreak(),
  ];
}

// ── Section builders ──────────────────────────────────────────────────────────

// Background / Introduction + Purpose (front matter, placed after cover)
function buildIntroduction(data, config) {
  const period = (data.reportingPeriod && data.reportingPeriod.current) || "the current quarter";
  return [
    heading1("Background & Introduction"),
    para("The Local Government Sector Education and Training Authority (LGSETA) operates within a mandated governance, risk and compliance (GRC) framework aligned to the Public Finance Management Act (PFMA), the Skills Development Act, National Treasury regulations and King IV principles of corporate governance.", { after:120 }),
    para("This report consolidates the organisation's enterprise risk position, control environment, assurance activities and project and contract performance for "+period+". It draws directly from the live GRC Intelligence Center, ensuring the figures presented reflect the most current data captured by risk owners and assurance providers across the organisation.", { after:120 }),
    para("Risk ratings follow a standard 5×5 methodology, scoring each risk as the product of likelihood and impact on a scale of 1 to 25. Risks are then classified against the organisation's approved risk appetite and tolerance levels as either Within Tolerance or Outside Tolerance.", { after:160 }),

    heading2("Purpose"),
    para("The purpose of this report is to provide the "+(config.audience||"governance structure")+" with a clear, evidence-based view of the organisation's risk and control posture, to enable informed oversight and decision-making. Specifically, this report aims to:", { after:80 }),
    para("• Present the most significant strategic, operational and compliance risks facing the organisation and their movement against tolerance;", { after:60 }),
    para("• Report on the status of risk treatment actions, assurance coverage and outstanding management commitments;", { after:60 }),
    para("• Highlight financial exposure arising from irregular, fruitless and wasteful expenditure (UIFW) and fraud or ethics matters;", { after:60 }),
    para("• Provide oversight of project and contract performance, including schedule and cost efficiency; and", { after:60 }),
    para("• Support the "+(config.audience||"governance structure")+" in discharging its oversight responsibilities and directing management attention to the areas of greatest exposure.", { after:160 }),
    divider(),
  ];
}

// 5×5 Risk Heatmap rendered as a shaded Word table, with written interpretation.
function buildHeatmap(data) {
  const risks = data.risks || [];
  // Derive likelihood (rows) and impact (cols) 1..5 from rating where explicit fields absent.
  const cellMap = {}; // key "L-I" -> [risk ids]
  risks.forEach(r => {
    const rating = Number(r.currentRating||r.inherentRating||r.residualRating||0);
    let L = Number(r.likelihood)||0, I = Number(r.impact)||0;
    if (!L || !I) {
      // Factor the rating into a plausible LxI pair (closest factors to a square)
      const target = Math.min(25, Math.max(1, rating||1));
      let best = [1, target];
      for (let l=1; l<=5; l++){ const i = Math.round(target/l); if (i>=1 && i<=5 && Math.abs(l-i)<Math.abs(best[0]-best[1])) best=[l,i]; }
      L = Math.min(5,Math.max(1,best[0])); I = Math.min(5,Math.max(1,best[1]));
    }
    L = Math.min(5,Math.max(1,L)); I = Math.min(5,Math.max(1,I));
    const key = `${L}-${I}`;
    (cellMap[key] = cellMap[key] || []).push(r.id||"?");
  });

  // Colour by L*I score band
  const bandColor = s => s>=20?RED : s>=12?AMBER : s>=6?"EAB308" : GREEN; // deep red / amber / yellow / green
  const impactLabels = ["1 Insignificant","2 Minor","3 Moderate","4 Major","5 Severe"];
  const likeLabels   = ["5 Almost Certain","4 Likely","3 Possible","2 Unlikely","1 Rare"];
  const W = [1600,1480,1480,1480,1480,1480];

  // Build rows from likelihood 5 (top) down to 1 (bottom)
  const rows = [
    new TableRow({ tableHeader:true, children:[
      cell("Likelihood ↓ / Impact →", { fill:NAVY, bold:true, color:WHITE, width:W[0], size:15, align:AlignmentType.CENTER }),
      ...impactLabels.map((l,i)=>cell(l, { fill:NAVY, bold:true, color:WHITE, width:W[i+1], size:15, align:AlignmentType.CENTER })),
    ]}),
  ];
  for (let L=5; L>=1; L--){
    rows.push(new TableRow({ children:[
      cell(likeLabels[5-L], { fill:NAVY, bold:true, color:WHITE, width:W[0], size:15 }),
      ...[1,2,3,4,5].map((I,idx)=>{
        const score = L*I;
        const ids = cellMap[`${L}-${I}`]||[];
        const txt = ids.length ? ids.join(", ") : String(score);
        return cell(txt, { fill:bandColor(score), bold:true, color:WHITE, width:W[idx+1], size:ids.length?15:16, align:AlignmentType.CENTER });
      }),
    ]}));
  }

  // Interpretation figures
  const outside = risks.filter(r=>(r.currentStatus||"").includes("Outside")).length;
  const extreme = risks.filter(r=>Number(r.currentRating||r.inherentRating||0)>=20).length;
  const high    = risks.filter(r=>{ const v=Number(r.currentRating||r.inherentRating||0); return v>=12 && v<20; }).length;
  const low     = risks.filter(r=>Number(r.currentRating||r.inherentRating||0)<6).length;

  return [
    heading1("Enterprise Risk Heatmap"),
    para("The heatmap below plots each registered risk by likelihood and impact on the organisation's standard 5×5 scale. Cells are shaded by severity, and each cell shows the IDs of the risks that fall within it.", { after:120 }),
    new Table({ width:{ size:9000, type:WidthType.DXA }, columnWidths:W, rows }),
    new Paragraph({ spacing:{before:120,after:60}, children:[] }),
    para("Legend:  Red = Extreme (20–25)   Amber = High (12–19)   Yellow = Moderate (6–11)   Green = Low (1–5)", { size:16, color:GREY, after:120 }),
    ...analysis(
      `The risk profile shows ${extreme} risk(s) in the Extreme band and ${high} in the High band, against ${low} in the Low band. ` +
      `${outside} risk(s) currently sit Outside Tolerance. ` +
      (extreme>0
        ? `The Extreme-band risks represent the organisation's most material exposures and demand immediate executive attention, with each requiring an active treatment plan, a named owner and a committed resolution date. `
        : `No risks currently fall in the Extreme band, indicating the most severe exposures are being contained. `) +
      `The concentration of risks toward the upper-right of the matrix is the key signal for the ${"governance structure"}: where high-likelihood, high-impact risks cluster, control investment and assurance effort should be prioritised. Movement of risks toward the lower-left over successive quarters is the primary measure of treatment effectiveness.`
    ),
    divider(),
  ];
}

// Overall conclusion at the end of the report.
function buildConclusion(data) {
  const risks   = data.risks || [];
  const actions = data.treatmentActions || [];
  const outside = risks.filter(r=>(r.currentStatus||"").includes("Outside")).length;
  const complete= actions.filter(a=>a.status==="Complete").length;
  const compPct = Math.round(complete/Math.max(actions.length,1)*100);
  const uifw    = (data.uifwExpenditure && data.uifwExpenditure.summary && data.uifwExpenditure.summary.grandTotal) || 0;

  return [
    heading1("Conclusion & Way Forward"),
    para(`The organisation's risk and control environment is being actively managed, but the overall posture remains elevated. ${outside} risk(s) sit outside tolerance and treatment delivery stands at ${compPct}%, with UIFW exposure of ${fmtM(uifw)} still to be resolved.`, { after:120 }),
    para("Sustained improvement in the risk profile will depend on three priorities over the period ahead:", { after:80 }),
    para("• Resolving outside-tolerance risks through fully resourced treatment plans with accountable owners and firm deadlines;", { after:60 }),
    para("• Clearing overdue treatment actions and lifting completion above the 80% threshold that supports reasonable assurance; and", { after:60 }),
    para("• Strengthening preventative controls in supply chain management and consequence management to reduce recurring UIFW and fraud exposure.", { after:120 }),
    para("Management will continue to report progress against these priorities each quarter, and the assurance providers will track the closure of findings and the effectiveness of controls to provide independent confirmation that residual risk is being brought within the organisation's approved appetite.", { after:160 }),
    para("Prepared by the BJMAPEX Risk Management Unit on behalf of LGSETA. This report is confidential and intended solely for the governance structure to which it is addressed.", { size:16, color:GREY, italic:true }),
  ];
}

function buildExecutiveSummary(data) {
  const risks    = data.risks || [];
  const kris     = data.kris  || [];
  const actions  = data.treatmentActions || [];
  const outside  = risks.filter(r=>(r.currentStatus||"").includes("Outside")).length;
  const kriBrech = kris.filter(k=>(k.currentStatus||"").includes("Outside")).length;
  const actComp  = actions.filter(a=>a.status==="Complete").length;
  const uifw     = data.uifwExpenditure?.summary?.grandTotal || 0;

  return [
    heading1("1. Executive Summary"),
    para("This report provides an overview of LGSETA's governance, risk and compliance position for the current reporting period. Key highlights are summarised below.", { after:160 }),
    kpiTable([
      ["Total Risks",          String(risks.length),    "+4 Emerging",           NAVY ],
      ["Outside Tolerance",    String(outside),          "Immediate attention",   outside>0?RED:GREEN ],
      ["KRIs Breached",        String(kriBrech),         "Of "+kris.length+" total", kriBrech>0?AMBER:GREEN ],
      ["Actions Complete",     pct(Math.round(actComp/Math.max(actions.length,1)*100)), actComp+" of "+actions.length, GREEN ],
      ["UIFW Exposure",        fmtM(uifw),               "Total UIFW",            RED ],
    ]),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    heading2("Key Risk Messages"),
    para(`• The organisation has ${risks.length} registered risks of which ${outside} are currently Outside Tolerance and require immediate management attention.`, { after:80 }),
    para(`• ${kriBrech} of ${kris.length} Key Risk Indicators are breaching their tolerance thresholds.`, { after:80 }),
    para(`• Treatment action completion rate stands at ${Math.round(actComp/Math.max(actions.length,1)*100)}% with ${actions.length-actComp} actions still outstanding.`, { after:80 }),
    para(`• UIFW exposure for the period amounts to ${fmtM(uifw)} and requires urgent resolution.`, { after:80 }),
    ...analysis('Overall risk posture remains elevated. Of '+risks.length+' registered risks, '+outside+' ('+Math.round(outside/Math.max(risks.length,1)*100)+'%) sit outside tolerance, concentrated in information security, supply chain and financial sustainability. '+kriBrech+' of '+kris.length+' Key Risk Indicators are breaching threshold, signalling several exposures are still trending adversely. Treatment delivery at '+Math.round(actComp/Math.max(actions.length,1)*100)+'% indicates active management, but '+(actions.length-actComp)+' outstanding actions and UIFW of '+fmtM(uifw)+' mean the control environment cannot yet be regarded as fully effective. Management should prioritise outside-tolerance risks, overdue actions, and UIFW resolution before the next cycle.'),
    divider(),
  ];
}

function buildTopRisks(data) {
  const risks = [...(data.risks||[])].sort((a,b)=>(b.currentRating||b.inherentRating||0)-(a.currentRating||a.inherentRating||0)).slice(0,10);
  const W = [800,2800,900,900,900,1000,1726];
  return [
    heading1("2. Top Risks"),
    para(`The following risks represent the highest-rated risks currently on the register. ${risks.filter(r=>(r.currentStatus||"").includes("Outside")).length} are Outside Tolerance.`, { after:160 }),
    new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["ID","Risk Title","Inherent","Residual","Current","Appetite","Status"], W),
        ...risks.map(r => new TableRow({ children:[
          cell(r.id,                              { width:W[0], size:16, color:BLUE, bold:true }),
          cell(r.title||r.name||"—",             { width:W[1], size:16 }),
          cell(r.inherentRating||r.inherent||"—",{ width:W[2], size:16, align:AlignmentType.CENTER, bold:true, color:Number(r.inherentRating||r.inherent)>=15?RED:Number(r.inherentRating||r.inherent)>=10?AMBER:GREEN }),
          cell(r.residualRating||r.residual||"—",{ width:W[3], size:16, align:AlignmentType.CENTER }),
          cell(r.currentRating||r.currentStatus||"—",{ width:W[4], size:16, align:AlignmentType.CENTER }),
          cell(r.appetite||"—",                 { width:W[5], size:16 }),
          cell(r.currentStatus||r.status||"—",  { width:W[6], size:16, bold:true, color:statusColor(r.currentStatus||r.status) }),
        ]})),
      ],
    }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
    ...analysis('The top of the register is dominated by strategic and cyber exposures, with the highest current ratings attaching to information security and procurement integrity. Where current ratings remain at or above residual targets, existing controls are not yet bringing exposure within appetite, warranting stronger treatment or a formal risk-acceptance decision. Risks marked Outside Tolerance should be the focus of escalation this period.'),
  ];
}

function buildOperationalRisks(data) {
  const risks = [...(data.operationalRisks || [])]
    .sort((a,b)=>(Number(b.current||b.residual||b.inherent||0))-(Number(a.current||a.residual||a.inherent||0)));
  const total=risks.length, critical=risks.filter(r=>Number(r.current)>=15).length;
  const improving=risks.filter(r=>r.trend==="Improving").length;
  const portfolios=new Set(risks.map(r=>r.portfolio).filter(Boolean)).size;
  const W=[800,2600,1900,750,750,750,726];
  return [
    heading1("Operational Risk Register"),
    para("Operational risks maintained across portfolios. "+critical+" rated Critical; "+improving+" improving.",{after:160}),
    kpiTable([
      ["Operational Risks",String(total),"",NAVY],
      ["Critical (>=15)",String(critical),"Require attention",critical>0?RED:GREEN],
      ["Improving",String(improving),"Positive trend",GREEN],
      ["Portfolios",String(portfolios),"",BLUE],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:W, rows:[
      headerRow(["ID","Risk Name","Portfolio / Unit","Inh.","Res.","Cur.","Tgt."], W),
      ...risks.slice(0,20).map(r=>new TableRow({ children:[
        cell(r.id,{width:W[0],size:16,color:BLUE,bold:true}),
        cell(r.name||"-",{width:W[1],size:16}),
        cell((r.portfolio||"-")+" / "+(r.unit||"-"),{width:W[2],size:15,color:"6B7280"}),
        cell(String(r.inherent||"-"),{width:W[3],size:16,align:AlignmentType.CENTER}),
        cell(String(r.residual||"-"),{width:W[4],size:16,align:AlignmentType.CENTER}),
        cell(String(r.current||"-"),{width:W[5],size:16,align:AlignmentType.CENTER,bold:true,color:Number(r.current)>=15?RED:Number(r.current)>=10?AMBER:GREEN}),
        cell(String(r.target||"-"),{width:W[6],size:16,align:AlignmentType.CENTER,color:GREEN}),
      ]})),
    ]}),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
    ...analysis('Operational risk is distributed across '+portfolios+' portfolio(s), with '+critical+' rated Critical and '+improving+' improving. '+(critical>0?'Critical items concentrate operational exposure and should each be tied to a treatment action with an owner and deadline. ':'No risks are currently critical, indicating operational exposure is largely within manageable bounds. ')+(improving>0?'The improving trend suggests treatment is taking effect; sustaining it requires continued unit-level monitoring.':'The absence of an improving trend warrants review of treatment adequacy.')),
  ];
}

function buildTreatmentActions(data) {
  const actions  = data.treatmentActions || [];
  const complete = actions.filter(a=>a.status==="Complete").length;
  const inProg   = actions.filter(a=>["In Progress","Near Complete"].includes(a.status)).length;
  const overdue  = actions.filter(a=>a.status==="Overdue"||(a.status!=="Complete"&&a.dueDate&&new Date(a.dueDate)<new Date())).length;
  const W = [800,900,2600,1200,1000,900,626];
  return [
    heading1("3. Treatment Action Status"),
    kpiTable([
      ["Total Actions",  String(actions.length), "",          NAVY  ],
      ["Complete",       String(complete),        pct(Math.round(complete/Math.max(actions.length,1)*100)), GREEN ],
      ["In Progress",    String(inProg),          "",          BLUE  ],
      ["Overdue",        String(overdue),         "Require escalation", overdue>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["ID","Risk","Action","Owner","Due Date","Progress","Status"], W),
        ...actions.slice(0,15).map(a => {
          const isOverdue = a.status!=="Complete"&&a.dueDate&&new Date(a.dueDate)<new Date();
          return new TableRow({ children:[
            cell(a.id,            { width:W[0], size:16, color:BLUE, bold:true }),
            cell(a.riskId||a.risk||"—", { width:W[1], size:16 }),
            cell(a.action,        { width:W[2], size:16 }),
            cell(a.owner||"—",   { width:W[3], size:16 }),
            cell(a.dueDate||a.due||"—",{ width:W[4], size:16, color:isOverdue?RED:"1F2937", bold:isOverdue }),
            cell(pct(a.progress||0),   { width:W[5], size:16, align:AlignmentType.CENTER }),
            cell(a.status,        { width:W[6], size:16, bold:true, color:statusColor(a.status) }),
          ]});
        }),
      ],
    }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
    ...analysis('Treatment completion stands at '+Math.round(complete/Math.max(actions.length,1)*100)+'% ('+complete+' of '+actions.length+'), with '+inProg+' in progress and '+overdue+' overdue. '+(overdue>0?'The '+overdue+' overdue action(s) are the most immediate concern, leaving associated risks exposed beyond planned timelines, and should be escalated to owners. ':'No actions are overdue, indicating treatment is broadly on schedule. ')+'Sustained completion above 80% would give reasonable assurance that responses are delivered as planned.'),
  ];
}

function buildUIFW(data) {
  const cases  = data.uifwExpenditure?.cases || [];
  const summ   = data.uifwExpenditure?.summary || {};
  const total  = summ.grandTotal || cases.reduce((s,c)=>s+(Number(c.amount)||0),0);
  const irreg  = summ.totalIrregular || 0;
  const fruit  = summ.totalFruitless || 0;
  const open   = summ.openCases || cases.filter(c=>["Open","Under Investigation"].includes(c.status)).length;
  const W = [1000,1400,2000,1200,1200,1000,1226];
  return [
    heading1("4. UIFW Expenditure"),
    kpiTable([
      ["Total UIFW",    fmtM(total),  "All categories",         RED   ],
      ["Irregular",     fmtM(irreg),  "Procurement related",    AMBER ],
      ["Fruitless",     fmtM(fruit),  "Wasteful expenditure",   AMBER ],
      ["Open Cases",    String(open), "Require resolution",     open>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["ID","Type","Description","Department","Amount","Date","Status"], W),
        ...cases.map(u => new TableRow({ children:[
          cell(u.id,           { width:W[0], size:16, color:AMBER, bold:true }),
          cell(u.type,         { width:W[1], size:16 }),
          cell(u.description||"—",{ width:W[2], size:16 }),
          cell(u.department||"—", { width:W[3], size:16 }),
          cell(fmt(u.amount),  { width:W[4], size:16, bold:true, color:RED }),
          cell(u.dateIdentified||"—",{ width:W[5], size:16 }),
          cell(u.status,       { width:W[6], size:16, bold:true, color:statusColor(u.status) }),
        ]})),
      ],
    }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
    ...analysis('Total UIFW exposure stands at '+fmtM(total)+', of which '+fmtM(irreg)+' is irregular (predominantly procurement-related) and '+fmtM(fruit)+' fruitless and wasteful. '+(open>0?open+' case(s) remain open and require resolution, condonement or recovery; unresolved UIFW directly affects the audit outcome and PFMA compliance. ':'All cases are resolved, supporting a cleaner audit position. ')+'Management should prioritise consequence management and stronger SCM controls to prevent recurrence.'),
  ];
}

function buildFraud(data) {
  const cases  = (data.fraudEthics?.cases || data.fraudCases || []);
  const total  = cases.reduce((s,c)=>s+(Number(c.amount)||0),0);
  const open   = cases.filter(c=>!["Resolved","Closed"].includes(c.status)).length;
  const W = [900,1600,2100,1200,900,1000,1326];
  return [
    heading1("5. Fraud & Ethics"),
    kpiTable([
      ["Total Cases",       String(cases.length), "",              cases.length>0?AMBER:GREEN ],
      ["Open / Active",     String(open),          "",              open>0?RED:GREEN ],
      ["Resolved",          String(cases.filter(c=>c.status==="Resolved").length), "", GREEN ],
      ["Total Loss",        fmtM(total),            "Financial impact", total>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["ID","Category","Description","Amount","Source","Reported","Status"], W),
        ...(cases.length>0?cases:[{ id:"—", category:"No cases", description:"No fraud cases recorded", amount:0, source:"—", reported:"—", status:"—" }]).map(c => new TableRow({ children:[
          cell(c.id,           { width:W[0], size:16, color:Number(c.amount)>0?RED:GREY, bold:true }),
          cell(c.category||"—",{ width:W[1], size:16 }),
          cell(c.description||"—",{ width:W[2], size:16 }),
          cell(Number(c.amount)>0?fmt(c.amount):"—", { width:W[3], size:16, color:Number(c.amount)>0?RED:GREY }),
          cell(c.source||"—",  { width:W[4], size:16 }),
          cell(c.reported||"—",{ width:W[5], size:16 }),
          cell(c.status||"—",  { width:W[6], size:16, bold:true, color:statusColor(c.status) }),
        ]})),
      ],
    }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `${cases.length} fraud or ethics matter(s) are on record, of which ${open} remain open, with total financial impact of ${fmtM(total)}. ` +
      (open>0
        ? `Open cases require timely investigation and consequence management; unresolved matters undermine the control environment and erode stakeholder confidence. `
        : `All recorded matters have been resolved, which supports a sound ethical control position. `) +
      `Sustained fraud prevention depends on active whistle-blowing channels, prompt investigation, and visible consequence management to deter recurrence.`
    ),
    divider(),
  ];
}

function buildBCM(data) {
  const bcm       = data.bcmResilience || {};
  const overview  = bcm.overview || {};
  const incidents = bcm.incidents || [];
  const open      = incidents.filter(i=>i.status==="Open"||i.status==="Under Review").length;
  const W = [900,1800,900,1000,900,900,900,826];
  return [
    heading1("6. BCM & Resilience"),
    kpiTable([
      ["BIA Completion",  pct(overview.biaComplete||0),  "",          overview.biaComplete>=80?GREEN:AMBER ],
      ["Plans Tested",    `${overview.plansTested||0}/${overview.plansTotal||0}`, "", GREEN ],
      ["RTO Target",      overview.rto||"N/A",           "",          BLUE  ],
      ["Open Incidents",  String(open),                  "",          open>0?AMBER:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    incidents.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["ID","Type","Date","Severity","Duration","RTO Breached","Status","Resolution"], W),
        ...incidents.map(i => new TableRow({ children:[
          cell(i.id,            { width:W[0], size:16, color:GREEN, bold:true }),
          cell(i.type,          { width:W[1], size:16 }),
          cell(i.date,          { width:W[2], size:16 }),
          cell(i.severity||i.impact||"—",{ width:W[3], size:16, bold:true, color:statusColor(i.severity||i.impact) }),
          cell(i.duration||"—", { width:W[4], size:16 }),
          cell(i.rtoBreached==="Yes"||i.rtoMet===false?"Yes":"No",{ width:W[5], size:16, bold:true, color:i.rtoBreached==="Yes"||i.rtoMet===false?RED:GREEN }),
          cell(i.status||i.resolution||"—",{ width:W[6], size:16 }),
          cell(i.resolution||i.status||"—",{ width:W[7], size:16 }),
        ]})),
      ],
    }) : para("No BCM incidents recorded for this period.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `Business impact analysis is ${pct(overview.biaComplete||0)} complete and ${overview.plansTested||0} of ${overview.plansTotal||0} continuity plans have been tested, with ${open} incident(s) currently open. ` +
      ((overview.biaComplete||0)>=80
        ? `Continuity preparedness is broadly mature, but readiness must be sustained through regular plan testing and post-incident learning. `
        : `BIA completion below 80% leaves residual gaps in continuity preparedness that should be closed before the next cycle. `) +
      `Untested plans and unresolved incidents are the principal resilience risks and warrant scheduled exercising against the organisation's recovery time objectives.`
    ),
    divider(),
  ];
}

function buildAPP(data) {
  const items   = data.appAlignment || data.annualPerformancePlan || [];
  const onTrack = items.filter(a=>["On Track","Complete"].includes(a.status)).length;
  const behind  = items.filter(a=>a.status==="Behind").length;
  const W = [1000,3200,800,800,1000,2226];
  return [
    heading1("7. APP Alignment"),
    kpiTable([
      ["Total Indicators", String(items.length), "",           NAVY  ],
      ["On Track",         String(onTrack),       "",           GREEN ],
      ["Behind Target",    String(behind),         "Require attention", behind>0?RED:GREEN ],
      ["In Progress",      String(items.filter(a=>a.status==="In Progress").length), "", AMBER ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),
    items.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W,
      rows:[
        headerRow(["Ref","Objective","Target","Actual","Quarter","Status"], W),
        ...items.map(a => new TableRow({ children:[
          cell(a.ref,           { width:W[0], size:16, color:BLUE, bold:true }),
          cell(a.objective,     { width:W[1], size:16 }),
          cell(pct(a.target),   { width:W[2], size:16, align:AlignmentType.CENTER }),
          cell(pct(a.actual),   { width:W[3], size:16, align:AlignmentType.CENTER, bold:true, color:Number(a.actual)>=Number(a.target)?GREEN:RED }),
          cell(a.quarter||"—",  { width:W[4], size:16, align:AlignmentType.CENTER }),
          cell(a.status||"—",   { width:W[5], size:16, bold:true, color:statusColor(a.status) }),
        ]})),
      ],
    }) : para("No APP items recorded for this period.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `Of ${items.length} performance indicator(s), ${onTrack} are on track or complete and ${behind} are behind target. ` +
      (behind>0
        ? `Indicators behind target place delivery of the Annual Performance Plan at risk and should be linked to corrective action with revised milestones. `
        : `All indicators are tracking to plan, supporting achievement of the Annual Performance Plan for the period. `) +
      `Performance against the APP is a direct measure of mandate delivery and feeds the organisation's accountability to the Executive Authority and Parliament.`
    ),
    divider(),
  ];
}

function buildCompliance(data) {
  const comp     = data.compliance || {};
  const universe = comp.universe   || [];
  const calendar = comp.calendar   || [];
  const compliant    = universe.filter(u=>u.complianceStatus==="Compliant").length;
  const nonCompliant = universe.filter(u=>u.complianceStatus==="Non-Compliant").length;
  const partial       = universe.filter(u=>u.complianceStatus==="Partial").length;
  const overdueItems  = calendar.filter(c=>c.status==="Overdue" || new Date(c.dueDate)<new Date());
  const upcoming      = calendar.filter(c=>c.status!=="Complete" && !overdueItems.includes(c))
                                  .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,8);

  const W1 = [900,3300,1200,1200,900,1526];
  const W2 = [900,3000,1500,1200,1226];

  return [
    heading1("8. Compliance Management"),
    kpiTable([
      ["Total Legislation", String(universe.length), "",                NAVY  ],
      ["Compliant",          String(compliant),        "",                GREEN ],
      ["Partial",            String(partial),          "",                AMBER ],
      ["Non-Compliant",      String(nonCompliant),     "Require action",  nonCompliant>0?RED:GREEN ],
      ["Overdue Obligations",String(overdueItems.length), "",            overdueItems.length>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("Compliance Universe"),
    universe.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W1,
      rows:[
        headerRow(["ID","Legislation","Category","Owner","Risk","Status"], W1),
        ...universe.map(u => new TableRow({ children:[
          cell(u.id,                { width:W1[0], size:16, color:BLUE, bold:true }),
          cell(u.legislation,       { width:W1[1], size:16 }),
          cell(u.category||"—",    { width:W1[2], size:16 }),
          cell(u.owner||"—",       { width:W1[3], size:16 }),
          cell(u.riskRating||"—",  { width:W1[4], size:16, bold:true, color:u.riskRating==="High"?RED:u.riskRating==="Medium"?AMBER:GREEN }),
          cell(u.complianceStatus||"—", { width:W1[5], size:16, bold:true, color:statusColor(u.complianceStatus) }),
        ]})),
      ],
    }) : para("No compliance universe items recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Upcoming & Overdue Compliance Obligations"),
    (overdueItems.length+upcoming.length)>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W2,
      rows:[
        headerRow(["ID","Obligation","Legislation","Due Date","Status"], W2),
        ...[...overdueItems, ...upcoming].map(c => new TableRow({ children:[
          cell(c.id,            { width:W2[0], size:16, color:AMBER, bold:true }),
          cell(c.obligation,    { width:W2[1], size:16 }),
          cell(c.legislation||"—", { width:W2[2], size:16 }),
          cell(c.dueDate||"—",  { width:W2[3], size:16, bold:overdueItems.includes(c), color:overdueItems.includes(c)?RED:"1F2937" }),
          cell(overdueItems.includes(c)?"Overdue":c.status||"—", { width:W2[4], size:16, bold:true, color:overdueItems.includes(c)?RED:statusColor(c.status) }),
        ]})),
      ],
    }) : para("No upcoming or overdue compliance obligations.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `Across ${universe.length} legislative obligation(s), ${compliant} are compliant, ${partial} partially compliant and ${nonCompliant} non-compliant, with ${overdueItems.length} obligation(s) overdue. ` +
      ((nonCompliant>0||overdueItems.length>0)
        ? `Non-compliant and overdue obligations expose the organisation to regulatory sanction and adverse audit findings, and should be prioritised for remediation with clear accountability. `
        : `The compliance position is sound, with no non-compliant or overdue obligations outstanding. `) +
      `Maintaining compliance against the PFMA, Skills Development Act and King IV is foundational to a clean audit outcome and to the organisation's licence to operate.`
    ),
    divider(),
  ];
}

function projectMetrics(p){
  const budget = Number(p.budget)||0, spent = Number(p.spent)||0;
  const mTotal = Number(p.milestonesTotal)||0, mDone = Number(p.milestonesComplete)||0;
  const milestonePct = mTotal>0 ? Math.round((mDone/mTotal)*100) : 0;
  const spentPct     = budget>0 ? Math.round((spent/budget)*100) : 0;
  const start = new Date(p.startDate), end = new Date(p.endDate), now = new Date();
  const validDates = !isNaN(start) && !isNaN(end) && end>start;
  const elapsedPct = validDates ? Math.min(100, Math.max(0, Math.round(((now-start)/(end-start))*100))) : 0;
  const daysRemaining = !isNaN(end) ? Math.ceil((end-now)/(1000*60*60*24)) : 0;
  const spi = elapsedPct>0 ? +(milestonePct/elapsedPct).toFixed(2) : (milestonePct>0?1.5:1);
  const cpi = spentPct>0 ? +(milestonePct/spentPct).toFixed(2) : (milestonePct>0?1.5:1);
  const isComplete = (p.status||"").toLowerCase().includes("complete");
  const schedStatus = isComplete ? "On Schedule" : spi>=0.95 ? "On Schedule" : spi>=0.75 ? "Slight Delay" : "Delayed";
  const costStatus  = cpi>=0.85 ? "On/Under Budget" : cpi>=0.7 ? "Over Budget" : "Significantly Over";
  const health = Math.round((Math.min(1,spi)*100*0.4) + (Math.min(1,cpi)*100*0.35) + (milestonePct*0.25));
  const healthBand = isComplete ? "Healthy" : health>=75 ? "Healthy" : health>=55 ? "At Risk" : "Critical";
  return { budget, spent, milestonePct, spentPct, elapsedPct, daysRemaining,
           spi, cpi, schedStatus, costStatus, health, healthBand };
}

function buildProjects(data) {
  const pc        = data.projectsContracts || {};
  const projects  = pc.projects  || [];
  const contracts = pc.contracts || [];

  const activeProj   = projects.filter(p=>p.status==="In Progress").length;
  const highRiskProj = projects.filter(p=>p.riskRating==="High").length;
  const totalBudget  = projects.reduce((s,p)=>s+(Number(p.budget)||0),0);
  const totalSpent   = projects.reduce((s,p)=>s+(Number(p.spent)||0),0);
  const atRiskContracts = contracts.filter(c=>
    c.status==="Expiring Soon" || c.renewalStatus==="Review Required" || c.renewalStatus==="Do Not Renew" || Number(c.slaCompliance)<80
  );

  // Performance metrics
  const metrics = projects.map(p=>({ p, m:projectMetrics(p) }));
  const onSchedule = metrics.filter(x=>x.m.schedStatus==="On Schedule").length;
  const delayed    = metrics.filter(x=>x.m.schedStatus==="Delayed").length;
  const overBudget = metrics.filter(x=>x.m.cpi<0.85).length;
  const avgCompletion = metrics.length ? Math.round(metrics.reduce((s,x)=>s+x.m.milestonePct,0)/metrics.length) : 0;
  const critical   = metrics.filter(x=>x.m.healthBand==="Critical").length;

  const W1 = [800,2800,1300,1100,1100,900,1026];
  const W2 = [800,2600,2000,1100,900,1626];
  const W3 = [800,2400,900,1500,900,1300,1226];   // performance table
  const colHealth = b => b==="Healthy"?GREEN : b==="At Risk"?AMBER : RED;
  const colSpi    = s => s>=0.95?GREEN : s>=0.75?AMBER : RED;
  const colCpi    = c => c>=0.85?GREEN : c>=0.7?AMBER : RED;

  return [
    heading1("9. Project & Contract Performance"),
    kpiTable([
      ["Active Projects",    String(activeProj),    "",                NAVY  ],
      ["High Risk Projects", String(highRiskProj),  "",                 highRiskProj>0?RED:GREEN ],
      ["Project Budget",     fmtM(totalBudget),      "",                BLUE  ],
      ["Spent / Committed",  fmtM(totalSpent),       "",                AMBER ],
      ["Contracts at Risk",  String(atRiskContracts.length), "Review required", atRiskContracts.length>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("Portfolio Efficiency Summary"),
    kpiTable([
      ["On Schedule",     String(onSchedule),       "SPI ≥ 0.95",      onSchedule>0?GREEN:GREY ],
      ["Delayed",         String(delayed),           "SPI < 0.75",      delayed>0?RED:GREEN ],
      ["Over Budget",     String(overBudget),        "CPI < 0.85",      overBudget>0?RED:GREEN ],
      ["Avg Completion",  `${avgCompletion}%`,       "milestones",      BLUE ],
      ["Critical Health", String(critical),          "",                critical>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("Project Efficiency Metrics (SPI / CPI / Health)"),
    projects.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W3,
      rows:[
        headerRow(["ID","Project","SPI","Schedule","CPI","Cost Status","Health"], W3),
        ...metrics.map(({p,m}) => new TableRow({ children:[
          cell(p.id,           { width:W3[0], size:16, color:BLUE, bold:true }),
          cell(p.name,          { width:W3[1], size:16 }),
          cell(m.spi.toFixed(2),{ width:W3[2], size:16, align:AlignmentType.CENTER, bold:true, color:colSpi(m.spi) }),
          cell(m.schedStatus,   { width:W3[3], size:16, color:colSpi(m.spi) }),
          cell(m.cpi.toFixed(2),{ width:W3[4], size:16, align:AlignmentType.CENTER, bold:true, color:colCpi(m.cpi) }),
          cell(m.costStatus,    { width:W3[5], size:16, color:colCpi(m.cpi) }),
          cell(`${m.healthBand} (${m.health})`, { width:W3[6], size:16, bold:true, color:colHealth(m.healthBand) }),
        ]})),
      ],
    }) : para("No projects recorded for this period.", { color:GREY }),
    ...analysis(
      `Of ${projects.length} project(s), ${onSchedule} are on schedule, ${delayed} delayed and ${overBudget} tracking over budget. ` +
      `Average milestone completion is ${avgCompletion}%. ${critical} project(s) are in critical health and require management escalation. ` +
      `SPI measures schedule efficiency (milestones delivered vs time elapsed); CPI measures cost efficiency (work delivered vs budget spent).`
    ),

    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    heading2("Project Portfolio"),
    projects.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W1,
      rows:[
        headerRow(["ID","Project","Type","Budget","Spent","Risk","Status"], W1),
        ...projects.map(p => new TableRow({ children:[
          cell(p.id,                { width:W1[0], size:16, color:BLUE, bold:true }),
          cell(p.name,              { width:W1[1], size:16 }),
          cell(p.type||"—",        { width:W1[2], size:16 }),
          cell(fmtM(p.budget),      { width:W1[3], size:16, align:AlignmentType.CENTER }),
          cell(fmtM(p.spent),       { width:W1[4], size:16, align:AlignmentType.CENTER }),
          cell(p.riskRating||"—",  { width:W1[5], size:16, bold:true, color:p.riskRating==="High"?RED:p.riskRating==="Medium"?AMBER:GREEN }),
          cell(p.status||"—",      { width:W1[6], size:16, bold:true, color:statusColor(p.status) }),
        ]})),
      ],
    }) : para("No projects recorded for this period.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Contracts Requiring Attention"),
    atRiskContracts.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W2,
      rows:[
        headerRow(["ID","Contract","Supplier","SLA %","Risk","Renewal Status"], W2),
        ...atRiskContracts.map(c => new TableRow({ children:[
          cell(c.id,                { width:W2[0], size:16, color:AMBER, bold:true }),
          cell(c.title,              { width:W2[1], size:16 }),
          cell(c.supplier||"—",     { width:W2[2], size:16 }),
          cell(`${c.slaCompliance||0}%`, { width:W2[3], size:16, align:AlignmentType.CENTER, bold:true, color:Number(c.slaCompliance)<75?RED:AMBER }),
          cell(c.riskRating||"—",   { width:W2[4], size:16, bold:true, color:c.riskRating==="High"?RED:c.riskRating==="Medium"?AMBER:GREEN }),
          cell(c.renewalStatus||"—",{ width:W2[5], size:16, bold:true, color:c.renewalStatus==="Do Not Renew"?RED:AMBER }),
        ]})),
      ],
    }) : para("No contracts currently flagged for risk or renewal attention.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
  ];
}

function buildIAM(data) {
  const iam        = data.iam || {};
  const users      = iam.users      || [];
  const privileged = iam.privileged || [];
  const reviews    = iam.reviews    || [];

  const activeUsers   = users.filter(u=>u.status==="Active").length;
  const noMFA         = users.filter(u=>!u.mfaEnabled&&u.status==="Active").length;
  const highRiskUsers = users.filter(u=>u.riskRating==="Critical"||u.riskRating==="High").length;
  const expiredPAM    = privileged.filter(p=>p.status==="Expired").length;
  const overdueRev    = reviews.filter(r=>r.status==="Overdue").length;

  const W1 = [800,2200,1200,1100,900,900,1926];
  const W2 = [800,2000,1200,1100,1200,900,826];
  const W3 = [800,2000,1200,1000,1400,1000,626];

  return [
    heading1("10. Identity & Access Management"),
    kpiTable([
      ["Active Users",    String(activeUsers),   "",                    NAVY  ],
      ["No MFA (Active)", String(noMFA),          "Require enrolment",   noMFA>0?RED:GREEN ],
      ["High Risk Users", String(highRiskUsers),  "",                    highRiskUsers>0?AMBER:GREEN ],
      ["PAM Expired",     String(expiredPAM),     "Immediate action",    expiredPAM>0?RED:GREEN ],
      ["Overdue Reviews", String(overdueRev),     "",                    overdueRev>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("User Access — High Risk Accounts"),
    users.filter(u=>u.riskRating==="Critical"||u.riskRating==="High").length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W1,
      rows:[
        headerRow(["ID","Name","Department","Access Level","MFA","Risk","Status"], W1),
        ...users.filter(u=>u.riskRating==="Critical"||u.riskRating==="High").map(u => new TableRow({ children:[
          cell(u.id,           { width:W1[0], size:16, color:BLUE, bold:true }),
          cell(u.name,          { width:W1[1], size:16 }),
          cell(u.department||"—",{ width:W1[2], size:16 }),
          cell(u.accessLevel||"—",{ width:W1[3], size:16 }),
          cell(u.mfaEnabled?"Yes":"No", { width:W1[4], size:16, bold:true, color:u.mfaEnabled?GREEN:RED }),
          cell(u.riskRating||"—",{ width:W1[5], size:16, bold:true, color:u.riskRating==="Critical"||u.riskRating==="High"?RED:AMBER }),
          cell(u.status||"—",  { width:W1[6], size:16, bold:true, color:u.status==="Active"?GREEN:RED }),
        ]})),
      ],
    }) : para("No high risk users recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Privileged Access Accounts (PAM)"),
    privileged.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W2,
      rows:[
        headerRow(["ID","Account","Type","System","Owner","Expiry","Status"], W2),
        ...privileged.map(p => new TableRow({ children:[
          cell(p.id,           { width:W2[0], size:16, color:RED, bold:true }),
          cell(p.account,       { width:W2[1], size:16 }),
          cell(p.type||"—",    { width:W2[2], size:16 }),
          cell(p.system||"—",  { width:W2[3], size:16 }),
          cell(p.owner||"—",   { width:W2[4], size:16 }),
          cell(p.passwordExpiry||"—", { width:W2[5], size:16, bold:true, color:new Date(p.passwordExpiry)<new Date()?RED:AMBER }),
          cell(p.status||"—",  { width:W2[6], size:16, bold:true, color:p.status==="Active"?GREEN:RED }),
        ]})),
      ],
    }) : para("No PAM accounts recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Access Reviews"),
    reviews.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W3,
      rows:[
        headerRow(["ID","System","Reviewer","Cycle","Due Date","Status","Certified"], W3),
        ...reviews.map(r => new TableRow({ children:[
          cell(r.id,           { width:W3[0], size:16, color:BLUE, bold:true }),
          cell(r.system||"—",  { width:W3[1], size:16 }),
          cell(r.reviewer||"—",{ width:W3[2], size:16 }),
          cell(r.reviewCycle||"—",{ width:W3[3], size:16 }),
          cell(r.dueDate||"—", { width:W3[4], size:16, color:r.status==="Overdue"?RED:"1F2937" }),
          cell(r.status||"—",  { width:W3[5], size:16, bold:true, color:statusColor(r.status) }),
          cell(r.certifiedBy||"Pending", { width:W3[6], size:16, color:r.certifiedBy?GREEN:GREY }),
        ]})),
      ],
    }) : para("No access reviews recorded.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    divider(),
  ];
}

function buildPolicy(data) {
  const pm        = data.policyManual || {};
  const policies  = pm.policies  || [];
  const processes = pm.processes || [];
  const documents = pm.documents || [];

  const published  = policies.filter(p=>p.lifecycle==="Published").length;
  const draft      = policies.filter(p=>p.lifecycle==="Draft").length;
  const underRev   = policies.filter(p=>p.lifecycle==="Review").length;
  const overdueRev = [...policies,...processes].filter(d=>d.nextReview&&new Date(d.nextReview)<new Date()&&d.lifecycle==="Published").length;

  const W1 = [800,2600,1400,900,800,1526];
  const W2 = [800,2600,1200,1000,900,1526];

  return [
    heading1("11. Policy & Process Manual"),
    kpiTable([
      ["Policies",       String(policies.length),   "",                NAVY  ],
      ["Published",      String(published),          "",                GREEN ],
      ["Under Review",   String(underRev),           "",                AMBER ],
      ["Draft",          String(draft),              "",                GREY  ],
      ["Overdue Review", String(overdueRev),         "Require attention", overdueRev>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("Policy Register"),
    policies.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W1,
      rows:[
        headerRow(["ID","Policy Title","Category","Owner","Version","Status"], W1),
        ...policies.map(p => new TableRow({ children:[
          cell(p.id,           { width:W1[0], size:16, color:BLUE, bold:true }),
          cell(p.title,         { width:W1[1], size:16 }),
          cell(p.category||"—",{ width:W1[2], size:16 }),
          cell(p.owner||"—",   { width:W1[3], size:16 }),
          cell(p.version||"—", { width:W1[4], size:16 }),
          cell(p.lifecycle||"—",{ width:W1[5], size:16, bold:true, color:p.lifecycle==="Published"?GREEN:p.lifecycle==="Draft"?GREY:AMBER }),
        ]})),
      ],
    }) : para("No policies recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Key Processes"),
    processes.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W2,
      rows:[
        headerRow(["ID","Process Title","Category","Type","Steps","Status"], W2),
        ...processes.map(p => new TableRow({ children:[
          cell(p.id,              { width:W2[0], size:16, color:BLUE, bold:true }),
          cell(p.title,            { width:W2[1], size:16 }),
          cell(p.category||"—",   { width:W2[2], size:16 }),
          cell(p.processType||"—",{ width:W2[3], size:16 }),
          cell(String(p.steps||0),{ width:W2[4], size:16, align:AlignmentType.CENTER }),
          cell(p.lifecycle||"—",  { width:W2[5], size:16, bold:true, color:p.lifecycle==="Published"?GREEN:p.lifecycle==="Draft"?GREY:AMBER }),
        ]})),
      ],
    }) : para("No processes recorded.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `The policy and process library holds ${policies.length} policy(ies), of which ${published} are published, ${draft} in draft and ${underRev} under review, with ${overdueRev} item(s) overdue for review. ` +
      (overdueRev>0
        ? `Policies overdue for review may no longer reflect current legislation or operating practice and should be prioritised for refresh and re-approval. `
        : `The library is current, with no published items overdue for review. `) +
      `A maintained, approved and accessible policy framework underpins consistent decision-making and provides the control baseline against which assurance is performed.`
    ),
    divider(),
  ];
}

function buildInternalAudit(data) {
  const ia          = data.internalAudit || {};
  const plan        = ia.plan        || {};
  const engagements = ia.engagements || [];
  const findings    = ia.findings    || [];
  const followUp    = ia.followUp    || [];

  const totalFindings  = findings.length;
  const openFindings   = findings.filter(f=>f.status==="Open").length;
  const criticalOpen   = findings.filter(f=>f.severity==="Critical"&&f.status==="Open").length;
  const resolved       = findings.filter(f=>f.status==="Resolved"||f.status==="Closed").length;
  const overdueFollowUp= followUp.filter(f=>f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Closed").length;
  const repeatFindings = findings.filter(f=>f.repeatedFinding).length;
  const completeEngs   = engagements.filter(e=>e.status==="Complete").length;

  const W1 = [800,2200,1000,900,900,1000,1226];
  const W2 = [800,2000,900,900,1000,1100,1326];
  const W3 = [800,2000,900,900,900,1726];

  function sevColor(s) {
    if (s==="Critical") return RED;
    if (s==="High")     return AMBER;
    if (s==="Medium")   return BLUE;
    return GREEN;
  }

  return [
    heading1("12. Internal Audit"),
    kpiTable([
      ["Engagements",    String(engagements.length),  "",                  NAVY  ],
      ["Complete",       String(completeEngs),         "",                  GREEN ],
      ["Total Findings", String(totalFindings),        "",                  NAVY  ],
      ["Open Findings",  String(openFindings),         openFindings>0?"Action required":"",  openFindings>0?RED:GREEN ],
      ["Critical Open",  String(criticalOpen),         criticalOpen>0?"URGENT":"",           criticalOpen>0?RED:GREEN ],
      ["Overdue F/U",    String(overdueFollowUp),      overdueFollowUp>0?"Escalate":"",      overdueFollowUp>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

    heading2("Audit Engagements"),
    engagements.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W1,
      rows:[
        headerRow(["ID","Title","Area","Type","Phase","Opinion","Status"], W1),
        ...engagements.map(e => new TableRow({ children:[
          cell(e.id,           { width:W1[0], size:16, color:BLUE, bold:true }),
          cell(e.title,         { width:W1[1], size:15 }),
          cell((e.area||"").split(" ")[0]||"—", { width:W1[2], size:15 }),
          cell(e.type||"—",    { width:W1[3], size:15 }),
          cell(e.phase||"—",   { width:W1[4], size:15 }),
          cell(e.opinion||"Pending", { width:W1[5], size:15, bold:!!e.opinion, color:e.opinion==="Unqualified"?GREEN:e.opinion==="Qualified"?AMBER:e.opinion?RED:GREY }),
          cell(e.status||"—",  { width:W1[6], size:15, bold:true, color:statusColor(e.status) }),
        ]})),
      ],
    }) : para("No engagements recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Findings Register"),
    findings.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W2,
      rows:[
        headerRow(["ID","Title","Category","Severity","Status","Responsible","Due Date"], W2),
        ...findings.map(f => new TableRow({ children:[
          cell(f.id,              { width:W2[0], size:16, color:AMBER, bold:true }),
          cell(f.title,            { width:W2[1], size:15 }),
          cell(f.category||"—",   { width:W2[2], size:15 }),
          cell(f.severity||"—",   { width:W2[3], size:15, bold:true, color:sevColor(f.severity) }),
          cell(f.status||"—",     { width:W2[4], size:15, bold:true, color:f.status==="Resolved"?GREEN:RED }),
          cell(f.responsiblePerson||"—", { width:W2[5], size:15 }),
          cell(f.dueDate||"—",    { width:W2[6], size:15, color:f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Resolved"?RED:"1F2937" }),
        ]})),
      ],
    }) : para("No findings recorded.", { color:GREY }),

    new Paragraph({ spacing:{before:200,after:0}, children:[] }),
    heading2("Follow-up & Implementation Status"),
    followUp.length>0 ? new Table({
      width:{ size:9026, type:WidthType.DXA }, columnWidths:W3,
      rows:[
        headerRow(["ID","Finding","Due Date","Status","Review Date","Progress Note"], W3),
        ...followUp.map(f => {
          const isOverdue = f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Closed";
          return new TableRow({ children:[
            cell(f.id,           { width:W3[0], size:16, color:GREEN, bold:true }),
            cell(f.findingId||"—",{ width:W3[1], size:15, color:BLUE }),
            cell(f.dueDate||"—", { width:W3[2], size:15, color:isOverdue?RED:"1F2937" }),
            cell(f.status||"—",  { width:W3[3], size:15, bold:true, color:f.status==="Closed"?GREEN:f.status==="In Progress"?AMBER:RED }),
            cell(f.reviewDate||"—",{ width:W3[4], size:15 }),
            cell((f.progressNote||"—").slice(0,120), { width:W3[5], size:14 }),
          ]});
        }),
      ],
    }) : para("No follow-up items recorded.", { color:GREY }),
    new Paragraph({ spacing:{before:160,after:0}, children:[] }),
    ...analysis(
      `Internal audit has recorded ${totalFindings} finding(s), with ${openFindings} open (${criticalOpen} critical) and ${resolved} resolved; ${overdueFollowUp} follow-up item(s) are overdue and ${repeatFindings} are repeat finding(s). ` +
      ((criticalOpen>0||overdueFollowUp>0)
        ? `Critical open findings and overdue follow-ups indicate control weaknesses that remain unaddressed and should be escalated to the Audit & Risk Committee for tracking to closure. `
        : `Findings are being closed in line with management commitments, supporting a positive assurance trajectory. `) +
      (repeatFindings>0
        ? `Repeat findings are of particular concern, as they signal that prior remediation has not held and root causes may not have been resolved.`
        : `The absence of repeat findings suggests remediation is addressing root causes effectively.`)
    ),
    divider(),
  ];
}

// ── Report configs ────────────────────────────────────────────────────────────
const REPORT_CONFIGS = {
  excom: {
    title:    "EXCOM Risk Report",
    subtitle: "Executive Committee — Quarterly GRC Update",
    audience: "Executive Committee",
    sections: ["intro","summary","heatmap","toprisks","oprisks","treatments","uifw","projects","conclusion"],
  },
  arc: {
    title:    "ARC Risk Report",
    subtitle: "Audit & Risk Committee — Quarterly GRC Report",
    audience: "Audit & Risk Committee",
    sections: ["intro","summary","heatmap","toprisks","oprisks","treatments","uifw","fraud","bcm","compliance","projects","iam","policy","internalaudit","conclusion"],
  },
  board: {
    title:    "Board GRC Report",
    subtitle: "Board of Directors — Quarterly GRC Overview",
    audience: "Board of Directors",
    sections: ["intro","summary","heatmap","toprisks","oprisks","treatments","uifw","fraud","bcm","app","compliance","projects","iam","policy","internalaudit","conclusion"],
  },
};

// ── Main generator ────────────────────────────────────────────────────────────
async function generateReport(type, data) {
  const config = REPORT_CONFIGS[type];
  if (!config) throw new Error(`Unknown report type: ${type}`);

  const sectionBuilders = {
    intro:      (d)=>buildIntroduction(d, config),
    summary:    buildExecutiveSummary,
    heatmap:    buildHeatmap,
    toprisks:   buildTopRisks,
    treatments: buildTreatmentActions,
    uifw:       buildUIFW,
    fraud:      buildFraud,
    bcm:        buildBCM,
    app:        buildAPP,
    compliance: buildCompliance,
    projects:   buildProjects,
    iam:        buildIAM,
    policy:        buildPolicy,
    internalaudit: buildInternalAudit,
    oprisks:       buildOperationalRisks,
    conclusion:    buildConclusion,
  };

  const children = [
    ...coverPage(config.title, config.subtitle, data),
    ...config.sections.flatMap(s => sectionBuilders[s] ? sectionBuilders[s](data) : []),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font:"Arial", size:20 } } },
    },
    sections: [{
      properties: {
        page: {
          size:   { width:11906, height:16838 },
          margin: { top:1134, right:1134, bottom:1134, left:1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom:{ style:BorderStyle.SINGLE, size:4, color:BLUE, space:4 } },
            spacing: { after:120 },
            children: [
              new TextRun({ text:"LGSETA — BJMAPEX GRC Intelligence Center  |  ", font:"Arial", size:16, color:GREY }),
              new TextRun({ text:config.audience, font:"Arial", size:16, bold:true, color:NAVY }),
              new TextRun({ text:"  |  CONFIDENTIAL", font:"Arial", size:16, color:RED }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top:{ style:BorderStyle.SINGLE, size:2, color:"E5E7EB", space:4 } },
            spacing: { before:120 },
            tabStops: [{ type:TabStopType.RIGHT, position:9026 }],
            children: [
              new TextRun({ text:"LGSETA — Confidential", font:"Arial", size:14, color:GREY }),
              new TextRun({ text:"\tPage ", font:"Arial", size:14, color:GREY }),
              new TextRun({ text:" ", font:"Arial", size:14, color:GREY }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}




// ═══════════════════════════════════════════════════════════════════════════════
// QUARTERLY REPORT GENERATOR ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/reports/:type", async (req, res) => {
  const type = req.params.type;
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

app.listen(PORT, () => console.log(`LGSETA GRC Backend running on port ${PORT}`));
// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL RISKS  —  GET / POST / PUT / DELETE
// ───────────────────────────────────────────────────────────────────────────────
// Matches your existing server.js conventions: readData()/writeData(),
// { message, ... } responses, data.<collection> stored in dashboardData.json.
//
// WHERE TO PASTE: anywhere among your other route blocks — e.g. directly BELOW
// the Strategic Risks block (after line ~84) or just ABOVE the final
//   app.listen(PORT, ...)
// line (line ~1261). Do NOT delete anything; this is additive.
//
// No new data file needed — operational risks live under the "operationalRisks"
// key inside your existing data/dashboardData.json.
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/oprisks", (req, res) => {
  try { res.json(readData().operationalRisks || []); }
  catch (e) { res.status(500).json({ message:"Failed to load operational risks", error:e.message }); }
});

app.get("/api/oprisks/:id", (req, res) => {
  try {
    const risk = (readData().operationalRisks || []).find(r => r.id === req.params.id);
    if (!risk) return res.status(404).json({ message:"Operational risk not found" });
    res.json(risk);
  } catch (e) { res.status(500).json({ message:"Failed to load operational risk", error:e.message }); }
});

app.post("/api/oprisks", (req, res) => {
  try {
    const data = readData();
    if (!data.operationalRisks) data.operationalRisks = [];
    if (!req.body.id)   return res.status(400).json({ message:"id is required" });
    if (!req.body.name) return res.status(400).json({ message:"name is required" });
    if (data.operationalRisks.some(r => r.id === req.body.id)) {
      return res.status(409).json({ message:`Operational risk ${req.body.id} already exists` });
    }
    const newRisk = {
      ...req.body,
      inherent: Number(req.body.inherent) || 0,
      residual: Number(req.body.residual) || 0,
      current:  Number(req.body.current)  || 0,
      target:   Number(req.body.target)   || 0,
      createdAt: new Date().toISOString(),
    };
    data.operationalRisks.push(newRisk);
    writeData(data);
    res.json({ message:"Operational risk added", risk:newRisk });
  } catch (e) { res.status(500).json({ message:"Failed to add operational risk", error:e.message }); }
});

app.put("/api/oprisks/:id", (req, res) => {
  try {
    const data = readData();
    const idx  = (data.operationalRisks||[]).findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message:"Operational risk not found" });
    data.operationalRisks[idx] = {
      ...data.operationalRisks[idx],
      ...req.body,
      id: req.params.id,
      inherent: Number(req.body.inherent) || 0,
      residual: Number(req.body.residual) || 0,
      current:  Number(req.body.current)  || 0,
      target:   Number(req.body.target)   || 0,
      updatedAt: new Date().toISOString(),
    };
    writeData(data);
    res.json({ message:"Operational risk updated", risk:data.operationalRisks[idx] });
  } catch (e) { res.status(500).json({ message:"Failed to update operational risk", error:e.message }); }
});

app.delete("/api/oprisks/:id", (req, res) => {
  try {
    const data = readData();
    data.operationalRisks = (data.operationalRisks||[]).filter(r => r.id !== req.params.id);
    writeData(data);
    res.json({ message:"Operational risk deleted" });
  } catch (e) { res.status(500).json({ message:"Failed to delete operational risk", error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUARTERLY REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════


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
