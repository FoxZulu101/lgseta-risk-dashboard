const { test, before, after } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { startServer, login } = require("./server-harness");

let srv, token;
before(async () => { srv = await startServer(); token = await login(srv.base); });
after(async () => { await srv.stop(); });

test("unauthenticated read is blocked (401)", async () => {
  assert.equal((await fetch(srv.base + "/api/dashboard")).status, 401);
});

test("login rejects a bad password (401)", async () => {
  const r = await fetch(srv.base + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrong" }),
  });
  assert.equal(r.status, 401);
});

test("login with correct credentials returns a token + admin role", async () => {
  const r = await fetch(srv.base + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Passw0rd!" }),
  });
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(typeof b.token, "string");
  assert.equal(b.user.role, "admin");
});

test("authenticated read returns data", async () => {
  const r = await fetch(srv.base + "/api/dashboard", { headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray((await r.json()).risks));
});

test("mutation without a token is blocked (401)", async () => {
  const r = await fetch(srv.base + "/api/risks", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(r.status, 401);
});

test("a garbage token is rejected (401)", async () => {
  const r = await fetch(srv.base + "/api/dashboard", { headers: { Authorization: "Bearer garbage" } });
  assert.equal(r.status, 401);
});

test("viewer role is read-only but may still generate reports", async () => {
  const vt = jwt.sign({ sub: "v", username: "v", role: "viewer" }, "test-secret", { expiresIn: "1h" });
  const vH = { Authorization: "Bearer " + vt };
  assert.equal((await fetch(srv.base + "/api/risks", { headers: vH })).status, 200, "viewer can read");
  assert.equal((await fetch(srv.base + "/api/risks/x", {
    method: "PUT", headers: { ...vH, "Content-Type": "application/json" }, body: "{}",
  })).status, 403, "viewer cannot write");
  assert.equal((await fetch(srv.base + "/api/reports/excom", { method: "POST", headers: vH })).status, 200, "viewer can report");
});
