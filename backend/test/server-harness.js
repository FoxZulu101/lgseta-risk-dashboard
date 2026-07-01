// Shared test harness: boots the real server on a throwaway datastore and an
// ephemeral port, then tears it down. Used by the *.test.js suites.
// Run the suite with a modern Node (v18+): `npm test`.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function startServer(extraEnv = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "lgseta-test-"));
  const port = 20000 + Math.floor(Math.random() * 15000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      JWT_SECRET: "test-secret",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "Passw0rd!",
      CORS_ORIGINS: "",
      ...extraEnv,
    },
  });
  let logs = "";
  child.stdout.on("data", d => (logs += d));
  child.stderr.on("data", d => (logs += d));

  const base = `http://127.0.0.1:${port}`;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let up = false;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(base + "/"); if (r.ok) { up = true; break; } } catch (e) {}
    await sleep(100);
  }
  if (!up) { child.kill(); throw new Error("server did not start:\n" + logs); }

  const stop = () => new Promise(res => {
    child.on("exit", () => { try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) {} res(); });
    child.kill();
  });
  return { base, stop, port, dataDir, logs: () => logs };
}

async function login(base, username = "admin", password = "Passw0rd!") {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("login failed: " + r.status);
  return (await r.json()).token;
}

module.exports = { startServer, login };
