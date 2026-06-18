import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "https://lgseta-risk-dashboard.onrender.com";

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────
async function logAudit({ module, action, recordId, description, before=null, after=null, meta={} }) {
  try {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!Array.isArray(data.auditLog)) data.auditLog = [];
    data.auditLog.push({
      timestamp: new Date().toISOString(),
      module, action, recordId, description,
      before, after, meta,
    });
    // Keep last 500 entries
    if (data.auditLog.length > 500) data.auditLog = data.auditLog.slice(-500);
    await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
  } catch(e) { console.warn("Audit log failed:", e.message); }
}

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
  const [selectedKRI, setSelectedKRI] = useState(null);
  useEffect(()=>{ fetch(`${API}/api/kris`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setKris(d); }).catch(()=>{}); },[]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      {selectedKRI && <KRITrendModal kri={selectedKRI} onClose={()=>setSelectedKRI(null)}/>}
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
              <button onClick={()=>setSelectedKRI(k)}
                style={{ marginLeft:4, background:"transparent", border:`1px solid ${C.border}`, borderRadius:5,
                  color:C.blue, fontSize:"0.68rem", padding:"2px 6px", cursor:"pointer" }}>📈</button>
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

// ─── UIFW EXPENDITURE ADMIN ───────────────────────────────────────────────────
const EMPTY_UIFW = {
  id:"", type:"Irregular", description:"", amount:"", department:"",
  dateIdentified:"", status:"Open", responsibleOfficer:"",
  condoned:"false", recoverable:"true", referredTo:"Internal Audit",
};

function UIFWForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_UIFW, ...initial, amount: initial.amount||"" });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.red}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.red, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit UIFW Case — ${initial.id}` : "Add New UIFW Case"}
      </h3>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput   label="Case ID"   value={f.id}   onChange={set("id")}   required placeholder="UIFW-009" />
        <FSelect  label="Type"      value={f.type} onChange={set("type")}  required
          options={["Irregular","Unauthorised","Fruitless & Wasteful"]} />
        <FInput   label="Department" value={f.department} onChange={set("department")} placeholder="e.g. Finance" />
      </div>

      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2}
        placeholder="Describe the UIFW expenditure…" />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <div style={{ marginBottom:"0.85rem" }}>
          <label style={labelSt}>Amount (R) <span style={{ color:C.red }}>*</span></label>
          <input type="number" value={f.amount} onChange={e=>set("amount")(e.target.value)}
            placeholder="e.g. 500000" style={inputSt}/>
          {f.amount && <div style={{ color:C.red, fontSize:"0.75rem", marginTop:3 }}>
            = R{Number(f.amount).toLocaleString()}
          </div>}
        </div>
        <FInput  label="Date Identified" value={f.dateIdentified} onChange={set("dateIdentified")} type="date" />
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Open","Under Investigation","Condoned","Recovered","Written Off","Closed"]} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Responsible Officer" value={f.responsibleOfficer} onChange={set("responsibleOfficer")} placeholder="e.g. Finance Manager" />
        <FSelect label="Condoned"   value={String(f.condoned)}   onChange={set("condoned")}   options={["false","true"]} />
        <FSelect label="Recoverable" value={String(f.recoverable)} onChange={set("recoverable")} options={["true","false"]} />
      </div>

      <FInput label="Referred To" value={f.referredTo} onChange={set("referredTo")} placeholder="e.g. Internal Audit, AGSA, NPA" />

      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Case" : "Add Case"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function UIFWAdmin() {
  const [cases, setCases]       = useState([]);
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
      const res  = await fetch(`${API}/api/uifw`);
      const data = await res.json();
      setCases(Array.isArray(data) && data.length > 0 ? data : STATIC_UIFW);
    } catch { setCases(STATIC_UIFW); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.amount) { showToast("Case ID and Amount are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const body   = { ...f, amount:Number(f.amount)||0,
        condoned:   f.condoned==="true"||f.condoned===true,
        recoverable:f.recoverable==="true"||f.recoverable===true };
      const res = await fetch(
        isEdit ? `${API}/api/uifw/${f.id}` : `${API}/api/uifw`,
        { method:isEdit?"PUT":"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }
      );
      if (!res.ok) throw new Error((await res.json()).message||"Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/uifw/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message||"Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = cases.filter(c =>
    (c.description||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.department||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.type||"").toLowerCase().includes(search.toLowerCase())
  );

  const total     = cases.reduce((s,c)=>s+(Number(c.amount)||0), 0);
  const openTotal = cases.filter(c=>["Open","Under Investigation"].includes(c.status)).reduce((s,c)=>s+(Number(c.amount)||0),0);

  const typeColor = t => t==="Irregular"?C.red:t==="Unauthorised"?C.purple:C.amber;

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
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete UIFW Case</h3>
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
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>UIFW Expenditure — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{cases.length} cases · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases…"
            style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Case
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total Cases",    cases.length,                                                              C.blue  ],
          ["Total UIFW",     `R${(total/1e6).toFixed(2)}M`,                                            C.red   ],
          ["Open / Under Inv",cases.filter(c=>["Open","Under Investigation"].includes(c.status)).length,C.amber ],
          ["Open Exposure",  `R${(openTotal/1e6).toFixed(2)}M`,                                        C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.4rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {mode==="add"         && <UIFWForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <UIFWForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading UIFW cases from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Type","Department","Description","Amount","Date","Status","Actions"]}
            rows={filtered.map(c=>[
              <span style={{ color:C.amber, fontWeight:700, whiteSpace:"nowrap" }}>{c.id}</span>,
              <Badge label={c.type} color={c.type==="Irregular"?"red":c.type==="Unauthorised"?"blue":"amber"}/>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.department||"—"}</span>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.description}>{c.description||"—"}</span>,
              <span style={{ color:C.red, fontWeight:700, whiteSpace:"nowrap" }}>R{(Number(c.amount)||0).toLocaleString()}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{c.dateIdentified||"—"}</span>,
              <StatusBadge status={c.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...c })} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                  Edit
                </button>
                <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                  Delete
                </button>
              </div>,
            ])}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No cases match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── FRAUD & ETHICS ADMIN ─────────────────────────────────────────────────────
const EMPTY_FRAUD = {
  id:"", category:"Procurement Fraud", description:"", amount:"",
  status:"Open", reported:"", source:"Hotline", responsiblePerson:"",
  investigator:"", resolutionDate:"", outcome:"", referredTo:"",
};

function FraudForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_FRAUD, ...initial, amount:initial.amount||"" });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Case — ${initial.id}` : "Add New Fraud / Ethics Case"}
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Case ID"  value={f.id}       onChange={set("id")}       required placeholder="FC-004" />
        <FSelect label="Category" value={f.category} onChange={set("category")} required
          options={["Procurement Fraud","Misappropriation","Conflict of Interest","Bribery & Corruption","Financial Misconduct","Dishonesty","Ethics Violation","Other"]} />
        <FSelect label="Source"   value={f.source}   onChange={set("source")}
          options={["Hotline","Internal","Disclosure","External Tip","Audit Finding","Management","Anonymous"]} />
      </div>
      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the fraud or ethics case…" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <div style={{ marginBottom:"0.85rem" }}>
          <label style={labelSt}>Financial Loss (R)</label>
          <input type="number" value={f.amount} onChange={e=>set("amount")(e.target.value)} placeholder="0 if no financial loss" style={inputSt} />
          {Number(f.amount) > 0 && <div style={{ color:C.red, fontSize:"0.75rem", marginTop:3 }}>= R{Number(f.amount).toLocaleString()}</div>}
        </div>
        <FInput  label="Date Reported" value={f.reported} onChange={set("reported")} type="date" />
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Open","Under Investigation","Disciplinary Action","Resolved","Closed","Referred to NPA","Written Off"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Responsible Person" value={f.responsiblePerson} onChange={set("responsiblePerson")} placeholder="Name of implicated person" />
        <FInput label="Investigator"       value={f.investigator}      onChange={set("investigator")}      placeholder="e.g. Internal Audit / SAPS" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Referred To"     value={f.referredTo}     onChange={set("referredTo")}     placeholder="e.g. NPA, DPCI, Internal Disciplinary" />
        <FInput label="Resolution Date" value={f.resolutionDate} onChange={set("resolutionDate")} type="date" />
      </div>
      <FTextarea label="Outcome / Resolution" value={f.outcome} onChange={set("outcome")} rows={2} placeholder="Describe the outcome or current resolution status…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Case" : "Add Case"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function FraudEthicsAdmin() {
  const [cases, setCases]       = useState([]);
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
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const fraud = data.fraudEthics?.cases || data.fraudCases || [];
      setCases(fraud.length > 0 ? fraud : STATIC_FRAUD);
    } catch { setCases(STATIC_FRAUD); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.description) { showToast("Case ID and Description are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.fraudEthics) data.fraudEthics = { cases:[] };
      if (!data.fraudEthics.cases) data.fraudEthics.cases = [];
      const body   = { ...f, amount:Number(f.amount)||0 };
      const isEdit = mode?.id;
      const idx    = data.fraudEthics.cases.findIndex(c => c.id === f.id);
      if (isEdit && idx >= 0) {
        data.fraudEthics.cases[idx] = { ...data.fraudEthics.cases[idx], ...body, updatedAt:new Date().toISOString() };
      } else {
        data.fraudEthics.cases.push({ ...body, createdAt:new Date().toISOString() });
      }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.fraudEthics?.cases) data.fraudEthics.cases = data.fraudEthics.cases.filter(c => c.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = cases.filter(c =>
    (c.description||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.category||"").toLowerCase().includes(search.toLowerCase())
  );

  const totalLoss = cases.reduce((s,c)=>s+(Number(c.amount)||0),0);
  const openCases = cases.filter(c=>!["Resolved","Closed","Written Off"].includes(c.status)).length;

  return (
    <div>
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(163,113,247,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.purple:C.red}`,
          color:toast.type==="ok"?C.purple:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Case</h3>
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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Fraud & Ethics Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{cases.length} cases · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases…" style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Case
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total Cases",       cases.length,                                                         C.purple],
          ["Open / Active",     openCases,                                                            C.red   ],
          ["Resolved / Closed", cases.filter(c=>["Resolved","Closed"].includes(c.status)).length,    C.green ],
          ["Total Loss",        totalLoss>0?`R${(totalLoss/1e6).toFixed(2)}M`:"R0",                  C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.4rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      {mode==="add"         && <FraudForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FraudForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading cases from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Category","Description","Amount","Source","Reported","Status","Actions"]}
            rows={filtered.map(c=>[
              <span style={{ color:C.purple, fontWeight:700, whiteSpace:"nowrap" }}>{c.id}</span>,
              <Badge label={c.category} color="blue"/>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.description}>{c.description||"—"}</span>,
              <span style={{ color:Number(c.amount)>0?C.red:C.muted, fontWeight:Number(c.amount)>0?700:400 }}>
                {Number(c.amount)>0?`R${Number(c.amount).toLocaleString()}`:"—"}
              </span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.source||"—"}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{c.reported||"—"}</span>,
              <StatusBadge status={c.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...c })} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No cases match your search.</p>}
        </Card>
      )}
    </div>
  );
}


// ─── DEPARTMENTAL RISKS ADMIN ─────────────────────────────────────────────────
const EMPTY_DEPT = {
  id:"", name:"", risks:"", critical:"", treatment:"", uifw:"",
  riskOwner:"", department:"", notes:"",
};

function DeptForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_DEPT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.name ? `Edit — ${initial.name}` : "Add Department"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Department Name" value={f.name}       onChange={set("name")}       required placeholder="e.g. Finance" />
        <FInput label="Risk Owner"      value={f.riskOwner}  onChange={set("riskOwner")}  placeholder="e.g. CFO" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Total Risks"      value={f.risks}     onChange={set("risks")}     type="number" placeholder="8" />
        <FInput label="Critical Risks"   value={f.critical}  onChange={set("critical")}  type="number" placeholder="2" />
        <FInput label="Treatment % "     value={f.treatment} onChange={set("treatment")} type="number" placeholder="75" />
        <FInput label="UIFW Exposure (R)"value={f.uifw}      onChange={set("uifw")}      type="number" placeholder="0" />
      </div>
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Any additional notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.name?"Update Department":"Add Department"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function DepartmentalRisksAdmin() {
  const [depts, setDepts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const d = data.departmentalRisks || data.departments || [];
      setDepts(d.length > 0 ? d : STATIC_DEPTS);
    } catch { setDepts(STATIC_DEPTS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.name) { showToast("Department Name is required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.departmentalRisks) data.departmentalRisks = [];
      const body = { ...f, risks:Number(f.risks)||0, critical:Number(f.critical)||0, treatment:Number(f.treatment)||0, uifw:Number(f.uifw)||0 };
      const isEdit = mode?.name;
      const idx    = data.departmentalRisks.findIndex(d => d.name === f.name);
      if (isEdit && idx >= 0) { data.departmentalRisks[idx] = { ...data.departmentalRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.departmentalRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.name} updated.` : `✅ ${f.name} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(name) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.departmentalRisks) data.departmentalRisks = data.departmentalRisks.filter(d => d.name !== name);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${name} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Department</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Departmental Risks — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{depts.length} departments</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Department</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <DeptForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <DeptForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["Department","Risk Owner","Total Risks","Critical","Treatment %","UIFW Exposure","Actions"]}
            rows={depts.map(d=>[
              <span style={{ color:C.text, fontWeight:700 }}>{d.name}</span>,
              d.riskOwner||"—",
              <span style={{ color:C.blue, fontWeight:700 }}>{d.risks||0}</span>,
              <span style={{ color:C.red, fontWeight:700 }}>{d.critical||0}</span>,
              <div style={{ minWidth:120 }}>
                <div style={{ color:Number(d.treatment)>=80?C.green:Number(d.treatment)>=60?C.amber:C.red, fontSize:"0.78rem", fontWeight:700, marginBottom:3 }}>{d.treatment||0}%</div>
                <ProgressBar value={Number(d.treatment)||0} color={Number(d.treatment)>=80?C.green:Number(d.treatment)>=60?C.amber:C.red}/>
              </div>,
              <span style={{ color:Number(d.uifw)>0?C.red:C.muted, fontWeight:Number(d.uifw)>0?700:400 }}>{Number(d.uifw)>0?`R${Number(d.uifw).toLocaleString()}`:"—"}</span>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(d.name)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── THIRD-PARTY RISK ADMIN ───────────────────────────────────────────────────
const EMPTY_TP = {
  id:"", name:"", type:"ICT", risk:"Medium", contract:"", score:"",
  status:"Active", contactPerson:"", reviewDate:"", notes:"",
};

function ThirdPartyForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_TP, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.name}` : "Add Third Party"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput  label="ID"   value={f.id}   onChange={set("id")}   required placeholder="TP-007" />
        <FInput  label="Name" value={f.name} onChange={set("name")} required placeholder="e.g. Acme Technology" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Type"   value={f.type}   onChange={set("type")}
          options={["ICT","Auditor","Training","Facilities","Banking","Security","Legal","Consulting","Other"]} />
        <FSelect label="Risk"   value={f.risk}   onChange={set("risk")}
          options={["Low","Medium","High","Critical"]} />
        <FSelect label="Status" value={f.status} onChange={set("status")}
          options={["Active","Review","Suspended","Terminated","Pending"]} />
        <FInput  label="Score (0-100)" value={f.score} onChange={set("score")} type="number" placeholder="85" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Contract End Date" value={f.contract}     onChange={set("contract")}     type="date" />
        <FInput label="Review Date"       value={f.reviewDate}   onChange={set("reviewDate")}   type="date" />
      </div>
      <FInput label="Contact Person" value={f.contactPerson} onChange={set("contactPerson")} placeholder="Primary contact at the third party" />
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Any additional risk notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Third Party":"Add Third Party"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function ThirdPartyRiskAdmin() {
  const [parties, setParties]   = useState([]);
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
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const tp = data.thirdPartyRisk || data.thirdParties || [];
      setParties(tp.length > 0 ? tp : STATIC_THIRD);
    } catch { setParties(STATIC_THIRD); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.thirdPartyRisk) data.thirdPartyRisk = [];
      const body = { ...f, score:Number(f.score)||0 };
      const isEdit = mode?.id;
      const idx    = data.thirdPartyRisk.findIndex(t => t.id === f.id);
      if (isEdit && idx >= 0) { data.thirdPartyRisk[idx] = { ...data.thirdPartyRisk[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.thirdPartyRisk.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.name} updated.` : `✅ ${f.name} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.thirdPartyRisk) data.thirdPartyRisk = data.thirdPartyRisk.filter(t => t.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = parties.filter(p =>
    (p.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.type||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(57,211,83,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.cyan:C.red}`, color:toast.type==="ok"?C.cyan:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Third Party</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Third-Party Risk Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{parties.length} third parties · {parties.filter(p=>p.risk==="High"||p.risk==="Critical").length} high/critical risk</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...inputSt, width:180 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻</button>
        </div>
      </div>
      {mode==="add"         && <ThirdPartyForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <ThirdPartyForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Type","Risk","Score","Contract End","Status","Actions"]}
            rows={filtered.map(p=>[
              <span style={{ color:C.cyan, fontWeight:700 }}>{p.id}</span>,
              <span style={{ fontWeight:600 }}>{p.name}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{p.type}</span>,
              <Badge label={p.risk} color={p.risk==="High"||p.risk==="Critical"?"red":p.risk==="Medium"?"amber":"green"}/>,
              <span style={{ color:Number(p.score)>=80?C.green:Number(p.score)>=65?C.amber:C.red, fontWeight:700 }}>{p.score||"—"}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{p.contract||"Ongoing"}</span>,
              <StatusBadge status={p.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── OPPORTUNITIES ADMIN ──────────────────────────────────────────────────────
const EMPTY_OPP_FORM = {
  id:"", name:"", benefit:"", score:"", status:"Proposed", owner:"",
  horizon:"", category:"Strategic", notes:"",
};

function OpportunityForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_OPP_FORM, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add Opportunity"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="ID"   value={f.id}   onChange={set("id")}   required placeholder="OPP-006" />
        <FInput label="Name" value={f.name} onChange={set("name")} required placeholder="Opportunity name" />
      </div>
      <FTextarea label="Benefit / Value" value={f.benefit} onChange={set("benefit")} rows={2} placeholder="Describe the strategic benefit…" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Opportunity Score" value={f.score}   onChange={set("score")}   type="number" placeholder="15" />
        <FSelect label="Status"            value={f.status}  onChange={set("status")}  options={["Proposed","Active","Under Review","Approved","Closed"]} />
        <FInput  label="Owner"             value={f.owner}   onChange={set("owner")}   placeholder="e.g. CEO" />
        <FSelect label="Category"          value={f.category}onChange={set("category")}options={["Strategic","Financial","Operational","Technology","Stakeholder","Skills Development"]} />
      </div>
      <FInput label="Time Horizon" value={f.horizon} onChange={set("horizon")} placeholder="e.g. 6-12 months" />
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Opportunity":"Add Opportunity"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function OpportunitiesAdmin() {
  const [opps, setOpps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/opportunities`);
      const data = await res.json();
      setOpps(Array.isArray(data) && data.length > 0 ? data : STATIC_OPP);
    } catch { setOpps(STATIC_OPP); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.opportunityRisks) data.opportunityRisks = [];
      const body = { ...f, score:Number(f.score)||0 };
      const isEdit = mode?.id;
      const idx    = data.opportunityRisks.findIndex(o => o.id === f.id);
      if (isEdit && idx >= 0) { data.opportunityRisks[idx] = { ...data.opportunityRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.opportunityRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.opportunityRisks) data.opportunityRisks = data.opportunityRisks.filter(o => o.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(57,211,83,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.cyan:C.red}`, color:toast.type==="ok"?C.cyan:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Opportunity</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Opportunities Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{opps.length} opportunities · {opps.filter(o=>o.status==="Active").length} active</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <OpportunityForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <OpportunityForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Category","Score","Owner","Status","Actions"]}
            rows={opps.map(o=>[
              <span style={{ color:C.cyan, fontWeight:700 }}>{o.id}</span>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={o.name}>{o.name}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{o.category||"—"}</span>,
              <span style={{ color:C.amber, fontWeight:700 }}>{o.score||"—"}</span>,
              o.owner||"—",
              <StatusBadge status={o.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...o })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(o.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── EMERGING RISKS ADMIN ─────────────────────────────────────────────────────
const EMPTY_ER = {
  id:"", name:"", category:"Technology", likelihood:"3", impact:"3",
  horizon:"12-24 months", action:"Monitor", description:"", owner:"",
};

function EmergingRiskForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_ER, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.amber, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add Emerging Risk"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="ID"   value={f.id}   onChange={set("id")}   required placeholder="ER-006" />
        <FInput label="Name" value={f.name} onChange={set("name")} required placeholder="Emerging risk name" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Category"   value={f.category}   onChange={set("category")}
          options={["Technology","Economic","Regulatory","Environment","Social","Political","Health","Other"]} />
        <FSelect label="Likelihood (1-5)" value={String(f.likelihood)} onChange={set("likelihood")}
          options={["1","2","3","4","5"]} />
        <FSelect label="Impact (1-5)"     value={String(f.impact)}     onChange={set("impact")}
          options={["1","2","3","4","5"]} />
        <FSelect label="Action"           value={f.action}             onChange={set("action")}
          options={["Monitor","Watch","Escalate","Mitigate","Accept"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Time Horizon" value={f.horizon} onChange={set("horizon")} placeholder="e.g. 12-24 months" />
        <FInput label="Owner"        value={f.owner}   onChange={set("owner")}   placeholder="e.g. CRO" />
      </div>
      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the emerging risk…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Risk":"Add Risk"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function EmergingRisksAdmin() {
  const [risks, setRisks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const er = data.emergingRisks || [];
      setRisks(er.length > 0 ? er : STATIC_EMERGING);
    } catch { setRisks(STATIC_EMERGING); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.emergingRisks) data.emergingRisks = [];
      const body = { ...f, likelihood:Number(f.likelihood)||3, impact:Number(f.impact)||3 };
      const isEdit = mode?.id;
      const idx    = data.emergingRisks.findIndex(r => r.id === f.id);
      if (isEdit && idx >= 0) { data.emergingRisks[idx] = { ...data.emergingRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.emergingRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.emergingRisks) data.emergingRisks = data.emergingRisks.filter(r => r.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(227,179,65,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.amber:C.red}`, color:toast.type==="ok"?C.amber:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Emerging Risk</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Emerging Risks — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{risks.length} emerging risks · {risks.filter(r=>r.action==="Escalate").length} escalated</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <EmergingRiskForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <EmergingRiskForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Category","Likelihood","Impact","Score","Horizon","Action","Actions"]}
            rows={risks.map(r=>{
              const score = (Number(r.likelihood)||0) * (Number(r.impact)||0);
              return [
                <span style={{ color:C.amber, fontWeight:700 }}>{r.id}</span>,
                <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.name}>{r.name}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.category}</span>,
                <span style={{ color:C.amber, fontWeight:700 }}>{r.likelihood}/5</span>,
                <span style={{ color:C.red, fontWeight:700 }}>{r.impact}/5</span>,
                <span style={{ color:score>=15?C.red:score>=9?C.amber:C.green, fontWeight:800 }}>{score}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.horizon}</span>,
                <Badge label={r.action} color={r.action==="Escalate"?"red":r.action==="Mitigate"?"amber":"blue"}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...r })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── APP ALIGNMENT ADMIN ──────────────────────────────────────────────────────
const EMPTY_APP_ITEM = {
  ref:"", objective:"", target:"", actual:"", status:"In Progress", quarter:"Q2",
};

function APPItemForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_APP_ITEM, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.ref ? `Edit — ${initial.ref}` : "Add APP Item"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
        <FInput label="APP Ref"    value={f.ref}       onChange={set("ref")}       required placeholder="APP 1.1" />
        <FInput label="Objective"  value={f.objective} onChange={set("objective")} required placeholder="Performance objective description" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Target (%)"  value={f.target} onChange={set("target")} type="number" placeholder="95" />
        <FInput  label="Actual (%)"  value={f.actual} onChange={set("actual")} type="number" placeholder="88" />
        <FSelect label="Quarter"     value={f.quarter} onChange={set("quarter")} options={["Q1","Q2","Q3","Q4"]} />
        <FSelect label="Status"      value={f.status}  onChange={set("status")}
          options={["On Track","In Progress","Behind","Not Started","Complete"]} />
      </div>
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.ref?"Update Item":"Add Item"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function APPAlignmentAdmin() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const ap = data.appAlignment || data.annualPerformancePlan || [];
      setItems(ap.length > 0 ? ap : STATIC_APP);
    } catch { setItems(STATIC_APP); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.ref || !f.objective) { showToast("Ref and Objective are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.appAlignment) data.appAlignment = [];
      const body = { ...f, target:Number(f.target)||0, actual:Number(f.actual)||0 };
      const isEdit = mode?.ref;
      const idx    = data.appAlignment.findIndex(a => a.ref === f.ref);
      if (isEdit && idx >= 0) { data.appAlignment[idx] = { ...data.appAlignment[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.appAlignment.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.ref} updated.` : `✅ ${f.ref} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(ref) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.appAlignment) data.appAlignment = data.appAlignment.filter(a => a.ref !== ref);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${ref} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete APP Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>APP Alignment — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items · {items.filter(a=>a.status==="On Track"||a.status==="Complete").length} on track</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Item</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <APPItemForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <APPItemForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["Ref","Objective","Target","Actual","Progress","Quarter","Status","Actions"]}
            rows={items.map(a=>[
              <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{a.ref}</span>,
              <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.objective}>{a.objective}</span>,
              `${a.target}%`,
              <span style={{ color:Number(a.actual)>=Number(a.target)?C.green:C.red, fontWeight:700 }}>{a.actual}%</span>,
              <div style={{ minWidth:100 }}>
                <ProgressBar value={Number(a.actual)||0} max={Number(a.target)||100} color={Number(a.actual)>=Number(a.target)?C.green:C.red}/>
              </div>,
              <Badge label={a.quarter} color="blue"/>,
              <StatusBadge status={a.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...a })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(a.ref)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── BCM RESILIENCE ADMIN ─────────────────────────────────────────────────────
const EMPTY_INCIDENT = {
  id:"", title:"", date:"", type:"ICT System Outage", affectedUnit:"",
  severity:"Medium", duration:"", rtoBreached:"No", rpoBreached:"No",
  impact:"", actionsTaken:"", lessonsLearned:"", status:"Open",
};

function BCMIncidentForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_INCIDENT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add BCM Incident"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="Incident ID" value={f.id}    onChange={set("id")}    required placeholder="INC-004" />
        <FInput label="Title"       value={f.title} onChange={set("title")} required placeholder="Brief incident title" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Date"          value={f.date}         onChange={set("date")}         type="date" />
        <FSelect label="Type"          value={f.type}         onChange={set("type")}
          options={["ICT System Outage","Power Failure","Data Breach Attempt","Network Failure","Physical Security","Pandemic/Health","Natural Disaster","Supplier Failure","Other"]} />
        <FSelect label="Severity"      value={f.severity}     onChange={set("severity")}     options={["Low","Medium","High","Critical"]} />
        <FInput  label="Duration"      value={f.duration}     onChange={set("duration")}     placeholder="e.g. 4 hours" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Affected Unit"  value={f.affectedUnit}  onChange={set("affectedUnit")}  placeholder="e.g. All Departments" />
        <FSelect label="RTO Breached"   value={f.rtoBreached}   onChange={set("rtoBreached")}   options={["No","Yes"]} />
        <FSelect label="RPO Breached"   value={f.rpoBreached}   onChange={set("rpoBreached")}   options={["No","Yes"]} />
        <FSelect label="Status"         value={f.status}        onChange={set("status")}        options={["Open","Contained","Resolved","Closed","Under Review"]} />
      </div>
      <FTextarea label="Impact Description" value={f.impact}        onChange={set("impact")}        rows={2} placeholder="Describe the business impact…" />
      <FTextarea label="Actions Taken"      value={f.actionsTaken}  onChange={set("actionsTaken")}  rows={2} placeholder="What was done to resolve the incident…" />
      <FTextarea label="Lessons Learned"    value={f.lessonsLearned}onChange={set("lessonsLearned")}rows={2} placeholder="Key learnings and recommendations…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Incident":"Log Incident"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function BCMResilienceAdmin() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [mode, setMode]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/bcm/incidents`);
      const data = await res.json();
      setIncidents(Array.isArray(data) && data.length > 0 ? data : STATIC_BCM.incidents);
    } catch { setIncidents(STATIC_BCM.incidents); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.title) { showToast("Incident ID and Title are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      if (isEdit) {
        const res  = await fetch(`${API}/api/dashboard`);
        const data = await res.json();
        if (!data.bcmResilience) data.bcmResilience = { incidents:[] };
        if (!data.bcmResilience.incidents) data.bcmResilience.incidents = [];
        const idx = data.bcmResilience.incidents.findIndex(i => i.id === f.id);
        if (idx >= 0) { data.bcmResilience.incidents[idx] = { ...data.bcmResilience.incidents[idx], ...f, updatedAt:new Date().toISOString() }; }
        const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
        if (!saveRes.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch(`${API}/api/bcm/incidents`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) });
        if (!res.ok) throw new Error((await res.json()).message||"Failed to add");
      }
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} logged.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.bcmResilience?.incidents) data.bcmResilience.incidents = data.bcmResilience.incidents.filter(i => i.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Incident</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>BCM Incidents — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{incidents.length} incidents · {incidents.filter(i=>i.status==="Open").length} open</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Log Incident</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <BCMIncidentForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <BCMIncidentForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Title","Date","Type","Severity","Duration","RTO Breached","Status","Actions"]}
            rows={incidents.map(i=>[
              <span style={{ color:C.green, fontWeight:700, whiteSpace:"nowrap" }}>{i.id}</span>,
              <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={i.title||i.type}>{i.title||i.type}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{i.date}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{i.type}</span>,
              <Badge label={i.severity||i.impact} color={i.severity==="Critical"||i.severity==="High"||i.impact==="High"?"red":i.severity==="Medium"||i.impact==="Medium"?"amber":"green"}/>,
              i.duration||"—",
              i.rtoBreached==="Yes"||i.rtoMet===false ? <Badge label="Yes" color="red"/> : <Badge label="No" color="green"/>,
              <StatusBadge status={i.status||i.resolution}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...i })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(i.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

const MODULE_OPTIONS = [
  { value:"strategic",    label:"Strategic Risks",    component: StrategicRisksAdmin },
  { value:"kri",          label:"KRI Monitoring",     component: KRIMonitoringAdmin },
  { value:"treatment",    label:"Treatment Actions",  component: TreatmentActionsAdmin },
  { value:"uifw",         label:"UIFW Expenditure",   component: UIFWAdmin },
  { value:"fraud",        label:"Fraud & Ethics",     component: FraudEthicsAdmin },
  { value:"departmental", label:"Departmental Risks", component: DepartmentalRisksAdmin },
  { value:"thirdparty",   label:"Third-Party Risk",   component: ThirdPartyRiskAdmin },
  { value:"opportunities",label:"Opportunities",      component: OpportunitiesAdmin },
  { value:"emerging",     label:"Emerging Risks",     component: EmergingRisksAdmin },
  { value:"app",          label:"APP Alignment",      component: APPAlignmentAdmin },
  { value:"bcm",          label:"BCM Resilience",     component: BCMResilienceAdmin },
  { value:"compliance",   label:"Compliance",         component: ComplianceAdmin },
  { value:"iam",          label:"Identity & Access",    component: IAMAdmin },
  { value:"policy",       label:"Policy & Process",     component: PolicyAdmin },
  { value:"projects",     label:"Projects & Contracts",component: ProjectsAdmin },
  { value:"declarations", label:"Declarations",         component: DeclarationsAdmin },
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

function ReportsTab() {
  const [generating, setGenerating] = useState(null); // null | "excom"|"arc"|"board"
  const [toast, setToast]           = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 5000); }

  async function generateReport(type) {
    setGenerating(type);
    try {
      const res = await fetch(`${API}/api/reports/${type}`, { method:"POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message||"Generation failed");
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      const date     = new Date().toISOString().slice(0,10);
      const labels   = { excom:"EXCOM", arc:"ARC", board:"Board" };
      a.href         = url;
      a.download     = `LGSETA_${labels[type]}_GRC_Report_${date}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`✅ ${labels[type]} report downloaded successfully!`);
    } catch(e) {
      showToast(`❌ ${e.message}`, "err");
    } finally {
      setGenerating(null);
    }
  }

  const reports = [
    {
      type:     "excom",
      label:    "EXCOM Report",
      audience: "Executive Committee",
      color:    C.blue,
      icon:     "🏛",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Treatment Action Status","UIFW Exposure Summary"],
      desc:     "High-level GRC overview for the Executive Committee. Focuses on key metrics, critical risks, and action status.",
    },
    {
      type:     "arc",
      label:    "ARC Report",
      audience: "Audit & Risk Committee",
      color:    C.amber,
      icon:     "⚖",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Treatment Action Status","UIFW Exposure","Fraud & Ethics Register","BCM Status","Compliance","Project & Contract Risk","Identity & Access Management","Policy & Process Manual"],
      desc:     "Detailed GRC report for the Audit & Risk Committee. Includes fraud, BCM and full UIFW analysis.",
    },
    {
      type:     "board",
      label:    "Board Report",
      audience: "Board of Directors",
      color:    C.purple,
      icon:     "🎯",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Treatment Action Status","UIFW Exposure","Fraud & Ethics Register","BCM Status","APP Alignment","Compliance","Project & Contract Risk","Identity & Access Management","Policy & Process Manual"],
      desc:     "Full GRC overview for the Board. All sections included with APP performance alignment.",
    },
  ];

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.5rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.9rem", maxWidth:400 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ color:C.text, fontSize:"1.4rem", fontWeight:700, margin:"0 0 0.2rem" }}>📄 Quarterly Report Generator</h2>
        <p style={{ color:C.muted, fontSize:"0.9rem", margin:0 }}>
          Generate Word (.docx) reports from live dashboard data. Reports include all current data from the server.
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        {reports.map(r => (
          <div key={r.type} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.5rem",
            borderLeft:`4px solid ${r.color}`, display:"flex", alignItems:"flex-start", gap:"1.5rem", flexWrap:"wrap" }}>

            {/* Icon + label */}
            <div style={{ minWidth:160 }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.3rem" }}>{r.icon}</div>
              <div style={{ color:r.color, fontWeight:800, fontSize:"1.1rem" }}>{r.label}</div>
              <div style={{ color:C.muted, fontSize:"0.78rem" }}>{r.audience}</div>
            </div>

            {/* Description + sections */}
            <div style={{ flex:1 }}>
              <p style={{ color:C.muted, fontSize:"0.85rem", margin:"0 0 0.75rem", lineHeight:1.6 }}>{r.desc}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {r.sections.map(s => (
                  <span key={s} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                    padding:"2px 8px", fontSize:"0.72rem", color:C.muted }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", alignItems:"flex-end", minWidth:160 }}>
              <button
                onClick={()=>generateReport(r.type)}
                disabled={!!generating}
                style={{ padding:"0.7rem 1.5rem", background:generating===r.type?C.surface:r.color,
                  color:generating===r.type?C.muted:"#fff", border:`1px solid ${r.color}`,
                  borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:generating?"not-allowed":"pointer",
                  whiteSpace:"nowrap", transition:"all 0.15s", minWidth:160, textAlign:"center" }}>
                {generating===r.type ? "⏳ Generating…" : "⬇ Download .docx"}
              </button>
              {generating===r.type && (
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>Fetching live data…</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:"1.5rem", padding:"1rem 1.25rem", background:"rgba(88,166,255,0.08)",
        border:`1px solid rgba(88,166,255,0.2)`, borderRadius:8, fontSize:"0.83rem", color:C.blue, lineHeight:1.65 }}>
        <strong>How it works:</strong> Each report fetches live data from your Render server, builds a professionally
        formatted Word document with your LGSETA branding, and downloads it directly. Open in Microsoft Word or
        Google Docs, then share with your stakeholders.
      </div>
    </div>
  );
}

function AdminTab() {
  const [view, setView]       = useState("upload");   // "upload" | "edit" | "reports"
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
        {[["upload","📤 Excel Upload"],["edit","✏️ Manual Edit"],["reports","📄 Reports"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setEditModule(null); }}
            style={{ padding:"0.55rem 1.4rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.88rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`3px solid ${C.blue}`:"3px solid transparent", marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {view==="upload"  && <UploadSection/>}
      {view==="reports" && <ReportsTab/>}

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


// ─── COMPLIANCE DATA ──────────────────────────────────────────────────────────
const STATIC_COMPLIANCE = {
  universe: [
    { id:"CU-001", legislation:"Public Finance Management Act (PFMA)", act:"Act 1 of 1999", category:"Financial", owner:"CFO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:2, notes:"Section 38 & 51 requirements partially met" },
    { id:"CU-002", legislation:"Skills Development Levies Act (SDL)", act:"Act 9 of 1999", category:"Core Mandate", owner:"CEO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"Levy collection and disbursement on track" },
    { id:"CU-003", legislation:"Skills Development Act (SDA)", act:"Act 97 of 1998", category:"Core Mandate", owner:"COO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-02-28", nextReview:"2026-08-31", findings:1, notes:"SETA functions per Section 10 — APP targets behind" },
    { id:"CU-004", legislation:"Protection of Personal Information Act (POPIA)", act:"Act 4 of 2013", category:"Data Protection", owner:"CIO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-04-15", nextReview:"2026-10-15", findings:3, notes:"Information Officer designated; PAIA manual outdated" },
    { id:"CU-005", legislation:"King IV Report on Corporate Governance", act:"King IV 2016", category:"Governance", owner:"CEO", riskRating:"Medium", complianceStatus:"Partial", lastReview:"2026-03-01", nextReview:"2026-09-01", findings:2, notes:"16 of 17 principles applied; Principle 13 in progress" },
    { id:"CU-006", legislation:"DHET Sector Skills Plan Directive", act:"DHET 2025/26", category:"Regulatory", owner:"COO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-01-31", nextReview:"2026-07-31", findings:0, notes:"SSP submitted and approved by DHET" },
    { id:"CU-007", legislation:"Labour Relations Act (LRA)", act:"Act 66 of 1995", category:"Human Resources", owner:"HR Executive", riskRating:"Medium", complianceStatus:"Compliant", lastReview:"2026-02-15", nextReview:"2026-08-15", findings:0, notes:"Employment contracts and disciplinary procedures aligned" },
    { id:"CU-008", legislation:"Basic Conditions of Employment Act (BCEA)", act:"Act 75 of 1997", category:"Human Resources", owner:"HR Executive", riskRating:"Low", complianceStatus:"Compliant", lastReview:"2026-02-15", nextReview:"2026-08-15", findings:0, notes:"Leave policies and working hours compliant" },
    { id:"CU-009", legislation:"B-BBEE Act", act:"Act 53 of 2003", category:"Transformation", owner:"CEO", riskRating:"Medium", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"Level 2 verification current" },
    { id:"CU-010", legislation:"Prevention & Combating of Corrupt Activities Act", act:"Act 12 of 2004", category:"Fraud & Ethics", owner:"Legal", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-01", nextReview:"2026-09-01", findings:0, notes:"Fraud prevention plan in place; hotline operational" },
    { id:"CU-011", legislation:"Promotion of Access to Information Act (PAIA)", act:"Act 2 of 2000", category:"Data Protection", owner:"Legal", riskRating:"Low", complianceStatus:"Non-Compliant", lastReview:"2025-12-31", nextReview:"2026-06-30", findings:1, notes:"PAIA manual overdue for update" },
    { id:"CU-012", legislation:"Public Audit Act", act:"Act 25 of 2004", category:"Governance", owner:"CFO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"AGSA access and cooperation maintained" },
  ],
  calendar: [
    { id:"CC-001", obligation:"Annual Report submission to DHET", legislation:"SDL Act / PFMA", dueDate:"2026-07-31", owner:"CEO", status:"Upcoming", priority:"Critical", category:"Reporting", notes:"Full annual report including AFS" },
    { id:"CC-002", obligation:"Quarterly Performance Report Q2", legislation:"PFMA / APP", dueDate:"2026-07-15", owner:"COO", status:"Upcoming", priority:"High", category:"Reporting", notes:"Submit to DHET within 30 days of quarter end" },
    { id:"CC-003", obligation:"PAIA Manual Review & Update", legislation:"PAIA Act 2 of 2000", dueDate:"2026-06-30", owner:"Legal", status:"Overdue", priority:"High", category:"Regulatory", notes:"Manual not updated since 2024" },
    { id:"CC-004", obligation:"B-BBEE Verification Certificate Renewal", legislation:"B-BBEE Act", dueDate:"2026-09-30", owner:"CEO", status:"Upcoming", priority:"Medium", category:"Compliance", notes:"Current certificate expires September 2026" },
    { id:"CC-005", obligation:"POPIA Compliance Audit", legislation:"POPIA Act 4 of 2013", dueDate:"2026-08-31", owner:"CIO", status:"Upcoming", priority:"High", category:"Data Protection", notes:"Annual internal POPIA audit" },
    { id:"CC-006", obligation:"Tax Clearance Certificate Renewal", legislation:"SARS / PFMA", dueDate:"2026-07-31", owner:"CFO", status:"Upcoming", priority:"High", category:"Financial", notes:"Required for procurement above threshold" },
    { id:"CC-007", obligation:"Board Self-Assessment (King IV)", legislation:"King IV 2016", dueDate:"2026-09-30", owner:"CEO", status:"Upcoming", priority:"Medium", category:"Governance", notes:"Annual board effectiveness assessment" },
    { id:"CC-008", obligation:"Sector Skills Plan (SSP) Update", legislation:"SDL Act / SDA", dueDate:"2026-09-30", owner:"COO", status:"Upcoming", priority:"High", category:"Core Mandate", notes:"Annual SSP update submission to DHET" },
    { id:"CC-009", obligation:"Interim Financial Statements", legislation:"PFMA Section 55", dueDate:"2026-07-31", owner:"CFO", status:"Upcoming", priority:"Critical", category:"Financial", notes:"Six-month interim statements to National Treasury" },
    { id:"CC-010", obligation:"Employment Equity Report", legislation:"Employment Equity Act", dueDate:"2026-10-01", owner:"HR Executive", status:"Upcoming", priority:"Medium", category:"Human Resources", notes:"Annual EE report to Department of Labour" },
    { id:"CC-011", obligation:"Workplace Skills Plan (WSP) Submission", legislation:"SDL Act", dueDate:"2026-06-30", owner:"HR Executive", status:"Overdue", priority:"High", category:"Core Mandate", notes:"Annual WSP and ATR submission — currently overdue" },
    { id:"CC-012", obligation:"AGSA Engagement — Interim Audit", legislation:"PFMA / PAA", dueDate:"2026-08-15", owner:"CFO", status:"Upcoming", priority:"Critical", category:"Audit", notes:"Prepare for AGSA interim audit fieldwork" },
  ],
  monitoring: [
    { id:"CM-001", requirement:"PFMA Section 38 — Internal Controls", legislation:"PFMA", status:"Partial", evidence:"Internal audit reports", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"CFO", riskLevel:"High", actionRequired:"Strengthen SCM and payment controls" },
    { id:"CM-002", requirement:"PFMA Section 55 — Annual Report", legislation:"PFMA", status:"In Progress", evidence:"Draft annual report", lastChecked:"2026-06-01", nextCheck:"2026-07-31", owner:"CEO", riskLevel:"High", actionRequired:"Finalise AFS and performance report" },
    { id:"CM-003", requirement:"SDL Act — Levy Disbursement (mandatory grants)", legislation:"SDL Act", status:"Compliant", evidence:"Payment records", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"COO", riskLevel:"Low", actionRequired:"None — maintain current controls" },
    { id:"CM-004", requirement:"SDL Act — Discretionary Grant Allocation", legislation:"SDL Act", status:"Partial", evidence:"Grant agreements", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"COO", riskLevel:"Medium", actionRequired:"Accelerate DG commitments to meet 90% target" },
    { id:"CM-005", requirement:"POPIA — Information Officer Designation", legislation:"POPIA", status:"Compliant", evidence:"POPIA registration", lastChecked:"2026-04-30", nextCheck:"2026-10-31", owner:"CIO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-006", requirement:"POPIA — Privacy Notices & Consent", legislation:"POPIA", status:"Partial", evidence:"Website privacy policy", lastChecked:"2026-04-30", nextCheck:"2026-07-31", owner:"CIO", riskLevel:"High", actionRequired:"Update learner consent forms and supplier agreements" },
    { id:"CM-007", requirement:"King IV — Board Composition", legislation:"King IV", status:"Compliant", evidence:"Board charter", lastChecked:"2026-03-31", nextCheck:"2026-09-30", owner:"CEO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-008", requirement:"King IV — Risk Governance (Principle 11)", legislation:"King IV", status:"Compliant", evidence:"Risk committee TOR", lastChecked:"2026-03-31", nextCheck:"2026-09-30", owner:"CEO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-009", requirement:"DHET Directive — Quarterly Reporting", legislation:"DHET", status:"In Progress", evidence:"Q2 report draft", lastChecked:"2026-06-14", nextCheck:"2026-07-15", owner:"COO", riskLevel:"High", actionRequired:"Finalise Q2 report by 15 July" },
    { id:"CM-010", requirement:"LRA — Disciplinary Procedures", legislation:"LRA", status:"Compliant", evidence:"HR policy manual", lastChecked:"2026-02-28", nextCheck:"2026-08-31", owner:"HR Executive", riskLevel:"Low", actionRequired:"None" },
  ],
};

// ─── COMPLIANCE VIEW MODULE ───────────────────────────────────────────────────
function ComplianceModule() {
  const [sub, setSub]       = useState("universe");
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(STATIC_COMPLIANCE);
  const [policyData, setPolicyData] = useState(STATIC_POLICY.policies);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.compliance) setData({ ...STATIC_COMPLIANCE, ...d.compliance });
      if (d.policyManual?.policies) setPolicyData(d.policyManual.policies);
    }).catch(()=>{});
  },[]);

  const univ = data.universe  || [];
  const cal  = data.calendar  || [];
  const mon  = data.monitoring || [];

  const compliant    = univ.filter(u=>u.complianceStatus==="Compliant").length;
  const nonCompliant = univ.filter(u=>u.complianceStatus==="Non-Compliant").length;
  const partial      = univ.filter(u=>u.complianceStatus==="Partial").length;
  const overdue      = cal.filter(c=>c.status==="Overdue").length;
  const totalFindings= univ.reduce((s,u)=>s+(Number(u.findings)||0),0);

  const sc = s => {
    const v=(s||"").toLowerCase();
    return v==="compliant"?C.green:v.includes("non")||v==="overdue"?C.red:v==="partial"||v.includes("progress")||v==="upcoming"?C.amber:C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Compliance Management</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Universe · Calendar · Monitoring — Q2 2026/27</p>
        </div>
        <input placeholder="Search compliance…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[["Total Laws",univ.length,C.blue],["Compliant",compliant,C.green],["Partial",partial,C.amber],
          ["Non-Compliant",nonCompliant,C.red],["Findings",totalFindings,totalFindings>0?C.red:C.green],["Overdue",overdue,overdue>0?C.red:C.green]
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["universe","📋 Compliance Universe"],["calendar","📅 Compliance Calendar"],["monitoring","✅ Compliance Monitoring"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {sub==="universe" && (
        <Card>
          <Table
            headers={["ID","Legislation","Category","Owner","Risk","Status","Findings","Next Review","Linked Policies"]}
            rows={filtered(univ).map(u=>[
              <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
              <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{u.legislation}</div>
                <div style={{ color:C.muted, fontSize:"0.7rem" }}>{u.notes}</div></div>,
              <Badge label={u.category} color="blue"/>,
              u.owner,
              <Badge label={u.riskRating} color={u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(u.complianceStatus), fontWeight:700, fontSize:"0.8rem" }}>{u.complianceStatus}</span>,
              <span style={{ color:Number(u.findings)>0?C.red:C.green, fontWeight:700 }}>{u.findings}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{u.nextReview}</span>,
            ])}
          />
        </Card>
      )}

      {sub==="calendar" && (
        <Card>
          <Table
            headers={["ID","Obligation","Legislation","Due Date","Owner","Priority","Status"]}
            rows={filtered([...cal].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))).map(c=>{
              const isOverdue = c.status==="Overdue" || new Date(c.dueDate)<new Date();
              const days = Math.ceil((new Date(c.dueDate)-new Date())/(1000*60*60*24));
              return [
                <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{c.obligation}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{c.notes}</div></div>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.legislation}</span>,
                <div>
                  <div style={{ color:isOverdue?C.red:days<=14?C.amber:C.text, fontWeight:700, fontSize:"0.82rem" }}>{c.dueDate}</div>
                  {!isOverdue&&<div style={{ color:days<=14?C.amber:C.muted, fontSize:"0.7rem" }}>{days} days left</div>}
                  {isOverdue && <div style={{ color:C.red, fontSize:"0.7rem", fontWeight:700 }}>OVERDUE</div>}
                </div>,
                c.owner,
                <Badge label={c.priority} color={c.priority==="Critical"?"red":c.priority==="High"?"amber":"blue"}/>,
                <span style={{ color:sc(c.status), fontWeight:700, fontSize:"0.8rem" }}>{c.status}</span>,
              ];
            })}
          />
        </Card>
      )}

      {sub==="monitoring" && (
        <Card>
          <Table
            headers={["ID","Requirement","Legislation","Owner","Risk","Status","Action Required","Next Check"]}
            rows={filtered(mon).map(m=>[
              <span style={{ color:C.green, fontWeight:700, fontSize:"0.75rem" }}>{m.id}</span>,
              <span style={{ color:C.text, fontWeight:600, fontSize:"0.82rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.requirement}>{m.requirement}</span>,
              <Badge label={m.legislation} color="blue"/>,
              m.owner,
              <Badge label={m.riskLevel} color={m.riskLevel==="High"?"red":m.riskLevel==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(m.status), fontWeight:700, fontSize:"0.8rem" }}>{m.status}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.actionRequired}>{m.actionRequired}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{m.nextCheck}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── COMPLIANCE ADMIN ─────────────────────────────────────────────────────────
function ComplianceAdmin() {
  const [view, setView]     = useState("universe");
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { universe:STATIC_COMPLIANCE.universe, calendar:STATIC_COMPLIANCE.calendar, monitoring:STATIC_COMPLIANCE.monitoring };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.compliance?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.compliance) data.compliance = {};
    data.compliance[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.compliance = {
        universe:   STATIC_COMPLIANCE.universe,
        calendar:   STATIC_COMPLIANCE.calendar,
        monitoring: STATIC_COMPLIANCE.monitoring,
      };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed data");
      await logAudit({ module:"Compliance", action:"Seed", description:`Seeded compliance demo data (${STATIC_COMPLIANCE.universe.length} legislation, ${STATIC_COMPLIANCE.calendar.length} calendar, ${STATIC_COMPLIANCE.monitoring.length} monitoring items)` });
      showToast(`✅ Seeded ${STATIC_COMPLIANCE.universe.length} legislation items, ${STATIC_COMPLIANCE.calendar.length} calendar items, ${STATIC_COMPLIANCE.monitoring.length} monitoring items to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const idField = view==="calendar"?"id":view==="monitoring"?"id":"id";

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i => i.id !== id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function UniverseForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", legislation:"", act:"", category:"Financial", owner:"", riskRating:"Medium", complianceStatus:"Partial", lastReview:"", nextReview:"", findings:"0", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Legislation":"Add Legislation"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CU-013"/>
          <FInput label="Legislation Name" value={f.legislation} onChange={set("legislation")} required placeholder="e.g. Public Audit Act"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Act / Reference" value={f.act} onChange={set("act")} placeholder="e.g. Act 25 of 2004"/>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Financial","Core Mandate","Data Protection","Governance","Regulatory","Human Resources","Transformation","Fraud & Ethics"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
          <FSelect label="Status" value={f.complianceStatus} onChange={set("complianceStatus")} options={["Compliant","Partial","Non-Compliant","Not Assessed"]}/>
          <FInput label="Findings" value={f.findings} onChange={set("findings")} type="number" placeholder="0"/>
          <FInput label="Next Review" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Key compliance notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function CalendarForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", obligation:"", legislation:"", dueDate:"", owner:"", status:"Upcoming", priority:"High", category:"Reporting", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.amber, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Item":"Add Calendar Item"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CC-013"/>
          <FInput label="Obligation" value={f.obligation} onChange={set("obligation")} required placeholder="e.g. Annual financial statements"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Legislation" value={f.legislation} onChange={set("legislation")} placeholder="e.g. PFMA"/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Upcoming","In Progress","Overdue","Complete"]}/>
          <FSelect label="Priority" value={f.priority} onChange={set("priority")} options={["Critical","High","Medium","Low"]}/>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Reporting","Regulatory","Financial","Audit","Governance","Data Protection","Core Mandate","Human Resources","Compliance"]}/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function MonitoringForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", requirement:"", legislation:"", owner:"", riskLevel:"Medium", status:"Partial", evidence:"", lastChecked:"", nextCheck:"", actionRequired:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Monitoring Item":"Add Monitoring Item"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CM-011"/>
          <FInput label="Requirement" value={f.requirement} onChange={set("requirement")} required placeholder="e.g. PFMA Section 38 — Internal Controls"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Legislation" value={f.legislation} onChange={set("legislation")} placeholder="e.g. PFMA"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
          <FSelect label="Risk Level" value={f.riskLevel} onChange={set("riskLevel")} options={["High","Medium","Low"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Compliant","Partial","Non-Compliant","In Progress","Not Assessed"]}/>
          <FInput label="Last Checked" value={f.lastChecked} onChange={set("lastChecked")} type="date"/>
          <FInput label="Next Check" value={f.nextCheck} onChange={set("nextCheck")} type="date"/>
        </div>
        <FInput label="Evidence" value={f.evidence} onChange={set("evidence")} placeholder="e.g. Internal audit report ref IA-2026-03"/>
        <FTextarea label="Action Required" value={f.actionRequired} onChange={set("actionRequired")} rows={2} placeholder="Describe action required…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="universe" ? UniverseForm : view==="calendar" ? CalendarForm : MonitoringForm;
  const addColor = view==="universe" ? C.blue : view==="calendar" ? C.amber : C.green;

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["universe","📋 Universe"],["calendar","📅 Calendar"],["monitoring","✅ Monitoring"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            Compliance {view.charAt(0).toUpperCase()+view.slice(1)} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Item</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} title="Push all 12 universe + 12 calendar + 10 monitoring demo items to the server"
            style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>
            🌱 Seed Demo Data
          </button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="universe" && (
            <Table
              headers={["ID","Legislation","Category","Risk","Status","Findings","Next Review","Actions"]}
              rows={items.map(u=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
                <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={u.legislation}>{u.legislation}</span>,
                <Badge label={u.category} color="blue"/>,
                <Badge label={u.riskRating} color={u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ color:u.complianceStatus==="Compliant"?C.green:u.complianceStatus==="Non-Compliant"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{u.complianceStatus}</span>,
                <span style={{ color:Number(u.findings)>0?C.red:C.green, fontWeight:700 }}>{u.findings}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{u.nextReview}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...u })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(u.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="calendar" && (
            <Table
              headers={["ID","Obligation","Legislation","Due Date","Owner","Priority","Status","Actions"]}
              rows={[...items].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(c=>{
                const isOverdue = c.status==="Overdue"||new Date(c.dueDate)<new Date();
                return [
                  <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                  <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.obligation}>{c.obligation}</span>,
                  <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.legislation}</span>,
                  <span style={{ color:isOverdue?C.red:C.text, fontWeight:isOverdue?700:400 }}>{c.dueDate}{isOverdue?" ⚠":""}</span>,
                  c.owner,
                  <Badge label={c.priority} color={c.priority==="Critical"?"red":c.priority==="High"?"amber":"blue"}/>,
                  <span style={{ color:isOverdue?C.red:c.status==="Complete"?C.green:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{c.status}</span>,
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={()=>setMode({ ...c })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                    <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                  </div>,
                ];
              })}
            />
          )}
          {view==="monitoring" && (
            <Table
              headers={["ID","Requirement","Legislation","Owner","Risk","Status","Action Required","Next Check","Actions"]}
              rows={items.map(m=>[
                <span style={{ color:C.green, fontWeight:700, fontSize:"0.75rem" }}>{m.id}</span>,
                <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.requirement}>{m.requirement}</span>,
                <Badge label={m.legislation} color="blue"/>,
                m.owner,
                <Badge label={m.riskLevel} color={m.riskLevel==="High"?"red":m.riskLevel==="Medium"?"amber":"green"}/>,
                <span style={{ color:m.status==="Compliant"?C.green:m.status==="Non-Compliant"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{m.status}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:140, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.actionRequired}>{m.actionRequired}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{m.nextCheck}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...m })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(m.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── PROJECTS & CONTRACTS DATA ────────────────────────────────────────────────
const STATIC_PROJECTS = {
  projects: [
    { id:"PRJ-001", name:"Municipal Finance Skills Academy Rollout", type:"Discretionary Grant", department:"Learning Programmes", manager:"L. Dlamini", budget:15500000, spent:8200000, startDate:"2026-01-15", endDate:"2026-09-30", status:"In Progress", riskRating:"Medium", milestonesTotal:8, milestonesComplete:4, description:"Establish finance academy for municipal CFO pipeline" },
    { id:"PRJ-002", name:"AI Learner Placement Platform Pilot", type:"Internal/Capital", department:"ICT", manager:"J. Williams", budget:6200000, spent:1100000, startDate:"2026-03-01", endDate:"2027-03-31", status:"In Progress", riskRating:"High", milestonesTotal:6, milestonesComplete:1, description:"AI-powered learner-employer matching system" },
    { id:"PRJ-003", name:"Provincial Assessment Centre Expansion", type:"Discretionary Grant", department:"ETQA", manager:"T. Mokoena", budget:12000000, spent:4500000, startDate:"2025-10-01", endDate:"2026-12-31", status:"In Progress", riskRating:"Medium", milestonesTotal:10, milestonesComplete:4, description:"PPP expansion of assessment centres to 4 new provinces" },
    { id:"PRJ-004", name:"Core ICT Infrastructure Upgrade", type:"Internal/Capital", department:"ICT", manager:"J. Williams", budget:9800000, spent:7600000, startDate:"2025-08-01", endDate:"2026-08-31", status:"In Progress", riskRating:"High", milestonesTotal:5, milestonesComplete:3, description:"Cloud migration, DR upgrade and network resilience" },
    { id:"PRJ-005", name:"Municipal Skills Intelligence Hub", type:"Internal/Capital", department:"Research / ICT", manager:"N. Khumalo", budget:8500000, spent:2100000, startDate:"2026-02-01", endDate:"2026-12-31", status:"In Progress", riskRating:"Medium", milestonesTotal:7, milestonesComplete:2, description:"Real-time skills intelligence platform for 257 municipalities" },
    { id:"PRJ-006", name:"Head Office Accommodation Relocation", type:"Internal/Capital", department:"Facilities", manager:"P. van der Merwe", budget:4200000, spent:600000, startDate:"2026-06-01", endDate:"2027-01-31", status:"Planning", riskRating:"High", milestonesTotal:6, milestonesComplete:0, description:"Secure and fit out alternate office accommodation" },
    { id:"PRJ-007", name:"Discretionary Grant Cycle 2026/27", type:"Discretionary Grant", department:"Grants", manager:"G. Mahlangu", budget:45000000, spent:18500000, startDate:"2026-04-01", endDate:"2027-03-31", status:"In Progress", riskRating:"High", milestonesTotal:4, milestonesComplete:1, description:"Annual discretionary grant disbursement to providers and employers" },
    { id:"PRJ-008", name:"Learner Management System Modernisation", type:"Internal/Capital", department:"ICT / ETQA", manager:"T. Mokoena", budget:3600000, spent:3600000, startDate:"2025-04-01", endDate:"2026-03-31", status:"Complete", riskRating:"Low", milestonesTotal:5, milestonesComplete:5, description:"LMS platform upgrade and SAQA interface integration" },
  ],
  contracts: [
    { id:"CT-001", title:"ICT Infrastructure & Support Services", supplier:"TechSystems SA (Pty) Ltd", type:"ICT Services", value:8500000, startDate:"2024-01-01", endDate:"2026-12-31", status:"Active", slaCompliance:78, owner:"CIO", riskRating:"High", renewalStatus:"Review Required", notes:"Single point of failure; sub-contractor not vetted" },
    { id:"CT-002", title:"Municipal Finance Training Delivery", supplier:"LearnersFirst Training Academy", type:"Training Provider", value:4200000, startDate:"2025-04-01", endDate:"2026-09-30", status:"Under Review", slaCompliance:54, owner:"COO", riskRating:"High", renewalStatus:"Do Not Renew", notes:"Ghost learner allegations; financial distress signals" },
    { id:"CT-003", title:"Cloud Hosting & Data Services", supplier:"CloudSecure Data Solutions", type:"Cloud Services", value:3600000, startDate:"2025-01-01", endDate:"2026-11-30", status:"Active", slaCompliance:88, owner:"CIO", riskRating:"High", renewalStatus:"Renew with Conditions", notes:"POPIA compliance not fully verified; offshore storage" },
    { id:"CT-004", title:"Assessment Body Services — Regional", supplier:"MuniSkills Assessment Centre", type:"Assessment Body", value:2800000, startDate:"2025-04-01", endDate:"2027-03-31", status:"Active", slaCompliance:94, owner:"ETQA Manager", riskRating:"Medium", renewalStatus:"On Track", notes:"Assessor capacity constraints flagged for monitoring" },
    { id:"CT-005", title:"Provincial Training Consortium Agreement", supplier:"Provincial Skills Consortium", type:"Training Provider", value:6100000, startDate:"2025-04-01", endDate:"2027-03-31", status:"Active", slaCompliance:81, owner:"COO", riskRating:"Medium", renewalStatus:"On Track", notes:"Delivery delays reported in 3 provinces" },
    { id:"CT-006", title:"Physical Security Services", supplier:"FortressGuard Security Services", type:"Physical Security", value:1200000, startDate:"2025-07-01", endDate:"2027-06-30", status:"Active", slaCompliance:97, owner:"Facilities Manager", riskRating:"Low", renewalStatus:"On Track", notes:"No outstanding issues" },
    { id:"CT-007", title:"External Audit Support Services", supplier:"AGSA / Appointed Audit Firm", type:"Audit", value:1850000, startDate:"2025-04-01", endDate:"2026-03-31", status:"Expiring Soon", slaCompliance:100, owner:"CFO", riskRating:"Low", renewalStatus:"Renewal in Progress", notes:"Standard annual audit engagement renewal" },
    { id:"CT-008", title:"Legal Services Retainer", supplier:"External Legal Counsel", type:"Legal", value:950000, startDate:"2025-01-01", endDate:"2026-12-31", status:"Active", slaCompliance:91, owner:"Legal", riskRating:"Low", renewalStatus:"On Track", notes:"Litigation matters progressing as expected" },
  ],
};

// ─── PROJECTS & CONTRACTS VIEW MODULE ─────────────────────────────────────────
function ProjectsModule() {
  const [sub, setSub]       = useState("projects");
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(STATIC_PROJECTS);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.projectsContracts) setData({ ...STATIC_PROJECTS, ...d.projectsContracts });
    }).catch(()=>{});
  },[]);

  const projects = data.projects  || [];
  const contracts = data.contracts || [];

  const totalBudget   = projects.reduce((s,p)=>s+(Number(p.budget)||0),0);
  const totalSpent    = projects.reduce((s,p)=>s+(Number(p.spent)||0),0);
  const highRiskProj  = projects.filter(p=>p.riskRating==="High").length;
  const activeProj    = projects.filter(p=>p.status==="In Progress").length;
  const totalContractValue = contracts.reduce((s,c)=>s+(Number(c.value)||0),0);
  const expiringSoon  = contracts.filter(c=>c.status==="Expiring Soon"||c.renewalStatus==="Review Required"||c.renewalStatus==="Do Not Renew").length;
  const lowSLA        = contracts.filter(c=>Number(c.slaCompliance)<80).length;

  const sc = s => {
    const v=(s||"").toLowerCase();
    if (v.includes("complete")||v==="on track"||v==="active") return C.green;
    if (v.includes("review")||v==="planning"||v==="expiring soon") return C.amber;
    if (v.includes("do not renew")||v==="overdue") return C.red;
    return C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Project & Contract Risk</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Project Portfolio · Contract & Commitment Register — Q2 2026/27</p>
        </div>
        <input placeholder="Search projects & contracts…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:240 }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Active Projects",   activeProj,                                  C.blue ],
          ["High Risk Projects",highRiskProj,                                 highRiskProj>0?C.red:C.green ],
          ["Project Budget",    `R${(totalBudget/1e6).toFixed(1)}M`,         C.purple ],
          ["Spent / Committed", `R${(totalSpent/1e6).toFixed(1)}M`,          C.amber ],
          ["Contract Value",    `R${(totalContractValue/1e6).toFixed(1)}M`, C.cyan ],
          ["Contracts at Risk", expiringSoon+lowSLA,                          (expiringSoon+lowSLA)>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.35rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["projects","📁 Project Portfolio"],["contracts","📜 Contract & Commitment Register"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {sub==="projects" && (
        <Card>
          <Table
            headers={["ID","Project","Type","Manager","Budget","Spent","Progress","Risk","Status"]}
            rows={filtered(projects).map(p=>{
              const pct = Math.round((p.milestonesComplete/Math.max(p.milestonesTotal,1))*100);
              const spentPct = Math.round((Number(p.spent)/Math.max(Number(p.budget),1))*100);
              return [
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{p.name}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{p.department}</div></div>,
                <Badge label={p.type} color={p.type==="Discretionary Grant"?"amber":"blue"}/>,
                p.manager,
                <span style={{ color:C.text, fontWeight:700 }}>R{(Number(p.budget)/1e6).toFixed(1)}M</span>,
                <span style={{ color:spentPct>90?C.red:C.muted }}>R{(Number(p.spent)/1e6).toFixed(1)}M ({spentPct}%)</span>,
                <div style={{ minWidth:90 }}>
                  <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:2 }}>{p.milestonesComplete}/{p.milestonesTotal} milestones</div>
                  <ProgressBar value={pct} color={pct>=80?C.green:pct>=40?C.amber:C.red}/>
                </div>,
                <Badge label={p.riskRating} color={p.riskRating==="High"?"red":p.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ color:sc(p.status), fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
              ];
            })}
          />
        </Card>
      )}

      {sub==="contracts" && (
        <Card>
          <Table
            headers={["ID","Contract","Supplier","Value","End Date","SLA %","Risk","Renewal Status"]}
            rows={filtered(contracts).map(c=>{
              const daysLeft = Math.ceil((new Date(c.endDate)-new Date())/(1000*60*60*24));
              return [
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{c.title}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{c.type}</div></div>,
                c.supplier,
                <span style={{ color:C.text, fontWeight:700 }}>R{(Number(c.value)/1e6).toFixed(1)}M</span>,
                <div>
                  <div style={{ color:daysLeft<90?C.amber:C.text, fontWeight:daysLeft<90?700:400 }}>{c.endDate}</div>
                  {daysLeft>0 && daysLeft<180 && <div style={{ color:daysLeft<90?C.red:C.amber, fontSize:"0.7rem" }}>{daysLeft} days left</div>}
                </div>,
                <span style={{ color:Number(c.slaCompliance)>=90?C.green:Number(c.slaCompliance)>=75?C.amber:C.red, fontWeight:700 }}>{c.slaCompliance}%</span>,
                <Badge label={c.riskRating} color={c.riskRating==="High"?"red":c.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ color:sc(c.renewalStatus), fontWeight:700, fontSize:"0.78rem" }}>{c.renewalStatus}</span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── PROJECTS & CONTRACTS ADMIN ───────────────────────────────────────────────
function ProjectsAdmin() {
  const [view, setView]       = useState("projects");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { projects:STATIC_PROJECTS.projects, contracts:STATIC_PROJECTS.contracts };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.projectsContracts?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.projectsContracts) data.projectsContracts = {};
    data.projectsContracts[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.projectsContracts = { projects:STATIC_PROJECTS.projects, contracts:STATIC_PROJECTS.contracts };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed data");
      showToast(`✅ Seeded ${STATIC_PROJECTS.projects.length} projects and ${STATIC_PROJECTS.contracts.length} contracts to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i => i.id !== id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function ProjectForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", name:"", type:"Discretionary Grant", department:"", manager:"", budget:"", spent:"", startDate:"", endDate:"", status:"Planning", riskRating:"Medium", milestonesTotal:"1", milestonesComplete:"0", description:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Project":"Add Project"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="PRJ-009"/>
          <FInput label="Project Name" value={f.name} onChange={set("name")} required placeholder="e.g. Digital Skills Programme"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Type" value={f.type} onChange={set("type")} options={["Discretionary Grant","Internal/Capital"]}/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ICT"/>
          <FInput label="Project Manager" value={f.manager} onChange={set("manager")} placeholder="e.g. J. Smith"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Budget (R)" value={f.budget} onChange={set("budget")} type="number" placeholder="5000000"/>
          <FInput label="Spent (R)" value={f.spent} onChange={set("spent")} type="number" placeholder="0"/>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="End Date" value={f.endDate} onChange={set("endDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Planning","In Progress","On Hold","Complete","Cancelled"]}/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
          <FInput label="Total Milestones" value={f.milestonesTotal} onChange={set("milestonesTotal")} type="number" placeholder="8"/>
          <FInput label="Milestones Complete" value={f.milestonesComplete} onChange={set("milestonesComplete")} type="number" placeholder="0"/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief project description…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Project"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ContractForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", supplier:"", type:"ICT Services", value:"", startDate:"", endDate:"", status:"Active", slaCompliance:"100", owner:"", riskRating:"Medium", renewalStatus:"On Track", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Contract":"Add Contract"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CT-009"/>
          <FInput label="Contract Title" value={f.title} onChange={set("title")} required placeholder="e.g. ICT Support Services"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"1rem" }}>
          <FInput label="Supplier" value={f.supplier} onChange={set("supplier")} placeholder="e.g. Acme (Pty) Ltd"/>
          <FSelect label="Type" value={f.type} onChange={set("type")} options={["ICT Services","Training Provider","Assessment Body","Cloud Services","Physical Security","Audit","Legal","Consulting","Other"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Contract Value (R)" value={f.value} onChange={set("value")} type="number" placeholder="2000000"/>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="End Date" value={f.endDate} onChange={set("endDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Under Review","Expiring Soon","Suspended","Terminated"]}/>
          <FInput label="SLA Compliance %" value={f.slaCompliance} onChange={set("slaCompliance")} type="number" placeholder="95"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CIO"/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
        </div>
        <FSelect label="Renewal Status" value={f.renewalStatus} onChange={set("renewalStatus")} options={["On Track","Renewal in Progress","Review Required","Renew with Conditions","Do Not Renew"]}/>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Key risk notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Contract"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="projects" ? ProjectForm : ContractForm;
  const addColor = view==="projects" ? C.blue : C.cyan;

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["projects","📁 Project Portfolio"],["contracts","📜 Contract Register"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="projects"?"Project Portfolio":"Contract & Commitment Register"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add {view==="projects"?"Project":"Contract"}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} title="Push demo projects & contracts to server"
            style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>
            🌱 Seed Demo Data
          </button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="projects" && (
            <Table
              headers={["ID","Project","Type","Budget","Spent","Risk","Status","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.name}>{p.name}</span>,
                <Badge label={p.type} color={p.type==="Discretionary Grant"?"amber":"blue"}/>,
                <span>R{(Number(p.budget)/1e6).toFixed(1)}M</span>,
                <span>R{(Number(p.spent)/1e6).toFixed(1)}M</span>,
                <Badge label={p.riskRating} color={p.riskRating==="High"?"red":p.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="contracts" && (
            <Table
              headers={["ID","Contract","Supplier","Value","SLA %","Risk","Renewal","Actions"]}
              rows={items.map(c=>[
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.title}>{c.title}</span>,
                c.supplier,
                <span>R{(Number(c.value)/1e6).toFixed(1)}M</span>,
                <span style={{ color:Number(c.slaCompliance)>=90?C.green:Number(c.slaCompliance)>=75?C.amber:C.red, fontWeight:700 }}>{c.slaCompliance}%</span>,
                <Badge label={c.riskRating} color={c.riskRating==="High"?"red":c.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.78rem" }}>{c.renewalStatus}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...c })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── DECLARATIONS DATA ────────────────────────────────────────────────────────
const DECLARATION_CATEGORIES = [
  "Conflict of Interest","Outside Position","Personal Relationship",
  "Gift & Hospitality","Income & Financial Interest","Political & Campaign Activities",
  "Supplier / Vendor Relationship","Procurement Disclosure","Assets / Property Interest",
  "Related Party Disclosure","Annual / Ad Hoc Declarations",
];

const STATIC_DECLARATIONS = [
  { id:"DEC-001", type:"Conflict of Interest", employee:"T. Mokoena", department:"ETQA", description:"Board member of training provider receiving LGSETA grant funding", relatedParty:"MuniSkills Assessment Centre", financialValue:"", dateSubmitted:"2026-04-15", periodCovered:"2026/27", status:"Approved", riskLevel:"High", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from all procurement decisions involving MuniSkills", dueDate:"", supportingDocs:"Declaration form signed", notes:"Annual renewal required" },
  { id:"DEC-002", type:"Gift & Hospitality", employee:"N. Khumalo", department:"Research / ICT", description:"Received conference sponsorship (flights + accommodation) from TechSystems SA", relatedParty:"TechSystems SA (Pty) Ltd", financialValue:"12500", dateSubmitted:"2026-03-20", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Disclosed and approved; no procurement role held", dueDate:"", supportingDocs:"Gift register entry", notes:"Below R15,000 threshold" },
  { id:"DEC-003", type:"Outside Position", employee:"G. Mahlangu", department:"Grants", description:"Director of family-owned training company not contracted to LGSETA", relatedParty:"Mahlangu Skills Academy (Pty) Ltd", financialValue:"", dateSubmitted:"2026-02-10", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Annual renewal; company must not apply for LGSETA grants", dueDate:"2027-02-10", supportingDocs:"CIPC registration certificate", notes:"No conflict currently; monitor annually" },
  { id:"DEC-004", type:"Income & Financial Interest", employee:"P. van der Merwe", department:"Facilities", description:"Spouse employed by facilities management company bidding on LGSETA contract", relatedParty:"Premier Facilities Group", financialValue:"", dateSubmitted:"2026-05-02", periodCovered:"2026/27", status:"Under Review", riskLevel:"High", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"Recusal from tender evaluation committee pending", dueDate:"2026-07-15", supportingDocs:"Declaration form", notes:"Awaiting Legal review" },
  { id:"DEC-005", type:"Procurement Disclosure", employee:"T. Mahlangu", department:"SCM", description:"Previous employment with supplier currently on LGSETA preferred supplier list", relatedParty:"CapCity Consulting (Pty) Ltd", financialValue:"", dateSubmitted:"2026-01-15", periodCovered:"2026/27", status:"Approved", riskLevel:"High", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from all CapCity evaluations and contract management", dueDate:"2027-01-15", supportingDocs:"Employment history confirmation", notes:"Permanent recusal in place" },
  { id:"DEC-006", type:"Personal Relationship", employee:"S. Nkosi", department:"HR", description:"Sibling applies for vacant HR Officer position", relatedParty:"Sibling — J. Nkosi", financialValue:"", dateSubmitted:"2026-06-01", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from recruitment panel; external HR to manage process", dueDate:"", supportingDocs:"Declaration form", notes:"Application in progress" },
  { id:"DEC-007", type:"Gift & Hospitality", employee:"L. Dlamini", department:"Learning Programmes", description:"Training provider offered tickets to PSL football match (value unknown)", relatedParty:"LearnersFirst Training Academy", financialValue:"2500", dateSubmitted:"2026-06-10", periodCovered:"2026/27", status:"Rejected", riskLevel:"High", managerReview:"Rejected", complianceReview:"Rejected", approvalStatus:"Rejected", mitigationAction:"Tickets returned; disciplinary warning issued", dueDate:"", supportingDocs:"Email evidence attached", notes:"Provider under investigation for ghost learners" },
  { id:"DEC-008", type:"Annual / Ad Hoc Declarations", employee:"J. Williams", department:"ICT", description:"Annual declaration — no conflicts or interests to declare", relatedParty:"None", financialValue:"", dateSubmitted:"2026-04-01", periodCovered:"2026/27", status:"Approved", riskLevel:"Low", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"No action required", dueDate:"2027-04-01", supportingDocs:"Signed declaration form", notes:"Clean annual declaration" },
  { id:"DEC-009", type:"Supplier / Vendor Relationship", employee:"M. Sithole", department:"Finance", description:"Personal friend is owner of accounting firm submitting quotation for LGSETA audit", relatedParty:"Sithole & Associates", financialValue:"", dateSubmitted:"2026-05-20", periodCovered:"2026/27", status:"Under Review", riskLevel:"High", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"Pending compliance review and recusal decision", dueDate:"2026-07-31", supportingDocs:"Declaration form", notes:"Urgent — quote evaluation imminent" },
  { id:"DEC-010", type:"Assets / Property Interest", employee:"C. Khumalo", department:"Corporate Services", description:"Owns property being considered for LGSETA provincial office lease", relatedParty:"CK Property Holdings", financialValue:"18000", dateSubmitted:"2026-03-10", periodCovered:"2026/27", status:"Rejected", riskLevel:"High", managerReview:"Rejected", complianceReview:"Rejected", approvalStatus:"Rejected", mitigationAction:"Property excluded from evaluation; disciplinary process initiated", dueDate:"", supportingDocs:"Title deed", notes:"Referred to Ethics Committee" },
];

// ─── DECLARATION WORKFLOW STATUS HELPERS ─────────────────────────────────────
function WorkflowBadge({ status }) {
  const map = {
    "Submitted":     { color:C.blue,   bg:"rgba(88,166,255,0.12)" },
    "Under Review":  { color:C.amber,  bg:"rgba(227,179,65,0.12)" },
    "Approved":      { color:C.green,  bg:"rgba(63,185,80,0.12)"  },
    "Rejected":      { color:C.red,    bg:"rgba(248,81,73,0.12)"  },
    "Pending":       { color:C.muted,  bg:"rgba(110,118,129,0.12)"},
    "Overdue":       { color:C.red,    bg:"rgba(248,81,73,0.12)"  },
  };
  const s = map[status] || map["Pending"];
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}`, borderRadius:4,
      padding:"2px 8px", fontSize:"0.75rem", fontWeight:700, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

function WorkflowPipeline({ status }) {
  const steps = ["Submitted","Under Review","Approved"];
  const idx   = steps.indexOf(status);
  const rejected = status === "Rejected";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"nowrap" }}>
      {steps.map((s, i) => {
        const done    = rejected ? false : i < idx;
        const current = rejected ? (s==="Under Review") : i===idx;
        const color   = rejected && s==="Approved" ? C.red : done ? C.green : current ? C.blue : C.border;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:done?C.green:current?C.blue:C.muted,
              whiteSpace:"nowrap", borderBottom:`2px solid ${color}`, paddingBottom:1 }}>
              {rejected && i===2 ? "Rejected" : s}
            </div>
            {i<steps.length-1 && <div style={{ color:C.border, fontSize:"0.7rem" }}>→</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── DECLARATION MODULE VIEW ──────────────────────────────────────────────────
function DeclarationsModule() {
  const [sub, setSub]         = useState("dashboard");
  const [search, setSearch]   = useState("");
  const [filterType, setFilterType]     = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected]         = useState(null);
  const [data, setData]       = useState(STATIC_DECLARATIONS);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.declarations?.length > 0) setData(d.declarations);
    }).catch(()=>{});
  },[]);

  const approved    = data.filter(d=>d.status==="Approved").length;
  const underReview = data.filter(d=>d.status==="Under Review").length;
  const rejected    = data.filter(d=>d.status==="Rejected").length;
  const highRisk    = data.filter(d=>d.riskLevel==="High").length;
  const pending     = data.filter(d=>d.approvalStatus==="Pending").length;
  const overdue     = data.filter(d=>d.dueDate && new Date(d.dueDate)<new Date() && d.status!=="Approved").length;

  const filtered = data.filter(d=>
    (filterType==="All" || d.type===filterType) &&
    (filterStatus==="All" || d.status===filterStatus) &&
    JSON.stringify(d).toLowerCase().includes(search.toLowerCase())
  );

  // Category breakdown
  const byCategory = DECLARATION_CATEGORIES.map(cat=>({
    cat, count:data.filter(d=>d.type===cat).length
  })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Declaration Dashboard</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Ethics & Conflict of Interest · Q2 2026/27</p>
        </div>
        <a href="https://venerable-tulumba-25bcd5.netlify.app/declare.html" target="_blank" rel="noopener"
          style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", borderRadius:8,
            fontWeight:700, fontSize:"0.85rem", textDecoration:"none", whiteSpace:"nowrap" }}>
          📤 Submit a Declaration
        </a>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Declarations", data.length,    C.blue  ],
          ["Approved",           approved,        C.green ],
          ["Under Review",       underReview,     C.amber ],
          ["Rejected",           rejected,        C.red   ],
          ["High Risk",          highRisk,        C.red   ],
          ["Overdue Actions",    overdue,         overdue>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["dashboard","📊 Overview"],["register","📋 Declaration Register"],["pending","⏳ Pending Review"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSub(id); setSelected(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}{id==="pending"&&pending>0?<span style={{ marginLeft:5, background:C.red, color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:"0.65rem" }}>{pending}</span>:null}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {sub==="dashboard" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          {/* By Category */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Declarations by Category</h3>
            {byCategory.map(({ cat, count })=>(
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.6rem" }}>
                <div style={{ flex:1, color:C.muted, fontSize:"0.8rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cat}</div>
                <div style={{ width:100 }}><ProgressBar value={count} max={data.length} color={C.blue}/></div>
                <div style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem", minWidth:20, textAlign:"right" }}>{count}</div>
              </div>
            ))}
          </Card>

          {/* High Risk declarations */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>🔴 High Risk Declarations</h3>
            {data.filter(d=>d.riskLevel==="High").map(d=>(
              <div key={d.id} onClick={()=>{ setSub("register"); setSelected(d); }}
                style={{ padding:"0.75rem", background:C.surface, borderRadius:8, marginBottom:"0.5rem", cursor:"pointer",
                  border:`1px solid ${d.status==="Rejected"?C.red:d.status==="Approved"?C.green:C.amber}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</div>
                    <div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{d.employee}</div>
                    <div style={{ color:C.muted, fontSize:"0.75rem" }}>{d.type}</div>
                  </div>
                  <WorkflowBadge status={d.status}/>
                </div>
              </div>
            ))}
          </Card>

          {/* Status breakdown */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Status Breakdown</h3>
            {[["Approved",approved,C.green],["Under Review",underReview,C.amber],["Rejected",rejected,C.red]].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }}/>
                <div style={{ flex:1, color:C.muted, fontSize:"0.82rem" }}>{l}</div>
                <div style={{ minWidth:80 }}><ProgressBar value={v} max={data.length} color={c}/></div>
                <div style={{ color:c, fontWeight:800, fontSize:"1rem", minWidth:24, textAlign:"right" }}>{v}</div>
              </div>
            ))}
          </Card>

          {/* Pending actions */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>⏳ Pending Review Actions</h3>
            {data.filter(d=>d.approvalStatus==="Pending").length===0
              ? <p style={{ color:C.green, fontSize:"0.85rem" }}>✅ No declarations pending review.</p>
              : data.filter(d=>d.approvalStatus==="Pending").map(d=>(
                  <div key={d.id} style={{ padding:"0.75rem", background:C.surface, borderRadius:8, marginBottom:"0.5rem", border:`1px solid ${C.amber}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.id} · {d.employee}</div>
                        <div style={{ color:C.muted, fontSize:"0.75rem" }}>{d.type}</div>
                      </div>
                      {d.dueDate && <div style={{ color:new Date(d.dueDate)<new Date()?C.red:C.amber, fontSize:"0.75rem", fontWeight:700 }}>Due: {d.dueDate}</div>}
                    </div>
                  </div>
                ))
            }
          </Card>
        </div>
      )}

      {/* REGISTER */}
      {sub==="register" && (
        <div>
          {/* Detail panel */}
          {selected && (
            <div style={{ background:C.card, border:`1px solid ${C.blue}`, borderRadius:12, padding:"1.5rem", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div>
                  <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                    <span style={{ color:C.blue, fontWeight:800, fontSize:"1rem" }}>{selected.id}</span>
                    <WorkflowBadge status={selected.status}/>
                    <Badge label={selected.riskLevel} color={selected.riskLevel==="High"?"red":selected.riskLevel==="Medium"?"amber":"green"}/>
                  </div>
                  <h3 style={{ color:C.text, margin:"0 0 0.25rem", fontWeight:700 }}>{selected.type}</h3>
                  <p style={{ color:C.muted, margin:0, fontSize:"0.85rem" }}>{selected.employee} · {selected.department}</p>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
              </div>
              <WorkflowPipeline status={selected.status}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginTop:"1rem" }}>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Related Party</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.relatedParty||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Financial Value</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.financialValue?`R${Number(selected.financialValue).toLocaleString()}`:"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Date Submitted</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.dateSubmitted||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Manager Review</div><div style={{ color:selected.managerReview==="Approved"?C.green:selected.managerReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.85rem" }}>{selected.managerReview||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Compliance/Legal Review</div><div style={{ color:selected.complianceReview==="Approved"?C.green:selected.complianceReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.85rem" }}>{selected.complianceReview||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Due Date</div><div style={{ color:selected.dueDate&&new Date(selected.dueDate)<new Date()?C.red:C.text, fontSize:"0.85rem" }}>{selected.dueDate||"—"}</div></div>
              </div>
              <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Description</div>
                <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.6 }}>{selected.description}</div>
              </div>
              <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Mitigation Action</div>
                <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.6, padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${C.green}` }}>{selected.mitigationAction||"—"}</div>
              </div>
              {selected.notes && <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Notes</div>
                <div style={{ color:C.muted, fontSize:"0.82rem" }}>{selected.notes}</div>
              </div>}
            </div>
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1rem", flexWrap:"wrap" }}>
            <input placeholder="Search declarations…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:200 }}/>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={inputSt}>
              <option value="All">All Types</option>
              {DECLARATION_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputSt}>
              {["All","Approved","Under Review","Rejected"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Card>
            <Table
              headers={["ID","Type","Employee","Department","Risk","Status","Workflow","Date"]}
              rows={filtered.map(d=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(d)}>{d.id}</span>,
                <span style={{ fontSize:"0.78rem", color:C.muted }}>{d.type}</span>,
                <span style={{ fontWeight:600 }}>{d.employee}</span>,
                d.department,
                <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
                <WorkflowBadge status={d.status}/>,
                <WorkflowPipeline status={d.status}/>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.dateSubmitted}</span>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* PENDING REVIEW */}
      {sub==="pending" && (
        <div>
          {data.filter(d=>d.approvalStatus==="Pending").length===0 ? (
            <Card><p style={{ color:C.green, textAlign:"center", padding:"2rem", fontWeight:700 }}>✅ No declarations pending review.</p></Card>
          ) : (
            <Card>
              <Table
                headers={["ID","Type","Employee","Department","Risk","Submitted","Due Date","Action Required"]}
                rows={data.filter(d=>d.approvalStatus==="Pending").map(d=>{
                  const isOverdue = d.dueDate && new Date(d.dueDate)<new Date();
                  return [
                    <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
                    <span style={{ fontSize:"0.78rem" }}>{d.type}</span>,
                    <span style={{ fontWeight:600 }}>{d.employee}</span>,
                    d.department,
                    <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
                    d.dateSubmitted,
                    <span style={{ color:isOverdue?C.red:C.amber, fontWeight:700 }}>{d.dueDate||"ASAP"}{isOverdue?" ⚠":""}</span>,
                    <span style={{ color:C.muted, fontSize:"0.75rem", maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.mitigationAction}>{d.mitigationAction||"Review required"}</span>,
                  ];
                })}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DECLARATIONS ADMIN ───────────────────────────────────────────────────────
function DeclarationsAdmin() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch]   = useState("");

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems(data.declarations?.length > 0 ? data.declarations : STATIC_DECLARATIONS);
    } catch { setItems(STATIC_DECLARATIONS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    data.declarations = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.declarations = STATIC_DECLARATIONS;
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_DECLARATIONS.length} declarations to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    if (!f.id || !f.employee) { showToast("ID and Employee are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const before = isEdit ? items.find(i=>i.id===f.id) : null;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      await logAudit({ module:"Declarations", action:isEdit?"Edit":"Add", recordId:f.id,
        description:`${isEdit?"Updated":"Added"} declaration for ${f.employee} (${f.type})`,
        before, after:f });
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const before = items.find(i=>i.id===id);
      await saveToServer(items.filter(i=>i.id!==id));
      await logAudit({ module:"Declarations", action:"Delete", recordId:id,
        description:`Deleted declaration ${id}`, before });
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, newStatus) {
    setSaving(true);
    try {
      const approvalStatus = newStatus==="Approved"||newStatus==="Rejected" ? newStatus : "Pending";
      const updated = items.map(i => i.id===id ? { ...i, status:newStatus, approvalStatus, managerReview:newStatus==="Approved"||newStatus==="Rejected"?newStatus:"Pending", complianceReview:newStatus==="Approved"||newStatus==="Rejected"?newStatus:"Pending", updatedAt:new Date().toISOString() } : i);
      await saveToServer(updated);
      showToast(`✅ ${id} status updated to ${newStatus}.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function DeclarationForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", type:"Conflict of Interest", employee:"", department:"", description:"", relatedParty:"", financialValue:"", dateSubmitted:"", periodCovered:"2026/27", status:"Submitted", riskLevel:"Medium", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"", dueDate:"", supportingDocs:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Declaration":"Log New Declaration"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="Declaration ID" value={f.id} onChange={set("id")} required placeholder="DEC-011"/>
          <FSelect label="Declaration Type" value={f.type} onChange={set("type")} options={DECLARATION_CATEGORIES}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Employee / Official" value={f.employee} onChange={set("employee")} required placeholder="e.g. T. Mokoena"/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ETQA"/>
          <FInput label="Period Covered" value={f.periodCovered} onChange={set("periodCovered")} placeholder="e.g. 2026/27"/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the declaration in detail…"/>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"1rem" }}>
          <FInput label="Related Party" value={f.relatedParty} onChange={set("relatedParty")} placeholder="Name of related entity or person"/>
          <FInput label="Financial Value (R)" value={f.financialValue} onChange={set("financialValue")} type="number" placeholder="0"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Date Submitted" value={f.dateSubmitted} onChange={set("dateSubmitted")} type="date"/>
          <FSelect label="Risk Level" value={f.riskLevel} onChange={set("riskLevel")} options={["High","Medium","Low"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Submitted","Under Review","Approved","Rejected"]}/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Manager Review" value={f.managerReview} onChange={set("managerReview")} options={["Pending","Approved","Rejected"]}/>
          <FSelect label="Compliance/Legal Review" value={f.complianceReview} onChange={set("complianceReview")} options={["Pending","Approved","Rejected"]}/>
          <FSelect label="Approval Status" value={f.approvalStatus} onChange={set("approvalStatus")} options={["Pending","Approved","Rejected"]}/>
        </div>
        <FTextarea label="Mitigation Action" value={f.mitigationAction} onChange={set("mitigationAction")} rows={2} placeholder="Describe the mitigation or recusal action taken…"/>
        <FInput label="Supporting Documents" value={f.supportingDocs} onChange={set("supportingDocs")} placeholder="e.g. Signed declaration form, CIPC cert"/>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Log Declaration"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const filtered = items.filter(i=>JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(163,113,247,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.purple:C.red}`, color:toast.type==="ok"?C.purple:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Declaration</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Declaration Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} declarations · {items.filter(i=>i.approvalStatus==="Pending").length} pending review</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...inputSt, width:180 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Log Declaration</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <DeclarationForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <DeclarationForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Type","Employee","Dept","Risk","Status","Manager","Compliance/Legal","Actions"]}
            rows={filtered.map(d=>[
              <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
              <span style={{ fontSize:"0.75rem", color:C.muted, maxWidth:120, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.type}>{d.type}</span>,
              <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{d.employee}</span>,
              <span style={{ fontSize:"0.78rem" }}>{d.department}</span>,
              <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
              <WorkflowBadge status={d.status}/>,
              <span style={{ color:d.managerReview==="Approved"?C.green:d.managerReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.managerReview}</span>,
              <span style={{ color:d.complianceReview==="Approved"?C.green:d.complianceReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.complianceReview}</span>,
              <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                {d.status==="Under Review" && (
                  <>
                    <button onClick={()=>updateStatus(d.id,"Approved")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.green, color:"#fff", border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>✓</button>
                    <button onClick={()=>updateStatus(d.id,"Rejected")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.red, color:"#fff", border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>✗</button>
                  </>
                )}
                {d.status==="Submitted" && (
                  <button onClick={()=>updateStatus(d.id,"Under Review")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.amber, color:C.bg, border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Review</button>
                )}
                <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.25rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(d.id)} disabled={!!mode} style={{ padding:"0.25rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}


// ─── IAM DATA ─────────────────────────────────────────────────────────────────
const STATIC_IAM = {
  users: [
    { id:"USR-001", name:"N. Khumalo", department:"Research / ICT", jobTitle:"ICT Manager", systems:["SAP HR","Financial System","Azure Portal","LMS","AGSA Portal"], accessLevel:"Admin", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2023-01-15", riskRating:"High", notes:"CIO delegate — full system access required" },
    { id:"USR-002", name:"T. Mokoena", department:"ETQA", jobTitle:"Senior Manager: ETQA", systems:["LMS","SAQA Interface","Grants System"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2022-06-01", riskRating:"Medium", notes:"" },
    { id:"USR-003", name:"G. Mahlangu", department:"Grants", jobTitle:"Grants Manager", systems:["Grants System","Financial System","Banking Portal"], accessLevel:"Elevated", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2021-03-10", riskRating:"High", notes:"Dual authorisation required for payments above R500k" },
    { id:"USR-004", name:"P. van der Merwe", department:"Facilities", jobTitle:"Facilities Manager", systems:["Facilities System","Email"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:false, accountCreated:"2020-08-20", riskRating:"Low", notes:"MFA not yet enrolled — action required" },
    { id:"USR-005", name:"T. Mahlangu", department:"SCM", jobTitle:"SCM Manager", systems:["SCM System","Supplier Portal","Financial System"], accessLevel:"Elevated", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2019-11-05", riskRating:"High", notes:"Segregation of duties review pending" },
    { id:"USR-006", name:"S. Nkosi", department:"HR", jobTitle:"HR Manager", systems:["SAP HR","Payroll System","Recruitment Portal"], accessLevel:"Elevated", status:"Active", lastReview:"2026-01-31", nextReview:"2026-07-31", mfaEnabled:true, accountCreated:"2021-07-15", riskRating:"Medium", notes:"" },
    { id:"USR-007", name:"L. Dlamini", department:"Learning Programmes", jobTitle:"Manager: Learning Programmes", systems:["LMS","Grants System","Email"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2022-02-28", riskRating:"Low", notes:"" },
    { id:"USR-008", name:"Former Employee", department:"Finance", jobTitle:"Finance Officer", systems:["Financial System","SAP HR"], accessLevel:"Standard", status:"Suspended", lastReview:"2026-05-01", nextReview:"2026-06-01", mfaEnabled:false, accountCreated:"2020-01-10", riskRating:"Critical", notes:"URGENT: Account not fully revoked — termination date 2026-04-30" },
    { id:"USR-009", name:"M. Sithole", department:"Finance", jobTitle:"Senior Finance Officer", systems:["Financial System","Banking Portal","SAP HR"], accessLevel:"Elevated", status:"Active", lastReview:"2026-01-31", nextReview:"2026-07-31", mfaEnabled:true, accountCreated:"2023-04-01", riskRating:"High", notes:"Overdue for access review" },
    { id:"USR-010", name:"Service Account: LMS-SYNC", department:"ICT", jobTitle:"System Service Account", systems:["LMS","SAQA Interface"], accessLevel:"Service", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:false, accountCreated:"2022-01-01", riskRating:"Medium", notes:"Non-human account — password rotation overdue" },
  ],
  privileged: [
    { id:"PAM-001", account:"sa_lgseta_admin", type:"Local Admin", system:"Windows Servers", owner:"N. Khumalo", department:"ICT", justification:"Server administration and patch management", lastPasswordChange:"2026-02-15", passwordExpiry:"2026-08-15", lastUsed:"2026-06-10", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"Password vault managed" },
    { id:"PAM-002", account:"azure_global_admin", type:"Cloud Admin", system:"Azure Portal", owner:"N. Khumalo", department:"ICT", justification:"Cloud infrastructure management", lastPasswordChange:"2026-01-10", passwordExpiry:"2026-07-10", lastUsed:"2026-06-12", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"MFA enforced; conditional access policy active" },
    { id:"PAM-003", account:"sap_basis_admin", type:"Application Admin", system:"SAP HR", owner:"N. Khumalo", department:"ICT", justification:"SAP basis administration and user management", lastPasswordChange:"2026-03-01", passwordExpiry:"2026-09-01", lastUsed:"2026-05-28", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"Shared account — individual accountability risk" },
    { id:"PAM-004", account:"fin_sys_super", type:"Application Admin", system:"Financial System", owner:"T. Mokoena", department:"Finance", justification:"Financial system configuration and year-end processing", lastPasswordChange:"2025-12-01", passwordExpiry:"2026-06-01", lastUsed:"2026-04-15", sessionRecorded:false, checkedOut:false, status:"Expired", riskRating:"Critical", notes:"PASSWORD EXPIRED — immediate rotation required" },
    { id:"PAM-005", account:"lms_admin", type:"Application Admin", system:"LMS Platform", owner:"T. Mokoena", department:"ETQA", justification:"LMS configuration, user management and reporting", lastPasswordChange:"2026-04-01", passwordExpiry:"2026-10-01", lastUsed:"2026-06-01", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"High", notes:"" },
    { id:"PAM-006", account:"network_admin", type:"Network Admin", system:"LAN/WAN Infrastructure", owner:"N. Khumalo", department:"ICT", justification:"Network configuration and monitoring", lastPasswordChange:"2026-03-15", passwordExpiry:"2026-09-15", lastUsed:"2026-06-08", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"" },
  ],
  reviews: [
    { id:"REV-001", reviewer:"CIO", reviewCycle:"Semi-Annual", system:"All Systems", scope:"Full user access review", startDate:"2026-04-01", dueDate:"2026-04-30", status:"Overdue", usersReviewed:47, usersTotal:68, actionsRaised:8, actionsResolved:3, findings:"5 accounts with excessive access; 2 terminated user accounts active", certifiedBy:"", certifiedDate:"", notes:"Extended deadline — CFO accounts still pending" },
    { id:"REV-002", reviewer:"Finance Manager", reviewCycle:"Quarterly", system:"Financial System", scope:"Financial system access certification", startDate:"2026-04-01", dueDate:"2026-04-15", status:"Complete", usersReviewed:12, usersTotal:12, actionsRaised:2, actionsResolved:2, findings:"1 access level downgrade; 1 user removed", certifiedBy:"CFO", certifiedDate:"2026-04-14", notes:"Clean certification — no critical findings" },
    { id:"REV-003", reviewer:"HR Executive", reviewCycle:"Semi-Annual", system:"SAP HR / Payroll", scope:"HR and payroll system access review", startDate:"2026-05-01", dueDate:"2026-05-31", status:"In Progress", usersReviewed:8, usersTotal:15, actionsRaised:1, actionsResolved:0, findings:"1 terminated employee account still active", certifiedBy:"", certifiedDate:"", notes:"Urgent: USR-008 account must be revoked immediately" },
    { id:"REV-004", reviewer:"SCM Manager", reviewCycle:"Quarterly", system:"SCM / Supplier Portal", scope:"Procurement system access review", startDate:"2026-06-01", dueDate:"2026-06-30", status:"In Progress", usersReviewed:4, usersTotal:8, actionsRaised:3, actionsResolved:1, findings:"Segregation of duties violations in SCM approval workflow", certifiedBy:"", certifiedDate:"", notes:"CFO to review and certify" },
    { id:"REV-005", reviewer:"CIO", reviewCycle:"Annual", system:"Azure / Cloud", scope:"Privileged cloud access review", startDate:"2026-03-01", dueDate:"2026-03-31", status:"Overdue", usersReviewed:3, usersTotal:6, actionsRaised:4, actionsResolved:2, findings:"2 orphaned service accounts; 1 expired PAM credential", certifiedBy:"", certifiedDate:"", notes:"PAM-004 critical finding unresolved" },
  ],
};

// ─── IAM MODULE VIEW ──────────────────────────────────────────────────────────
function IAMModule() {
  const [sub, setSub]       = useState("dashboard");
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(STATIC_IAM);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.iam) setData({ ...STATIC_IAM, ...d.iam });
    }).catch(()=>{});
  },[]);

  const users     = data.users     || [];
  const privileged = data.privileged || [];
  const reviews   = data.reviews   || [];

  const activeUsers    = users.filter(u=>u.status==="Active").length;
  const suspendedUsers = users.filter(u=>u.status==="Suspended").length;
  const criticalUsers  = users.filter(u=>u.riskRating==="Critical"||u.riskRating==="High").length;
  const noMFA          = users.filter(u=>!u.mfaEnabled&&u.status==="Active").length;
  const expiredPAM     = privileged.filter(p=>p.status==="Expired").length;
  const overdueReviews = reviews.filter(r=>r.status==="Overdue").length;

  const sc = s => {
    const v=(s||"").toLowerCase();
    if (v==="active"||v==="complete") return C.green;
    if (v==="suspended"||v==="expired"||v==="overdue"||v==="critical") return C.red;
    if (v==="in progress"||v==="elevated") return C.amber;
    return C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Identity & Access Management</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>User Access · Privileged Accounts · Access Reviews — Q2 2026/27</p>
        </div>
        <input placeholder="Search IAM…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Users",       users.length,    C.blue  ],
          ["Active",            activeUsers,      C.green ],
          ["Suspended/Inactive",suspendedUsers,   suspendedUsers>0?C.red:C.green ],
          ["No MFA (Active)",   noMFA,            noMFA>0?C.red:C.green ],
          ["PAM Expired",       expiredPAM,       expiredPAM>0?C.red:C.green ],
          ["Overdue Reviews",   overdueReviews,   overdueReviews>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alert banners for critical items */}
      {(suspendedUsers>0||expiredPAM>0||noMFA>0) && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {users.filter(u=>u.status==="Suspended"&&u.riskRating==="Critical").map(u=>(
            <div key={u.id} style={{ background:"rgba(248,81,73,0.1)", border:`1px solid ${C.red}`, borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.82rem", color:C.red, fontWeight:600 }}>
              🚨 <strong>{u.id} — {u.name}</strong>: {u.notes}
            </div>
          ))}
          {privileged.filter(p=>p.status==="Expired").map(p=>(
            <div key={p.id} style={{ background:"rgba(248,81,73,0.1)", border:`1px solid ${C.red}`, borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.82rem", color:C.red, fontWeight:600 }}>
              🔐 <strong>{p.id} — {p.account}</strong>: {p.notes}
            </div>
          ))}
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[
          ["users","👤 User Access Register"],
          ["privileged","🔐 Privileged Access (PAM)"],
          ["reviews","📋 Access Reviews"],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* USER ACCESS REGISTER */}
      {sub==="users" && (
        <Card>
          <Table
            headers={["ID","Name","Department","Systems","Access Level","MFA","Risk","Status","Next Review"]}
            rows={filtered(users).map(u=>[
              <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
              <div><div style={{ fontWeight:600, fontSize:"0.82rem" }}>{u.name}</div><div style={{ color:C.muted, fontSize:"0.7rem" }}>{u.jobTitle}</div></div>,
              u.department,
              <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                {(u.systems||[]).slice(0,3).map(s=>(
                  <span key={s} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:3, padding:"1px 5px", fontSize:"0.65rem", color:C.muted }}>{s}</span>
                ))}
                {u.systems?.length>3 && <span style={{ fontSize:"0.65rem", color:C.muted }}>+{u.systems.length-3}</span>}
              </div>,
              <Badge label={u.accessLevel} color={u.accessLevel==="Admin"||u.accessLevel==="Service"?"red":u.accessLevel==="Elevated"?"amber":"green"}/>,
              <span style={{ color:u.mfaEnabled?C.green:C.red, fontWeight:700, fontSize:"0.8rem" }}>{u.mfaEnabled?"✓ On":"✗ Off"}</span>,
              <Badge label={u.riskRating} color={u.riskRating==="Critical"||u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(u.status), fontWeight:700, fontSize:"0.8rem" }}>{u.status}</span>,
              <span style={{ color:new Date(u.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem" }}>{u.nextReview}</span>,
            ])}
          />
        </Card>
      )}

      {/* PRIVILEGED ACCESS */}
      {sub==="privileged" && (
        <Card>
          <Table
            headers={["ID","Account","Type","System","Owner","Last Used","Expiry","Recorded","Status"]}
            rows={filtered(privileged).map(p=>[
              <span style={{ color:C.red, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
              <span style={{ fontFamily:"monospace", fontSize:"0.78rem", color:C.amber }}>{p.account}</span>,
              <Badge label={p.type} color="blue"/>,
              p.system,
              p.owner,
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{p.lastUsed}</span>,
              <span style={{ color:new Date(p.passwordExpiry)<new Date()?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.passwordExpiry}</span>,
              <span style={{ color:p.sessionRecorded?C.green:C.red, fontWeight:700, fontSize:"0.78rem" }}>{p.sessionRecorded?"✓":"✗"}</span>,
              <span style={{ color:sc(p.status), fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
            ])}
          />
        </Card>
      )}

      {/* ACCESS REVIEWS */}
      {sub==="reviews" && (
        <Card>
          <Table
            headers={["ID","System","Reviewer","Cycle","Due Date","Progress","Actions","Status","Certified By"]}
            rows={filtered(reviews).map(r=>{
              const pct = Math.round((r.usersReviewed/Math.max(r.usersTotal,1))*100);
              const isOverdue = r.status==="Overdue"||new Date(r.dueDate)<new Date();
              return [
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{r.id}</span>,
                <div><div style={{ fontWeight:600, fontSize:"0.82rem" }}>{r.system}</div><div style={{ color:C.muted, fontSize:"0.7rem" }}>{r.scope}</div></div>,
                r.reviewer,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{r.reviewCycle}</span>,
                <span style={{ color:isOverdue?C.red:C.text, fontWeight:isOverdue?700:400, fontSize:"0.78rem" }}>{r.dueDate}{isOverdue&&r.status!=="Complete"?" ⚠":""}</span>,
                <div style={{ minWidth:100 }}>
                  <div style={{ fontSize:"0.7rem", color:C.muted, marginBottom:2 }}>{r.usersReviewed}/{r.usersTotal} users</div>
                  <ProgressBar value={pct} color={pct===100?C.green:pct>50?C.amber:C.red}/>
                </div>,
                <span style={{ color:r.actionsRaised>r.actionsResolved?C.red:C.green, fontWeight:700, fontSize:"0.78rem" }}>{r.actionsResolved}/{r.actionsRaised} resolved</span>,
                <span style={{ color:sc(r.status), fontWeight:700, fontSize:"0.8rem" }}>{r.status}</span>,
                <span style={{ color:r.certifiedBy?C.green:C.muted, fontSize:"0.75rem" }}>{r.certifiedBy||"Pending"}</span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── IAM ADMIN ────────────────────────────────────────────────────────────────
function IAMAdmin() {
  const [view, setView]       = useState("users");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { users:STATIC_IAM.users, privileged:STATIC_IAM.privileged, reviews:STATIC_IAM.reviews };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.iam?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.iam) data.iam = {};
    data.iam[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.iam = { users:STATIC_IAM.users, privileged:STATIC_IAM.privileged, reviews:STATIC_IAM.reviews };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_IAM.users.length} users, ${STATIC_IAM.privileged.length} PAM accounts, ${STATIC_IAM.reviews.length} reviews.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i=>i.id!==id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function UserForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", name:"", department:"", jobTitle:"", systems:"", accessLevel:"Standard", status:"Active", lastReview:"", nextReview:"", mfaEnabled:false, accountCreated:"", riskRating:"Medium", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, systems:Array.isArray(initial.systems)?initial.systems.join(", "):initial.systems||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit User":"Add User"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="User ID" value={f.id} onChange={set("id")} required placeholder="USR-011"/>
          <FInput label="Full Name" value={f.name} onChange={set("name")} required placeholder="e.g. J. Smith"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. Finance"/>
          <FInput label="Job Title" value={f.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Finance Officer"/>
        </div>
        <FInput label="Systems Access (comma-separated)" value={f.systems} onChange={set("systems")} placeholder="e.g. Financial System, SAP HR, Email"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Access Level" value={f.accessLevel} onChange={set("accessLevel")} options={["Standard","Elevated","Admin","Service","Read-Only"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Suspended","Inactive","Locked"]}/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["Critical","High","Medium","Low"]}/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>MFA Enabled</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="mfa" value={opt} checked={(f.mfaEnabled?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, mfaEnabled:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Account Created" value={f.accountCreated} onChange={set("accountCreated")} type="date"/>
          <FInput label="Last Review" value={f.lastReview} onChange={set("lastReview")} type="date"/>
          <FInput label="Next Review" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Access justification or risk notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, systems:f.systems.split(",").map(s=>s.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add User"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function PAMForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", account:"", type:"Local Admin", system:"", owner:"", department:"", justification:"", lastPasswordChange:"", passwordExpiry:"", lastUsed:"", sessionRecorded:false, checkedOut:false, status:"Active", riskRating:"Critical", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.red}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.red, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit PAM Account":"Add Privileged Account"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="PAM ID" value={f.id} onChange={set("id")} required placeholder="PAM-007"/>
          <FInput label="Account Name" value={f.account} onChange={set("account")} required placeholder="e.g. sa_backup_admin"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Account Type" value={f.type} onChange={set("type")} options={["Local Admin","Domain Admin","Cloud Admin","Application Admin","Network Admin","Database Admin","Service Account"]}/>
          <FInput label="System" value={f.system} onChange={set("system")} placeholder="e.g. Windows Servers"/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["Critical","High","Medium"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Account Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. N. Khumalo"/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ICT"/>
        </div>
        <FTextarea label="Business Justification" value={f.justification} onChange={set("justification")} rows={2} placeholder="Why is this privileged account required?"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Last Password Change" value={f.lastPasswordChange} onChange={set("lastPasswordChange")} type="date"/>
          <FInput label="Password Expiry" value={f.passwordExpiry} onChange={set("passwordExpiry")} type="date"/>
          <FInput label="Last Used" value={f.lastUsed} onChange={set("lastUsed")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Expired","Suspended","Decommissioned"]}/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Session Recorded</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="rec" value={opt} checked={(f.sessionRecorded?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, sessionRecorded:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <FTextarea label="Notes / Risk Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Security notes or action required…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add PAM Account"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ReviewForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", reviewer:"", reviewCycle:"Quarterly", system:"", scope:"", startDate:"", dueDate:"", status:"In Progress", usersReviewed:"0", usersTotal:"0", actionsRaised:"0", actionsResolved:"0", findings:"", certifiedBy:"", certifiedDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Review":"Add Access Review"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="Review ID" value={f.id} onChange={set("id")} required placeholder="REV-006"/>
          <FInput label="System / Scope" value={f.system} onChange={set("system")} required placeholder="e.g. Financial System"/>
        </div>
        <FInput label="Review Scope Description" value={f.scope} onChange={set("scope")} placeholder="e.g. Full user access certification"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Reviewer" value={f.reviewer} onChange={set("reviewer")} placeholder="e.g. CIO"/>
          <FSelect label="Review Cycle" value={f.reviewCycle} onChange={set("reviewCycle")} options={["Monthly","Quarterly","Semi-Annual","Annual","Ad Hoc"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Not Started","In Progress","Overdue","Complete"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Users Reviewed" value={f.usersReviewed} onChange={set("usersReviewed")} type="number" placeholder="0"/>
          <FInput label="Total Users" value={f.usersTotal} onChange={set("usersTotal")} type="number" placeholder="0"/>
          <FInput label="Actions Raised" value={f.actionsRaised} onChange={set("actionsRaised")} type="number" placeholder="0"/>
          <FInput label="Actions Resolved" value={f.actionsResolved} onChange={set("actionsResolved")} type="number" placeholder="0"/>
        </div>
        <FTextarea label="Findings" value={f.findings} onChange={set("findings")} rows={2} placeholder="Key findings from the review…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Certified By" value={f.certifiedBy} onChange={set("certifiedBy")} placeholder="e.g. CFO"/>
          <FInput label="Certification Date" value={f.certifiedDate} onChange={set("certifiedDate")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Review"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="users" ? UserForm : view==="privileged" ? PAMForm : ReviewForm;
  const addColor = view==="users" ? C.blue : view==="privileged" ? C.red : C.green;
  const addLabel = view==="users" ? "Add User" : view==="privileged" ? "Add PAM Account" : "Add Review";

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["users","👤 Users"],["privileged","🔐 PAM"],["reviews","📋 Reviews"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="users"?"User Access Register":view==="privileged"?"Privileged Access (PAM)":"Access Reviews"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.red||addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ {addLabel}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="users" && (
            <Table
              headers={["ID","Name","Department","Access Level","MFA","Risk","Status","Actions"]}
              rows={items.map(u=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{u.name}</span>,
                u.department,
                <Badge label={u.accessLevel} color={u.accessLevel==="Admin"||u.accessLevel==="Service"?"red":u.accessLevel==="Elevated"?"amber":"green"}/>,
                <span style={{ color:u.mfaEnabled?C.green:C.red, fontWeight:700 }}>{u.mfaEnabled?"✓":"✗"}</span>,
                <Badge label={u.riskRating} color={u.riskRating==="Critical"||u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.8rem" }}>{u.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...u })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(u.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="privileged" && (
            <Table
              headers={["ID","Account","Type","System","Owner","Expiry","Recorded","Status","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.red, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontFamily:"monospace", fontSize:"0.78rem", color:C.amber }}>{p.account}</span>,
                <Badge label={p.type} color="blue"/>,
                p.system,
                p.owner,
                <span style={{ color:new Date(p.passwordExpiry)<new Date()?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.passwordExpiry}</span>,
                <span style={{ color:p.sessionRecorded?C.green:C.red, fontWeight:700 }}>{p.sessionRecorded?"✓":"✗"}</span>,
                <span style={{ color:p.status==="Active"?C.green:C.red, fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="reviews" && (
            <Table
              headers={["ID","System","Reviewer","Cycle","Due Date","Progress","Status","Certified","Actions"]}
              rows={items.map(r=>{
                const pct = Math.round((Number(r.usersReviewed)/Math.max(Number(r.usersTotal),1))*100);
                return [
                  <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{r.id}</span>,
                  r.system,
                  r.reviewer,
                  r.reviewCycle,
                  <span style={{ color:r.status==="Overdue"?C.red:C.muted, fontSize:"0.78rem" }}>{r.dueDate}</span>,
                  <div style={{ minWidth:80 }}><ProgressBar value={pct} color={pct===100?C.green:pct>50?C.amber:C.red}/></div>,
                  <span style={{ color:r.status==="Complete"?C.green:r.status==="Overdue"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{r.status}</span>,
                  <span style={{ color:r.certifiedBy?C.green:C.muted, fontSize:"0.75rem" }}>{r.certifiedBy||"Pending"}</span>,
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={()=>setMode({ ...r })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                    <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                  </div>,
                ];
              })}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── POLICY & PROCESS DATA ────────────────────────────────────────────────────
const STATIC_POLICY = {
  policies: [
    { id:"POL-001", title:"Risk Management Policy", complianceRef:["CU-001","CU-005"], category:"Governance", owner:"CRO", version:"v3.2", status:"Published", lifecycle:"Published", createdDate:"2024-03-01", reviewDate:"2026-03-01", nextReview:"2027-03-01", approvedBy:"Board", approvalDate:"2024-03-15", description:"Establishes LGSETA's enterprise risk management framework, appetite and tolerance levels.", linkedLegislation:"PFMA / King IV", tags:["Risk","ERM","Governance"], notes:"Next review aligned to Board cycle" },
    { id:"POL-002", title:"Fraud Prevention Policy", complianceRef:["CU-010","CU-011"], category:"Ethics & Integrity", owner:"Legal", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2023-06-01", reviewDate:"2025-06-01", nextReview:"2026-06-01", approvedBy:"Audit & Risk Committee", approvalDate:"2023-06-20", description:"Defines LGSETA's zero-tolerance approach to fraud, corruption and unethical conduct.", linkedLegislation:"PRECCA / PFMA", tags:["Fraud","Ethics","PRECCA"], notes:"Overdue for review — update required" },
    { id:"POL-003", title:"Information Security Policy", complianceRef:["CU-004","CU-011"], category:"ICT & Security", owner:"CIO", version:"v1.5", status:"Under Review", lifecycle:"Review", createdDate:"2022-01-15", reviewDate:"2025-01-15", nextReview:"2026-01-15", approvedBy:"", approvalDate:"", description:"Governs the protection of LGSETA information assets, cybersecurity controls and data classification.", linkedLegislation:"POPIA / King IV", tags:["ICT","Security","POPIA"], notes:"Being updated to align with POPIA compliance audit findings" },
    { id:"POL-004", title:"Supply Chain Management Policy", complianceRef:["CU-001","CU-006"], category:"Financial Management", owner:"CFO", version:"v4.0", status:"Published", lifecycle:"Published", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", approvedBy:"Accounting Authority", approvalDate:"2023-09-15", description:"Governs procurement, tender processes and SCM compliance with PFMA prescripts.", linkedLegislation:"PFMA / PPPFA / Treasury Regulations", tags:["SCM","Procurement","PFMA"], notes:"" },
    { id:"POL-005", title:"Human Resources Policy", complianceRef:["CU-007","CU-008"], category:"Human Resources", owner:"HR Executive", version:"v2.3", status:"Published", lifecycle:"Published", createdDate:"2023-01-10", reviewDate:"2025-01-10", nextReview:"2026-01-10", approvedBy:"CEO", approvalDate:"2023-01-25", description:"Covers recruitment, performance management, leave, discipline and grievance procedures.", linkedLegislation:"LRA / BCEA / Employment Equity Act", tags:["HR","Employees","LRA"], notes:"" },
    { id:"POL-006", title:"POPIA Compliance Policy", complianceRef:["CU-004","CU-011"], category:"Data Protection", owner:"CIO", version:"v1.0", status:"Draft", lifecycle:"Draft", createdDate:"2026-05-01", reviewDate:"", nextReview:"2026-09-30", approvedBy:"", approvalDate:"", description:"Defines LGSETA's obligations and controls under the Protection of Personal Information Act.", linkedLegislation:"POPIA Act 4 of 2013", tags:["POPIA","Data","Privacy"], notes:"First draft — awaiting CIO review" },
    { id:"POL-007", title:"Business Continuity Management Policy", complianceRef:["CU-001","CU-006"], category:"BCM", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2024-03-15", reviewDate:"2026-03-15", nextReview:"2027-03-15", approvedBy:"Business Continuity Committee", approvalDate:"2024-03-20", description:"Establishes LGSETA's BCM framework, governance and minimum business continuity requirements.", linkedLegislation:"PFMA / DPSA BCM Framework / ISO 22301", tags:["BCM","Continuity","Resilience"], notes:"" },
    { id:"POL-008", title:"Declaration of Interest Policy", complianceRef:["CU-010","CU-005"], category:"Ethics & Integrity", owner:"Legal", version:"v1.2", status:"Published", lifecycle:"Published", createdDate:"2023-11-01", reviewDate:"2025-11-01", nextReview:"2026-11-01", approvedBy:"CEO", approvalDate:"2023-11-15", description:"Requires all officials to disclose conflicts of interest, gifts, outside positions and related party relationships.", linkedLegislation:"PRECCA / PFMA / King IV", tags:["Ethics","Declaration","COI"], notes:"" },
  ],
  processes: [
    { id:"PRC-001", title:"Grant Disbursement Process", category:"Grants Management", owner:"COO", version:"v3.0", status:"Published", lifecycle:"Published", processType:"Core Business", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", approvedBy:"COO", approvalDate:"2023-04-10", steps:8, hasFlowchart:true, hasSchema:true, relatedForms:["Grant Application Form","Provider Agreement","Disbursement Approval"], linkedPolicy:"POL-004", description:"End-to-end process for evaluating, approving and disbursing discretionary grants to training providers.", notes:"" },
    { id:"PRC-002", title:"Procurement & Tender Process", category:"Supply Chain", owner:"CFO", version:"v4.1", status:"Published", lifecycle:"Published", processType:"Compliance", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", approvedBy:"CFO", approvalDate:"2023-09-15", steps:12, hasFlowchart:true, hasSchema:true, relatedForms:["RFQ Form","Bid Evaluation Form","Award Recommendation"], linkedPolicy:"POL-004", description:"Full procurement lifecycle from needs identification through to contract award and management.", notes:"" },
    { id:"PRC-003", title:"Learner Registration & Certification", category:"ETQA", owner:"ETQA Manager", version:"v2.2", status:"Published", lifecycle:"Published", processType:"Core Business", createdDate:"2022-06-15", reviewDate:"2024-06-15", nextReview:"2026-06-15", approvedBy:"COO", approvalDate:"2022-06-20", steps:6, hasFlowchart:true, hasSchema:false, relatedForms:["Learner Registration Form","Assessment Record","Certificate Request"], linkedPolicy:"", description:"Process for registering learners, conducting assessments and issuing certificates via SAQA.", notes:"Overdue for review" },
    { id:"PRC-004", title:"Incident & Fraud Reporting Process", category:"Risk & Compliance", owner:"CRO", version:"v1.3", status:"Published", lifecycle:"Published", processType:"Compliance", createdDate:"2024-01-10", reviewDate:"2026-01-10", nextReview:"2027-01-10", approvedBy:"CEO", approvalDate:"2024-01-20", steps:7, hasFlowchart:true, hasSchema:false, relatedForms:["Incident Report Form","Fraud Hotline Form","Investigation Log"], linkedPolicy:"POL-002", description:"Process for reporting, investigating and resolving fraud, ethics violations and operational incidents.", notes:"" },
    { id:"PRC-005", title:"Annual Performance Plan (APP) Monitoring", category:"Strategy & Performance", owner:"CEO", version:"v2.0", status:"Published", lifecycle:"Published", processType:"Governance", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", approvedBy:"Board", approvalDate:"2023-04-15", steps:5, hasFlowchart:false, hasSchema:true, relatedForms:["Quarterly Report Template","Evidence Register","Deviation Report"], linkedPolicy:"", description:"Process for monitoring, reporting and escalating APP target performance on a quarterly basis.", notes:"" },
    { id:"PRC-006", title:"User Access Provisioning & Deprovisioning", category:"ICT & Security", owner:"CIO", version:"v1.1", status:"Under Review", lifecycle:"Review", processType:"Compliance", createdDate:"2023-08-01", reviewDate:"2025-08-01", nextReview:"2026-08-01", approvedBy:"", approvalDate:"", steps:8, hasFlowchart:true, hasSchema:true, relatedForms:["Access Request Form","Access Termination Form","PAM Checklist"], linkedPolicy:"POL-003", description:"Process for provisioning, modifying and revoking user access across all LGSETA systems.", notes:"Being updated following IAM review findings" },
  ],
  documents: [
    { id:"DOC-001", title:"Grant Application Form", category:"Forms", docType:"Form", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", format:"PDF / Word", linkedProcess:"PRC-001", description:"Standard application form for training providers applying for discretionary grants.", notes:"" },
    { id:"DOC-002", title:"Risk Register Schema", category:"Templates", docType:"Schema", owner:"CRO", version:"v3.0", status:"Published", lifecycle:"Published", createdDate:"2024-01-15", reviewDate:"2026-01-15", nextReview:"2027-01-15", format:"Excel", linkedProcess:"", description:"Standardised data schema for capturing and classifying risks across all LGSETA departments.", notes:"Aligned to ERM framework v3.2" },
    { id:"DOC-003", title:"Bid Evaluation Committee Template", category:"Templates", docType:"Template", owner:"CFO", version:"v1.5", status:"Published", lifecycle:"Published", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", format:"Word", linkedProcess:"PRC-002", description:"Standardised BEC scoring template ensuring consistency in tender evaluation.", notes:"" },
    { id:"DOC-004", title:"POPIA Privacy Notice Template", category:"Templates", docType:"Template", owner:"CIO", version:"v1.0", status:"Draft", lifecycle:"Draft", createdDate:"2026-05-15", reviewDate:"", nextReview:"2026-09-30", format:"Word", linkedProcess:"", description:"Template for staff and external stakeholder privacy notices in compliance with POPIA.", notes:"Awaiting POPIA policy approval before finalising" },
    { id:"DOC-005", title:"Board Resolution Template", category:"Governance", docType:"Template", owner:"CEO", version:"v2.0", status:"Published", lifecycle:"Published", createdDate:"2022-01-01", reviewDate:"2025-01-01", nextReview:"2026-01-01", format:"Word", linkedProcess:"", description:"Standard template for recording and circulating Board resolutions.", notes:"" },
    { id:"DOC-006", title:"Declaration of Interest Form", category:"Forms", docType:"Form", owner:"Legal", version:"v1.2", status:"Published", lifecycle:"Published", createdDate:"2023-11-01", reviewDate:"2025-11-01", nextReview:"2026-11-01", format:"PDF / Online", linkedProcess:"PRC-004", description:"Mandatory annual declaration form for all LGSETA officials.", notes:"Available via GRC portal" },
    { id:"DOC-007", title:"Business Impact Analysis Template", category:"Templates", docType:"Template", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2024-03-15", reviewDate:"2026-03-15", nextReview:"2027-03-15", format:"Excel", linkedProcess:"", description:"BIA template aligned to ISO 22301 for capturing critical process dependencies and recovery objectives.", notes:"" },
    { id:"DOC-008", title:"Incident Report Form", category:"Forms", docType:"Form", owner:"CRO", version:"v1.3", status:"Published", lifecycle:"Published", createdDate:"2024-01-10", reviewDate:"2026-01-10", nextReview:"2027-01-10", format:"PDF / Online", linkedProcess:"PRC-004", description:"Standardised form for reporting operational incidents, fraud and ethics violations.", notes:"" },
    { id:"DOC-009", title:"Data Flow Diagram — Learner Records", category:"Schemas", docType:"Schema", owner:"CIO", version:"v1.0", status:"Under Review", lifecycle:"Review", createdDate:"2026-04-01", reviewDate:"", nextReview:"2026-09-30", format:"Visio / PDF", linkedProcess:"PRC-003", description:"End-to-end data flow diagram showing how learner personal information is collected, stored and shared.", notes:"POPIA compliance review in progress" },
  ],
};

// ─── POLICY & PROCESS MODULE VIEW ────────────────────────────────────────────
function PolicyModule() {
  const [sub, setSub]       = useState("policies");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [data, setData]     = useState(STATIC_POLICY);

  const [complianceData, setComplianceData] = useState([]);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.policyManual) setData({ ...STATIC_POLICY, ...d.policyManual });
      if (d.compliance?.universe) setComplianceData(d.compliance.universe);
      else setComplianceData(STATIC_COMPLIANCE.universe);
    }).catch(()=>{});
  },[]);

  // Helper: get compliance status for a policy's linked legislation
  function getComplianceStatus(complianceRefs) {
    if (!complianceRefs?.length) return null;
    const linked = complianceData.filter(c => complianceRefs.includes(c.id));
    if (linked.some(c=>c.complianceStatus==="Non-Compliant")) return { status:"Non-Compliant", color:C.red };
    if (linked.some(c=>c.complianceStatus==="Partial")) return { status:"Partial", color:C.amber };
    if (linked.every(c=>c.complianceStatus==="Compliant")) return { status:"Compliant", color:C.green };
    return null;
  }

  const policies  = data.policies  || [];
  const processes = data.processes || [];
  const documents = data.documents || [];

  // Auto-flagged policies: linked legislation is Non-Compliant or Partial
  const flaggedPolicies = policies.filter(p => {
    const cs = getComplianceStatus(p.complianceRef);
    return cs && (cs.status==="Non-Compliant" || cs.status==="Partial");
  });

  const published = policies.filter(p=>p.lifecycle==="Published").length;
  const draft     = policies.filter(p=>p.lifecycle==="Draft").length;
  const review    = policies.filter(p=>p.lifecycle==="Review").length;
  const overdue   = [...policies,...processes,...documents].filter(d=>d.nextReview && new Date(d.nextReview)<new Date() && d.lifecycle==="Published").length;

  const LIFECYCLE_COLORS = {
    "Draft":    C.muted,
    "Review":   C.amber,
    "Approved": C.blue,
    "Published":C.green,
    "Archived": C.muted,
  };

  function LifecyclePill({ status }) {
    const c = LIFECYCLE_COLORS[status] || C.muted;
    return <span style={{ background:`${c}22`, color:c, border:`1px solid ${c}`, borderRadius:4, padding:"2px 8px", fontSize:"0.72rem", fontWeight:700 }}>{status}</span>;
  }

  function LifecycleBar({ status }) {
    const steps = ["Draft","Review","Approved","Published"];
    const idx   = steps.indexOf(status);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {steps.map((s,i)=>{
          const done    = i < idx;
          const current = i === idx;
          const c = done?C.green:current?C.blue:C.border;
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:done?C.green:current?C.blue:C.muted,
                borderBottom:`2px solid ${c}`, paddingBottom:1, whiteSpace:"nowrap" }}>{s}</div>
              {i<steps.length-1&&<div style={{ color:C.border, fontSize:"0.65rem" }}>→</div>}
            </div>
          );
        })}
      </div>
    );
  }

  const sc = s => {
    if (s==="Published") return C.green;
    if (s==="Draft") return C.muted;
    if (s==="Review"||s==="Under Review") return C.amber;
    if (s==="Archived") return C.red;
    return C.muted;
  };

  const filterFn = arr => arr.filter(d=>
    (filterStatus==="All" || d.lifecycle===filterStatus) &&
    JSON.stringify(d).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Policy & Process Manual</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Policy Register · Process Manual · Document Library — Q2 2026/27</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:200 }}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputSt}>
            {["All","Draft","Review","Approved","Published","Archived"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Policies",    policies.length,  C.blue  ],
          ["Processes",   processes.length, C.purple ],
          ["Documents",   documents.length, C.cyan  ],
          ["Published",   published,        C.green ],
          ["Under Review",review,           C.amber ],
          ["Overdue Review",overdue,        overdue>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Compliance linkage alerts */}
      {flaggedPolicies.length > 0 && (
        <div style={{ background:"rgba(248,81,73,0.08)", border:`1px solid ${C.red}`, borderRadius:10, padding:"1rem 1.25rem" }}>
          <div style={{ color:C.red, fontWeight:700, fontSize:"0.85rem", marginBottom:"0.5rem" }}>
            ⚠ {flaggedPolicies.length} {flaggedPolicies.length===1?"policy requires":"policies require"} review due to compliance status changes
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
            {flaggedPolicies.map(p => {
              const cs = getComplianceStatus(p.complianceRef);
              return (
                <div key={p.id} onClick={()=>{ setSub("policies"); setSelected(p); }}
                  style={{ background:C.card, border:`1px solid ${cs.color}`, borderRadius:8, padding:"0.5rem 0.85rem", cursor:"pointer" }}>
                  <div style={{ color:cs.color, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</div>
                  <div style={{ color:C.text, fontSize:"0.8rem", fontWeight:600 }}>{p.title}</div>
                  <div style={{ color:cs.color, fontSize:"0.7rem" }}>Linked legislation: {cs.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["policies","📜 Policy Register"],["processes","⚙ Process Manual"],["documents","📁 Document Library"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSub(id); setSelected(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background:C.card, border:`1px solid ${C.blue}`, borderRadius:12, padding:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
            <div>
              <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                <span style={{ color:C.blue, fontWeight:800 }}>{selected.id}</span>
                <LifecyclePill status={selected.lifecycle}/>
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{selected.version}</span>
              </div>
              <h3 style={{ color:C.text, margin:"0 0 0.25rem", fontWeight:700 }}>{selected.title}</h3>
              <p style={{ color:C.muted, margin:0, fontSize:"0.82rem" }}>{selected.category} · Owner: {selected.owner}</p>
            </div>
            <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
          </div>
          <LifecycleBar status={selected.lifecycle}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginTop:"1rem" }}>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Approved By</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.approvedBy||"Pending"}</div></div>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Approval Date</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.approvalDate||"—"}</div></div>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Next Review</div><div style={{ color:selected.nextReview&&new Date(selected.nextReview)<new Date()?C.red:C.text, fontSize:"0.85rem", fontWeight:selected.nextReview&&new Date(selected.nextReview)<new Date()?700:400 }}>{selected.nextReview||"—"}</div></div>
            {selected.linkedLegislation && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Legislation</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedLegislation}</div></div>}
            {selected.linkedProcess && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Process</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedProcess}</div></div>}
            {selected.linkedPolicy && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Policy</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedPolicy}</div></div>}
            {selected.steps && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Process Steps</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.steps}</div></div>}
            {selected.format && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Format</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.format}</div></div>}
          </div>
          <div style={{ marginTop:"0.75rem" }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Description</div>
            <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.65 }}>{selected.description}</div>
          </div>
          {selected.relatedForms?.length>0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Related Forms / Templates</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {selected.relatedForms.map(f=>(
                  <span key={f} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", fontSize:"0.75rem", color:C.muted }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {selected.tags?.length>0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Tags</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {selected.tags.map(t=>(
                  <span key={t} style={{ background:"rgba(88,166,255,0.1)", border:`1px solid ${C.blue}`, borderRadius:4, padding:"2px 8px", fontSize:"0.75rem", color:C.blue }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {selected.notes && <div style={{ marginTop:"0.75rem", color:C.muted, fontSize:"0.82rem", padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${C.amber}` }}>{selected.notes}</div>}

          {/* Live compliance status for linked legislation */}
          {selected.complianceRef?.length > 0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Live Compliance Status (Linked Legislation)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
                {complianceData.filter(c=>selected.complianceRef?.includes(c.id)).map(c=>(
                  <div key={c.id} style={{ background:C.surface, border:`1px solid ${c.complianceStatus==="Compliant"?C.green:c.complianceStatus==="Non-Compliant"?C.red:C.amber}`, borderRadius:6, padding:"0.4rem 0.75rem" }}>
                    <div style={{ color:C.blue, fontWeight:700, fontSize:"0.7rem" }}>{c.id}</div>
                    <div style={{ color:C.text, fontSize:"0.78rem", fontWeight:600 }}>{c.legislation}</div>
                    <div style={{ color:c.complianceStatus==="Compliant"?C.green:c.complianceStatus==="Non-Compliant"?C.red:C.amber, fontSize:"0.72rem", fontWeight:700 }}>{c.complianceStatus}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POLICIES */}
      {sub==="policies" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Owner","Version","Lifecycle","Legislation Status","Next Review"]}
            rows={filterFn(policies).map(p=>{
              const cs = getComplianceStatus(p.complianceRef);
              return [
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(p)}>{p.id}</span>,
                <div style={{ cursor:"pointer" }} onClick={()=>setSelected(p)}>
                  <div style={{ fontWeight:600, fontSize:"0.82rem", color:C.text }}>{p.title}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{p.description?.slice(0,60)}…</div>
                </div>,
                <Badge label={p.category} color="blue"/>,
                p.owner,
                <span style={{ color:C.muted, fontSize:"0.75rem", fontFamily:"monospace" }}>{p.version}</span>,
                <span style={{ color:sc(p.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{p.lifecycle}</span>,
                cs ? (
                  <span style={{ color:cs.color, fontWeight:700, fontSize:"0.75rem", display:"flex", alignItems:"center", gap:3 }}>
                    {cs.status==="Non-Compliant"?"🔴":cs.status==="Partial"?"🟡":"🟢"} {cs.status}
                  </span>
                ) : <span style={{ color:C.muted, fontSize:"0.75rem" }}>—</span>,
                <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontWeight:p.nextReview&&new Date(p.nextReview)<new Date()?700:400, fontSize:"0.75rem" }}>{p.nextReview||"—"}</span>,
              ];
            })}
          />
        </Card>
      )}

      {/* PROCESSES */}
      {sub==="processes" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Owner","Type","Steps","Schema","Lifecycle","Next Review"]}
            rows={filterFn(processes).map(p=>[
              <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(p)}>{p.id}</span>,
              <div style={{ cursor:"pointer" }} onClick={()=>setSelected(p)}>
                <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{p.title}</div>
              </div>,
              <Badge label={p.category} color="blue"/>,
              p.owner,
              <Badge label={p.processType} color={p.processType==="Compliance"?"amber":p.processType==="Governance"?"blue":"green"}/>,
              <span style={{ color:C.blue, fontWeight:700 }}>{p.steps}</span>,
              <span style={{ color:p.hasSchema?C.green:C.muted, fontWeight:700 }}>{p.hasSchema?"✓ Yes":"—"}</span>,
              <span style={{ color:sc(p.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{p.lifecycle}</span>,
              <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem" }}>{p.nextReview||"—"}</span>,
            ])}
          />
        </Card>
      )}

      {/* DOCUMENTS */}
      {sub==="documents" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Type","Owner","Format","Version","Lifecycle"]}
            rows={filterFn(documents).map(d=>[
              <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(d)}>{d.id}</span>,
              <div style={{ cursor:"pointer" }} onClick={()=>setSelected(d)}>
                <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{d.title}</div>
              </div>,
              <Badge label={d.category} color="blue"/>,
              <Badge label={d.docType} color={d.docType==="Schema"?"purple":d.docType==="Template"?"amber":"green"}/>,
              d.owner,
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.format}</span>,
              <span style={{ fontFamily:"monospace", fontSize:"0.75rem", color:C.muted }}>{d.version}</span>,
              <span style={{ color:sc(d.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{d.lifecycle}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── POLICY & PROCESS ADMIN ───────────────────────────────────────────────────
function PolicyAdmin() {
  const [view, setView]       = useState("policies");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { policies:STATIC_POLICY.policies, processes:STATIC_POLICY.processes, documents:STATIC_POLICY.documents };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.policyManual?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.policyManual) data.policyManual = {};
    data.policyManual[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.policyManual = { policies:STATIC_POLICY.policies, processes:STATIC_POLICY.processes, documents:STATIC_POLICY.documents };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_POLICY.policies.length} policies, ${STATIC_POLICY.processes.length} processes, ${STATIC_POLICY.documents.length} documents.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i=>i.id!==id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function updateLifecycle(id, newLifecycle) {
    setSaving(true);
    try {
      const updated = items.map(i => i.id===id ? { ...i, lifecycle:newLifecycle, status:newLifecycle, updatedAt:new Date().toISOString(),
        ...(newLifecycle==="Published"?{ approvalDate:new Date().toISOString().split("T")[0] }:{}) } : i);
      await saveToServer(updated);
      showToast(`✅ ${id} moved to ${newLifecycle}.`); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function PolicyForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Governance", owner:"", version:"v1.0", lifecycle:"Draft", status:"Draft", description:"", linkedLegislation:"", tags:"", createdDate:"", reviewDate:"", nextReview:"", approvedBy:"", approvalDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, tags:Array.isArray(initial.tags)?initial.tags.join(", "):initial.tags||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Policy":"Add Policy"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Policy ID" value={f.id} onChange={set("id")} required placeholder="POL-009"/>
          <FInput label="Policy Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Management Policy"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Governance","Ethics & Integrity","Financial Management","ICT & Security","Human Resources","Data Protection","BCM","Risk Management","Compliance","Operations"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR Executive"/>
          <FInput label="Version" value={f.version} onChange={set("version")} placeholder="v1.0"/>
          <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief description of the policy purpose and scope…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Linked Legislation" value={f.linkedLegislation} onChange={set("linkedLegislation")} placeholder="e.g. PFMA / King IV"/>
          <FInput label="Tags (comma-separated)" value={f.tags} onChange={set("tags")} placeholder="e.g. Risk, Governance, PFMA"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
          <FInput label="Approved By" value={f.approvedBy} onChange={set("approvedBy")} placeholder="e.g. Board"/>
          <FInput label="Approval Date" value={f.approvalDate} onChange={set("approvalDate")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Policy"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ProcessForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Operations", owner:"", version:"v1.0", lifecycle:"Draft", processType:"Core Business", description:"", steps:"5", hasFlowchart:false, hasSchema:false, relatedForms:"", linkedPolicy:"", nextReview:"", approvedBy:"", approvalDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, relatedForms:Array.isArray(initial.relatedForms)?initial.relatedForms.join(", "):initial.relatedForms||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Process":"Add Process"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Process ID" value={f.id} onChange={set("id")} required placeholder="PRC-007"/>
          <FInput label="Process Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Application Process"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Grants Management","Supply Chain","ETQA","Risk & Compliance","Strategy & Performance","ICT & Security","Human Resources","Finance","Operations","Governance"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR Executive"/>
          <FSelect label="Process Type" value={f.processType} onChange={set("processType")} options={["Core Business","Compliance","Governance","Support"]}/>
          <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the process purpose and scope…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Number of Steps" value={f.steps} onChange={set("steps")} type="number" placeholder="5"/>
          <FInput label="Linked Policy ID" value={f.linkedPolicy} onChange={set("linkedPolicy")} placeholder="e.g. POL-005"/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Has Flowchart</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="fc" value={opt} checked={(f.hasFlowchart?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, hasFlowchart:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Has Schema/Diagram</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="sc2" value={opt} checked={(f.hasSchema?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, hasSchema:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <FInput label="Related Forms (comma-separated)" value={f.relatedForms} onChange={set("relatedForms")} placeholder="e.g. Leave Form, Approval Form"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
          <FInput label="Approved By" value={f.approvedBy} onChange={set("approvedBy")} placeholder="e.g. CEO"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, relatedForms:f.relatedForms.split(",").map(t=>t.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Process"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function DocumentForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Templates", docType:"Template", owner:"", version:"v1.0", lifecycle:"Draft", format:"Word", description:"", linkedProcess:"", nextReview:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Document":"Add Document"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Document ID" value={f.id} onChange={set("id")} required placeholder="DOC-010"/>
          <FInput label="Document Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Application Form"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Forms","Templates","Schemas","Governance","Procedures","Checklists","Other"]}/>
          <FSelect label="Document Type" value={f.docType} onChange={set("docType")} options={["Form","Template","Schema","Checklist","Procedure","Guide","Report"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR"/>
          <FInput label="Version" value={f.version} onChange={set("version")} placeholder="v1.0"/>
          <FSelect label="Format" value={f.format} onChange={set("format")} options={["Word","Excel","PDF","PDF / Word","PDF / Online","Visio / PDF","PowerPoint","Other"]}/>
        </div>
        <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief description…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Linked Process ID" value={f.linkedProcess} onChange={set("linkedProcess")} placeholder="e.g. PRC-001"/>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Document"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="policies" ? PolicyForm : view==="processes" ? ProcessForm : DocumentForm;
  const addColor = view==="policies" ? C.blue : view==="processes" ? C.purple : C.cyan;
  const addLabel = view==="policies" ? "Add Policy" : view==="processes" ? "Add Process" : "Add Document";

  const LIFECYCLE_NEXT = { "Draft":"Review", "Review":"Approved", "Approved":"Published", "Published":"Archived" };

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["policies","📜 Policies"],["processes","⚙ Processes"],["documents","📁 Documents"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="policies"?"Policy Register":view==="processes"?"Process Manual":"Document Library"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.cyan?C.bg:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ {addLabel}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="policies" && (
            <Table
              headers={["ID","Title","Category","Owner","Version","Lifecycle","Next Review","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem", maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.title}>{p.title}</span>,
                <Badge label={p.category} color="blue"/>,
                p.owner,
                <span style={{ fontFamily:"monospace", fontSize:"0.75rem", color:C.muted }}>{p.version}</span>,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:p.lifecycle==="Published"?C.green:p.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.lifecycle}</span>
                  {LIFECYCLE_NEXT[p.lifecycle] && (
                    <button onClick={()=>updateLifecycle(p.id,LIFECYCLE_NEXT[p.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[p.lifecycle]}
                    </button>
                  )}
                </div>,
                <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem", fontWeight:p.nextReview&&new Date(p.nextReview)<new Date()?700:400 }}>{p.nextReview||"—"}</span>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="processes" && (
            <Table
              headers={["ID","Title","Type","Steps","Lifecycle","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{p.title}</span>,
                <Badge label={p.processType} color={p.processType==="Compliance"?"amber":p.processType==="Governance"?"blue":"green"}/>,
                <span style={{ color:C.blue, fontWeight:700 }}>{p.steps}</span>,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:p.lifecycle==="Published"?C.green:p.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.lifecycle}</span>
                  {LIFECYCLE_NEXT[p.lifecycle] && (
                    <button onClick={()=>updateLifecycle(p.id,LIFECYCLE_NEXT[p.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[p.lifecycle]}
                    </button>
                  )}
                </div>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="documents" && (
            <Table
              headers={["ID","Title","Type","Format","Owner","Lifecycle","Actions"]}
              rows={items.map(d=>[
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.title}>{d.title}</span>,
                <Badge label={d.docType} color={d.docType==="Schema"?"purple":d.docType==="Template"?"amber":"green"}/>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.format}</span>,
                d.owner,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:d.lifecycle==="Published"?C.green:d.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.lifecycle}</span>
                  {LIFECYCLE_NEXT[d.lifecycle] && (
                    <button onClick={()=>updateLifecycle(d.id,LIFECYCLE_NEXT[d.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[d.lifecycle]}
                    </button>
                  )}
                </div>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(d.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function AuditLog() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setLogs((data.auditLog || []).slice().reverse());
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  const modules = ["All", ...new Set(logs.map(l=>l.module).filter(Boolean))];
  const actions = ["All","Add","Edit","Delete","Status Change","Seed","Approve","Reject"];

  const filtered = logs.filter(l=>
    (filterModule==="All" || l.module===filterModule) &&
    (filterAction==="All" || l.action===filterAction) &&
    JSON.stringify(l).toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = a => {
    if (a==="Add") return C.green;
    if (a==="Delete") return C.red;
    if (a==="Edit") return C.blue;
    if (a==="Approve") return C.green;
    if (a==="Reject") return C.red;
    if (a==="Seed") return C.purple;
    return C.amber;
  };

  const adds    = logs.filter(l=>l.action==="Add").length;
  const edits   = logs.filter(l=>l.action==="Edit").length;
  const deletes = logs.filter(l=>l.action==="Delete").length;
  const today   = logs.filter(l=>l.timestamp?.startsWith(new Date().toISOString().slice(0,10))).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Audit Log</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>All admin panel changes — immutable record</p>
        </div>
        <button onClick={load} style={{ padding:"0.5rem 1rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:"0.82rem" }}>↻ Refresh</button>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Entries", logs.length,  C.blue  ],
          ["Today",         today,         C.green ],
          ["Edits",         edits,         C.amber ],
          ["Deletions",     deletes,       deletes>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
        <input placeholder="Search audit log…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
        <select value={filterModule} onChange={e=>setFilterModule(e.target.value)} style={inputSt}>
          {modules.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={inputSt}>
          {actions.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading audit log…</div>
      ) : filtered.length===0 ? (
        <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>
          {logs.length===0 ? "No audit entries yet. Make changes via the Admin Panel to start logging." : "No entries match your filters."}
        </p></Card>
      ) : (
        <Card>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {filtered.map((log, idx)=>(
              <div key={idx} style={{ borderBottom:idx<filtered.length-1?`1px solid ${C.border}`:"none",
                padding:"0.75rem 0" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", cursor:"pointer" }}
                  onClick={()=>setExpanded(expanded===idx?null:idx)}>
                  {/* Action badge */}
                  <span style={{ background:`${actionColor(log.action)}22`, color:actionColor(log.action),
                    border:`1px solid ${actionColor(log.action)}`, borderRadius:4,
                    padding:"2px 8px", fontSize:"0.7rem", fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                    {log.action}
                  </span>
                  {/* Module */}
                  <span style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                    padding:"2px 7px", fontSize:"0.7rem", color:C.blue, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                    {log.module}
                  </span>
                  {/* Description */}
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:"0.82rem", fontWeight:600 }}>{log.description}</div>
                    {log.recordId && <div style={{ color:C.muted, fontSize:"0.72rem" }}>Record: {log.recordId}</div>}
                  </div>
                  {/* Timestamp */}
                  <div style={{ color:C.muted, fontSize:"0.72rem", whiteSpace:"nowrap", flexShrink:0, textAlign:"right" }}>
                    <div>{log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-ZA") : "—"}</div>
                    <div>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"}) : ""}</div>
                  </div>
                  <span style={{ color:C.muted, fontSize:"0.75rem" }}>{expanded===idx?"▲":"▼"}</span>
                </div>

                {/* Expanded detail */}
                {expanded===idx && (
                  <div style={{ marginTop:"0.75rem", marginLeft:"0.5rem", background:C.surface, borderRadius:8,
                    padding:"0.75rem 1rem", borderLeft:`3px solid ${actionColor(log.action)}` }}>
                    {log.before && (
                      <div style={{ marginBottom:"0.5rem" }}>
                        <div style={{ color:C.muted, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", marginBottom:"0.25rem" }}>Before</div>
                        <pre style={{ color:C.red, fontSize:"0.72rem", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <div style={{ color:C.muted, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", marginBottom:"0.25rem" }}>After</div>
                        <pre style={{ color:C.green, fontSize:"0.72rem", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.meta && (
                      <div style={{ marginTop:"0.5rem", color:C.muted, fontSize:"0.75rem" }}>
                        {Object.entries(log.meta).map(([k,v])=>(
                          <span key={k} style={{ marginRight:"1rem" }}><strong>{k}:</strong> {String(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


// ─── KRI SPARKLINE COMPONENT ─────────────────────────────────────────────────
function Sparkline({ data=[], color=C.blue, width=80, height=24 }) {
  if (!data || data.length < 2) return <span style={{ color:C.muted, fontSize:"0.7rem" }}>—</span>;
  const nums = data.map(Number).filter(n=>!isNaN(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const pts = nums.map((v,i)=>{
    const x = (i/(nums.length-1))*width;
    const y = height - ((v-min)/range)*(height-4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const last = nums[nums.length-1];
  const prev = nums[nums.length-2];
  const trend = last > prev ? "↑" : last < prev ? "↓" : "→";
  const trendColor = last > prev ? C.red : last < prev ? C.green : C.muted;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <svg width={width} height={height} style={{ overflow:"visible" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx={pts.split(" ").pop()?.split(",")[0]} cy={pts.split(" ").pop()?.split(",")[1]} r="2.5" fill={color}/>
      </svg>
      <span style={{ color:trendColor, fontSize:"0.75rem", fontWeight:700 }}>{trend}</span>
    </div>
  );
}

// ─── KRI TREND CHART MODAL ────────────────────────────────────────────────────
function KRITrendModal({ kri, onClose }) {
  if (!kri) return null;
  const PERIODS_LABELS = ["Q2 24/25","Q3 24/25","Q4 24/25","Q1 25/26","Q2 25/26","Q3 25/26"];
  // Generate simulated trend data from current and previous values
  const current = parseFloat(kri.currentPeriodValue) || 0;
  const previous = parseFloat(kri.previousPeriodValue) || 0;
  const target  = parseFloat(kri.target) || 0;
  // Simulate 6 periods of data trending toward current
  const trendData = PERIODS_LABELS.map((_, i) => {
    const progress = i / (PERIODS_LABELS.length - 1);
    return +(previous + (current - previous) * progress * 0.8 + (Math.random() - 0.5) * Math.abs(current - previous) * 0.2).toFixed(1);
  });
  trendData[trendData.length - 1] = current;

  const min = Math.min(...trendData, target) * 0.9;
  const max = Math.max(...trendData, target) * 1.1;
  const range = max - min || 1;
  const W = 480; const H = 180; const PAD = 40;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const toX = i => PAD + (i / (trendData.length - 1)) * chartW;
  const toY = v => PAD + chartH - ((v - min) / range) * chartH;

  const pts = trendData.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ");
  const targetY = toY(target);

  const statusColor = kri.currentStatus==="Red"?C.red:kri.currentStatus==="Amber"?C.amber:C.green;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        padding:"1.75rem", width:560, maxWidth:"95vw" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem" }}>
          <div>
            <div style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{kri.id}</div>
            <h3 style={{ color:C.text, margin:"0.2rem 0 0.25rem", fontWeight:700 }}>{kri.indicator}</h3>
            <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
              <span style={{ color:statusColor, fontWeight:700, fontSize:"0.85rem" }}>{kri.currentPeriodValue}</span>
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>Target: {kri.target}</span>
              <Badge label={kri.currentStatus} color={kri.currentStatus==="Red"?"red":kri.currentStatus==="Amber"?"amber":"green"}/>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.25rem" }}>✕</button>
        </div>

        {/* SVG Chart */}
        <svg width={W} height={H} style={{ width:"100%", height:"auto" }}>
          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map(f=>(
            <line key={f} x1={PAD} y1={PAD+chartH*f} x2={PAD+chartW} y2={PAD+chartH*f}
              stroke={C.border} strokeWidth="1" strokeDasharray="3,3"/>
          ))}
          {/* Target line */}
          <line x1={PAD} y1={targetY} x2={PAD+chartW} y2={targetY}
            stroke={C.green} strokeWidth="1.5" strokeDasharray="6,3"/>
          <text x={PAD+chartW+4} y={targetY+4} fill={C.green} fontSize="10">Target</text>
          {/* Trend line */}
          <polyline points={pts} fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinejoin="round"/>
          {/* Data points */}
          {trendData.map((v,i)=>(
            <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill={statusColor}/>
          ))}
          {/* X axis labels */}
          {PERIODS_LABELS.map((l,i)=>(
            <text key={l} x={toX(i)} y={H-8} textAnchor="middle" fill={C.muted} fontSize="9">{l}</text>
          ))}
          {/* Y axis labels */}
          {[0,0.5,1].map(f=>{
            const val = (min + range * (1-f)).toFixed(1);
            return <text key={f} x={PAD-5} y={PAD+chartH*f+4} textAnchor="end" fill={C.muted} fontSize="9">{val}</text>;
          })}
        </svg>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem", marginTop:"1rem" }}>
          {[
            ["Current Value", kri.currentPeriodValue, statusColor],
            ["Previous Value", kri.previousPeriodValue, C.muted],
            ["Trend", kri.trend, kri.trend==="Improving"?C.green:kri.trend==="Declining"?C.red:C.amber],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:C.surface, borderRadius:7, padding:"0.6rem 0.85rem", textAlign:"center" }}>
              <div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
              <div style={{ color:c, fontSize:"1rem", fontWeight:800 }}>{v}</div>
            </div>
          ))}
        </div>
        {kri.linkedRisk && <div style={{ marginTop:"0.75rem", color:C.muted, fontSize:"0.78rem" }}>Linked Risk: <span style={{ color:C.blue }}>{kri.linkedRisk}</span></div>}
      </div>
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
  { id:"compliance",    label:"Compliance",           icon:"⚖" },
  { id:"iam",            label:"Identity & Access",     icon:"🔐" },
  { id:"policy",         label:"Policy & Process",      icon:"📜" },
  { id:"declarations",   label:"Declarations",          icon:"📝" },
  { id:"projects",       label:"Projects & Contracts",  icon:"📁" },
  { id:"auditlog",      label:"Audit Log",            icon:"🔍" },
  { id:"admin",         label:"Admin Panel",          icon:"⚙" },
];

const MODULES = {
  executive:ExecutiveOverview, appetite:RiskAppetite, strategic:StrategicRisks,
  kri:KRIMonitoring, opportunities:Opportunities, emerging:EmergingRisks,
  treatment:TreatmentActions, assurance:CombinedAssurance, bcm:BCMResilience,
  fraud:FraudEthics, departmental:DepartmentalRisks, uifw:UIFWExpenditure,
  thirdparty:ThirdPartyRisk, app:APPAlignment, predictive:PredictiveIntel,
  compliance:ComplianceModule,
  iam:       IAMModule,
  policy:    PolicyModule,
  declarations:DeclarationsModule,
  projects:  ProjectsModule,
  admin:AdminTab,
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PERIODS = [
  { value:"Q1-2526", label:"Q1 2025/26" },
  { value:"Q2-2526", label:"Q2 2025/26" },
  { value:"Q3-2526", label:"Q3 2025/26" },
  { value:"Q4-2526", label:"Q4 2025/26" },
  { value:"Q1-2627", label:"Q1 2026/27" },
  { value:"Q2-2627", label:"Q2 2026/27" },
  { value:"Q3-2627", label:"Q3 2026/27" },
  { value:"Q4-2627", label:"Q4 2026/27" },
  { value:"Q1-2728", label:"Q1 2027/28" },
];

export default function App() {
  const [active, setActive] = useState("executive");
  const [period, setPeriod]   = useState("Q2-2627");
  const [darkMode, setDarkMode] = useState(true);
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
            <select value={period} onChange={e=>setPeriod(e.target.value)}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
                color:C.text, fontSize:"0.75rem", padding:"0.3rem 0.6rem", cursor:"pointer", outline:"none" }}>
              {PERIODS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Switch to Light Mode":"Switch to Dark Mode"}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
                color:C.text, fontSize:"0.85rem", padding:"0.3rem 0.5rem", cursor:"pointer", lineHeight:1 }}>
              {darkMode?"☀️":"🌙"}
            </button>
            <span style={{ color:C.green, fontSize:"0.78rem", fontWeight:600 }}>● Live</span>
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>{PERIODS.find(p=>p.value===period)?.label||"Q2 2026/27"}</span>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem" }}>
          <Module/>
        </main>
      </div>
    </div>
  );
}
