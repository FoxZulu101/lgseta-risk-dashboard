const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { startServer, login } = require("./server-harness");

let srv, token;
before(async () => { srv = await startServer(); token = await login(srv.base); });
after(async () => { await srv.stop(); });

test("rejects an unknown report type (400)", async () => {
  const r = await fetch(srv.base + "/api/reports/nope", { method: "POST", headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 400);
});

for (const type of ["excom", "arc", "board"]) {
  test(`generates a valid ${type.toUpperCase()} .docx`, async () => {
    const r = await fetch(srv.base + `/api/reports/${type}`, { method: "POST", headers: { Authorization: "Bearer " + token } });
    assert.equal(r.status, 200);
    assert.ok((r.headers.get("content-type") || "").includes("wordprocessingml"), "docx content-type");
    const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(buf.length > 1000, "non-trivial size");
    assert.ok(buf[0] === 0x50 && buf[1] === 0x4b, "PK/zip header (valid Office file)");
  });
}
