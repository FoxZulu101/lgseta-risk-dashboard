import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://lgseta-risk-dashboard.onrender.com/api";

function StatusBadge({ status }) {
  const colors = {
    Red: { background: "#fee2e2", color: "#991b1b" },
    Amber: { background: "#fef3c7", color: "#92400e" },
    Green: { background: "#d1fae5", color: "#065f46" },
  };
  const style = colors[status] || { background: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ ...style, padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>
      {status}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderTop: `4px solid ${color}`, minWidth: "140px", flex: 1 }}>
      <div style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  const radius = 60, cx = 80, cy = 80, strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  const segments = data.map(d => {
    const dash = (d.value / total) * circumference;
    const offset = cumulative;
    cumulative += dash;
    return { ...d, dash, offset: circumference - offset };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={s.color}
            strokeWidth={strokeWidth} strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={s.offset} style={{ transform: "rotate(-90deg)", transformOrigin: "80px 80px" }} />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill="#1e3a5f">{total}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fill="#6b7280">Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: d.color, flexShrink: 0 }} />
            <span style={{ color: "#4b5563" }}>{d.name}</span>
            <span style={{ fontWeight: "700", color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            <span>{d.name}</span><span style={{ fontWeight: "700", color: d.color || color }}>{d.value}</span>
          </div>
          <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "10px" }}>
            <div style={{ background: d.color || color, width: `${(d.value / max) * 100}%`, height: "10px", borderRadius: "999px", transition: "width 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function KRITrendChart({ kris }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {kris.map((k, i) => {
        const prev = parseFloat(k.previousPeriodValue);
        const curr = parseFloat(k.currentPeriodValue);
        const improving = curr >= prev;
        return (
          <div key={i} style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a5f" }}>{k.indicator}</span>
              <span style={{ fontSize: "13px" }}>{improving ? "📈" : "📉"} {k.trend}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: "#6b7280", width: "70px" }}>Prev: <strong>{k.previousPeriodValue}</strong></span>
              <div style={{ flex: 1, background: "#e5e7eb", borderRadius: "999px", height: "12px", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "12px", borderRadius: "999px", background: "#94a3b8", width: `${prev}%` }} />
                <div style={{ position: "absolute", left: 0, top: 0, height: "12px", borderRadius: "999px", background: k.currentStatus === "Red" ? "#dc2626" : k.currentStatus === "Amber" ? "#d97706" : "#16a34a", width: `${curr}%`, opacity: 0.85 }} />
              </div>
              <span style={{ fontSize: "12px", color: "#6b7280", width: "70px", textAlign: "right" }}>Curr: <strong style={{ color: k.currentStatus === "Red" ? "#dc2626" : k.currentStatus === "Amber" ? "#d97706" : "#16a34a" }}>{k.currentPeriodValue}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    axios.get(`${API}/dashboard`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Could not connect to backend."); setLoading(false); });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>Loading dashboard...</div>;
  if (error) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "red" }}>{error}</div>;

  const statusData = [
    { name: "Outside Tolerance", value: data.summary.outsideTolerance, color: "#dc2626" },
    { name: "Within Tolerance", value: data.summary.withinTolerance, color: "#d97706" },
    { name: "Within Appetite", value: data.summary.withinAppetite, color: "#16a34a" },
  ];

  const categoryData = [
    { name: "Strategic", value: data.summary.strategicRisks },
    { name: "Operational", value: data.summary.operationalRisks },
    { name: "Financial", value: data.summary.financialRisks },
    { name: "Compliance", value: data.summary.complianceRisks },
    { name: "Opportunity", value: data.summary.opportunityRisks },
  ];

  const controlData = [
    { name: "Effective", value: data.summary.effectiveControls, color: "#16a34a" },
    { name: "Partially Effective", value: data.summary.partiallyEffectiveControls, color: "#d97706" },
    { name: "Ineffective", value: data.summary.ineffectiveControls, color: "#dc2626" },
  ];

  const tabs = ["overview", "risks", "kris", "treatments", "opportunities"];

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", background: "#f9fafb", minHeight: "100vh" }}>

      <div style={{ background: "#1e3a5f", color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700" }}>LGSETA Risk Intelligence Command</div>
          <div style={{ fontSize: "13px", opacity: 0.7 }}>Reporting Period: {data.reportingPeriod.currentPeriod}</div>
        </div>
        <div style={{ fontSize: "13px", opacity: 0.7 }}>Last updated: {new Date().toLocaleDateString()}</div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px", display: "flex", gap: "8px" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
            fontWeight: activeTab === tab ? "700" : "400",
            color: activeTab === tab ? "#1e3a5f" : "#6b7280",
            borderBottom: activeTab === tab ? "3px solid #1e3a5f" : "3px solid transparent",
            textTransform: "capitalize", fontSize: "14px",
          }}>
            {tab === "kris" ? "KRIs" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: "32px" }}>

        {activeTab === "overview" && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1e3a5f" }}>Executive Summary</h2>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
              <SummaryCard label="Total Risks" value={data.summary.totalRisks} color="#1e3a5f" />
              <SummaryCard label="Outside Tolerance" value={data.summary.outsideTolerance} color="#dc2626" />
              <SummaryCard label="Within Appetite" value={data.summary.withinAppetite} color="#16a34a" />
              <SummaryCard label="Ineffective Controls" value={data.summary.ineffectiveControls} color="#d97706" />
              <SummaryCard label="Strategic Risks" value={data.summary.strategicRisks} color="#7c3aed" />
              <SummaryCard label="Financial Risks" value={data.summary.financialRisks} color="#0891b2" />
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "24px" }}>
              <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1, minWidth: "260px" }}>
                <div style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "16px" }}>Risk Status Breakdown</div>
                <DonutChart data={statusData} />
              </div>
              <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1, minWidth: "260px" }}>
                <div style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "16px" }}>Risks by Category</div>
                <BarChart data={categoryData} color="#1e3a5f" />
              </div>
              <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1, minWidth: "260px" }}>
                <div style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "16px" }}>Control Effectiveness</div>
                <BarChart data={controlData} color="#1e3a5f" />
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "24px" }}>
              <div style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "16px" }}>KRI Trend — Previous vs Current Period</div>
              <KRITrendChart kris={data.kris} />
            </div>

            <h2 style={{ marginBottom: "16px", color: "#1e3a5f" }}>Risk Appetite Dashboard</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.appetiteDashboard.map(item => (
                <div key={item.riskArea} style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#1e3a5f" }}>{item.riskArea}</div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>Appetite: {item.appetiteLevel} — {item.toleranceThreshold}</div>
                  </div>
                  <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>Previous</div><div style={{ fontWeight: "600" }}>{item.previousValue}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>Current</div><div style={{ fontWeight: "600" }}>{item.currentValue}</div></div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "risks" && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1e3a5f" }}>Risk Register</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.risks.map(risk => (
                <div key={risk.id} style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `5px solid ${risk.currentStatus === "Red" ? "#dc2626" : risk.currentStatus === "Amber" ? "#d97706" : "#16a34a"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{risk.id} — {risk.category}</span>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#1e3a5f", marginTop: "4px" }}>{risk.title}</div>
                    </div>
                    <StatusBadge status={risk.currentStatus} />
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "10px" }}>{risk.description}</p>
                  <div style={{ display: "flex", gap: "24px", marginTop: "12px", flexWrap: "wrap" }}>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Rating</span><div style={{ fontWeight: "600" }}>{risk.currentRating}</div></div>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Owner</span><div style={{ fontWeight: "600" }}>{risk.owner}</div></div>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Controls</span><div style={{ fontWeight: "600" }}>{risk.controlEffectiveness}</div></div>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Appetite</span><div style={{ fontWeight: "600" }}>{risk.appetite}</div></div>
                  </div>
                  <div style={{ marginTop: "12px", background: "#f9fafb", borderRadius: "6px", padding: "10px 14px", fontSize: "13px", color: "#374151" }}>
                    <strong>Treatment:</strong> {risk.treatmentAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "kris" && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1e3a5f" }}>Key Risk Indicators</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.kris.map(kri => (
                <div key={kri.id} style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "16px" }}>{kri.indicator}</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>Trend: <strong>{kri.trend}</strong></span>
                      <StatusBadge status={kri.currentStatus} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "32px", marginTop: "16px", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>Previous</div><div style={{ fontSize: "22px", fontWeight: "700" }}>{kri.previousPeriodValue}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>Current</div><div style={{ fontSize: "22px", fontWeight: "700", color: kri.currentStatus === "Red" ? "#dc2626" : kri.currentStatus === "Amber" ? "#d97706" : "#16a34a" }}>{kri.currentPeriodValue}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>🟢 Green</div><div style={{ fontSize: "13px" }}>{kri.greenThreshold}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>🟡 Amber</div><div style={{ fontSize: "13px" }}>{kri.amberThreshold}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "#6b7280" }}>🔴 Red</div><div style={{ fontSize: "13px" }}>{kri.redThreshold}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "treatments" && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1e3a5f" }}>Treatment Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.treatmentActions.map(action => (
                <div key={action.id} style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `5px solid ${action.status === "Overdue" ? "#dc2626" : "#d97706"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ fontWeight: "700", color: "#1e3a5f" }}>{action.id} — Risk: {action.riskId}</div>
                    <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: action.status === "Overdue" ? "#fee2e2" : "#fef3c7", color: action.status === "Overdue" ? "#991b1b" : "#92400e" }}>{action.status}</span>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "10px" }}>{action.action}</p>
                  <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Owner</span><div style={{ fontWeight: "600" }}>{action.owner}</div></div>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Due Date</span><div style={{ fontWeight: "600" }}>{action.dueDate}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "opportunities" && (
          <div>
            <h2 style={{ marginBottom: "8px", color: "#1e3a5f" }}>Opportunity Risks</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px" }}>
              Strategic opportunities that LGSETA can leverage to enhance its mandate delivery.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {data.opportunityRisks.map(opp => (
                <div key={opp.id} style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "5px solid #0891b2" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{opp.id} — {opp.category}</span>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#1e3a5f", marginTop: "4px" }}>{opp.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: "#dbeafe", color: "#1e40af" }}>
                        Upside: {opp.upsidePotential}
                      </span>
                      <StatusBadge status={opp.currentStatus} />
                    </div>
                  </div>

                  <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "12px" }}>{opp.description}</p>

                  <div style={{ display: "flex", gap: "24px", marginTop: "12px", flexWrap: "wrap" }}>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Owner</span><div style={{ fontWeight: "600" }}>{opp.owner}</div></div>
                    <div><span style={{ fontSize: "12px", color: "#6b7280" }}>Previous Status</span><div style={{ fontWeight: "600" }}>{opp.previousStatus}</div></div>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a5f", marginBottom: "8px" }}>Enabling Factors</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {opp.enablingFactors.map((factor, i) => (
                        <span key={i} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: "500" }}>
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "14px", background: "#eff6ff", borderRadius: "6px", padding: "10px 14px", fontSize: "13px", color: "#1e40af" }}>
                    <strong>Action:</strong> {opp.action}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}