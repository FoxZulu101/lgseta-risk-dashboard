import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts";

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:       "#0d1117",
  surface:  "#161b22",
  card:     "#1c2230",
  border:   "#30363d",
  text:     "#e6edf3",
  muted:    "#8b949e",
  red:      "#f85149",
  amber:    "#e3b341",
  green:    "#3fb950",
  blue:     "#58a6ff",
  purple:   "#a371f7",
  cyan:     "#39d353",
};

// ─── MOCK DATA (mirrors your live dashboard) ──────────────────────────────────
const strategicRisks = [
  { id:"SR-001", name:"Limited and Undivided Mandate",           inherent:16, residual:12, status:"Outside Tolerance",  owner:"CEO",          appetite:"Low",    treatment:"Mitigate" },
  { id:"SR-002", name:"Inadequate Stakeholder Engagement",       inherent:12, residual:9,  status:"Within Tolerance",   owner:"COO",          appetite:"Low",    treatment:"Mitigate" },
  { id:"SR-003", name:"Cyber & Information Security Threat",     inherent:10, residual:8,  status:"Outside Tolerance",  owner:"CIO",          appetite:"Medium", treatment:"Mitigate" },
  { id:"SR-004", name:"Erosion of Organisational Integrity",     inherent:14, residual:10, status:"Outside Tolerance",  owner:"CFO",          appetite:"Zero",   treatment:"Avoid"    },
  { id:"SR-005", name:"Threat to Information Assets",            inherent:18, residual:14, status:"Outside Tolerance",  owner:"CIO",          appetite:"Low",    treatment:"Mitigate" },
  { id:"COMP-001",name:"Non-Compliance with Legislation",        inherent:15, residual:11, status:"Outside Tolerance",  owner:"Legal",        appetite:"Zero",   treatment:"Avoid"    },
  { id:"COMP-002",name:"Skills Development Delivery Failure",    inherent:9,  residual:6,  status:"Within Tolerance",   owner:"ETQA",         appetite:"Low",    treatment:"Mitigate" },
  { id:"OP-001",  name:"Financial Sustainability Risk",          inherent:12, residual:8,  status:"Within Tolerance",   owner:"CFO",          appetite:"Low",    treatment:"Mitigate" },
  { id:"OP-002",  name:"SCM Procurement Irregularities",         inherent:16, residual:12, status:"Outside Tolerance",  owner:"SCM Manager",  appetite:"Zero",   treatment:"Avoid"    },
  { id:"OP-003",  name:"Human Capital Instability",              inherent:9,  residual:7,  status:"Within Tolerance",   owner:"HR",           appetite:"Low",    treatment:"Mitigate" },
];

const kriData = [
  { id:"KRI-001", name:"Levy Income vs Budget",         actual:94,  target:95,  unit:"%",  trend:"down",   status:"Outside Tolerance"  },
  { id:"KRI-002", name:"DG Disbursement Rate",          actual:78,  target:80,  unit:"%",  trend:"up",     status:"Within Tolerance"   },
  { id:"KRI-003", name:"Audit Findings (Material)",     actual:3,   target:2,   unit:"#",  trend:"stable", status:"Outside Tolerance"  },
  { id:"KRI-004", name:"Treatment Action Completion",   actual:72,  target:85,  unit:"%",  trend:"up",     status:"Outside Tolerance"  },
  { id:"KRI-005", name:"UIFW as % of Budget",           actual:4.2, target:2,   unit:"%",  trend:"down",   status:"Outside Tolerance"  },
  { id:"KRI-006", name:"Stakeholder Satisfaction",      actual:68,  target:75,  unit:"%",  trend:"up",     status:"Outside Tolerance"  },
  { id:"KRI-007", name:"BCM Test Success Rate",         actual:88,  target:90,  unit:"%",  trend:"stable", status:"Within Tolerance"   },
  { id:"KRI-008", name:"Fraud Cases Reported",          actual:2,   target:0,   unit:"#",  trend:"down",   status:"Outside Tolerance"  },
];

const treatmentActions = [
  { id:"TA-001", risk:"SR-005", action:"Implement ISMS aligned to ISO 27001",         owner:"CIO",         due:"2026-09-30", progress:65, status:"In Progress"  },
  { id:"TA-002", risk:"SR-001", action:"Engage DHET on mandate clarification",         owner:"CEO",         due:"2026-07-31", progress:40, status:"In Progress"  },
  { id:"TA-003", risk:"OP-002", action:"Strengthen SCM oversight committee",           owner:"SCM Manager", due:"2026-06-30", progress:90, status:"Near Complete" },
  { id:"TA-004", risk:"COMP-001",action:"Legal compliance calendar implementation",    owner:"Legal",       due:"2026-08-31", progress:55, status:"In Progress"  },
  { id:"TA-005", risk:"SR-004", action:"Ethics hotline and awareness campaign",        owner:"HR",          due:"2026-07-15", progress:80, status:"In Progress"  },
  { id:"TA-006", risk:"KRI-008",action:"Fraud risk assessment and controls review",   owner:"IA",          due:"2026-09-30", progress:25, status:"Not Started"  },
  { id:"TA-007", risk:"SR-003", action:"Penetration testing and patch management",     owner:"CIO",         due:"2026-06-30", progress:100,status:"Complete"      },
  { id:"TA-008", risk:"OP-001", action:"Five-year financial sustainability plan",      owner:"CFO",         due:"2026-10-31", progress:30, status:"In Progress"  },
];

