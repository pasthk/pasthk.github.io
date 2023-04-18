import{u as V,a as P,k as W,b as _,m as z,l as B,n as G,y as J,h as K,d as N,c as T,v as X,L as Y,H as Z,e as ee,r as L}from"./app-1550fb23.js";import{c as te,A as ae,E as se,r as g,h as w,w as Q,j as t,R as E,L as le,i as ue}from"./framework-9ddc7cea.js";const re="search-pro-result-history",o=V(re,[]),ne=()=>{const{resultHistoryCount:u}=L,c=u>0;return{enabled:c,resultHistory:o,addResultHistory:l=>{c&&(o.value.length<u?o.value=[l,...o.value]:o.value=[l,...o.value.slice(0,u-1)])},removeResultHistory:l=>{o.value=[...o.value.slice(0,l),...o.value.slice(l+1)]}}},oe=u=>{const c=P(),l=g(!1),h=g([]);let i;const v=ee(d=>{l.value=!0,i==null||i.terminate(),d?(i=new Worker(`/${L.worker}`,{}),i.addEventListener("message",({data:f})=>{h.value=f,l.value=!1}),i.postMessage({query:d,routeLocale:c.value})):(h.value=[],l.value=!1)},L.delay);return Q([u,c],()=>v(u.value),{immediate:!0}),{searching:l,results:h}};var ve=te({name:"SearchResult",props:{query:{type:String,required:!0}},emits:["close","updateQuery"],setup(u,{emit:c}){const l=T(),h=ae(),i=P(),v=W(X),{addQueryHistory:d}=Y(),{enabled:f,resultHistory:b,addResultHistory:q,removeResultHistory:j}=ne(),R=se(u,"query"),{results:y,searching:x}=oe(R),r=g(0),s=g(0),C=w(()=>b.value.length>0),$=w(()=>y.value.length>0),k=w(()=>y.value[r.value]||null),U=()=>{r.value=r.value>0?r.value-1:y.value.length-1,s.value=k.value.contents.length-1},F=()=>{r.value=r.value<y.value.length-1?r.value+1:0,s.value=0},I=()=>{s.value<k.value.contents.length-1?s.value=s.value+1:F()},M=()=>{s.value>0?s.value=s.value-1:U()},D=e=>e.map(a=>ue(a)?a:t(a[0],a[1])),S=e=>{if(e.type==="custom"){const a=Z[e.index]||"$content",[p,m=""]=le(a)?a[i.value].split("$content"):a.split("$content");return D([p,...e.display,m])}return D(e.display)},H=()=>{r.value=0,s.value=0,c("updateQuery",""),c("close")};return _("keydown",e=>{if($.value){if(e.key==="ArrowUp")M();else if(e.key==="ArrowDown")I();else if(e.key==="Enter"){const a=k.value.contents[s.value];l.value.path!==a.path&&(d(u.query),q(a),h.push(a.path),H())}}}),Q([r,s],()=>{var e;(e=document.querySelector(".search-pro-result-list-item.active .search-pro-result-item.active"))==null||e.scrollIntoView(!1)},{flush:"post"}),()=>t("div",{class:["search-pro-result",{empty:R.value?!$.value:!C.value}],id:"search-pro-results"},R.value===""?C.value?t("ul",{class:"search-pro-result-list"},t("li",{class:"search-pro-result-list-item"},[t("div",{class:"search-pro-result-title"},v.value.history),b.value.map((e,a)=>t(E,{to:e.path,class:["search-pro-result-item",{active:s.value===a}],onClick:()=>{H()}},()=>[t(z,{class:"search-pro-result-type"}),t("div",{class:"search-pro-result-content"},[e.type==="content"&&e.header?t("div",{class:"content-header"},e.header):null,t("div",S(e))]),t("button",{class:"search-pro-close-icon",onClick:p=>{p.preventDefault(),p.stopPropagation(),j(a)}},t(B))]))])):f?v.value.emptyHistory:v.value.emptyResult:x.value?t(G,{hint:v.value.searching}):$.value?t("ul",{class:"search-pro-result-list"},y.value.map(({title:e,contents:a},p)=>{const m=r.value===p;return t("li",{class:["search-pro-result-list-item",{active:m}]},[t("div",{class:"search-pro-result-title"},e||"Documentation"),a.map((n,O)=>{const A=m&&s.value===O;return t(E,{to:n.path,class:["search-pro-result-item",{active:A,"aria-selected":A}],onClick:()=>{d(u.query),q(n),H()}},()=>[n.type==="content"?null:t(n.type==="title"?J:n.type==="heading"?K:N,{class:"search-pro-result-type"}),t("div",{class:"search-pro-result-content"},[n.type==="content"&&n.header?t("div",{class:"content-header"},n.header):null,t("div",S(n))])])})])})):v.value.emptyResult)}});export{ve as default};