const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { startServer, login } = require("./server-harness");

let srv, token;
before(async () => { srv = await startServer(); token = await login(srv.base); });
after(async () => { await srv.stop(); });

const authed = () => ({ Authorization: "Bearer " + token, "Content-Type": "application/json" });
const auditLog = async () => ((await (await fetch(srv.base + "/api/dashboard", { headers: authed() })).json()).auditLog || []);

test("a successful create is recorded with actor, module and record id", async () => {
  await fetch(srv.base + "/api/risks", { method: "POST", headers: authed(), body: JSON.stringify({ id: "SR-AUDIT", title: "Audit test risk" }) });
  const log = await auditLog();
  const entry = log.find(e => e.recordId === "SR-AUDIT");
  assert.ok(entry, "an entry was written");
  assert.equal(entry.action, "Add");
  assert.equal(entry.module, "Strategic Risks");
  assert.ok(entry.meta.user, "records the acting user");
  assert.equal(entry.meta.role, "admin");
  assert.ok(entry.timestamp, "has a timestamp");
});

test("a delete is recorded", async () => {
  await fetch(srv.base + "/api/risks/SR-AUDIT", { method: "DELETE", headers: authed() });
  const log = await auditLog();
  assert.ok(log.some(e => e.action === "Delete" && e.recordId === "SR-AUDIT"), "delete recorded");
});

test("a public declaration is recorded as an anonymous actor", async () => {
  await fetch(srv.base + "/api/declarations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee: "Audit Person", type: "Gift", description: "x" }) });
  const log = await auditLog();
  const entry = log.filter(e => e.module === "Declarations").pop();
  assert.ok(entry, "declaration recorded");
  assert.equal(entry.meta.user, "Anonymous (public)");
});

test("reads do not create audit entries", async () => {
  const before = (await auditLog()).length;
  await fetch(srv.base + "/api/risks", { headers: authed() });
  await fetch(srv.base + "/api/dashboard", { headers: authed() });
  assert.equal((await auditLog()).length, before, "GETs are not logged");
});

test("a blocked (viewer) mutation is not logged", async () => {
  const jwt = require("jsonwebtoken");
  const vt = jwt.sign({ sub: "v", username: "vuser", role: "viewer" }, "test-secret", { expiresIn: "1h" });
  const before = (await auditLog()).length;
  const r = await fetch(srv.base + "/api/risks", { method: "POST", headers: { Authorization: "Bearer " + vt, "Content-Type": "application/json" }, body: JSON.stringify({ id: "SR-BLOCKED" }) });
  assert.equal(r.status, 403);
  assert.equal((await auditLog()).length, before, "blocked write is not logged");
});
