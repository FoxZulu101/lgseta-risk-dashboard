// Data store — flat-file persistence on the Render disk.
// Interim datastore; the target is PostgreSQL (see docs/TARGET-ARCHITECTURE.md).
const fs = require("fs");
const path = require("path");

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

module.exports = { readData, writeData, uploadsDir, dataPath, seedPath, DISK_DIR };
