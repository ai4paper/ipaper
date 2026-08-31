export const PAPER_PROJECT_STYLES = `
/* The sidebar button is the only visible Paper-status switch; the registered
   conversation tab remains the host's state owner but is visually suppressed. */
button[role='tab'][aria-label='Paper status'] { display:none; }
html[data-ipaper-status-open='true'] [data-slot='conversation.session.header'],
html[data-ipaper-status-open='true'] [data-composer-seat] { display:none !important; }
html[data-ipaper-status-open='true'] [data-conversation-scroll] { --dsh-composer-height:0px !important; padding-bottom:0 !important; }
[data-slot='sidebar.workspaces'] { display:flex; flex-direction:column; min-height:0; }
[data-slot='sidebar.workspaces'] > :not(.ipaper-sidebar-launcher-seat) { flex:1 1 auto; min-height:0; }
.ipaper-sidebar-launcher-seat { box-sizing:border-box; order:-1; width:100%; flex:none; padding:2px 8px 10px; }
.ipaper-sidebar-launcher-seat:not([data-wide='true']) { display:grid; place-items:center; padding:2px 0 10px; }
.ipaper-sidebar-button { appearance:none; box-sizing:border-box; width:100%; min-width:40px; min-height:44px; display:flex; align-items:center; justify-content:flex-start; gap:10px; padding:5px 7px; border:1px solid transparent; border-radius:12px; color:var(--dsw-alias-label-secondary); background:transparent; cursor:pointer; font:600 13px/20px Inter,ui-sans-serif,system-ui,sans-serif; text-align:left; transition:color 140ms ease,background-color 140ms ease,border-color 140ms ease,box-shadow 140ms ease,transform 140ms ease; }
.ipaper-sidebar-button:not([data-wide='true']) { width:40px; min-width:40px; min-height:40px; justify-content:center; padding:4px; }
.ipaper-sidebar-button-icon { width:32px; height:32px; display:grid; flex:none; place-items:center; border-radius:9px; color:#b87520; background:color-mix(in srgb,#c88428 10%,var(--dsw-alias-bg-layer-2)); transition:color 140ms ease,background-color 140ms ease,box-shadow 140ms ease; }
.ipaper-sidebar-button:not([data-wide='true']) .ipaper-sidebar-button-icon { width:30px; height:30px; border-radius:8px; }
.ipaper-sidebar-button-label { min-width:0; flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.ipaper-sidebar-button-chevron { display:grid; flex:none; place-items:center; color:var(--dsw-alias-label-caption); opacity:.65; transition:transform 140ms ease,opacity 140ms ease; }
.ipaper-sidebar-button:hover:not(:disabled) { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); background:var(--dsw-alias-interactive-bg-hover); box-shadow:0 1px 2px color-mix(in srgb,#000 8%,transparent); }
.ipaper-sidebar-button:hover:not(:disabled) .ipaper-sidebar-button-chevron { opacity:1; transform:translateX(1px); }
.ipaper-sidebar-button:active:not(:disabled) { transform:translateY(1px); box-shadow:none; }
.ipaper-sidebar-button[data-active='true'] { color:var(--dsw-alias-label-primary); border-color:color-mix(in srgb,#c88428 24%,var(--dsw-alias-border-l1)); background:color-mix(in srgb,#c88428 7%,var(--dsw-alias-bg-layer-1)); box-shadow:inset 2px 0 #c88428; }
.ipaper-sidebar-button[data-active='true']:not([data-wide='true']) { border-color:color-mix(in srgb,#c88428 38%,var(--dsw-alias-border-l1)); box-shadow:0 0 0 1px color-mix(in srgb,#c88428 10%,transparent); }
.ipaper-sidebar-button[data-active='true'] .ipaper-sidebar-button-icon { color:#d19038; background:color-mix(in srgb,#c88428 16%,var(--dsw-alias-bg-layer-2)); }
.ipaper-sidebar-button[data-active='true'] .ipaper-sidebar-button-chevron { transform:rotate(180deg); opacity:.9; }
.ipaper-sidebar-button:focus-visible { outline:2px solid color-mix(in srgb,#c88428 65%,transparent); outline-offset:2px; }
.ipaper-sidebar-button:disabled { opacity:.42; cursor:default; }
.ipaper-sidebar-button svg { display:block; flex:none; }
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
.ipaper-question-empty { padding:clamp(22px,5vw,56px); border:1px solid var(--dsw-alias-border-l1); border-radius:16px; background:linear-gradient(135deg,color-mix(in srgb,#c88428 7%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1) 45%); }
.ipaper-question-empty h2 { max-width:700px; margin:3px 0 0; font:500 clamp(24px,4vw,42px)/1.08 Georgia,'Times New Roman',serif; letter-spacing:-.025em; }
.ipaper-question-empty>p:not(.ipaper-view-kicker) { max-width:680px; margin:13px 0 0; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:21px; }
.ipaper-question-start { appearance:none; display:flex; align-items:center; gap:12px; margin-top:20px; padding:9px 12px; border:1px solid color-mix(in srgb,#c88428 40%,var(--dsw-alias-border-l1)); border-radius:10px; color:var(--dsw-alias-label-primary); background:color-mix(in srgb,#c88428 10%,var(--dsw-alias-bg-layer-2)); cursor:pointer; font:650 11px/18px Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-question-start:hover { background:color-mix(in srgb,#c88428 16%,var(--dsw-alias-bg-layer-2)); }.ipaper-question-start:focus-visible,.ipaper-question-continue:focus-visible { outline:2px solid color-mix(in srgb,#c88428 65%,transparent); outline-offset:2px; }
.ipaper-question-start code { padding:2px 7px; border-radius:6px; color:#a86716; background:var(--dsw-alias-bg-layer-1); font:600 10px/16px ui-monospace,SFMono-Regular,Menlo,monospace; }
.ipaper-question-continue { appearance:none; padding:5px 9px; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; color:#a86716; background:var(--dsw-alias-bg-layer-1); cursor:pointer; font:650 10px/16px Inter,ui-sans-serif,system-ui,sans-serif; white-space:nowrap; }
.ipaper-question-continue:hover { border-color:color-mix(in srgb,#c88428 36%,var(--dsw-alias-border-l1)); background:color-mix(in srgb,#c88428 8%,var(--dsw-alias-bg-layer-1)); }
.ipaper-question-empty ol { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin:30px 0 0; padding:0; list-style:none; counter-reset:step; }
.ipaper-question-empty li { min-width:0; padding:13px; border-top:2px solid color-mix(in srgb,#c88428 38%,var(--dsw-alias-border-l1)); background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 70%,transparent); counter-increment:step; }
.ipaper-question-empty li::before { content:'0' counter(step); display:block; margin-bottom:9px; color:#c88428; font:600 9px/14px ui-monospace,SFMono-Regular,Menlo,monospace; }
.ipaper-question-empty li strong,.ipaper-question-empty li span { display:block; }
.ipaper-question-empty li strong { font-size:12px; }
.ipaper-question-empty li span { margin-top:3px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:15px; }
.ipaper-question-progress { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; }
.ipaper-question-progress article { min-width:0; padding:13px 14px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-question-progress strong,.ipaper-question-progress span,.ipaper-question-progress small { display:block; }
.ipaper-question-progress strong { font:500 25px/28px Georgia,'Times New Roman',serif; }
.ipaper-question-progress span { margin-top:2px; font-size:11px; font-weight:650; }
.ipaper-question-progress small { margin-top:7px; overflow:hidden; color:var(--dsw-alias-label-tertiary); font-size:9px; line-height:14px; text-overflow:ellipsis; white-space:nowrap; }
.ipaper-boundary-card { padding:0; overflow:hidden; }
.ipaper-boundary-card>.ipaper-view-section-head { margin:0; padding:15px 16px 12px; }
.ipaper-question-table-wrap { overflow-x:auto; border-top:1px solid var(--dsw-alias-border-l1); }
.ipaper-question-table { width:100%; min-width:800px; border-collapse:collapse; table-layout:fixed; }
.ipaper-question-table th { padding:8px 12px; color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); font-size:9px; font-weight:750; letter-spacing:.08em; text-align:left; text-transform:uppercase; }
.ipaper-question-table th:first-child { width:26%; }.ipaper-question-table th:nth-child(2) { width:31%; }.ipaper-question-table th:nth-child(3) { width:21%; }.ipaper-question-table th:nth-child(4) { width:22%; }
.ipaper-question-table td { padding:13px 12px; border-top:1px solid var(--dsw-alias-border-l1); vertical-align:top; font-size:11px; line-height:16px; overflow-wrap:anywhere; }
.ipaper-question-table tbody tr:first-child td { border-top:0; }
.ipaper-question-table td>strong { display:block; font:500 14px/18px Georgia,'Times New Roman',serif; }
.ipaper-question-table td>p { margin:4px 0 8px; color:var(--dsw-alias-label-tertiary); }
.ipaper-question-table td>ul { margin:0; padding-left:15px; }.ipaper-question-table td>ul li+li { margin-top:5px; }
.ipaper-question-table em { color:var(--dsw-alias-label-caption); font-style:normal; }
.ipaper-coverage+.ipaper-coverage { margin-top:9px; padding-top:9px; border-top:1px dashed var(--dsw-alias-border-l1); }
.ipaper-coverage strong,.ipaper-coverage span { display:block; }
.ipaper-coverage strong { font-size:11px; }.ipaper-coverage span { margin-top:2px; color:var(--dsw-alias-label-tertiary); font-size:9px; line-height:14px; }
.ipaper-candidate-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.ipaper-candidate-grid article { min-width:0; padding:15px; border:1px solid var(--dsw-alias-border-l1); border-radius:13px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-candidate-grid article[data-selected='true'] { border-color:color-mix(in srgb,#c88428 42%,var(--dsw-alias-border-l1)); box-shadow:inset 3px 0 #c88428; }
.ipaper-candidate-grid article>div { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ipaper-question-stage { color:var(--dsw-alias-label-tertiary); font-size:9px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
.ipaper-candidate-grid h3 { margin:12px 0 0; font:500 16px/21px Georgia,'Times New Roman',serif; }
.ipaper-candidate-grid article>p { margin:5px 0 0; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:17px; }
.ipaper-candidate-grid footer { display:flex; flex-wrap:wrap; gap:5px; margin-top:15px; }
.ipaper-question-gate { padding:3px 7px; border:1px solid var(--dsw-alias-border-l1); border-radius:999px; color:var(--dsw-alias-label-tertiary); font-size:9px; line-height:14px; }
.ipaper-question-gate[data-level='high'] { color:#397c5b; border-color:color-mix(in srgb,#428b68 30%,var(--dsw-alias-border-l1)); background:color-mix(in srgb,#428b68 8%,transparent); }
.ipaper-question-gate[data-level='low'] { color:#a86716; border-color:color-mix(in srgb,#c88428 32%,var(--dsw-alias-border-l1)); background:color-mix(in srgb,#c88428 8%,transparent); }
@media(max-width:900px){.ipaper-view-lenses{grid-template-columns:repeat(2,minmax(140px,1fr))}.ipaper-view-columns{grid-template-columns:1fr}.ipaper-question-empty ol{grid-template-columns:repeat(2,minmax(0,1fr))}.ipaper-question-progress{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.ipaper-view{padding:14px}.ipaper-view-title-row{align-items:flex-start;flex-direction:column;gap:6px}.ipaper-view-lenses{grid-template-columns:1fr}.ipaper-view-item{grid-template-columns:minmax(0,1fr) auto}.ipaper-view-kind{grid-column:1/-1}.ipaper-question-empty ol,.ipaper-question-progress,.ipaper-candidate-grid{grid-template-columns:1fr}}
`
