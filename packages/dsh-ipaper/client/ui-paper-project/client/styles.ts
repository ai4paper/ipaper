export const PAPER_PROJECT_STYLES = `
/* The sidebar button is the only visible Paper-status switch; the registered
   conversation tab remains the host's state owner but is visually suppressed. */
button[role='tab'][aria-label='Paper status'] { display:none; }
html[data-ipaper-status-open='true'] [data-slot='conversation.session.header'],
html[data-ipaper-status-open='true'] [data-composer-seat] { display:none !important; }
html[data-ipaper-status-open='true'] [data-conversation-scroll] { --dsh-composer-height:0px !important; padding-bottom:0 !important; }
[data-slot='sidebar.workspaces'] { display:flex; flex-direction:column; min-height:0; }
[data-slot='sidebar.workspaces'] > :not(.ipaper-sidebar-launcher-seat) { flex:1 1 auto; min-height:0; }
.ipaper-sidebar-launcher-seat { box-sizing:border-box; order:-1; width:100%; flex:none; padding:0 0 8px; }
.ipaper-sidebar-button { appearance:none; width:100%; min-width:36px; height:36px; display:flex; align-items:center; justify-content:flex-start; gap:10px; padding:0 9px; border:0; border-radius:9px; color:var(--dsw-alias-label-secondary); background:transparent; cursor:pointer; font:500 13px/20px Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-sidebar-button:not([data-wide='true']) { width:36px; justify-content:center; padding:0; }
.ipaper-sidebar-button:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
.ipaper-sidebar-button[data-active='true'] { color:#b87520; background:color-mix(in srgb,#c88428 12%,transparent); }
.ipaper-sidebar-button:disabled { opacity:.4; cursor:default; }
.ipaper-sidebar-button svg { flex:none; }
.ipaper-sidebar-button span { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.ipaper-view { box-sizing:border-box; height:100%; overflow-y:auto; padding:clamp(14px,2vw,24px); color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-view * { box-sizing:border-box; }
.ipaper-view-shell { width:min(1120px,100%); margin:0 auto; display:grid; gap:16px; }
.ipaper-view-hero { padding:11px 16px 10px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-kicker { margin:0 0 1px; color:#c88428; font-size:8px; font-weight:750; line-height:12px; letter-spacing:.12em; text-transform:uppercase; }
.ipaper-view-title-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.ipaper-view-title-row>div { min-width:0; }
.ipaper-view-title-row h1 { margin:0; font-family:Georgia,'Times New Roman',serif; font-size:clamp(19px,2vw,24px); font-weight:500; line-height:1.1; letter-spacing:-.02em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ipaper-view-title-row>span { flex:none; color:var(--dsw-alias-label-tertiary); font:500 10px/16px ui-monospace,SFMono-Regular,Menlo,monospace; }
.ipaper-view-summary { margin:6px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:16px; }
.ipaper-view-tabs { display:flex; gap:3px; overflow-x:auto; border-bottom:1px solid var(--dsw-alias-border-l1); }
.ipaper-view-tabs button { appearance:none; padding:8px 13px 10px; border:0; border-bottom:2px solid transparent; color:var(--dsw-alias-label-tertiary); background:transparent; cursor:pointer; font:600 12px/18px Inter,ui-sans-serif,system-ui,sans-serif; white-space:nowrap; }
.ipaper-view-tabs button[aria-selected='true'] { color:var(--dsw-alias-label-primary); border-bottom-color:#c88428; }
.ipaper-view-section-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:13px; }
.ipaper-view-section-head h2 { margin:0; font:500 18px/26px Georgia,'Times New Roman',serif; }
.ipaper-view-section-head span { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.ipaper-view-section-head>div p { margin:2px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:16px; }
.ipaper-view-graph-card { min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-graph-actions { display:flex; align-items:center; gap:10px; flex:none; }
.ipaper-view-graph-actions button { appearance:none; width:30px; height:30px; display:grid; place-items:center; padding:0; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-layer-2); cursor:pointer; }
.ipaper-view-graph-actions button:hover { color:var(--dsw-alias-label-primary); border-color:#c88428; }
.ipaper-view-graph-actions button:focus-visible,.ipaper-view-graph-search input:focus-visible { outline:2px solid #c88428; outline-offset:2px; }
.ipaper-view-graph-actions svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.ipaper-view-graph-search { display:flex; align-items:center; gap:8px; margin:0 0 10px; color:var(--dsw-alias-label-tertiary); font-size:10px; }
.ipaper-view-graph-search label { font-weight:700; white-space:nowrap; }
.ipaper-view-graph-search input { width:min(320px,100%); min-height:30px; padding:5px 9px; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); font:11px/18px Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-view-graph-search span { font-size:10px; white-space:nowrap; }
.ipaper-view-graph-card:fullscreen { width:100vw; height:100vh; display:grid; grid-template-rows:auto auto minmax(0,1fr) auto auto; padding:18px; border:0; border-radius:0; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-graph-card:fullscreen .ipaper-view-graph { height:auto; min-height:0; }
.ipaper-view-graph { width:100%; height:clamp(340px,48vh,520px); overflow:hidden; border:1px solid var(--dsw-alias-border-l1); border-radius:11px; background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 72%,#f7f3eb); cursor:grab; }
.ipaper-view-graph:active { cursor:grabbing; }
.ipaper-view-graph-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:30px; padding-top:10px; }
.ipaper-view-graph-legend { display:flex; flex-wrap:wrap; gap:6px 12px; margin:0; padding:0; list-style:none; color:var(--dsw-alias-label-tertiary); font-size:9px; }
.ipaper-view-graph-legend li { display:flex; align-items:center; gap:5px; white-space:nowrap; }
.ipaper-view-graph-legend li::before { width:7px; height:7px; border-radius:50%; background:#6877a6; content:''; }
.ipaper-view-graph-legends { display:grid; gap:5px; min-width:0; }
.ipaper-view-graph-shapes { gap:4px 10px; font-size:8px; }
.ipaper-view-graph-shapes li::before { width:11px; height:11px; flex:none; border-radius:0; background:#87909d; }
.ipaper-view-graph-shapes [data-shape='diamond']::before { transform:rotate(45deg) scale(.72); background:#9b6a2b; }
.ipaper-view-graph-shapes [data-shape='hexagon']::before { clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); background:#6877a6; }
.ipaper-view-graph-shapes [data-shape='round-rectangle']::before { border-radius:3px; background:#6877a6; }
.ipaper-view-graph-shapes [data-shape='rectangle']::before { background:#6877a6; }
.ipaper-view-graph-shapes [data-shape='ellipse']::before { border-radius:50%; background:#3d8b73; }
.ipaper-view-graph-shapes [data-shape='triangle']::before { clip-path:polygon(50% 0,100% 100%,0 100%); background:#3d8b73; }
.ipaper-view-graph-shapes [data-shape='octagon']::before { clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%); background:#8b5f9c; }
.ipaper-view-graph-shapes [data-shape='rhomboid']::before { clip-path:polygon(25% 0,100% 0,75% 100%,0 100%); background:#c88428; }
.ipaper-view-graph-shapes [data-shape='vee']::before { clip-path:polygon(0 0,35% 0,50% 58%,65% 0,100% 0,68% 100%,32% 100%); background:#c88428; }
.ipaper-view-graph-shapes [data-shape='star']::before { clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 100%,50% 73%,21% 100%,32% 57%,2% 35%,39% 35%); background:#c88428; }
.ipaper-view-graph-shapes [data-shape='barrel']::before { border-radius:45%; background:#87909d; }
.ipaper-view-graph-edges { gap:4px 10px; font-size:8px; }
.ipaper-view-graph-edges li { position:relative; gap:5px; }
.ipaper-view-graph-edges li::before { width:20px; height:0; flex:none; border-top:2px solid #87909d; background:transparent; content:''; }
.ipaper-view-graph-edges li::after { width:0; height:0; border-top:3px solid transparent; border-bottom:3px solid transparent; border-left:5px solid #87909d; content:''; }
.ipaper-view-graph-edges [data-edge='addresses']::before,.ipaper-view-graph-edges [data-edge='derived_from']::before,.ipaper-view-graph-edges [data-edge='reviews']::before { border-top-style:dashed; }
.ipaper-view-graph-edges [data-edge='depends_on']::before,.ipaper-view-graph-edges [data-edge='cites']::before,.ipaper-view-graph-edges [data-edge='affects']::before { border-top-style:dotted; }
.ipaper-view-graph-edges [data-edge='contradicts']::after { border-left-color:#d45d4c; }
.ipaper-view-graph-edges [data-edge='produces']::after,.ipaper-view-graph-edges [data-edge='reviews']::after { border-left-color:#c88428; }
.ipaper-view-graph-selection { min-width:180px; margin:0; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:15px; text-align:right; }
.ipaper-view-graph-key { min-width:0; color:var(--dsw-alias-label-tertiary); font-size:10px; }
.ipaper-view-graph-key summary { width:max-content; padding:4px 0; color:var(--dsw-alias-label-secondary); cursor:pointer; font-weight:700; }
.ipaper-view-graph-key[open] summary { margin-bottom:5px; color:var(--dsw-alias-label-primary); }
.ipaper-view-graph-accessible { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.7fr); gap:12px 20px; margin-top:12px; padding-top:12px; border-top:1px solid var(--dsw-alias-border-l1); }
.ipaper-view-graph-accessible h3 { margin:0; font:600 12px/18px Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-view-graph-accessible>p { grid-column:1/-1; margin:-7px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10px; }
.ipaper-view-graph-accessible ul { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:5px; margin:0; padding:0; list-style:none; }
.ipaper-view-graph-accessible [role='option'] { width:100%; min-height:44px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:1px; padding:6px 9px; border:1px solid transparent; border-radius:7px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); cursor:pointer; text-align:left; }
.ipaper-view-graph-accessible [role='option']:hover,.ipaper-view-graph-accessible [role='option'][aria-selected='true'] { border-color:#c88428; }
.ipaper-view-graph-accessible [role='option']:focus-visible,.ipaper-view-graph-key summary:focus-visible { outline:2px solid #c88428; outline-offset:2px; }
.ipaper-view-graph-accessible [role='option'] strong { overflow:hidden; max-width:100%; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
.ipaper-view-graph-accessible [role='option'] span { color:var(--dsw-alias-label-tertiary); font-size:9px; }
.ipaper-view-graph-inspector { min-width:0; padding:11px 12px; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); }
.ipaper-view-graph-inspector p { margin:6px 0 8px; color:var(--dsw-alias-label-secondary); font-size:10px; line-height:15px; overflow-wrap:anywhere; }
.ipaper-view-graph-inspector ul { display:grid; gap:4px; font-size:10px; }
.ipaper-view-graph-inspector li { color:var(--dsw-alias-label-tertiary); }
.ipaper-view-graph-inspector li strong { color:var(--dsw-alias-label-primary); }
.ipaper-view-graph-selection strong,.ipaper-view-graph-selection span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ipaper-view-graph-selection strong { color:var(--dsw-alias-label-primary); font-size:11px; }
.ipaper-view-lenses { display:grid; grid-template-columns:repeat(5,minmax(130px,1fr)); gap:9px; }
.ipaper-view-lenses article { min-width:0; padding:13px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-lenses article>div { display:flex; justify-content:space-between; gap:8px; font-size:12px; }
.ipaper-view-lenses article>div span { color:var(--dsw-alias-label-tertiary); font:500 11px/16px ui-monospace,SFMono-Regular,Menlo,monospace; }
.ipaper-view-lenses p { display:flex; align-items:center; gap:6px; margin:13px 0 0; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.ipaper-view-lenses i { width:7px; height:7px; border-radius:50%; background:var(--dsw-alias-label-caption); }
.ipaper-view-lenses [data-state='active'] i { background:#428b68; box-shadow:0 0 0 3px color-mix(in srgb,#428b68 14%,transparent); }
.ipaper-view-lenses [data-state='needs-attention'] i { background:#c88428; box-shadow:0 0 0 3px color-mix(in srgb,#c88428 15%,transparent); }
.ipaper-view-columns { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(250px,.65fr); gap:16px; align-items:start; }
.ipaper-view-card { min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-list { display:grid; gap:0; margin:0; padding:0; list-style:none; }
.ipaper-view-item { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:start; padding:10px 0; border-bottom:1px solid var(--dsw-alias-border-l1); }
.ipaper-view-item:last-child { border-bottom:0; }
.ipaper-view-kind { min-width:70px; color:var(--dsw-alias-label-tertiary); font-size:10px; font-weight:750; line-height:18px; letter-spacing:.08em; text-transform:uppercase; }
.ipaper-view-item strong { font-size:13px; line-height:18px; overflow-wrap:anywhere; }
.ipaper-view-item p,.ipaper-view-empty-copy { margin:3px 0 0; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:17px; overflow-wrap:anywhere; }
.ipaper-view-chip { padding:2px 8px; border-radius:999px; color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); font-size:10px; font-weight:650; line-height:16px; white-space:nowrap; }
.ipaper-view-chip[data-tone='attention'] { color:#a86716; background:color-mix(in srgb,#c88428 14%,var(--dsw-alias-bg-layer-2)); }
.ipaper-view-chip[data-tone='good'] { color:#397c5b; background:color-mix(in srgb,#428b68 13%,var(--dsw-alias-bg-layer-2)); }
.ipaper-view-empty,.ipaper-view-loading { box-sizing:border-box; display:grid; place-items:center; height:100%; padding:32px; text-align:center; color:var(--dsw-alias-label-tertiary); }
.ipaper-view-empty-mark { width:42px; height:52px; margin:0 auto 16px; border:1.5px solid var(--dsw-alias-border-l1); border-radius:4px 9px 4px 4px; }
.ipaper-view-empty h2 { margin:0; color:var(--dsw-alias-label-primary); font:500 20px/28px Georgia,'Times New Roman',serif; }
.ipaper-view-empty>p { max-width:480px; margin:8px 0 0; font-size:12px; line-height:20px; }
@media(max-width:900px){.ipaper-view-lenses{grid-template-columns:repeat(2,minmax(140px,1fr))}.ipaper-view-columns{grid-template-columns:1fr}}
@media(max-width:700px){.ipaper-view-section-head{align-items:flex-start;flex-direction:column}.ipaper-view-graph-actions{width:100%; flex-wrap:wrap}.ipaper-view-graph-actions>span{width:100%}.ipaper-view-graph-search{align-items:flex-start; flex-wrap:wrap}.ipaper-view-graph-search input{flex:1; min-width:180px}.ipaper-view-graph-accessible{grid-template-columns:1fr}}
@media(max-width:560px){.ipaper-view{padding:14px}.ipaper-view-title-row{align-items:flex-start;flex-direction:column;gap:6px}.ipaper-view-graph{height:55svh;min-height:300px}.ipaper-view-graph-footer{align-items:flex-start;flex-direction:column}.ipaper-view-graph-selection{width:100%;text-align:left}.ipaper-view-lenses{grid-template-columns:1fr}.ipaper-view-item{grid-template-columns:minmax(0,1fr) auto}.ipaper-view-kind{grid-column:1/-1}.ipaper-view-graph-accessible ul{grid-template-columns:1fr}}
`
