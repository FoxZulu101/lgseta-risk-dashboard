// Exercises the exceljs path end-to-end (the replacement for the retired `xlsx`):
// download a template, and round-trip an upload back into the datastore.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const ExcelJS = require("exceljs");
const { startServer, login } = require("./server-harness");

let srv, token;
before(async () => { srv = await startServer(); token = await login(srv.base); });
after(async () => { await srv.stop(); });

const authed = () => ({ Authorization: "Bearer " + token });

test("template download is a valid .xlsx", async () => {
  const r = await fetch(srv.base + "/api/templates/risks", { headers: authed() });
  assert.equal(r.status, 200);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.ok(buf.length > 500 && buf[0] === 0x50 && buf[1] === 0x4b, "PK/zip header");
});

test("unknown template type → 404", async () => {
  assert.equal((await fetch(srv.base + "/api/templates/nope", { headers: authed() })).status, 404);
});

test("upload round-trips: a generated .xlsx is imported and numerically coerced", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("RISKS");
  ws.addRow(["id", "title", "category", "inherentRating", "residualRating", "currentRating", "targetRating", "currentStatus"]);
  ws.addRow(["SR-TEST", "Unit Test Risk", "Strategic Risk", 20, 15, 15, 8, "Outside Tolerance"]);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  const form = new FormData();
  form.append("file", new Blob([buf]), "risks.xlsx");
  const up = await fetch(srv.base + "/api/upload/risks", { method: "POST", headers: authed(), body: form });
  assert.equal(up.status, 200);
  const result = await up.json();
  assert.equal(result.total, 1);
  assert.equal(result.added, 1);

  const risks = await (await fetch(srv.base + "/api/risks", { headers: authed() })).json();
  const found = risks.find(x => x.id === "SR-TEST");
  assert.ok(found, "imported risk is present");
  assert.strictEqual(found.inherentRating, 20, "numeric field coerced to Number");
  assert.equal(found.currentStatus, "Outside Tolerance");
});

test("upload requires a file (400)", async () => {
  const up = await fetch(srv.base + "/api/upload/risks", { method: "POST", headers: authed(), body: new FormData() });
  assert.equal(up.status, 400);
});
