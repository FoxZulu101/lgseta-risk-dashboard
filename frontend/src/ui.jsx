// Shared presentational UI primitives. Colours come from ./theme.
import { C } from "./theme";

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

export {
  Card, SectionTitle, Badge, StatusBadge, ProgressBar, KPICard, Table,
  inputSt, labelSt, FInput, FSelect, FTextarea,
};
