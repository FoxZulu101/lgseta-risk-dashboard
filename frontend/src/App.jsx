import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://lgseta-risk-dashboard.onrender.com/api";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#0a0f1e",
  surface: "#111827",
  card: "#1a2235",
  border: "#1e2d45",
  accent: "#00d4ff",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  text: "#f1f5f9",
  muted: "#64748b",
  sub: "#94a3b8",
};

// ─── HELPERS ─────────────────────────────────────────────────────
const fmt = (n) => n >= 1000000 ? `R${(n/1000000).toFixed(1)}M` : n >= 1000 ? `R${(n/1000).toFixed(0)}K` : `R${n}`;
const statusColor = (s) => s === "Red" ? C.red : s === "Amber" ? C.amber : s === "Green" ? C.green : C.muted;
const trendIcon = (t) => t === "Declining" || t === "declining" ? "📉" : t === "Improving" || t === "improving" ? "📈" : "➡️";

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────
function Badge({ label, color }) {
  const bg = color === "red" ? "#7f1d1d" : color === "amber" ? "#78350f" : color === "green" ? "#064e3b" : color === "blue" ? "#1e3a5f" : "#1e293b";
  const fg = color === "red" ? C.red : color === "amber" ? C.amber : color === "green" ? C.green : color === "blue" ? C.blue : C.sub;
  return <span style={{ background: bg, color: fg, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
}

function StatusDot({ status }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: statusColor(status), marginRight: 6, boxShadow: `0 0 6px ${statusColor(status)}` }} />;
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160, borderTop: `3px solid ${color || C.accent}` }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || C.text }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, ...style }}>{children}</div>;
}

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ background: "#1e293b", borderRadius: 999, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color || C.accent, borderRadius: 999, transition: "width 0.6s ease" }} />
    </div>
  );
}