const uifwData = [
  { id:"UIFW-001", type:"Irregular",   amount:8500000,  dept:"SCM",        description:"Awards without competitive bidding",       status:"Under Investigation", period:"Q2 2026/27" },
  { id:"UIFW-002", type:"Irregular",   amount:3200000,  dept:"Finance",    description:"Payment without valid PO",                 status:"Condoned",            period:"Q1 2026/27" },
  { id:"UIFW-003", type:"Fruitless",   amount:1800000,  dept:"HR",         description:"Training cancellation penalties",          status:"Open",                period:"Q2 2026/27" },
  { id:"UIFW-004", type:"Wasteful",    amount:950000,   dept:"Operations", description:"Duplicate payments",                       status:"Recovered",           period:"Q1 2026/27" },
  { id:"UIFW-005", type:"Irregular",   amount:4200000,  dept:"Projects",   description:"Non-compliant variation orders",           status:"Under Investigation", period:"Q2 2026/27" },
  { id:"UIFW-006", type:"Fruitless",   amount:1250000,  dept:"SCM",        description:"Expired contract renewals",               status:"Open",                period:"Q2 2026/27" },
];

const fraudCases = [
  { id:"FC-001", category:"Procurement Fraud",     description:"Fictitious supplier payments",  amount:2100000, status:"Under Investigation", reported:"2026-03-15", source:"Hotline"   },
  { id:"FC-002", category:"Misappropriation",      description:"Petty cash irregularities",     amount:45000,   status:"Resolved",            reported:"2026-01-10", source:"Internal"  },
  { id:"FC-003", category:"Conflict of Interest",  description:"Undisclosed business interest", amount:0,       status:"Disciplinary Action", reported:"2026-04-02", source:"Disclosure"},
];

const departments = [
  { name:"Finance",    risks:8,  critical:2, treatment:75, uifw:3200000  },
  { name:"SCM",        risks:12, critical:4, treatment:60, uifw:8500000  },
  { name:"HR",         risks:6,  critical:1, treatment:85, uifw:1800000  },
  { name:"Operations", risks:9,  critical:2, treatment:70, uifw:950000   },
  { name:"Projects",   risks:10, critical:3, treatment:65, uifw:4200000  },
  { name:"Legal",      risks:5,  critical:2, treatment:80, uifw:0        },
  { name:"IT",         risks:7,  critical:2, treatment:55, uifw:0        },
  { name:"ETQA",       risks:6,  critical:1, treatment:90, uifw:0        },
];

const thirdParties = [
  { id:"TP-001", name:"Deloitte SA",          type:"Auditor",       risk:"Low",    contract:"2027-03-31", score:88, status:"Active"   },
  { id:"TP-002", name:"Bytes Technology",     type:"ICT",           risk:"Medium", contract:"2026-09-30", score:72, status:"Active"   },
  { id:"TP-003", name:"Tsebo Facilities",     type:"Facilities",    risk:"Low",    contract:"2026-12-31", score:81, status:"Active"   },
  { id:"TP-004", name:"SAICA Training Co",    type:"Training",      risk:"High",   contract:"2026-06-30", score:58, status:"Review"   },
  { id:"TP-005", name:"Standard Bank",        type:"Banking",       risk:"Low",    contract:"Ongoing",    score:95, status:"Active"   },
  { id:"TP-006", name:"Lekota Security",      type:"Security",      risk:"Medium", contract:"2026-08-31", score:67, status:"Active"   },
];

const appItems = [
  { ref:"APP 1.1", objective:"Increase learnership registrations by 15%",  target:15,  actual:12,  status:"Behind",    quarter:"Q2"  },
  { ref:"APP 1.2", objective:"Disburse 90% of DG budget",                  target:90,  actual:78,  status:"Behind",    quarter:"Q2"  },
  { ref:"APP 2.1", objective:"Achieve clean audit opinion",                 target:100, actual:100, status:"On Track",  quarter:"Q4"  },
  { ref:"APP 2.2", objective:"Reduce UIFW below 2% of budget",             target:2,   actual:4.2, status:"Behind",    quarter:"Q2"  },
  { ref:"APP 3.1", objective:"Complete ICT master plan",                    target:100, actual:60,  status:"In Progress",quarter:"Q3" },
  { ref:"APP 3.2", objective:"Stakeholder satisfaction above 75%",          target:75,  actual:68,  status:"Behind",    quarter:"Q2"  },
  { ref:"APP 4.1", objective:"Fill all critical vacancies",                 target:100, actual:85,  status:"In Progress",quarter:"Q3" },
];

const bcmSections = {
  overview: {
    biaComplete: 85, plansTested: 6, plansTotal: 8,
    rto: "4 hours", rpo: "2 hours", lastTest: "2026-04-15", nextTest: "2026-10-15",
    criticalProcesses: 12, processesWithBCP: 10,
  },
  incidents: [
    { id:"INC-001", date:"2026-02-10", type:"IT Outage",       duration:"3.5 hrs", impact:"Medium", resolution:"Resolved", rtoMet:true  },
    { id:"INC-002", date:"2026-04-05", type:"Power Failure",   duration:"1.2 hrs", impact:"Low",    resolution:"Resolved", rtoMet:true  },
    { id:"INC-003", date:"2026-05-20", type:"Data Breach Attempt",duration:"N/A", impact:"High",   resolution:"Contained",rtoMet:false },
  ],
};

const emergingRisks = [
  { id:"ER-001", name:"AI Displacement of Skills Dev",      likelihood:4, impact:4, horizon:"12-24 months", category:"Technology",  action:"Monitor"    },
  { id:"ER-002", name:"Geopolitical Trade Disruptions",     likelihood:3, impact:3, horizon:"6-12 months",  category:"Economic",    action:"Watch"      },
  { id:"ER-003", name:"Regulatory Overhaul (SETA landscape)",likelihood:4,impact:5, horizon:"12-18 months", category:"Regulatory",  action:"Escalate"   },
  { id:"ER-004", name:"Cybersecurity — Ransomware",         likelihood:4, impact:4, horizon:"Immediate",    category:"Technology",  action:"Mitigate"   },
  { id:"ER-005", name:"Climate Risk to Operations",         likelihood:2, impact:3, horizon:"24+ months",   category:"Environment", action:"Monitor"    },
];

