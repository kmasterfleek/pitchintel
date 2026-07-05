/**
 * PitchIntel — Broadcast Overlay
 *
 * A clean, TV-ready single-pitch view with semi-transparent graph
 * intelligence overlaid. Designed to look like it belongs on Sky Sports
 * or ESPN — not a data dashboard, a broadcast graphic.
 *
 * Visual language:
 *   - Lush green pitch (broadcast standard)
 *   - MinCut corridor: pulsing red translucent band
 *   - Passing lanes: crisp green arrows (only top 3, not cluttered)
 *   - Press trigger: screen-edge flash + lower-third alert
 *   - MinCut gauge: subtle arc in corner (like a speedometer)
 *   - Player dots: clean, minimal, broadcast-sized
 *   - Commentary prompts: auto-generated text for what a pundit would say
 *
 * Usage: npx tsx src/pitch-intel/broadcast.ts
 */

import { generateSyntheticMatch } from './data/synthetic.js';
import { analyzeMatch } from './analysis/tactical.js';
import {
  buildPassingGraph, buildDefensiveGraph, stoerWagnerMinCut,
  personalizedPageRank, countSafePassingLanes, detectFormation
} from './graph/engine.js';
import type { Match, Frame } from './types.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Frame extraction (compact for broadcast) ────────────────

interface BFrame {
  t: number; m: number; s: number;
  h: number[][]; a: number[][];  // [jersey, x, y]
  bx: number; by: number; bh: string | null;
  pos: string;
  mcH: number; mcA: number;
  corr: number[][];
  cT: string; // which team's defense the corridor cuts through
  pl: number[][]; // passing lanes [x1,y1,x2,y2,prob]
  sl: number; // safe lanes
  // Commentary
  com: string | null;
}

function extract(match: Match, report: any): BFrame[] {
  const out: BFrame[] = [];
  const moments = new Map<number, any>();
  for (const m of report.moments) {
    if (!moments.has(m.frameIndex) && (m.severity === 'critical' || m.severity === 'high')) {
      moments.set(m.frameIndex, m);
    }
  }

  let lastCom = -999;

  for (let fi = 0; fi < match.frames.length; fi += 5) {
    const f = match.frames[fi];
    const pt = f.possession as 'home' | 'away';
    const dt = pt === 'home' ? 'away' : 'home';

    const hDG = buildDefensiveGraph(f, 'home');
    const aDG = buildDefensiveGraph(f, 'away');
    const hC = stoerWagnerMinCut(hDG);
    const aC = stoerWagnerMinCut(aDG);
    const pG = buildPassingGraph(f, pt);
    const sl = countSafePassingLanes(f, pt);

    // Corridor
    const cut = dt === 'home' ? hC : aC;
    const dPlayers = f[dt];
    const corr: number[][] = [];
    for (const e of cut.cutEdges) {
      const pA = dPlayers.find(p => p.id === e.from);
      const pB = dPlayers.find(p => p.id === e.to);
      if (pA && pB) corr.push([
        Math.round((pA.pos.x + pB.pos.x) / 2 * 10) / 10,
        Math.round((pA.pos.y + pB.pos.y) / 2 * 10) / 10
      ]);
    }
    corr.sort((a, b) => a[1] - b[1]);

    // Top 3 passing lanes
    const pl: number[][] = [];
    if (f.ball.holder) {
      const hp = [...f.home, ...f.away].find(p => p.id === f.ball.holder);
      const adj = pG.adjacency.get(f.ball.holder);
      if (hp && adj) {
        const sorted = [...adj.entries()].sort((a, b) => b[1] - a[1]);
        for (const [tid, w] of sorted.slice(0, 3)) {
          const tp = [...f.home, ...f.away].find(p => p.id === tid);
          if (tp && w > 0.08) {
            pl.push([
              Math.round(hp.pos.x * 10) / 10, Math.round(hp.pos.y * 10) / 10,
              Math.round(tp.pos.x * 10) / 10, Math.round(tp.pos.y * 10) / 10,
              Math.round(w * 100) / 100
            ]);
          }
        }
      }
    }

    // Commentary generation
    let com: string | null = null;
    const moment = moments.get(fi);
    if (moment && f.time - lastCom > 8) {
      const mcVal = dt === 'home' ? hC.value : aC.value;
      if (moment.type === 'press_trigger') {
        com = sl <= 1
          ? `Only ONE safe passing option. This is the moment to press.`
          : `Just ${sl} passing lanes available — the pressing window is open.`;
      } else if (moment.type === 'vulnerability') {
        const side = corr.length > 0
          ? (corr[0][1] < -10 ? 'left' : corr[0][1] > 10 ? 'right' : 'central')
          : 'the defense';
        com = `The defensive structure has opened up on the ${side} — MinCut drops to ${mcVal.toFixed(2)}.`;
      } else if (moment.type === 'formation_break') {
        com = `The formation is drifting. The shape is losing its structure.`;
      } else if (moment.type === 'passing_overload') {
        com = `Numerical overload building. Extra players flooding this zone.`;
      }
      if (com) lastCom = f.time;
    }

    out.push({
      t: f.time, m: f.minute, s: f.second,
      h: f.home.map(p => [p.jersey, Math.round(p.pos.x * 10) / 10, Math.round(p.pos.y * 10) / 10]),
      a: f.away.map(p => [p.jersey, Math.round(p.pos.x * 10) / 10, Math.round(p.pos.y * 10) / 10]),
      bx: Math.round(f.ball.pos.x * 10) / 10,
      by: Math.round(f.ball.pos.y * 10) / 10,
      bh: f.ball.holder, pos: f.possession,
      mcH: Math.round(hC.value * 1000) / 1000,
      mcA: Math.round(aC.value * 1000) / 1000,
      corr, cT: dt, pl, sl, com,
    });
  }
  return out;
}

