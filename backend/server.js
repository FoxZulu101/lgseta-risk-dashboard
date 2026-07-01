const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ExcelJS = require("exceljs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security config (all overridable via environment) ─────────────────────────
const JWT_SECRET    = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL     = process.env.TOKEN_TTL || "8h";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 5;
if (!process.env.JWT_SECRET) {
  console.warn("⚠  JWT_SECRET is not set — using an insecure development secret. Set JWT_SECRET before production use.");
}

// Restrict CORS to configured origins. If CORS_ORIGINS is unset we fall back to
// permissive mode (previous behaviour) so the live site keeps working until the
// env var is set — but you SHOULD set it (comma-separated list of origins).
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
if (ALLOWED_ORIGINS.length) {
  app.use(cors({ origin: ALLOWED_ORIGINS }));
} else {
  console.warn("⚠  CORS_ORIGINS not set — allowing all origins. Set CORS_ORIGINS to lock this down.");
  app.use(cors());
}

app.use(helmet());
app.use(express.json({ limit: "2mb" }));

// Rate limiters
const apiLimiter     = rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false });
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20,   standardHeaders: true, legacyHeaders: false, message: { message: "Too many login attempts — try again later" } });
const declareLimiter = rateLimit({ windowMs: 60*60*1000, max: 30,   standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

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
function writeData(data) {
  // Atomic write: serialise to a temp file then rename over the target. rename()
  // is atomic on the same filesystem, so a crash mid-write can never leave a
  // half-written / unparseable data file. (Interim mitigation — the real fix is
  // the move to PostgreSQL.)
  const tmp = dataPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, dataPath);
}

// ── Multer (hardened: random server-side filenames, size + count limits) ──────
// Filenames are generated server-side from random bytes — the client's
// originalname is never used to build the path, which closes the path-traversal
// risk (e.g. "../../etc/x"). Only the extension is derived from it.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    [".xlsx",".xls",".csv"].includes(ext) ? cb(null, true) : cb(new Error("Only Excel/CSV allowed"));
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION & AUTHORISATION  (local accounts — pluggable; Entra ID later)
// ───────────────────────────────────────────────────────────────────────────────
// Users live in data.users = [{ id, username, name, role, passwordHash }].
// Roles: "admin" (full read/write) | "viewer" (read-only, may still generate
// reports). Room is left for finer roles later. On first run an admin is
// bootstrapped from ADMIN_USERNAME / ADMIN_PASSWORD if no users exist. This is
// the AUTH_MODE=local path; it swaps for Entra ID / OIDC at the Azure phase.
// ═══════════════════════════════════════════════════════════════════════════════
function ensureAdmin() {
  try {
    const data = readData();
    if (!Array.isArray(data.users)) data.users = [];
    if (data.users.length === 0) {
      const u = process.env.ADMIN_USERNAME, p = process.env.ADMIN_PASSWORD;
      if (u && p) {
        data.users.push({
          id: "USR-ADMIN", username: u, name: "Administrator", role: "admin",
          passwordHash: bcrypt.hashSync(p, 10), createdAt: new Date().toISOString(),
        });
        writeData(data);
        console.log(`Bootstrapped admin user '${u}'.`);
      } else {
        console.warn("⚠  No users exist and ADMIN_USERNAME/ADMIN_PASSWORD not set — nobody can log in until an admin is created.");
      }
    }
  } catch (e) { console.error("ensureAdmin failed:", e.message); }
}
ensureAdmin();

// Endpoints reachable WITHOUT a token: login, and the public staff declarations
// submit. Everything else under /api requires a valid session.
function isPublicRequest(req) {
  if (req.method === "POST" && req.path === "/api/auth/login")   return true;
  if (req.method === "POST" && req.path === "/api/declarations") return true;
  return false;
}

// Auth gate — runs before every route. Blocks all /api/* traffic that lacks a
// valid Bearer token (except the public endpoints). Viewers are read-only:
// mutating verbs are refused, except POST /api/reports/* (document generation).
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (isPublicRequest(req)) return next();

  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try { req.user = jwt.verify(token, JWT_SECRET); }
  catch (e) { return res.status(401).json({ message: "Invalid or expired session" }); }

  const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
  const isReport   = req.method === "POST" && req.path.startsWith("/api/reports/");
  if (req.user.role === "viewer" && isMutation && !isReport) {
    return res.status(403).json({ message: "Your role is read-only" });
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL  (server-side, append-only)
// ───────────────────────────────────────────────────────────────────────────────
// Records every successful mutating API call into data.auditLog. Runs after the
// auth gate (so req.user is known) and wraps res.json to capture the outcome, so
// individual route handlers need no changes. The Audit Log module reads this.
// ═══════════════════════════════════════════════════════════════════════════════
const AUDIT_MODULES = {
  dashboard:"Dashboard", risks:"Strategic Risks", oprisks:"Operational Risks",
  kris:"KRI Monitoring", treatments:"Treatment Actions", uifw:"UIFW Expenditure",
  opportunities:"Opportunities", appetite:"Risk Appetite", bcm:"BCM Resilience",
  declarations:"Declarations", upload:"Data Import", period:"Reporting Period",
};
function auditModule(p) {
  const seg = (p.split("/")[2] || "").toLowerCase();
  return AUDIT_MODULES[seg] || (seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "System");
}
function auditAction(method) {
  if (method === "POST")   return "Add";
  if (method === "PUT")    return "Edit";
  if (method === "PATCH")  return "Edit";
  if (method === "DELETE") return "Delete";
  return "Change";
}
function auditRecordId(req, body) {
  const parts = req.path.split("/");
  if (parts.length >= 4 && parts[3]) return decodeURIComponent(parts[3]);
  if (body && typeof body === "object") {
    if (body.reference) return String(body.reference);
    if (body.id)        return String(body.id);
    for (const v of Object.values(body)) if (v && typeof v === "object" && !Array.isArray(v) && v.id) return String(v.id);
  }
  return "";
}
function auditEntity(body) {
  if (body && typeof body === "object") {
    for (const v of Object.values(body)) if (v && typeof v === "object" && !Array.isArray(v) && v.id) return v;
  }
  return null;
}
function appendAudit(req, body) {
  const data = readData();
  if (!Array.isArray(data.auditLog)) data.auditLog = [];
  const actor    = (req.user && (req.user.name || req.user.username)) || "Anonymous (public)";
  const role     = (req.user && req.user.role) || "public";
  const module   = auditModule(req.path);
  const action   = auditAction(req.method);
  const recordId = auditRecordId(req, body);
  const ip = (String(req.headers["x-forwarded-for"] || "").split(",")[0].trim())
             || req.ip || (req.socket && req.socket.remoteAddress) || "";
  data.auditLog.push({
    id: "AL-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    action, module, recordId,
    description: `${action} — ${module}${recordId ? " [" + recordId + "]" : ""} by ${actor}`,
    after: auditEntity(body) || body || null,
    meta: { user: actor, role, method: req.method, path: req.path, ip },
  });
  if (data.auditLog.length > 5000) data.auditLog = data.auditLog.slice(-5000);
  writeData(data);
}

// Wraps res.json on mutating requests and logs the entry once the handler
// responds with a 2xx. Blocked/failed requests are not logged.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (req.path === "/api/auth/login") return next();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) appendAudit(req, body);
    } catch (e) { console.error("Audit log failed:", e.message); }
    return origJson(body);
  };
  next();
});

