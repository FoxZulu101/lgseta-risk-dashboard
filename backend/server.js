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
    divider(),
  ];
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

  const W1 = [800,2800,1300,1100,1100,900,1026];
  const W2 = [800,2600,2000,1100,900,1626];

  return [
    heading1("9. Project & Contract Risk"),
    kpiTable([
      ["Active Projects",    String(activeProj),                          NAVY  ],
      ["High Risk Projects", String(highRiskProj),                         highRiskProj>0?RED:GREEN ],
      ["Project Budget",     fmtM(totalBudget),                            BLUE  ],
      ["Spent / Committed",  fmtM(totalSpent),                             AMBER ],
      ["Contracts at Risk",  String(atRiskContracts.length),               atRiskContracts.length>0?RED:GREEN ],
    ]),
    new Paragraph({ spacing:{before:160,after:160}, children:[] }),

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

// ── Report configs ────────────────────────────────────────────────────────────
const REPORT_CONFIGS = {
  excom: {
    title:    "EXCOM Risk Report",
    subtitle: "Executive Committee — Quarterly GRC Update",
    audience: "Executive Committee",
    sections: ["summary","toprisks","treatments","uifw"],
  },
  arc: {
    title:    "ARC Risk Report",
    subtitle: "Audit & Risk Committee — Quarterly GRC Report",
    audience: "Audit & Risk Committee",
    sections: ["summary","toprisks","treatments","uifw","fraud","bcm","compliance","projects"],
  },
  board: {
    title:    "Board GRC Report",
    subtitle: "Board of Directors — Quarterly GRC Overview",
    audience: "Board of Directors",
    sections: ["summary","toprisks","treatments","uifw","fraud","bcm","app","compliance","projects"],
  },
};

// ── Main generator ────────────────────────────────────────────────────────────
async function generateReport(type, data) {
  const config = REPORT_CONFIGS[type];
  if (!config) throw new Error(`Unknown report type: ${type}`);

  const sectionBuilders = {
    summary:    buildExecutiveSummary,
    toprisks:   buildTopRisks,
    treatments: buildTreatmentActions,
    uifw:       buildUIFW,
    fraud:      buildFraud,
    bcm:        buildBCM,
    app:        buildAPP,
    compliance: buildCompliance,
    projects:   buildProjects,
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
