import{r as o,j as e,L as G}from"./react-vendor-BFGqPeuW.js";import{i as K,S as q,B as N}from"./index-BI2noxGR.js";import{X as H}from"./icon-vendor-BoGbq-zp.js";import{m as S}from"./motion-vendor-Cz0DWRTC.js";import"./vendor-DfzQaJlM.js";import"./data-vendor-Dj4BsAhh.js";import"./form-vendor-Dq5WIGd1.js";const V=s=>s.trim().split(/\s+/).slice(0,2).map(i=>i[0]?.toUpperCase()??"").join(""),Z=s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-"),_=s=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(s)}`,B=new Map,J=s=>`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='280' y2='164' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#121722'/>
      <stop offset='1' stop-color='#060911'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(236 28) rotate(138.366) scale(98.1671 71.2197)'>
      <stop stop-color='#D4AF37' stop-opacity='.28'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(74 146) rotate(41.9872) scale(86.2849 61.2251)'>
      <stop stop-color='#3B82F6' stop-opacity='.22'/>
      <stop offset='1' stop-color='#3B82F6' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='248' cy='28' r='34' fill='url(#goldGlow)'/>
  <circle cx='56' cy='154' r='30' fill='url(#blueGlow)'/>
  <rect x='58' y='36' width='204' height='104' rx='28' fill='#0B1120' stroke='#DCE7FF' stroke-width='3'/>
  <rect x='94' y='74' width='132' height='4' rx='2' fill='#2C3548'/>
  <text x='160' y='120' text-anchor='middle' fill='#F4F7FF' font-size='24' font-family='Arial, sans-serif' font-weight='700'>
    ${s}
  </text>
</svg>`,Q={smartphones:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 26) rotate(140) scale(92 68)'>
      <stop stop-color='#D4AF37' stop-opacity='.26'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(62 150) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.24'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='24' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='31' fill='url(#blueGlow)'/>
  <rect x='94' y='16' width='10' height='148' rx='5' fill='#6E737A'/>
  <rect x='116' y='14' width='110' height='152' rx='28' fill='#1A2C53' stroke='#6CA0FF' stroke-width='4'/>
  <rect x='142' y='34' width='58' height='90' rx='13' fill='#0B1730'/>
  <circle cx='171' cy='142' r='5' fill='#32446A'/>
</svg>`,laptops:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='26' y1='12' x2='286' y2='168' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#060911'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(246 30) rotate(141) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.26'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='88' y='20' width='140' height='102' rx='16' fill='#2C3342'/>
  <rect x='94' y='24' width='128' height='94' rx='14' fill='#0F1E41' stroke='#5879BE' stroke-width='4'/>
  <rect x='116' y='40' width='84' height='48' rx='10' fill='#14244A'/>
  <rect x='70' y='128' width='180' height='24' rx='12' fill='#D3A52B'/>
  <rect x='84' y='130' width='152' height='10' rx='5' fill='#8B6616'/>
</svg>`,printers:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(246 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='126' y='8' width='68' height='42' rx='8' fill='#F1F5F9'/>
  <rect x='96' y='42' width='128' height='88' rx='20' fill='#1C2C4D' stroke='#607CB6' stroke-width='4'/>
  <rect x='126' y='78' width='68' height='16' rx='8' fill='#0F1A31'/>
  <rect x='104' y='126' width='112' height='40' rx='10' fill='#E2E8F0'/>
</svg>`,accessories:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='96' y='14' width='54' height='90' rx='16' fill='#1B315B' stroke='#6A90D8' stroke-width='4'/>
  <path d='M176 18C220 18 246 48 246 92V124' stroke='#F3F6FB' stroke-width='14' stroke-linecap='round'/>
  <rect x='206' y='124' width='34' height='34' rx='8' fill='#D5A625'/>
  <rect x='138' y='18' width='12' height='28' rx='4' fill='#D5A625'/>
  <rect x='154' y='18' width='12' height='28' rx='4' fill='#D5A625'/>
