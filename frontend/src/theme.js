// Colour tokens. `C` is a live object mutated in place by applyTheme; every
// module imports the same reference, so a theme switch reskins the whole app.

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
// Two palettes. Accent colours (red/amber/green/blue/purple/cyan) are shared so
// status semantics stay consistent across themes; only the surfaces invert.
const THEMES = {
  dark: {
    bg:      "#0d1117", surface: "#161b22", card: "#1c2230", border: "#30363d",
    text:    "#e6edf3", muted:   "#8b949e", red:  "#f85149", amber:  "#e3b341",
    green:   "#3fb950", blue:    "#58a6ff", purple:"#a371f7", cyan:   "#39d353",
  },
  light: {
    bg:      "#f6f8fa", surface: "#ffffff", card: "#ffffff", border: "#d0d7de",
    text:    "#1f2328", muted:   "#656d76", red:  "#cf222e", amber:  "#9a6700",
    green:   "#1a7f37", blue:    "#0969da", purple:"#8250df", cyan:   "#1a7f37",
  },
};

// `C` is a LIVE token object. Components read C.* at render time, so mutating it
// in place (applyTheme) and forcing a re-render of <App/> reskins the entire app
// without threading a theme prop through 800+ styled lines.
const C = { ...THEMES.dark };
function applyTheme(name) {
  Object.assign(C, THEMES[name] || THEMES.dark);
}

export { C, applyTheme, THEMES };
