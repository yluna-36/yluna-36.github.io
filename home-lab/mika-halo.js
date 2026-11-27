// Model space: Y is the polar axis. The spiral blades and their lower orbit lie in XZ.
function createMikaHalo(canvas) {
  const ctx=canvas.getContext('2d');
  const tau=2*Math.PI;
  let seed=2113;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return (seed+.5)/4294967296;
  }
  const vertices=[], vertexBodies=[], faces=[], stars=[];
  // Keep the camera independent of the moving material. Each satellite follows its own
  // circular XZ orbit; its local silhouette can turn at a different rate from its centre.
  const bodies=[];
  function movingBody(x,z,orbitRate,spinRate){
    bodies.push({x,z,orbitRate,spinRate,cos:1,sin:0,offsetX:0,offsetZ:0});
    return bodies.length-1;
  }
  movingBody(0,0,0,.11);
  const count=matchMedia('(max-width:680px)').matches ? 7700 : 16000;
  // Build closed surfaces and sample their area. The same triangles later hide rear particles.
  function surface(nu,nv,position,share,family,body=0){
    const first=vertices.length, start=faces.length;
    for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){
      vertices.push(position(i/nu,j/nv));
      vertexBodies.push(body);
    }
    let total=0;
    function triangle(a,b,c){
      const p=vertices[a],q=vertices[b],r=vertices[c];
      const ax=q[0]-p[0],ay=q[1]-p[1],az=q[2]-p[2];
      const bx=r[0]-p[0],by=r[1]-p[1],bz=r[2]-p[2];
      const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
      const area=Math.hypot(nx,ny,nz);
      if(area<1e-6)return;
      total+=area;
      faces.push({a,b,c,family,limit:total,light:.63+.37*((-.34*nx+.80*ny+.48*nz)/area)});
    }
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
      const a=first+i*(nv+1)+j,b=a+nv+1;
      triangle(a,b,a+1);triangle(a+1,b,b+1);
    }
    const amount=Math.round(count*share);
    let idx=start;
    for(let i=0;i<amount;i++){
      const area=(i+random())/amount*total;
      while(faces[idx].limit<area)idx++;
      const f=faces[idx], a=vertices[f.a],b=vertices[f.b],c=vertices[f.c];
      const u=Math.sqrt(random()),v=random()*u;
      const xyz=a.map((x,k)=>x*(1-u)+b[k]*(u-v)+c[k]*v);
      stars.push({xyz,family,body,light:f.light});
    }
  }
  function sphere(cx,cy,cz,r,share,family,nu=22,nv=14,body=0){
    surface(nu,nv,(u,v)=>{
      const angle=tau*u,lat=Math.PI*v,rr=r*Math.sin(lat);
      return [cx+rr*Math.cos(angle),cy+r*Math.cos(lat),cz+rr*Math.sin(angle)];
    },share,family,body);
  }
  // Two open, opposite spiral blades with lenticular cross sections and tapered tips.
  for(const turn of [0,Math.PI]){
    surface(76,8,(u,v)=>{
      const angle=-.86+u*5.13+turn;
      const tapered=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.65);
      const radius=82+246*Math.sin(u*1.53)+(12+43*u)*tapered*Math.cos(v*tau);
      return [Math.cos(angle)*radius,9+15*(u-.5)+5*tapered*Math.sin(v*tau),Math.sin(angle)*radius];
    },.226,turn===0?0:1);
  }
  function orbit(radius,y,halfWidth,height,share){
    surface(86,8,(u,v)=>{
      const r=radius+halfWidth*Math.cos(tau*v);
      return [r*Math.cos(u*tau),y+height*Math.sin(tau*v),r*Math.sin(u*tau)];
    },share,1);
  }
  orbit(169,-63,7,4,.103);
  sphere(0,0,0,48,.147,2);
  for(const sign of [-1,1]){
    surface(25,16,(u,v)=>{
      const r=30*Math.pow(1-v,1.65), a=u*tau;
      return [r*Math.cos(a),sign*(32+116*v),r*Math.sin(a)];
    },.049,2);
  }
  // Four-point stars have ridged fronts AND backs; a side view shows their thickness.
  function sparkle(cx,cy,cz,r,twist,share,orbitRate){
    surface(32,12,(u,v)=>{
      const a=tau*u;
      const radius=r/Math.pow(Math.pow(Math.abs(Math.cos(a)),.61)+Math.pow(Math.abs(Math.sin(a)),.61),1/.61);
      const notch=1-.62*Math.abs(Math.sin(2*a));
      const lat=Math.PI*v, x=radius*notch*Math.cos(a)*Math.sin(lat);
      const y=radius*notch*Math.sin(a)*Math.sin(lat), z=.27*r*Math.cos(lat);
      return [cx+x*Math.cos(twist)+z*Math.sin(twist),cy+y,cz-x*Math.sin(twist)+z*Math.cos(twist)];
    },share,2,movingBody(cx,cz,orbitRate,.075));
    // A short dust wake traces the orbit around Y, including its far side.
    // It follows the star's centre, independently of how the star turns in place.
    const wake=movingBody(0,0,0,orbitRate);
    for(let i=0;i<Math.round(count*.009);i++){
      const age=random()**1.5,angle=-.48*age,spread=1+age*7;
      const scatter=()=>spread*(random()+random()-1);
      const x=cx*Math.cos(angle)+cz*Math.sin(angle)+scatter();
      const z=cz*Math.cos(angle)-cx*Math.sin(angle)+scatter();
      stars.push({xyz:[x,cy+scatter(),z],family:2,body:wake,light:.8-.5*age,grain:.72-.32*age});
    }
  }
  sparkle(-307,70,-40,43,-.22,.036,.34);
  sparkle(153,118,-62,48,.2,.040,.52);
  sparkle(155,-49,122,42,-.38,.034,.43);
  for(const [x,y,z,r] of [[-260,-65,94,12],[-300,-72,62,6],[-218,90,-87,8],[-157,77,-135,12],
    [-109,-97,55,7],[218,95,-109,8],[295,16,90,6],[234,-82,19,6],[-80,-108,-107,4]]){
    sphere(x,y,z,r,.008*(r/9),1,10,8,movingBody(x,z,90/Math.hypot(x,z),.12));
  }

  // Only the destination word is sampled from a flat mask.
  const mask=document.createElement('canvas');mask.width=880;mask.height=500;
  const ink=mask.getContext('2d',{willReadFrequently:true});
  ink.font='italic bold 290px Georgia, "Times New Roman", serif';
  const word='yluna',m=ink.measureText(word),fit=690/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight);
  ink.translate(440,250);ink.scale(fit,fit);
  ink.fillText(word,(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
  const pixels=ink.getImageData(0,0,880,500).data,cells=[];
  for(let y=1;y<500;y+=2)for(let x=1;x<880;x+=2)if(pixels[4*(y*880+x)+3]>100)cells.push(y*880+x);
  const targets=stars.map((_,i)=>{
    const cell=cells[Math.floor((i+random())*cells.length/stars.length)];
    return [cell%880-440+random()*2-1,Math.floor(cell/880)-250+random()*2-1];
  }).sort((a,b)=>a[0]-b[0]);
  stars.sort((a,b)=>a.xyz[0]-b.xyz[0]);
  const colors=['#826790','#baa0cc','#f0c6ed','#fff2f9','#8a80ab','#a7a7d3','#d0d2ee','#dffaff','#985f91','#cf91bc','#fad1e7','#fff1fd'];
  const batches=colors.map(()=>[]);
  stars.forEach((s,i)=>{
    const j=i+Math.floor(random()*Math.min(stars.length-i,stars.length*.12));
    [targets[i],targets[j]]=[targets[j],targets[i]];
    const tone=Math.min(3,Math.floor((random()*.64+s.light*.36)*4));
    batches[4*s.family+tone].push({...s,target:targets[i],r:(s.grain??1)*(.9+2.0*random())*(.62+.48*s.light),delay:.18*random(),
      flutter:.9+2.7*random(),glint:random()<.072,dust:random()<.13?3+7*random():.65,
      slip:random()-.5,offsetX:0,offsetY:0,
      arc:Math.sin(s.xyz[0]/120+s.xyz[2]/160)*72+random()*20,bend:(random()-.5)*92,phase:random()*tau});
  });

  // A small reciprocal-depth buffer rasterizes the opaque support surfaces without painting them.
  // It resolves occlusion even on browsers without WebGL; the visible material is all particles.
  const side=256, cellSize=4, half=side/2, focal=1550;
  const depth=new Float32Array(side*side), projected=new Float64Array(vertices.length*3);
  const roll=-.27, cr=Math.cos(roll),sr=Math.sin(roll);
  function rasterize(){
    depth.fill(0);
    for(const f of faces){
      const i=f.a*3,j=f.b*3,k=f.c*3;
      const ax=projected[i],ay=projected[i+1],az=projected[i+2];
      const bx=projected[j]-ax,by=projected[j+1]-ay;
      const cx=projected[k]-ax,cy=projected[k+1]-ay;
      const det=bx*cy-by*cx;
      if(Math.abs(det)<.002)continue;
      const x0=Math.max(0,Math.floor(ax+Math.min(0,bx,cx))),x1=Math.min(side-1,Math.ceil(ax+Math.max(0,bx,cx)));
      const y0=Math.max(0,Math.floor(ay+Math.min(0,by,cy))),y1=Math.min(side-1,Math.ceil(ay+Math.max(0,by,cy)));
      const dz1=projected[j+2]-az,dz2=projected[k+2]-az;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx=x+.5-ax,dy=y+.5-ay;
        const u=(dx*cy-dy*cx)/det,v=(bx*dy-by*dx)/det;
        if(u<0||v<0||u+v>1)continue;
        const z=az+u*dz1+v*dz2, index=y*side+x;
        if(z>depth[index])depth[index]=z;
      }
    }
  }
  let width=0,height=0,dpr=1,pointer=null;
  const highlights=new Float32Array(stars.length*3);
  return {
    resize(w,h){
      width=w;height=h;dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
    },
    hoverAt(x,y){pointer={x,y};},
    clearHover(reset=false){
      pointer=null;
      if(reset)for(const batch of batches)for(const s of batch)s.offsetX=s.offsetY=0;
    },
    render(t,yaw,elevation,inspect=false,clock=t,dt=0){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(!width||!height)return false;
      const p=inspect?0:Math.max(0,Math.min(1,(t-4.2)/2.65));
      const ce=Math.cos(elevation),se=Math.sin(elevation);
      // Compose each orbit and local spin with the camera once per body per frame.
      for(const b of bodies){
        const orbit=yaw+clock*b.orbitRate,spin=yaw+clock*b.spinRate;
        b.cos=Math.cos(spin);b.sin=Math.sin(spin);
        b.offsetX=(Math.cos(orbit)-b.cos)*b.x+(Math.sin(orbit)-b.sin)*b.z;
        b.offsetZ=(Math.cos(orbit)-b.cos)*b.z-(Math.sin(orbit)-b.sin)*b.x;
      }
      if(p<1){
        vertices.forEach(([x,y,z],i)=>{
          const b=bodies[vertexBodies[i]];
          const sideways=b.cos*x+b.sin*z+b.offsetX,forward=b.cos*z-b.sin*x+b.offsetZ,down=forward*se-y*ce;
          const perspective=focal/(focal-forward*ce-y*se);
          projected[i*3]=half+perspective*(sideways*cr-down*sr)/cellSize;
          projected[i*3+1]=half+perspective*(sideways*sr+down*cr)/cellSize;
          projected[i*3+2]=perspective;
        });
        rasterize();
      }
      const small=width<=680,scale=Math.min(width/(small?850:1090),height/(small?710:875));
      const cx=width*(small?.50:.56),cy=height*(small?.49:.43);
      ctx.translate(cx,cy);ctx.scale(scale,scale);
      // Compute repulsion in the view plane so the pointer also parts the far side
      // when seen from below, and can brush the letters after the morph.
      const px=pointer?(pointer.x-cx)/scale:Infinity,py=pointer?(pointer.y-cy)/scale:Infinity;
      const reach=Math.min(94,Math.max(55,width*.092))/scale,reach2=reach*reach;
      const outward=1-Math.exp(-dt*15),returning=1-Math.exp(-dt*4.8);
      let lit=0;
      for(let k=0;k<batches.length;k++){
        ctx.fillStyle=colors[k];ctx.beginPath();
        for(const s of batches[k]){
          const [x,y,z]=s.xyz,b=bodies[s.body];
          const sideways=b.cos*x+b.sin*z+b.offsetX,forward=b.cos*z-b.sin*x+b.offsetZ,down=forward*se-y*ce;
          const q=focal/(focal-forward*ce-y*se),sx=q*(sideways*cr-down*sr),sy=q*(sideways*sr+down*cr);
          const u=Math.max(0,Math.min(1,(p-s.delay)/.82)),mix=u*u*(3-2*u),arc=4*mix*(1-mix);
          const obscured=p<1 && depth[Math.floor(half+sy/cellSize)*side+Math.floor(half+sx/cellSize)]>q+.004;
          const wave=Math.sin(clock*s.flutter+s.phase), drift=s.dust*(1-.83*mix);
          let dx=sx+(s.target[0]-sx)*mix+s.bend*arc+drift*Math.sin(clock*.73+s.phase);
          let dy=sy+(s.target[1]-sy)*mix+s.arc*arc+drift*Math.cos(clock*.81+s.phase);
          const vx=dx-px,vy=dy-py,rr=vx*vx+vy*vy;
          if(rr<reach2){
            const dist=Math.sqrt(rr),falloff=1-dist/reach;
            const push=reach*falloff*falloff*(.82+.45*s.slip)/Math.max(.6,dist);
            s.offsetX+=((vx-vy*s.slip*.57)*push-s.offsetX)*outward;
            s.offsetY+=((vy+vx*s.slip*.57)*push-s.offsetY)*outward;
          }else{
            s.offsetX*=1-returning;s.offsetY*=1-returning;
          }
          if(obscured && !mix)continue;
          dx+=s.offsetX;dy+=s.offsetY;
          const r=s.r*(.90+.34*wave)*(q+(1-q)*mix)*(small?1.35:1.18)*(obscured?Math.min(1,mix*5):1);
          ctx.rect(dx-r/2,dy-r/2,r,r);
          if(s.glint && wave>.70){
            highlights[lit++]=dx;highlights[lit++]=dy;highlights[lit++]=r*(wave-.70)*4;
          }
        }
        ctx.fill();
      }
      // Tiny, asynchronous pinpricks of light; a glint blooms and recedes smoothly.
      ctx.fillStyle='rgba(228,189,250,.18)';ctx.beginPath();
      for(let i=0;i<lit;i+=3){
        const x=highlights[i],y=highlights[i+1],r=highlights[i+2];
        ctx.rect(x-r*1.9,y-r*.29,3.8*r,.58*r);ctx.rect(x-r*.29,y-r*1.9,.58*r,3.8*r);
      }
      ctx.fill();ctx.fillStyle='rgba(255,249,255,.92)';ctx.beginPath();
      for(let i=0;i<lit;i+=3){
        const r=highlights[i+2];ctx.rect(highlights[i]-r/2,highlights[i+1]-r/2,r,r);
      }
      ctx.fill();
      return p>=1;
    }
  };
}
