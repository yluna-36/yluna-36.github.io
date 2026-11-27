(() => {
  const canvas = document.querySelector('#prism');
  const ctx = canvas.getContext('2d');
  const toggle = document.querySelector('#motion');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches, frame = 0, visible = true, time = 0, last = 0;
  let pointer = 0, target = 0, width = 0, height = 0;
  const palette = ['#ff6b54','#ff9956','#ffcd6b','#c1ee85','#72e2cf','#72caff','#9ba6ff','#d0a0ff'];
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
  function line(points,color,size=1){
    ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
    ctx.strokeStyle=color;ctx.lineWidth=size;ctx.stroke();
  }
  function face(points,stops){
    const g=ctx.createLinearGradient(-.6,-.48,.75,.57);
    stops.forEach(([t,color])=>g.addColorStop(t,color));
    ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
    ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.lineWidth=.004;ctx.strokeStyle='#d7ead7bb';ctx.stroke();
  }
  function draw(stamp){
    frame=0;
    const dt=last?Math.min(.06,(stamp-last)/1000):0;
    if(!paused){time+=dt;pointer+=(target-pointer)*Math.min(1,dt*5);}
    last=stamp;
    const small=width<=680;
    const scale=small?Math.min(width*.38,height*.48):Math.min(width*.199,height*.42);
    ctx.clearRect(0,0,width,height);
    ctx.save();ctx.translate(width*(small?.49:.715),height*(small?.50:.51));ctx.scale(scale,scale);
    // Coordinates are normalized to the prism. All ray endpoints share its two sloping faces.
    const tip=[.03,-.81],left=[-.76,.61],right=[.74,.61],depth=[.26,-.16];
    const back=p=>[p[0]+depth[0],p[1]+depth[1]];
    const edgeX=(end,y)=>tip[0]+(end[0]-tip[0])*(y-tip[1])/(end[1]-tip[1]);
    const y=-.08+pointer*.21+Math.sin(time*.48)*.035;
    const pin=[edgeX(left,y),y], pout=[edgeX(right,y+.095),y+.095];
    const begin=[-2.05,y+.3-pointer*.29];
    // Subtle optical-bench rulings under the glass.
    ctx.save();ctx.globalAlpha=.4;for(let i=-18;i<=18;i++){
      const x=i*.092;line([[x,.85],[x,.85+(i%5===0?.038:.014)]],'#9cae9c',.003);
    }ctx.restore();
    for(const [p,q] of [[tip,back(tip)],[back(tip),back(right)],[back(right),back(left)],[back(left),left]]){
      line([p,q],'#bbd0ba66',.005);
    }
    face([left,right,back(right),back(left)],[[0,'#7eafa738'],[.6,'#b4dfc545'],[1,'#eaf6d168']]);
    face([tip,right,back(right),back(tip)],[[0,'#e4efdf60'],[.46,'#b7cde654'],[.7,'#badddb22'],[1,'#a1c7a89c']]);
    face([tip,left,right],[[0,'#ddf9dd8f'],[.35,'#b5c7a950'],[.66,'#7fada124'],[1,'#375d593d']]);
    for(let i=1;i<5;i++){
      const d=i*.008; line([[tip[0]+d,tip[1]+.016],[right[0]+d,right[1]-.003]],'#dfffd248',.0028);
      line([[left[0]+d,left[1]-.009],[tip[0]+d,tip[1]+.018]],'#f2fff466',.0024);
    }
    ctx.globalCompositeOperation='screen';
    const g=ctx.createLinearGradient(begin[0],0,pin[0],0);
    g.addColorStop(0,'#f2ffc900');g.addColorStop(.55,'#f2ffc948');g.addColorStop(1,'#ffffffec');
    for(const [size,alpha] of [[.058,.13],[.025,.32],[.008,.98]]){ctx.globalAlpha=alpha;line([begin,pin],g,size);}
    const endX=small?2.0:2.15;
    for(let i=0;i<palette.length;i++){
      const t=i/(palette.length-1);
      const exit=[edgeX(right,pout[1]+(t-.5)*.037),pout[1]+(t-.5)*.037];
      const endY=exit[1]+(.025+t*.40-pointer*.12)*(endX-exit[0]);
      const beam=ctx.createLinearGradient(exit[0],0,endX,0);
      beam.addColorStop(0,palette[i]+'f2');beam.addColorStop(.65,palette[i]+'c8');beam.addColorStop(1,palette[i]+'00');
      ctx.globalAlpha=.23;line([pin,exit],palette[i],.012);
      for(const [size,alpha] of [[.064,.17],[.035,.48],[.012,.97]]){ctx.globalAlpha=alpha;line([exit,[endX,endY]],beam,size);}
    }
    ctx.globalAlpha=.83;line([pin,pout],'#f3ffee',.006);
    ctx.restore();
    if(!paused)start();
  }
  function size(){
    const b=canvas.getBoundingClientRect();width=b.width;height=b.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);start();
  }
  function aim(e){const b=canvas.getBoundingClientRect();target=Math.max(-1,Math.min(1,(e.clientY-b.top)/b.height*2-1));}
  canvas.addEventListener('pointermove',aim);canvas.addEventListener('pointerdown',aim);canvas.addEventListener('pointerleave',()=>target=0);
  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){last=0;start();}else{cancelAnimationFrame(frame);frame=0;}}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)start();});
  toggle.addEventListener('click',()=>setMode(!paused)); reduce.addEventListener('change',e=>setMode(e.matches));
  size();setMode(paused);
})();
