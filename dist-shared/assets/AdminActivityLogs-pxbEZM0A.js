import{r as l,j as e}from"./react-vendor-BrnG2GJc.js";import{a as me,u as pe,t as ue,p as he,f as K,g as ge,h as ve,i as ye,j as W,k as Y,l as fe,m as xe,n as be,D as _e,b as J,o as je,r as we}from"./website-compliance-DGAR3OEm.js";import{S as Q}from"./SocialMediaComplianceUI-OKZJejd5.js";import"./dompurify-DqNA57iZ.js";import"./socialMediaCompliance-CP0yMbsb.js";const N={"auth.login":"Signed in","auth.logout":"Signed out","auth.force_logout":"Force-logged out user","auth.login_failed":"Failed sign-in","auth.login_blocked":"Sign-in blocked","auth.register":"New registration","auth.email_verified":"Email verified","auth.login_otp_sent":"Login OTP sent","auth.login_otp_verified":"Login OTP verified","auth.profile_updated":"Profile updated","auth.terms_accepted":"Accepted terms","activity_logs.view":"Viewed activity log","activity_logs.report":"Viewed activity report","modules.update":"Updated hub modules","gc.submit":"Submitted compliance item","gc.resubmit":"Resubmitted compliance item","gc.review":"Reviewed compliance item","gc.assign":"Assigned compliance item","gc.unassign":"Unassigned compliance item","gc.confirm_feedback":"Confirmed compliance feedback","gc.reports.view":"Viewed compliance report","gc.reports.export":"Exported compliance report","smc.submit":"Submitted social media item","smc.resubmit":"Resubmitted social media item","smc.review":"Reviewed social media item","smc.assign":"Assigned social media item","smc.unassign":"Unassigned social media item","smc.confirm_feedback":"Confirmed social media feedback","smc.reports.view":"Viewed social media report","smc.reports.export":"Exported social media report","wc.change_request.submit":"Submitted website change","wc.change_request.assign":"Assigned website change","wc.change_request.reject":"Rejected website change","wc.change_request.approve":"Approved website change","wc.change_request.schedule":"Scheduled website change","wc.template_request.submit":"Submitted website template request","wc.template_request.deploy":"Deployed website template","wc.template_request.reject":"Rejected website template","wc.section.update":"Updated website section","wc.section.lock":"Locked website section","wc.section.unlock":"Unlocked website section"},C={q:"",action:"",user_id:"",from:"",to:""},Ne=[{id:"today",label:"Today"},{id:"7d",label:"Last 7 days"},{id:"30d",label:"Last 30 days"},{id:"all",label:"All time"}];function w(s){const c=s.getFullYear(),d=String(s.getMonth()+1).padStart(2,"0"),h=String(s.getDate()).padStart(2,"0");return`${c}-${d}-${h}`}function D(s){const c=new Date;if(c.setHours(0,0,0,0),s==="all")return{from:"",to:""};if(s==="today")return{from:w(c),to:w(c)};const d=new Date(c);return d.setDate(d.getDate()-(s==="7d"?6:29)),{from:w(d),to:w(c)}}function b(s){return s?N[s]?N[s]:String(s).replace(/\./g," · ").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()):"Activity"}function X(s){return we(s)}function ke(s){const c=Number(s);return c?c>=200&&c<300?"ok":c>=400?"warn":"":""}function x(s){return s?je(`${s}T12:00:00`,s):"—"}function Z({rows:s,total:c,getLabel:d,getKey:h,onRowClick:g,isRowClickable:f}){if(!(s!=null&&s.length))return e.jsx("p",{className:"muted",children:"Nothing to show for this period."});const u=Math.max(1,...s.map(o=>Number(o.count)||0));return e.jsx("ul",{className:"activity-breakdown",children:s.map((o,a)=>{const v=Number(o.count)||0,_=Math.round(v/u*100),y=c>0?Math.round(v/c*100):0,r=!!(g&&(!f||f(o)));return e.jsx("li",{className:r?"is-clickable":void 0,children:r?e.jsxs("button",{type:"button",className:"activity-breakdown__btn",onClick:()=>g(o),children:[e.jsxs("div",{className:"activity-breakdown__head",children:[e.jsx("span",{className:"activity-breakdown__label",title:d(o),children:d(o)}),e.jsxs("span",{className:"activity-breakdown__meta",children:[e.jsx("strong",{children:v}),e.jsxs("span",{className:"muted",children:[y,"%"]})]})]}),e.jsx("div",{className:"activity-breakdown__track","aria-hidden":!0,children:e.jsx("div",{className:"activity-breakdown__fill",style:{width:`${_}%`}})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"activity-breakdown__head",children:[e.jsx("span",{className:"activity-breakdown__label",title:d(o),children:d(o)}),e.jsxs("span",{className:"activity-breakdown__meta",children:[e.jsx("strong",{children:v}),e.jsxs("span",{className:"muted",children:[y,"%"]})]})]}),e.jsx("div",{className:"activity-breakdown__track","aria-hidden":!0,children:e.jsx("div",{className:"activity-breakdown__fill",style:{width:`${_}%`}})})]})},h(o,a))})})}function F({icon:s,label:c,value:d,hint:h,accent:g}){return e.jsxs("article",{className:`activity-stat-card activity-stat-card--${g}`,children:[e.jsx("div",{className:"activity-stat-card__icon","aria-hidden":!0,children:e.jsx(s,{})}),e.jsxs("div",{children:[e.jsx("p",{className:"activity-stat-card__value",children:d??0}),e.jsx("p",{className:"activity-stat-card__label",children:c}),h?e.jsx("p",{className:"activity-stat-card__hint",children:h}):null]})]})}const ee=D("30d");function De({shell:s="client-admin"}){var B,O;const{isPowerAdmin:c}=me(),{can:d,loading:h}=pe(),[g,f]=l.useState("report"),[u,o]=l.useState(()=>({...C,...ee})),[a,v]=l.useState(()=>({...C,...ee})),[_,y]=l.useState("30d"),[r,te]=l.useState(null),[U,ie]=l.useState([]),[j,ae]=l.useState(null),[se,k]=l.useState(!0),[z,q]=l.useState(""),T=s==="power-admin"||c,A=d("dashboard_view_activity_logs"),L={asPowerAdmin:T},S=l.useCallback((t={})=>{const i={...t};return a.q&&(i.q=a.q),a.action&&(i.action=a.action),a.user_id!==""&&a.user_id!=null&&(i.user_id=a.user_id),a.from&&(i.from=a.from),a.to&&(i.to=a.to),i},[a]);l.useEffect(()=>{if(h||!A){k(!1);return}let t=!1;return k(!0),q(""),(async()=>{try{if(g==="report"){const m=await J.activityLogReport(S(),L);t||te(m.report||null)}else{const m=await J.activityLogs({...S(),per_page:50,page:1},L);t||(ie(m.data||[]),ae(m.meta||null))}}catch(m){t||q(m.message||"Failed to load activity data.")}finally{t||k(!1)}})(),()=>{t=!0}},[h,A,g,S,T]);const re=t=>{t.preventDefault(),y("custom"),v({...u})},ne=()=>{const t=D("30d"),i={...C,...t};o(i),v(i),y("30d")},ce=t=>{const i=D(t),m={...u,...i};y(t),o(m),v(m)},$=t=>{const i=(t==null?void 0:t.user_id)!=null&&t.user_id!==""?String(t.user_id):"0",m={...u,user_id:i};o(m),v(m),f("logs")},oe=()=>{const t={...u,user_id:""};o(t),v(t)},R=a.user_id!==""&&a.user_id!=null,le=String(a.user_id)==="0",p=r==null?void 0:r.summary,M=(p==null?void 0:p.total)??0,n=l.useMemo(()=>{var I,H,G;const t=(I=r==null?void 0:r.by_action)==null?void 0:I[0],i=(H=r==null?void 0:r.by_user)==null?void 0:H[0],m=(G=r==null?void 0:r.by_day)==null?void 0:G[0];return{topAction:t,topUser:i,topDay:m}},[r]),E=l.useMemo(()=>{const t=[...(r==null?void 0:r.by_day)||[]].reverse().slice(-14);return{labels:t.map(i=>x(i.date)),data:t.map(i=>i.count)}},[r]),P=l.useMemo(()=>{const t=((r==null?void 0:r.by_action)||[]).slice(0,8);return{labels:t.map(i=>b(i.action)),data:t.map(i=>i.count)}},[r]),V=l.useMemo(()=>a.from&&a.to&&a.from===a.to?`on ${x(a.from)}`:a.from&&a.to?`from ${x(a.from)} to ${x(a.to)}`:a.from?`since ${x(a.from)}`:a.to?`until ${x(a.to)}`:"for all recorded time",[a]),de=l.useMemo(()=>[{key:"created_at",label:"When",filterValue:t=>X(t.created_at),render:t=>X(t.created_at)},{key:"action",label:"Action",filterValue:t=>`${b(t.action)} ${t.action||""}`,render:t=>e.jsxs("div",{children:[e.jsx("strong",{children:b(t.action)}),e.jsx("div",{children:e.jsx("code",{className:"activity-chip activity-chip--code",children:t.action})})]})},{key:"user",label:"User",filterValue:t=>[t.user_name,t.user_email,t.user_role].filter(Boolean).join(" "),render:t=>e.jsxs("div",{children:[e.jsxs("div",{children:[t.user_name||"Guest",t.user_role?` · ${t.user_role}`:""]}),t.user_email?e.jsx("span",{className:"muted",children:t.user_email}):null]})},{key:"description",label:"Description",filterValue:t=>he(t.description||""),render:t=>ue(t.description,180)||"—"},{key:"path",label:"Request",filterValue:t=>[t.method,t.path].filter(Boolean).join(" "),render:t=>t.method||t.path?e.jsx("span",{className:"activity-chip activity-chip--mono",children:[t.method,t.path].filter(Boolean).join(" ")}):"—"},{key:"status_code",label:"Status",filterValue:t=>String(t.status_code||""),render:t=>t.status_code?e.jsx("span",{className:`badge ${ke(t.status_code)}`,children:t.status_code}):"—"}],[]);return!h&&!A?e.jsx("section",{children:e.jsx("div",{className:"page-head",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Activity logs"}),e.jsx("p",{className:"muted",children:'Enable "View activity logs / report" for your role under Power Admin → Capabilities.'})]})})}):e.jsxs("section",{className:"activity-page",children:[e.jsx("div",{className:"page-head",children:e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:"Hub"}),e.jsx("h1",{children:"Activity logs"}),e.jsx("p",{className:"muted",children:"See what people are doing in this hub — sign-ins, reviews, updates, and more. Use the summary cards for a quick overview, then dig into the detailed timeline when you need specifics."})]})}),e.jsxs("div",{className:"tab-row",role:"tablist","aria-label":"Activity views",children:[e.jsxs("button",{type:"button",className:`btn ghost ${g==="report"?"active":""}`,onClick:()=>f("report"),children:[e.jsx(K,{"aria-hidden":!0})," Overview report"]}),e.jsxs("button",{type:"button",className:`btn ghost ${g==="logs"?"active":""}`,onClick:()=>f("logs"),children:[e.jsx(ge,{"aria-hidden":!0})," Activity timeline"]})]}),e.jsxs("div",{className:"activity-panel",children:[e.jsxs("div",{className:"activity-panel__head",children:[e.jsxs("div",{className:"activity-panel__title",children:[e.jsx(ve,{"aria-hidden":!0}),e.jsxs("div",{children:[e.jsx("strong",{children:"Filters"}),e.jsxs("p",{className:"muted",children:["Narrow results ",V,"."]})]})]}),e.jsx("div",{className:"activity-presets",role:"group","aria-label":"Date range",children:Ne.map(t=>e.jsx("button",{type:"button",className:`btn ghost ${_===t.id?"active":""}`,onClick:()=>ce(t.id),children:t.label},t.id))})]}),e.jsxs("form",{className:"activity-filters",onSubmit:re,children:[e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Search"}),e.jsxs("div",{className:"activity-field__input",children:[e.jsx(ye,{"aria-hidden":!0}),e.jsx("input",{type:"search",placeholder:"Name, email, description, or page path…",value:u.q,onChange:t=>o(i=>({...i,q:t.target.value}))})]})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"Action type"}),e.jsx("input",{type:"text",placeholder:"e.g. auth.login",value:u.action,onChange:t=>o(i=>({...i,action:t.target.value})),list:"activity-action-suggestions"}),e.jsx("datalist",{id:"activity-action-suggestions",children:Object.keys(N).map(t=>e.jsx("option",{value:t,children:N[t]},t))})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"User ID"}),e.jsx("input",{type:"number",min:"0",placeholder:"0 = guests",value:u.user_id,onChange:t=>o(i=>({...i,user_id:t.target.value}))})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"From"}),e.jsx("input",{type:"date",value:u.from,onChange:t=>{y("custom"),o(i=>({...i,from:t.target.value}))}})]}),e.jsxs("label",{className:"activity-field",children:[e.jsx("span",{children:"To"}),e.jsx("input",{type:"date",value:u.to,onChange:t=>{y("custom"),o(i=>({...i,to:t.target.value}))}})]}),e.jsxs("div",{className:"activity-filters__actions",children:[e.jsx("button",{type:"submit",className:"btn",children:"Apply filters"}),e.jsx("button",{type:"button",className:"btn ghost",onClick:ne,children:"Reset"})]})]})]}),z&&e.jsx("div",{className:"alert",children:z}),se?e.jsx("div",{className:"state",children:"Loading activity…"}):g==="report"?r?e.jsxs("div",{className:"activity-report",children:[e.jsxs("div",{className:"activity-stat-grid",children:[e.jsx(F,{icon:Y,accent:"events",label:"Total activities",value:(p==null?void 0:p.total)??0,hint:"All recorded actions in this period"}),e.jsx(F,{icon:fe,accent:"users",label:"People involved",value:(p==null?void 0:p.unique_users)??0,hint:"Unique users who triggered activity"}),e.jsx(F,{icon:W,accent:"actions",label:"Action types",value:(p==null?void 0:p.unique_actions)??0,hint:"Distinct kinds of activity"})]}),e.jsxs("div",{className:"activity-insight-grid",children:[e.jsxs("article",{className:"activity-insight-card",children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Most common action"}),e.jsx("h3",{children:n.topAction?b(n.topAction.action):"—"}),e.jsx("p",{className:"muted",children:n.topAction?`${n.topAction.count} time${n.topAction.count===1?"":"s"}`:"No actions yet"})]}),e.jsxs("article",{className:`activity-insight-card${n.topUser?" activity-insight-card--clickable":""}`,role:n.topUser?"button":void 0,tabIndex:n.topUser?0:void 0,onClick:()=>{n.topUser&&$(n.topUser)},onKeyDown:t=>{n.topUser&&(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),$(n.topUser))},children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Most active person"}),e.jsx("h3",{children:((B=n.topUser)==null?void 0:B.user_name)||((O=n.topUser)==null?void 0:O.user_email)||"—"}),e.jsx("p",{className:"muted",children:n.topUser?`${n.topUser.count} event${n.topUser.count===1?"":"s"}${n.topUser.user_role?` · ${n.topUser.user_role}`:""}`:"No users yet"}),n.topUser?e.jsx("p",{className:"activity-insight-card__cta muted",children:"View their activities →"}):null]}),e.jsxs("article",{className:"activity-insight-card",children:[e.jsx("p",{className:"activity-insight-card__eyebrow",children:"Busiest day"}),e.jsx("h3",{children:n.topDay?x(n.topDay.date):"—"}),e.jsx("p",{className:"muted",children:n.topDay?`${n.topDay.count} event${n.topDay.count===1?"":"s"}`:"No daily data yet"})]})]}),e.jsxs("div",{className:"activity-section-grid",children:[e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--chart",children:e.jsx(K,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"Activity by day"}),e.jsx("p",{className:"muted",children:"Daily volume over the selected period (last 14 days shown)."})]})]}),e.jsx(Q,{labels:E.labels,data:E.data})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--bolt",children:e.jsx(Y,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"Top actions"}),e.jsx("p",{className:"muted",children:"What people do most often in this hub."})]})]}),e.jsx(Q,{labels:P.labels,data:P.data})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--user",children:e.jsx(xe,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"By person"}),e.jsx("p",{className:"muted",children:"Who generated the most activity. Click a person to open their timeline."})]})]}),e.jsx(Z,{rows:r.by_user||[],total:M,getKey:(t,i)=>`${t.user_id||"guest"}-${i}`,getLabel:t=>[t.user_name||"Guest",t.user_email,t.user_role].filter(Boolean).join(" · "),isRowClickable:()=>!0,onRowClick:$})]}),e.jsxs("section",{className:"activity-section-card",children:[e.jsxs("header",{children:[e.jsx("div",{className:"activity-section-card__icon activity-section-card__icon--day",children:e.jsx(be,{})}),e.jsxs("div",{children:[e.jsx("h2",{children:"All action types"}),e.jsx("p",{className:"muted",children:"Full breakdown with share of total events."})]})]}),e.jsx(Z,{rows:r.by_action||[],total:M,getKey:t=>t.action,getLabel:t=>b(t.action)})]})]}),e.jsxs("div",{className:"activity-cta-bar",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Need the raw detail?"}),e.jsx("p",{className:"muted",children:"Open the timeline to see each event with who, what, and when."})]}),e.jsx("button",{type:"button",className:"btn",onClick:()=>f("logs"),children:"View activity timeline"})]})]}):e.jsxs("div",{className:"empty-state activity-empty",children:[e.jsx(W,{"aria-hidden":!0}),e.jsx("h2",{children:"No report data yet"}),e.jsx("p",{className:"muted",children:"Try a wider date range, or check back after users start using the hub."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"activity-feed-meta",children:[e.jsxs("p",{children:["Showing loaded events ",V,(j==null?void 0:j.total)!=null?e.jsxs(e.Fragment,{children:[" ","(",e.jsx("strong",{children:U.length})," of ",e.jsx("strong",{children:j.total}),")"]}):null,R?e.jsxs(e.Fragment,{children:[" ","for"," ",e.jsx("strong",{children:le?"Guest (anonymous)":`user ID ${a.user_id}`})]}):null,"."]}),R?e.jsx("button",{type:"button",className:"btn ghost",onClick:oe,children:"Clear person filter"}):null]}),e.jsx(_e,{columns:de,rows:U,loading:!1,emptyMessage:"No matching activity. Try clearing filters or widening the date range.",pageSize:10,getRowKey:t=>t.id})]}),e.jsx("style",{children:`
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
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
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
      `})]})}export{De as default};
