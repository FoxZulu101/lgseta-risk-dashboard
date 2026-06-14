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
  return (
    <div>
      <SectionTitle title="BCM Resilience Dashboard" sub="Business continuity maturity, RTO/RPO compliance and critical process status" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="BCM Readiness" value={`${bcm.readinessIndex}%`} icon="🔄" color={C.amber} />
        <KpiCard label="RTO Compliance" value={`${bcm.rtoCompliance}%`} icon="⏱️" color={C.amber} />
        <KpiCard label="RPO Compliance" value={`${bcm.rpoCompliance}%`} icon="💾" color={C.amber} />
        <KpiCard label="BCM Maturity" value={bcm.bcmMaturity} icon="📊" color={C.blue} />
        <KpiCard label="DR Status" value={`${bcm.drStatus}%`} icon="🛡️" color={C.purple} />
      </div>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Critical Process Status</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Process","RTO","RPO","Last Tested","Status","Maturity"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bcm.criticalProcesses.map(p => (
                <tr key={p.name} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "12px", color: C.text, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "12px", color: C.accent }}>{p.rto}</td>
                  <td style={{ padding: "12px", color: C.accent }}>{p.rpo}</td>
                  <td style={{ padding: "12px", color: C.sub }}>{p.lastTested}</td>
                  <td style={{ padding: "12px" }}><Badge label={p.status} color={p.status === "Passed" ? "green" : "red"} /></td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ProgressBar value={p.maturity} max={5} color={p.maturity >= 4 ? C.green : p.maturity >= 3 ? C.amber : C.red} />
                      <span style={{ color: C.text, minWidth: 30 }}>{p.maturity}/5</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── FRAUD TAB ───────────────────────────────────────────────────
