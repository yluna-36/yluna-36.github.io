// Original canvas drawing inspired by Mika's regular character illustration.
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
  function surface(path,fill,stroke='#c3a7fa',pen=2) {
    ctx.fillStyle=fill;ctx.fill(path);
    ctx.strokeStyle=stroke;ctx.lineWidth=pen;ctx.stroke(path);
  }
  function pearl(x,y,r,core){
    const g=ctx.createRadialGradient(x-r*.23,y-r*.35,r*.08,x,y,r);
    g.addColorStop(0,core?'#fff7fe':'#f7fdff');
    g.addColorStop(.72,core?'#f9dffb':'#e4ebff');
    g.addColorStop(1,core?'#e8baf4':'#bdadff');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='#caacff';ctx.lineWidth=core?2.4:1.2;ctx.stroke();
  }
  return {
    resize(w,h){
      width=w;height=h;dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
    },
    render(t,px,py){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(!width||!height)return;
      const small=width<=680, unit=Math.min(width/(small?840:1170),height/(small?565:735));
      const cx=width*(small?.51:.56),cy=height*(small?.47:.40);
      ctx.save();ctx.translate(cx,cy+Math.sin(t*.8)*unit*3.5);ctx.scale(unit,unit);
      // Keep the illustration's tilt readable throughout the motion.
      ctx.rotate(Math.sin(t*.36)*.028+px*.044);ctx.transform(1,py*.024,px*.025,1+py*.05,0,0);
      const aura=ctx.createRadialGradient(0,0,7,0,0,378);
      aura.addColorStop(0,'rgba(255,177,235,.17)');aura.addColorStop(.44,'rgba(182,134,228,.07)');aura.addColorStop(1,'rgba(120,91,186,0)');
      ctx.fillStyle=aura;ctx.fillRect(-380,-380,760,760);
      const enamel=ctx.createLinearGradient(-328,65,307,-87);
      enamel.addColorStop(0,'#ccfaff');enamel.addColorStop(.25,'#f3e9ff');enamel.addColorStop(.52,'#ffe6f1');
      enamel.addColorStop(.75,'#f3e5ff');enamel.addColorStop(1,'#d6f5ff');
      ctx.lineJoin='round';ctx.shadowColor='rgba(202,157,255,.44)';ctx.shadowBlur=unit*dpr*7;
      surface(paths.upperTip,'#f7d5f5');
      surface(paths.upperRibbon,enamel);
      surface(paths.leftRibbon,enamel);
      for(const [i,[x,y,r]] of moons.entries()){
        pearl(x+Math.sin(t*.72+i)*2,y+Math.cos(t*.8+i)*2,r,false);
      }
      pearl(0,0,53,true);
      surface(paths.lowerTip,'#f4ccf7');
      surface(paths.innerRibbon,enamel);
      surface(paths.equator,'#f4ddff','#cfaff4',1.6);
      surface(paths.lowerRing,enamel);
      sparks.forEach(([x,y,w,h,angle],i)=>{
        const pulse=.93+.07*Math.sin(t*1.55+i*2.2);
        ctx.save();ctx.translate(x+px*(4+i),y+Math.sin(t*.9+i)*2.4);
        ctx.rotate(angle+Math.sin(t*.55+i)*.022);ctx.scale(w*pulse,h*pulse);
        surface(sparkle,i===0?'#def5ff':'#f4e4ff','#c5aaff',.045);ctx.restore();
      });
      ctx.restore();
    }
  };
}
