// Model space: Y is the polar axis. The spiral blades and their lower orbit lie in XZ.
function createMikaHalo(canvas) {
  const ctx=canvas.getContext('2d');
  const tau=2*Math.PI;
  let seed=2113;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return (seed+.5)/4294967296;
  }
  const vertices=[], faces=[], stars=[];
  const count=matchMedia('(max-width:680px)').matches ? 7700 : 16000;
  // Build closed surfaces and sample their area. The same triangles later hide rear particles.
  function surface(nu,nv,position,share,family){
    const first=vertices.length, start=faces.length;
    for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)vertices.push(position(i/nu,j/nv));
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
      stars.push({xyz,family,light:f.light});
    }
  }
  function sphere(cx,cy,cz,r,share,family,nu=22,nv=14){
    surface(nu,nv,(u,v)=>{
      const angle=tau*u,lat=Math.PI*v,rr=r*Math.sin(lat);
      return [cx+rr*Math.cos(angle),cy+r*Math.cos(lat),cz+rr*Math.sin(angle)];
    },share,family);
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
  function sparkle(cx,cy,cz,r,twist,share){
    surface(32,12,(u,v)=>{
      const a=tau*u;
      const radius=r/Math.pow(Math.pow(Math.abs(Math.cos(a)),.61)+Math.pow(Math.abs(Math.sin(a)),.61),1/.61);
      const notch=1-.62*Math.abs(Math.sin(2*a));
      const lat=Math.PI*v, x=radius*notch*Math.cos(a)*Math.sin(lat);
      const y=radius*notch*Math.sin(a)*Math.sin(lat), z=.27*r*Math.cos(lat);
      return [cx+x*Math.cos(twist)+z*Math.sin(twist),cy+y,cz-x*Math.sin(twist)+z*Math.cos(twist)];
    },share,2);
  }
  sparkle(-307,70,-40,43,-.22,.036);
  sparkle(153,118,-62,48,.2,.040);
  sparkle(155,-49,122,42,-.38,.034);
  for(const [x,y,z,r] of [[-260,-65,94,12],[-300,-72,62,6],[-218,90,-87,8],[-157,77,-135,12],
    [-109,-97,55,7],[218,95,-109,8],[295,16,90,6],[234,-82,19,6],[-80,-108,-107,4]]){
    sphere(x,y,z,r,.008*(r/9),1,10,8);
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
    batches[4*s.family+tone].push({...s,target:targets[i],r:(1.03+1.9*random())*(.62+.48*s.light),delay:.18*random(),
      arc:Math.sin(s.xyz[0]/120+s.xyz[2]/160)*72+random()*20,bend:(random()-.5)*92,phase:random()*tau});
  });

  // A small reciprocal-depth buffer rasterizes the opaque support surfaces without painting them.
  // It resolves occlusion even on browsers without WebGL; the visible material is all particles.
  const side=256, cellSize=4, half=side/2, focal=1550;
  const depth=new Float32Array(side*side), projected=new Float64Array(vertices.length*3);
  const roll=-.27, cr=Math.cos(roll),sr=Math.sin(roll);
  const shell=document.createElement('canvas');shell.width=shell.height=side;
  const shellContext=shell.getContext('2d'), layer=shellContext.createImageData(side,side);
  const pearlColors=[[222,176,216],[173,200,240],[244,181,225]];
  function rasterize(){
    depth.fill(0);layer.data.fill(0);
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
        if(z>depth[index]){
          depth[index]=z;
          const offset=4*index,rgb=pearlColors[f.family];
          layer.data[offset]=rgb[0];layer.data[offset+1]=rgb[1];layer.data[offset+2]=rgb[2];
          layer.data[offset+3]=12+54*f.light*f.light;
        }
      }
    }
    shellContext.putImageData(layer,0,0);
  }
  let width=0,height=0,dpr=1;
  return {
    resize(w,h){
      width=w;height=h;dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
    },
    render(t,yaw,elevation,inspect=false){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(!width||!height)return false;
      const p=inspect?0:Math.max(0,Math.min(1,(t-4.2)/2.65));
      const ca=Math.cos(yaw),sa=Math.sin(yaw),ce=Math.cos(elevation),se=Math.sin(elevation);
      if(p<1){
        vertices.forEach(([x,y,z],i)=>{
          const sideways=ca*x+sa*z,forward=ca*z-sa*x,down=forward*se-y*ce;
          const perspective=focal/(focal-forward*ce-y*se);
          projected[i*3]=half+perspective*(sideways*cr-down*sr)/cellSize;
          projected[i*3+1]=half+perspective*(sideways*sr+down*cr)/cellSize;
          projected[i*3+2]=perspective;
        });
        rasterize();
      }
      const small=width<=680,scale=Math.min(width/(small?850:1090),height/(small?710:875));
      ctx.translate(width*(small?.50:.56),height*(small?.49:.43));ctx.scale(scale,scale);
      if(p<1){
        ctx.globalAlpha=Math.max(0,1-p*3);
        ctx.drawImage(shell,-half*cellSize,-half*cellSize,side*cellSize,side*cellSize);
        ctx.globalAlpha=1;
      }
      for(let k=0;k<batches.length;k++){
        ctx.fillStyle=colors[k];ctx.beginPath();
        for(const s of batches[k]){
          const [x,y,z]=s.xyz, sideways=ca*x+sa*z,forward=ca*z-sa*x,down=forward*se-y*ce;
          const q=focal/(focal-forward*ce-y*se),sx=q*(sideways*cr-down*sr),sy=q*(sideways*sr+down*cr);
          const u=Math.max(0,Math.min(1,(p-s.delay)/.82)),mix=u*u*(3-2*u),arc=4*mix*(1-mix);
          const obscured=p<1 && depth[Math.floor(half+sy/cellSize)*side+Math.floor(half+sx/cellSize)]>q+.004;
          if(obscured && !mix)continue;
          const twinkle=Math.sin(t*1.4+s.phase);
          const dx=sx+(s.target[0]-sx)*mix+s.bend*arc+.42*twinkle;
          const dy=sy+(s.target[1]-sy)*mix+s.arc*arc;
          const r=s.r*(1+.1*twinkle)*(q+(1-q)*mix)*(small?1.35:1.18)*(obscured?Math.min(1,mix*5):1);
          ctx.rect(dx-r/2,dy-r/2,r,r);
        }
        ctx.fill();
      }
      return p>=1;
    }
  };
}
