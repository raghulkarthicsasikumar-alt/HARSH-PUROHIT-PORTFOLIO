const {chromium}=require('playwright');
const path=require('path'); const fs=require('fs');
const PAGE='file://'+path.resolve(__dirname,'../dist/index.html');
const OUT=path.resolve(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});

const VP=[['wide',1920,950,false],['laptop',1440,800,false],['short',1280,640,false],['tablet',820,1180,true],['phone',390,844,true]];
const ids=['cover','about','jahaan','sugar','roots','guest-room','till-death','cuban','bts','contact'];
(async()=>{
 const b=await chromium.launch();
 for(const [name,w,h,touch] of VP){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch&&w<500});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_TUNNEL'))errs.push(m.text())});
  await p.goto(PAGE); await p.waitForTimeout(3000);
  const issues=[];
  const total=await p.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<total;y+=Math.round(h*0.5)){ await p.evaluate(y=>scrollTo(0,y),y); await p.waitForTimeout(50); }
  await p.waitForTimeout(1600);
  // spine continuity: at each scene boundary, the spine x (in page px) on both sides must match
  const sp=await p.evaluate(()=>{
    const out=[]; const secs=[...document.querySelectorAll('.scene')];
    const xs=secs.map(s=>{const svg=[...s.querySelectorAll('.wires')].find(v=>v.getClientRects().length);
      return [...svg.querySelectorAll('path.spine')].slice(0,2).map(pth=>{const r=pth.getBoundingClientRect();return Math.round(r.left+r.width/2)})});
    for(let i=1;i<xs.length;i++){ if(Math.abs(xs[i][0]-xs[i-1][0])>1||Math.abs(xs[i][1]-xs[i-1][1])>1) out.push('SPINE BREAK '+secs[i-1].id+'->'+secs[i].id+' '+xs[i-1]+' vs '+xs[i]); }
    // spine must span the full stage height
    secs.forEach(s=>{const st=s.querySelector('.stage').getBoundingClientRect(); const svg=[...s.querySelectorAll('.wires')].find(v=>v.getClientRects().length);
      const r=svg.querySelector('path.spine').getBoundingClientRect(); if(r.top>st.top+1||r.bottom<st.bottom-1) out.push('SPINE SHORT '+s.id+' '+[r.top-st.top,st.bottom-r.bottom].map(Math.round));});
    return out;});
  sp.forEach(x=>issues.push(x));
  for(const id of ids){
    await p.evaluate(id=>{const s=document.getElementById(id);const st=s.querySelector('.stage');const pin=s.offsetHeight>st.offsetHeight*1.5;const y=s.getBoundingClientRect().top+scrollY+(pin? s.offsetHeight-st.offsetHeight-2:0)-(document.querySelector('.hp.pm')?56:0);scrollTo(0,Math.max(0,y))},id);
    await p.waitForTimeout(250);
    const r=await p.evaluate(id=>{
      const out=[]; const s=document.getElementById(id); const st=s.querySelector('.stage').getBoundingClientRect();
      const vis=e=>{const cs=getComputedStyle(e);return e.getClientRects().length&&cs.display!=='none'};
      const els=[...s.querySelectorAll('.still,.line,.tagline,.ttl.big,.tl,.who,.links,.totop,.bl,.body.mb,.notes,.n-p,.watch')].filter(vis);
      for(const e of els){const r=e.getBoundingClientRect();
        if(r.left<st.left-1||r.right>st.right+1||r.top<st.top-1||r.bottom>st.bottom+1) out.push('OUT '+e.className+' '+e.textContent.slice(0,20)+' '+[r.left-st.left,r.right-st.left,r.bottom-st.top,st.height].map(Math.round));
        if(e.classList.contains('still')&&getComputedStyle(e).opacity<0.99) out.push('STILL NOT SHOWN');}
      const boxes=els.map(e=>[e,e.getBoundingClientRect()]);
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const [a,ra]=boxes[i],[c,rc]=boxes[j];
        if(a.contains(c)||c.contains(a))continue;
        const ox=Math.min(ra.right,rc.right)-Math.max(ra.left,rc.left), oy=Math.min(ra.bottom,rc.bottom)-Math.max(ra.top,rc.top);
        if(ox>2&&oy>2&&!(a.classList.contains('line')&&c.classList.contains('line'))) out.push('OVERLAP '+a.className+'|'+c.className);}
      // lines crossing notes text: sample the spine & run positions vs notes box
      const n=s.querySelector('.notes'); if(n&&vis(n)){const nr=n.getBoundingClientRect(); const svg=[...s.querySelectorAll('.wires')].find(v=>v.getClientRects().length);
        svg.querySelectorAll('path.spine').forEach(pth=>{const r=pth.getBoundingClientRect(); const x=r.left+r.width/2; if(x>nr.left&&x<nr.right) out.push('SPINE THROUGH NOTES');});}
      return out;},id);
    r.forEach(x=>issues.push(id+': '+x));
    await p.screenshot({path:`${OUT}/v3-${name}-${id}.png`});
  }
  // boundaries for visual continuity check
  for(const [a,bb] of [['cover','about'],['about','jahaan'],['jahaan','sugar'],['cuban','bts'],['bts','contact']]){
    await p.evaluate(id=>{const s=document.getElementById(id);scrollTo(0,s.getBoundingClientRect().top+scrollY-innerHeight/2)},bb); await p.waitForTimeout(250);
    await p.screenshot({path:`${OUT}/v3-${name}-seam-${bb}.png`});
  }
  const ov=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); if(ov[0]>ov[1]) issues.push('HORIZONTAL SCROLL '+ov);
  issues.push('watch links: '+JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.watch')].map(a=>a.href.slice(0,40)+' '+a.target))));
  if(!touch){
    await p.evaluate(()=>{const s=document.getElementById('roots');scrollTo(0,s.getBoundingClientRect().top+scrollY)}); await p.waitForTimeout(300);
    const st=await p.$('#roots .still:nth-of-type(2)'); const bb=await st.boundingBox();
    await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2,{steps:8}); await p.waitForTimeout(900);
    issues.push('card: '+await p.evaluate(()=>document.querySelector('.fcard').innerText.replace(/\s+/g,' ').slice(0,90)));
    issues.push('cursor: '+await p.evaluate(()=>getComputedStyle(document.querySelector('.still')).cursor.slice(0,30)));
    issues.push('drift on: '+await p.evaluate(()=>getComputedStyle(document.querySelector('#roots .still')).translate));
    await p.screenshot({path:`${OUT}/v3-${name}-hover.png`});
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(300);
    issues.push('lightbox: '+await p.evaluate(()=>document.querySelector('.lb-t').textContent+' | '+document.querySelector('.lb-l').textContent));
    await p.keyboard.press('Escape');
  }
  console.log('=== '+name, JSON.stringify(errs)); issues.forEach(x=>console.log('  '+x));
  await ctx.close();
 }
 await b.close();
})();