</svg>`,audio:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 30) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <path d='M112 130V88C112 48 136 20 160 20C184 20 208 48 208 88V130' stroke='#F2F6FB' stroke-width='16' stroke-linecap='round'/>
  <rect x='86' y='94' width='34' height='60' rx='16' fill='#193268'/>
  <rect x='200' y='94' width='34' height='60' rx='16' fill='#193268'/>
  <circle cx='160' cy='102' r='18' fill='#D3A52B'/>
  <circle cx='160' cy='102' r='11' fill='#112044'/>
</svg>`,tablets:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <rect x='70' y='10' width='16' height='160' rx='8' fill='#6E737A'/>
  <rect x='86' y='12' width='148' height='156' rx='24' fill='#1A2C53' stroke='#6CA0FF' stroke-width='4'/>
  <rect x='112' y='30' width='96' height='108' rx='16' fill='#0F1D3D'/>
</svg>`,"smart-home":`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <path d='M98 94L160 34L222 94V150H98V94Z' fill='#20355E' stroke='#6A7D9F' stroke-width='4'/>
  <rect x='144' y='108' width='32' height='42' rx='8' fill='#101B32'/>
</svg>`,gaming:`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <path d='M126 126H194C208 126 220 114 222 100L228 68C232 42 212 22 188 22H132C108 22 88 42 92 68L98 100C100 114 112 126 126 126Z' fill='#21345E' stroke='#647693' stroke-width='4'/>
  <rect x='120' y='72' width='14' height='36' rx='7' fill='#101B32'/>
  <rect x='108' y='84' width='38' height='12' rx='6' fill='#101B32'/>
  <circle cx='202' cy='76' r='10' fill='#D3A52B'/>
  <circle cx='228' cy='92' r='10' fill='#E7EDF8'/>
