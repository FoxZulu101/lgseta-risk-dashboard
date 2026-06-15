import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "https://lgseta-risk-dashboard.onrender.com";

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:      "#0d1117", surface: "#161b22", card: "#1c2230", border: "#30363d",
  text:    "#e6edf3", muted:   "#8b949e", red:  "#f85149", amber:  "#e3b341",
  green:   "#3fb950", blue:    "#58a6ff", purple:"#a371f7", cyan:   "#39d353",
};

// ─── STATIC FALLBACK DATA ─────────────────────────────────────────────────────
const STATIC_RISKS = [
  { id:"SR-001", title:"Limited and Undivided Mandate",        category:"Strategic Risk", inherentRating:16, residualRating:12, currentStatus:"Outside Tolerance", owner:"CEO",         appetite:"Low",  response:"Treat", department:"Office of the CEO",  reviewDate:"2026-09-30" },
  { id:"SR-002", title:"Inadequate Stakeholder Engagement",    category:"Strategic Risk", inherentRating:12, residualRating:9,  currentStatus:"Within Tolerance",  owner:"COO",         appetite:"Low",  response:"Treat", department:"Office of the COO",  reviewDate:"2026-09-30" },
  { id:"SR-003", title:"Cyber & Information Security Threat",  category:"Strategic Risk", inherentRating:10, residualRating:8,  currentStatus:"Outside Tolerance", owner:"CIO",         appetite:"Medium",response:"Treat",department:"ICT",               reviewDate:"2026-09-30" },
  { id:"SR-004", title:"Erosion of Organisational Integrity",  category:"Strategic Risk", inherentRating:14, residualRating:10, currentStatus:"Outside Tolerance", owner:"CFO",         appetite:"Zero", response:"Avoid", department:"Finance",            reviewDate:"2026-09-30" },
  { id:"SR-005", title:"Threat to Information Assets",         category:"Strategic Risk", inherentRating:18, residualRating:14, currentStatus:"Outside Tolerance", owner:"CIO",         appetite:"Low",  response:"Treat", department:"ICT",               reviewDate:"2026-09-30" },
  { id:"COMP-001",title:"Non-Compliance with Legislation",     category:"Compliance Risk",inherentRating:15, residualRating:11, currentStatus:"Outside Tolerance", owner:"Legal",       appetite:"Zero", response:"Avoid", department:"Legal",              reviewDate:"2026-09-30" },
  { id:"COMP-002",title:"Skills Development Delivery Failure", category:"Compliance Risk",inherentRating:9,  residualRating:6,  currentStatus:"Within Tolerance",  owner:"ETQA Manager",appetite:"Low",  response:"Treat", department:"ETQA",              reviewDate:"2026-09-30" },
  { id:"OP-001",  title:"Financial Sustainability Risk",       category:"Operational Risk",inherentRating:12, residualRating:8,  currentStatus:"Within Tolerance",  owner:"CFO",         appetite:"Low",  response:"Treat", department:"Finance",            reviewDate:"2026-09-30" },
  { id:"OP-002",  title:"SCM Procurement Irregularities",      category:"Operational Risk",inherentRating:16, residualRating:12, currentStatus:"Outside Tolerance", owner:"SCM Manager", appetite:"Zero", response:"Avoid", department:"SCM",               reviewDate:"2026-09-30" },
  { id:"OP-003",  title:"Human Capital Instability",           category:"Operational Risk",inherentRating:9,  residualRating:7,  currentStatus:"Within Tolerance",  owner:"HR Manager",  appetite:"Low",  response:"Treat", department:"Human Resources",    reviewDate:"2026-09-30" },
];

const STATIC_KRIS = [
  { id:"KRI-001", indicator:"Levy Income vs Budget",        currentPeriodValue:"94%",  target:"95%",  currentStatus:"Outside Tolerance", trend:"Declining" },
  { id:"KRI-002", indicator:"DG Disbursement Rate",         currentPeriodValue:"78%",  target:"80%",  currentStatus:"Within Tolerance",  trend:"Improving" },
  { id:"KRI-003", indicator:"Audit Findings (Material)",    currentPeriodValue:"3",    target:"2",    currentStatus:"Outside Tolerance", trend:"Stable"    },
  { id:"KRI-004", indicator:"Treatment Action Completion",  currentPeriodValue:"72%",  target:"85%",  currentStatus:"Outside Tolerance", trend:"Improving" },
  { id:"KRI-005", indicator:"UIFW as % of Budget",          currentPeriodValue:"4.2%", target:"2%",   currentStatus:"Outside Tolerance", trend:"Declining" },
  { id:"KRI-006", indicator:"Stakeholder Satisfaction",     currentPeriodValue:"68%",  target:"75%",  currentStatus:"Outside Tolerance", trend:"Improving" },
  { id:"KRI-007", indicator:"BCM Test Success Rate",        currentPeriodValue:"88%",  target:"90%",  currentStatus:"Within Tolerance",  trend:"Stable"    },
  { id:"KRI-008", indicator:"Fraud Cases Reported",         currentPeriodValue:"2",    target:"0",    currentStatus:"Outside Tolerance", trend:"Declining" },
];

const STATIC_TREATMENTS = [
  { id:"TA-001", riskId:"SR-005", action:"Implement ISMS aligned to ISO 27001",      owner:"CIO",         dueDate:"2026-09-30", progress:65,  status:"In Progress"   },
  { id:"TA-002", riskId:"SR-001", action:"Engage DHET on mandate clarification",      owner:"CEO",         dueDate:"2026-07-31", progress:40,  status:"In Progress"   },
  { id:"TA-003", riskId:"OP-002", action:"Strengthen SCM oversight committee",        owner:"SCM Manager", dueDate:"2026-06-30", progress:90,  status:"Near Complete" },
  { id:"TA-004", riskId:"COMP-001",action:"Legal compliance calendar implementation", owner:"Legal",       dueDate:"2026-08-31", progress:55,  status:"In Progress"   },
  { id:"TA-005", riskId:"SR-004", action:"Ethics hotline and awareness campaign",     owner:"HR Manager",  dueDate:"2026-07-15", progress:80,  status:"In Progress"   },
  { id:"TA-006", riskId:"KRI-008",action:"Fraud risk assessment and controls review", owner:"IA",          dueDate:"2026-09-30", progress:25,  status:"Not Started"   },
  { id:"TA-007", riskId:"SR-003", action:"Penetration testing and patch management",  owner:"CIO",         dueDate:"2026-06-30", progress:100, status:"Complete"      },
  { id:"TA-008", riskId:"OP-001", action:"Five-year financial sustainability plan",   owner:"CFO",         dueDate:"2026-10-31", progress:30,  status:"In Progress"   },
];

const STATIC_UIFW = [
  { id:"UIFW-001", type:"Irregular",        amount:8500000, department:"SCM",        description:"Awards without competitive bidding",  status:"Under Investigation" },
  { id:"UIFW-002", type:"Irregular",        amount:3200000, department:"Finance",    description:"Payment without valid PO",             status:"Condoned"            },
  { id:"UIFW-003", type:"Fruitless & Wasteful",amount:1800000,department:"HR",       description:"Training cancellation penalties",      status:"Open"                },
  { id:"UIFW-004", type:"Fruitless & Wasteful",amount:950000, department:"Operations",description:"Duplicate payments",                 status:"Recovered"           },
  { id:"UIFW-005", type:"Irregular",        amount:4200000, department:"Projects",   description:"Non-compliant variation orders",       status:"Under Investigation" },
  { id:"UIFW-006", type:"Fruitless & Wasteful",amount:1250000,department:"SCM",      description:"Expired contract renewals",            status:"Open"                },
];

const STATIC_FRAUD = [
  { id:"FC-001", category:"Procurement Fraud",    description:"Fictitious supplier payments",  amount:2100000, status:"Under Investigation", reported:"2026-03-15", source:"Hotline"    },
  { id:"FC-002", category:"Misappropriation",     description:"Petty cash irregularities",     amount:45000,   status:"Resolved",            reported:"2026-01-10", source:"Internal"   },
  { id:"FC-003", category:"Conflict of Interest", description:"Undisclosed business interest", amount:0,       status:"Disciplinary Action", reported:"2026-04-02", source:"Disclosure" },
];