// ─── HTML ────────────────────────────────────────────────────

function html(frames: BFrame[], match: Match): string {
  const d = JSON.stringify(frames);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PitchIntel Broadcast — ${match.homeTeam} vs ${match.awayTeam}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;overflow:hidden;font-family:'Inter',-apple-system,sans-serif}
canvas{display:block;width:100vw;height:100vh}

/* Lower third */
#lt{position:fixed;bottom:0;left:0;right:0;height:54px;display:flex;align-items:center;
  background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.3));padding:0 30px;
  transition:opacity .4s}
#ltBrand{font-size:11px;font-weight:700;color:#00d4ff;letter-spacing:2px;text-transform:uppercase;margin-right:20px}
#ltScore{font-size:14px;color:#fff;font-weight:600;margin-right:24px}
#ltTime{font-size:13px;color:#88aacc;font-family:'JetBrains Mono',monospace;margin-right:24px}
#ltInfo{font-size:12px;color:#667788;flex:1}

/* Commentary overlay */
#comBox{position:fixed;bottom:64px;left:30px;right:30px;padding:14px 22px;
  background:rgba(0,10,20,.88);border-left:3px solid #00d4ff;border-radius:0 8px 8px 0;
  font-size:14px;color:#d0dde8;line-height:1.5;opacity:0;transition:opacity .5s;
  pointer-events:none;max-width:700px}
#comBox.vis{opacity:1}
#comLabel{font-size:10px;color:#00d4ff;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}

/* Alert flash */
#alertFlash{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;
  background:radial-gradient(ellipse at center,transparent 40%,rgba(255,30,50,.08) 100%);
  opacity:0;transition:opacity .3s}
#alertFlash.on{opacity:1}

/* Controls (hidden in broadcast, shown on hover) */
#ctrl{position:fixed;top:10px;right:10px;opacity:0;transition:opacity .3s;display:flex;gap:8px;z-index:10}
#ctrl:hover{opacity:1}
body:hover #ctrl{opacity:.6}
#ctrl button{background:rgba(0,0,0,.7);color:#889;border:1px solid #334;padding:5px 12px;
  border-radius:4px;cursor:pointer;font-size:11px}
#ctrl button:hover{color:#fff;border-color:#00d4ff}
#ctrl input{width:200px;accent-color:#00d4ff}
</style>
</head>
<body>
<canvas id="c"></canvas>

<div id="alertFlash"></div>

<div id="comBox">
  <div id="comLabel">PitchIntel Analysis</div>
  <div id="comText"></div>
</div>

<div id="lt">
  <div id="ltBrand">PitchIntel</div>
  <div id="ltScore">${match.homeTeam} vs ${match.awayTeam}</div>
  <div id="ltTime">0:00</div>
  <div id="ltInfo">Powered by RuVector Graph Engine</div>
</div>

<div id="ctrl">
  <button id="pb">Play</button>
  <button onclick="ci=Math.max(0,ci-50);draw()">-5s</button>
  <input type="range" id="sc" min="0" max="${frames.length - 1}" value="0">
  <button onclick="ci=Math.min(F.length-1,ci+50);draw()">+5s</button>
  <button id="sb">1x</button>
  <button id="tb">Toggle Intel</button>
</div>

<script>
const F=${d};
const FL=105,FW=68,HL=FL/2,HW=FW/2;
let ci=0,play=false,spd=1,aid=null,lt=0,intel=true;
const cv=document.getElementById('c');
const x=cv.getContext('2d');
const dpr=devicePixelRatio||1;

