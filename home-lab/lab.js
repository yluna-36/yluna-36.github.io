(() => {
  const stage = document.querySelector('.hero-art');
  const haloCanvas = document.querySelector('#mika-halo');
  const galaxyCanvas = document.querySelector('#galaxy');
  const halo = createMikaHalo(haloCanvas);
  const switchArt = document.querySelector('#change-art');
  const caption = document.querySelector('#art-caption');
  const replay = document.querySelector('#replay-halo');
  const inspect = document.querySelector('#inspect-halo');
  let finished = false, inspecting = false, manualAngle = false;
  let yaw = 0, elevation = .25, drag = null;
  let galaxy;
  let showHalo = true;
  const toggle = document.querySelector('#motion');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches, frame = 0, visible = true, time = 0, last = 0;
  let viewX=0, viewY=0, targetX=0, targetY=0;
  const reveal = [...document.querySelectorAll('.reveal')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if(entry.isIntersecting){
      entry.target.classList.remove('pending');
      observer.unobserve(entry.target);
    }
  },{threshold:.07});
  function setMode(value) {
    paused=value; toggle.setAttribute('aria-pressed',String(value)); toggle.textContent=value?'继续动效':'暂停动效';
    document.documentElement.classList.toggle('motion-on',!value);
    for(const el of reveal) {
      if(!value && el.getBoundingClientRect().top>innerHeight){el.classList.add('pending');observer.observe(el);}
      else {el.classList.remove('pending');observer.unobserve(el);}
    }
    last=0; start();
  }
  function start(){ if(!frame && visible && !document.hidden)frame=requestAnimationFrame(draw); }
  function draw(stamp) {
    frame=0;
    const dt=last?Math.min(.06,(stamp-last)/1000):0;
    if(!paused){
      time+=dt;
      viewX+=(targetX-viewX)*Math.min(1,dt*5);
      viewY+=(targetY-viewY)*Math.min(1,dt*5);
    }
    last=stamp;
    if(showHalo) {
      if(!manualAngle){
        const spin=Math.min(time,4.2);
        yaw=spin*.51+viewX*.27;
        elevation=.24+.24*Math.sin(spin*.77)+viewY*.18;
      }
      const settled=halo.render(time,yaw,elevation,inspecting);
      if(settled!==finished){
        finished=settled;
        replay.hidden=!settled;
        caption.textContent=settled?'yluna':'拖动旋转光环';
      }
    }
    else galaxy.render(time*.047,viewX,viewY);
    if(!paused)start();
  }
  function size() {
    const box=stage.getBoundingClientRect();
    (showHalo ? halo : galaxy).resize(box.width,box.height);start();
  }
  function aim(e) {
    const box=stage.getBoundingClientRect();
    targetX=2*(e.clientX-box.left)/box.width-1;
    targetY=2*(e.clientY-box.top)/box.height-1;
  }
  function inspectModel(){
    if(!showHalo || inspecting)return;
    if(finished){yaw=0;elevation=.25;}
    inspecting=manualAngle=true;finished=false;replay.hidden=true;
    inspect.textContent='聚成 yluna';caption.textContent='拖动查看角度';
    start();
  }
  function rotate(dx,dy){
    yaw+=dx;
    elevation=Math.min(Math.PI/2,Math.max(-Math.PI/2,elevation+dy));
    start();
  }
  haloCanvas.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || e.button!==0)return;
    inspectModel();drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    haloCanvas.setPointerCapture(e.pointerId);
  });
  haloCanvas.addEventListener('pointermove',e=>{
    if(!drag || e.pointerId!==drag.id)return;
    const radiansPerPixel=2*Math.PI/Math.max(230,Math.min(640,stage.clientWidth*.8));
    rotate((e.clientX-drag.x)*radiansPerPixel,(drag.y-e.clientY)*radiansPerPixel);
    drag.x=e.clientX;drag.y=e.clientY;
  });
  haloCanvas.addEventListener('lostpointercapture',()=>{drag=null;});
  haloCanvas.addEventListener('keydown',e=>{
    const directions={ArrowLeft:[-.22,0],ArrowRight:[.22,0],ArrowUp:[0,.18],ArrowDown:[0,-.18]};
    if(!directions[e.key])return;
    e.preventDefault();inspectModel();rotate(...directions[e.key]);
  });
  inspect.addEventListener('click',()=>{
    if(!inspecting){inspectModel();return;}
    inspecting=false;time=4.2;last=0;inspect.textContent='自由旋转';caption.textContent='未花光环';
    if(paused)setMode(false);
    start();
  });
  stage.addEventListener('pointermove',aim);
  stage.addEventListener('pointerdown',aim);
  stage.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  new ResizeObserver(size).observe(stage);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){last=0;start();}else{cancelAnimationFrame(frame);frame=0;}}).observe(stage);
  document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)start();});
  toggle.addEventListener('click',()=>setMode(!paused)); reduce.addEventListener('change',e=>setMode(e.matches));
  replay.addEventListener('click',()=>{
    time=0;last=0;finished=false;replay.hidden=true;
    inspecting=manualAngle=false;inspect.textContent='自由旋转';
    caption.textContent='拖动旋转光环';
    switchArt.focus({preventScroll:true});
    if(paused)setMode(false);
    start();
  });
  switchArt.addEventListener('click',()=>{
    showHalo=!showHalo;
    if(!showHalo && !galaxy)galaxy=createGalaxy(galaxyCanvas);
    haloCanvas.hidden=!showHalo;galaxyCanvas.hidden=showHalo;
    caption.textContent=showHalo?'拖动旋转光环':'彩色星系';
    inspecting=manualAngle=false;drag=null;inspect.hidden=!showHalo;inspect.textContent='自由旋转';
    switchArt.textContent=showHalo?'看彩色星系':'看未花光环';
    finished=false;replay.hidden=true;
    time=0;last=0;targetX=targetY=viewX=viewY=0;
    size();
  });
  size();setMode(paused);
})();
