import{r as i}from"./react-vendor-BFGqPeuW.js";import{w as b,u as v,v as R,x as S}from"./vendor-DfzQaJlM.js";var H=e=>typeof e=="function",$=(e,t)=>H(e)?e(t):e,B=(()=>{let e=0;return()=>(++e).toString()})(),A=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),F=20,T="default",P=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(s=>s.id===t.toast.id?{...s,...t.toast}:s)};case 2:let{toast:r}=t;return P(e,{type:e.toasts.find(s=>s.id===r.id)?1:0,toast:r});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(s=>s.id===o||o===void 0?{...s,dismissed:!0,visible:!1}:s)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(s=>s.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let n=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(s=>({...s,pauseDuration:s.pauseDuration+n}))}}},k=[],N={toasts:[],pausedAt:void 0,settings:{toastLimit:F}},y={},j=(e,t=T)=>{y[t]=P(y[t]||N,e),k.forEach(([a,r])=>{a===t&&r(y[t])})},L=e=>Object.keys(y).forEach(t=>j(e,t)),U=e=>Object.keys(y).find(t=>y[t].toasts.some(a=>a.id===e)),D=(e=T)=>t=>{j(t,e)},V={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},Y=(e={},t=T)=>{let[a,r]=i.useState(y[t]||N),o=i.useRef(y[t]);i.useEffect(()=>(o.current!==y[t]&&r(y[t]),k.push([t,r]),()=>{let s=k.findIndex(([m])=>m===t);s>-1&&k.splice(s,1)}),[t]);let n=a.toasts.map(s=>{var m,g,h;return{...e,...e[s.type],...s,removeDelay:s.removeDelay||((m=e[s.type])==null?void 0:m.removeDelay)||e?.removeDelay,duration:s.duration||((g=e[s.type])==null?void 0:g.duration)||e?.duration||V[s.type],style:{...e.style,...(h=e[s.type])==null?void 0:h.style,...s.style}}});return{...a,toasts:n}},K=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||B()}),x=e=>(t,a)=>{let r=K(t,e,a);return D(r.toasterId||U(r.id))({type:2,toast:r}),r.id},d=(e,t)=>x("blank")(e,t);d.error=x("error");d.success=x("success");d.loading=x("loading");d.custom=x("custom");d.dismiss=(e,t)=>{let a={type:3,toastId:e};t?D(t)(a):L(a)};d.dismissAll=e=>d.dismiss(void 0,e);d.remove=(e,t)=>{let a={type:4,toastId:e};t?D(t)(a):L(a)};d.removeAll=e=>d.remove(void 0,e);d.promise=(e,t,a)=>{let r=d.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(o=>{let n=t.success?$(t.success,o):void 0;return n?d.success(n,{id:r,...a,...a?.success}):d.dismiss(r),o}).catch(o=>{let n=t.error?$(t.error,o):void 0;n?d.error(n,{id:r,...a,...a?.error}):d.dismiss(r)}),e};var Q=1e3,W=(e,t="default")=>{let{toasts:a,pausedAt:r}=Y(e,t),o=i.useRef(new Map).current,n=i.useCallback((l,p=Q)=>{if(o.has(l))return;let c=setTimeout(()=>{o.delete(l),s({type:4,toastId:l})},p);o.set(l,c)},[]);i.useEffect(()=>{if(r)return;let l=Date.now(),p=a.map(c=>{if(c.duration===1/0)return;let w=(c.duration||0)+c.pauseDuration-(l-c.createdAt);if(w<0){c.visible&&d.dismiss(c.id);return}return setTimeout(()=>d.dismiss(c.id,t),w)});return()=>{p.forEach(c=>c&&clearTimeout(c))}},[a,r,t]);let s=i.useCallback(D(t),[t]),m=i.useCallback(()=>{s({type:5,time:Date.now()})},[s]),g=i.useCallback((l,p)=>{s({type:1,toast:{id:l,height:p}})},[s]),h=i.useCallback(()=>{r&&s({type:6,time:Date.now()})},[r,s]),u=i.useCallback((l,p)=>{let{reverseOrder:c=!1,gutter:w=8,defaultPosition:z}=p||{},I=a.filter(f=>(f.position||z)===(l.position||z)&&f.height),M=I.findIndex(f=>f.id===l.id),O=I.filter((f,C)=>C<M&&f.visible).length;return I.filter(f=>f.visible).slice(...c?[O+1]:[0,O]).reduce((f,C)=>f+(C.height||0)+w,0)},[a]);return i.useEffect(()=>{a.forEach(l=>{if(l.dismissed)n(l.id,l.removeDelay);else{let p=o.get(l.id);p&&(clearTimeout(p),o.delete(l.id))}})},[a,n]),{toasts:a,handlers:{updateHeight:g,startPause:m,endPause:h,calculateOffset:u}}},Z=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,_=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,q=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,G=b("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Z} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${_} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${q} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,J=v`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,X=b("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${J} 1s linear infinite;
`,ee=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,te=v`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ae=b("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ee} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${te} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,se=b("div")`
  position: absolute;
`,re=b("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ie=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,oe=b("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ie} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ne=({toast:e})=>{let{icon:t,type:a,iconTheme:r}=e;return t!==void 0?typeof t=="string"?i.createElement(oe,null,t):t:a==="blank"?null:i.createElement(re,null,i.createElement(X,{...r}),a!=="loading"&&i.createElement(se,null,a==="error"?i.createElement(G,{...r}):i.createElement(ae,{...r})))},le=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,de=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,ce="0%{opacity:0;} 100%{opacity:1;}",ue="0%{opacity:1;} 100%{opacity:0;}",pe=b("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,me=b("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,fe=(e,t)=>{let a=e.includes("top")?1:-1,[r,o]=A()?[ce,ue]:[le(a),de(a)];return{animation:t?`${v(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ye=i.memo(({toast:e,position:t,style:a,children:r})=>{let o=e.height?fe(e.position||t||"top-center",e.visible):{opacity:0},n=i.createElement(ne,{toast:e}),s=i.createElement(me,{...e.ariaProps},$(e.message,e));return i.createElement(pe,{className:e.className,style:{...o,...a,...e.style}},typeof r=="function"?r({icon:n,message:s}):i.createElement(i.Fragment,null,n,s))});S(i.createElement);var he=({id:e,className:t,style:a,onHeightUpdate:r,children:o})=>{let n=i.useCallback(s=>{if(s){let m=()=>{let g=s.getBoundingClientRect().height;r(e,g)};m(),new MutationObserver(m).observe(s,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return i.createElement("div",{ref:n,className:t,style:a},o)},ve=(e,t)=>{let a=e.includes("top"),r=a?{top:0}:{bottom:0},o=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:A()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...r,...o}},ge=R`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,E=16,we=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:r,children:o,toasterId:n,containerStyle:s,containerClassName:m})=>{let{toasts:g,handlers:h}=W(a,n);return i.createElement("div",{"data-rht-toaster":n||"",style:{position:"fixed",zIndex:9999,top:E,left:E,right:E,bottom:E,pointerEvents:"none",...s},className:m,onMouseEnter:h.startPause,onMouseLeave:h.endPause},g.map(u=>{let l=u.position||t,p=h.calculateOffset(u,{reverseOrder:e,gutter:r,defaultPosition:t}),c=ve(l,p);return i.createElement(he,{id:u.id,key:u.id,onHeightUpdate:h.updateHeight,className:u.visible?ge:"",style:c},u.type==="custom"?$(u.message,u):o?o(u):i.createElement(ye,{toast:u,position:l}))}))},Ee=d;export{ae as CheckmarkIcon,G as ErrorIcon,X as LoaderIcon,ye as ToastBar,ne as ToastIcon,we as Toaster,Ee as default,$ as resolveValue,d as toast,W as useToaster,Y as useToasterStore};