// Login — verifies credentials and returns a signed JWT.
app.post("/api/auth/login", authLimiter, (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: "username and password required" });
    const user = (readData().users || []).find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: TOKEN_TTL }
    );
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ message: "Login failed" }); }
});

// Return the current session (used by the frontend to restore state on reload).
app.get("/api/auth/me", (req, res) => res.json({ user: req.user }));

// ── Public staff declarations submit ──────────────────────────────────────────
// Replaces the old declare.html pattern of GET-then-PUT of the entire datastore.
// This appends ONE validated record server-side and never exposes existing data.
app.post("/api/declarations", declareLimiter, (req, res) => {
  try {
    const b = req.body || {};
    const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
    const employee = clip(b.employee || b.fullName || b.name, 160).trim();
    if (!employee) return res.status(400).json({ message: "Employee name is required" });
    const finVal = (b.financialValue === "" || b.financialValue == null) ? "" : (Number(b.financialValue) || 0);
    const record = {
      id:               b.id || `DEC-${Date.now()}`,
      type:             clip(b.type, 120),
      employee,
      employeeNum:      clip(b.employeeNum, 60),
      department:       clip(b.department, 120),
      jobTitle:         clip(b.jobTitle, 120),
      description:      clip(b.description, 4000),
      relatedParty:     clip(b.relatedParty, 240),
      financialValue:   finVal,
      dateSubmitted:    clip(b.dateSubmitted, 40),
      periodCovered:    clip(b.periodCovered, 60),
      mitigationAction: clip(b.mitigationAction, 2000),
      supportingDocs:   clip(b.supportingDocs, 500),
      dueDate:          clip(b.dueDate, 40),
      notes:            clip(b.notes, 2000),
      riskLevel:        clip(b.riskLevel, 40) || "Medium",
      status:           "Submitted",
      managerReview:    "Pending",
      complianceReview: "Pending",
      approvalStatus:   "Pending",
      submittedVia:     "Staff Intranet Portal",
      createdAt:        new Date().toISOString(),
    };
    const data = readData();
    if (!Array.isArray(data.declarations)) data.declarations = [];
    data.declarations.push(record);
    writeData(data);
    res.json({ message: "Declaration submitted", reference: record.id });
  } catch (e) { res.status(500).json({ message: "Submission failed" }); }
});

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

app.get("/api/templates/:type", async (req, res) => {
  const tmpl = TEMPLATES[req.params.type];
  if (!tmpl) return res.status(404).json({ message:"Template not found" });
  try {
    const buf = await buildTemplateBuffer(tmpl, req.params.type.toUpperCase());
    res.setHeader("Content-Disposition", `attachment; filename=LGSETA_${req.params.type}_template.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e) {
    console.error("Template generation error:", e);
    res.status(500).json({ message:"Template generation failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/upload/:type", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message:"No file uploaded" });
    const rows = await parseSheetToJson(req.file.path);
    if (!rows.length) { fs.unlinkSync(req.file.path); return res.status(400).json({ message:"File is empty" }); }

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
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    console.error("Upload error:", e);
    res.status(500).json({ message:"Upload failed" });
  }
});

// ── Report generation lives in ./reportGenerator.js ─────────────────────────
const { generateReport } = require("./reportGenerator");

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

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`LGSETA GRC Backend running on port ${PORT}`));
