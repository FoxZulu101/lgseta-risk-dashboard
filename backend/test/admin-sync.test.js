// Verifies the bootstrap admin's credentials track ADMIN_USERNAME/ADMIN_PASSWORD:
// created on first boot, and re-synced when those env vars change on a later boot
// (both boots share the same DATA_DIR, i.e. the same persistent disk).
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { startServer } = require("./server-harness");

const login = (base, username, password) =>
  fetch(base + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

test("admin credentials re-sync from env on the next deploy", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lgseta-sync-"));
  try {
    // First deploy: admin 'boss' / 'first-pass'
    const s1 = await startServer({ DATA_DIR: dir, ADMIN_USERNAME: "boss", ADMIN_PASSWORD: "first-pass" });
    assert.equal((await login(s1.base, "boss", "first-pass")).status, 200, "logs in with the first password");
    await s1.stop();

    // Second deploy, SAME disk, changed password
    const s2 = await startServer({ DATA_DIR: dir, ADMIN_USERNAME: "boss", ADMIN_PASSWORD: "second-pass" });
    assert.equal((await login(s2.base, "boss", "first-pass")).status, 401, "old password no longer works");
    assert.equal((await login(s2.base, "boss", "second-pass")).status, 200, "new password works after re-sync");

    // Third deploy, SAME disk, changed username too
    await s2.stop();
    const s3 = await startServer({ DATA_DIR: dir, ADMIN_USERNAME: "chief", ADMIN_PASSWORD: "second-pass" });
    assert.equal((await login(s3.base, "chief", "second-pass")).status, 200, "new username works after re-sync");
    await s3.stop();
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});
