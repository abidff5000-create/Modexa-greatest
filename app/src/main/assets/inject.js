(()=>{
if(window.__MXP__)return;window.__MXP__=true;
const K='mxp_v2',IN_MAX=1500,OUT_MAX=5000,STG=110;
const D={inDb:0,outDb:0,drive:0,bass:0,pres:0,gateTh:-55,gate:false,mono:false,monitor:false,bypass:false,safe:false};
const S=Object.assign({},D);try{Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const clip=new Float32Array([-1,1]);
let ctx,G=null;
const mk=(c,n)=>{const g=[];let prev=null,first=null;for(let i=0;i<n;i++){const a=c.createGain(),w=c.createWaveShaper();w.curve=clip;a.connect(w);if(prev)prev.connect(a);else first=a;g.push(a);prev=w}return{i:first,o:prev,g}};
const setDb=(ch,db)=>{const n=Math.max(1,Math.ceil(db/STG)),v=db?Math.pow(10,db/n/20):1;ch.g.forEach((x,i)=>x.gain.value=i<n?v:1)};
const driveCurve=k=>{if(!k)return null;const c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;c[i]=Math.tanh(x*(1+k/6))/Math.tanh(1+k/6)}return c};
function apply(){if(!G)return;const t=ctx.currentTime;
 setDb(G.inC,S.inDb);setDb(G.outC,S.outDb);G.drv.curve=driveCurve(S.drive);
 G.bass.gain.value=S.bass;G.pres.gain.value=S.pres;
 G.comp.threshold.value=S.safe?-14:0;G.comp.ratio.value=S.safe?20:1;
 G.mono.channelCount=S.mono?1:2;
 G.proc.gain.value=S.bypass?0:1;G.byp.gain.value=S.bypass?1:0;G.mon.gain.value=S.monitor?.12:0}
function build(stream){
 ctx=ctx||new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
 const src=ctx.createMediaStreamSource(stream),dest=ctx.createMediaStreamDestination(),an=ctx.createAnalyser();an.fftSize=1024;
 const gate=ctx.createGain(),inC=mk(ctx,Math.ceil(IN_MAX/STG)+1),outC=mk(ctx,Math.ceil(OUT_MAX/STG)+1),drv=ctx.createWaveShaper(),
 bass=ctx.createBiquadFilter(),pres=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor(),mono=ctx.createGain(),proc=ctx.createGain(),byp=ctx.createGain(),mon=ctx.createGain();
 bass.type='lowshelf';bass.frequency.value=200;pres.type='peaking';pres.frequency.value=3500;pres.Q.value=1;
 mono.channelCountMode='explicit';comp.knee.value=0;comp.attack.value=.002;comp.release.value=.1;
 src.connect(an);src.connect(byp);byp.connect(dest);
 src.connect(gate);gate.connect(inC.i);inC.o.connect(drv);drv.connect(bass);bass.connect(pres);pres.connect(comp);comp.connect(outC.i);
 outC.o.connect(mono);mono.connect(proc);proc.connect(dest);mono.connect(mon);mon.connect(ctx.destination);
 G={inC,outC,drv,bass,pres,comp,mono,proc,byp,mon,gate,an};apply();
 const buf=new Float32Array(an.fftSize);setInterval(()=>{an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;const db=20*Math.log10(Math.sqrt(s/buf.length)+1e-9);
  gate.gain.setTargetAtTime(S.gate&&db<S.gateTh?0:1,ctx.currentTime,.03);meter(db)},50);
 return new MediaStream([...dest.stream.getAudioTracks(),...stream.getVideoTracks()])}
const md=navigator.mediaDevices;if(md&&md.getUserMedia){const o=md.getUserMedia.bind(md);
 md.getUserMedia=async c=>{const s=await o(c);if(!c||!c.audio)return s;try{return build(s)}catch(e){return s}}}
document.addEventListener('click',()=>{if(ctx&&ctx.state!=='running')ctx.resume()},true);

/* ---------- UI ---------- */
let bar;const meter=db=>{if(bar)bar.style.width=Math.max(0,Math.min(100,(db+80)*1.25))+'%'};
const SL=[['inDb','Input Gain','dB',0,IN_MAX],['outDb','Output Gain','dB',0,OUT_MAX],['drive','Drive','%',0,100],['bass','Bass','dB',-12,24],['pres','Presence','dB',-12,12],['gateTh','Gate Threshold','dB',-80,-20]];
const TG=[['gate','Noise Gate'],['safe','Safe Limiter'],['mono','Mono'],['monitor','Monitor'],['bypass','Bypass']];
const PR={Clean:{inDb:0,outDb:0,drive:0,bass:0,pres:0},Loud:{inDb:30,outDb:30,drive:20,pres:3},'Bass Boost':{inDb:10,bass:18,pres:-2},Studio:{inDb:6,bass:4,pres:5,safe:true,gate:true},MAX:{inDb:IN_MAX,outDb:OUT_MAX,drive:50}};
function ui(){
 const h=document.createElement('div');h.style.cssText='all:initial;position:fixed;z-index:2147483647';document.documentElement.appendChild(h);
 const r=h.attachShadow({mode:'open'});let prof={name:'',avatar:''};try{prof=JSON.parse(MXA.getProfile())}catch(e){}
 r.innerHTML=`<style>
*{box-sizing:border-box;font-family:system-ui,sans-serif}
.fab{position:fixed;right:14px;bottom:90px;width:54px;height:54px;border-radius:50%;border:0;color:#fff;font-size:20px;font-weight:800;background:linear-gradient(135deg,#ff4d5e,#e11d2e);box-shadow:0 6px 24px #e11d2e99;animation:p 2s infinite;overflow:hidden;background-size:cover;background-position:center}
@keyframes p{50%{box-shadow:0 6px 36px #e11d2ecc;transform:scale(1.06)}}
.pn{position:fixed;left:8px;right:8px;bottom:8px;max-height:78vh;overflow:auto;background:#12060a;color:#fff;border:1px solid #ff4d5e55;border-radius:22px;padding:16px;transform:translateY(110%);opacity:0;transition:.45s cubic-bezier(.2,.9,.25,1);box-shadow:0 -10px 50px #e11d2e44}
.pn.o{transform:none;opacity:1}
.hd{display:flex;align-items:center;gap:12px;margin-bottom:12px}.hd .a{width:42px;height:42px;border-radius:50%;border:2px solid #e11d2e;background:#3a0a10 center/cover;display:grid;place-items:center;font-weight:800;color:#ff4d5e}
.hd b{flex:1;font-size:16px}.x{background:none;border:0;color:#b9a3a6;font-size:22px}
.vu{height:8px;border-radius:8px;background:#ffffff14;overflow:hidden;margin-bottom:14px}.vu i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7a0a14,#e11d2e,#ff9aa4);transition:width .06s}
.pr{display:flex;gap:8px;overflow-x:auto;margin-bottom:14px;padding-bottom:4px}.pr button{flex:none;padding:8px 14px;border-radius:20px;border:1px solid #ff4d5e66;background:#ffffff0a;color:#fff;font-size:13px}.pr button:active{background:#e11d2e}
.sl{margin-bottom:12px}.sl div{display:flex;justify-content:space-between;font-size:13px;color:#d9c6c9;margin-bottom:4px}.sl em{font-style:normal;color:#ff4d5e;font-weight:700}
input[type=range]{width:100%;accent-color:#e11d2e}
.tg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.tg button{padding:11px;border-radius:12px;border:1px solid #ffffff22;background:#ffffff0a;color:#fff;font-size:13px;transition:.25s}.tg button.on{background:linear-gradient(135deg,#ff4d5e,#e11d2e);border-color:transparent;box-shadow:0 4px 16px #e11d2e66}
.pa{width:100%;padding:13px;border-radius:14px;border:1px solid #ff4d5e;background:none;color:#ff4d5e;font-weight:700}
.w{font-size:11px;color:#8c7478;margin-top:10px;text-align:center}</style>
<button class="fab" id="f">M</button><div class="pn" id="p"><div class="hd"><div class="a" id="a"></div><b id="n"></b><button class="x" id="c">✕</button></div>
<div class="vu"><i id="v"></i></div><div class="pr" id="pr"></div><div id="sl"></div><div class="tg" id="tg"></div>
<button class="pa" id="rs">PANIC RESET</button><div class="w">Beshi gain = speaker/hearing-er khoti hote pare. Monitor off rakho.</div></div>`;
 const $=i=>r.getElementById(i);bar=$('v');
 $('n').textContent=prof.name||'Modexa Pro';
 [$('a'),$('f')].forEach(e=>{if(prof.avatar){e.style.backgroundImage=`url(${prof.avatar})`;e.textContent=''}else e.textContent=(prof.name||'M')[0].toUpperCase()});
 const draw=()=>{
  $('sl').innerHTML=SL.map(([k,l,u,mn,mx])=>`<div class="sl"><div><span>${l}</span><em>${S[k]} ${u}</em></div><input type="range" data-k="${k}" min="${mn}" max="${mx}" value="${S[k]}"></div>`).join('');
  $('tg').innerHTML=TG.map(([k,l])=>`<button data-t="${k}" class="${S[k]?'on':''}">${l}</button>`).join('');
  r.querySelectorAll('input[data-k]').forEach(el=>el.oninput=()=>{S[el.dataset.k]=+el.value;el.parentNode.querySelector('em').textContent=el.value+' '+SL.find(s=>s[0]==el.dataset.k)[2];save();apply()});
  r.querySelectorAll('button[data-t]').forEach(el=>el.onclick=()=>{S[el.dataset.t]=!S[el.dataset.t];save();apply();el.classList.toggle('on')})};
 $('pr').innerHTML=Object.keys(PR).map(n=>`<button>${n}</button>`).join('');
 [...$('pr').children].forEach(b=>b.onclick=()=>{Object.assign(S,D,PR[b.textContent]);save();apply();draw()});
 $('rs').onclick=()=>{Object.assign(S,D);save();apply();draw()};
 $('f').onclick=()=>$('p').classList.toggle('o');$('c').onclick=()=>$('p').classList.remove('o');draw()}
const start=()=>document.documentElement?ui():setTimeout(start,50);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
