import{r as o,j as e}from"./react-vendor-BrnG2GJc.js";import{a as Re,u as qe,c as N,al as Le,am as Ve,an as de,ao as Ee,ap as me,aq as Pe,ar as Be,as as Ie,ae as ue,at as pe,au as he,T as Ge,av as He,aw as Ke,ax as Oe,ay as We,af as Ye,F as Je,K as Qe}from"./website-compliance-CcpUqqYk.js";import{S as ye}from"./SocialMediaComplianceUI-BR2oZzwj.js";import"./dompurify-DqNA57iZ.js";import"./socialMediaCompliance-DDy8klsB.js";const T={"auth.login":"Signed in","auth.logout":"Signed out","auth.force_logout":"Force-logged out user","auth.login_failed":"Failed sign-in","auth.login_blocked":"Sign-in blocked","auth.register":"New registration","auth.email_verified":"Email verified","auth.login_otp_sent":"Login OTP sent","auth.login_otp_verified":"Login OTP verified","auth.profile_updated":"Profile updated","auth.terms_accepted":"Accepted terms","auth.privacy_accepted":"Acknowledged privacy policy","gdpr.export":"GDPR data export","gdpr.erase":"GDPR data erasure","activity_logs.view":"Viewed activity log","activity_logs.report":"Viewed activity report","modules.update":"Updated hub modules","gc.submit":"Submitted compliance item","gc.resubmit":"Resubmitted compliance item","gc.review":"Reviewed compliance item","gc.assign":"Assigned compliance item","gc.unassign":"Unassigned compliance item","gc.confirm_feedback":"Confirmed compliance feedback","gc.reports.view":"Viewed compliance report","gc.reports.export":"Exported compliance report","smc.submit":"Submitted social media item","smc.resubmit":"Resubmitted social media item","smc.review":"Reviewed social media item","smc.assign":"Assigned social media item","smc.unassign":"Unassigned social media item","smc.confirm_feedback":"Confirmed social media feedback","smc.reports.view":"Viewed social media report","smc.reports.export":"Exported social media report","wc.change_request.submit":"Submitted website change","wc.change_request.assign":"Assigned website change","wc.change_request.reject":"Rejected website change","wc.change_request.approve":"Approved website change","wc.change_request.schedule":"Scheduled website change","wc.template_request.submit":"Submitted website template request","wc.template_request.deploy":"Deployed website template","wc.template_request.reject":"Rejected website template","wc.section.update":"Updated website section","wc.section.lock":"Locked website section","wc.section.unlock":"Unlocked website section"},I={q:"",action:"",user_id:"",from:"",to:""},Xe=[{id:"today",label:"Today"},{id:"7d",label:"Last 7 days"},{id:"30d",label:"Last 30 days"},{id:"all",label:"All time"}];function z(i){const r=i.getFullYear(),u=String(i.getMonth()+1).padStart(2,"0"),y=String(i.getDate()).padStart(2,"0");return`${r}-${u}-${y}`}function H(i){const r=new Date;if(r.setHours(0,0,0,0),i==="all")return{from:"",to:""};if(i==="today")return{from:z(r),to:z(r)};const u=new Date(r);return u.setDate(u.getDate()-(i==="7d"?6:29)),{from:z(u),to:z(r)}}function C(i){return i?T[i]?T[i]:String(i).replace(/\./g," Â· ").replace(/_/g," ").replace(/\b\w/g,r=>r.toUpperCase()):"Activity"}function D(i){return We(i)}function Ze(i){const r=Number(i);return r?r>=200&&r<300?"ok":r>=400?"warn":"":""}function A(i){return i?Oe(`${i}T12:00:00`,i):"-"}function ve({rows:i,total:r,getLabel:u,getKey:y,onRowClick:m,isRowClickable:f}){if(!(i!=null&&i.length))return e.jsx("p",{className:"muted",children:"Nothing to show for this period."});const p=Math.max(1,...i.map(d=>Number(d.count)||0));return e.jsx("ul",{className:"activity-breakdown",children:i.map((d,s)=>{const h=Number(d.count)||0,k=Math.round(h/p*100),_=r>0?Math.round(h/r*100):0,c=!!(m&&(!f||f(d)));return e.jsx("li",{className:c?"is-clickable":void 0,children:c?e.jsxs("button",{type:"button",className:"activity-breakdown__btn",onClick:()=>m(d),children:[e.jsxs("div",{className:"activity-breakdown__head",children:[e.jsx("span",{className:"activity-breakdown__label",title:u(d),children:u(d)}),e.jsxs("span",{className:"activity-breakdown__meta",children:[e.jsx("strong",{children:h}),e.jsxs("span",{className:"muted",children:[_,"%"]})]})]}),e.jsx("div",{className:"activity-breakdown__track","aria-hidden":!0,children:e.jsx("div",{className:"activity-breakdown__fill",style:{width:`${k}%`}})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"activity-breakdown__head",children:[e.jsx("span",{className:"activity-breakdown__label",title:u(d),children:u(d)}),e.jsxs("span",{className:"activity-breakdown__meta",children:[e.jsx("strong",{children:h}),e.jsxs("span",{className:"muted",children:[_,"%"]})]})]}),e.jsx("div",{className:"activity-breakdown__track","aria-hidden":!0,children:e.jsx("div",{className:"activity-breakdown__fill",style:{width:`${k}%`}})})]})},y(d,s))})})}function G({icon:i,label:r,value:u,hint:y,accent:m}){return e.jsxs("article",{className:`activity-stat-card activity-stat-card--${m}`,children:[e.jsx("div",{className:"activity-stat-card__icon","aria-hidden":!0,children:e.jsx(i,{})}),e.jsxs("div",{children:[e.jsx("p",{className:"activity-stat-card__value",children:u??0}),e.jsx("p",{className:"activity-stat-card__label",children:r}),y?e.jsx("p",{className:"activity-stat-card__hint",children:y}):null]})]})}function fe(i){const r=String(i||"").toLowerCase();return r==="high"||r==="critical"?"gc-status gc-status--bad":r==="medium"?"gc-status gc-status--awf":r==="low"?"gc-status gc-status--pending":"gc-status"}function xe(i){const r=String(i||"").toLowerCase();return r==="reviewed"||r==="dismissed"?"gc-status gc-status--ok":r==="escalated"?"gc-status gc-status--awf":"gc-status gc-status--pending"}function et({anomaly:i,onClose:r,onReviewed:u,onDismissed:y,onEscalate:m,canEscalate:f,busy:p}){var d,s,h,k;return i?e.jsxs("aside",{className:"activity-anomaly-drawer",role:"dialog","aria-label":i.title||"Anomaly detail",children:[e.jsxs("div",{className:"activity-anomaly-drawer__head",children:[e.jsx("h2",{children:i.title||"Anomaly"}),e.jsx(Ye,{icon:Je,label:"Close",onClick:r})]}),e.jsxs("div",{className:"activity-anomaly-drawer__body",children:[e.jsx("p",{className:"muted",children:D(i.detected_at)}),e.jsxs("p",{children:[e.jsx("span",{className:fe(i.severity),children:i.severity})," ",e.jsx("span",{className:xe(i.status),children:i.status})]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Type:"})," ",i.anomaly_type_label||i.anomaly_type]}),e.jsx("p",{children:i.description}),e.jsxs("p",{children:[e.jsx("strong",{children:"Actor:"})," ",((d=i.actor)==null?void 0:d.name)||((s=i.actor)==null?void 0:s.email)||"Unknown",(h=i.actor)!=null&&h.role?` · ${i.actor.role}`:""]}),i.source_ip?e.jsxs("p",{children:[e.jsx("strong",{children:"IP:"})," ",i.source_ip]}):null,(k=i.related_activity_log_ids)!=null&&k.length?e.jsxs("p",{children:[e.jsx("strong",{children:"Related activity log IDs:"})," ",i.related_activity_log_ids.join(", ")]}):null,i.security_event_id?e.jsxs("p",{children:[e.jsx("strong",{children:"Security event:"})," #",i.security_event_id,i.security_incident_id?` · incident #${i.security_incident_id}`:""]}):null,e.jsxs("div",{className:"activity-anomaly-drawer__actions",children:[i.status==="open"?e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"btn",disabled:p,onClick:()=>u(i),children:"Mark reviewed"}),e.jsx("button",{type:"button",className:"btn ghost",disabled:p,onClick:()=>y(i),children:"Dismiss"})]}):null,f&&i.status!=="escalated"&&!i.security_event_id?e.jsxs("button",{type:"button",className:"btn primary",disabled:p,onClick:()=>m(i),children:[e.jsx(Qe,{"aria-hidden":!0})," Escalate to Security Monitoring"]}):null]})]})]}):null}const ge=H("30d");function nt({shell:i="client-admin"}){var re,ne;const{isPowerAdmin:r}=Re(),{can:u,loading:y}=qe(),[m,f]=o.useState("report"),[p,d]=o.useState(()=>({...I,...ge})),[s,h]=o.useState(()=>({...I,...ge})),[k,_]=o.useState("30d"),[c,be]=o.useState(null),[K,_e]=o.useState([]),[F,je]=o.useState(null),[M,O]=o.useState([]),[$,W]=o.useState(null),[x,Y]=o.useState(null),[g,R]=o.useState({severity:"",status:"",anomaly_type:""}),[we,U]=o.useState(null),[J,j]=o.useState(!1),[Q,X]=o.useState(""),[Ne,q]=o.useState(!0),[Z,b]=o.useState(""),L=i==="power-admin"||r,V=u("dashboard_view_activity_logs"),ke=u("security_monitoring"),w={asPowerAdmin:L},S=o.useCallback((t={})=>{const a={...t};return s.q&&(a.q=s.q),s.action&&(a.action=s.action),s.user_id!==""&&s.user_id!=null&&(a.user_id=s.user_id),s.from&&(a.from=s.from),s.to&&(a.to=s.to),a},[s]);o.useEffect(()=>{if(y||!V){q(!1);return}let t=!1;return q(!0),b(""),(async()=>{try{if(m==="report"){const n=await N.activityLogReport(S(),w);t||be(n.report||null)}else if(m==="anomalies"){const n=await N.activityAnomalies({...S(),severity:g.severity||void 0,status:g.status||void 0,anomaly_type:g.anomaly_type||void 0,per_page:50,page:1},w);t||(O(n.data||[]),W(n.meta||null),Y(n.options||null))}else{const n=await N.activityLogs({...S(),per_page:50,page:1},w);t||(_e(n.data||[]),je(n.meta||null))}}catch(n){t||b(n.message||"Failed to load activity data.")}finally{t||q(!1)}})(),()=>{t=!0}},[y,V,m,S,L,g]);const Ae=t=>{t.preventDefault(),_("custom"),h({...p})},Se=()=>{const t=H("30d"),a={...I,...t};d(a),h(a),_("30d")},Ce=t=>{const a=H(t),n={...p,...a};_(t),d(n),h(n)},E=t=>{const a=(t==null?void 0:t.user_id)!=null&&t.user_id!==""?String(t.user_id):"0",n={...p,user_id:a};d(n),h(n),f("logs")},De=()=>{const t={...p,user_id:""};d(t),h(t)},ee=s.user_id!==""&&s.user_id!=null,Fe=String(s.user_id)==="0",v=c==null?void 0:c.summary,te=(v==null?void 0:v.total)??0,l=o.useMemo(()=>{var ce,le,oe;const t=(ce=c==null?void 0:c.by_action)==null?void 0:ce[0],a=(le=c==null?void 0:c.by_user)==null?void 0:le[0],n=(oe=c==null?void 0:c.by_day)==null?void 0:oe[0];return{topAction:t,topUser:a,topDay:n}},[c]),ie=o.useMemo(()=>{const t=[...(c==null?void 0:c.by_day)||[]].reverse().slice(-14);return{labels:t.map(a=>A(a.date)),data:t.map(a=>a.count)}},[c]),ae=o.useMemo(()=>{const t=((c==null?void 0:c.by_action)||[]).slice(0,8);return{labels:t.map(a=>C(a.action)),data:t.map(a=>a.count)}},[c]),P=o.useMemo(()=>s.from&&s.to&&s.from===s.to?`on ${A(s.from)}`:s.from&&s.to?`from ${A(s.from)} to ${A(s.to)}`:s.from?`since ${A(s.from)}`:s.to?`until ${A(s.to)}`:"for all recorded time",[s]),B=o.useCallback(async()=>{const t=await N.activityAnomalies({...S(),severity:g.severity||void 0,status:g.status||void 0,anomaly_type:g.anomaly_type||void 0,per_page:50,page:1},w);O(t.data||[]),W(t.meta||null),Y(t.options||null)},[S,g,L]),$e=async t=>{try{j(!0);const a=await N.activityAnomaly(t.id,w);U(a.data||t)}catch(a){b(a.message||"Failed to load anomaly detail.")}finally{j(!1)}},se=async(t,a)=>{try{j(!0),b("");const n=await N.updateActivityAnomaly(t.id,{status:a},w);U(n.data||null),await B()}catch(n){b(n.message||"Failed to update anomaly.")}finally{j(!1)}},Ue=async t=>{try{j(!0),b("");const a=await N.escalateActivityAnomaly(t.id,w);U(a.data||null),await B()}catch(a){b(a.message||"Failed to escalate anomaly.")}finally{j(!1)}},ze=async()=>{var t;try{j(!0),X(""),b("");const n=((t=(await N.detectActivityAnomaliesNow(w)).data)==null?void 0:t.created)??0;X(n>0?`Detection finished — ${n} new anomal${n===1?"y":"ies"} recorded.`:"Detection finished — no new anomalies."),await B()}catch(a){b(a.message||"Detection failed.")}finally{j(!1)}},Te=o.useMemo(()=>[{key:"detected_at",label:"Detected",filterValue:t=>D(t.detected_at),render:t=>D(t.detected_at)},{key:"severity",label:"Severity",filterValue:t=>t.severity||"",render:t=>e.jsx("span",{className:fe(t.severity),children:t.severity})},{key:"status",label:"Status",filterValue:t=>t.status||"",render:t=>e.jsx("span",{className:xe(t.status),children:t.status})},{key:"title",label:"Anomaly",filterValue:t=>`${t.title||""} ${t.anomaly_type||""}`,render:t=>e.jsxs("div",{children:[e.jsx("strong",{children:t.title}),e.jsx("div",{className:"muted",children:t.anomaly_type_label||t.anomaly_type})]})},{key:"actor",label:"Actor",filterValue:t=>{var a,n;return[(a=t.actor)==null?void 0:a.name,(n=t.actor)==null?void 0:n.email,t.source_ip].filter(Boolean).join(" ")},render:t=>{var a,n;return e.jsxs("div",{children:[e.jsx("div",{children:((a=t.actor)==null?void 0:a.name)||((n=t.actor)==null?void 0:n.email)||"Unknown"}),t.source_ip?e.jsx("span",{className:"muted",children:t.source_ip}):null]})}},{key:"actions",label:"",sortable:!1,render:t=>e.jsx("button",{type:"button",className:"btn ghost",onClick:()=>$e(t),children:"View"})}],[]),Me=o.useMemo(()=>[{key:"created_at",label:"When",filterValue:t=>D(t.created_at),render:t=>D(t.created_at)},{key:"action",label:"Action",filterValue:t=>`${C(t.action)} ${t.action||""}`,render:t=>e.jsxs("div",{children:[e.jsx("strong",{children:C(t.action)}),e.jsx("div",{children:e.jsx("code",{className:"activity-chip activity-chip--code",children:t.action})})]})},{key:"user",label:"User",filterValue:t=>[t.user_name,t.user_email,t.user_role].filter(Boolean).join(" "),render:t=>e.jsxs("div",{children:[e.jsxs("div",{children:[t.user_name||"Guest",t.user_role?` Â· ${t.user_role}`:""]}),t.user_email?e.jsx("span",{className:"muted",children:t.user_email}):null]})},{key:"description",label:"Description",filterValue:t=>Ve(t.description||""),render:t=>Le(t.description,180)||"-"},{key:"path",label:"Request",filterValue:t=>[t.method,t.path].filter(Boolean).join(" "),render:t=>t.method||t.path?e.jsx("span",{className:"activity-chip activity-chip--mono",children:[t.method,t.path].filter(Boolean).join(" ")}):"-"},{key:"status_code",label:"Status",filterValue:t=>String(t.status_code||""),render:t=>t.status_code?e.jsx("span",{className:`badge ${Ze(t.status_code)}`,children:t.status_code}):"-"}],[]);return!y&&!V?e.jsx("section",{children:e.jsx("div",{className:"page-head",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Activity logs"}),e.jsx("p",{className:"muted",children:'Enable "View activity logs / report" for your role under Power Admin - Capabilities.'})]})})}):e.jsxs("section",{className:"activity-page",children:[e.jsx("div",{className:"page-head",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Activity logs"}),e.jsx("p",{className:"muted",children:"See what people are doing in this hub - sign-ins, reviews, updates, and more. Use the summary cards for a quick overview, dig into the timeline for detail, and check Anomaly detection for unusual activity patterns (separate from Security Monitoring)."})]})}),e.jsxs("div",{className:"tab-row",role:"tablist","aria-label":"Activity views",children:[e.jsxs("button",{type:"button",className:`btn ghost ${m==="report"?"active":""}`,onClick:()=>f("report"),children:[e.jsx(de,{"aria-hidden":!0})," Overview report"]}),e.jsxs("button",{type:"button",className:`btn ghost ${m==="logs"?"active":""}`,onClick:()=>f("logs"),children:[e.jsx(Ee,{"aria-hidden":!0})," Activity timeline"]}),e.jsxs("button",{type:"button",className:`btn ghost ${m==="anomalies"?"active":""}`,onClick:()=>f("anomalies"),children:[e.jsx(me,{"aria-hidden":!0})," Anomaly detection"]})]}),e.jsxs("div",{className:"activity-panel",children:[e.jsxs("div",{className:"activity-panel__head",children:[e.jsxs("div",{className:"activity-panel__title",children:[e.jsx(Pe,{"aria-hidden":!0}),e.jsxs("div",{children:[e.jsx("strong",{children:"Filters"}),e.jsxs("p",{className:"muted",children:["Narrow results ",P,"."]})]})]}),e.jsx("div",{className:"activity-presets",role:"group","aria-label":"Date range",children:Xe.map(t=>e.jsx("button",{type:"button",className:`btn ghost ${k===t.id?"active":""}`,onClick:()=>Ce(t.id),children:t.label},t.id))})]}),e.jsxs("form",{className:"activity-filters",onSubmit:Ae,children:[e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Search"}),e.jsxs("div",{className:"activity-field__input",children:[e.jsx(Be,{"aria-hidden":!0}),e.jsx("input",{type:"search",placeholder:m==="anomalies"?"Title, actor, IP, or type...":"Name, email, description, or page path...",value:p.q,onChange:t=>d(a=>({...a,q:t.target.value}))})]})]}),m==="anomalies"?e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Severity"}),e.jsxs("select",{value:g.severity,onChange:t=>R(a=>({...a,severity:t.target.value})),children:[e.jsx("option",{value:"",children:"Any"}),((x==null?void 0:x.severities)||["info","low","medium","high"]).map(t=>e.jsx("option",{value:t,children:t},t))]})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Status"}),e.jsxs("select",{value:g.status,onChange:t=>R(a=>({...a,status:t.target.value})),children:[e.jsx("option",{value:"",children:"Any"}),((x==null?void 0:x.statuses)||["open","reviewed","dismissed","escalated"]).map(t=>e.jsx("option",{value:t,children:t},t))]})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Type"}),e.jsxs("select",{value:g.anomaly_type,onChange:t=>R(a=>({...a,anomaly_type:t.target.value})),children:[e.jsx("option",{value:"",children:"Any"}),((x==null?void 0:x.anomaly_types)||[]).map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))]})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Action type"}),e.jsx("input",{type:"text",placeholder:"e.g. auth.login",value:p.action,onChange:t=>d(a=>({...a,action:t.target.value})),list:"activity-action-suggestions"}),e.jsx("datalist",{id:"activity-action-suggestions",children:Object.keys(T).map(t=>e.jsx("option",{value:t,children:T[t]},t))})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"User ID"}),e.jsx("input",{type:"number",min:"0",placeholder:"0 = guests",value:p.user_id,onChange:t=>d(a=>({...a,user_id:t.target.value}))})]})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"From"}),e.jsx("input",{type:"date",value:p.from,onChange:t=>{_("custom"),d(a=>({...a,from:t.target.value}))}})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"To"}),e.jsx("input",{type:"date",value:p.to,onChange:t=>{_("custom"),d(a=>({...a,to:t.target.value}))}})]}),e.jsxs("div",{className:"activity-filters__actions",children:[e.jsx("button",{type:"button",className:"btn activity-filters__btn activity-filters__btn--reset",onClick:Se,children:"Reset"}),e.jsx("button",{type:"submit",className:"btn primary activity-filters__btn",children:"Apply filters"})]})]})]}),Z&&e.jsx("div",{className:"alert",children:Z}),Q&&m==="anomalies"?e.jsx("div",{className:"alert success",children:Q}):null,Ne?e.jsx("div",{className:"state",children:"Loading activity..."}):m==="anomalies"?e.jsxs("div",{className:"activity-anomalies",children:[e.jsxs("div",{className:"activity-feed-meta",children:[e.jsxs("p",{children:["Unusual patterns found from activity logs ",P,($==null?void 0:$.total)!=null?e.jsxs(e.Fragment,{children:[" ","(",e.jsx("strong",{children:M.length})," of ",e.jsx("strong",{children:$.total}),")"]}):null,". This is not Security Monitoring — escalate security-relevant items when that module is enabled."]}),e.jsxs("button",{type:"button",className:"btn",disabled:J,onClick:ze,children:[e.jsx(Ie,{"aria-hidden":!0})," Detect now"]})]}),M.length?e.jsx(ue,{columns:Te,rows:M,loading:!1,emptyMessage:"No matching anomalies.",pageSize:10,getRowKey:t=>t.id}):e.jsxs("div",{className:"empty-state activity-empty",children:[e.jsx(me,{"aria-hidden":!0}),e.jsx("h2",{children:"No open anomalies"}),e.jsx("p",{className:"muted",children:'Run "Detect now" or wait for the scheduled scan. Healthy hubs often show an empty list.'})]}),e.jsx(et,{anomaly:we,onClose:()=>U(null),onReviewed:t=>se(t,"reviewed"),onDismissed:t=>se(t,"dismissed"),onEscalate:Ue,canEscalate:ke,busy:J})]}):m==="report"?c?e.jsxs("div",{className:"activity-report",children:[e.jsxs("div",{className:"activity-stat-grid",children:[e.jsx(G,{icon:he,accent:"events",label:"Total activities",value:(v==null?void 0:v.total)??0,hint:"All recorded actions in this period"}),e.jsx(G,{icon:Ge,accent:"users",label:"People involved",value:(v==null?void 0:v.unique_users)??0,hint:"Unique users who triggered activity"}),e.jsx(G,{icon:pe,accent:"actions",label:"Action types",value:(v==null?void 0:v.unique_actions)??0,hint:"Distinct kinds of activity"})]}),e.jsxs("div",{className:"activity-insight-grid",children:[e.jsxs("article",{className:"activity-insight-card",children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Most common action"}),e.jsx("h3",{children:l.topAction?C(l.topAction.action):"-"}),e.jsx("p",{className:"muted",children:l.topAction?`${l.topAction.count} time${l.topAction.count===1?"":"s"}`:"No actions yet"})]}),e.jsxs("article",{className:`activity-insight-card${l.topUser?" activity-insight-card--clickable":""}`,role:l.topUser?"button":void 0,tabIndex:l.topUser?0:void 0,onClick:()=>{l.topUser&&E(l.topUser)},onKeyDown:t=>{l.topUser&&(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),E(l.topUser))},children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Most active person"}),e.jsx("h3",{children:((re=l.topUser)==null?void 0:re.user_name)||((ne=l.topUser)==null?void 0:ne.user_email)||"-"}),e.jsx("p",{className:"muted",children:l.topUser?`${l.topUser.count} event${l.topUser.count===1?"":"s"}${l.topUser.user_role?` Â· ${l.topUser.user_role}`:""}`:"No users yet"}),l.topUser?e.jsx("p",{className:"activity-insight-card__cta muted",children:"View their activities"}):null]}),e.jsxs("article",{className:"activity-insight-card",children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Busiest day"}),e.jsx("h3",{children:l.topDay?A(l.topDay.date):"-"}),e.jsx("p",{className:"muted",children:l.topDay?`${l.topDay.count} event${l.topDay.count===1?"":"s"}`:"No daily data yet"})]})]}),e.jsxs("div",{className:"activity-section-grid",children:[e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--chart",children:e.jsx(de,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"Activity by day"}),e.jsx("p",{className:"muted",children:"Daily volume over the selected period (last 14 days shown)."})]})]}),e.jsx(ye,{labels:ie.labels,data:ie.data})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--bolt",children:e.jsx(he,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"Top actions"}),e.jsx("p",{className:"muted",children:"What people do most often in this hub."})]})]}),e.jsx(ye,{labels:ae.labels,data:ae.data})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--user",children:e.jsx(He,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"By person"}),e.jsx("p",{className:"muted",children:"Who generated the most activity. Click a person to open their timeline."})]})]}),e.jsx(ve,{rows:c.by_user||[],total:te,getKey:(t,a)=>`${t.user_id||"guest"}-${a}`,getLabel:t=>[t.user_name||"Guest",t.user_email,t.user_role].filter(Boolean).join(" Â· "),isRowClickable:()=>!0,onRowClick:E})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--day",children:e.jsx(Ke,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"All action types"}),e.jsx("p",{className:"muted",children:"Full breakdown with share of total events."})]})]}),e.jsx(ve,{rows:c.by_action||[],total:te,getKey:t=>t.action,getLabel:t=>C(t.action)})]})]}),e.jsxs("div",{className:"activity-cta-bar",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Need the raw detail?"}),e.jsx("p",{className:"muted",children:"Open the timeline to see each event with who, what, and when."})]}),e.jsx("button",{type:"button",className:"btn",onClick:()=>f("logs"),children:"View activity timeline"})]})]}):e.jsxs("div",{className:"empty-state activity-empty",children:[e.jsx(pe,{"aria-hidden":!0}),e.jsx("h2",{children:"No report data yet"}),e.jsx("p",{className:"muted",children:"Try a wider date range, or check back after users start using the hub."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"activity-feed-meta",children:[e.jsxs("p",{children:["Showing loaded events ",P,(F==null?void 0:F.total)!=null?e.jsxs(e.Fragment,{children:[" ","(",e.jsx("strong",{children:K.length})," of ",e.jsx("strong",{children:F.total}),")"]}):null,ee?e.jsxs(e.Fragment,{children:[" ","for"," ",e.jsx("strong",{children:Fe?"Guest (anonymous)":`user ID ${s.user_id}`})]}):null,"."]}),ee?e.jsx("button",{type:"button",className:"btn ghost",onClick:De,children:"Clear person filter"}):null]}),e.jsx(ue,{columns:Me,rows:K,loading:!1,emptyMessage:"No matching activity. Try clearing filters or widening the date range.",pageSize:10,getRowKey:t=>t.id})]}),e.jsx("style",{children:`
        .activity-page .tab-row .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .activity-panel {
          margin-bottom: 1.25rem;
          padding: 1rem 1.15rem 1.15rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-panel__head {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .activity-panel__title {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .activity-panel__title > svg {
          margin-top: 0.2rem;
          color: var(--brand);
          flex-shrink: 0;
        }

        .activity-panel__title strong {
          display: block;
          margin-bottom: 0.15rem;
        }

        .activity-panel__title p {
          margin: 0;
          font-size: 0.88rem;
        }

        .activity-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .activity-presets .btn {
          padding: 0.35rem 0.75rem;
          font-size: 0.85rem;
        }

        .activity-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
          align-items: end;
        }

        .activity-field {
          display: grid;
          gap: 0.35rem;
          min-width: 0;
        }

        .activity-field > span {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .activity-field input {
          width: 100%;
          min-width: 0;
        }

        .activity-field__input {
          position: relative;
        }

        .activity-field__input svg {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 0.8rem;
          pointer-events: none;
        }

        .activity-field__input input {
          padding-left: 2.1rem;
        }

        .activity-filters__actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: nowrap;
          justify-content: flex-end;
          align-items: center;
          gap: 0.65rem;
        }

        .activity-filters__actions .activity-filters__btn {
          flex: 0 0 9.75rem;
          min-height: 2.65rem;
          justify-content: center;
        }

        .activity-filters__actions .activity-filters__btn--reset {
          background: #f2f4f7;
          border: 1px solid var(--line);
          color: var(--ink);
        }

        .activity-filters__actions .activity-filters__btn--reset:hover:not(:disabled) {
          background: #e8ecf1;
          border-color: color-mix(in srgb, var(--muted) 35%, var(--line));
          color: var(--ink);
        }

        .activity-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .activity-stat-card {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          padding: 1.15rem 1.2rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-stat-card__icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 1rem;
        }

        .activity-stat-card--events .activity-stat-card__icon {
          background: #eff6ff;
          color: #2563eb;
        }
        .activity-stat-card--users .activity-stat-card__icon {
          background: #ecfdf5;
          color: #059669;
        }
        .activity-stat-card--actions .activity-stat-card__icon {
          background: #fff7ed;
          color: #ea580c;
        }

        .activity-stat-card__value {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 750;
          line-height: 1.1;
        }

        .activity-stat-card__label {
          margin: 0.25rem 0 0;
          font-weight: 600;
        }

        .activity-stat-card__hint {
          margin: 0.2rem 0 0;
          font-size: 0.82rem;
          color: var(--muted);
        }

        .activity-insight-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .activity-insight-card {
          padding: 1rem 1.15rem;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, #f8fafc 0%, var(--panel) 100%);
        }

        .activity-insight-card__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .activity-insight-card h3 {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.3;
        }

        .activity-insight-card p {
          margin: 0.35rem 0 0;
          font-size: 0.88rem;
        }

        .activity-insight-card--clickable {
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .activity-insight-card--clickable:hover,
        .activity-insight-card--clickable:focus-visible {
          border-color: color-mix(in srgb, var(--brand) 35%, var(--line));
          box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
          transform: translateY(-1px);
          outline: none;
        }

        .activity-insight-card__cta {
          margin-top: 0.55rem !important;
          font-weight: 600;
          color: var(--brand) !important;
        }

        .activity-section-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .activity-section-card {
          padding: 1.15rem 1.25rem 1.25rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
          min-width: 0;
        }

        .activity-section-card header {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 0.85rem;
        }

        .activity-section-card h2 {
          margin: 0;
          font-size: 1.05rem;
        }

        .activity-section-card header p {
          margin: 0.2rem 0 0;
          font-size: 0.84rem;
        }

        .activity-section-card__icon {
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .activity-section-card__icon--chart { background: #eff6ff; color: #2563eb; }
        .activity-section-card__icon--bolt { background: #fff7ed; color: #ea580c; }
        .activity-section-card__icon--user { background: #ecfdf5; color: #059669; }
        .activity-section-card__icon--day { background: #f5f3ff; color: #7c3aed; }

        .activity-breakdown {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 22rem;
          overflow: auto;
        }

        .activity-breakdown__btn {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0.45rem 0.5rem;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .activity-breakdown__btn:hover,
        .activity-breakdown__btn:focus-visible {
          background: color-mix(in srgb, var(--brand) 8%, #fff);
          border-color: color-mix(in srgb, var(--brand) 22%, var(--line));
          outline: none;
        }

        .activity-breakdown__head {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: baseline;
          margin-bottom: 0.35rem;
        }

        .activity-breakdown__label {
          font-size: 0.9rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-breakdown__meta {
          display: inline-flex;
          gap: 0.4rem;
          align-items: baseline;
          flex-shrink: 0;
          font-size: 0.85rem;
        }

        .activity-breakdown__track {
          height: 0.45rem;
          border-radius: 999px;
          background: #eef2f7;
          overflow: hidden;
        }

        .activity-breakdown__fill {
          height: 100%;
          border-radius: inherit;
          background: var(--brand, #2563eb);
          transition: width 0.35s ease;
        }

        .activity-cta-bar {
          margin-top: 1rem;
          padding: 1rem 1.15rem;
          border-radius: 16px;
          border: 1px dashed var(--line);
          background: #f8fafc;
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: center;
          justify-content: space-between;
        }

        .activity-cta-bar p {
          margin: 0.2rem 0 0;
          font-size: 0.88rem;
        }

        .activity-empty {
          text-align: center;
          padding: 2.5rem 1rem;
        }

        .activity-empty svg {
          font-size: 1.75rem;
          color: var(--muted);
          margin-bottom: 0.65rem;
        }

        .activity-empty h2 {
          margin: 0 0 0.35rem;
          font-size: 1.15rem;
        }

        .activity-feed-meta {
          margin-bottom: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .activity-feed-meta p {
          margin: 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-feed-card {
          display: flex;
          gap: 0.9rem;
          padding: 1rem 1.1rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-feed-card__avatar {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #1d4ed8;
          background: #dbeafe;
        }

        .activity-feed-card__body {
          min-width: 0;
          flex: 1;
        }

        .activity-feed-card__top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }

        .activity-feed-card h3 {
          margin: 0;
          font-size: 1rem;
        }

        .activity-feed-card__desc {
          margin: 0.3rem 0 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .activity-feed-card__when {
          text-align: right;
          flex-shrink: 0;
          display: grid;
          gap: 0.15rem;
          font-size: 0.82rem;
        }

        .activity-feed-card__rel {
          font-weight: 700;
          color: var(--brand, #2563eb);
        }

        .activity-feed-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.75rem;
          align-items: center;
        }

        .activity-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: #f1f5f9;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .activity-chip--mono,
        .activity-chip--code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-weight: 500;
        }

        .activity-chip--code {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--muted);
        }

        .activity-pagination {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          align-items: center;
        }

        .activity-anomaly-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: min(420px, 100vw);
          height: 100vh;
          z-index: 40;
          background: var(--panel, #fff);
          border-left: 1px solid var(--line);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
        }

        .activity-anomaly-drawer__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1rem 1.1rem;
          border-bottom: 1px solid var(--line);
        }

        .activity-anomaly-drawer__head h2 {
          margin: 0;
          font-size: 1.05rem;
        }

        .activity-anomaly-drawer__body {
          padding: 1rem 1.1rem;
          overflow: auto;
          display: grid;
          gap: 0.65rem;
        }

        .activity-anomaly-drawer__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .activity-anomaly-drawer__actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        @media (max-width: 900px) {
          .activity-stat-grid,
          .activity-insight-grid,
          .activity-section-grid {
            grid-template-columns: 1fr;
          }

          .activity-feed-card__top {
            flex-direction: column;
          }

          .activity-feed-card__when {
            text-align: left;
          }
        }
      `})]})}export{nt as default};
