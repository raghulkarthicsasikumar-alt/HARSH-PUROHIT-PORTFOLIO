const {chromium}=require('playwright');
const path=require('path'); const fs=require('fs');
const PAGE='file://'+path.resolve(__dirname,'../dist/index.html');
const OUT=path.resolve(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});

(async()=>{const b=await chromium.launch();
for(const [name,w,h] of [['wide',1920,950],['laptop',1440,800],['tablet',820,1180],['phone',390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(PAGE); await p.waitForTimeout(2500);
 const res=await p.evaluate(()=>{
  // parse a path into segments with start/end tangents; report joints that turn more than 12 degrees
  function segs(d){const t=d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);let i=0,cmd,x=0,y=0,sx=0,sy=0;const out=[];const n=()=>parseFloat(t[i++]);
   while(i<t.length){ if(/[A-Z]/i.test(t[i])) cmd=t[i++];
    if(cmd==='M'){x=n();y=n();sx=x;sy=y;out.push(null);cmd='L';continue;}
    let a=[x,y],pts;
    if(cmd==='L'){pts=[[n(),n()]];} else if(cmd==='H'){pts=[[n(),y]];} else if(cmd==='V'){pts=[[x,n()]];}
    else if(cmd==='Q'){pts=[[n(),n()],[n(),n()]];} else if(cmd==='C'){pts=[[n(),n()],[n(),n()],[n(),n()]];}
    else if(cmd==='Z'){pts=[[sx,sy]];}
    const e=pts[pts.length-1]; const c0=pts.length>1?pts[0]:e, c1=pts.length>1?pts[pts.length-2]:a;
    let t0=[c0[0]-a[0],c0[1]-a[1]]; if(Math.hypot(...t0)<1e-6&&pts.length>2) t0=[pts[1][0]-a[0],pts[1][1]-a[1]];
    const t1=[e[0]-c1[0],e[1]-c1[1]];
    if(Math.hypot(e[0]-a[0],e[1]-a[1])>0.05) out.push({a,e,t0,t1});
    x=e[0];y=e[1]; if(cmd==='Z')break;}
   return out;}
  const ang=(u,v)=>{const l=Math.hypot(...u)*Math.hypot(...v); if(!l) return 0; return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/l)))*180/Math.PI;};
  const bad=[];
  document.querySelectorAll('.scene').forEach(s=>{
   const svg=[...s.querySelectorAll('.wires')].find(v=>v.getClientRects().length); if(!svg) return;
   svg.querySelectorAll('g:first-of-type path.draw').forEach((pth,k)=>{
     const sg=segs(pth.getAttribute('d'));
     for(let i=1;i<sg.length;i++){ if(!sg[i]||!sg[i-1]) continue; const A=ang(sg[i-1].t1,sg[i].t0);
       if(A>12) bad.push(s.id+' stroke'+k+' joint at '+sg[i].a.map(v=>Math.round(v))+' turns '+Math.round(A)+'deg'); }
   });});
  return bad;});
 console.log('=== '+name, errs.length?errs:'', res.length? '\n  '+res.join('\n  '):'no sharp joints');
 await p.close();}
await b.close();})();