function FraudTab({ data }) {
  const fe = data.fraudEthics;
  return (
    <div>
      <SectionTitle title="Fraud, Ethics & Compliance" sub="Case register, investigation status and compliance breach tracking" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Fraud Cases" value={fe.fraudCases} icon="🔍" color={C.red} />
        <KpiCard label="Ethics Cases" value={fe.ethicsCases} icon="⚖️" color={C.amber} />
        <KpiCard label="Compliance Breaches" value={fe.complianceBreaches} icon="📋" color={C.amber} />
        <KpiCard label="Active Investigations" value={fe.activeInvestigations} icon="🕵️" color={C.purple} />
        <KpiCard label="Declarations" value={fe.declarations} icon="📝" color={C.blue} sub="Gifts & hospitality this quarter" />
      </div>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Fraud, Ethics & Compliance Register</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Case ID","Type","Category","Severity","Status","Description","Date","Assigned To"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fe.cases.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 12px", color: C.accent, fontWeight: 700 }}>{c.id}</td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.type} color={c.type === "Fraud" ? "red" : c.type === "Ethics" ? "purple" : "amber"} /></td>
                  <td style={{ padding: "10px 12px", color: C.text }}>{c.category}</td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.severity} color={c.severity === "High" ? "red" : c.severity === "Medium" ? "amber" : "green"} /></td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.status} color={c.status === "Investigating" ? "amber" : c.status === "Resolved" ? "green" : c.status === "Open" ? "red" : "blue"} /></td>
                  <td style={{ padding: "10px 12px", color: C.sub, maxWidth: 200 }}>{c.description}</td>
                  <td style={{ padding: "10px 12px", color: C.muted }}>{c.dateReported}</td>
                  <td style={{ padding: "10px 12px", color: C.text }}>{c.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── DEPARTMENTS TAB ─────────────────────────────────────────────
function DepartmentsTab({ data }) {
  const depts = data.departments;
  const allDepts = [depts.corporateServices, depts.officeOfCEO, depts.cooOffice, depts.cfoOffice];
  return (
    <div>
      <SectionTitle title="Departmental Risk Profile" sub="Risk exposure by department and business unit across LGSETA" />
      {allDepts.map(dept => (
        <div key={dept.name} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            🏢 {dept.name} — {dept.head}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {dept.units.map(unit => (
              <Card key={unit.name} style={{ flex: 1, minWidth: 200, borderTop: `3px solid ${statusColor(unit.status)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{unit.name}</div>
                  <Badge label={unit.status} color={unit.status === "Red" ? "red" : unit.status === "Amber" ? "amber" : "green"} />
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Key Risk: <span style={{ color: C.sub }}>{unit.keyRisk}</span></div>
                <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                  <span style={{ color: C.sub }}>Risks: <strong style={{ color: C.text }}>{unit.riskCount}</strong></span>
                  <span style={{ color: C.red }}>High: <strong>{unit.highRisks}</strong></span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge label={unit.controlEffectiveness} color={unit.controlEffectiveness === "Effective" ? "green" : unit.controlEffectiveness === "Ineffective" ? "red" : "amber"} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── UIFW TAB ────────────────────────────────────────────────────
function UIFWTab({ data }) {
  const ui = data.uifwExpenditure;
  const s = ui.summary;
  return (
    <div>
      <SectionTitle title="UIFW Expenditure Tracker" sub="Unauthorised, Irregular, Fruitless and Wasteful expenditure — transparency and enforcement" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Unauthorised" value={fmt(s.totalUnauthorised)} icon="🚫" color={C.red} />
        <KpiCard label="Irregular" value={fmt(s.totalIrregular)} icon="⚠️" color="#f97316" />
        <KpiCard label="Fruitless & Wasteful" value={fmt(s.totalFruitless + s.totalWasteful)} icon="💸" color={C.amber} />
        <KpiCard label="Total UIFW" value={fmt(s.grandTotal)} icon="🚨" color={C.red} sub={`↑ ${fmt(s.grandTotal - s.previousPeriodTotal)} from last period`} />
        <KpiCard label="Pending Recovery" value={fmt(s.pendingRecovery)} icon="⏳" color={C.purple} />
        <KpiCard label="Referred to NPA" value={s.referredToNPA} icon="⚖️" color={C.red} />
      </div>

      {/* Trend bars */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>UIFW Expenditure Trend</div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 8, minWidth: 600 }}>
            {ui.trend.map(t => {
              const total = t.unauthorised + t.irregular + t.fruitless + t.wasteful;
              const max = 20000000;
              return (
                <div key={t.period} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column-reverse", height: 120, justifyContent: "flex-start", gap: 1 }}>
                    {[
                      { val: t.unauthorised, color: C.red },
                      { val: t.irregular, color: "#f97316" },
                      { val: t.fruitless, color: C.amber },
                      { val: t.wasteful, color: C.purple },
                    ].map((b, i) => (
                      <div key={i} style={{ height: `${(b.val / max) * 120}px`, background: b.color, borderRadius: 2 }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{t.period.replace("2025/26", "25/26").replace("2024/25", "24/25").replace("2026/27", "26/27")}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
            {[{ label: "Unauthorised", color: C.red }, { label: "Irregular", color: "#f97316" }, { label: "Fruitless", color: C.amber }, { label: "Wasteful", color: C.purple }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ color: C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>UIFW Case Register</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Case ID","Type","Amount","Department","Status","Condoned","Recoverable","Description"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ui.cases.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 12px", color: C.red, fontWeight: 700 }}>{c.id}</td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.type} color={c.type === "Unauthorised" ? "red" : c.type === "Irregular" ? "amber" : "purple"} /></td>
                  <td style={{ padding: "10px 12px", color: C.text, fontWeight: 700 }}>{fmt(c.amount)}</td>
                  <td style={{ padding: "10px 12px", color: C.sub }}>{c.department}</td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.status} color={c.status === "Condoned" ? "green" : c.status === "Under Investigation" ? "amber" : "red"} /></td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.condoned ? "Yes" : "No"} color={c.condoned ? "green" : "red"} /></td>
                  <td style={{ padding: "10px 12px" }}><Badge label={c.recoverable ? "Yes" : "No"} color={c.recoverable ? "green" : "red"} /></td>
                  <td style={{ padding: "10px 12px", color: C.sub, maxWidth: 200 }}>{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── THIRD PARTY TAB ─────────────────────────────────────────────
function ThirdPartyTab({ data }) {
  const tp = data.thirdPartyRisk;
  return (
    <div>
      <SectionTitle title="Third-Party Risk Management" sub="Vendor risk assessment, concentration risk and contract oversight" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Vendors" value={tp.summary.totalVendors} icon="🤝" color={C.accent} />
        <KpiCard label="High Risk Vendors" value={tp.summary.highRiskVendors} icon="🚨" color={C.red} />
        <KpiCard label="Critical Dependencies" value={tp.summary.criticalDependencies} icon="⚠️" color={C.red} />
        <KpiCard label="Contracts Expiring (90d)" value={tp.summary.contractsExpiring90Days} icon="📅" color={C.amber} />
        <KpiCard label="Overdue Reviews" value={tp.summary.overdueReviews} icon="⏰" color={C.amber} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {tp.vendors.map(v => (
          <Card key={v.id} style={{ borderLeft: `4px solid ${v.riskLevel === "High" ? C.red : v.riskLevel === "Medium" ? C.amber : C.green}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{v.id} — {v.category}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{v.name}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.sub, flexWrap: "wrap" }}>
                  <span>Contract Value: <strong style={{ color: C.text }}>{fmt(v.contractValue)}</strong></span>
                  <span>Expiry: <strong style={{ color: C.text }}>{v.contractExpiry}</strong></span>
                  <span>Last Review: <strong style={{ color: C.text }}>{v.lastReview}</strong></span>
                  <span>BEE: <strong style={{ color: C.text }}>{v.beeLevel}</strong></span>
                </div>
                {v.issues.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {v.issues.map(i => <Badge key={i} label={i} color="red" />)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                <Badge label={v.riskLevel + " Risk"} color={v.riskLevel === "High" ? "red" : v.riskLevel === "Medium" ? "amber" : "green"} />
                <Badge label={v.concentration} color={v.concentration === "Critical" ? "red" : v.concentration === "High" ? "amber" : "green"} />
                <Badge label={v.status} color={v.status === "Active" ? "green" : "amber"} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── APP TAB ─────────────────────────────────────────────────────
function APPTab({ data }) {
  const app = data.appAlignment;
  return (
    <div>
      <SectionTitle title="APP Alignment Dashboard" sub="Strategic objectives linked to KPIs, KRIs, risks and opportunities" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Strategic Objectives" value={app.strategicObjectives} icon="🎯" color={C.accent} />
        <KpiCard label="KPIs Tracked" value={app.kpisTracked} icon="📊" color={C.blue} />
        <KpiCard label="Avg Assurance Coverage" value={`${app.avgAssuranceCoverage}%`} icon="✅" color={C.green} />
        <KpiCard label="Active Opportunities" value={app.activeOpportunities} icon="💡" color={C.purple} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {app.objectives.map((o, i) => (
          <Card key={i}>
            <div style={{ fontWeight: 700, color: C.accent, marginBottom: 12 }}>{o.objective}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "KPI", value: o.kpi, sub: o.kpiValue, color: C.blue },
                { label: "KRI", value: o.kriIndicator, sub: o.kriStatus, color: statusColor(o.kriStatus) },
                { label: "Linked Risk", value: o.linkedRisk, sub: o.riskTolerance, color: o.riskTolerance === "Outside Tolerance" ? C.red : C.amber },
                { label: "Opportunity", value: o.opportunity, sub: o.opportunityStatus, color: C.green },
                { label: "Treatment", value: o.treatmentAction, sub: o.actionStatus, color: C.amber },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, minWidth: 140, background: "#0f172a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.value}</div>
                  <Badge label={item.sub} color={item.color === C.red ? "red" : item.color === C.amber ? "amber" : item.color === C.green ? "green" : "blue"} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── PREDICTIVE TAB ──────────────────────────────────────────────
function PredictiveTab({ data }) {
  const pi = data.predictiveIntel;
  return (
    <div>
      <SectionTitle title="Predictive Risk Intelligence" sub="AI-powered forecasting based on historical trend analysis and pattern recognition" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Predicted KRI Breaches" value={pi.predictedKriBreaches} icon="📡" color={C.red} sub="-2 from previous" />
        <KpiCard label="Predicted Overdue Actions" value={pi.predictedOverdueActions} icon="⏰" color={C.amber} sub="-3 from previous" />
        <KpiCard label="Predicted Risk Exposure" value={pi.predictedRiskExposure} icon="📊" color={C.amber} sub="+1.5 from previous" />
        <KpiCard label="Opportunity Realisation" value={`${pi.opportunityRealisationPct}%`} icon="💡" color={C.green} sub="+5 from previous" />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Forecast Chart */}
        <Card style={{ flex: 2, minWidth: 300 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Future Risk Exposure Forecast</div>
          <div style={{ position: "relative", height: 160 }}>
            <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              {pi.forecast.map((f, i) => {
                const x = (i / (pi.forecast.length - 1)) * 580 + 10;
                const y = f.historical ? 160 - ((f.historical - 30) / 20) * 140 : null;
                const fy = f.forecast ? 160 - ((f.forecast - 30) / 20) * 140 : null;
                return (
                  <g key={i}>
                    {y && <circle cx={x} cy={y} r={4} fill={C.accent} />}
                    {fy && <circle cx={x} cy={fy} r={4} fill={C.amber} strokeDasharray="3,3" />}
                  </g>
                );
              })}
              <polyline points={pi.forecast.filter(f => f.historical).map((f, i) => `${(i / (pi.forecast.length - 1)) * 580 + 10},${160 - ((f.historical - 30) / 20) * 140}`).join(" ")} fill="none" stroke={C.accent} strokeWidth="2" />
              <polyline points={pi.forecast.filter(f => f.forecast).map((f, i) => `${((i + 6) / (pi.forecast.length - 1)) * 580 + 10},${160 - ((f.forecast - 30) / 20) * 140}`).join(" ")} fill="none" stroke={C.amber} strokeWidth="2" strokeDasharray="6,3" />
            </svg>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><div style={{ width: 20, height: 2, background: C.accent }} /><span style={{ color: C.muted }}>Historical</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><div style={{ width: 20, height: 2, background: C.amber, borderTop: "2px dashed" }} /><span style={{ color: C.muted }}>AI Forecast</span></div>
          </div>
        </Card>

        {/* Model Confidence */}
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>Model Confidence</div>
          {Object.entries(pi.modelConfidence).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.sub }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: val >= 85 ? C.green : val >= 70 ? C.amber : C.red }}>{val}%</span>
              </div>
              <ProgressBar value={val} color={val >= 85 ? C.green : val >= 70 ? C.amber : C.red} />
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Velocity Alerts */}
        <Card style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>⚡ Risk Velocity Alerts</div>
          {pi.velocityAlerts.map((a, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{a.indicator}</div>
              <div style={{ fontSize: 12, color: a.severity === "High" ? C.red : C.amber }}>{a.alert}</div>
            </div>
          ))}
        </Card>

        {/* Recommended Actions */}
        <Card style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: C.text }}>🤖 AI Recommended Actions</div>
          {pi.recommendedActions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent + "22", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{a}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}