const STATIC_DEPTS = [
  { name:"Finance",    risks:8,  critical:2, treatment:75, uifw:3200000  },
  { name:"SCM",        risks:12, critical:4, treatment:60, uifw:8500000  },
  { name:"HR",         risks:6,  critical:1, treatment:85, uifw:1800000  },
  { name:"Operations", risks:9,  critical:2, treatment:70, uifw:950000   },
  { name:"Projects",   risks:10, critical:3, treatment:65, uifw:4200000  },
  { name:"Legal",      risks:5,  critical:2, treatment:80, uifw:0        },
  { name:"IT",         risks:7,  critical:2, treatment:55, uifw:0        },
  { name:"ETQA",       risks:6,  critical:1, treatment:90, uifw:0        },
];

const STATIC_THIRD = [
  { id:"TP-001", name:"Deloitte SA",       type:"Auditor",    risk:"Low",    contract:"2027-03-31", score:88, status:"Active" },
  { id:"TP-002", name:"Bytes Technology",  type:"ICT",        risk:"Medium", contract:"2026-09-30", score:72, status:"Active" },
  { id:"TP-003", name:"Tsebo Facilities",  type:"Facilities", risk:"Low",    contract:"2026-12-31", score:81, status:"Active" },
  { id:"TP-004", name:"SAICA Training Co", type:"Training",   risk:"High",   contract:"2026-06-30", score:58, status:"Review" },
  { id:"TP-005", name:"Standard Bank",     type:"Banking",    risk:"Low",    contract:"Ongoing",    score:95, status:"Active" },
  { id:"TP-006", name:"Lekota Security",   type:"Security",   risk:"Medium", contract:"2026-08-31", score:67, status:"Active" },
];

