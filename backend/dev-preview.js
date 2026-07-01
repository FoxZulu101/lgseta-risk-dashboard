// Dev-only launcher for the local preview panel (.claude/launch.json).
// Sets safe local defaults, then starts the real server. NEVER used in production
// (production sets these via real environment variables / secrets).
const path = require("path");
process.env.PORT           = process.env.PORT           || "5099";
process.env.DATA_DIR       = process.env.DATA_DIR       || path.join(__dirname, ".preview-data");
process.env.JWT_SECRET     = process.env.JWT_SECRET     || "local-preview-secret";
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
process.env.CORS_ORIGINS   = process.env.CORS_ORIGINS   || "http://localhost:5173,http://127.0.0.1:5173";
require("./server.js");