</svg>`},W=s=>{const i=Z(s.slug||s.name),n=s.name.trim()||"Category",a=`${i}:${n}`,c=B.get(a);if(c)return c;const d=_(Q[i]??J(n));return B.set(a,d),d},k="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4 sm:gap-3.5 xl:grid-cols-5",I=o.memo(({item:s,onSelect:i,onImageError:n})=>{const{category:a,image:c,imageKey:d,rawImageUrl:m,isUsingFallbackImage:p}=s,w=o.useCallback(()=>{!m||p||n(d)},[d,p,n,m]);return e.jsx(G,{to:`/shop?category=${a.id}`,onClick:i,"aria-label":`Shop ${a.name}`,title:a.name,className:"group block h-full",children:e.jsxs("div",{className:"catalog-card relative flex aspect-auto flex-col justify-between overflow-visible rounded-[16px] p-1 sm:aspect-square sm:rounded-[20px] sm:p-2",children:[e.jsx("div",{className:"relative flex min-h-0 flex-1 items-center justify-center",children:e.jsx("div",{className:"catalog-card-media flex h-[4.55rem] w-full items-center justify-center overflow-hidden rounded-[14px] min-[380px]:h-[5.1rem] sm:h-full sm:rounded-[16px]",children:e.jsx("img",{src:c,alt:a.image?.alt??a.name,className:`h-full w-full object-contain object-center ${p?"p-1.5":"p-1 sm:p-1.5"}`,loading:"lazy",decoding:"async",onError:w})})}),e.jsx("div",{className:"relative mt-1.5 flex min-h-[1.9rem] items-center justify-center px-0.5 text-center sm:mt-1.5 sm:min-h-[2.15rem] sm:px-1",children:e.jsx("span",{className:"catalog-card-title text-[0.78rem] font-semibold leading-tight sm:text-[0.94rem]",children:a.name})})]})})});I.displayName="CategoryCatalogCard";const P=o.memo(({item:s,onSelect:i,onLogoError:n})=>{const{brand:a,logoUrl:c}=s,d=o.useCallback(()=>n(a.id),[a.id,n]);return e.jsx(G,{to:`/shop?brand=${encodeURIComponent(a.slug)}`,onClick:i,"aria-label":`Shop ${a.name} brand`,title:a.name,className:"group block h-full",children:e.jsxs("div",{className:"catalog-card catalog-brand-card relative flex aspect-auto flex-col justify-between overflow-visible rounded-[16px] p-1 sm:aspect-square sm:rounded-[20px] sm:p-2",children:[e.jsx("div",{className:"relative flex min-h-0 flex-1 items-center justify-center",children:e.jsx("div",{className:"catalog-card-media catalog-brand-media flex h-[4.55rem] w-full items-center justify-center overflow-hidden rounded-[14px] px-2 min-[380px]:h-[5.1rem] sm:h-full sm:rounded-[16px] sm:px-2.5",children:c?e.jsx("img",{src:c,alt:`${a.name} logo`,className:"brand-logo-image catalog-brand-logo w-auto max-w-full object-contain",loading:"lazy",decoding:"async",onError:d}):e.jsx("span",{className:"catalog-card-title catalog-brand-monogram text-[0.72rem] font-semibold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]",children:V(a.name)})})}),e.jsx("div",{className:"relative mt-1.5 flex min-h-[1.9rem] items-center justify-center px-0.5 text-center sm:mt-1.5 sm:min-h-[2.15rem] sm:px-1",children:e.jsx("span",{className:"catalog-card-title text-[0.78rem] font-semibold leading-tight sm:text-[0.94rem]",children:a.name})})]})})});P.displayName="BrandCatalogCard";const tt=o.memo(({catalogView:s,setCatalogView:i,categoryMenuItems:n,brandMenuItems:a,categoriesState:c,brandsState:d,failedCategoryImages:m,failedBrandLogos:p,reduceMotion:w,onClose:x,onCategoryImageError:O,onBrandLogoError:T})=>{const y=o.useRef(null),h=o.useRef(null),b=o.useRef(!1),f=o.useRef(!1),v=o.useRef(!1);o.useEffect(()=>{if(typeof window>"u"||typeof window.requestAnimationFrame!="function"){v.current=!0;return}const t=window.requestAnimationFrame(()=>{v.current=!0});return()=>window.cancelAnimationFrame(t)},[]);const C=o.useMemo(()=>n.map(t=>{const r=t.image?.url?.trim(),l=r&&!K(r)?r:void 0,g=l||t.id,u=W(t),A=m[g]?u:l||u;return{category:t,image:A,imageKey:g,rawImageUrl:l,isUsingFallbackImage:A===u}}),[n,m]),F=o.useMemo(()=>a.map(t=>({brand:t,logoUrl:p[t.id]?void 0:t.logoUrl})),[a,p]),E=!w&&v.current?{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.16,ease:[.22,1,.36,1]}}:{},M=(t,r)=>{const l=t.getBoundingClientRect();return r<l.left+l.width/2?"categories":"brands"},R=o.useCallback(t=>{t.pointerType!=="mouse"&&(y.current={pointerId:t.pointerId,startX:t.clientX,startY:t.clientY,hasDragged:!1},t.currentTarget.setPointerCapture?.(t.pointerId))},[]),X=o.useCallback(t=>{const r=y.current;if(!r||r.pointerId!==t.pointerId)return;const l=t.clientX-r.startX,g=t.clientY-r.startY;Math.abs(l)<10||Math.abs(l)<=Math.abs(g)||(t.preventDefault(),r.hasDragged=!0,b.current=!0,i(M(t.currentTarget,t.clientX)))},[i]),U=o.useCallback(t=>{const r=y.current;!r||r.pointerId!==t.pointerId||(r.hasDragged&&(b.current=!0),t.currentTarget.releasePointerCapture?.(t.pointerId),y.current=null)},[]),$=o.useCallback(t=>{if(b.current){b.current=!1;return}i(t)},[i]),Y=o.useCallback(t=>{t.pointerType!=="mouse"&&(f.current=!1,h.current={pointerId:t.pointerId,startX:t.clientX,startY:t.clientY,hasDragged:!1},t.currentTarget.setPointerCapture?.(t.pointerId))},[]),z=o.useCallback(t=>{const r=h.current;if(!r||r.pointerId!==t.pointerId)return;const l=t.clientX-r.startX,g=t.clientY-r.startY;Math.abs(l)<42||Math.abs(l)<=Math.abs(g)*1.25||(t.preventDefault(),r.hasDragged=!0,f.current=!0,i(u=>u==="categories"?"brands":"categories"),t.currentTarget.releasePointerCapture?.(t.pointerId),h.current=null)},[i]),j=o.useCallback(t=>{const r=h.current;!r||r.pointerId!==t.pointerId||(r.hasDragged&&(f.current=!0),t.currentTarget.releasePointerCapture?.(t.pointerId),h.current=null)},[]),D=o.useCallback(t=>{if(f.current){t.preventDefault(),f.current=!1;return}x()},[x]),L=s==="categories"?c.isPending&&C.length===0:d.isPending&&F.length===0;return e.jsxs("div",{className:"relative overflow-hidden",children:[e.jsx("div",{className:"catalog-panel-ambient","aria-hidden":"true"}),e.jsx("button",{type:"button",onClick:x,"aria-label":"Close modal",className:"catalog-close-button absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px motion-reduce:transform-none sm:right-4 sm:top-4 sm:h-11 sm:w-11",children:e.jsx(H,{className:"h-4 w-4 sm:h-5 sm:w-5"})}),e.jsx("div",{className:"px-2 pb-2.5 pt-2.5 sm:px-4 sm:pb-4 sm:pt-4",children:e.jsx("div",{className:"flex justify-center pr-8 min-[360px]:pr-10 sm:pr-12",children:e.jsx("div",{role:"tablist","aria-label":"Browse categories or brands",className:"catalog-switch relative inline-flex max-w-[calc(100vw-4.75rem)] touch-pan-y rounded-full p-1",onPointerDown:R,onPointerMove:X,onPointerUp:U,onPointerCancel:U,children:[{key:"categories",label:"Categories",count:C.length},{key:"brands",label:"Brands",count:F.length}].map(t=>{const r=s===t.key;return e.jsxs("button",{type:"button",role:"tab","aria-selected":r,onClick:()=>$(t.key),className:`catalog-switch-button relative inline-flex h-9 min-w-0 items-center gap-1 rounded-full px-2 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 min-[360px]:gap-1.5 min-[360px]:px-3 min-[360px]:text-[10px] min-[360px]:tracking-[0.18em] sm:h-10 sm:gap-2.5 sm:px-4 sm:text-[11px] sm:tracking-[0.24em] ${r?"catalog-switch-button-active":""}`,children:[r?e.jsx(S.span,{layoutId:"catalog-switch-pill",className:"catalog-switch-pill absolute inset-0 rounded-full",transition:w?void 0:{duration:.2,ease:[.22,1,.36,1]}}):null,e.jsx("span",{className:"relative z-10 truncate",children:t.label}),e.jsx("span",{className:`catalog-switch-count relative z-10 inline-flex min-w-[1.35rem] shrink-0 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-semibold min-[360px]:min-w-[1.45rem] min-[360px]:text-[10px] sm:min-w-[1.8rem] sm:px-1.5 sm:py-1 sm:text-[11px] ${r?"catalog-switch-count-active":""}`,children:t.count})]},t.key)})})})}),e.jsx("div",{role:"group","aria-label":"Catalog items",className:"touch-pan-y px-3 pb-3 sm:px-4 sm:pb-4",onPointerDown:Y,onPointerMove:z,onPointerUp:j,onPointerCancel:j,children:e.jsx(S.div,{className:"contents",...E,children:L?e.jsx("div",{className:k,children:Array.from({length:8},(t,r)=>e.jsx(q,{className:"aspect-[0.86] rounded-[16px] sm:aspect-square sm:rounded-[22px]"},r))}):s==="categories"?c.isError?e.jsxs("div",{className:"catalog-empty-state rounded-[28px] p-8 text-center",children:[e.jsx("p",{className:"text-sm text-gray-400",children:"Categories are temporarily unavailable."}),e.jsx(G,{to:"/shop",onClick:x,className:"mt-5 inline-flex",children:e.jsx(N,{children:"Open Shop"})})]}):C.length?e.jsx("div",{className:k,children:C.map(t=>e.jsx(I,{item:t,onSelect:D,onImageError:O},t.category.id))}):e.jsx("div",{className:"catalog-empty-state rounded-[28px] p-8 text-center",children:e.jsx("p",{className:"text-sm text-gray-400",children:"No categories available right now."})}):d.isError?e.jsxs("div",{className:"catalog-empty-state rounded-[28px] p-8 text-center",children:[e.jsx("p",{className:"text-sm text-gray-400",children:"Brands are temporarily unavailable."}),e.jsx(G,{to:"/shop",onClick:x,className:"mt-5 inline-flex",children:e.jsx(N,{children:"Open Shop"})})]}):F.length?e.jsx("div",{className:k,children:F.map(t=>e.jsx(P,{item:t,onSelect:D,onLogoError:T},t.brand.id))}):e.jsx("div",{className:"catalog-empty-state rounded-[28px] p-8 text-center",children:e.jsx("p",{className:"text-sm text-gray-400",children:"No brands available right now."})})},s)})]})});tt.displayName="CatalogPanel";export{tt as CatalogPanel};