const STATIC_APP = [
  { ref:"APP 1.1", objective:"Increase learnership registrations by 15%", target:15,  actual:12,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 1.2", objective:"Disburse 90% of DG budget",                 target:90,  actual:78,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 2.1", objective:"Achieve clean audit opinion",                target:100, actual:100, status:"On Track",    quarter:"Q4" },
  { ref:"APP 2.2", objective:"Reduce UIFW below 2% of budget",            target:2,   actual:4.2, status:"Behind",      quarter:"Q2" },
  { ref:"APP 3.1", objective:"Complete ICT master plan",                   target:100, actual:60,  status:"In Progress", quarter:"Q3" },
  { ref:"APP 3.2", objective:"Stakeholder satisfaction above 75%",         target:75,  actual:68,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 4.1", objective:"Fill all critical vacancies",                target:100, actual:85,  status:"In Progress", quarter:"Q3" },
];

const STATIC_EMERGING = [
  { id:"ER-001", name:"AI Displacement of Skills Dev",       likelihood:4, impact:4, horizon:"12-24 months", category:"Technology",  action:"Monitor"  },
  { id:"ER-002", name:"Geopolitical Trade Disruptions",      likelihood:3, impact:3, horizon:"6-12 months",  category:"Economic",    action:"Watch"    },
  { id:"ER-003", name:"Regulatory Overhaul (SETA landscape)",likelihood:4, impact:5, horizon:"12-18 months", category:"Regulatory",  action:"Escalate" },
  { id:"ER-004", name:"Cybersecurity — Ransomware",          likelihood:4, impact:4, horizon:"Immediate",    category:"Technology",  action:"Mitigate" },
  { id:"ER-005", name:"Climate Risk to Operations",          likelihood:2, impact:3, horizon:"24+ months",   category:"Environment", action:"Monitor"  },
];

const STATIC_OPP = [
  { id:"OPP-001", name:"Digital Skills Grant Expansion", score:18, benefit:"R15M additional levy income",   status:"Active",   owner:"CEO"  },
  { id:"OPP-002", name:"Inter-SETA Collaboration",       score:12, benefit:"Shared infrastructure savings", status:"Proposed", owner:"COO"  },
  { id:"OPP-003", name:"Green Skills Programme",          score:15, benefit:"New funding stream",            status:"Active",   owner:"ETQA" },
  { id:"OPP-004", name:"AI-Enhanced M&E Platform",       score:14, benefit:"30% reporting efficiency gain", status:"Proposed", owner:"CIO"  },
  { id:"OPP-005", name:"Expanded RPL Assessments",       score:10, benefit:"R5M additional revenue",        status:"Active",   owner:"ETQA" },
];

const STATIC_APPETITE = [
  { category:"Financial",    appetite:"Low",    current:12.4, max:8,  unit:"score"    },
  { category:"Compliance",   appetite:"Zero",   current:3,    max:0,  unit:"findings" },
  { category:"Operational",  appetite:"Medium", current:9.2,  max:12, unit:"score"    },
  { category:"Reputational", appetite:"Low",    current:6.1,  max:5,  unit:"score"    },
  { category:"Strategic",    appetite:"Low",    current:14.2, max:10, unit:"score"    },
  { category:"Technology",   appetite:"Medium", current:8.8,  max:12, unit:"score"    },
];

const STATIC_ASSURANCE = [
  { risk:"SR-005",  assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Partially covered", level:"Reasonable" },
  { risk:"OP-002",  assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Coverage gap",      level:"Limited"    },
  { risk:"COMP-001",assurer1:"IA-Covered",  assurer2:"Legal-Reviewed",    assurer3:"AGSA-Clean",    gap:"None",              level:"Full"       },
  { risk:"SR-001",  assurer1:"Board-Noted", assurer2:"Ext Audit-Clean",   assurer3:"AGSA-Clean",    gap:"None",              level:"Reasonable" },
];

const STATIC_BCM = {
  overview:  { biaComplete:85, plansTested:6, plansTotal:8, rto:"4 hours", rpo:"2 hours", lastTest:"2026-04-15", nextTest:"2026-10-15", criticalProcesses:12, processesWithBCP:10 },
  incidents: [
    { id:"INC-001", date:"2026-02-10", type:"IT Outage",          duration:"3.5 hrs", impact:"Medium", resolution:"Resolved",  rtoMet:true  },
    { id:"INC-002", date:"2026-04-05", type:"Power Failure",      duration:"1.2 hrs", impact:"Low",    resolution:"Resolved",  rtoMet:true  },
    { id:"INC-003", date:"2026-05-20", type:"Data Breach Attempt",duration:"N/A",     impact:"High",   resolution:"Contained", rtoMet:false },
  ],
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.25rem", ...style }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 style={{ color:C.text, fontSize:"1rem", fontWeight:700, marginBottom:"1rem", letterSpacing:"0.02em" }}>{children}</h2>;
}
function Badge({ label, color }) {
  const bg = color==="red"?"#3d1a1a":color==="green"?"#1a3d2b":color==="amber"?"#3d2e1a":color==="blue"?"#1a2a3d":"#2a2a3d";
  const fg = color==="red"?C.red:color==="green"?C.green:color==="amber"?C.amber:color==="blue"?C.blue:C.purple;
  return <span style={{ background:bg, color:fg, borderRadius:5, padding:"2px 8px", fontSize:"0.72rem", fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>;
}
function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const color = s.includes("outside")||s.includes("critical")||s.includes("high")||s.includes("overdue")?"red"
    : s.includes("within")||s.includes("complete")||s.includes("active")||s.includes("on track")?"green"
    : s.includes("progress")||s.includes("medium")||s.includes("watch")||s.includes("proposed")?"amber":"blue";
  return <Badge label={status} color={color} />;
}
function ProgressBar({ value, max=100, color }) {
  const pct = Math.min(100,(value/max)*100);
  return (
    <div style={{ background:C.border, borderRadius:4, height:8, width:"100%" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color||(pct>=90?C.green:pct>=60?C.amber:C.red), borderRadius:4, transition:"width 0.4s" }} />
    </div>
  );
}
function KPICard({ label, value, sub, color=C.blue }) {
  return (
    <Card style={{ borderTop:`3px solid ${color}` }}>
      <div style={{ color:C.muted, fontSize:"0.78rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{label}</div>
      <div style={{ color, fontSize:"1.9rem", fontWeight:800, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ color:C.muted, fontSize:"0.78rem", marginTop:4 }}>{sub}</div>}
    </Card>
  );
}
function Table({ headers, rows }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.83rem" }}>
        <thead>
          <tr>{headers.map((h,i)=><th key={i} style={{ color:C.muted, fontWeight:600, padding:"0.5rem 0.75rem", textAlign:"left", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row,ri)=>(
            <tr key={ri} style={{ borderBottom:`1px solid ${C.border}` }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {row.map((cell,ci)=><td key={ci} style={{ padding:"0.55rem 0.75rem", color:C.text, verticalAlign:"middle" }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FORM INPUT COMPONENTS ────────────────────────────────────────────────────
const inputSt = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
  padding:"0.5rem 0.75rem", color:C.text, fontSize:"0.88rem", width:"100%", outline:"none",
  boxSizing:"border-box", fontFamily:"inherit" };
const labelSt = { display:"block", color:C.muted, fontSize:"0.72rem", fontWeight:700,
  textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"0.3rem" };

function FInput({ label, value, onChange, type="text", required=false, placeholder="" }) {
  return (
    <div style={{ marginBottom:"0.85rem" }}>
      <label style={labelSt}>{label}{required && <span style={{ color:C.red }}> *</span>}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={inputSt} required={required} />
    </div>
  );
}
function FSelect({ label, value, onChange, options, required=false }) {
  return (
    <div style={{ marginBottom:"0.85rem" }}>
      <label style={labelSt}>{label}{required && <span style={{ color:C.red }}> *</span>}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={inputSt}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function FTextarea({ label, value, onChange, rows=3, placeholder="" }) {
  return (
    <div style={{ marginBottom:"0.85rem" }}>
      <label style={labelSt}>{label}</label>
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ ...inputSt, resize:"vertical", lineHeight:1.5 }} />
    </div>
  );
}

// ─── STRATEGIC RISKS FORM ─────────────────────────────────────────────────────
const EMPTY_RISK = {
  id:"", title:"", category:"Strategic Risk", description:"", cause:"", consequence:"",
  inherentRating:"", residualRating:"", currentRating:"", targetRating:"",
  currentStatus:"Outside Tolerance", appetite:"Low", tolerance:"Outside Tolerance",
  owner:"", department:"", response:"Treat", controlEffectiveness:"Partially Effective",
  trend:"Stable", treatmentAction:"", reviewDate:"", assuranceProvider:"Internal Audit",
};

function RiskForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_RISK, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Risk — ${initial.id}` : "Add New Risk"}
      </h3>

      {/* Row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="Risk ID"       value={f.id}       onChange={set("id")}       required placeholder="SR-011" />
        <FInput label="Risk Title"    value={f.title}    onChange={set("title")}    required placeholder="e.g. Inadequate IT Governance" />
      </div>

      {/* Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Category" value={f.category} onChange={set("category")} options={["Strategic Risk","Compliance Risk","Operational Risk","Financial Risk","Reputational Risk","Technology Risk"]} required />
        <FSelect label="Risk Appetite" value={f.appetite} onChange={set("appetite")} options={["Zero","Low","Medium","High"]} />
        <FSelect label="Current Status" value={f.currentStatus} onChange={set("currentStatus")} options={["Outside Tolerance","Within Tolerance","Emerging","Closed"]} required />
      </div>

      {/* Row 3 — Ratings */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Inherent Rating (1-25)" value={f.inherentRating} onChange={set("inherentRating")} type="number" placeholder="16" />
        <FInput label="Residual Rating (1-25)" value={f.residualRating} onChange={set("residualRating")} type="number" placeholder="12" />
        <FInput label="Current Rating"  value={f.currentRating}  onChange={set("currentRating")}  type="number" placeholder="12" />
        <FInput label="Target Rating"   value={f.targetRating}   onChange={set("targetRating")}   type="number" placeholder="6"  />
      </div>

      {/* Row 4 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Risk Owner"   value={f.owner}      onChange={set("owner")}      placeholder="e.g. CFO" />
        <FInput label="Department"   value={f.department} onChange={set("department")} placeholder="e.g. Finance" />
      </div>

      {/* Row 5 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Response Strategy" value={f.response} onChange={set("response")} options={["Treat","Tolerate","Transfer","Avoid","Exploit"]} />
        <FSelect label="Control Effectiveness" value={f.controlEffectiveness} onChange={set("controlEffectiveness")} options={["Effective","Partially Effective","Ineffective","Not Assessed"]} />
        <FSelect label="Trend" value={f.trend} onChange={set("trend")} options={["Improving","Stable","Declining","Unknown"]} />
      </div>

      {/* Textareas */}
      <FTextarea label="Description"     value={f.description}    onChange={set("description")}    placeholder="Describe the risk…" />
      <FTextarea label="Cause"           value={f.cause}          onChange={set("cause")}          placeholder="What causes this risk?" />
      <FTextarea label="Consequence"     value={f.consequence}    onChange={set("consequence")}    placeholder="What is the potential impact?" />
      <FTextarea label="Treatment Action Summary" value={f.treatmentAction} onChange={set("treatmentAction")} placeholder="Brief summary of treatment approach…" />

      {/* Row 6 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Review Date"         value={f.reviewDate}        onChange={set("reviewDate")}        type="date" />
        <FInput label="Assurance Provider"  value={f.assuranceProvider} onChange={set("assuranceProvider")} placeholder="e.g. Internal Audit" />
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Risk" : "Add Risk"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── STRATEGIC RISKS ADMIN PANEL ──────────────────────────────────────────────
function StrategicRisksAdmin() {
  const [risks, setRisks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null); // null | "add" | {risk}
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/risks`);
      const data = await res.json();
      setRisks(Array.isArray(data) && data.length > 0 ? data : STATIC_RISKS);
    } catch { setRisks(STATIC_RISKS); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.title) { showToast("Risk ID and Title are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const url    = isEdit ? `${API}/api/risks/${f.id}` : `${API}/api/risks`;
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated successfully.` : `✅ ${f.id} added successfully.`);
      setMode(null);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/risks/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`);
      setConfirmDel(null);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = risks.filter(r =>
    (r.title||r.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (r.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (r.owner||"").toLowerCase().includes(search.toLowerCase())
  );

  const scoreColor = v => Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem", maxWidth:360 }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Risk</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Are you sure you want to delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Strategic Risk Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{risks.length} risks · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search risks…"
            style={{ ...inputSt, width:200 }} />
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", whiteSpace:"nowrap", opacity:mode?0.5:1 }}>
            + Add Risk
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {mode === "add" && <RiskForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode !== "add" && <RiskForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading risks from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Title","Category","Inherent","Residual","Status","Owner","Appetite","Actions"]}
            rows={filtered.map(r => {
              const name = r.title || r.name || "—";
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{r.id}</span>,
                <span style={{ maxWidth:240, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={name}>{name}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.category}</span>,
                <span style={{ color:scoreColor(r.inherentRating||r.inherent), fontWeight:700 }}>{r.inherentRating||r.inherent||"—"}</span>,
                <span style={{ color:scoreColor(r.residualRating||r.residual), fontWeight:700 }}>{r.residualRating||r.residual||"—"}</span>,
                <StatusBadge status={r.currentStatus||r.status} />,
                <span style={{ whiteSpace:"nowrap" }}>{r.owner||"—"}</span>,
                r.appetite||"—",
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...r })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length === 0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No risks match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── MODULE: EXECUTIVE OVERVIEW ───────────────────────────────────────────────
function ExecutiveOverview() {
  const [risks, setRisks] = useState(STATIC_RISKS);
  useEffect(()=>{
    fetch(`${API}/api/risks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setRisks(d); }).catch(()=>{});
  },[]);

  const outside = risks.filter(r=>(r.currentStatus||r.status||"").includes("Outside")).length;
  const totalUifw = STATIC_UIFW.reduce((s,u)=>s+u.amount,0);
  const heatColor = s => s>=15?C.red:s>=10?"#e36209":s>=6?C.amber:s>=3?C.green:"#1a3d2b";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Executive Overview</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Reporting Period: Q2 2026/27 | Report Date: 2026-06-14</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <Badge label={`● ${outside} Outside Tolerance`} color="red" />
          <Badge label="⚠ 7 Overdue Actions" color="amber" />
          <span style={{ color:C.muted, fontSize:"0.78rem", alignSelf:"center" }}>Next Review: 2026-09-30</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:"0.85rem" }}>
        <KPICard label="Total Risks"          value={risks.length}  sub="+4 Emerging"                color={C.blue}   />
        <KPICard label="Outside Tolerance"    value={outside}       sub="Immediate action required"  color={C.red}    />
        <KPICard label="Treatment Completion" value="72%"           sub="89 of 124 actions"          color={C.green}  />
        <KPICard label="Overall Risk Exposure"value="12.4"          sub="↓ 1.2 from last period"    color={C.amber}  />
        <KPICard label="Material Findings"    value="3"             sub="From assurance reviews"     color={C.purple} />
      </div>
      <Card style={{ borderLeft:`4px solid ${C.red}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <span style={{ fontSize:"1.5rem" }}>⚠</span>
          <div>
            <div style={{ color:C.red, fontSize:"1.6rem", fontWeight:800 }}>R{(totalUifw/1e6).toFixed(1)}M</div>
            <div style={{ color:C.text, fontWeight:600 }}>UIFW Exposure</div>
            <div style={{ color:C.muted, fontSize:"0.8rem" }}>14 open cases across {new Set(STATIC_UIFW.map(u=>u.department)).size} departments</div>
          </div>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Risk Heatmap — Inherent Risk Matrix</SectionTitle>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3,4,5].map(l=>(
              <div key={l} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {[5,4,3,2,1].map(i=>{
                  const score=i*l;
                  return <div key={i} style={{ width:44, height:36, background:heatColor(score), borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:"#fff", fontSize:"0.8rem", fontWeight:700 }}>{score}</span>
                  </div>;
                })}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem", flexWrap:"wrap" }}>
            {[["≥15","Critical",C.red],[">9","High","#e36209"],[">5","Medium",C.amber],["≤5","Low",C.green]].map(([v,l,c])=>(
              <span key={l} style={{ color:c, fontSize:"0.7rem" }}>■ {l}</span>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Risk Status Breakdown</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name:"Outside Tolerance", value:outside },
                { name:"Within Tolerance",  value:risks.filter(r=>(r.currentStatus||r.status||"").includes("Within")).length },
                { name:"Emerging",          value:4 },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {[C.red,C.amber,C.blue].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Legend wrapperStyle={{ fontSize:"0.75rem", color:C.muted }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>Top 5 Critical Risks</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {[...risks].sort((a,b)=>(b.inherentRating||b.inherent||0)-(a.inherentRating||a.inherent||0)).slice(0,5).map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{r.id}</div>
                  <div style={{ color:C.text, fontSize:"0.8rem", fontWeight:500 }}>{(r.title||r.name||"").slice(0,22)}…</div>
                </div>
                <span style={{ color:C.red, fontWeight:800, fontSize:"1rem", minWidth:24, textAlign:"right" }}>{r.inherentRating||r.inherent}</span>
                <StatusBadge status={r.currentStatus||r.status} />
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
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Risk Appetite Framework</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1rem" }}>
        {STATIC_APPETITE.map(r=>{
          const breach=r.current>r.max;
          return (
            <Card key={r.category} style={{ borderLeft:`3px solid ${breach?C.red:C.green}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.5rem" }}>
                <span style={{ color:C.text, fontWeight:700 }}>{r.category}</span>
                <Badge label={r.appetite} color={r.appetite==="Zero"?"red":r.appetite==="Low"?"amber":"green"} />
              </div>
              <div style={{ color:breach?C.red:C.green, fontSize:"1.6rem", fontWeight:800 }}>{r.current} <span style={{ color:C.muted, fontSize:"0.8rem" }}>{r.unit}</span></div>
              <div style={{ color:C.muted, fontSize:"0.78rem", marginBottom:"0.5rem" }}>Tolerance limit: {r.max} {r.unit}</div>
              <ProgressBar value={r.current} max={r.max*1.5} color={breach?C.red:C.green}/>
              {breach&&<div style={{ color:C.red, fontSize:"0.75rem", marginTop:"0.4rem" }}>⚠ Appetite breached</div>}
            </Card>
          );
        })}
      </div>
      <Card>
        <SectionTitle>Appetite Statement</SectionTitle>
        <p style={{ color:C.muted, lineHeight:1.7, fontSize:"0.88rem" }}>
          LGSETA has a <strong style={{ color:C.text }}>Zero tolerance</strong> for compliance breaches and fraud.
          The organisation maintains a <strong style={{ color:C.text }}>Low appetite</strong> for financial, reputational, and strategic risks.
          A <strong style={{ color:C.text }}>Medium appetite</strong> applies to operational and technology risks where innovation is pursued.
        </p>
      </Card>
    </div>
  );
}

// ─── MODULE: STRATEGIC RISKS (VIEW) ──────────────────────────────────────────
function StrategicRisks() {
  const [risks, setRisks] = useState(STATIC_RISKS);
  const [search, setSearch] = useState("");
  useEffect(()=>{
    fetch(`${API}/api/risks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setRisks(d); }).catch(()=>{});
  },[]);
  const filtered = risks.filter(r=>(r.title||r.name||"").toLowerCase().includes(search.toLowerCase())||(r.id||"").toLowerCase().includes(search.toLowerCase()));
  const sc = v=>Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Strategic Risk Register</h1>
        <input placeholder="Search risks…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ ...inputSt, width:220 }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICard label="Total Risks"        value={risks.length} color={C.blue}/>
        <KPICard label="Outside Tolerance"  value={risks.filter(r=>(r.currentStatus||r.status||"").includes("Outside")).length} color={C.red}/>
        <KPICard label="Avg Residual Score" value={(risks.reduce((s,r)=>s+(Number(r.residualRating||r.residual)||0),0)/risks.length).toFixed(1)} color={C.amber}/>
      </div>
      <Card>
        <Table
          headers={["ID","Risk Title","Inherent","Residual","Appetite","Owner","Response","Status"]}
          rows={filtered.map(r=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{r.id}</span>,
            r.title||r.name||"—",
            <span style={{ color:sc(r.inherentRating||r.inherent), fontWeight:700 }}>{r.inherentRating||r.inherent||"—"}</span>,
            <span style={{ color:sc(r.residualRating||r.residual), fontWeight:700 }}>{r.residualRating||r.residual||"—"}</span>,
            r.appetite||"—",
            r.owner||"—",
            r.response||r.treatment||"—",
            <StatusBadge status={r.currentStatus||r.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: KRI MONITORING ───────────────────────────────────────────────────
function KRIMonitoring() {
  const [kris, setKris] = useState(STATIC_KRIS);
  useEffect(()=>{ fetch(`${API}/api/kris`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setKris(d); }).catch(()=>{}); },[]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>KRI Monitoring Dashboard</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1rem" }}>
        {kris.map(k=>{
          const actual=parseFloat(k.currentPeriodValue)||0;
          const target=parseFloat(k.target)||0;
          const breach=(k.currentStatus||"").includes("Outside");
          return (
            <Card key={k.id} style={{ borderTop:`3px solid ${breach?C.red:C.green}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.3rem" }}>
                <span style={{ color:C.muted, fontSize:"0.72rem", fontWeight:700 }}>{k.id}</span>
                <StatusBadge status={k.currentStatus||k.status}/>
              </div>
              <div style={{ color:C.text, fontWeight:700, fontSize:"0.9rem", marginBottom:"0.5rem" }}>{k.indicator||k.name}</div>
              <div style={{ display:"flex", gap:"1rem", marginBottom:"0.5rem" }}>
                <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Actual</div><div style={{ color:breach?C.red:C.green, fontSize:"1.4rem", fontWeight:800 }}>{k.currentPeriodValue||k.actual}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Target</div><div style={{ color:C.text, fontSize:"1.4rem", fontWeight:800 }}>{k.target}</div></div>
                <div style={{ marginLeft:"auto", alignSelf:"center" }}><span style={{ fontSize:"1rem" }}>{(k.trend||"").toLowerCase()==="improving"?"↑":(k.trend||"").toLowerCase()==="declining"?"↓":"→"}</span></div>
              </div>
              <ProgressBar value={actual} max={target||100} color={breach?C.red:C.green}/>
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
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Strategic Opportunities Register</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1rem" }}>
        {STATIC_OPP.map(o=>(
          <Card key={o.id} style={{ borderLeft:`3px solid ${C.cyan}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
              <span style={{ color:C.muted, fontSize:"0.72rem" }}>{o.id}</span>
              <StatusBadge status={o.status}/>
            </div>
            <div style={{ color:C.text, fontWeight:700, marginBottom:"0.35rem" }}>{o.name}</div>
            <div style={{ color:C.cyan, fontSize:"0.82rem", marginBottom:"0.4rem" }}>💡 {o.benefit}</div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>Owner: {o.owner}</span>
              <span style={{ color:C.amber, fontWeight:700 }}>Score: {o.score}</span>
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
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Emerging Risk Radar</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"1rem" }}>
        {STATIC_EMERGING.map(r=>(
          <Card key={r.id} style={{ borderLeft:`3px solid ${r.action==="Escalate"?C.red:r.action==="Mitigate"?C.amber:C.blue}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
              <Badge label={r.category} color="blue"/>
              <Badge label={r.action}   color={r.action==="Escalate"?"red":r.action==="Mitigate"?"amber":"blue"}/>
            </div>
            <div style={{ color:C.text, fontWeight:700, marginBottom:"0.5rem" }}>{r.name}</div>
            <div style={{ display:"flex", gap:"1.5rem" }}>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Likelihood</div><div style={{ color:C.amber, fontWeight:800 }}>{r.likelihood}/5</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Impact</div><div style={{ color:C.red, fontWeight:800 }}>{r.impact}/5</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Horizon</div><div style={{ color:C.text, fontSize:"0.82rem" }}>{r.horizon}</div></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: TREATMENT ACTIONS ────────────────────────────────────────────────
function TreatmentActions() {
  const [actions, setActions] = useState(STATIC_TREATMENTS);
  useEffect(()=>{ fetch(`${API}/api/treatments`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setActions(d); }).catch(()=>{}); },[]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Treatment Action Tracker</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        {[["Total",actions.length,C.blue],["Complete",actions.filter(a=>a.status==="Complete").length,C.green],
          ["In Progress",actions.filter(a=>a.status==="In Progress").length,C.amber],
          ["Not Started",actions.filter(a=>a.status==="Not Started").length,C.red]].map(([l,v,c])=>(
          <KPICard key={l} label={l} value={v} color={c}/>
        ))}
      </div>
      <Card>
        <Table
          headers={["ID","Risk","Action","Owner","Due Date","Progress","Status"]}
          rows={actions.map(a=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{a.id}</span>,
            a.riskId||a.risk||"—",
            a.action,
            a.owner||"—",
            a.dueDate||a.due||"—",
            <div style={{ minWidth:120 }}>
              <div style={{ color:C.muted, fontSize:"0.72rem", marginBottom:3 }}>{a.progress}%</div>
              <ProgressBar value={Number(a.progress)||0}/>
            </div>,
            <StatusBadge status={a.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: COMBINED ASSURANCE ───────────────────────────────────────────────
function CombinedAssurance() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Combined Assurance Map</h1>
      <Card>
        <Table
          headers={["Risk Ref","1st Line","2nd Line","3rd Line","Gap","Level"]}
          rows={STATIC_ASSURANCE.map(r=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{r.risk}</span>,
            r.assurer1,r.assurer2,r.assurer3,r.gap,
            <StatusBadge status={r.level}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: BCM RESILIENCE ───────────────────────────────────────────────────
function BCMResilience() {
  const [sub, setSub] = useState("overview");
  const tabs=["overview","incidents","plans","crisis","recovery","communications","testing","suppliers","dependencies","it-dr","training"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>BCM & Resilience</h1>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSub(t)}
            style={{ padding:"0.45rem 0.9rem", border:"none", background:"transparent", cursor:"pointer", fontSize:"0.78rem", fontWeight:600,
              color:sub===t?C.blue:C.muted, borderBottom:sub===t?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap", textTransform:"capitalize" }}>
            {t.replace("-"," ")}
          </button>
        ))}
      </div>
      {sub==="overview"&&(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"0.85rem" }}>
          <KPICard label="BIA Completion"    value={`${STATIC_BCM.overview.biaComplete}%`}   color={C.green}/>
          <KPICard label="Plans Tested"       value={`${STATIC_BCM.overview.plansTested}/${STATIC_BCM.overview.plansTotal}`} color={C.amber}/>
          <KPICard label="RTO Target"         value={STATIC_BCM.overview.rto}                color={C.blue}/>
          <KPICard label="RPO Target"         value={STATIC_BCM.overview.rpo}                color={C.purple}/>
          <KPICard label="Critical Processes" value={STATIC_BCM.overview.criticalProcesses}  color={C.blue}/>
          <KPICard label="Processes w/ BCP"   value={STATIC_BCM.overview.processesWithBCP}   color={C.green}/>
        </div>
      )}
      {sub==="incidents"&&(
        <Card>
          <Table
            headers={["ID","Date","Type","Duration","Impact","RTO Met","Resolution"]}
            rows={STATIC_BCM.incidents.map(i=>[
              i.id,i.date,i.type,i.duration,
              <StatusBadge status={i.impact}/>,
              i.rtoMet?<Badge label="Yes" color="green"/>:<Badge label="No" color="red"/>,
              i.resolution,
            ])}
          />
        </Card>
      )}
      {!["overview","incidents"].includes(sub)&&(
        <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>{sub.replace("-"," ").replace(/\b\w/g,c=>c.toUpperCase())} — Phase 2 build coming next.</p></Card>
      )}
    </div>
  );
}

// ─── MODULE: FRAUD & ETHICS ───────────────────────────────────────────────────
function FraudEthics() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Fraud & Ethics Register</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICard label="Total Cases"         value={STATIC_FRAUD.length} color={C.red}/>
        <KPICard label="Under Investigation" value={STATIC_FRAUD.filter(f=>f.status==="Under Investigation").length} color={C.amber}/>
        <KPICard label="Total Exposure"      value={`R${(STATIC_FRAUD.reduce((s,f)=>s+f.amount,0)/1e6).toFixed(2)}M`} color={C.red}/>
      </div>
      <Card>
        <Table
          headers={["ID","Category","Description","Amount","Source","Reported","Status"]}
          rows={STATIC_FRAUD.map(f=>[
            <span style={{ color:C.red, fontWeight:700 }}>{f.id}</span>,
            f.category,f.description,
            f.amount>0?`R${f.amount.toLocaleString()}`:"—",
            f.source,f.reported,
            <StatusBadge status={f.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: DEPARTMENTAL RISKS ───────────────────────────────────────────────
function DepartmentalRisks() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Departmental Risk Summary</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1rem" }}>
        {STATIC_DEPTS.map(d=>(
          <Card key={d.name}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.5rem" }}>
              <span style={{ color:C.text, fontWeight:700 }}>{d.name}</span>
              {d.uifw>0&&<Badge label={`UIFW R${(d.uifw/1e6).toFixed(1)}M`} color="red"/>}
            </div>
            <div style={{ display:"flex", gap:"1.25rem", marginBottom:"0.75rem" }}>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Risks</div><div style={{ color:C.blue, fontWeight:800 }}>{d.risks}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Critical</div><div style={{ color:C.red, fontWeight:800 }}>{d.critical}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Treatment</div><div style={{ color:C.green, fontWeight:800 }}>{d.treatment}%</div></div>
            </div>
            <ProgressBar value={d.treatment} color={d.treatment>=80?C.green:d.treatment>=60?C.amber:C.red}/>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: UIFW ─────────────────────────────────────────────────────────────
function UIFWExpenditure() {
  const total=STATIC_UIFW.reduce((s,u)=>s+u.amount,0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>UIFW Expenditure Register</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICard label="Total UIFW"  value={`R${(total/1e6).toFixed(1)}M`} color={C.red}/>
        <KPICard label="Irregular"   value={`R${(STATIC_UIFW.filter(u=>u.type==="Irregular").reduce((s,u)=>s+u.amount,0)/1e6).toFixed(1)}M`} color={C.amber}/>
        <KPICard label="Open Cases"  value={STATIC_UIFW.filter(u=>u.status==="Open"||u.status==="Under Investigation").length} color={C.red}/>
      </div>
      <Card>
        <Table
          headers={["ID","Type","Department","Description","Amount","Status"]}
          rows={STATIC_UIFW.map(u=>[
            <span style={{ color:C.amber, fontWeight:700 }}>{u.id}</span>,
            <Badge label={u.type} color={u.type==="Irregular"?"red":u.type==="Fruitless & Wasteful"?"amber":"blue"}/>,
            u.department,u.description,
            <span style={{ color:C.red, fontWeight:700 }}>R{u.amount.toLocaleString()}</span>,
            <StatusBadge status={u.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: THIRD-PARTY RISK ─────────────────────────────────────────────────
function ThirdPartyRisk() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Third-Party Risk Register</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1rem" }}>
        {STATIC_THIRD.map(tp=>(
          <Card key={tp.id} style={{ borderLeft:`3px solid ${tp.risk==="High"?C.red:tp.risk==="Medium"?C.amber:C.green}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
              <span style={{ color:C.text, fontWeight:700 }}>{tp.name}</span>
              <StatusBadge status={tp.status}/>
            </div>
            <div style={{ color:C.muted, fontSize:"0.78rem", marginBottom:"0.5rem" }}>{tp.type}</div>
            <div style={{ display:"flex", gap:"1rem" }}>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Risk</div><Badge label={tp.risk} color={tp.risk==="High"?"red":tp.risk==="Medium"?"amber":"green"}/></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Score</div><div style={{ color:tp.score>=80?C.green:tp.score>=65?C.amber:C.red, fontWeight:800 }}>{tp.score}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem" }}>Contract</div><div style={{ color:C.text, fontSize:"0.82rem" }}>{tp.contract}</div></div>
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
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Annual Performance Plan Alignment</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICard label="On Track"    value={STATIC_APP.filter(a=>a.status==="On Track").length}    color={C.green}/>
        <KPICard label="Behind"      value={STATIC_APP.filter(a=>a.status==="Behind").length}      color={C.red}/>
        <KPICard label="In Progress" value={STATIC_APP.filter(a=>a.status==="In Progress").length} color={C.amber}/>
      </div>
      <Card>
        {STATIC_APP.map(a=>(
          <div key={a.ref} style={{ padding:"0.75rem 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"1rem" }}>
            <span style={{ color:C.blue, fontWeight:700, minWidth:70, fontSize:"0.82rem" }}>{a.ref}</span>
            <span style={{ color:C.text, flex:1, fontSize:"0.88rem" }}>{a.objective}</span>
            <div style={{ minWidth:140, textAlign:"right" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem" }}>Target {a.target}% | Actual {a.actual}%</div>
              <ProgressBar value={a.actual} max={a.target} color={a.actual>=a.target?C.green:C.red}/>
            </div>
            <StatusBadge status={a.status}/>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── MODULE: PREDICTIVE INTEL ─────────────────────────────────────────────────
function PredictiveIntel() {
  const data=[
    { month:"Jul 26", exposure:13.2, uifw:18.5, treatment:68 },
    { month:"Aug 26", exposure:12.8, uifw:17.1, treatment:72 },
    { month:"Sep 26", exposure:12.1, uifw:15.8, treatment:78 },
    { month:"Oct 26", exposure:11.5, uifw:14.2, treatment:83 },
    { month:"Nov 26", exposure:10.9, uifw:12.5, treatment:88 },
    { month:"Dec 26", exposure:10.2, uifw:11.0, treatment:92 },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Predictive Intelligence</h1>
      <Card>
        <SectionTitle>6-Month Risk Exposure Forecast</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="month" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
            <Legend wrapperStyle={{ fontSize:"0.75rem", color:C.muted }}/>
            <Line type="monotone" dataKey="exposure"  stroke={C.red}   strokeWidth={2} name="Risk Exposure" dot={{ r:4 }}/>
            <Line type="monotone" dataKey="treatment" stroke={C.green} strokeWidth={2} name="Treatment %"   dot={{ r:4 }}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <SectionTitle>UIFW Trend Projection (R million)</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="month" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
            <Bar dataKey="uifw" fill={C.amber} name="UIFW (Rm)" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
// ─── KRI MONITORING ADMIN ────────────────────────────────────────────────────
const EMPTY_KRI = {
  id:"", indicator:"", linkedRisk:"", category:"Strategic Performance",
  target:"", currentPeriodValue:"", previousPeriodValue:"",
  currentStatus:"Outside Tolerance", previousStatus:"Within Tolerance",
  trend:"Stable", greenThreshold:"", amberThreshold:"", redThreshold:"",
};

function KRIForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_KRI, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit KRI — ${initial.id}` : "Add New KRI"}
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="KRI ID"        value={f.id}        onChange={set("id")}        required placeholder="KRI-009" />
        <FInput label="Indicator Name" value={f.indicator} onChange={set("indicator")} required placeholder="e.g. Levy Income vs Budget" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Linked Risk ID"  value={f.linkedRisk} onChange={set("linkedRisk")} placeholder="e.g. SR-001" />
        <FSelect label="Category"        value={f.category}   onChange={set("category")}
          options={["Strategic Performance","Financial Performance","Operational Performance","Compliance","Human Capital","Technology","Stakeholder"]} />
        <FSelect label="Trend"           value={f.trend}      onChange={set("trend")}
          options={["Improving","Stable","Declining","Unknown"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Target"                value={f.target}              onChange={set("target")}              placeholder="e.g. 95%" />
        <FInput label="Current Period Value"  value={f.currentPeriodValue}  onChange={set("currentPeriodValue")}  placeholder="e.g. 88%" />
        <FInput label="Previous Period Value" value={f.previousPeriodValue} onChange={set("previousPeriodValue")} placeholder="e.g. 82%" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FSelect label="Current Status"  value={f.currentStatus}  onChange={set("currentStatus")}
          options={["Outside Tolerance","Within Tolerance","Critical","Closed"]} required />
        <FSelect label="Previous Status" value={f.previousStatus} onChange={set("previousStatus")}
          options={["Outside Tolerance","Within Tolerance","Critical","Closed"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Green Threshold (e.g. 95%-100%)" value={f.greenThreshold} onChange={set("greenThreshold")} placeholder="95%-100%" />
        <FInput label="Amber Threshold (e.g. 85%-94%)" value={f.amberThreshold} onChange={set("amberThreshold")} placeholder="85%-94%"  />
        <FInput label="Red Threshold (e.g. Below 85%)"  value={f.redThreshold}  onChange={set("redThreshold")}  placeholder="Below 85%" />
      </div>
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update KRI" : "Add KRI"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function KRIMonitoringAdmin() {
  const [kris, setKris]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/kris`);
      const data = await res.json();
      setKris(Array.isArray(data) && data.length > 0 ? data : STATIC_KRIS);
    } catch { setKris(STATIC_KRIS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.indicator) { showToast("KRI ID and Indicator Name are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const res = await fetch(
        isEdit ? `${API}/api/kris/${f.id}` : `${API}/api/kris`,
        { method: isEdit ? "PUT" : "POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) }
      );
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/kris/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = kris.filter(k =>
    (k.indicator||k.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (k.id||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete KRI</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>KRI Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{kris.length} indicators · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search KRIs…" style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add KRI
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Form */}
      {mode==="add"        && <KRIForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add"&& <KRIForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading KRIs from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Indicator","Category","Current Value","Target","Trend","Status","Actions"]}
            rows={filtered.map(k=>{
              const breach=(k.currentStatus||"").includes("Outside");
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{k.id}</span>,
                <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={k.indicator||k.name}>{k.indicator||k.name||"—"}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{k.category||"—"}</span>,
                <span style={{ color:breach?C.red:C.green, fontWeight:700 }}>{k.currentPeriodValue||k.actual||"—"}</span>,
                <span style={{ color:C.text }}>{k.target||"—"}</span>,
                <span style={{ color:(k.trend||"").toLowerCase()==="improving"?C.green:(k.trend||"").toLowerCase()==="declining"?C.red:C.muted }}>
                  {(k.trend||"").toLowerCase()==="improving"?"↑ Improving":(k.trend||"").toLowerCase()==="declining"?"↓ Declining":"→ Stable"}
                </span>,
                <StatusBadge status={k.currentStatus||k.status}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...k })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(k.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No KRIs match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── TREATMENT ACTIONS ADMIN ──────────────────────────────────────────────────
const EMPTY_TREATMENT = {
  id:"", riskId:"", action:"", owner:"", dueDate:"",
  status:"Not Started", priority:"Medium", progress:0, budget:"",
};

function TreatmentForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_TREATMENT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Action — ${initial.id}` : "Add New Treatment Action"}
      </h3>

      {/* Row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Action ID"   value={f.id}     onChange={set("id")}     required placeholder="TA-009" />
        <FInput label="Linked Risk" value={f.riskId} onChange={set("riskId")} required placeholder="e.g. SR-001" />
      </div>

      {/* Action description */}
      <FTextarea label="Action Description" value={f.action} onChange={set("action")} rows={2} placeholder="Describe the treatment action…" />

      {/* Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Owner"    value={f.owner}   onChange={set("owner")}   placeholder="e.g. CIO" />
        <FInput  label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date" />
        <FInput  label="Budget (R)" value={f.budget} onChange={set("budget")} type="number" placeholder="e.g. 100000" />
      </div>

      {/* Row 3 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Not Started","In Progress","Near Complete","Complete","Overdue","On Hold"]} />
        <FSelect label="Priority" value={f.priority} onChange={set("priority")}
          options={["Critical","High","Medium","Low"]} />
      </div>

      {/* Progress slider */}
      <div style={{ marginBottom:"0.85rem" }}>
        <label style={{ ...labelSt, display:"flex", justifyContent:"space-between" }}>
          <span>Progress</span>
          <span style={{ color:C.blue, fontWeight:700 }}>{f.progress}%</span>
        </label>
        <input type="range" min={0} max={100} step={5} value={f.progress}
          onChange={e=>set("progress")(Number(e.target.value))}
          style={{ width:"100%", accentColor:C.blue, cursor:"pointer" }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {[0,25,50,75,100].map(v=>(
            <span key={v} style={{ color:C.muted, fontSize:"0.7rem" }}>{v}%</span>
          ))}
        </div>
        {/* Visual bar */}
        <div style={{ marginTop:6 }}>
          <ProgressBar value={Number(f.progress)} color={Number(f.progress)===100?C.green:Number(f.progress)>=75?C.amber:C.blue} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Action" : "Add Action"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function TreatmentActionsAdmin() {
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/treatments`);
      const data = await res.json();
      setActions(Array.isArray(data) && data.length > 0 ? data : STATIC_TREATMENTS);
    } catch { setActions(STATIC_TREATMENTS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.action) { showToast("Action ID and Description are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const body   = { ...f, progress: Number(f.progress)||0, budget: Number(f.budget)||0 };
      const res = await fetch(
        isEdit ? `${API}/api/treatments/${f.id}` : `${API}/api/treatments`,
        { method: isEdit?"PUT":"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }
      );
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/treatments/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = actions.filter(a =>
    (a.action||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.riskId||a.risk||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.owner||"").toLowerCase().includes(search.toLowerCase())
  );

  const priorityColor = p => p==="Critical"?C.red:p==="High"?"#e36209":p==="Medium"?C.amber:C.green;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Treatment Action</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Treatment Actions — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>
            {actions.length} actions · {actions.filter(a=>a.status==="Complete").length} complete ·{" "}
            {actions.filter(a=>a.status==="Not Started").length} not started
          </p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search actions…"
            style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Action
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total",        actions.length,                                              C.blue  ],
          ["Complete",     actions.filter(a=>a.status==="Complete").length,             C.green ],
          ["In Progress",  actions.filter(a=>["In Progress","Near Complete"].includes(a.status)).length, C.amber ],
          ["Not Started",  actions.filter(a=>a.status==="Not Started").length,          C.muted ],
          ["Overdue",      actions.filter(a=>a.status==="Overdue"||
            (a.status!=="Complete"&&a.dueDate&&new Date(a.dueDate)<new Date())).length, C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {mode==="add"         && <TreatmentForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <TreatmentForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading actions from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Risk","Action","Owner","Due Date","Priority","Progress","Status","Actions"]}
            rows={filtered.map(a=>{
              const pct    = Number(a.progress)||0;
              const overdue= a.status!=="Complete" && a.dueDate && new Date(a.dueDate) < new Date();
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{a.id}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{a.riskId||a.risk||"—"}</span>,
                <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.action}>{a.action}</span>,
                <span style={{ whiteSpace:"nowrap" }}>{a.owner||"—"}</span>,
                <span style={{ color:overdue?C.red:C.text, whiteSpace:"nowrap", fontWeight:overdue?700:400 }}>
                  {overdue?"⚠ ":""}{a.dueDate||a.due||"—"}
                </span>,
                <span style={{ color:priorityColor(a.priority), fontWeight:700, fontSize:"0.78rem" }}>{a.priority||"—"}</span>,
                <div style={{ minWidth:130 }}>
                  <div style={{ color:pct===100?C.green:pct>=75?C.amber:C.blue, fontSize:"0.72rem", fontWeight:700, marginBottom:3 }}>{pct}%</div>
                  <ProgressBar value={pct} color={pct===100?C.green:pct>=75?C.amber:C.blue} />
                </div>,
                <StatusBadge status={a.status}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...a })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(a.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No actions match your search.</p>}
        </Card>
      )}
    </div>
  );
}

const MODULE_OPTIONS = [
  { value:"strategic",    label:"Strategic Risks",    component: StrategicRisksAdmin },
  { value:"kri",          label:"KRI Monitoring",     component: KRIMonitoringAdmin },
  { value:"treatment",    label:"Treatment Actions",  component: TreatmentActionsAdmin },
  { value:"uifw",         label:"UIFW Expenditure",   component: null },
  { value:"fraud",        label:"Fraud & Ethics",     component: null },
  { value:"departmental", label:"Departmental Risks", component: null },
  { value:"thirdparty",   label:"Third-Party Risk",   component: null },
  { value:"opportunities",label:"Opportunities",      component: null },
  { value:"emerging",     label:"Emerging Risks",     component: null },
  { value:"app",          label:"APP Alignment",      component: null },
  { value:"bcm",          label:"BCM Resilience",     component: null },
];

function UploadSection() {
  const [module, setModule]     = useState("risks");
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState({ msg:"", type:"" });
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
    try {
      const res  = await fetch(`${API}/api/upload/${module}`, { method:"POST", body:form });
      const data = await res.json();
      if (res.ok) { setStatus({ msg:`✅ ${data.message} (added: ${data.added}, updated: ${data.updated})`, type:"ok" }); setFile(null); }
      else          { setStatus({ msg:`❌ ${data.message||"Upload failed"}`, type:"err" }); }
    } catch(e)   { setStatus({ msg:`❌ Network error: ${e.message}`, type:"err" }); }
  }

  const borderColor = dragging?C.blue:file?C.green:C.border;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" }}>
      <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Upload Excel data</h3>
      <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem" }}>
        Choose the target module, upload your <code style={{ color:C.blue }}>.xlsx</code> file. Download templates from{" "}
        <a href={`${API}/api/templates/risks`} style={{ color:C.blue }} target="_blank" rel="noreferrer">here</a>.
      </p>
      <div style={{ marginBottom:"1.1rem" }}>
        <label style={{ ...labelSt, display:"block", marginBottom:"0.4rem" }}>Target module</label>
        <select value={module} onChange={e=>setModule(e.target.value)} style={{ ...inputSt, maxWidth:360 }}>
          {[["risks","Strategic Risks"],["treatments","Treatment Actions"],["kris","KRI Monitoring"],["uifw","UIFW Expenditure"],["incidents","BCM Incidents"]].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])}}
        onClick={()=>document.getElementById("admin-file-inp").click()}
        style={{ border:`2px dashed ${borderColor}`, borderRadius:10, padding:"2rem", textAlign:"center",
          cursor:"pointer", marginBottom:"1.2rem", transition:"all 0.15s",
          background:dragging?"rgba(88,166,255,0.05)":file?"rgba(63,185,80,0.05)":"transparent" }}>
        <input id="admin-file-inp" type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>pickFile(e.target.files[0])}/>
        <div style={{ fontSize:"2rem", marginBottom:"0.4rem" }}>{file?"📄":"📂"}</div>
        {file
          ? <><div style={{ color:C.green, fontWeight:700 }}>{file.name}</div><div style={{ color:C.muted, fontSize:"0.78rem" }}>{(file.size/1024).toFixed(1)} KB · click to change</div></>
          : <div style={{ color:C.muted, fontSize:"0.88rem" }}>Drag & drop your .xlsx here, or click to browse</div>}
      </div>
      <button onClick={handleUpload} disabled={status.type==="loading"}
        style={{ padding:"0.65rem 2rem", background:C.blue, color:"#fff", border:"none", borderRadius:8,
          fontSize:"0.9rem", fontWeight:700, cursor:"pointer", opacity:status.type==="loading"?0.6:1, marginBottom:"1rem" }}>
        {status.type==="loading"?"Uploading…":"Upload to server"}
      </button>
      {status.msg&&(
        <div style={{ padding:"0.6rem 0.9rem", borderRadius:6, fontSize:"0.88rem",
          background:status.type==="ok"?"rgba(63,185,80,0.1)":status.type==="err"?"rgba(248,81,73,0.1)":"rgba(88,166,255,0.1)",
          borderLeft:`4px solid ${status.type==="ok"?C.green:status.type==="err"?C.red:C.blue}`,
          color:status.type==="ok"?C.green:status.type==="err"?C.red:C.blue }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

function AdminTab() {
  const [view, setView]       = useState("upload");   // "upload" | "edit"
  const [editModule, setEditModule] = useState(null); // null | module value

  const chosen = MODULE_OPTIONS.find(m=>m.value===editModule);

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ color:C.text, fontSize:"1.4rem", fontWeight:700, margin:"0 0 0.2rem" }}>Admin Panel</h2>
        <p style={{ color:C.muted, fontSize:"0.9rem", margin:0 }}>Upload Excel data or edit records manually — changes save to the server instantly.</p>
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, marginBottom:"1.5rem" }}>
        {[["upload","📤 Excel Upload"],["edit","✏️ Manual Edit"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setEditModule(null); }}
            style={{ padding:"0.55rem 1.4rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.88rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`3px solid ${C.blue}`:"3px solid transparent", marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {view==="upload" && <UploadSection/>}

      {view==="edit" && !editModule && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" }}>
          <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Select a module to edit</h3>
          <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem" }}>Click a module card to open its data entry form.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:"0.7rem" }}>
            {MODULE_OPTIONS.map(m=>(
              <button key={m.value} onClick={()=>setEditModule(m.value)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.85rem 1rem",
                  background:C.surface, border:`1px solid ${m.component?C.blue:C.border}`,
                  borderRadius:8, cursor:"pointer", color:C.text, fontSize:"0.88rem", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#1a2744"}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.surface}}>
                <span style={{ fontWeight:500 }}>{m.label}</span>
                <span style={{ color:m.component?C.blue:C.muted, fontSize:"0.75rem" }}>{m.component?"✏️ Ready":"🔜 Soon"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view==="edit" && editModule && (
        <div>
          <button onClick={()=>setEditModule(null)}
            style={{ display:"flex", alignItems:"center", gap:"0.4rem", background:"transparent", border:"none",
              color:C.muted, cursor:"pointer", fontSize:"0.85rem", marginBottom:"1rem", padding:0 }}>
            ← Back to module list
          </button>
          {chosen?.component
            ? <chosen.component/>
            : <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>Form for <strong style={{ color:C.text }}>{chosen?.label}</strong> is coming in the next build.</p></Card>
          }
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"executive",     label:"Executive Overview",  icon:"🏛" },
  { id:"appetite",      label:"Risk Appetite",        icon:"⚖" },
  { id:"strategic",     label:"Strategic Risks",      icon:"🎯" },
  { id:"kri",           label:"KRI Monitoring",       icon:"📊" },
  { id:"opportunities", label:"Opportunities",        icon:"💡" },
  { id:"emerging",      label:"Emerging Risks",       icon:"🌐" },
  { id:"treatment",     label:"Treatment Actions",    icon:"🔧" },
  { id:"assurance",     label:"Combined Assurance",   icon:"✅" },
  { id:"bcm",           label:"BCM Resilience",       icon:"🛡" },
  { id:"fraud",         label:"Fraud & Ethics",       icon:"⚠" },
  { id:"departmental",  label:"Departmental Risks",   icon:"🏢" },
  { id:"uifw",          label:"UIFW Expenditure",     icon:"💰" },
  { id:"thirdparty",    label:"Third-Party Risk",     icon:"🤝" },
  { id:"app",           label:"APP Alignment",        icon:"📋" },
  { id:"predictive",    label:"Predictive Intel",     icon:"🔮" },
  { id:"admin",         label:"Admin Panel",          icon:"⚙" },
];

const MODULES = {
  executive:ExecutiveOverview, appetite:RiskAppetite, strategic:StrategicRisks,
  kri:KRIMonitoring, opportunities:Opportunities, emerging:EmergingRisks,
  treatment:TreatmentActions, assurance:CombinedAssurance, bcm:BCMResilience,
  fraud:FraudEthics, departmental:DepartmentalRisks, uifw:UIFWExpenditure,
  thirdparty:ThirdPartyRisk, app:APPAlignment, predictive:PredictiveIntel,
  admin:AdminTab,
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("executive");
  const Module = MODULES[active] || ExecutiveOverview;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Segoe UI','Inter',sans-serif", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:240, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"1rem 1.1rem 0.75rem", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.surface, zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#1d6fa4,#3b82f6)", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:"0.85rem", flexShrink:0 }}>i</div>
            <div>
              <div style={{ color:C.text, fontWeight:800, fontSize:"0.88rem", lineHeight:1.2 }}>LGSETA — BJMAPEX</div>
              <div style={{ color:C.muted, fontSize:"0.7rem" }}>GRC Intelligence Center</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"0.5rem 0" }}>
          {NAV.map((item,i)=>{
            const isActive = active===item.id;
            const isAdmin  = item.id==="admin";
            return (
              <button key={item.id} onClick={()=>setActive(item.id)}
                style={{ display:"flex", alignItems:"center", gap:"0.65rem", width:"100%", padding:"0.55rem 1.1rem",
                  border:"none", background:isActive?"rgba(88,166,255,0.12)":"transparent",
                  cursor:"pointer", textAlign:"left",
                  borderLeft:`3px solid ${isActive?C.blue:"transparent"}`,
                  marginTop:isAdmin&&i>0?"0.25rem":0,
                  borderTop:isAdmin?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:"0.95rem", width:20, textAlign:"center" }}>{item.icon}</span>
                <span style={{ color:isActive?C.text:isAdmin?C.purple:C.muted, fontSize:"0.83rem", fontWeight:isActive?700:500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 1.5rem",
          height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.text, fontSize:"1rem", fontWeight:700, margin:0 }}>
            {NAV.find(n=>n.id===active)?.label}
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <span style={{ color:C.green, fontSize:"0.78rem", fontWeight:600 }}>● Live</span>
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>Q2 2026/27</span>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem" }}>
          <Module/>
        </main>
      </div>
    </div>
  );
}
