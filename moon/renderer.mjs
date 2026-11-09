import { SUN, MOON, SUN_RADIUS, MOON_RADIUS, project, optics, sub, dot, unit } from './geometry.mjs?v=20261109-hidden-star1';

const vertex = `attribute vec2 aPosition; varying vec2 vUV; void main(){vUV=aPosition;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 vUV;
uniform vec2 uResolution;
uniform vec3 uEye,uForward,uRight,uUp;
uniform float uTan,uCover;
const vec3 sun=vec3(0.,0.,-18.);
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float sphere(vec3 ro,vec3 rd,vec3 center,float radius){vec3 oc=ro-center;float b=dot(oc,rd),c=dot(oc,oc)-radius*radius,h=b*b-c;if(h<0.)return 1.e5;float t=-b-sqrt(h);return t>0.?t:1.e5;}
void main(){
 vec3 rd=normalize(uForward+vUV.x*uTan*uRight+vUV.y*uTan*uResolution.y/uResolution.x*uUp);
 vec3 sd=normalize(sun-uEye);float cosine=dot(rd,sd);float ang=acos(clamp(cosine,-1.,1.));
 float sunAngle=asin(3.5/length(sun-uEye));
 float darkness=smoothstep(.08,1.,uCover);
 vec3 col=mix(vec3(.020,.027,.034),vec3(.0018,.004,.012),darkness);
 float haze=exp(-ang*ang*3.5)*(1.-darkness);
 col+=haze*vec3(.105,.061,.025);
 // Directional star field is fixed in world space, not painted onto the screen.
 vec2 st=vec2(atan(rd.x,-rd.z)/6.283185+.5,asin(rd.y)/3.141593+.5)*vec2(460.,230.);
 vec2 cell=floor(st),f=fract(st)-.5;float seed=hash(vec3(cell,3.7));
 float star=step(.982,seed)*exp(-dot(f,f)/(mix(.001,.007,hash(vec3(cell,4.3)))));
 col+=star*mix(.02,1.15,darkness*darkness)*vec3(.7,.84,1.);
 float tm=sphere(uEye,rd,vec3(0),1.18), ts=sphere(uEye,rd,sun,3.5);
 float visibleGlow=1.-uCover*.93;
 float glow=exp(-max(ang-sunAngle,0.)*12.);
 col+=glow*visibleGlow*vec3(.45,.21,.055);
 // A tilted spatial orbit is occulted by the actual spheres.
 vec3 pn=normalize(vec3(.24,.88,.38));float den=dot(rd,pn);
 if(abs(den)>.001){float t=dot(vec3(0.,-1.5,0.)-uEye,pn)/den;vec3 q=uEye+rd*t-vec3(0.,-1.5,0.);float r=length(q);
 if(t>0.&&t<min(tm,ts)){float ring=exp(-abs(r-4.7)*75.)+exp(-abs(r-6.5)*100.)*.4;col+=ring*vec3(.038,.058,.064)*(1.-.65*darkness);}}
 if(ts<tm){vec3 n=normalize(uEye+rd*ts-sun);float gran=noise(n*46.)*.5+noise(n*95.)*.2+noise(n*12.)*.3;float limb=pow(max(dot(n,-rd),0.),.3);col=mix(vec3(1.0,.37,.065),vec3(1.5,1.15,.58),limb)*(.8+gran*.3);}
 if(tm<ts&&tm<1.e4){vec3 n=normalize(uEye+rd*tm);float terrain=noise(n*13.)*.55+noise(n*35.)*.3+noise(n*90.)*.15;
 float crater=0.;for(int i=0;i<18;i++){float k=float(i);vec3 c=normalize(vec3(hash(vec3(k,3,7)),hash(vec3(k,8,2)),hash(vec3(k,5,9)))*2.-1.);float d=length(n-c);float r=.07+hash(vec3(k,2,3))*.16;crater+=exp(-pow((d-r)/.018,2.))*.2-exp(-pow(d/(r*.8),2.))*.16;}
 vec3 light=normalize(sun-(uEye+rd*tm));float direct=max(dot(n,light),0.);float ambient=.10+.24*max(dot(n,normalize(vec3(-.45,.65,1))),0.);
 col=vec3(.27,.32,.38)*max(.16,.48+terrain*.65+crater)*(ambient+direct*1.8);
 col=mix(col,vec3(.0018,.0025,.005)*(1.+terrain*.5),smoothstep(.55,1.,uCover));
 float rim=pow(1.-max(dot(n,-rd),0.),8.);col+=rim*direct*vec3(.7,.39,.15)*.6;
 }
 // Outer corona survives totality; the foreground lunar sphere remains opaque.
 if(tm>1.e4&&cosine>0.){float edge=max(ang-sunAngle,0.);float corona=exp(-edge*36.)*pow(darkness,4.);float ray=1.+.18*sin(atan(dot(rd,uUp),dot(rd,uRight))*19.);col+=corona*ray*vec3(.45,.56,.68);}
 float vignette=1.-.2*pow(length(vUV)*.65,2.);col*=vignette;
 gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(.72)),1.);
}`;

export function makeRenderer(original) {
 let canvas=original, gl;
 try { gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false}); } catch(_) {}
 if(gl){
  try {
   function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
   const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('WebGL program failed');gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   const uniforms=Object.fromEntries(['uResolution','uEye','uForward','uRight','uUp','uTan','uCover'].map(n=>[n,gl.getUniformLocation(program,n)]));
   return {canvas,kind:'webgl',render(cam,width,height,cover){
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1200000/(width*height)));
    const w=Math.round(width*ratio),h=Math.round(height*ratio);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniform2f(uniforms.uResolution,w,h);
    for(const [key,value] of [['uEye',cam.eye],['uForward',cam.forward],['uRight',cam.right],['uUp',cam.up]])gl.uniform3fv(uniforms[key],value);
    gl.uniform1f(uniforms.uTan,optics(width,height));gl.uniform1f(uniforms.uCover,cover);gl.drawArrays(gl.TRIANGLES,0,6);
   }};
  } catch(error) { console.warn('Using perspective canvas renderer:',error.message); }
  // A canvas cannot switch context type once a WebGL context was acquired.
  canvas=original.cloneNode(false);original.replaceWith(canvas);
 }
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('No canvas context available');
 // Same camera and occultation math; lighter renderer for devices without WebGL.
 const stars=Array.from({length:180},(_,i)=>[Math.sin(i*7.31)*90,Math.cos(i*4.91)*70,-60-(i%53)*2]);
 return {canvas,kind:'perspective-canvas',render(cam,width,height,cover){
  const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.fillStyle=`rgb(${Math.round(20-cover*17)},${Math.round(25-cover*20)},${Math.round(31-cover*19)})`;ctx.fillRect(0,0,width,height);
  for(const s of stars){const p=project(s,cam,width,height);ctx.fillStyle=`rgba(205,225,255,${.05+cover*.8})`;ctx.beginPath();ctx.arc(p.x,p.y,1,0,Math.PI*2);ctx.fill();}
  const s=project(SUN,cam,width,height),m=project(MOON,cam,width,height),sr=SUN_RADIUS/s.z*s.focal,mr=MOON_RADIUS/m.z*m.focal;
  const halo=ctx.createRadialGradient(s.x,s.y,sr*.8,s.x,s.y,sr*3.6);halo.addColorStop(0,`rgba(255,204,127,${1-cover*.75})`);halo.addColorStop(.3,`rgba(255,164,65,${.3*(1-cover)+.1})`);halo.addColorStop(1,'transparent');ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(s.x,s.y,sr,0,Math.PI*2);ctx.fill();
  const shade=ctx.createRadialGradient(m.x-mr*.4,m.y-mr*.4,0,m.x,m.y,mr*1.1);shade.addColorStop(0,cover>.9?'#070b14':'#414a57');shade.addColorStop(1,'#060912');ctx.fillStyle=shade;ctx.beginPath();ctx.arc(m.x,m.y,mr,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.clip();for(let i=0;i<24;i++){ctx.strokeStyle=`rgba(180,196,205,${.07*(1-cover)})`;ctx.beginPath();ctx.arc(m.x+Math.sin(i*4.8)*mr*.9,m.y+Math.cos(i*7.7)*mr*.9,3+(i%5)*2,0,Math.PI*2);ctx.stroke();}ctx.restore();
 }};
}
