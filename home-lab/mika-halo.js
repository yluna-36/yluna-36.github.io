// Sample the halo and word once. Each visible star keeps its color and travels between two positions.
function createMikaHalo(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = 1;
  const paths = Object.fromEntries(Object.entries({
    upperTip: 'M -33 -31 Q -31 -94 -48 -162 Q -47 -170 -42 -160 Q -20 -83 18 -38 Z',
    upperRibbon: 'M 32 -65 C 99 -89 236 -132 310 -119 C 386 -104 299 -37 177 12 C 133 29 80 42 36 49 C 143 13 269 -51 273 -76 C 270 -91 208 -89 154 -84 C 99 -79 52 -65 32 -65 Z',
    leftRibbon: 'M 100 -35 C 133 -58 90 -67 58 -63 C -70 -58 -264 -11 -324 79 C -372 151 -233 142 -94 94 C -176 116 -250 111 -255 96 C -245 47 -149 -23 14 -46 C 67 -53 122 -55 100 -35 Z',
    innerRibbon: 'M -71 22 C -104 30 -114 49 -99 53 C -68 62 54 29 101 -13 C 152 -65 48 -68 2 -57 C 72 -65 126 -58 100 -34 C 68 0 -20 47 -87 47 C -100 45 -87 31 -71 22 Z',
    lowerTip: 'M -20 35 Q 14 96 38 142 Q 43 146 43 136 Q 32 65 45 26 Z',
    equator: 'M -15 49 C 33 42 122 20 176 5 C 126 27 47 51 -13 56 C -39 60 -60 60 -75 58 C -55 58 -33 54 -15 49 Z',
    lowerRing: 'M 203 19 C 207 54 39 110 -86 134 C -161 149 -196 138 -165 113 C -140 91 -81 73 -24 59 C -74 74 -147 103 -151 119 C -153 134 -84 124 -39 115 C 57 95 184 50 186 28 C 186 11 102 26 45 38 C 109 18 202 -3 203 19 Z'
  }).map(([k,v])=>[k,new Path2D(v)]));
  const sparks = [[-327,12,51,51,-.35],[138,-157,50,51,-.15],[152,65,46,48,-.10]];
  const moons = [[-252,174,13],[-294,165,7],[-265,-10,9],[-237,-40,4],[-158,-54,12],
    [-151,-65,6],[-112,169,7],[-81,153,4],[232,-130,9],[214,-113,3],[178,-37,5],[244,69,7],[314,-29,5]];
  const sparkle = new Path2D('M 0 -1 C .1 -.96 .1 -.31 .2 -.19 C .32 -.09 .95 -.1 1 0 C .95 .1 .33 .11 .19 .2 C .10 .31 .1 .94 0 1 C -.09 .96 -.12 .32 -.2 .19 C -.34 .10 -.96 .10 -1 0 C -.96 -.09 -.31 -.10 -.2 -.2 C -.10 -.34 -.11 -.97 0 -1 Z');
  const mask = document.createElement('canvas');
  mask.width=880; mask.height=500;
  const ink=mask.getContext('2d',{willReadFrequently:true});
  const count=matchMedia('(max-width:680px)').matches ? 5200 : 10800;
  let seed=2113;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return (seed+.5)/4294967296;
  }
  function sampleMask(){
    const alpha=ink.getImageData(0,0,mask.width,mask.height).data;
    const cells=[];
    for(let y=1;y<mask.height;y+=2){
      for(let x=1;x<mask.width;x+=2){
        if(alpha[(y*mask.width+x)*4+3]>100) cells.push(y*mask.width+x);
      }
    }
    // Stratify by occupied area so even the thin ring and small satellites get stars.
    const points=[];
    for(let i=0;i<count;i++){
      const cell=cells[Math.floor((i+random())*cells.length/count)];
      points.push({x:cell%mask.width-mask.width/2+2*random()-1,
        y:Math.floor(cell/mask.width)-mask.height/2+2*random()-1});
    }
    return points;
  }
  ink.translate(mask.width/2,mask.height/2);
  ink.fillStyle=ink.strokeStyle='#fff';ink.lineWidth=1.6;
  for(const path of Object.values(paths)){ink.fill(path);ink.stroke(path);}
  for(const [x,y,r] of [[0,0,53],...moons]){
    ink.beginPath();ink.arc(x,y,r,0,Math.PI*2);ink.fill();
  }
  for(const [x,y,w,h,angle] of sparks){
    ink.save();ink.translate(x,y);ink.rotate(angle);ink.scale(w,h);ink.fill(sparkle);ink.restore();
  }
  const source=sampleMask();
  ink.clearRect(-mask.width/2,-mask.height/2,mask.width,mask.height);
  ink.font='italic bold 290px Georgia, "Times New Roman", serif';
  const word='yluna';
  const m=ink.measureText(word);
  const fit=690/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight);
  ink.save();ink.scale(fit,fit);
  ink.fillText(word,(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,
    (m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
  ink.restore();
  const target=sampleMask();

  // Nearby stars share a broad direction; local shuffling lets the strokes unwind into streams.
  source.sort((a,b)=>a.x-b.x);target.sort((a,b)=>a.x-b.x);
  const spread=Math.floor(count*.105);
  for(let i=0;i<count;i++){
    const j=i+Math.floor(random()*Math.min(spread,count-i));
    [target[i],target[j]]=[target[j],target[i]];
  }
  const colors=['#84669e','#b184be','#db9bca','#fbc6dc','#ffdfef','#b09acb','#c8b2ef','#e0d4ff',
    '#f7e7ff','#958bbd','#a3acdd','#b8d1f4','#ddfaff','#fff1f7'];
  const batches=colors.map(()=>[]);
  for(let i=0;i<count;i++){
    const a=source[i], b=target[i], rand=random();
    const horizontal=(a.x+380)/730+(.5-random())*.33;
    const band=horizontal<.35?0:horizontal<.68?5:9;
    const tone=random()<.035?13:band+Math.min(3,Math.floor(rand*4));
    batches[tone].push({a,b,r:.86+Math.pow(rand,1.65)*1.82,
      drift:random()*6.283,bend:(random()-.5)*83,delay:random()*.20,
      arc:Math.sin(a.x/125+a.y/92)*(55+Math.abs(a.x)*.15)+(.5-random())*32});
  }
  return {
    resize(w,h){
      width=w;height=h;dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
    },
    render(t,px,py){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(!width||!height)return false;
      const small=width<=680, scale=Math.min(width/(small?800:1090),height/(small?550:695));
      const phase=Math.max(0,Math.min(1,(t-2.6)/2.65));
      ctx.translate(width*(small?.51:.56),height*(small?.47:.40));
      ctx.scale(scale,scale);
      ctx.rotate((Math.sin(t*.42)*.025+px*.045)*(1-phase));
      ctx.transform(1,py*.018*(1-phase),px*.014,1+py*.035,0,0);
      for(let k=0;k<batches.length;k++){
        ctx.fillStyle=colors[k];ctx.beginPath();
        for(const star of batches[k]){
          const u=Math.max(0,Math.min(1,(phase-star.delay)/.80)), blend=u*u*(3-2*u);
          const lift=4*blend*(1-blend);
          const flicker=Math.sin(t*1.4+star.drift);
          const x=star.a.x+(star.b.x-star.a.x)*blend+star.bend*lift+flicker*(1.3-.8*blend);
          const y=star.a.y+(star.b.y-star.a.y)*blend+star.arc*lift+Math.cos(t*.9+star.drift)*(1.3-.8*blend);
          const r=star.r*(.97+.12*flicker)*(small?1.23:1);
          ctx.rect(x-r*.5,y-r*.5,r,r);
        }
        ctx.fill();
      }
      return phase>=1;
    }
  };
}