const opportunities = [
  { id:"OPP-001", name:"Digital Skills Grant Expansion",    score:18, benefit:"R15M additional levy income",  status:"Active",   owner:"CEO"   },
  { id:"OPP-002", name:"Inter-SETA Collaboration",          score:12, benefit:"Shared infrastructure savings", status:"Proposed", owner:"COO"   },
  { id:"OPP-003", name:"Green Skills Programme",             score:15, benefit:"New funding stream",            status:"Active",   owner:"ETQA"  },
  { id:"OPP-004", name:"AI-Enhanced M&E Platform",          score:14, benefit:"30% reporting efficiency gain", status:"Proposed", owner:"CIO"   },
  { id:"OPP-005", name:"Expanded RPL Assessments",          score:10, benefit:"R5M additional revenue",        status:"Active",   owner:"ETQA"  },
];

const combinedAssurance = [
  { risk:"SR-005", assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Partially covered", level:"Reasonable" },
  { risk:"OP-002", assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Coverage gap",      level:"Limited"    },
  { risk:"COMP-001",assurer1:"IA-Covered", assurer2:"Legal-Reviewed",    assurer3:"AGSA-Clean",    gap:"None",              level:"Full"       },
  { risk:"SR-001", assurer1:"Board-Noted", assurer2:"Ext Audit-Clean",   assurer3:"AGSA-Clean",    gap:"None",              level:"Reasonable" },
];

const riskAppetite = [
  { category:"Financial",    appetite:"Low",    current:12.4, max:8,  unit:"score" },
  { category:"Compliance",   appetite:"Zero",   current:3,    max:0,  unit:"findings" },
  { category:"Operational",  appetite:"Medium", current:9.2,  max:12, unit:"score" },
  { category:"Reputational", appetite:"Low",    current:6.1,  max:5,  unit:"score" },
  { category:"Strategic",    appetite:"Low",    current:14.2, max:10, unit:"score" },
  { category:"Technology",   appetite:"Medium", current:8.8,  max:12, unit:"score" },
];

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1.25rem", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ color: C.text, fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "0.02em" }}>{children}</h2>;
}

function Badge({ label, color }) {
  const bg = color === "red" ? "#3d1a1a" : color === "green" ? "#1a3d2b" : color === "amber" ? "#3d2e1a" : color === "blue" ? "#1a2a3d" : "#2a2a3d";
  const fg = color === "red" ? C.red : color === "green" ? C.green : color === "amber" ? C.amber : color === "blue" ? C.blue : C.purple;
  return <span style={{ background: bg, color: fg, borderRadius: 5, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
}

function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const color = s.includes("outside") || s.includes("critical") || s.includes("high") || s.includes("overdue") ? "red"
    : s.includes("within") || s.includes("complete") || s.includes("active") || s.includes("on track") ? "green"
    : s.includes("progress") || s.includes("medium") || s.includes("watch") || s.includes("proposed") ? "amber"
    : "blue";
  return <Badge label={status} color={color} />;
}

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct >= 90 ? C.green : pct >= 60 ? C.amber : C.red;
  return (
    <div style={{ background: C.border, borderRadius: 4, height: 8, width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color || barColor, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

function KPICard({ label, value, sub, color = C.blue, icon = "●" }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `3px solid ${color}` }}>
      <span style={{ color: C.muted, fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ color, fontSize: "1.9rem", fontWeight: 800, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ color: C.muted, fontSize: "0.78rem" }}>{sub}</span>}
    </Card>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ color: C.muted, fontWeight: 600, padding: "0.5rem 0.75rem", textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "0.55rem 0.75rem", color: C.text, verticalAlign: "middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MODULE: EXECUTIVE OVERVIEW ───────────────────────────────────────────────
function ExecutiveOverview() {
  const outsideTolerance = strategicRisks.filter(r => r.status === "Outside Tolerance").length;
  const overdueActions   = treatmentActions.filter(a => a.status !== "Complete" && new Date(a.due) < new Date()).length;
  const totalUifw        = uifwData.reduce((s, r) => s + r.amount, 0);
  const treatmentPct     = Math.round(treatmentActions.filter(a => a.status === "Complete").length / treatmentActions.length * 100);

  const heatmapData = [5,4,3,2,1].map(impact =>
    [1,2,3,4,5].map(likelihood => {
      const score = impact * likelihood;
      const risks = strategicRisks.filter(r => Math.round(r.inherent / 5) === likelihood && Math.round(r.inherent / likelihood) === impact);
      return { score, count: risks.length, ids: risks.map(r => r.id) };
    })
  );
  const heatColor = (s) => s >= 15 ? C.red : s >= 10 ? "#e36209" : s >= 6 ? C.amber : s >= 3 ? C.green : "#1a3d2b";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Executive Overview</h1>
          <p style={{ color: C.muted, fontSize: "0.82rem", margin: "2px 0 0" }}>Reporting Period: Q2 2026/27 | Report Date: 2026-06-14</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Badge label={`● ${outsideTolerance} Outside Tolerance`} color="red" />
          <Badge label={`⚠ ${overdueActions} Overdue Actions`} color="amber" />
          <span style={{ color: C.muted, fontSize: "0.78rem", alignSelf: "center" }}>Next Review: 2026-09-30</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <KPICard label="Total Risks"         value={strategicRisks.length} sub="+4 Emerging"                    color={C.blue}   />
        <KPICard label="Outside Tolerance"   value={outsideTolerance}       sub="Immediate action required"     color={C.red}    />
        <KPICard label="Treatment Completion"value={`${treatmentPct}%`}     sub={`${treatmentActions.filter(a=>a.status==="Complete").length} of ${treatmentActions.length} actions`} color={C.green} />
        <KPICard label="Overall Risk Exposure"value="12.4"                  sub="↓ 1.2 from last period"       color={C.amber}  />
        <KPICard label="Material Findings"   value="3"                      sub="From assurance reviews"       color={C.purple} />
      </div>

      {/* UIFW alert */}
      <Card style={{ borderLeft: `4px solid ${C.red}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚠</span>
          <div>
            <div style={{ color: C.red, fontSize: "1.6rem", fontWeight: 800 }}>R{(totalUifw/1e6).toFixed(1)}M</div>
            <div style={{ color: C.text, fontWeight: 600 }}>UIFW Exposure</div>
            <div style={{ color: C.muted, fontSize: "0.8rem" }}>{uifwData.length} open cases across {new Set(uifwData.map(u=>u.dept)).size} departments</div>
          </div>
        </div>
      </Card>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        {/* Risk heatmap */}
        <Card>
          <SectionTitle>Risk Heatmap — Inherent Risk Matrix</SectionTitle>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 4 }}>
            {["1","2","3","4","5"].map((l, li) => (
              <div key={li} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[5,4,3,2,1].map((impact, ii) => {
                  const score = impact * Number(l);
                  return (
                    <div key={ii} style={{ width: 44, height: 36, background: heatColor(score), borderRadius: 4,
                      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>{score}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {[["≥15","Critical",C.red],[">9","High","#e36209"],[">5","Medium",C.amber],["≤5","Low",C.green]].map(([v,l,c])=>(
              <span key={l} style={{ color: c, fontSize: "0.7rem" }}>■ {l}</span>
            ))}
          </div>
        </Card>

        {/* Risk status donut */}
        <Card>
          <SectionTitle>Risk Status Breakdown</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[
                { name:"Outside Tolerance", value: outsideTolerance },
                { name:"Within Tolerance",  value: strategicRisks.filter(r=>r.status==="Within Tolerance").length },
                { name:"Emerging",          value: 4 },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {[C.red, C.amber, C.blue].map((c,i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: "0.78rem" }} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top 5 critical */}
        <Card>
          <SectionTitle>Top 5 Critical Risks</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {strategicRisks.sort((a,b)=>b.inherent-a.inherent).slice(0,5).map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.muted, fontSize: "0.7rem" }}>{r.id}</div>
                  <div style={{ color: C.text, fontSize: "0.8rem", fontWeight: 500 }}>{r.name.slice(0,22)}…</div>
                </div>
                <span style={{ color: C.red, fontWeight: 800, fontSize: "1rem", minWidth: 24, textAlign: "right" }}>{r.inherent}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MODULE: RISK APPETITE ────────────────────────────────────────────────────
function RiskAppetite() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Risk Appetite Framework</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {riskAppetite.map(r => {
          const breach = r.current > r.max;
          return (
            <Card key={r.category} style={{ borderLeft: `3px solid ${breach ? C.red : C.green}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: C.text, fontWeight: 700 }}>{r.category}</span>
                <Badge label={r.appetite} color={r.appetite==="Zero"?"red":r.appetite==="Low"?"amber":"green"} />
              </div>
              <div style={{ color: breach ? C.red : C.green, fontSize: "1.6rem", fontWeight: 800 }}>
                {r.current} <span style={{ color: C.muted, fontSize: "0.8rem" }}>{r.unit}</span>
              </div>
              <div style={{ color: C.muted, fontSize: "0.78rem", marginBottom: "0.5rem" }}>Tolerance limit: {r.max} {r.unit}</div>
              <ProgressBar value={r.current} max={r.max * 1.5} color={breach ? C.red : C.green} />
              {breach && <div style={{ color: C.red, fontSize: "0.75rem", marginTop: "0.4rem" }}>⚠ Appetite breached</div>}
            </Card>
          );
        })}
      </div>
      <Card>
        <SectionTitle>Appetite Statement</SectionTitle>
        <p style={{ color: C.muted, lineHeight: 1.7, fontSize: "0.88rem" }}>
          LGSETA has a <strong style={{ color: C.text }}>Zero tolerance</strong> for compliance breaches and fraud.
          The organisation maintains a <strong style={{ color: C.text }}>Low appetite</strong> for financial, reputational, and strategic risks,
          accepting only controlled and time-bound exposures where value is derived.
          A <strong style={{ color: C.text }}>Medium appetite</strong> applies to operational and technology risks where innovation is pursued.
        </p>
      </Card>
    </div>
  );
}

