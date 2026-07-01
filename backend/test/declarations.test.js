const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { startServer, login } = require("./server-harness");

let srv, token;
before(async () => { srv = await startServer(); token = await login(srv.base); });
after(async () => { await srv.stop(); });

const authed = () => ({ Authorization: "Bearer " + token });
const getDashboard = async () => (await fetch(srv.base + "/api/dashboard", { headers: authed() })).json();

test("a public declaration appends one record without exposing/overwriting the store", async () => {
  const before = await getDashboard();
  const r = await fetch(srv.base + "/api/declarations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee: "Jane Doe", type: "Gift", description: "Test", department: "ICT" }),
  });
  assert.equal(r.status, 200);
  assert.ok((await r.json()).reference, "returns a reference");

  const after = await getDashboard();
  assert.equal((after.declarations || []).length, (before.declarations || []).length + 1, "one record added");
  assert.equal(after.risks.length, before.risks.length, "rest of the store is untouched");
});

test("a declaration with no employee name is rejected (400)", async () => {
  const r = await fetch(srv.base + "/api/declarations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "no name here" }),
  });
  assert.equal(r.status, 400);
});

test("declaration fields are length-clipped (no unbounded input)", async () => {
  const huge = "x".repeat(10000);
  await fetch(srv.base + "/api/declarations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee: "Big Input", description: huge }),
  });
  const after = await getDashboard();
  const rec = (after.declarations || []).find(d => d.employee === "Big Input");
  assert.ok(rec);
  assert.ok(rec.description.length <= 4000, "description is clipped to <= 4000 chars");
});
