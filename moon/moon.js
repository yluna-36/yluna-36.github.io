import { INITIAL, clamp, camera, eclipse, project } from './geometry.mjs?v=20261109-eclipse1';
import { makeRenderer } from './renderer.mjs?v=20261109-eclipse1';
const scene=document.querySelector('#scene');
const feedback=document.querySelector('#feedback');
const door=document.querySelector('#star-door');
const arrival=document.querySelector('#arrival');
const tools=document.querySelector('#puzzle-tools');
const hint=document.querySelector('#hint');
const hintButton=document.querySelector('#hint-button');
const returnLink=document.querySelector('#return-link');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const KEY='yluna-eclipse-entry-v2';
const hints=['日月并没有移动。换个观察位置，近处的月亮就能挡住远处的太阳。','试着让月亮的暗面靠近太阳。光越少，星星越清楚。','让月亮完整盖住太阳，再松手停留片刻；星光会连出真正的入口。也可以点「不用拖动」。'];
let renderer,canvas;
let yaw=INITIAL.yaw,pitch=INITIAL.pitch,cover=0,phase='exploring';
let drag=null,hintIndex=0,holdTimer=null,frame=null,transition=null;
let width=1,height=1,ready=false;
function setFeedback(text){if(feedback.textContent!==text)feedback.textContent=text;}
function positionDoor(cam){
 const top=project([0,3.15,-7],cam,width,height),bottom=project([0,-3.4,-7],cam,width,height);
 const h=bottom.y-top.y,w=h*.8;
 door.style.width=`${w}px`;door.style.height=`${h}px`;door.style.left=`${top.x-w/2}px`;door.style.top=`${top.y}px`;
}
function draw(){
 if(!ready||document.hidden)return;
 const cam=camera(yaw,pitch);cover=eclipse(cam);
 renderer.render(cam,width,height,cover);
 document.querySelector('#angle').textContent=`视角 ${Math.round(yaw*180/Math.PI)>0?'+':''}${Math.round(yaw*180/Math.PI)}° / ${Math.round(pitch*180/Math.PI)>0?'+':''}${Math.round(pitch*180/Math.PI)}°`;
 document.querySelector('#light-level').style.left=`${cover*100}%`;
 scene.dataset.renderer=renderer.kind;
 if(phase==='exploring')setFeedback(cover>.95?'别急，停在这里，让光慢慢退去。':cover>.72?'再偏一点。更多星光正在回来。':cover>.22?'光正在变少。原来，夜空不止日月。':'光有些耀眼。也许，答案藏在它后面。');
 if(phase==='revealed')positionDoor(cam);
}
function requestDraw(){if(frame!==null)return;frame=requestAnimationFrame(t=>{frame=null;if(transition){const progress=clamp((t-transition.start)/700,0,1),ease=1-Math.pow(1-progress,3);yaw=transition.yaw*(1-ease);pitch=transition.pitch*(1-ease);draw();if(progress<1){requestDraw();return;}transition=null;reveal();}else draw();});}
function stopHold(){clearTimeout(holdTimer);holdTimer=null;}
function beginHold(){
 stopHold();if(phase!=='exploring'||drag||document.hidden||eclipse(camera(yaw,pitch))<.95)return;
 holdTimer=setTimeout(()=>{holdTimer=null;if(phase!=='exploring'||drag||document.hidden||eclipse(camera(yaw,pitch))<.95)return;
 phase='aligning';setFeedback('日光退去。看，星星之间还有一条路。');
 if(reduced.matches){yaw=0;pitch=0;draw();reveal();}else{transition={start:performance.now(),yaw,pitch};requestDraw();}
 },500);
}
function reveal(){
 phase='revealed';yaw=0;pitch=0;document.body.classList.add('solved');tools.hidden=true;arrival.hidden=false;door.hidden=false;
 document.querySelector('#scene-caption').textContent='原来，入口一直都在。';
 canvas.setAttribute('aria-label','日食已形成，星光之间出现了入口');canvas.tabIndex=-1;
 try{localStorage.setItem(KEY,'1');}catch(_){}
 draw();door.focus({preventScroll:true});door.scrollIntoView({block:'nearest',behavior:reduced.matches?'auto':'smooth'});
}
function reset(){
 stopHold();transition=null;if(drag)endDrag({pointerId:drag.id},false);phase='exploring';yaw=INITIAL.yaw;pitch=INITIAL.pitch;hintIndex=0;
 document.body.classList.remove('solved');tools.hidden=false;arrival.hidden=true;door.hidden=true;hint.textContent='';hintButton.textContent='✧ 借一点线索';document.querySelector('#alternative').open=false;
 document.querySelector('#scene-caption').textContent='两颗天体，一个尚未找到的位置。';canvas.setAttribute('aria-label','三维夜空，拖动改变观察视角，也可以使用方向键');canvas.tabIndex=0;
 try{returnLink.hidden=localStorage.getItem(KEY)!=='1'&&localStorage.getItem('yluna-moon-entry-v1')!=='1';}catch(_){}
 requestDraw();canvas.focus({preventScroll:true});canvas.scrollIntoView({block:'center',behavior:'auto'});
}
function change(dx,dy){if(phase!=='exploring')return;stopHold();yaw=clamp(yaw+dx,-.68,.68);pitch=clamp(pitch+dy,-.4,.4);requestDraw();}
function endDrag(event,check=true){if(!drag||drag.id!==event.pointerId)return;drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(check)beginHold();}
function setup(){
 renderer=makeRenderer(document.querySelector('#universe'));canvas=renderer.canvas;ready=true;
 canvas.addEventListener('pointerdown',e=>{if(phase!=='exploring'||drag||!e.isPrimary||e.button!==0)return;stopHold();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const scale=1.15/Math.min(width,height);change((e.clientX-drag.x)*scale,-(e.clientY-drag.y)*scale);drag.x=e.clientX;drag.y=e.clientY;});
 canvas.addEventListener('pointerup',e=>endDrag(e,true));canvas.addEventListener('pointercancel',e=>endDrag(e,false));canvas.addEventListener('lostpointercapture',e=>endDrag(e,false));
 const dirs={left:[-.025,0],right:[.025,0],up:[0,.025],down:[0,-.025]};
 function nudge(d,small=false){if(phase!=='exploring'||drag)return;change(d[0]*(small?.25:1),d[1]*(small?.25:1));beginHold();}
 canvas.addEventListener('keydown',e=>{const d=dirs[e.key.replace('Arrow','').toLowerCase()];if(!d)return;e.preventDefault();nudge(d,e.shiftKey);});
 document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>nudge(dirs[b.dataset.direction])));
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;stopHold();transition=null;document.querySelector('#load-error').hidden=false;});
 canvas.addEventListener('webglcontextrestored',()=>location.reload());
 new ResizeObserver(()=>{if(drag)endDrag({pointerId:drag.id},false);const r=scene.getBoundingClientRect();width=scene.clientWidth;height=scene.clientHeight;requestDraw();}).observe(scene);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopHold();if(drag)endDrag({pointerId:drag.id},false);}else{requestDraw();beginHold();}});
 const r=scene.getBoundingClientRect();width=scene.clientWidth;height=scene.clientHeight;requestDraw();
}
try{setup();}catch(error){console.error(error);document.querySelector('#load-error').hidden=false;}
hintButton.addEventListener('click',()=>{hint.textContent=hints[Math.min(hintIndex++,hints.length-1)];if(hintIndex>=hints.length)hintButton.textContent='✧ 线索都在这里了';});
document.querySelector('#replay').addEventListener('click',()=>{if(ready)reset();});document.querySelector('#reset').addEventListener('click',()=>{if(ready)reset();});
try{returnLink.hidden=localStorage.getItem(KEY)!=='1'&&localStorage.getItem('yluna-moon-entry-v1')!=='1';}catch(_){}
