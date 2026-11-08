export const PAPER_PROJECT_STYLES = `
.ipaper-project-panel { height:100%; min-height:0; display:flex; flex-direction:column; color:var(--dsw-alias-label-primary); }
.ipaper-project-panel>header { display:flex; align-items:center; gap:16px; padding:14px 20px; padding-inline-start:max(20px,var(--dsh-frame-leading-clearance,0px)); border-bottom:1px solid var(--dsw-alias-border-l1); }
.ipaper-project-panel>header button { color:inherit; background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:6px; padding:6px 10px; cursor:pointer; }
.ipaper-project-panel>.ipaper-view { flex:1; min-height:0; }
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
.ipaper-view-shell>section { min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
.ipaper-view-shell h2 { margin:0 0 12px; font:500 20px/28px Georgia,'Times New Roman',serif; }
.ipaper-view-shell h3 { margin:0; font-size:14px; line-height:22px; overflow-wrap:anywhere; }
.ipaper-view-shell p { color:var(--dsw-alias-label-secondary); font-size:13px; line-height:21px; overflow-wrap:anywhere; }
.ipaper-view-shell article { padding:12px 0; border-bottom:1px solid var(--dsw-alias-border-l1); }
.ipaper-view-shell article:last-of-type { border-bottom:0; }
.ipaper-view-shell article p { white-space:pre-wrap; }
.ipaper-view-shell small { color:var(--dsw-alias-label-tertiary); font-size:11px; overflow-wrap:anywhere; }
.ipaper-view-empty,.ipaper-view-loading { box-sizing:border-box; display:grid; place-items:center; height:100%; padding:32px; text-align:center; color:var(--dsw-alias-label-tertiary); }
.ipaper-view-empty-mark { width:42px; height:52px; margin:0 auto 16px; border:1.5px solid var(--dsw-alias-border-l1); border-radius:4px 9px 4px 4px; }
.ipaper-view-empty h2 { margin:0; color:var(--dsw-alias-label-primary); font:500 20px/28px Georgia,'Times New Roman',serif; }
.ipaper-view-empty>p { max-width:480px; margin:8px 0 0; font-size:12px; line-height:20px; }
.ipaper-question-start { appearance:none; display:flex; align-items:center; gap:12px; margin-top:20px; padding:9px 12px; border:1px solid color-mix(in srgb,#c88428 40%,var(--dsw-alias-border-l1)); border-radius:10px; color:var(--dsw-alias-label-primary); background:color-mix(in srgb,#c88428 10%,var(--dsw-alias-bg-layer-2)); cursor:pointer; font:650 11px/18px Inter,ui-sans-serif,system-ui,sans-serif; }
.ipaper-question-start:hover { background:color-mix(in srgb,#c88428 16%,var(--dsw-alias-bg-layer-2)); }
.ipaper-question-start:focus-visible { outline:2px solid color-mix(in srgb,#c88428 65%,transparent); outline-offset:2px; }
@media(max-width:560px){.ipaper-view{padding:14px}.ipaper-view-title-row{align-items:flex-start;flex-direction:column;gap:6px}}
`
