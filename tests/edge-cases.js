const {chromium}=require('playwright');
const path=require('path'); const fs=require('fs');
const PAGE='file://'+path.resolve(__dirname,'../dist/index.html');
const OUT=path.resolve(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});

(async()=>{const b=await chromium.launch();
 let ctx=await b.newContext({viewport:{width:1440,height:860}}); let p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(PAGE+'#bts'); await p.waitForTimeout(1500);
 console.log('direct #bts', await p.evaluate(()=>[document.querySelector('.rail-scene').textContent, Math.round(document.getElementById('bts').getBoundingClientRect().top)]));
 await p.goto(PAGE+'#roots'); await p.waitForTimeout(1500);
 console.log('direct #roots', await p.evaluate(()=>[document.querySelector('.rail-scene').textContent, [...document.querySelectorAll('#roots .still')].map(s=>getComputedStyle(s).opacity).join(',')]));
 await ctx.close();
 ctx=await b.newContext({viewport:{width:1440,height:860},reducedMotion:'reduce'}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(PAGE); await p.waitForTimeout(800);
 console.log('reduced cover letters opacity', await p.evaluate(()=>[...document.querySelectorAll('#cover .lt')].map(l=>getComputedStyle(l).opacity).join('')));
 await p.evaluate(()=>{const s=document.getElementById('cuban');scrollTo(0,s.getBoundingClientRect().top+scrollY+10)}); await p.waitForTimeout(300);
 console.log('reduced cuban (scene just pinned) stills opacity', await p.evaluate(()=>[...document.querySelectorAll('#cuban .still')].map(s=>getComputedStyle(s).opacity).join(',')));
 // keyboard focus
 await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
 console.log('tab focus', await p.evaluate(()=>document.activeElement.className+' '+getComputedStyle(document.activeElement).outlineStyle));
 console.log('errs',errs); await b.close();})();