function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  const r = 50, cx = 60, cy = 60, sw = 18;
  const circ = 2 * Math.PI * r;
  const segs = data.map(d => {
    const dash = (d.value / total) * circ;
    const off = circ - cum;
    cum += dash;
    return { ...d, dash, off };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
        {segs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
            strokeWidth={sw} strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={s.off} style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={C.text}>{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill={C.muted}>Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: C.sub }}>{d.name}</span>
            <span style={{ fontWeight: 700, color: d.color, marginLeft: "auto", paddingLeft: 12 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapCell({ value, label }) {
  const color = value >= 20 ? C.red : value >= 15 ? "#f97316" : value >= 10 ? C.amber : value >= 6 ? "#84cc16" : C.green;
  return (
    <div style={{ background: color + "22", border: `1px solid ${color}44`, borderRadius: 8, padding: "10px 8px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      {label && <div style={{ fontSize: 9, color: C.sub, marginTop: 2, lineHeight: 1.2 }}>{label}</div>}
    </div>
  );
}

// ─── NAVIGATION ──────────────────────────────────────────────────
const NAV = [
  { id: "overview", label: "Executive Overview", icon: "🏛️" },
  { id: "appetite", label: "Risk Appetite", icon: "⚖️" },
  { id: "risks", label: "Strategic Risks", icon: "🛡️" },
  { id: "kris", label: "KRI Monitoring", icon: "📡" },
  { id: "opportunities", label: "Opportunities", icon: "💡" },
  { id: "emerging", label: "Emerging Risks", icon: "🌐" },
  { id: "treatments", label: "Treatment Actions", icon: "🔧" },
  { id: "assurance", label: "Combined Assurance", icon: "✅" },
  { id: "bcm", label: "BCM Resilience", icon: "🔄" },
  { id: "fraud", label: "Fraud & Ethics", icon: "⚖️" },
  { id: "departments", label: "Departmental Risks", icon: "🏢" },
  { id: "uifw", label: "UIFW Expenditure", icon: "🚨" },
  { id: "thirdparty", label: "Third-Party Risk", icon: "🤝" },
  { id: "app", label: "APP Alignment", icon: "🎯" },
  { id: "predictive", label: "Predictive Intel", icon: "🤖" },
];

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    axios.get(`${API}/dashboard`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Backend connection failed. Please ensure the server is running."); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: C.bg, color: C.accent, fontFamily: "Segoe UI, sans-serif", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>🛡️</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Loading LGSETA — BJMAPEX GRC Intelligence Center...</div>
      <div style={{ width: 200, height: 3, background: C.border, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: "60%", height: "100%", background: C.accent, borderRadius: 999, animation: "none" }} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: C.bg, color: C.red, fontFamily: "Segoe UI, sans-serif", textAlign: "center", padding: 32 }}>
      <div><div style={{ fontSize: 48 }}>⚠️</div><div style={{ marginTop: 16 }}>{error}</div></div>
    </div>
  );

  const s = data.summary;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif", background: C.bg, color: C.text, overflow: "hidden" }}>

      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 240 : 64, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", transition: "width 0.3s ease", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🛡️</div>
          {sidebarOpen && <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>LGSETA — BJMAPEX</div><div style={{ fontSize: 10, color: C.muted }}>GRC Intelligence Center</div></div>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px",
              background: activeTab === n.id ? C.accent + "22" : "none", border: "none",
              borderLeft: activeTab === n.id ? `3px solid ${C.accent}` : "3px solid transparent",
              color: activeTab === n.id ? C.accent : C.sub, cursor: "pointer", fontSize: 13,
              fontWeight: activeTab === n.id ? 600 : 400, textAlign: "left", transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              {sidebarOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: 16, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, borderTop: `1px solid ${C.border}` }}>
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TOP BAR */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{NAV.find(n => n.id === activeTab)?.label}</div>
            <div style={{ fontSize: 12, color: C.muted }}>Reporting Period: {data.reportingPeriod.currentPeriod} | Report Date: {data.reportingPeriod.reportDate}</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              🔴 {s.outsideTolerance} Outside Tolerance
            </div>
            <div style={{ background: C.amber + "22", color: C.amber, border: `1px solid ${C.amber}44`, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              ⚠️ {s.treatmentOverdue} Overdue Actions
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Next Review: {data.reportingPeriod.nextReview}</div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

          {/* ── EXECUTIVE OVERVIEW ── */}
          {activeTab === "overview" && <OverviewTab data={data} s={s} />}
          {activeTab === "appetite" && <AppetiteTab data={data} />}
          {activeTab === "risks" && <RisksTab data={data} />}
          {activeTab === "kris" && <KrisTab data={data} />}
          {activeTab === "opportunities" && <OpportunitiesTab data={data} />}
          {activeTab === "emerging" && <EmergingTab data={data} />}
          {activeTab === "treatments" && <TreatmentsTab data={data} />}
          {activeTab === "assurance" && <AssuranceTab data={data} />}
          {activeTab === "bcm" && <BCMTab data={data} />}
          {activeTab === "fraud" && <FraudTab data={data} />}
          {activeTab === "departments" && <DepartmentsTab data={data} />}
          {activeTab === "uifw" && <UIFWTab data={data} />}
          {activeTab === "thirdparty" && <ThirdPartyTab data={data} />}
          {activeTab === "app" && <APPTab data={data} />}
          {activeTab === "predictive" && <PredictiveTab data={data} />}

        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────
function OverviewTab({ data, s }) {
  const statusData = [
    { name: "Outside Tolerance", value: s.outsideTolerance, color: C.red },
    { name: "Within Tolerance", value: s.withinTolerance, color: C.amber },
    { name: "Within Appetite", value: s.withinAppetite, color: C.green },
  ];
  const controlData = [
    { name: "Effective", value: s.effectiveControls, color: C.green },
    { name: "Partially Effective", value: s.partiallyEffectiveControls, color: C.amber },
    { name: "Ineffective", value: s.ineffectiveControls, color: C.red },
  ];
  const heatmap = [
    [25,20,15,10,5],[20,16,12,8,4],[15,12,9,6,3],[10,8,6,4,2],[5,4,3,2,1]
  ];
  const riskPositions = data.risks.map(r => ({ id: r.id, x: Math.min(Math.floor(r.inherentRating / 5), 4), y: Math.min(Math.floor(r.inherentRating / 5), 4), rating: r.currentRating, status: r.currentStatus }));

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Risks" value={s.totalRisks} icon="🛡️" color={C.accent} sub={`+${s.emergingRisks} Emerging`} />
        <KpiCard label="Outside Tolerance" value={s.outsideTolerance} icon="🚨" color={C.red} sub="Immediate action required" />
        <KpiCard label="Treatment Completion" value={`${s.treatmentCompletion}%`} icon="✅" color={C.green} sub={`${s.treatmentDone} of ${s.treatmentTotal} actions`} />
        <KpiCard label="Overall Risk Exposure" value={s.overallRiskExposure} icon="📊" color={C.amber} sub={`↓ ${(s.previousRiskExposure - s.overallRiskExposure).toFixed(1)} from last period`} />
        <KpiCard label="Material Findings" value={s.materialFindings} icon="📋" color={C.purple} sub="From assurance reviews" />
        <KpiCard label="UIFW Exposure" value={fmt(data.uifwExpenditure.summary.grandTotal)} icon="⚠️" color={C.red} sub={`${data.uifwExpenditure.summary.openCases} open cases`} />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Risk Heatmap */}
        <Card style={{ flex: 2, minWidth: 280 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Risk Heatmap — Inherent Risk Matrix</div>
          <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
            {["Very High","High","Medium","Low","Negligible"].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: C.muted, width: 55, textAlign: "right", paddingRight: 8 }}>{row}</span>
                {heatmap[i].map((val, j) => (
                  <HeatmapCell key={j} value={val} label={data.risks.find(r => Math.round(r.currentRating) === val)?.id} />
                ))}
              </div>
            ))}
            <div style={{ display: "flex", gap: 4, marginLeft: 63 }}>
              {["Rare","Unlikely","Possible","Likely","Almost Certain"].map((l, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: C.muted }}>{l}</div>
              ))}
            </div>
          </div>
        </Card>

        {/* Risk Status Donut */}
        <Card style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Risk Status Breakdown</div>
          <DonutChart data={statusData} />
        </Card>

        {/* Top 5 Risks */}
        <Card style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Top 5 Critical Risks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.risks.sort((a, b) => b.currentRating - a.currentRating).slice(0, 5).map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{r.id}</div>
                  <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: statusColor(r.currentStatus) }}>{r.currentRating}</span>
                  <Badge label={r.tolerance} color={r.currentStatus === "Red" ? "red" : r.currentStatus === "Amber" ? "amber" : "green"} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Treatment Progress */}
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Treatment Progress</div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <svg width={120} height={120} viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto" }}>
              <circle cx={60} cy={60} r={50} fill="none" stroke="#1e293b" strokeWidth={14} />
              <circle cx={60} cy={60} r={50} fill="none" stroke={C.green} strokeWidth={14}
                strokeDasharray={`${(s.treatmentCompletion / 100) * 314} 314`}
                strokeDashoffset={78.5} strokeLinecap="round" />
              <text x={60} y={56} textAnchor="middle" fontSize="20" fontWeight="800" fill={C.text}>{s.treatmentCompletion}%</text>
              <text x={60} y={72} textAnchor="middle" fontSize="10" fill={C.muted}>Completion</text>
            </svg>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[{ label: "Done", value: s.treatmentDone, color: C.green }, { label: "Active", value: s.treatmentActive, color: C.accent }, { label: "Overdue", value: s.treatmentOverdue, color: C.red }].map(i => (
              <div key={i.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: i.color }}>{i.value}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{i.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Control Effectiveness */}
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Control Effectiveness</div>
          <DonutChart data={controlData} size={120} />
        </Card>

        {/* UIFW Summary */}
        <Card style={{ flex: 1, minWidth: 220, borderTop: `3px solid ${C.red}` }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.red }}>🚨 UIFW Expenditure</div>
          {[
            { label: "Unauthorised", value: data.uifwExpenditure.summary.totalUnauthorised, color: C.red },
            { label: "Irregular", value: data.uifwExpenditure.summary.totalIrregular, color: "#f97316" },
            { label: "Fruitless", value: data.uifwExpenditure.summary.totalFruitless, color: C.amber },
            { label: "Wasteful", value: data.uifwExpenditure.summary.totalWasteful, color: C.purple },
          ].map(i => (
            <div key={i.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.sub }}>{i.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: i.color }}>{fmt(i.value)}</span>
              </div>
              <ProgressBar value={i.value} max={data.uifwExpenditure.summary.grandTotal} color={i.color} />
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: C.muted }}>Total UIFW</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{fmt(data.uifwExpenditure.summary.grandTotal)}</span>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Quick Actions Required</div>
          {[
            { label: "Outside Tolerance Risks", value: s.outsideTolerance, color: C.red, icon: "🚨" },
            { label: "Overdue Actions", value: s.treatmentOverdue, color: C.red, icon: "⏰" },
            { label: "Ineffective Controls", value: s.ineffectiveControls, color: C.amber, icon: "⚠️" },
            { label: "Emerging Risks", value: s.emergingRisks, color: C.purple, icon: "🌐" },
            { label: "UIFW Open Cases", value: data.uifwExpenditure.summary.openCases, color: C.red, icon: "💸" },
            { label: "High-Risk Vendors", value: data.thirdPartyRisk.summary.highRiskVendors, color: C.amber, icon: "🤝" },
          ].map(i => (
            <div key={i.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.sub }}>{i.icon} {i.label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: i.color }}>{i.value}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── APPETITE TAB ────────────────────────────────────────────────
function AppetiteTab({ data }) {
  return (
    <div>
      <SectionTitle title="Risk Appetite Dashboard" sub="Current period tolerance assessment across all risk categories" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.appetiteDashboard.map(item => (
          <Card key={item.riskArea}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <StatusDot status={item.status} />
                  <span style={{ fontWeight: 700, color: C.text }}>{item.riskArea}</span>
                  <Badge label={item.appetiteLevel} color={item.appetiteLevel === "Zero Tolerance" ? "red" : item.appetiteLevel === "Low" ? "amber" : "blue"} />
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>Tolerance: {item.toleranceThreshold}</div>
              </div>
              <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Previous</div>
                  <div style={{ fontWeight: 700, color: C.sub }}>{item.previousValue}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Current</div>
                  <div style={{ fontWeight: 700, color: statusColor(item.status) }}>{item.currentValue}</div>
                </div>
                <Badge label={item.status} color={item.status === "Red" ? "red" : item.status === "Amber" ? "amber" : "green"} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── RISKS TAB ───────────────────────────────────────────────────
function RisksTab({ data }) {
  return (
    <div>
      <SectionTitle title="Strategic Risk Register" sub="Inherent, residual and current risk ratings with treatment status" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.risks.map(r => (
          <Card key={r.id} style={{ borderLeft: `4px solid ${statusColor(r.currentStatus)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{r.id} — {r.category} — {r.department}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{r.description}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
                  <span style={{ color: C.red }}>Cause: </span>{r.cause} &nbsp;|&nbsp;
                  <span style={{ color: C.amber }}>Consequence: </span>{r.consequence}
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                {[
                  { label: "Inherent", value: r.inherentRating, color: C.red },
                  { label: "Residual", value: r.residualRating, color: C.amber },
                  { label: "Current", value: r.currentRating, color: statusColor(r.currentStatus) },
                  { label: "Target", value: r.targetRating, color: C.green },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Badge label={r.currentStatus} color={r.currentStatus === "Red" ? "red" : r.currentStatus === "Amber" ? "amber" : "green"} />
              <Badge label={r.tolerance} color={r.tolerance === "Outside Tolerance" ? "red" : "amber"} />
              <Badge label={r.controlEffectiveness} color={r.controlEffectiveness === "Ineffective" ? "red" : r.controlEffectiveness === "Partially Effective" ? "amber" : "green"} />
              <Badge label={`Owner: ${r.owner}`} color="blue" />
              <span style={{ fontSize: 12, color: C.muted }}>{trendIcon(r.trend)} {r.trend}</span>
            </div>
            <div style={{ marginTop: 10, background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.sub }}>
              <strong style={{ color: C.accent }}>Treatment:</strong> {r.treatmentAction}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── KRIs TAB ────────────────────────────────────────────────────
function KrisTab({ data }) {
  return (
    <div>
      <SectionTitle title="KRI Monitoring Dashboard" sub="Key Risk Indicators with traffic light status and trend analysis" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.kris.map(k => {
          const curr = parseFloat(k.currentPeriodValue);
          const prev = parseFloat(k.previousPeriodValue);
          return (
            <Card key={k.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k.id} — {k.category} — Linked: {k.linkedRisk}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{k.indicator}</div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{trendIcon(k.trend)} {k.trend}</span>
                  <Badge label={k.currentStatus} color={k.currentStatus === "Red" ? "red" : k.currentStatus === "Amber" ? "amber" : "green"} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 32, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Previous</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.sub }}>{k.previousPeriodValue}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Current</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: statusColor(k.currentStatus) }}>{k.currentPeriodValue}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Target</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{k.target}</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    <span style={{ color: C.green }}>🟢 {k.greenThreshold}</span>
                    <span style={{ color: C.amber }}>🟡 {k.amberThreshold}</span>
                    <span style={{ color: C.red }}>🔴 {k.redThreshold}</span>
                  </div>
                  <div style={{ position: "relative", height: 12, background: `linear-gradient(to right, ${C.red}, ${C.amber}, ${C.green})`, borderRadius: 999, opacity: 0.6 }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── OPPORTUNITIES TAB ───────────────────────────────────────────
function OpportunitiesTab({ data }) {
  const total = data.opportunityRisks.reduce((s, o) => s + o.estimatedValue, 0);
  const realised = data.opportunityRisks.reduce((s, o) => s + o.realisedValue, 0);
  return (
    <div>
      <SectionTitle title="Opportunity Risk Register" sub="Strategic opportunities with pipeline value and realisation tracking" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Opportunities" value={data.opportunityRisks.length} icon="💡" color={C.green} />
        <KpiCard label="Pipeline Value" value={fmt(total)} icon="💰" color={C.accent} />
        <KpiCard label="Realised Benefits" value={fmt(realised)} icon="✅" color={C.green} sub={`${Math.round((realised/total)*100)}% of pipeline`} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.opportunityRisks.map(o => (
          <Card key={o.id} style={{ borderLeft: `4px solid ${C.green}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{o.id} — {o.category}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{o.title}</div>
                <div style={{ fontSize: 13, color: C.sub }}>{o.description}</div>
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{o.score}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Score</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{fmt(o.estimatedValue)}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Est. Value</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{fmt(o.realisedValue)}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Realised</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge label={o.strategy} color="green" />
              <Badge label={o.implementationStatus} color={o.implementationStatus === "Realised" ? "green" : o.implementationStatus === "In Progress" ? "amber" : "blue"} />
              <Badge label={`Upside: ${o.upsidePotential}`} color="blue" />
              {o.enablingFactors.map(f => <Badge key={f} label={f} color="blue" />)}
            </div>
            <div style={{ marginTop: 10, background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.sub }}>
              <strong style={{ color: C.green }}>Action:</strong> {o.action}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── EMERGING RISKS TAB ──────────────────────────────────────────
function EmergingTab({ data }) {
  return (
    <div>
      <SectionTitle title="Emerging Risk Radar" sub="PESTLE-based horizon scanning and emerging risk monitoring" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Emerging Risks" value={data.emergingRisks.length} icon="🌐" color={C.purple} />
        <KpiCard label="Escalated" value={data.emergingRisks.filter(e => e.status === "Escalated").length} icon="🚨" color={C.red} />
        <KpiCard label="High Criticality" value={data.emergingRisks.filter(e => e.criticality === "High").length} icon="⚠️" color={C.amber} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.emergingRisks.map(e => (
          <Card key={e.id} style={{ borderLeft: `4px solid ${e.status === "Escalated" ? C.red : e.criticality === "High" ? C.amber : C.purple}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{e.id} — PESTLE: {e.pestle} — Horizon: {e.horizon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{e.title}</div>
                <div style={{ fontSize: 13, color: C.sub }}>{e.description}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}><strong style={{ color: C.amber }}>Potential Impact:</strong> {e.potentialImpact}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                <Badge label={e.status} color={e.status === "Escalated" ? "red" : e.status === "New" ? "purple" : "amber"} />
                <Badge label={e.criticality} color={e.criticality === "High" ? "red" : "amber"} />
                <Badge label={`Velocity: ${e.velocity}`} color="blue" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TREATMENTS TAB ──────────────────────────────────────────────
function TreatmentsTab({ data }) {
  return (
    <div>
      <SectionTitle title="Treatment Action Tracker" sub="Progress monitoring for all risk treatment actions" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Actions" value={data.summary.treatmentTotal} icon="📋" color={C.accent} />
        <KpiCard label="Completed" value={data.summary.treatmentDone} icon="✅" color={C.green} />
        <KpiCard label="In Progress" value={data.summary.treatmentActive} icon="🔄" color={C.accent} />
        <KpiCard label="Overdue" value={data.summary.treatmentOverdue} icon="⏰" color={C.red} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.treatmentActions.map(t => (
          <Card key={t.id} style={{ borderLeft: `4px solid ${t.status === "Overdue" ? C.red : t.status === "Completed" ? C.green : C.amber}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t.id} — Risk: {t.riskId}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{t.action}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.sub }}>
                  <span>Owner: <strong style={{ color: C.text }}>{t.owner}</strong></span>
                  <span>Due: <strong style={{ color: t.status === "Overdue" ? C.red : C.text }}>{t.dueDate}</strong></span>
                  <span>Budget: <strong style={{ color: C.text }}>{fmt(t.budget)}</strong></span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Badge label={t.priority} color={t.priority === "Critical" ? "red" : t.priority === "High" ? "amber" : "blue"} />
                <Badge label={t.status} color={t.status === "Overdue" ? "red" : t.status === "Completed" ? "green" : "amber"} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
                <span>Progress</span><span style={{ color: statusColor(t.status === "Overdue" ? "Red" : "Amber") }}>{t.progress}%</span>
              </div>
              <ProgressBar value={t.progress} color={t.status === "Overdue" ? C.red : t.status === "Completed" ? C.green : C.accent} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ASSURANCE TAB ───────────────────────────────────────────────
function AssuranceTab({ data }) {
  const ca = data.combinedAssurance;
  return (
    <div>
      <SectionTitle title="Combined Assurance Framework" sub="Three lines of defence coverage and effectiveness assessment" />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {["1st Line","2nd Line","3rd Line"].map(line => {
          const providers = ca.providers.filter(p => p.type === line);
          const avgCoverage = Math.round(providers.reduce((s, p) => s + p.coverage, 0) / providers.length);
          return (
            <Card key={line} style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 12 }}>{line} of Defence</div>
              {providers.map(p => (
                <div key={p.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{p.name}</span>
                    <Badge label={p.effectiveness} color={p.effectiveness === "Effective" ? "green" : "amber"} />
                  </div>
                  <ProgressBar value={p.coverage} color={p.effectiveness === "Effective" ? C.green : C.amber} />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.coverage}% coverage | {p.findings} findings</div>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Risk Coverage by Assurance Provider</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Risk ID","1st Line","2nd Line","3rd Line","Overall"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ca.riskCoverage.map(r => (
                <tr key={r.riskId} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 600 }}>{r.riskId}</td>
                  <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProgressBar value={r.firstLine} /><span style={{ color: C.text, minWidth: 35 }}>{r.firstLine}%</span></div></td>
                  <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProgressBar value={r.secondLine} /><span style={{ color: C.text, minWidth: 35 }}>{r.secondLine}%</span></div></td>
                  <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProgressBar value={r.thirdLine} /><span style={{ color: C.text, minWidth: 35 }}>{r.thirdLine}%</span></div></td>
                  <td style={{ padding: "10px 12px" }}><Badge label={r.overall} color={r.overall === "Adequate" ? "green" : r.overall === "Partial" ? "amber" : "red"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── BCM TAB ─────────────────────────────────────────────────────
function BCMTab({ data }) {
  const bcm = data.bcmResilience;
  const [activeSection, setActiveSection] = useState("dashboard");

  const sections = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "governance", label: "🏛️ Governance" },
    { id: "bia", label: "📋 BIA Register" },
    { id: "services", label: "⚙️ Critical Services" },
    { id: "bcplans", label: "📄 BC Plans" },
    { id: "drplans", label: "💾 DR Plans" },
    { id: "risks", label: "🛡️ BCM Risks" },
    { id: "incidents", label: "🚨 Incidents" },
    { id: "testing", label: "🧪 Testing" },
    { id: "kris", label: "📡 BCM KRIs" },
    { id: "actions", label: "🔧 Actions" },
  ];

  const impactColor = (v) =>
    v === "Critical" ? C.red : v === "High" ? "#f97316" : v === "Medium" ? C.amber : C.green;

  return (
    <div>
      <SectionTitle title="BCM Resilience Center" sub="Enterprise Business Continuity Management — LGSETA BJMAPEX GRC Intelligence" />

      {/* Sub Navigation */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24, background: C.surface, padding: 8, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: activeSection === s.id ? 700 : 400,
            background: activeSection === s.id ? C.accent : "transparent",
            color: activeSection === s.id ? "#000" : C.muted,
            transition: "all 0.2s"
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {activeSection === "dashboard" && (
        <div>
          {/* Readiness KPIs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="BCM Readiness" value={`${bcm.readinessIndex}%`} icon="🔄" color={C.amber} sub="Overall readiness index" />
            <KpiCard label="RTO Compliance" value={`${bcm.rtoCompliance}%`} icon="⏱️" color={C.amber} sub="Recovery time compliance" />
            <KpiCard label="RPO Compliance" value={`${bcm.rpoCompliance}%`} icon="💾" color={C.amber} sub="Recovery point compliance" />
            <KpiCard label="BCM Maturity" value={bcm.bcmMaturity} icon="📊" color={C.blue} sub="ISO 22301 maturity level" />
            <KpiCard label="DR Status" value={`${bcm.drStatus}%`} icon="🛡️" color={C.purple} sub="Disaster recovery readiness" />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            {/* BCM Plans Summary */}
            <Card style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 14 }}>📄 BCM Plans Status</div>
              {[
                { label: "Total Plans", value: bcm.bcPlans.length, color: C.accent },
                { label: "Approved", value: bcm.bcPlans.filter(p => p.approvalStatus === "Approved").length, color: C.green },
                { label: "Draft", value: bcm.bcPlans.filter(p => p.approvalStatus === "Draft").length, color: C.amber },
                { label: "Tested", value: bcm.bcPlans.filter(p => p.testingStatus === "Passed").length, color: C.green },
                { label: "Failed", value: bcm.bcPlans.filter(p => p.testingStatus === "Failed").length, color: C.red },
                { label: "Not Tested", value: bcm.bcPlans.filter(p => p.testingStatus === "Not Tested").length, color: C.muted },
              ].map(i => (
                <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.sub }}>{i.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i.color }}>{i.value}</span>
                </div>
              ))}
            </Card>

            {/* Critical Services Coverage */}
            <Card style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 14 }}>⚙️ Critical Services Coverage</div>
              {[
                { label: "Total Services", value: bcm.criticalServices.length, color: C.accent },
                { label: "Adequate Readiness", value: bcm.criticalServices.filter(s => s.readiness === "Adequate").length, color: C.green },
                { label: "Partial Readiness", value: bcm.criticalServices.filter(s => s.readiness === "Partial").length, color: C.amber },
                { label: "High Risk", value: bcm.criticalServices.filter(s => s.riskRating === "High").length, color: C.red },
                { label: "Critical Priority", value: bcm.criticalServices.filter(s => s.priority === "Critical").length, color: C.red },
              ].map(i => (
                <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.sub }}>{i.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i.color }}>{i.value}</span>
                </div>
              ))}
            </Card>

            {/* Testing Summary */}
            <Card style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 14 }}>🧪 Testing Summary</div>
              {[
                { label: "Tests Conducted", value: bcm.testing.length, color: C.accent },
                { label: "Passed", value: bcm.testing.filter(t => t.result === "Passed").length, color: C.green },
                { label: "Failed", value: bcm.testing.filter(t => t.result === "Failed").length, color: C.red },
                { label: "Partial", value: bcm.testing.filter(t => t.result === "Partial").length, color: C.amber },
                { label: "Total Findings", value: bcm.testing.reduce((s, t) => s + t.findingsCount, 0), color: C.red },
              ].map(i => (
                <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.sub }}>{i.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i.color }}>{i.value}</span>
                </div>
              ))}
            </Card>

            {/* Treatment Actions Summary */}
            <Card style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: C.accent, marginBottom: 14 }}>🔧 Treatment Actions</div>
              {[
                { label: "Total Actions", value: bcm.treatmentActions.length, color: C.accent },
                { label: "In Progress", value: bcm.treatmentActions.filter(t => t.status === "In Progress").length, color: C.amber },
                { label: "Overdue", value: bcm.treatmentActions.filter(t => t.status === "Overdue").length, color: C.red },
                { label: "Not Started", value: bcm.treatmentActions.filter(t => t.status === "Not Started").length, color: C.muted },
                { label: "Critical Priority", value: bcm.treatmentActions.filter(t => t.priority === "Critical").length, color: C.red },
              ].map(i => (
                <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.sub }}>{i.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i.color }}>{i.value}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* RTO/RPO Performance */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 16 }}>⏱️ RTO / RPO Performance Dashboard</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Critical Service", "Approved RTO", "Approved RPO", "Priority", "Readiness", "Risk Rating", "Escalation"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bcm.criticalServices.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: "10px 12px", color: C.text, fontWeight: 600 }}>{s.service}</td>
                      <td style={{ padding: "10px 12px", color: C.accent }}>{s.rto}</td>
                      <td style={{ padding: "10px 12px", color: C.accent }}>{s.rpo}</td>
                      <td style={{ padding: "10px 12px" }}><Badge label={s.priority} color={s.priority === "Critical" ? "red" : s.priority === "High" ? "amber" : "blue"} /></td>
                      <td style={{ padding: "10px 12px" }}><Badge label={s.readiness} color={s.readiness === "Adequate" ? "green" : "amber"} /></td>
                      <td style={{ padding: "10px 12px" }}><Badge label={s.riskRating} color={s.riskRating === "High" ? "red" : s.riskRating === "Medium" ? "amber" : "green"} /></td>
                      <td style={{ padding: "10px 12px", color: C.sub, fontSize: 11 }}>{s.escalation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* BCM KRIs Summary */}
          <Card>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 16 }}>📡 BCM Key Risk Indicators</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bcm.bcmKRIs.map(k => (
                <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 200, fontSize: 12, color: C.text }}>{k.indicator}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: statusColor(k.status), minWidth: 60 }}>{k.currentValue}</div>
                  <div style={{ flex: 1, minWidth: 150 }}><ProgressBar value={parseFloat(k.currentValue)} color={statusColor(k.status)} /></div>
                  <Badge label={k.status} color={k.status === "Red" ? "red" : k.status === "Amber" ? "amber" : "green"} />
                  <span style={{ fontSize: 11, color: C.muted }}>{trendIcon(k.trend)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── GOVERNANCE ── */}
      {activeSection === "governance" && (
        <div>
          <SectionTitle title="BCM Governance Register" sub="Policy status, committee structure and roles & responsibilities" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="BCM Policy" value={bcm.governance.bcmPolicy} icon="📋" color={C.green} sub={`Version ${bcm.governance.policyVersion}`} />
            <KpiCard label="Framework Status" value={bcm.governance.bcmFrameworkStatus} icon="🏛️" color={C.green} />
            <KpiCard label="ISO 22301" value={bcm.governance.iso22301Alignment} icon="✅" color={C.amber} sub="Alignment status" />
            <KpiCard label="Governance Rating" value={bcm.governance.governanceRating} icon="⭐" color={C.amber} />
          </div>

          {/* Committees */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: C.accent, marginBottom: 12, fontSize: 14 }}>Committee Structure</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {bcm.governance.committees.map(c => (
                <Card key={c.name} style={{ flex: 1, minWidth: 220, borderTop: `3px solid ${C.accent}` }}>
                  <div style={{ fontWeight: 700, color: C.text, marginBottom: 8, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Chair: <span style={{ color: C.accent }}>{c.chair}</span></div>
                  <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>Members: {c.members.join(", ")}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <Badge label={c.meetingFrequency} color="blue" />
                    <Badge label={c.status} color="green" />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>Last: {c.lastMeeting} | Next: {c.nextMeeting}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Governance Register */}
          <Card>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 16 }}>Governance Document Register</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Governance Item", "Owner", "Approval Status", "Last Review", "Next Review", "Committee", "Status", "Comments"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bcm.governance.governanceRegister.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: "10px 12px", color: C.text, fontWeight: 600 }}>{g.item}</td>
                      <td style={{ padding: "10px 12px", color: C.accent }}>{g.owner}</td>
                      <td style={{ padding: "10px 12px" }}><Badge label={g.approvalStatus} color={g.approvalStatus === "Approved" ? "green" : "amber"} /></td>
                      <td style={{ padding: "10px 12px", color: C.sub }}>{g.lastReview}</td>
                      <td style={{ padding: "10px 12px", color: C.sub }}>{g.nextReview}</td>
                      <td style={{ padding: "10px 12px", color: C.sub, fontSize: 11 }}>{g.committee}</td>
                      <td style={{ padding: "10px 12px" }}><Badge label={g.status} color={g.status === "Current" ? "green" : "red"} /></td>
                      <td style={{ padding: "10px 12px", color: C.muted, fontSize: 11 }}>{g.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── BIA ── */}
      {activeSection === "bia" && (
        <div>
          <SectionTitle title="Business Impact Analysis Register" sub="Critical process identification, impact assessment and recovery prioritisation" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {bcm.bia.map(b => (
              <Card key={b.id} style={{ borderLeft: `4px solid ${impactColor(b.financialImpact)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{b.id} — {b.businessUnit}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{b.process}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Owner: <span style={{ color: C.accent }}>{b.owner}</span></div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{b.description}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[{ label: "MTPD", value: b.mtpd }, { label: "RTO", value: b.rto }, { label: "RPO", value: b.rpo }].map(m => (
                      <div key={m.label} style={{ textAlign: "center", background: "#0f172a", borderRadius: 8, padding: "8px 12px" }}>
                        <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{m.value}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: "center", background: "#0f172a", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>Priority</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>#{b.priority}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {[
                    { label: `Financial: ${b.financialImpact}`, val: b.financialImpact },
                    { label: `Operational: ${b.operationalImpact}`, val: b.operationalImpact },
                    { label: `Compliance: ${b.complianceImpact}`, val: b.complianceImpact },
                    { label: `Reputational: ${b.reputationalImpact}`, val: b.reputationalImpact },
                    { label: `Stakeholder: ${b.stakeholderImpact}`, val: b.stakeholderImpact },
                  ].map(i => (
                    <Badge key={i.label} label={i.label} color={i.val === "Critical" ? "red" : i.val === "High" ? "amber" : "blue"} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                  <div style={{ flex: 1, minWidth: 150 }}><span style={{ color: C.muted }}>Systems: </span><span style={{ color: C.sub }}>{b.systems.join(", ")}</span></div>
                  <div style={{ flex: 1, minWidth: 150 }}><span style={{ color: C.muted }}>Suppliers: </span><span style={{ color: C.sub }}>{b.suppliers.join(", ")}</span></div>
                </div>
                <div style={{ marginTop: 10, background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.sub }}>
                  <strong style={{ color: C.green }}>MBCO:</strong> {b.mbco} &nbsp;|&nbsp; <strong style={{ color: C.accent }}>Strategy:</strong> {b.continuityStrategy}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── CRITICAL SERVICES ── */}
      {activeSection === "services" && (
        <div>
          <SectionTitle title="Critical Services Register" sub="LGSETA critical services with continuity requirements and readiness status" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["ID", "Critical Service", "Business Owner", "Supporting System", "Supporting Supplier", "RTO", "RPO", "Priority", "Readiness", "Risk Rating", "Escalation"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bcm.criticalServices.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 700 }}>{s.id}</td>
                    <td style={{ padding: "10px 12px", color: C.text, fontWeight: 600 }}>{s.service}</td>
                    <td style={{ padding: "10px 12px", color: C.sub }}>{s.owner}</td>
                    <td style={{ padding: "10px 12px", color: C.sub }}>{s.system}</td>
                    <td style={{ padding: "10px 12px", color: C.sub }}>{s.supplier}</td>
                    <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 700 }}>{s.rto}</td>
                    <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 700 }}>{s.rpo}</td>
                    <td style={{ padding: "10px 12px" }}><Badge label={s.priority} color={s.priority === "Critical" ? "red" : s.priority === "High" ? "amber" : "blue"} /></td>
                    <td style={{ padding: "10px 12px" }}><Badge label={s.readiness} color={s.readiness === "Adequate" ? "green" : "amber"} /></td>
                    <td style={{ padding: "10px 12px" }}><Badge label={s.riskRating} color={s.riskRating === "High" ? "red" : s.riskRating === "Medium" ? "amber" : "green"} /></td>
                    <td style={{ padding: "10px 12px", color: C.sub, fontSize: 11 }}>{s.escalation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BC PLANS ── */}
      {activeSection === "bcplans" && (
        <div>
          <SectionTitle title="Business Continuity Plan Register" sub="All approved and draft BCPs with testing status and readiness ratings" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {bcm.bcPlans.map(p => (
              <Card key={p.id} style={{ borderLeft: `4px solid ${p.testingStatus === "Passed" ? C.green : p.testingStatus === "Failed" ? C.red : C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{p.id} — {p.businessUnit} — {p.version}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Owner: <span style={{ color: C.accent }}>{p.owner}</span> | Min Staff: <span style={{ color: C.text }}>{p.minStaff}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Badge label={p.approvalStatus} color={p.approvalStatus === "Approved" ? "green" : "amber"} />
                    <Badge label={p.testingStatus} color={p.testingStatus === "Passed" ? "green" : p.testingStatus === "Failed" ? "red" : "amber"} />
                    <Badge label={`Readiness: ${p.readinessRating}`} color={p.readinessRating === "High" ? "green" : p.readinessRating === "Medium" ? "amber" : "red"} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 12, color: C.sub, marginBottom: 10, flexWrap: "wrap" }}>
                  <span>Processes: <strong style={{ color: C.text }}>{p.processesCovered.join(", ")}</strong></span>
                  <span>Last Updated: <strong style={{ color: C.text }}>{p.lastUpdated}</strong></span>
                  <span>Next Review: <strong style={{ color: C.text }}>{p.nextReview}</strong></span>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
                  <strong style={{ color: C.accent }}>Recovery Strategy:</strong> {p.recoveryStrategy}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
                  <strong style={{ color: C.accent }}>Alternate Work:</strong> {p.alternateWork}
                </div>
                {p.gaps.length > 0 && (
                  <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 12px" }}>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 6 }}>⚠️ Identified Gaps:</div>
                    {p.gaps.map((g, i) => <div key={i} style={{ fontSize: 11, color: C.sub, marginBottom: 2 }}>• {g}</div>)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── DR PLANS ── */}
      {activeSection === "drplans" && (
        <div>
          <SectionTitle title="ICT Disaster Recovery Plan Register" sub="Critical system DR plans, RTO/RPO targets and test status" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {bcm.drPlans.map(d => (
              <Card key={d.id} style={{ borderLeft: `4px solid ${d.drTestStatus === "Passed" ? C.green : d.drTestStatus === "Failed" ? C.red : C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{d.id} — {d.hostingType}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d.system}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Business Owner: <span style={{ color: C.accent }}>{d.businessOwner}</span> | ICT Owner: <span style={{ color: C.accent }}>{d.ictOwner}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {[{ label: "RTO", value: d.rto }, { label: "RPO", value: d.rpo }].map(m => (
                      <div key={m.label} style={{ textAlign: "center", background: "#0f172a", borderRadius: 8, padding: "8px 14px" }}>
                        <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{m.value}</div>
                      </div>
                    ))}
                    <Badge label={d.drTestStatus} color={d.drTestStatus === "Passed" ? "green" : d.drTestStatus === "Failed" ? "red" : "amber"} />
                    <Badge label={`Readiness: ${d.readinessRating}`} color={d.readinessRating === "High" ? "green" : d.readinessRating === "Medium" ? "amber" : "red"} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 12, color: C.sub, marginBottom: 10, flexWrap: "wrap" }}>
                  <span>Backup: <strong style={{ color: C.text }}>{d.backupFrequency}</strong></span>
                  <span>Location: <strong style={{ color: C.text }}>{d.backupLocation}</strong></span>
                  <span>Last Test: <strong style={{ color: C.text }}>{d.lastBackupTest}</strong></span>
                  <span>Supplier: <strong style={{ color: C.text }}>{d.supplierDependency}</strong></span>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}><strong style={{ color: C.accent }}>DR Strategy:</strong> {d.drStrategy}</div>
                {d.keyRisk && (
                  <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.red }}>
                    ⚠️ <strong>Key Risk:</strong> {d.keyRisk}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── BCM RISKS ── */}
      {activeSection === "risks" && (
        <div>
          <SectionTitle title="BCM Risk Register" sub="Business continuity specific risks integrated with enterprise risk framework" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {bcm.bcmRisks.map(r => (
              <Card key={r.id} style={{ borderLeft: `4px solid ${r.residualRating >= 15 ? C.red : r.residualRating >= 10 ? C.amber : C.green}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{r.id} — {r.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: C.sub }}><span style={{ color: C.red }}>Cause:</span> {r.cause}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}><span style={{ color: C.amber }}>Consequence:</span> {r.consequence}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {[{ label: "Inherent", value: r.inherentRating, color: C.red }, { label: "Residual", value: r.residualRating, color: statusColor(r.residualRating >= 15 ? "Red" : r.residualRating >= 10 ? "Amber" : "Green") }].map(m => (
                      <div key={m.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge label={r.controlEffectiveness} color={r.controlEffectiveness === "Ineffective" ? "red" : r.controlEffectiveness === "Partial" ? "amber" : "green"} />
                  <Badge label={`Owner: ${r.owner}`} color="blue" />
                  <Badge label={r.escalation} color={r.escalation === "Escalated" ? "red" : r.escalation === "Required" ? "amber" : "green"} />
                  <Badge label={r.status} color={r.status === "Overdue" ? "red" : r.status === "In Progress" ? "amber" : "blue"} />
                </div>
                <div style={{ marginTop: 10, background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.sub }}>
                  <strong style={{ color: C.accent }}>Treatment:</strong> {r.treatmentAction} <span style={{ color: C.muted }}>| Due: {r.dueDate}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── INCIDENTS ── */}
      {activeSection === "incidents" && (
        <div>
          <SectionTitle title="BCM Incident & Disruption Register" sub="Actual disruptions, near misses and lessons learned" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="Total Incidents" value={bcm.incidents.length} icon="🚨" color={C.red} />
            <KpiCard label="RTO Breached" value={bcm.incidents.filter(i => i.rtoBreached).length} icon="⏱️" color={C.red} />
            <KpiCard label="RPO Breached" value={bcm.incidents.filter(i => i.rpoBreached).length} icon="💾" color={C.red} />
            <KpiCard label="High Severity" value={bcm.incidents.filter(i => i.severity === "High").length} icon="⚠️" color={C.amber} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {bcm.incidents.map(inc => (
              <Card key={inc.id} style={{ borderLeft: `4px solid ${inc.severity === "High" ? C.red : inc.severity === "Medium" ? C.amber : C.green}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{inc.id} — {inc.type} — {inc.date}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{inc.title}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Affected: <span style={{ color: C.accent }}>{inc.affectedUnit}</span> | Service: <span style={{ color: C.accent }}>{inc.affectedService}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Badge label={`Severity: ${inc.severity}`} color={inc.severity === "High" ? "red" : "amber"} />
                    <Badge label={`Duration: ${inc.duration}`} color="blue" />
                    <Badge label={inc.rtoBreached ? "RTO Breached" : "RTO Met"} color={inc.rtoBreached ? "red" : "green"} />
                    <Badge label={inc.rpoBreached ? "RPO Breached" : "RPO Met"} color={inc.rpoBreached ? "red" : "green"} />
                    <Badge label={inc.status} color={inc.status === "Closed" ? "green" : "amber"} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.sub, marginBottom: 8, flexWrap: "wrap" }}>
                  <span>Start: <strong style={{ color: C.text }}>{inc.startTime}</strong></span>
                  <span>End: <strong style={{ color: C.text }}>{inc.endTime}</strong></span>
                  <span>Escalated To: <strong style={{ color: C.text }}>{inc.escalatedTo}</strong></span>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}><strong style={{ color: C.amber }}>Impact:</strong> {inc.impact}</div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}><strong style={{ color: C.accent }}>Actions Taken:</strong> {inc.actionsTaken}</div>
                <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.green }}>
                  <strong>Lessons Learned:</strong> <span style={{ color: C.sub }}>{inc.lessonsLearned}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TESTING ── */}
      {activeSection === "testing" && (
        <div>
          <SectionTitle title="BCM Testing & Exercising Register" sub="All BCM tests, simulations and exercising results with corrective actions" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="Tests Conducted" value={bcm.testing.length} icon="🧪" color={C.accent} />
            <KpiCard label="Passed" value={bcm.testing.filter(t => t.result === "Passed").length} icon="✅" color={C.green} />
            <KpiCard label="Failed" value={bcm.testing.filter(t => t.result === "Failed").length} icon="❌" color={C.red} />
            <KpiCard label="Total Findings" value={bcm.testing.reduce((s, t) => s + t.findingsCount, 0)} icon="⚠️" color={C.amber} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {bcm.testing.map(t => (
              <Card key={t.id} style={{ borderLeft: `4px solid ${t.result === "Passed" ? C.green : t.result === "Failed" ? C.red : C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t.id} — {t.type} — {t.date}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.scenario}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Unit: <span style={{ color: C.accent }}>{t.businessUnit}</span> | Plan: <span style={{ color: C.accent }}>{t.planTested}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <Badge label={t.result} color={t.result === "Passed" ? "green" : t.result === "Failed" ? "red" : "amber"} />
                    <Badge label={`RTO: ${t.rtoAchieved}`} color={t.result === "Passed" ? "green" : "red"} />
                    <Badge label={t.status} color={t.status === "Overdue" ? "red" : t.status === "In Progress" ? "amber" : "green"} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Participants: <span style={{ color: C.text }}>{t.participants.join(", ")}</span></div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 6 }}>⚠️ Findings ({t.findingsCount}):</div>
                  {t.findings.map((f, i) => <div key={i} style={{ fontSize: 11, color: C.sub, marginBottom: 2 }}>• {f}</div>)}
                </div>
                <div style={{ background: "#0f172a", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 6 }}>Corrective Actions:</div>
                  {t.correctiveActions.map((a, i) => <div key={i} style={{ fontSize: 11, color: C.sub, marginBottom: 2 }}>• {a}</div>)}
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Owner: {t.actionOwner} | Due: {t.dueDate}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── BCM KRIs ── */}
      {activeSection === "kris" && (
        <div>
          <SectionTitle title="BCM Key Risk Indicators" sub="BCM-specific KRIs linked to appetite and tolerance thresholds" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {bcm.bcmKRIs.map(k => (
              <Card key={k.id} style={{ borderLeft: `4px solid ${statusColor(k.status)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k.id}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{k.indicator}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: statusColor(k.status) }}>{k.currentValue}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>Current</div>
                    </div>
                    <Badge label={k.status} color={k.status === "Red" ? "red" : k.status === "Amber" ? "amber" : "green"} />
                    <span style={{ fontSize: 14 }}>{trendIcon(k.trend)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: C.green }}>🟢 {k.greenThreshold}</span>
                  <span style={{ color: C.amber }}>🟡 {k.amberThreshold}</span>
                  <span style={{ color: C.red }}>🔴 {k.redThreshold}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TREATMENT ACTIONS ── */}
      {activeSection === "actions" && (
        <div>
          <SectionTitle title="BCM Treatment Actions" sub="Corrective actions from BCM testing, incidents and risk assessments" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="Total Actions" value={bcm.treatmentActions.length} icon="🔧" color={C.accent} />
            <KpiCard label="In Progress" value={bcm.treatmentActions.filter(t => t.status === "In Progress").length} icon="🔄" color={C.amber} />
            <KpiCard label="Overdue" value={bcm.treatmentActions.filter(t => t.status === "Overdue").length} icon="⏰" color={C.red} />
            <KpiCard label="Not Started" value={bcm.treatmentActions.filter(t => t.status === "Not Started").length} icon="⏳" color={C.muted} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {bcm.treatmentActions.map(t => (
              <Card key={t.id} style={{ borderLeft: `4px solid ${t.status === "Overdue" ? C.red : t.status === "In Progress" ? C.amber : C.muted}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t.id} — Linked Plan: {t.linkedPlan}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.finding}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>Owner: <span style={{ color: C.accent }}>{t.owner}</span> | Due: <span style={{ color: t.status === "Overdue" ? C.red : C.text }}>{t.dueDate}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Badge label={t.priority} color={t.priority === "Critical" ? "red" : t.priority === "High" ? "amber" : "blue"} />
                    <Badge label={t.status} color={t.status === "Overdue" ? "red" : t.status === "In Progress" ? "amber" : "blue"} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
                    <span>Progress</span>
                    <span style={{ color: t.progress >= 70 ? C.green : t.progress >= 30 ? C.amber : C.red }}>{t.progress}%</span>
                  </div>
                  <ProgressBar value={t.progress} color={t.status === "Overdue" ? C.red : t.status === "In Progress" ? C.accent : C.muted} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}