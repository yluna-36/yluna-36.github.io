import { INITIAL, MOON, MOON_RADIUS, clamp, camera, eclipse, project } from './geometry.mjs?v=20261109-hidden-star1';
import { makeRenderer } from './renderer.mjs?v=20261109-hidden-star1';
import { MAP_POINTS, GATE_POINTS, MISSING_STAR, blendPoint, isStarVisible, canCollectStar } from './constellation.mjs?v=20261109-hidden-star1';

const $ = selector => document.querySelector(selector);
const scene = $('#scene'), feedback = $('#feedback'), door = $('#star-door');
const arrival = $('#arrival'), tools = $('#puzzle-tools'), hint = $('#hint');
const hintButton = $('#hint-button'), returnLink = $('#return-link');
const mapLayer = $('#constellation-layer'), mapLines = $('#memory-lines');
const trace = $('#memory-trace'), wave = $('#eclipse-wave');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const KEY = 'yluna-hidden-star-entry-v3';
const oldKeys = ['yluna-eclipse-entry-v2','yluna-moon-entry-v1'];
const hints = {
  exploring: [
    '太亮的时候，细小的东西会被忽略。先让光退下去。',
    '太阳在远处，月球在近处。改变观察位置，就能让它们重合。',
    '让月球盖住太阳，再松手片刻。先别急着找门，看看暗下来后留下了什么。'
  ],
  searching: [
    '星图不是一张平面图。有一笔，躲在更远的地方。',
    '刚刚替你遮住太阳的，也可能遮住了另一颗星。日食不是终点。',
    '继续向左或向右转动视角，离开日食位置。找到从月球边缘露出、带空心光环的星，点亮它。'
  ]
};
let renderer, canvas, ready = false;
let yaw = INITIAL.yaw, pitch = INITIAL.pitch, phase = 'exploring';
let drag = null, hintIndex = 0, holdTimer = null, statusTimer = null;
let frame = null, transition = null, blend = 0, width = 1, height = 1;
let waveTimer = null, lastFrame = 0;
const starButtons = MAP_POINTS.map((_, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `map-star${index === MISSING_STAR ? ' missing-star' : ''}`;
  button.style.setProperty('--star-delay', `${index * .19}s`);
  button.setAttribute('aria-label', index === MISSING_STAR ? '尚未连上的空心星光' : `星图上的第 ${index + 1} 颗星`);
  button.innerHTML = '<span class="star-core" aria-hidden="true"></span>';
  button.addEventListener('click', () => collect(index));
  $('#star-controls').appendChild(button);
  return button;
});
function setFeedback(text) {
  if (feedback.textContent !== text) feedback.textContent = text;
}
function updateReturnLink() {
  try { returnLink.hidden = ![KEY, ...oldKeys].some(key => localStorage.getItem(key) === '1'); } catch (_) {}
}
function positionDoor(cam) {
  const top = project([0,3.15,-7],cam,width,height), bottom = project([0,-3.4,-7],cam,width,height);
  const h = bottom.y-top.y, w = h*.8;
  Object.assign(door.style, {width:`${w}px`,height:`${h}px`,left:`${top.x-w/2}px`,top:`${top.y}px`});
}
function drawMap(cam) {
  if (!['searching','weaving'].includes(phase)) return;
  mapLines.setAttribute('viewBox', `0 0 ${width} ${height}`);
  $('#mask-field').setAttribute('width', width); $('#mask-field').setAttribute('height', height);
  const moon = project(MOON,cam,width,height);
  $('#moon-mask').setAttribute('cx',moon.x); $('#moon-mask').setAttribute('cy',moon.y);
  $('#moon-mask').setAttribute('r',MOON_RADIUS/moon.z*moon.focal*1.015);
  const path = [];
  MAP_POINTS.forEach((point,index) => {
    const world = phase==='weaving' ? blendPoint(point,GATE_POINTS[index],blend) : point;
    const p = project(world,cam,width,height), button = starButtons[index];
    const visible = isStarVisible(world,cam) && p.x>=22 && p.x<=width-22 && p.y>=38 && p.y<=height-30;
    const wasFocused = document.activeElement===button;
    button.hidden = !visible;
    button.disabled = phase!=='searching';
    button.style.left = `${p.x}px`; button.style.top = `${p.y}px`;
    if (!visible && wasFocused) canvas.focus({preventScroll:true});
    path.push(`${index?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  });
  trace.setAttribute('d',path.join(' '));
  // The incomplete strokes disappear behind the nearer lunar sphere too.
  trace.setAttribute('mask','url(#lunar-mask)');
}
function draw() {
  if (!ready || document.hidden) return;
  const cam = camera(yaw,pitch), cover = eclipse(cam);
  renderer.render(cam,width,height,cover);
  $('#angle').textContent = `视角 ${Math.round(yaw*180/Math.PI)>0?'+':''}${Math.round(yaw*180/Math.PI)}° / ${Math.round(pitch*180/Math.PI)>0?'+':''}${Math.round(pitch*180/Math.PI)}°`;
  $('#light-level').style.left = `${cover*100}%`;
  scene.dataset.renderer = renderer.kind;
  scene.dataset.phase = phase;
  if (phase==='exploring') setFeedback(cover>.95?'别急，停在这里，让光慢慢退去。':cover>.72?'更多星光正在回来。':cover>.22?'光正在变少。夜空里还有别的东西。':'光有些耀眼。也许，答案藏在它后面。');
  if (phase==='searching' && !statusTimer) setFeedback('星图已经显影，却还缺了一笔。');
  drawMap(cam);
  if (phase==='revealed') positionDoor(cam);
  if (!wave.hidden) {
    const p = project(MOON,cam,width,height), diameter = MOON_RADIUS/p.z*p.focal*2;
    Object.assign(wave.style,{left:`${p.x}px`,top:`${p.y}px`,width:`${diameter}px`,height:`${diameter}px`});
  }
}
function requestDraw() {
  if (frame!==null) return;
  frame=requestAnimationFrame(t=>{
    frame=null;
    if (document.hidden || !ready) return;
    if (transition) {
      // Accumulate visible time only: switching tabs does not skip the reveal.
      transition.elapsed += lastFrame ? Math.min(t-lastFrame,50) : 16;
      const progress=clamp(transition.elapsed/transition.duration,0,1), ease=1-Math.pow(1-progress,3);
      yaw=transition.yaw*(1-ease); pitch=transition.pitch*(1-ease);
      if (transition.next==='door') blend=progress*progress*(3-2*progress);
      draw(); lastFrame=t;
      if (progress<1) {requestDraw();return;}
      const next=transition.next;transition=null;lastFrame=0;
      if (next==='map') discoverMap(); else reveal();
    } else {lastFrame=0;draw();}
  });
}
function stopHold() {clearTimeout(holdTimer);holdTimer=null;}
function clearStatus() {clearTimeout(statusTimer);statusTimer=null;}
function beginHold() {
  stopHold();
  if (phase!=='exploring'||drag||document.hidden||eclipse(camera(yaw,pitch))<.95) return;
  holdTimer=setTimeout(()=>{
    holdTimer=null;
    if (phase!=='exploring'||drag||document.hidden||eclipse(camera(yaw,pitch))<.95) return;
    phase='aligning';setFeedback('日光退去。有些痕迹，正在显影。');
    if (reduced.matches) {yaw=0;pitch=0;discoverMap();}
    else {transition={elapsed:0,duration:850,yaw,pitch,next:'map'};requestDraw();}
  },650);
}
function discoverMap() {
  phase='searching';yaw=0;pitch=0;hintIndex=0;hint.textContent='';hintButton.textContent='✧ 借一点线索';
  mapLayer.hidden=false;mapLayer.classList.remove('weaving');scene.classList.add('has-memory');
  $('#scene-caption').textContent='被看见的星光，会留下痕迹。';
  $('#move-help').innerHTML='继续转动天空。<span>看得见的，未必是全部。</span>';
  canvas.setAttribute('aria-label','日食显出一幅不完整的立体星图，继续拖动或用方向键观察，星光可点击');
  wave.hidden=false;clearTimeout(waveTimer);waveTimer=setTimeout(()=>{wave.hidden=true;},1800);
  draw();canvas.focus({preventScroll:true});
  setFeedback('星图已经显影，却还缺了一笔。');
}
function collect(index) {
  if (phase!=='searching') return;
  clearStatus();
  if (!canCollectStar(phase,index,camera(yaw,pitch))) {
    setFeedback('这颗星已经在图里。缺席的那一笔，还没被看见。');
    starButtons[index].classList.remove('answered');void starButtons[index].offsetWidth;starButtons[index].classList.add('answered');
    statusTimer=setTimeout(()=>{statusTimer=null;requestDraw();},3500);return;
  }
  phase='weaving';stopHold();if(drag)endDrag({pointerId:drag.id},false);
  mapLayer.classList.add('weaving');tools.hidden=true;blend=0;
  setFeedback('原来，遮住光的，也曾遮住路。');
  $('#scene-caption').textContent='缺席的那一笔，回到了星图里。';
  canvas.focus({preventScroll:true});
  if (reduced.matches) {yaw=0;pitch=0;blend=1;draw();reveal();}
  else {transition={elapsed:0,duration:2200,yaw,pitch,next:'door'};requestDraw();}
}
function reveal() {
  phase='revealed';yaw=0;pitch=0;
  document.body.classList.add('solved');mapLayer.hidden=true;tools.hidden=true;arrival.hidden=false;door.hidden=false;
  wave.hidden=true;clearTimeout(waveTimer);
  $('#scene-caption').textContent='原来，入口一直都在。';
  canvas.setAttribute('aria-label','星图已经完整，星光之间出现了入口');canvas.tabIndex=-1;
  try{localStorage.setItem(KEY,'1');}catch(_){}
  draw();door.focus({preventScroll:true});door.scrollIntoView({block:'nearest',behavior:reduced.matches?'auto':'smooth'});
}
function reset() {
  stopHold();clearStatus();clearTimeout(waveTimer);wave.hidden=true;transition=null;lastFrame=0;
  if(drag)endDrag({pointerId:drag.id},false);
  phase='exploring';yaw=INITIAL.yaw;pitch=INITIAL.pitch;hintIndex=0;blend=0;
  document.body.classList.remove('solved');scene.classList.remove('has-memory');mapLayer.classList.remove('weaving');
  tools.hidden=false;arrival.hidden=true;door.hidden=true;mapLayer.hidden=true;hint.textContent='';hintButton.textContent='✧ 借一点线索';$('#alternative').open=false;
  starButtons.forEach(b=>{b.classList.remove('answered');b.disabled=false;b.hidden=true;});
  $('#scene-caption').textContent='两颗天体，一个尚未找到的位置。';
  $('#move-help').innerHTML='拖动天空，换一个位置。<span>日月会替你指路。</span>';
  canvas.setAttribute('aria-label','三维夜空，拖动改变观察视角，也可以使用方向键');canvas.tabIndex=0;
  updateReturnLink();requestDraw();canvas.focus({preventScroll:true});canvas.scrollIntoView({block:'center',behavior:'auto'});
}
function movable() {return phase==='exploring'||phase==='searching';}
function change(dx,dy) {
  if(!movable())return;stopHold();yaw=clamp(yaw+dx,-.68,.68);pitch=clamp(pitch+dy,-.4,.4);requestDraw();
}
function endDrag(event,check=true) {
  if(!drag||drag.id!==event.pointerId)return;
  drag=null;canvas.classList.remove('dragging');
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(check)beginHold();
}
function setup() {
  renderer=makeRenderer($('#universe'));canvas=renderer.canvas;ready=true;
  canvas.addEventListener('pointerdown',e=>{
    if(!movable()||drag||!e.isPrimary||e.button!==0)return;
    stopHold();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const scale=1.15/Math.min(width,height);change((e.clientX-drag.x)*scale,-(e.clientY-drag.y)*scale);drag.x=e.clientX;drag.y=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>endDrag(e,true));canvas.addEventListener('pointercancel',e=>endDrag(e,false));canvas.addEventListener('lostpointercapture',e=>endDrag(e,false));
  const dirs={left:[-.025,0],right:[.025,0],up:[0,.025],down:[0,-.025]};
  function nudge(d,small=false) {if(!movable()||drag)return;change(d[0]*(small?.25:1),d[1]*(small?.25:1));beginHold();}
  canvas.addEventListener('keydown',e=>{const d=dirs[e.key.replace('Arrow','').toLowerCase()];if(!d)return;e.preventDefault();nudge(d,e.shiftKey);});
  document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>nudge(dirs[b.dataset.direction])));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;stopHold();transition=null;$('#load-error').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  new ResizeObserver(()=>{if(drag)endDrag({pointerId:drag.id},false);width=scene.clientWidth;height=scene.clientHeight;requestDraw();}).observe(scene);
  document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden){stopHold();if(drag)endDrag({pointerId:drag.id},false);}else{requestDraw();beginHold();}});
  width=scene.clientWidth;height=scene.clientHeight;requestDraw();
}
try{setup();}catch(error){console.error(error);$('#load-error').hidden=false;}
hintButton.addEventListener('click',()=>{
  const list=hints[phase==='searching'?'searching':'exploring'];
  hint.textContent=list[Math.min(hintIndex++,list.length-1)];
  if(hintIndex>=list.length)hintButton.textContent='✧ 线索都在这里了';
});
$('#replay').addEventListener('click',()=>{if(ready)reset();});$('#reset').addEventListener('click',()=>{if(ready)reset();});
updateReturnLink();
