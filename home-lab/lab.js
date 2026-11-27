(() => {
  const canvas = document.querySelector('#galaxy');
  const galaxy = createGalaxy(canvas);
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
    galaxy.render(time*.047,viewX,viewY);
    if(!paused)start();
  }
  function size() {
    const box=canvas.getBoundingClientRect();
    galaxy.resize(box.width,box.height);start();
  }
  function aim(e) {
    const box=canvas.getBoundingClientRect();
    targetX=2*(e.clientX-box.left)/box.width-1;
    targetY=2*(e.clientY-box.top)/box.height-1;
  }
  canvas.addEventListener('pointermove',aim);
  canvas.addEventListener('pointerdown',aim);
  canvas.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){last=0;start();}else{cancelAnimationFrame(frame);frame=0;}}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)start();});
  toggle.addEventListener('click',()=>setMode(!paused)); reduce.addEventListener('change',e=>setMode(e.matches));
  size();setMode(paused);
})();
