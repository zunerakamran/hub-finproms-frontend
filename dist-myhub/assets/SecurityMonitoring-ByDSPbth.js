import{r as c,j as e}from"./react-vendor-BrnG2GJc.js";import{a as rs,u as ls,c as g,af as se,as as is,K as De,ae as ze,au as Fe,ay as D,ap as cs,ah as Re,F as os}from"./website-compliance-BKiuum3I.js";import"./dompurify-DqNA57iZ.js";const ds=[{id:"events",label:"Events",cap:"secmon_view_events"},{id:"incidents",label:"Incidents",cap:"secmon_view_events"},{id:"report",label:"Report",cap:"secmon_view_report"},{id:"settings",label:"Alert settings",cap:"secmon_manage_alerts"},{id:"access",label:"Access restrictions",cap:"secmon_manage_access"}],Ee={uk_only:!1,uk_cities_enabled:!1,uk_cities:[],restrict_countries_enabled:!1,restricted_countries:[],allow_countries_enabled:!1,allowed_countries:[],restrict_ips_enabled:!1,restricted_ips:[],allow_ips_enabled:!1,allowed_ips:[]};function O(d){return Array.isArray(d)?[...new Set(d.map(t=>String(t).trim()).filter(Boolean))]:[...new Set(String(d||"").split(/[\n,;]+/).map(t=>t.trim()).filter(Boolean))]}function $(d){return Array.isArray(d)?d.join(", "):d||""}function G(d){const t=String(d||"").toLowerCase();return t==="critical"||t==="high"?"gc-status gc-status--bad":t==="medium"?"gc-status gc-status--awf":t==="low"?"gc-status gc-status--pending":"gc-status"}function ee(d){const t=String(d||"").toLowerCase();return t==="resolved"||t==="closed"||t==="false_positive"?"gc-status gc-status--ok":t==="investigating"||t==="acknowledged"?"gc-status gc-status--awf":"gc-status gc-status--pending"}function ms(d){const t=String(d||"").toLowerCase();return t==="pass"||t==="ok"||t==="success"?"alert success secmon-alert":t==="fail"||t==="error"?"alert secmon-alert":"alert secmon-alert secmon-alert--warn"}function us(d){const t=String(d||"").toLowerCase();return t==="pass"||t==="ok"||t==="success"?"secmon-card secmon-card--ok":t==="fail"||t==="error"?"secmon-card secmon-card--danger":"secmon-card secmon-card--warn"}function y({children:d,className:t}){return e.jsx("span",{className:t,children:d})}function ce({label:d,value:t,hint:v}){return e.jsxs("article",{className:"secmon-stat",children:[e.jsx("p",{className:"secmon-stat__value",children:t??0}),e.jsx("p",{className:"secmon-stat__label",children:d}),v?e.jsx("p",{className:"secmon-stat__hint",children:v}):null]})}function Ue({title:d,onClose:t,children:v}){return e.jsxs("aside",{className:"secmon-drawer",role:"dialog","aria-label":d,children:[e.jsxs("div",{className:"secmon-drawer__head",children:[e.jsx("h2",{children:d}),e.jsx(se,{icon:os,label:"Close",onClick:t})]}),e.jsx("div",{className:"secmon-drawer__body",children:v})]})}function xs(){var ve,we,Ne,ke,Se,Ce,Ae,Me,Ie;const{isPowerAdmin:d}=rs(),{can:t,loading:v,actingHubId:Te}=ls(),h=d,W=t("security_monitoring"),z=t("secmon_view_events"),k=t("secmon_view_report"),H=t("secmon_manage_incidents"),S=t("secmon_manage_alerts"),V=t("secmon_manage_access"),P=t("secmon_manage_disaster_recovery"),ae=W&&(z||k||S||V||P),L=c.useMemo(()=>ds.filter(s=>W?s.id==="events"||s.id==="incidents"?z:s.id==="report"?k:s.id==="settings"?S:s.id==="access"?V:!1:!1),[W,z,k,S,V]),[m,Y]=c.useState("events"),[r,Oe]=c.useState(null),[Ve,Pe]=c.useState([]),[Be,Le]=c.useState([]),[p,oe]=c.useState(null),[x,F]=c.useState(null),[i,J]=c.useState(null),[qe,Ke]=c.useState({rules:[],suggested_uk_cities:[]}),[b,Q]=c.useState(null),[l,C]=c.useState(null),[de,X]=c.useState([]),[q,me]=c.useState(""),[Z,ue]=c.useState(""),[A,te]=c.useState(!0),[he,u]=c.useState(""),[pe,R]=c.useState(""),[M,E]=c.useState({q:"",severity:"",category:"",status:"",from:"",to:""}),[N,ge]=c.useState({q:"",severity:"",category:"",status:"",from:"",to:""}),[_,U]=c.useState({title:"",description:"",severity:"medium",category:"manual",affected_module:"",recognize_disaster:!1}),[xe,ne]=c.useState(""),[_e,fe]=c.useState(""),[I,f]=c.useState(!1),[re,be]=c.useState(!1),[je,B]=c.useState(""),[$e,K]=c.useState("");c.useEffect(()=>{L.length&&!L.some(s=>s.id===m)&&Y(L[0].id)},[L,m]);const T=c.useCallback(async()=>{var s,a;if(v||!ae){te(!1);return}te(!0),u("");try{if(z||k)try{const o=await g.securityMonitoringOptions({asPowerAdmin:h});Oe(o)}catch{}const n={per_page:50,q:N.q||void 0,severity:N.severity||void 0,category:N.category||void 0,status:N.status||void 0,from:N.from||void 0,to:N.to||void 0};if(m==="events"&&z){const o=await g.securityMonitoringEvents(n,{asPowerAdmin:h});Pe(o.data||[])}if(m==="incidents"&&z){const o=await g.securityMonitoringIncidents(n,{asPowerAdmin:h});Le(o.data||[])}if(m==="report"&&k){const o=await g.securityMonitoringReport({from:N.from||void 0,to:N.to||void 0},{asPowerAdmin:h});oe(o.report||null)}if(m==="settings"&&S){const o=await g.securityMonitoringAlertSettings({asPowerAdmin:h});F(o.data||null)}if(m==="access"&&V){const o=await g.securityMonitoringAccessSettings({asPowerAdmin:h});J({...Ee,...o.data||{}}),Ke({rules:((s=o.options)==null?void 0:s.rules)||[],suggested_uk_cities:((a=o.options)==null?void 0:a.suggested_uk_cities)||[]})}}catch(n){u(n.message||"Failed to load security monitoring.")}finally{te(!1)}},[v,ae,m,N,h,z,k,S,V,Te]);c.useEffect(()=>{T()},[T]);const ye=async s=>{try{const a=await g.securityMonitoringEvent(s,{asPowerAdmin:h});Q(a.data),C(null)}catch(a){u(a.message||"Failed to load event.")}},le=async s=>{if(!P||!s){X([]);return}try{const a=await g.securityMonitoringDisasterSnapshots({module:s,limit:40},{asPowerAdmin:h}),n=Array.isArray(a.data)?a.data:[];X(n);const o=n.find(w=>w.trigger!=="pre_rollback")||n[0];me(o?String(o.id):"")}catch{X([])}},ie=async s=>{var a,n,o;try{const w=await g.securityMonitoringIncident(s,{asPowerAdmin:h});C(w.data),fe(((a=w.data)==null?void 0:a.status)||""),ne(""),ue(((n=w.data)==null?void 0:n.affected_module)||""),R(""),Q(null),await le((o=w.data)==null?void 0:o.affected_module)}catch(w){u(w.message||"Failed to load incident.")}},Ge=async s=>{if(s.preventDefault(),!!H){f(!0),u("");try{const a={title:_.title,description:_.description||void 0,severity:_.severity,category:_.category};_.affected_module&&(a.affected_module=_.affected_module,a.recognize_disaster=!!_.recognize_disaster);const n=await g.securityMonitoringDeclareIncident(a,{asPowerAdmin:h});U({title:"",description:"",severity:"medium",category:"manual",affected_module:"",recognize_disaster:!1}),Y("incidents"),await ie(n.data.id),await T()}catch(a){u(a.message||"Failed to declare incident.")}finally{f(!1)}}},We=async()=>{if(!(!P||!l||!Z)){f(!0),u(""),R("");try{const s=await g.securityMonitoringRecognizeDisaster(l.id,{affected_module:Z},{asPowerAdmin:h});C(s.data),X(Array.isArray(s.snapshots)?s.snapshots:[]),R(s.message||"Disaster recognized."),await T()}catch(s){u(s.message||"Failed to recognize disaster.")}finally{f(!1)}}},He=async()=>{if(!(!P||!(l!=null&&l.affected_module))){f(!0),u(""),R("");try{const s=await g.securityMonitoringCreateDisasterSnapshot({module_key:l.affected_module,security_incident_id:l.id,label:`Manual snapshot for incident #${l.id}`},{asPowerAdmin:h});s.incident&&C(s.incident),R(s.message||"Snapshot created."),await le(l.affected_module)}catch(s){u(s.message||"Failed to create snapshot.")}finally{f(!1)}}},Ye=async()=>{var a;if(!(!P||!l||!q||!window.confirm(`Roll back only ${l.affected_module_label||l.affected_module} to snapshot #${q}?

This overwrites that module's data only — not the whole hub. A safety snapshot of the current module state is taken first.`))){f(!0),u(""),R("");try{const n=await g.securityMonitoringRollbackDisaster(l.id,{snapshot_id:Number(q)},{asPowerAdmin:h});C(n.data),R(n.message||"Module rolled back."),await le((a=n.data)==null?void 0:a.affected_module),await T()}catch(n){u(n.message||"Rollback failed.")}finally{f(!1)}}},Je=async s=>{if(s.preventDefault(),!(!H||!l)){f(!0),u("");try{const a=await g.securityMonitoringUpdateIncident(l.id,{status:_e||void 0,note:xe||void 0},{asPowerAdmin:h});C(a.data),ne(""),await T()}catch(a){u(a.message||"Failed to update incident.")}finally{f(!1)}}},Qe=async()=>{var s,a;if(!(!k&&!S)){be(!0),B(""),K(""),u("");try{const n=await g.securityMonitoringScanNow({asPowerAdmin:h});n.report&&oe(n.report);const o=((s=n.data)==null?void 0:s.status)||"done";K(o),B(((a=n.data)==null?void 0:a.summary)||`Scan finished: ${o}`),m!=="report"&&Y("report")}catch(n){u(n.message||"Failed to run security check now.")}finally{be(!1)}}},Xe=async s=>{if(s.preventDefault(),!(!S||!x)){f(!0),u("");try{const a=await g.securityMonitoringUpdateAlertSettings({alert_min_severity:x.alert_min_severity,alert_email_enabled:!!x.alert_email_enabled,alert_emails:Array.isArray(x.alert_emails)?x.alert_emails:String(x.alert_emails||"").split(",").map(n=>n.trim()).filter(Boolean),failed_login_threshold:Number(x.failed_login_threshold)||5,failed_login_window_minutes:Number(x.failed_login_window_minutes)||15},{asPowerAdmin:h});F(a.data),K("pass"),B("Alert settings saved.")}catch(a){u(a.message||"Failed to save alert settings.")}finally{f(!1)}}},Ze=async s=>{if(s.preventDefault(),!(!V||!i)){f(!0),u(""),B("");try{const a={uk_only:!!i.uk_only,uk_cities_enabled:!!i.uk_cities_enabled,uk_cities:O(i.uk_cities),restrict_countries_enabled:!!i.restrict_countries_enabled,restricted_countries:O(i.restricted_countries).map(o=>o.toUpperCase()),allow_countries_enabled:!!i.allow_countries_enabled,allowed_countries:O(i.allowed_countries).map(o=>o.toUpperCase()),restrict_ips_enabled:!!i.restrict_ips_enabled,restricted_ips:O(i.restricted_ips),allow_ips_enabled:!!i.allow_ips_enabled,allowed_ips:O(i.allowed_ips)},n=await g.securityMonitoringUpdateAccessSettings(a,{asPowerAdmin:h});J({...Ee,...n.data||a}),K("pass"),B("Access restrictions saved.")}catch(a){u(a.message||"Failed to save access restrictions.")}finally{f(!1)}}},es=s=>{J(a=>{if(!a)return a;const n=O(a.uk_cities),o=n.includes(s)?n.filter(w=>w!==s):[...n,s];return{...a,uk_cities:o,uk_cities_enabled:!0}})},j=(s,a)=>{J(n=>n&&{...n,[s]:a})},ss=s=>{s.preventDefault(),ge({...M,q:M.q.trim()})},as=()=>{const s={q:"",severity:"",category:"",status:"",from:"",to:""};E(s),ge(s)},ts=[{key:"occurred",label:"When",date:!0,render:s=>e.jsx(Re,{value:s.occurred_at}),filterValue:s=>D(s.occurred_at,""),sortValue:s=>s.occurred_at?new Date(s.occurred_at).getTime():0},{key:"severity",label:"Severity",fit:!0,render:s=>e.jsx(y,{className:G(s.severity),children:s.severity}),filterValue:s=>s.severity||""},{key:"title",label:"What happened",render:s=>e.jsx("button",{type:"button",className:"secmon-link",onClick:()=>ye(s.id),children:s.title}),filterValue:s=>s.title||""},{key:"category",label:"Category",fit:!0,render:s=>s.category_label||s.category,filterValue:s=>s.category_label||s.category||""},{key:"ip",label:"Source IP",fit:!0,render:s=>s.source_ip||"—",filterValue:s=>s.source_ip||""},{key:"status",label:"Status",fit:!0,render:s=>e.jsx(y,{className:ee(s.status),children:s.status}),filterValue:s=>s.status||""}],ns=[{key:"created",label:"Opened",date:!0,render:s=>e.jsx(Re,{value:s.created_at}),filterValue:s=>D(s.created_at,""),sortValue:s=>s.created_at?new Date(s.created_at).getTime():0},{key:"severity",label:"Severity",fit:!0,render:s=>e.jsx(y,{className:G(s.severity),children:s.severity}),filterValue:s=>s.severity||""},{key:"title",label:"Incident",render:s=>e.jsx("button",{type:"button",className:"secmon-link",onClick:()=>ie(s.id),children:s.title}),filterValue:s=>s.title||""},{key:"status",label:"Status",fit:!0,render:s=>e.jsx(y,{className:ee(s.status),children:s.status}),filterValue:s=>s.status||""},{key:"module",label:"Module",render:s=>s.disaster_recognized?e.jsxs("span",{children:[e.jsx(y,{className:"gc-status gc-status--bad",children:"Disaster"})," ",s.affected_module_label||s.affected_module||"—"]}):s.affected_module_label||s.affected_module||"—",filterValue:s=>s.affected_module_label||s.affected_module||""},{key:"events",label:"Events",narrow:!0,render:s=>s.events_count??"—",filterValue:s=>String(s.events_count??"")}];return!v&&!ae?e.jsx("section",{children:e.jsx("div",{className:"page-head",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Security monitoring"}),e.jsx("p",{className:"muted",children:W?"You do not have permission to view Security Monitoring.":"Security Monitoring is off for this hub. Enable it under Functionalities."})]})})}):e.jsxs("section",{className:"secmon-page",children:[e.jsxs("div",{className:"page-head",children:[e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Security monitoring"}),e.jsx("p",{className:"muted",children:"Review security events as they happen — when, what, severity, and status. Use Monitor now for an on-demand dependency check."})]}),e.jsxs("div",{className:"actions",children:[e.jsx(se,{icon:is,label:"Refresh",onClick:T,disabled:A||re}),(k||S)&&e.jsxs("button",{type:"button",className:"btn primary",onClick:Qe,disabled:re,children:[e.jsx(De,{"aria-hidden":!0})," ",re?"Monitoring…":"Monitor now"]})]})]}),je?e.jsx("div",{className:ms($e),children:je}):null,he?e.jsx("div",{className:"alert",children:he}):null,e.jsx("div",{className:"tab-row",role:"tablist","aria-label":"Security monitoring views",children:L.map(s=>e.jsx("button",{type:"button",className:`btn ghost ${m===s.id?"active":""}`,onClick:()=>{Y(s.id),Q(null),C(null),B(""),K("")},children:s.label},s.id))}),(m==="events"||m==="incidents"||m==="report")&&e.jsxs("form",{className:"filters-row st-queue-filters",onSubmit:ss,children:[e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Search"}),e.jsx("input",{value:M.q,onChange:s=>E(a=>({...a,q:s.target.value})),placeholder:"Title, IP, email…"})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Severity"}),e.jsxs("select",{value:M.severity,onChange:s=>E(a=>({...a,severity:s.target.value})),children:[e.jsx("option",{value:"",children:"All"}),((r==null?void 0:r.severities)||[]).map(s=>e.jsx("option",{value:s,children:s},s))]})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Category"}),e.jsxs("select",{value:M.category,onChange:s=>E(a=>({...a,category:s.target.value})),children:[e.jsx("option",{value:"",children:"All"}),((r==null?void 0:r.categories)||[]).map(s=>e.jsx("option",{value:s.key,children:s.label},s.key))]})]}),(m==="events"||m==="incidents")&&e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Status"}),e.jsxs("select",{value:M.status,onChange:s=>E(a=>({...a,status:s.target.value})),children:[e.jsx("option",{value:"",children:"All"}),(m==="incidents"?r==null?void 0:r.statuses:(r==null?void 0:r.event_statuses)||(r==null?void 0:r.statuses)||[]).map(s=>e.jsx("option",{value:s,children:s},s))]})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"From"}),e.jsx("input",{type:"date",value:M.from,onChange:s=>E(a=>({...a,from:s.target.value}))})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"To"}),e.jsx("input",{type:"date",value:M.to,onChange:s=>E(a=>({...a,to:s.target.value}))})]}),e.jsxs("div",{className:"filters-row__actions",children:[e.jsx("button",{type:"submit",className:"btn primary",disabled:A,children:"Apply"}),e.jsx("button",{type:"button",className:"btn",onClick:as,disabled:A,children:"Clear"})]})]}),m==="events"&&e.jsx(ze,{columns:ts,rows:Ve,loading:A||v,emptyMessage:"No security events yet for this filter.",pageSize:15,actions:s=>e.jsx(se,{icon:Fe,label:"Open",onClick:()=>ye(s.id)})}),m==="incidents"&&e.jsxs("div",{className:"secmon-incidents",children:[H&&e.jsxs("form",{className:"secmon-card",onSubmit:Ge,children:[e.jsx("h2",{children:"Declare incident"}),e.jsx("p",{className:"muted",children:"Manually record something found outside automated detectors."}),e.jsxs("div",{className:"secmon-form-grid",children:[e.jsxs("label",{className:"filters-row__field secmon-span-2",children:[e.jsx("span",{className:"filters-row__label",children:"Title"}),e.jsx("input",{required:!0,value:_.title,onChange:s=>U(a=>({...a,title:s.target.value})),placeholder:"Short summary"})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Severity"}),e.jsx("select",{value:_.severity,onChange:s=>U(a=>({...a,severity:s.target.value})),children:((r==null?void 0:r.severities)||["medium"]).map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Category"}),e.jsx("select",{value:_.category,onChange:s=>U(a=>({...a,category:s.target.value})),children:((r==null?void 0:r.categories)||[]).map(s=>e.jsx("option",{value:s.key,children:s.label},s.key))})]}),e.jsxs("label",{className:"filters-row__field secmon-span-2",children:[e.jsx("span",{className:"filters-row__label",children:"What happened"}),e.jsx("textarea",{rows:3,value:_.description,onChange:s=>U(a=>({...a,description:s.target.value})),placeholder:"Describe the security issue…"})]}),e.jsxs("label",{className:"filters-row__field secmon-span-2",children:[e.jsx("span",{className:"filters-row__label",children:"Affected module (for disaster recovery)"}),e.jsxs("select",{value:_.affected_module,onChange:s=>U(a=>({...a,affected_module:s.target.value})),children:[e.jsx("option",{value:"",children:"None / unknown"}),((r==null?void 0:r.recoverable_modules)||[]).map(s=>e.jsx("option",{value:s.key,children:s.label},s.key))]})]}),_.affected_module?e.jsxs("label",{className:"filters-row__field secmon-span-2 secmon-check",children:[e.jsx("input",{type:"checkbox",checked:!!_.recognize_disaster,onChange:s=>U(a=>({...a,recognize_disaster:s.target.checked}))}),e.jsx("span",{children:"Recognize as module disaster now (enables snapshot / rollback for this module only)"})]}):null]}),e.jsx("div",{className:"filters-row__actions",children:e.jsx("button",{type:"submit",className:"btn primary",disabled:I,children:"Declare incident"})})]}),e.jsx(ze,{columns:ns,rows:Be,loading:A||v,emptyMessage:"No security incidents yet.",pageSize:15,actions:s=>e.jsx(se,{icon:Fe,label:"Open",onClick:()=>ie(s.id)})})]}),m==="report"&&e.jsx("div",{className:"secmon-report",children:A?e.jsx("p",{className:"muted",children:"Loading report…"}):p?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"secmon-stat-grid",children:[e.jsx(ce,{label:"Events",value:((ve=p.totals)==null?void 0:ve.events)??0}),e.jsx(ce,{label:"Open high / critical",value:((we=p.totals)==null?void 0:we.open_high_critical_incidents)??0}),e.jsx(ce,{label:"Dependency scan",value:((Ne=p.dependency_scan)==null?void 0:Ne.status)||"unknown",hint:(ke=p.dependency_scan)!=null&&ke.last_at?D(p.dependency_scan.last_at):"Never run — use Monitor now"})]}),(Se=p.dependency_scan)!=null&&Se.summary?e.jsxs("div",{className:us((Ce=p.dependency_scan)==null?void 0:Ce.status),children:[String(((Ae=p.dependency_scan)==null?void 0:Ae.status)||"").toLowerCase()==="pass"?e.jsx(De,{"aria-hidden":!0}):e.jsx(cs,{"aria-hidden":!0}),e.jsx("p",{children:p.dependency_scan.summary})]}):null,e.jsxs("div",{className:"secmon-report-grid",children:[e.jsxs("div",{className:"secmon-card",children:[e.jsx("h3",{children:"By severity"}),Object.keys(p.by_severity||{}).length===0?e.jsx("p",{className:"muted",children:"No data."}):e.jsx("ul",{className:"secmon-list",children:Object.entries(p.by_severity||{}).map(([s,a])=>e.jsxs("li",{children:[e.jsx(y,{className:G(s),children:s}),e.jsx("strong",{children:a})]},s))})]}),e.jsxs("div",{className:"secmon-card",children:[e.jsx("h3",{children:"By category"}),Object.keys(p.by_category||{}).length===0?e.jsx("p",{className:"muted",children:"No data."}):e.jsx("ul",{className:"secmon-list",children:Object.entries(p.by_category||{}).map(([s,a])=>e.jsxs("li",{children:[e.jsx("span",{children:s}),e.jsx("strong",{children:a})]},s))})]}),e.jsxs("div",{className:"secmon-card",children:[e.jsx("h3",{children:"Top source IPs"}),(p.top_source_ips||[]).length===0?e.jsx("p",{className:"muted",children:"No data."}):e.jsx("ul",{className:"secmon-list",children:(p.top_source_ips||[]).map(s=>e.jsxs("li",{children:[e.jsx("code",{children:s.source_ip}),e.jsx("strong",{children:s.total})]},s.source_ip))})]})]}),e.jsxs("p",{className:"muted",children:["Generated ",D(p.generated_at)]})]}):e.jsx("p",{className:"muted",children:"No report data yet."})}),m==="settings"&&e.jsx("div",{className:"secmon-settings",children:A||!x?e.jsx("p",{className:"muted",children:"Loading settings…"}):e.jsxs("form",{className:"secmon-card",onSubmit:Xe,children:[e.jsx("h2",{children:"Alert settings"}),e.jsx("p",{className:"muted",children:"Configure thresholds used by real-time detectors."}),e.jsxs("div",{className:"secmon-form-grid",children:[e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Alert minimum severity"}),e.jsx("select",{value:x.alert_min_severity||"high",onChange:s=>F(a=>({...a,alert_min_severity:s.target.value})),children:((r==null?void 0:r.severities)||[]).map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Failed login threshold"}),e.jsx("input",{type:"number",min:2,max:100,value:x.failed_login_threshold??5,onChange:s=>F(a=>({...a,failed_login_threshold:s.target.value}))})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Failed login window (minutes)"}),e.jsx("input",{type:"number",min:1,max:1440,value:x.failed_login_window_minutes??15,onChange:s=>F(a=>({...a,failed_login_window_minutes:s.target.value}))})]}),e.jsxs("label",{className:"filters-row__field secmon-span-2 secmon-check",children:[e.jsx("input",{type:"checkbox",checked:!!x.alert_email_enabled,onChange:s=>F(a=>({...a,alert_email_enabled:s.target.checked}))}),e.jsx("span",{children:"Email alerts enabled"})]}),e.jsxs("label",{className:"filters-row__field secmon-span-2",children:[e.jsx("span",{className:"filters-row__label",children:"Alert emails (comma-separated)"}),e.jsx("input",{value:Array.isArray(x.alert_emails)?x.alert_emails.join(", "):x.alert_emails||"",onChange:s=>F(a=>({...a,alert_emails:s.target.value})),placeholder:"ops@example.com, security@example.com"})]})]}),e.jsx("div",{className:"filters-row__actions",children:e.jsx("button",{type:"submit",className:"btn primary",disabled:I,children:"Save settings"})})]})}),m==="access"&&e.jsx("div",{className:"secmon-settings",children:A||!i?e.jsx("p",{className:"muted",children:"Loading access restrictions…"}):e.jsxs("form",{className:"secmon-card",onSubmit:Ze,children:[e.jsx("h2",{children:"Access restrictions"}),e.jsxs("p",{className:"muted",children:["Rules combine with overrides (most specific wins):"," ",e.jsx("strong",{children:"Restrict IPs"})," always block those addresses (even inside an allowed country/UK)."," ",e.jsx("strong",{children:"Allow IPs"})," always let those addresses through (even from a restricted country)."," ",e.jsx("strong",{children:"Allow countries"})," can reopen a restricted country or extend UK-only. Env deny-list and temporary firewall blocks still apply."]}),e.jsxs("div",{className:"secmon-access-rules",children:[e.jsx("div",{className:"secmon-access-rule",children:e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.uk_only,onChange:s=>j("uk_only",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"UK only"}),e.jsx("span",{className:"muted",children:" — allow requests only from the United Kingdom"})]})]})}),e.jsxs("div",{className:"secmon-access-rule",children:[e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.uk_cities_enabled,onChange:s=>j("uk_cities_enabled",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"Specific UK cities"}),e.jsx("span",{className:"muted",children:" — allow only selected UK cities (must resolve as GB)"})]})]}),i.uk_cities_enabled?e.jsxs("div",{className:"secmon-access-rule__body",children:[e.jsx("div",{className:"secmon-chip-row",children:(qe.suggested_uk_cities||[]).map(s=>{const a=O(i.uk_cities).includes(s);return e.jsx("button",{type:"button",className:`btn ghost ${a?"active":""}`,onClick:()=>es(s),children:s},s)})}),e.jsx("textarea",{rows:3,value:$(i.uk_cities),onChange:s=>j("uk_cities",s.target.value),placeholder:"London, Manchester, Birmingham"})]}):null]}),e.jsxs("div",{className:"secmon-access-rule",children:[e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.restrict_countries_enabled,onChange:s=>j("restrict_countries_enabled",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"Restrict countries"}),e.jsx("span",{className:"muted",children:" — block selected countries (Allow IPs can override)"})]})]}),i.restrict_countries_enabled?e.jsxs("div",{className:"secmon-access-rule__body",children:[e.jsx("textarea",{rows:3,value:$(i.restricted_countries),onChange:s=>j("restricted_countries",s.target.value),placeholder:"RU, CN, KP"}),e.jsx("span",{className:"muted",children:"ISO 2-letter codes, comma or newline separated."})]}):null]}),e.jsxs("div",{className:"secmon-access-rule",children:[e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.allow_countries_enabled,onChange:s=>j("allow_countries_enabled",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"Allow countries"}),e.jsx("span",{className:"muted",children:" — allow these countries; also overrides Restrict countries / UK rules for them"})]})]}),i.allow_countries_enabled?e.jsxs("div",{className:"secmon-access-rule__body",children:[e.jsx("textarea",{rows:3,value:$(i.allowed_countries),onChange:s=>j("allowed_countries",s.target.value),placeholder:"GB, IE"}),e.jsx("span",{className:"muted",children:"ISO 2-letter codes, comma or newline separated."})]}):null]}),e.jsxs("div",{className:"secmon-access-rule",children:[e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.restrict_ips_enabled,onChange:s=>j("restrict_ips_enabled",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"Restrict IPs"}),e.jsx("span",{className:"muted",children:" — always block these IPs, even inside an allowed country/UK"})]})]}),i.restrict_ips_enabled?e.jsx("div",{className:"secmon-access-rule__body",children:e.jsx("textarea",{rows:3,value:$(i.restricted_ips),onChange:s=>j("restricted_ips",s.target.value),placeholder:`203.0.113.10
198.51.100.0/24`})}):null]}),e.jsxs("div",{className:"secmon-access-rule",children:[e.jsxs("label",{className:"checkbox-row secmon-access-check",children:[e.jsx("input",{type:"checkbox",checked:!!i.allow_ips_enabled,onChange:s=>j("allow_ips_enabled",s.target.checked)}),e.jsxs("span",{children:[e.jsx("strong",{children:"Allow IPs"}),e.jsx("span",{className:"muted",children:" — these IPs always allowed; override country / UK / city blocks"})]})]}),i.allow_ips_enabled?e.jsx("div",{className:"secmon-access-rule__body",children:e.jsx("textarea",{rows:3,value:$(i.allowed_ips),onChange:s=>j("allowed_ips",s.target.value),placeholder:`203.0.113.80
198.51.100.0/24`})}):null]})]}),e.jsx("div",{className:"filters-row__actions",style:{marginTop:"1rem"},children:e.jsx("button",{type:"submit",className:"btn primary",disabled:I,children:I?"Saving…":"Save access restrictions"})})]})}),b&&e.jsxs(Ue,{title:"Event detail",onClose:()=>Q(null),children:[e.jsxs("div",{className:"secmon-badges",children:[e.jsx(y,{className:G(b.severity),children:b.severity}),e.jsx(y,{className:ee(b.status),children:b.status})]}),e.jsxs("dl",{className:"secmon-dl",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"When"}),e.jsx("dd",{children:D(b.occurred_at)})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"What happened"}),e.jsx("dd",{children:b.description})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"Type"}),e.jsx("dd",{children:e.jsx("code",{children:b.event_type})})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"Source IP"}),e.jsx("dd",{children:b.source_ip||"—"})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"Actor"}),e.jsx("dd",{children:((Me=b.actor)==null?void 0:Me.email)||((Ie=b.actor)==null?void 0:Ie.name)||"anonymous / unknown"})]})]})]}),l&&e.jsxs(Ue,{title:`Incident #${l.id}`,onClose:()=>C(null),children:[e.jsxs("div",{className:"secmon-badges",children:[e.jsx(y,{className:G(l.severity),children:l.severity}),e.jsx(y,{className:ee(l.status),children:l.status})]}),e.jsxs("dl",{className:"secmon-dl",children:[e.jsxs("div",{children:[e.jsx("dt",{children:"Opened"}),e.jsx("dd",{children:D(l.created_at)})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"What happened"}),e.jsx("dd",{children:l.description||l.title})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"Affected module"}),e.jsxs("dd",{children:[l.affected_module_label||l.affected_module||"—",l.disaster_recognized?e.jsxs(e.Fragment,{children:[" ",e.jsx(y,{className:"gc-status gc-status--bad",children:"Disaster recognized"})]}):null]})]}),e.jsxs("div",{children:[e.jsx("dt",{children:"Recovery"}),e.jsx("dd",{children:l.recovery_status||"none"})]})]}),P&&e.jsxs("div",{className:"secmon-card secmon-dr-panel",children:[e.jsx("h3",{children:"Module disaster recovery"}),e.jsxs("p",{className:"muted",children:["Monitoring recognizes the incident; recovery rolls back"," ",e.jsx("strong",{children:"only the affected module"})," — not the whole hub or all code."]}),pe?e.jsx("div",{className:"alert success",children:pe}):null,l.disaster_recognized?e.jsxs("div",{className:"secmon-dr-actions",children:[e.jsx("button",{type:"button",className:"btn ghost",disabled:I,onClick:He,children:"Create module snapshot now"}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Roll back to snapshot"}),e.jsx("select",{value:q,onChange:s=>me(s.target.value),children:de.length===0?e.jsx("option",{value:"",children:"No snapshots yet"}):de.map(s=>e.jsxs("option",{value:String(s.id),children:["#",s.id," · ",s.label||s.trigger," ·"," ",D(s.created_at)]},s.id))})]}),e.jsx("button",{type:"button",className:"btn primary",disabled:I||!q,onClick:Ye,children:"Roll back module"})]}):e.jsxs("div",{className:"secmon-dr-actions",children:[e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Module where disaster happened"}),e.jsxs("select",{value:Z,onChange:s=>ue(s.target.value),children:[e.jsx("option",{value:"",children:"Select module…"}),((r==null?void 0:r.recoverable_modules)||[]).map(s=>e.jsx("option",{value:s.key,children:s.label},s.key))]})]}),e.jsx("button",{type:"button",className:"btn primary",disabled:I||!Z,onClick:We,children:"Recognize disaster"})]})]}),(l.investigation_notes||[]).length>0&&e.jsxs("div",{className:"secmon-notes",children:[e.jsx("h3",{children:"Investigation notes"}),e.jsx("ul",{children:l.investigation_notes.map(s=>e.jsxs("li",{children:[e.jsx("strong",{children:s.author_name||"User"}),e.jsxs("span",{className:"muted",children:[" · ",D(s.created_at)]}),e.jsx("p",{children:s.body})]},s.id))})]}),H&&e.jsxs("form",{className:"secmon-update",onSubmit:Je,children:[e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Status"}),e.jsx("select",{value:_e,onChange:s=>fe(s.target.value),children:((r==null?void 0:r.statuses)||[]).map(s=>e.jsx("option",{value:s,children:s},s))})]}),e.jsxs("label",{className:"filters-row__field",children:[e.jsx("span",{className:"filters-row__label",children:"Add note"}),e.jsx("textarea",{rows:3,placeholder:"Investigation note",value:xe,onChange:s=>ne(s.target.value)})]}),e.jsx("button",{type:"submit",className:"btn primary",disabled:I,children:"Update incident"})]})]}),e.jsx("style",{children:`
        .secmon-page .page-head .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .secmon-alert {
          margin-bottom: 1rem;
        }
        .secmon-alert--warn {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .secmon-link {
          background: none;
          border: 0;
          padding: 0;
          color: var(--brand, #1d4ed8);
          font: inherit;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .secmon-incidents,
        .secmon-report,
        .secmon-settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .secmon-card {
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          background: var(--panel, #fff);
          padding: 1rem 1.15rem;
          box-shadow: var(--shadow, 0 1px 2px rgba(15, 23, 42, 0.04));
        }
        .secmon-card h2,
        .secmon-card h3 {
          margin: 0 0 0.35rem;
          font-size: 1.05rem;
        }
        .secmon-dr-panel {
          margin: 1rem 0;
        }
        .secmon-dr-actions {
          display: grid;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .secmon-card--warn,
        .secmon-card--ok,
        .secmon-card--danger {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .secmon-card--warn {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .secmon-card--ok {
          background: #f0fdf4;
          border-color: #86efac;
          color: #166534;
        }
        .secmon-card--danger {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }
        .secmon-card--warn p,
        .secmon-card--ok p,
        .secmon-card--danger p {
          margin: 0;
        }
        .secmon-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          margin: 0.85rem 0 1rem;
        }
        .secmon-span-2 {
          grid-column: 1 / -1;
        }
        .secmon-form-grid textarea,
        .secmon-update textarea,
        .secmon-form-grid input,
        .secmon-form-grid select,
        .secmon-update select {
          width: 100%;
          min-height: 2.5rem;
        }
        .secmon-form-grid textarea,
        .secmon-update textarea {
          min-height: 5rem;
          resize: vertical;
        }
        .secmon-check {
          flex-direction: row !important;
          align-items: center;
          gap: 0.55rem !important;
        }
        .secmon-check input {
          width: auto;
          min-height: auto;
        }
        .secmon-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .secmon-chip-row .btn.ghost {
          font-size: 0.82rem;
          padding: 0.25rem 0.65rem;
        }
        .secmon-access-rules {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.85rem;
        }
        .secmon-access-rule {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        /* Beat global label { display:grid } so checkbox sits left of the title. */
        .secmon-page label.checkbox-row.secmon-access-check {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .secmon-page label.checkbox-row.secmon-access-check input[type='checkbox'] {
          flex: 0 0 auto;
          width: 1rem;
          height: 1rem;
          margin: 0.2rem 0 0;
          align-self: flex-start;
        }
        .secmon-page label.checkbox-row.secmon-access-check > span {
          flex: 1 1 auto;
          min-width: 0;
          line-height: 1.35;
          font-weight: 500;
        }
        .secmon-access-rule__body {
          margin-left: 1.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .secmon-access-rule__body textarea {
          width: 100%;
          min-height: 4.5rem;
          resize: vertical;
          font-weight: 400;
        }
        .secmon-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .secmon-stat {
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          padding: 1rem 1.1rem;
          background: var(--panel, #fff);
        }
        .secmon-stat__value {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 750;
          line-height: 1.1;
          text-transform: capitalize;
        }
        .secmon-stat__label {
          margin: 0.35rem 0 0;
          font-weight: 600;
        }
        .secmon-stat__hint {
          margin: 0.25rem 0 0;
          font-size: 0.82rem;
          color: var(--muted, #64748b);
        }
        .secmon-report-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .secmon-list {
          list-style: none;
          margin: 0.75rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .secmon-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }
        .secmon-drawer {
          margin-top: 1.25rem;
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          background: var(--panel, #fff);
          padding: 1rem 1.15rem;
        }
        .secmon-drawer__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }
        .secmon-drawer__head h2 {
          margin: 0;
          font-size: 1.15rem;
        }
        .secmon-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.85rem;
        }
        .secmon-dl {
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }
        .secmon-dl dt {
          font-size: 0.75rem;
          font-weight: 650;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted, #64748b);
          margin: 0 0 0.2rem;
        }
        .secmon-dl dd {
          margin: 0;
        }
        .secmon-notes {
          margin-top: 1rem;
        }
        .secmon-notes h3 {
          margin: 0 0 0.5rem;
          font-size: 0.95rem;
        }
        .secmon-notes ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .secmon-notes li {
          border-top: 1px solid var(--line, rgba(15, 23, 42, 0.1));
          padding-top: 0.65rem;
        }
        .secmon-notes p {
          margin: 0.35rem 0 0;
        }
        .secmon-update {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        @media (max-width: 900px) {
          .secmon-stat-grid,
          .secmon-report-grid,
          .secmon-form-grid {
            grid-template-columns: 1fr;
          }
            
          .secmon-span-2 {
            grid-column: auto;
          }
        }
      `})]})}export{xs as default};