// ─── MODULE: STRATEGIC RISKS ──────────────────────────────────────────────────
function StrategicRisks() {
  const [search, setSearch] = useState("");
  const filtered = strategicRisks.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Strategic Risk Register</h1>
        <input placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "0.45rem 0.85rem", color: C.text, fontSize: "0.85rem", width: 220, outline: "none" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.85rem" }}>
        <KPICard label="Total Risks"           value={strategicRisks.length}                                               color={C.blue}   />
        <KPICard label="Outside Tolerance"     value={strategicRisks.filter(r=>r.status==="Outside Tolerance").length}     color={C.red}    />
        <KPICard label="Avg Residual Score"    value={(strategicRisks.reduce((s,r)=>s+r.residual,0)/strategicRisks.length).toFixed(1)} color={C.amber}  />
      </div>
      <Card>
        <Table
          headers={["ID","Risk Description","Inherent","Residual","Appetite","Owner","Treatment","Status"]}
          rows={filtered.map(r => [
            <span style={{ color: C.blue, fontWeight: 700 }}>{r.id}</span>,
            r.name,
            <span style={{ color: r.inherent >= 15 ? C.red : r.inherent >= 10 ? C.amber : C.green, fontWeight: 700 }}>{r.inherent}</span>,
            <span style={{ color: r.residual >= 12 ? C.red : r.residual >= 8 ? C.amber : C.green, fontWeight: 700 }}>{r.residual}</span>,
            r.appetite,
            r.owner,
            r.treatment,
            <StatusBadge status={r.status} />,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: KRI MONITORING ───────────────────────────────────────────────────
function KRIMonitoring() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>KRI Monitoring Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {kriData.map(k => {
          const breach = k.unit === "#" ? k.actual > k.target : k.actual < k.target;
          const pct    = k.unit === "#" ? Math.min(100, (k.target / Math.max(k.actual,1)) * 100) : (k.actual / k.target) * 100;
          return (
            <Card key={k.id} style={{ borderTop: `3px solid ${breach ? C.red : C.green}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <span style={{ color: C.muted, fontSize: "0.72rem", fontWeight: 700 }}>{k.id}</span>
                <StatusBadge status={k.status} />
              </div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.5rem" }}>{k.name}</div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ color: C.muted, fontSize: "0.7rem" }}>Actual</div>
                  <div style={{ color: breach ? C.red : C.green, fontSize: "1.4rem", fontWeight: 800 }}>{k.actual}{k.unit === "%" ? "%" : ""}</div>
                </div>
                <div>
                  <div style={{ color: C.muted, fontSize: "0.7rem" }}>Target</div>
                  <div style={{ color: C.text, fontSize: "1.4rem", fontWeight: 800 }}>{k.target}{k.unit === "%" ? "%" : ""}</div>
                </div>
                <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                  <span style={{ fontSize: "1rem" }}>{k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "→"}</span>
                </div>
              </div>
              <ProgressBar value={pct} max={100} color={breach ? C.red : C.green} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODULE: OPPORTUNITIES ────────────────────────────────────────────────────
function Opportunities() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Strategic Opportunities Register</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {opportunities.map(o => (
          <Card key={o.id} style={{ borderLeft: `3px solid ${C.cyan}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <span style={{ color: C.muted, fontSize: "0.72rem" }}>{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ color: C.text, fontWeight: 700, marginBottom: "0.35rem" }}>{o.name}</div>
            <div style={{ color: C.cyan, fontSize: "0.82rem", marginBottom: "0.4rem" }}>💡 {o.benefit}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted, fontSize: "0.78rem" }}>Owner: {o.owner}</span>
              <span style={{ color: C.amber, fontWeight: 700 }}>Score: {o.score}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: EMERGING RISKS ───────────────────────────────────────────────────
function EmergingRisks() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Emerging Risk Radar</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {emergingRisks.map(r => (
          <Card key={r.id} style={{ borderLeft: `3px solid ${r.action === "Escalate" ? C.red : r.action === "Mitigate" ? C.amber : C.blue}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <Badge label={r.category} color="blue" />
              <Badge label={r.action}   color={r.action === "Escalate" ? "red" : r.action === "Mitigate" ? "amber" : "blue"} />
            </div>
            <div style={{ color: C.text, fontWeight: 700, marginBottom: "0.5rem" }}>{r.name}</div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div>
                <div style={{ color: C.muted, fontSize: "0.7rem" }}>Likelihood</div>
                <div style={{ color: C.amber, fontWeight: 800 }}>{r.likelihood}/5</div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: "0.7rem" }}>Impact</div>
                <div style={{ color: C.red, fontWeight: 800 }}>{r.impact}/5</div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: "0.7rem" }}>Horizon</div>
                <div style={{ color: C.text, fontSize: "0.82rem" }}>{r.horizon}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: TREATMENT ACTIONS ────────────────────────────────────────────────
function TreatmentActions() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Treatment Action Tracker</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.85rem" }}>
        {[["Total Actions", treatmentActions.length, C.blue],
          ["Complete",      treatmentActions.filter(a=>a.status==="Complete").length,     C.green],
          ["In Progress",   treatmentActions.filter(a=>a.status==="In Progress").length,  C.amber],
          ["Not Started",   treatmentActions.filter(a=>a.status==="Not Started").length,  C.red]
        ].map(([l,v,c]) => <KPICard key={l} label={l} value={v} color={c} />)}
      </div>
      <Card>
        <Table
          headers={["ID","Risk Ref","Action","Owner","Due Date","Progress","Status"]}
          rows={treatmentActions.map(a => [
            <span style={{ color: C.blue, fontWeight: 700 }}>{a.id}</span>,
            a.risk,
            a.action,
            a.owner,
            a.due,
            <div style={{ minWidth: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: C.muted, fontSize: "0.72rem" }}>{a.progress}%</span>
              </div>
              <ProgressBar value={a.progress} />
            </div>,
            <StatusBadge status={a.status} />,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: COMBINED ASSURANCE ───────────────────────────────────────────────
function CombinedAssurance() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Combined Assurance Map</h1>
      <Card>
        <Table
          headers={["Risk Ref","1st Line (Management)","2nd Line (IA / Compliance)","3rd Line (Ext / AGSA)","Coverage Gap","Assurance Level"]}
          rows={combinedAssurance.map(r => [
            <span style={{ color: C.blue, fontWeight: 700 }}>{r.risk}</span>,
            r.assurer1, r.assurer2, r.assurer3,
            r.gap,
            <StatusBadge status={r.level} />,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: BCM RESILIENCE ───────────────────────────────────────────────────
function BCMResilience() {
  const [sub, setSub] = useState("overview");
  const tabs = ["overview","incidents","plans","crisis","recovery","communications","testing","suppliers","dependencies","it-dr","training"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>BCM & Resilience</h1>

      {/* BCM sub-tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setSub(t)}
            style={{ padding: "0.45rem 0.9rem", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
              color: sub === t ? C.blue : C.muted, borderBottom: sub === t ? `2px solid ${C.blue}` : "2px solid transparent",
              whiteSpace: "nowrap", textTransform: "capitalize" }}>
            {t.replace("-"," ")}
          </button>
        ))}
      </div>

      {sub === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem" }}>
            <KPICard label="BIA Completion"    value={`${bcmSections.overview.biaComplete}%`}   color={C.green}  />
            <KPICard label="Plans Tested"       value={`${bcmSections.overview.plansTested}/${bcmSections.overview.plansTotal}`} color={C.amber} />
            <KPICard label="RTO Target"         value={bcmSections.overview.rto}                color={C.blue}   />
            <KPICard label="RPO Target"         value={bcmSections.overview.rpo}                color={C.purple} />
            <KPICard label="Critical Processes" value={bcmSections.overview.criticalProcesses}  color={C.blue}   />
            <KPICard label="Processes w/ BCP"   value={bcmSections.overview.processesWithBCP}   color={C.green}  />
          </div>
        </div>
      )}
      {sub === "incidents" && (
        <Card>
          <Table
            headers={["ID","Date","Type","Duration","Impact","RTO Met","Resolution"]}
            rows={bcmSections.incidents.map(i => [
              i.id, i.date, i.type, i.duration,
              <StatusBadge status={i.impact} />,
              i.rtoMet ? <Badge label="Yes" color="green" /> : <Badge label="No" color="red" />,
              i.resolution,
            ])}
          />
        </Card>
      )}
      {!["overview","incidents"].includes(sub) && (
        <Card>
          <p style={{ color: C.muted, textAlign: "center", padding: "2rem" }}>
            {sub.replace("-"," ").replace(/\b\w/g,c=>c.toUpperCase())} content — coming in Phase 2 data entry build.
          </p>
        </Card>
      )}
    </div>
  );
}

// ─── MODULE: FRAUD & ETHICS ───────────────────────────────────────────────────
function FraudEthics() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Fraud & Ethics Register</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.85rem" }}>
        <KPICard label="Total Cases"       value={fraudCases.length}                                             color={C.red}    />
        <KPICard label="Under Investigation" value={fraudCases.filter(f=>f.status==="Under Investigation").length} color={C.amber}  />
        <KPICard label="Total Exposure"    value={`R${(fraudCases.reduce((s,f)=>s+f.amount,0)/1e6).toFixed(2)}M`} color={C.red}  />
      </div>
      <Card>
        <Table
          headers={["ID","Category","Description","Amount","Source","Reported","Status"]}
          rows={fraudCases.map(f => [
            <span style={{ color: C.red, fontWeight: 700 }}>{f.id}</span>,
            f.category,
            f.description,
            f.amount > 0 ? `R${f.amount.toLocaleString()}` : "—",
            f.source,
            f.reported,
            <StatusBadge status={f.status} />,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: DEPARTMENTAL RISKS ───────────────────────────────────────────────
function DepartmentalRisks() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Departmental Risk Summary</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
        {departments.map(d => (
          <Card key={d.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: C.text, fontWeight: 700 }}>{d.name}</span>
              {d.uifw > 0 && <Badge label={`UIFW R${(d.uifw/1e6).toFixed(1)}M`} color="red" />}
            </div>
            <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.75rem" }}>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Risks</div><div style={{ color: C.blue, fontWeight: 800 }}>{d.risks}</div></div>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Critical</div><div style={{ color: C.red, fontWeight: 800 }}>{d.critical}</div></div>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Treatment</div><div style={{ color: C.green, fontWeight: 800 }}>{d.treatment}%</div></div>
            </div>
            <ProgressBar value={d.treatment} color={d.treatment >= 80 ? C.green : d.treatment >= 60 ? C.amber : C.red} />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: UIFW EXPENDITURE ─────────────────────────────────────────────────
function UIFWExpenditure() {
  const total = uifwData.reduce((s,u) => s + u.amount, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>UIFW Expenditure Register</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.85rem" }}>
        <KPICard label="Total UIFW"       value={`R${(total/1e6).toFixed(1)}M`}                                    color={C.red}   />
        <KPICard label="Irregular"        value={`R${(uifwData.filter(u=>u.type==="Irregular").reduce((s,u)=>s+u.amount,0)/1e6).toFixed(1)}M`} color={C.amber} />
        <KPICard label="Open Cases"       value={uifwData.filter(u=>u.status==="Open"||u.status==="Under Investigation").length} color={C.red} />
      </div>
      <Card>
        <Table
          headers={["ID","Type","Department","Description","Amount","Period","Status"]}
          rows={uifwData.map(u => [
            <span style={{ color: C.amber, fontWeight: 700 }}>{u.id}</span>,
            <Badge label={u.type} color={u.type==="Irregular"?"red":u.type==="Fruitless"?"amber":"blue"} />,
            u.dept,
            u.description,
            <span style={{ color: C.red, fontWeight: 700 }}>R{u.amount.toLocaleString()}</span>,
            u.period,
            <StatusBadge status={u.status} />,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: THIRD-PARTY RISK ─────────────────────────────────────────────────
function ThirdPartyRisk() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Third-Party Risk Register</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
        {thirdParties.map(tp => (
          <Card key={tp.id} style={{ borderLeft: `3px solid ${tp.risk==="High"?C.red:tp.risk==="Medium"?C.amber:C.green}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <span style={{ color: C.text, fontWeight: 700 }}>{tp.name}</span>
              <StatusBadge status={tp.status} />
            </div>
            <div style={{ color: C.muted, fontSize: "0.78rem", marginBottom: "0.5rem" }}>{tp.type}</div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Risk Level</div>
                <Badge label={tp.risk} color={tp.risk==="High"?"red":tp.risk==="Medium"?"amber":"green"} /></div>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Score</div>
                <div style={{ color: tp.score>=80?C.green:tp.score>=65?C.amber:C.red, fontWeight: 800 }}>{tp.score}</div></div>
              <div><div style={{ color: C.muted, fontSize: "0.7rem" }}>Contract end</div>
                <div style={{ color: C.text, fontSize: "0.82rem" }}>{tp.contract}</div></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: APP ALIGNMENT ────────────────────────────────────────────────────
function APPAlignment() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Annual Performance Plan Alignment</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.85rem" }}>
        <KPICard label="On Track"    value={appItems.filter(a=>a.status==="On Track").length}    color={C.green}  />
        <KPICard label="Behind"      value={appItems.filter(a=>a.status==="Behind").length}      color={C.red}    />
        <KPICard label="In Progress" value={appItems.filter(a=>a.status==="In Progress").length} color={C.amber}  />
      </div>
      <Card>
        {appItems.map(a => (
          <div key={a.ref} style={{ padding: "0.75rem 0", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ color: C.blue, fontWeight: 700, minWidth: 70, fontSize: "0.82rem" }}>{a.ref}</span>
            <span style={{ color: C.text, flex: 1, fontSize: "0.88rem" }}>{a.objective}</span>
            <span style={{ color: C.muted, fontSize: "0.78rem", minWidth: 30 }}>Q{a.quarter}</span>
            <div style={{ minWidth: 100, textAlign: "right" }}>
              <div style={{ color: C.muted, fontSize: "0.7rem" }}>Target: {a.target}% | Actual: {a.actual}%</div>
              <ProgressBar value={a.actual} max={a.target} color={a.actual >= a.target ? C.green : C.red} />
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── MODULE: PREDICTIVE INTEL ─────────────────────────────────────────────────
function PredictiveIntel() {
  const forecastData = [
    { month:"Jul 26", exposure:13.2, uifw:18.5, treatment:68 },
    { month:"Aug 26", exposure:12.8, uifw:17.1, treatment:72 },
    { month:"Sep 26", exposure:12.1, uifw:15.8, treatment:78 },
    { month:"Oct 26", exposure:11.5, uifw:14.2, treatment:83 },
    { month:"Nov 26", exposure:10.9, uifw:12.5, treatment:88 },
    { month:"Dec 26", exposure:10.2, uifw:11.0, treatment:92 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ color: C.text, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Predictive Intelligence</h1>
      <Card>
        <SectionTitle>6-Month Risk Exposure Forecast</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: "0.78rem" }} />
            <Legend wrapperStyle={{ fontSize: "0.75rem", color: C.muted }} />
            <Line type="monotone" dataKey="exposure"  stroke={C.red}   strokeWidth={2} name="Risk Exposure" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="treatment" stroke={C.green} strokeWidth={2} name="Treatment %" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <SectionTitle>UIFW Trend Projection (R million)</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: "0.78rem" }} />
            <Bar dataKey="uifw" fill={C.amber} name="UIFW (Rm)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const MODULE_OPTIONS = [
  { value:"strategic",    label:"Strategic Risks"    },
  { value:"kri",          label:"KRI Monitoring"     },
  { value:"treatment",    label:"Treatment Actions"  },
  { value:"uifw",         label:"UIFW Expenditure"  },
  { value:"fraud",        label:"Fraud & Ethics"    },
  { value:"departmental", label:"Departmental Risks" },
  { value:"thirdparty",   label:"Third-Party Risk"  },
  { value:"opportunities",label:"Opportunities"     },
  { value:"emerging",     label:"Emerging Risks"    },
  { value:"app",          label:"APP Alignment"     },
  { value:"bcm",          label:"BCM Resilience"    },
];

function UploadSection() {
  const [module, setModule]   = useState("strategic");
  const [file, setFile]       = useState(null);
  const [status, setStatus]   = useState({ msg:"", type:"" });
  const [dragging, setDragging] = useState(false);

  function pickFile(f) {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) { setStatus({ msg:"Only .xlsx or .xls files accepted.", type:"err" }); return; }
    setFile(f); setStatus({ msg:"", type:"" });
  }

  async function handleUpload() {
    if (!file) { setStatus({ msg:"Please select an Excel file first.", type:"err" }); return; }
    setStatus({ msg:"Uploading — please wait…", type:"loading" });
    const form = new FormData();
    form.append("file", file);
    form.append("module", module);
    try {
      const res  = await fetch("https://lgseta-risk-dashboard.onrender.com/api/upload", { method:"POST", body:form });
      const data = await res.json();
      if (res.ok) { setStatus({ msg:`✅ Upload successful! ${data.message||"Data updated."}`, type:"ok" }); setFile(null); }
      else          { setStatus({ msg:`❌ Server error: ${data.error||"Unknown error"}`, type:"err" }); }
    } catch(err)  { setStatus({ msg:`❌ Network error: ${err.message}`, type:"err" }); }
  }

  const s = { background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" };
  const inputSt = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"0.5rem 0.75rem",
    color:C.text, fontSize:"0.9rem", width:"100%", maxWidth:360, outline:"none", boxSizing:"border-box" };

  return (
    <div style={s}>
      <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Upload Excel data</h3>
      <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem", lineHeight:1.65 }}>
        Choose the target module, then upload your <code style={{ color:C.blue }}>.xlsx</code> file.
      </p>

      <div style={{ marginBottom:"1.1rem" }}>
        <label style={{ display:"block", color:C.muted, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"0.4rem" }}>Target module</label>
        <select value={module} onChange={e=>setModule(e.target.value)} style={inputSt}>
          {MODULE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])}}
        onClick={()=>document.getElementById("admin-file").click()}
        style={{ border:`2px dashed ${dragging?C.blue:file?C.green:C.border}`, borderRadius:10, padding:"2rem",
          textAlign:"center", cursor:"pointer", marginBottom:"1.2rem",
          background:dragging?"rgba(88,166,255,0.05)":file?"rgba(63,185,80,0.05)":"transparent",
          transition:"all 0.15s" }}>
        <input id="admin-file" type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>pickFile(e.target.files[0])} />
        <div style={{ fontSize:"2rem", marginBottom:"0.4rem" }}>{file ? "📄" : "📂"}</div>
        {file
          ? <><div style={{ color:C.green, fontWeight:700 }}>{file.name}</div><div style={{ color:C.muted, fontSize:"0.78rem" }}>{(file.size/1024).toFixed(1)} KB · click to change</div></>
          : <div style={{ color:C.muted, fontSize:"0.88rem" }}>Drag & drop your .xlsx here, or click to browse</div>}
      </div>

      <button onClick={handleUpload} disabled={status.type==="loading"}
        style={{ padding:"0.65rem 2rem", background:C.blue, color:"#fff", border:"none", borderRadius:8,
          fontSize:"0.9rem", fontWeight:700, cursor:"pointer", opacity:status.type==="loading"?0.6:1, marginBottom:"1rem" }}>
        {status.type==="loading" ? "Uploading…" : "Upload to server"}
      </button>

      {status.msg && (
        <div style={{ padding:"0.6rem 0.9rem", borderRadius:6, fontSize:"0.88rem", marginBottom:"1rem",
          background:status.type==="ok"?"rgba(63,185,80,0.1)":status.type==="err"?"rgba(248,81,73,0.1)":"rgba(88,166,255,0.1)",
          borderLeft:`4px solid ${status.type==="ok"?C.green:status.type==="err"?C.red:C.blue}`,
          color:status.type==="ok"?C.green:status.type==="err"?C.red:C.blue }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

function ManualEditSection() {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" }}>
      <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Manual data entry</h3>
      <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem" }}>Select a module to open its data entry form.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px, 1fr))", gap:"0.7rem", marginBottom:"1.5rem" }}>
        {MODULE_OPTIONS.map(m => (
          <button key={m.value} onClick={()=>alert(`Phase 2: ${m.label} form — coming next!`)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.85rem 1rem",
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer",
              color:C.text, fontSize:"0.88rem", textAlign:"left", transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#1a2744";e.currentTarget.style.borderColor=C.blue}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border}}>
            <span style={{ fontWeight:500 }}>{m.label}</span>
            <span style={{ color:C.muted }}>→</span>
          </button>
        ))}
      </div>
      <div style={{ padding:"0.75rem 1rem", background:"rgba(88,166,255,0.08)", border:`1px solid rgba(88,166,255,0.25)`,
        borderRadius:7, fontSize:"0.83rem", color:C.blue }}>
        <strong>Phase 2 coming soon:</strong> Each card will open a full data-entry form — add, edit, delete records without Excel.
      </div>
    </div>
  );
}

function AdminTab() {
  const [view, setView] = useState("upload");
  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ color:C.text, fontSize:"1.4rem", fontWeight:700, margin:"0 0 0.2rem" }}>Admin Panel</h2>
        <p style={{ color:C.muted, fontSize:"0.9rem", margin:0 }}>Manage dashboard data — upload Excel files or edit records manually.</p>
      </div>
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, marginBottom:"1.5rem" }}>
        {[["upload","📤 Excel Upload"],["edit","✏️ Manual Edit"]].map(([k,l]) => (
          <button key={k} onClick={()=>setView(k)}
            style={{ padding:"0.55rem 1.4rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.88rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`3px solid ${C.blue}`:"3px solid transparent", marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>
      {view === "upload" && <UploadSection />}
      {view === "edit"   && <ManualEditSection />}
    </div>
  );
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"executive",     label:"Executive Overview",   icon:"🏛" },
  { id:"appetite",      label:"Risk Appetite",         icon:"⚖" },
  { id:"strategic",     label:"Strategic Risks",       icon:"🎯" },
  { id:"kri",           label:"KRI Monitoring",        icon:"📊" },
  { id:"opportunities", label:"Opportunities",         icon:"💡" },
  { id:"emerging",      label:"Emerging Risks",        icon:"🌐" },
  { id:"treatment",     label:"Treatment Actions",     icon:"🔧" },
  { id:"assurance",     label:"Combined Assurance",    icon:"✅" },
  { id:"bcm",           label:"BCM Resilience",        icon:"🛡" },
  { id:"fraud",         label:"Fraud & Ethics",        icon:"⚠" },
  { id:"departmental",  label:"Departmental Risks",    icon:"🏢" },
  { id:"uifw",          label:"UIFW Expenditure",      icon:"💰" },
  { id:"thirdparty",    label:"Third-Party Risk",      icon:"🤝" },
  { id:"app",           label:"APP Alignment",         icon:"📋" },
  { id:"predictive",    label:"Predictive Intel",      icon:"🔮" },
  { id:"admin",         label:"Admin Panel",           icon:"⚙" },
];

const MODULES = {
  executive: ExecutiveOverview,
  appetite:  RiskAppetite,
  strategic: StrategicRisks,
  kri:       KRIMonitoring,
  opportunities: Opportunities,
  emerging:  EmergingRisks,
  treatment: TreatmentActions,
  assurance: CombinedAssurance,
  bcm:       BCMResilience,
  fraud:     FraudEthics,
  departmental: DepartmentalRisks,
  uifw:      UIFWExpenditure,
  thirdparty: ThirdPartyRisk,
  app:       APPAlignment,
  predictive: PredictiveIntel,
  admin:     AdminTab,
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("executive");
  const Module = MODULES[active] || ExecutiveOverview;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Segoe UI','Inter',sans-serif", overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:240, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:"1rem 1.1rem 0.75rem", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#1d6fa4,#3b82f6)", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:"0.85rem", flexShrink:0 }}>i</div>
            <div>
              <div style={{ color:C.text, fontWeight:800, fontSize:"0.88rem", lineHeight:1.2 }}>LGSETA — BJMAPEX</div>
              <div style={{ color:C.muted, fontSize:"0.7rem" }}>GRC Intelligence Center</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, overflowY:"auto", padding:"0.5rem 0" }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id;
            const isAdmin  = item.id === "admin";
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                style={{ display:"flex", alignItems:"center", gap:"0.65rem", width:"100%", padding:"0.55rem 1.1rem",
                  border:"none", background:isActive ? "rgba(88,166,255,0.12)" : "transparent",
                  cursor:"pointer", textAlign:"left", borderLeft:`3px solid ${isActive ? C.blue : "transparent"}`,
                  borderRadius:0, transition:"all 0.12s",
                  marginTop: isAdmin ? "auto" : 0,
                  ...(isAdmin ? { borderTop:`1px solid ${C.border}`, marginTop:"0.25rem" } : {}) }}>
                <span style={{ fontSize:"0.95rem", width:20, textAlign:"center" }}>{item.icon}</span>
                <span style={{ color: isActive ? C.text : isAdmin ? C.purple : C.muted,
                  fontSize:"0.83rem", fontWeight: isActive ? 700 : 500 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Top bar */}
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 1.5rem",
          height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.text, fontSize:"1rem", fontWeight:700, margin:0 }}>
            {NAV_ITEMS.find(n=>n.id===active)?.label}
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <span style={{ color:C.green, fontSize:"0.78rem", fontWeight:600 }}>● Live</span>
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>Q2 2026/27</span>
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem" }}>
          <Module />
        </main>
      </div>
    </div>
  );
}
