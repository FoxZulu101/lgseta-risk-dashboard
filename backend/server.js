const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, "data", "dashboardData.json");

function readDashboardData() {
  const rawData = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(rawData);
}

function writeDashboardData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

app.get("/", (req, res) => {
  res.send("LGSETA Integrated Risk Dashboard Backend is running.");
});

app.get("/api/dashboard", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load dashboard data",
      error: error.message
    });
  }
});

app.get("/api/risks", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data.risks || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load risks",
      error: error.message
    });
  }
});

app.get("/api/kris", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data.kris || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load KRIs",
      error: error.message
    });
  }
});

app.get("/api/opportunities", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data.opportunityRisks || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load opportunity risks",
      error: error.message
    });
  }
});

app.get("/api/appetite", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data.appetiteDashboard || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load appetite dashboard",
      error: error.message
    });
  }
});

app.get("/api/treatments", (req, res) => {
  try {
    const data = readDashboardData();
    res.json(data.treatmentActions || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load treatment actions",
      error: error.message
    });
  }
});

app.put("/api/dashboard", (req, res) => {
  try {
    const updatedData = req.body;
    writeDashboardData(updatedData);

    res.json({
      message: "Dashboard data updated successfully",
      data: updatedData
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update dashboard data",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`LGSETA Risk Dashboard backend running on http://localhost:${PORT}`);
});