function rsz(){
  cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;
  cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
  draw();
}
addEventListener('resize',rsz);

// Field mapping with padding for broadcast framing
function TX(v){const p=80,w=cv.width/dpr;return p+((v+HL)/FL)*(w-p*2)}
function TY(v){const p=50,h=cv.height/dpr;return p+((v+HW)/FW)*(h-p*2-54)}

function draw(){
  if(!F.length)return;
  const f=F[ci];
  const w=cv.width/dpr,h=cv.height/dpr;
  x.save();x.scale(dpr,dpr);

  // ── Sky / background ──
  x.fillStyle='#0a1a0d';x.fillRect(0,0,w,h);

  // ── Pitch (broadcast green) ──
  const px1=TX(-HL),py1=TY(-HW),pw=TX(HL)-px1,ph=TY(HW)-py1;

  // Grass texture (alternating stripes)
  const stripes=12;
  const sw=pw/stripes;
  for(let i=0;i<stripes;i++){
    x.fillStyle=i%2===0?'#1a5c28':'#1d6630';
    x.fillRect(px1+i*sw,py1,sw,ph);
  }

  // Field lines (white, broadcast standard)
  x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.5;
  x.strokeRect(px1,py1,pw,ph);

  // Center line + circle
  x.beginPath();x.moveTo(TX(0),TY(-HW));x.lineTo(TX(0),TY(HW));x.stroke();
  x.beginPath();x.arc(TX(0),TY(0),Math.abs(TX(9.15)-TX(0)),0,Math.PI*2);x.stroke();
  x.beginPath();x.arc(TX(0),TY(0),3,0,Math.PI*2);x.fill();

  // Penalty areas
  [-1,1].forEach(s=>{
    const gx=s*HL,bx=s*(HL-16.5),sx=s*(HL-5.5);
    x.strokeRect(Math.min(TX(gx),TX(bx)),TY(-20.16),Math.abs(TX(gx)-TX(bx)),TY(20.16)-TY(-20.16));
    x.strokeRect(Math.min(TX(gx),TX(sx)),TY(-9.16),Math.abs(TX(gx)-TX(sx)),TY(9.16)-TY(-9.16));
    // Penalty spot
    x.beginPath();x.arc(TX(s*(HL-11)),TY(0),2,0,Math.PI*2);x.fillStyle='rgba(255,255,255,.55)';x.fill();
  });

  // ── INTEL LAYER (toggleable) ──
  if(intel){
    // Coverage zones (very subtle)
    const dt=f.cT==='home'?f.h:f.a;
    dt.forEach(p=>{
      if(p[0]===1)return;
      const g=x.createRadialGradient(TX(p[1]),TY(p[2]),0,TX(p[1]),TY(p[2]),45);
      g.addColorStop(0,'rgba(0,160,255,0.04)');g.addColorStop(1,'rgba(0,160,255,0)');
      x.fillStyle=g;x.beginPath();x.arc(TX(p[1]),TY(p[2]),45,0,Math.PI*2);x.fill();
    });

    // MinCut corridor (the star of the show)
    if(f.corr.length>=2){
      x.save();
      // Broad translucent band
      const avgX=f.corr.reduce((s,p)=>s+p[0],0)/f.corr.length;
      const pulse=.3+Math.sin(Date.now()/400)*.12; // gentle pulse
      x.globalAlpha=pulse;
      x.fillStyle='rgba(255,30,60,.15)';
      // Draw as a wide polygon
      x.beginPath();
      x.moveTo(TX(avgX-8),TY(-HW));
      f.corr.forEach(p=>x.lineTo(TX(p[0]-4),TY(p[1])));
      x.lineTo(TX(avgX-4),TY(HW));
      x.lineTo(TX(avgX+4),TY(HW));
      f.corr.slice().reverse().forEach(p=>x.lineTo(TX(p[0]+4),TY(p[1])));
      x.lineTo(TX(avgX+8),TY(-HW));
      x.closePath();x.fill();

      // Center line (crisp)
      x.globalAlpha=.7;
      x.strokeStyle='#ff3050';x.lineWidth=2.5;x.lineCap='round';
      x.setLineDash([8,6]);
      x.beginPath();
      x.moveTo(TX(avgX),TY(-HW));
      f.corr.forEach(p=>x.lineTo(TX(p[0]),TY(p[1])));
      x.lineTo(TX(avgX),TY(HW));
      x.stroke();
      x.setLineDash([]);
      x.restore();

      // Label
      const mcV=f.cT==='home'?f.mcH:f.mcA;
      if(mcV<.35){
        x.save();
        x.fillStyle='rgba(0,0,0,.6)';
        const lbx=TX(f.corr[0][0])-38,lby=TY(f.corr[0][1])-32;
        roundRect(x,lbx,lby,76,22,4);x.fill();
        x.fillStyle='#ff5070';x.font='bold 10px sans-serif';x.textAlign='center';
        x.fillText('VULNERABILITY',TX(f.corr[0][0]),lby+14);
        x.restore();
      }
    }

    // Passing lanes (top 3 only, clean)
    f.pl.forEach((e,i)=>{
      const alpha=Math.min(.75,e[4]*1.8);
      x.save();
      x.strokeStyle='rgba(50,255,150,'+alpha+')';
      x.lineWidth=i===0?3:2;
      x.shadowColor='rgba(50,255,150,.4)';x.shadowBlur=8;
      x.beginPath();x.moveTo(TX(e[0]),TY(e[1]));x.lineTo(TX(e[2]),TY(e[3]));x.stroke();
      x.shadowBlur=0;

      // Arrow
      const ang=Math.atan2(TY(e[3])-TY(e[1]),TX(e[2])-TX(e[0]));
      const hl=8;
      x.fillStyle='rgba(50,255,150,'+alpha+')';
      x.beginPath();x.moveTo(TX(e[2]),TY(e[3]));
      x.lineTo(TX(e[2])-hl*Math.cos(ang-.35),TY(e[3])-hl*Math.sin(ang-.35));
      x.lineTo(TX(e[2])-hl*Math.cos(ang+.35),TY(e[3])-hl*Math.sin(ang+.35));
      x.closePath();x.fill();

      // Probability (only for best lane)
      if(i===0&&e[4]>.15){
        const mx=(TX(e[0])+TX(e[2]))/2,my=(TY(e[1])+TY(e[3]))/2;
        x.fillStyle='rgba(0,0,0,.55)';
        roundRect(x,mx-16,my-10,32,16,3);x.fill();
        x.fillStyle='rgba(50,255,150,.9)';x.font='bold 9px sans-serif';x.textAlign='center';
        x.fillText((e[4]*100).toFixed(0)+'%',mx,my+2);
      }
      x.restore();
    });

    // MinCut arc gauge (top-left, subtle)
    drawGauge(x,30,py1-6,f.mcH,f.mcA);

    // Safe lanes (top-right, subtle)
    drawLanes(x,w-80,py1-6,f.sl);
  }

  // ── Players (always visible) ──
  // Shadows first
  [...f.h,...f.a].forEach(p=>{
    x.fillStyle='rgba(0,0,0,.25)';
    x.beginPath();x.ellipse(TX(p[1])+1,TY(p[2])+3,8,4,0,0,Math.PI*2);x.fill();
  });

  f.h.forEach(p=>{
    const ih=f.bh===('home_'+p[0]);
    x.fillStyle=ih?'#4499ff':'#2266cc';
    x.beginPath();x.arc(TX(p[1]),TY(p[2]),ih?10:8,0,Math.PI*2);x.fill();
    x.strokeStyle='rgba(255,255,255,.4)';x.lineWidth=1.5;x.stroke();
    x.fillStyle='#fff';x.font='bold '+(ih?'10':'9')+'px sans-serif';x.textAlign='center';
    x.fillText(p[0],TX(p[1]),TY(p[2])+3.5);
  });

  f.a.forEach(p=>{
    const ih=f.bh===('away_'+p[0]);
    x.fillStyle=ih?'#ff5544':'#cc2233';
    x.beginPath();x.arc(TX(p[1]),TY(p[2]),ih?10:8,0,Math.PI*2);x.fill();
    x.strokeStyle='rgba(255,255,255,.4)';x.lineWidth=1.5;x.stroke();
    x.fillStyle='#fff';x.font='bold '+(ih?'10':'9')+'px sans-serif';x.textAlign='center';
    x.fillText(p[0],TX(p[1]),TY(p[2])+3.5);
  });

  // Ball
  x.fillStyle='#ffdd00';x.shadowColor='#ffdd00';x.shadowBlur=10;
  x.beginPath();x.arc(TX(f.bx),TY(f.by),5,0,Math.PI*2);x.fill();
  x.strokeStyle='rgba(0,0,0,.3)';x.lineWidth=1;x.stroke();
  x.shadowBlur=0;

  x.restore();

  // ── Lower third ──
  document.getElementById('ltTime').textContent=f.m+':'+String(f.s).padStart(2,'0');
  const mcStr='MinCut: H '+f.mcH.toFixed(2)+' | A '+f.mcA.toFixed(2);
  const lnStr='Lanes: '+f.sl;
  document.getElementById('ltInfo').textContent=intel?mcStr+' — '+lnStr:'Overlay off';

  // ── Commentary ──
  const cb=document.getElementById('comBox');
  if(f.com){
    document.getElementById('comText').textContent=f.com;
    cb.classList.add('vis');
    clearTimeout(window._comTimer);
    window._comTimer=setTimeout(()=>cb.classList.remove('vis'),4000);
  }

  // ── Alert flash ──
  const af=document.getElementById('alertFlash');
  af.className=f.sl<=1?'on':'';

  document.getElementById('sc').value=ci;
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawGauge(ctx,gx,gy,h,a){
  ctx.save();ctx.globalAlpha=.8;
  ctx.fillStyle='rgba(0,0,0,.5)';roundRect(ctx,gx,gy,90,32,6);ctx.fill();
  ctx.font='7px sans-serif';ctx.textAlign='left';ctx.fillStyle='#556';
  ctx.fillText('DEF SOLIDITY',gx+6,gy+10);
  // H bar
  const bw=60;
  ctx.fillStyle='#1a2a3a';ctx.fillRect(gx+6,gy+14,bw,6);
  ctx.fillStyle=h<.25?'#f44':'#38e';ctx.fillRect(gx+6,gy+14,Math.min(bw,h/1*bw),6);
  ctx.fillStyle='#889';ctx.font='7px sans-serif';ctx.fillText('H',gx+bw+10,gy+20);
  // A bar
  ctx.fillStyle='#2a1a1a';ctx.fillRect(gx+6,gy+23,bw,6);
  ctx.fillStyle=a<.25?'#f44':'#e35';ctx.fillRect(gx+6,gy+23,Math.min(bw,a/1*bw),6);
  ctx.fillText('A',gx+bw+10,gy+29);
  ctx.restore();
}

function drawLanes(ctx,lx,ly,n){
  ctx.save();ctx.globalAlpha=.8;
  ctx.fillStyle='rgba(0,0,0,.5)';roundRect(ctx,lx,ly,50,32,6);ctx.fill();
  ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillStyle='#556';
  ctx.fillText('LANES',lx+25,ly+10);
  ctx.font='bold 14px sans-serif';
  ctx.fillStyle=n<=1?'#f33':n<=2?'#fa3':'#4e4';
  ctx.fillText(n,lx+25,ly+26);
  ctx.restore();
}

// ── Controls ──
document.getElementById('sc').addEventListener('input',e=>{ci=+e.target.value;draw()});
document.getElementById('pb').addEventListener('click',()=>{
  play=!play;document.getElementById('pb').textContent=play?'||':'Play';
  if(play){lt=performance.now();anim()}else if(aid){cancelAnimationFrame(aid);aid=null}
});
const sp=[.5,1,2,4,8];let si=1;
document.getElementById('sb').addEventListener('click',()=>{
  si=(si+1)%sp.length;spd=sp[si];document.getElementById('sb').textContent=spd+'x';
});
document.getElementById('tb').addEventListener('click',()=>{intel=!intel;draw()});

function anim(){
  if(!play)return;
  const now=performance.now();
  if(now-lt>350/spd){ci=(ci+1)%F.length;draw();lt=now}
  aid=requestAnimationFrame(anim);
}

// Keyboard
addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();document.getElementById('pb').click()}
  if(e.code==='ArrowRight')ci=Math.min(F.length-1,ci+10);
  if(e.code==='ArrowLeft')ci=Math.max(0,ci-10);
  if(e.code==='KeyI'){intel=!intel}
  draw();
});

setTimeout(rsz,30);
</script>
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('Generating match...');
  const match = generateSyntheticMatch(10);
  console.log('Analyzing...');
  const report = analyzeMatch(match);
  console.log('Extracting broadcast frames...');
  const frames = extract(match, report);
  console.log(`  ${frames.length} frames`);
  console.log('Building broadcast overlay HTML...');
  const h = html(frames, match);
  const out = join(dirname(fileURLToPath(import.meta.url)), 'pitch-intel-broadcast.html');
  writeFileSync(out, h);
  console.log(`\nBroadcast overlay: ${out}`);
  console.log(`Size: ${(h.length / 1024).toFixed(0)} KB`);
  console.log(`\nOpen: file://${out}`);
  console.log(`\nControls:`);
  console.log(`  Space     = play/pause`);
  console.log(`  Arrows    = scrub`);
  console.log(`  I         = toggle intel overlay`);
  console.log(`  Hover top-right for scrubber + speed`);
}

main().catch(e => { console.error(e); process.exit(1) });
