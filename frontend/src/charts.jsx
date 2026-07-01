// Reusable SVG chart primitives. Colours from ./theme; KPICardPro wraps Card.
import { C } from "./theme";
import { Card } from "./ui";

// ─── REUSABLE CHART HELPERS (SVG) ─────────────────────────────────────────────
// Gauge ring — semicircular progress gauge used for compliance/readiness scores.
function GaugeRing({ value=0, max=100, label, sublabel, color, size=120 }) {
  const pct = Math.max(0, Math.min(100, (Number(value)/Number(max||100))*100));
  const r = size/2 - 10;
  const cx = size/2, cy = size/2;
  const circ = Math.PI * r;               // semicircle length
  const dash = (pct/100) * circ;
  const ringColor = color || (pct>=80?C.green:pct>=60?C.amber:C.red);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width={size} height={size/2 + 18} style={{ overflow:"visible" }}>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={C.border} strokeWidth="9" strokeLinecap="round"/>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={ringColor} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} style={{ transition:"stroke-dasharray 0.6s ease" }}/>
        <text x={cx} y={cy-4} textAnchor="middle" fill={ringColor} fontSize={size*0.2} fontWeight="800">{Math.round(pct)}%</text>
      </svg>
      {label && <div style={{ color:C.text, fontSize:"0.78rem", fontWeight:600, marginTop:2, textAlign:"center" }}>{label}</div>}
      {sublabel && <div style={{ color:C.muted, fontSize:"0.7rem", textAlign:"center" }}>{sublabel}</div>}
    </div>
  );
}

// Donut chart — full circle with optional center text. segments = [{label,value,color}]
function DonutChart({ segments=[], size=180, thickness=22, centerValue, centerLabel }) {
  const total = segments.reduce((s,x)=>s+(Number(x.value)||0),0) || 1;
  const r = size/2 - thickness/2 - 2;
  const cx = size/2, cy = size/2;
  const circ = 2*Math.PI*r;
  let offset = 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={thickness}/>
        {segments.map((seg,i)=>{
          const frac = (Number(seg.value)||0)/total;
          const len  = frac*circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:"stroke-dasharray 0.6s ease" }}/>
          );
          offset += len;
          return el;
        })}
        {centerValue!=null && <text x={cx} y={cy-2} textAnchor="middle" fill={C.text} fontSize={size*0.18} fontWeight="800">{centerValue}</text>}
        {centerLabel && <text x={cx} y={cy+size*0.13} textAnchor="middle" fill={C.muted} fontSize={size*0.07}>{centerLabel}</text>}
      </svg>
    </div>
  );
}

