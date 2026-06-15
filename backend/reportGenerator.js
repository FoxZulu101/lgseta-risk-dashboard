// ─── LGSETA Report Generator ──────────────────────────────────────────────────
// Place this file at: backend/reportGenerator.js
// Called by server.js routes: POST /api/reports/:type
// ─────────────────────────────────────────────────────────────────────────────
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
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
    sections: ["summary","toprisks","treatments","uifw","fraud","bcm"],
  },
  board: {
    title:    "Board GRC Report",
    subtitle: "Board of Directors — Quarterly GRC Overview",
    audience: "Board of Directors",
    sections: ["summary","toprisks","treatments","uifw","fraud","bcm","app"],
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
              new PageNumber({ font:"Arial", size:14, color:GREY }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateReport };
