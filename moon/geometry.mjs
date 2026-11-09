export const SUN = [0, 0, -18];
export const MOON = [0, 0, 0];
export const SUN_RADIUS = 3.5;
export const MOON_RADIUS = 1.18;
export const INITIAL = { yaw: .42, pitch: -.18 };
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const length = a => Math.hypot(...a);
export const unit = a => a.map(v => v / length(a));
export const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export function camera(yaw, pitch) {
  const eye = [8*Math.sin(yaw)*Math.cos(pitch), 8*Math.sin(pitch), 8*Math.cos(yaw)*Math.cos(pitch)];
  const forward = unit(sub([0,0,-4.5], eye));
  const right = unit(cross(forward, [0,1,0]));
  return { eye, forward, right, up: cross(right, forward) };
}
export function optics(width, height) { return Math.max(.46, width / height * .39); }
export function project(point, cam, width, height) {
  const v = sub(point, cam.eye), z = dot(v, cam.forward);
  const focal = width / (2 * optics(width, height));
  return { x: width/2 + dot(v,cam.right)/z*focal, y: height/2 - dot(v,cam.up)/z*focal, z, focal };
}
// Fraction of the luminous apparent disc covered by the nearer disc.
export function discCoverage(sun, moon, separation) {
  if (separation >= sun + moon) return 0;
  if (separation <= Math.abs(moon - sun)) return Math.min(1, moon*moon/(sun*sun));
  const d = separation, a = sun*sun, b = moon*moon;
  const area = a*Math.acos(clamp((d*d+a-b)/(2*d*sun),-1,1)) + b*Math.acos(clamp((d*d+b-a)/(2*d*moon),-1,1)) - .5*Math.sqrt(Math.max(0,(-d+sun+moon)*(d+sun-moon)*(d-sun+moon)*(d+sun+moon)));
  return clamp(area / (Math.PI*a), 0, 1);
}
export function eclipse(cam) {
  const s=sub(SUN,cam.eye), m=sub(MOON,cam.eye);
  const separation = Math.acos(clamp(dot(unit(s),unit(m)), -1, 1));
  return discCoverage(Math.asin(SUN_RADIUS/length(s)), Math.asin(MOON_RADIUS/length(m)), separation);
}
