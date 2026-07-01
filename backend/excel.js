// Spreadsheet templates + parsing (exceljs — replaces the unmaintained xlsx).
const path = require("path");
const ExcelJS = require("exceljs");

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

// ── Spreadsheet helpers (exceljs — replaces the unmaintained `xlsx`) ───────────
async function buildTemplateBuffer(tmpl, sheetName) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(tmpl.headers);
  ws.addRow(tmpl.sample);
  tmpl.headers.forEach((_, i) => { ws.getColumn(i + 1).width = 22; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Parse the first worksheet of an .xlsx/.csv file into an array of row objects
// keyed by the header row — the shape the import logic below expects.
async function parseSheetToJson(filePath) {
  const wb = new ExcelJS.Workbook();
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") await wb.csv.readFile(filePath);
  else                await wb.xlsx.readFile(filePath);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const cellText = (v) => {
    if (v == null) return "";
    if (typeof v === "object") {
      if (v.text !== undefined)             return v.text;                 // hyperlink
      if (v.result !== undefined)           return v.result;              // formula
      if (Array.isArray(v.richText))        return v.richText.map(t => t.text).join("");
      if (v instanceof Date)                return v.toISOString().slice(0, 10);
      return String(v);
    }
    return v;
  };

  let headers = null;
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    const values = row.values; // 1-indexed; index 0 is empty
    if (rowNumber === 1) {
      headers = values.map(h => (h == null ? "" : String(cellText(h)).trim()));
      return;
    }
    if (!headers) return;
    const obj = {};
    let hasValue = false;
    for (let c = 1; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const val = cellText(values[c]);
      if (val !== "" && val !== undefined && val !== null) hasValue = true;
      obj[key] = val === undefined ? "" : val;
    }
    if (hasValue) rows.push(obj);
  });
  return rows;
}

module.exports = { TEMPLATES, buildTemplateBuffer, parseSheetToJson };