// Enhanced KPI card — value + delta indicator + optional sparkline trend.
function KPICardPro({ label, value, sub, color=C.blue, delta, deltaGood, spark }) {
  const deltaColor = delta==null ? C.muted : (deltaGood ? C.green : C.red);
  const arrow = delta==null ? "" : (Number(delta)>=0 ? "↑" : "↓");
  return (
    <Card style={{ borderTop:`3px solid ${color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ color:C.muted, fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
        {spark && spark.length>1 && <Sparkline data={spark} color={color} width={56} height={20}/>}
      </div>
      <div style={{ color, fontSize:"1.8rem", fontWeight:800, lineHeight:1.1, marginTop:4 }}>{value}</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
        {delta!=null && <span style={{ color:deltaColor, fontSize:"0.74rem", fontWeight:700 }}>{arrow} {Math.abs(Number(delta))}</span>}
        {sub && <span style={{ color:C.muted, fontSize:"0.76rem" }}>{sub}</span>}
      </div>
    </Card>
  );
}

// Horizontal stacked bar (owner accountability etc). segments = [{value,color}]
function StackedBar({ segments=[], max, height=14 }) {
  const total = segments.reduce((s,x)=>s+(Number(x.value)||0),0);
  const denom = max || total || 1;
  return (
    <div style={{ display:"flex", width:"100%", height, borderRadius:4, overflow:"hidden", background:C.border }}>
      {segments.map((s,i)=>(
        <div key={i} title={s.label} style={{ width:`${((Number(s.value)||0)/denom)*100}%`, background:s.color, height:"100%" }}/>
      ))}
    </div>
  );
}

// Radar / spider chart (PESTLE etc). axes=[{label,value,max}], optional second series.
function RadarChart({ axes=[], series2=null, size=320, color=C.purple, color2=C.cyan }) {
  const cx=size/2, cy=size/2, r=size/2-46;
  const n=axes.length || 1;
  const angle = i => (Math.PI*2*i/n) - Math.PI/2;
  const maxVal = Math.max(1, ...axes.map(a=>a.max||100));
  const pt = (i,val) => {
    const rad = (Math.max(0,Math.min(val,maxVal))/maxVal)*r;
    return [cx + rad*Math.cos(angle(i)), cy + rad*Math.sin(angle(i))];
  };
  const poly = vals => vals.map((v,i)=>pt(i,v).join(",")).join(" ");
  const rings = [0.25,0.5,0.75,1];
  return (
    <svg width={size} height={size} style={{ maxWidth:"100%" }}>
      {rings.map((f,ri)=>(
        <polygon key={ri} points={axes.map((_,i)=>{
          const x=cx+r*f*Math.cos(angle(i)), y=cy+r*f*Math.sin(angle(i)); return `${x},${y}`;
        }).join(" ")} fill="none" stroke={C.border} strokeWidth="1"/>
      ))}
      {axes.map((a,i)=>{
        const [ex,ey]=[cx+r*Math.cos(angle(i)), cy+r*Math.sin(angle(i))];
        const [lx,ly]=[cx+(r+22)*Math.cos(angle(i)), cy+(r+22)*Math.sin(angle(i))];
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.border} strokeWidth="1"/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={C.muted} fontSize="11">{a.label}</text>
          </g>
        );
      })}
      {series2 && (
        <polygon points={poly(series2)} fill="none" stroke={color2} strokeWidth="1.5" strokeDasharray="5,3" opacity="0.9"/>
      )}
      <polygon points={poly(axes.map(a=>a.value))} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2"/>
      {axes.map((a,i)=>{ const [x,y]=pt(i,a.value); return <circle key={i} cx={x} cy={y} r="3.5" fill={color}/>; })}
    </svg>
  );
}

// Heat grid — a labelled matrix of cells. rows/cols are arrays of labels;
// cell(r,c) returns {value,color,label?}. Used for opportunity & assurance heatmaps.
function HeatGrid({ rows=[], cols=[], cell, cellW=120, cellH=58, rowLabelW=90, colLabel }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"separate", borderSpacing:6 }}>
        <thead>
          <tr>
            <th style={{ width:rowLabelW }}></th>
            {cols.map((c,ci)=>(
              <th key={ci} style={{ color:C.muted, fontSize:"0.72rem", fontWeight:600, textAlign:"center", paddingBottom:4, minWidth:cellW }}>{colLabel?colLabel(c):c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rw,ri)=>(
            <tr key={ri}>
              <td style={{ color:C.muted, fontSize:"0.72rem", fontWeight:600, textAlign:"right", paddingRight:8, whiteSpace:"nowrap" }}>{rw}</td>
              {cols.map((cl,ci)=>{
                const d = cell(rw,cl,ri,ci) || {};
                return (
                  <td key={ci} style={{ width:cellW, height:cellH, background:d.color||C.surface, borderRadius:6,
                    textAlign:"center", verticalAlign:"middle", border:`1px solid ${C.border}` }}>
                    <div style={{ color:"#fff", fontWeight:800, fontSize:"0.95rem" }}>{d.value}</div>
                    {d.label && <div style={{ color:"rgba(255,255,255,0.85)", fontSize:"0.62rem", lineHeight:1.15, padding:"0 4px" }}>{d.label}</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MODULE: EXECUTIVE OVERVIEW ───────────────────────────────────────────────

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

export { GaugeRing, DonutChart, KPICardPro, StackedBar, RadarChart, HeatGrid, Sparkline };
