// A point cloud sampled once in model space. Rotate each depth layer around an inclined disk.
function createGalaxy(canvas) {
  const mobile = matchMedia('(max-width:680px)').matches;
  const count = mobile ? 11000 : 20000;
  const stride = 8;
  const vertices = new Float32Array(count * stride);
  let seed = 6151;
  function random() {
    seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
    return (seed + .5) / 4294967296;
  }
  function normal() { return Math.sqrt(-2*Math.log(random())) * Math.cos(2*Math.PI*random()); }

  // Each arm is formed by two cubic arcs. Their joins share a tangent.
  const arms = [
    [[0,0],[.41,-.03],[.55,.34],[-.15,.39],[-.79,.45],[-1.36,.16],[-.91,-.15]],
    [[0,0],[-.29,.19],[-.77,.00],[-.37,-.18],[-.04,-.33],[.53,-.30],[.78,-.20]],
    [[0,0],[-.11,-.19],[.40,-.18],[.68,.04],[1.10,.37],[1.03,.61],[.35,.81]]
  ];
  const stops = [[0,[250,119,210]],[.17,[255,144,137]],[.26,[255,205,125]],
    [.39,[142,222,195]],[.51,[124,229,225]],[.62,[137,223,245]],
    [.73,[139,171,255]],[.86,[206,148,255]],[1,[250,119,210]]];
  function colorAt(hue) {
    const k=stops.findIndex(stop=>stop[0]>=hue);
    const [hi,b]=stops[Math.max(1,k)], [lo,a]=stops[Math.max(0,k-1)];
    const t=(hue-lo)/(hi-lo);
    return a.map((v,j)=>(v+(b[j]-v)*t)/255);
  }
  for(let i=0;i<count;i++) {
    const arm=arms[i%3];
    const u=Math.pow(random(),1.24)*2;
    const segment=Math.min(1,Math.floor(u))*3, t=u-segment/3, s=1-t;
    const weights=[s*s*s,3*s*s*t,3*s*t*t,t*t*t];
    let x=0,y=0;
    for(let j=0;j<4;j++){x+=weights[j]*arm[segment+j][0];y+=weights[j]*arm[segment+j][1];}
    const halo=random()<.09;
    const spread=(.057-.032*u/2)*(halo?2.45:1)*(.74+random()*.65);
    x+=normal()*spread; y+=normal()*spread*.67;
    // A compact, warm core reads separately from the diffuse inner arms.
    const core = i%15===0;
    if(core){x=normal()*.032;y=normal()*.051-.018;}
    const z=normal()*spread*.55;
    const hue=((Math.atan2(y,x)/(Math.PI*2)+.5+normal()*.018+1)%1);
    const rgb=core ? colorAt(.18+random()*.17) : colorAt(hue);
    const star=random();
    const lum=(halo?.34:1)*(.44+.62*Math.pow(random(),.65));
    vertices.set([x,y,z,...rgb,.75+1.65*Math.pow(star,2.4),lum],i*stride);
  }

  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true});
  let width=0,height=0,ratio=1,scale=1,cx=0,cy=0;
  let render;
  if(gl) {
    const vs=`
      attribute vec3 pos, tint; attribute vec2 star;
      uniform vec2 viewport,origin,look;
      uniform float scale,dpr,phase;
      varying vec3 rgb; varying float alpha;
      void main(){
        float radius=length(pos.xy);
        float a=phase/(1.0+radius*.45)+look.x*.11;
        vec2 disk=vec2(pos.x,pos.y/.64);
        vec2 spin=mat2(cos(a),sin(a),-sin(a),cos(a))*disk;
        vec2 p=vec2(spin.x,spin.y*(.64+look.y*.08));
        p+=pos.z*vec2(look.x*.55,look.y*.6)+look*.019;
        vec2 pixel=origin+p*scale;
        gl_Position=vec4(pixel/viewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
        gl_PointSize=clamp(star.x*scale/295.,1.42,3.9)*dpr*1.63;
        rgb=tint;
        alpha=star.y*1.16;
      }`;
    const fs=`precision mediump float; varying vec3 rgb; varying float alpha;
      void main(){
        float r=length(gl_PointCoord-.5)*2.;
        float light=(1.-smoothstep(.15,1.,r))*alpha;
        gl_FragColor=vec4(rgb*light,light);
      }`;
    const program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    for(const [name,n,offset] of [['pos',3,0],['tint',3,3],['star',2,6]]){
      const loc=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,stride*4,offset*4);
    }
    const uni=Object.fromEntries(['viewport','origin','look','scale','dpr','phase'].map(k=>[k,gl.getUniformLocation(program,k)]));
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    render=(phase,px,py)=>{
      gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uni.viewport,width,height);gl.uniform2f(uni.origin,cx,cy);
      gl.uniform2f(uni.look,px,py);gl.uniform1f(uni.scale,scale);gl.uniform1f(uni.dpr,ratio);
      gl.uniform1f(uni.phase,phase);gl.drawArrays(gl.POINTS,0,count);
    };
  } else {
    const ctx=canvas.getContext('2d');
    // Cache a high-resolution star layer for browsers without WebGL.
    const sheet=document.createElement('canvas');sheet.width=sheet.height=1500;
    const s=sheet.getContext('2d');s.globalCompositeOperation='lighter';
    for(let i=0;i<count;i++){
      const k=i*stride;
      s.fillStyle='rgba('+[3,4,5].map(j=>Math.round(vertices[k+j]*255)).join(',')+','+vertices[k+7]+')';
      s.beginPath();s.arc(750+vertices[k]*540,750+vertices[k+1]*540,vertices[k+6]*.90,0,Math.PI*2);s.fill();
    }
    render=(phase,px,py)=>{
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.save();
      ctx.translate(cx,cy);ctx.scale(scale,scale*(1+py*.065));ctx.rotate(phase*.58+px*.08);
      ctx.drawImage(sheet,-750/540,-750/540,1500/540,1500/540);ctx.restore();
    };
  }
  return {
    resize(w,h){
      width=w;height=h;ratio=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      const narrow=w<=680;
      scale=narrow?Math.min(w*.42,h*.66):Math.min(w*.327,h*.66);
      cx=w*(narrow?.515:.552);cy=h*(narrow?.405:.405);
    },render
  };
}
