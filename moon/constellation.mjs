import { MOON, MOON_RADIUS, SUN, SUN_RADIUS, sub, dot, length, unit } from './geometry.mjs?v=20261109-hidden-star1';

export const MISSING_STAR = 3;
export const MAP_POINTS = [
  [-5, 2.2, -16], [-3.2, 2.7, -9], [-4, -1.8, -10],
  [0, 1.6, -8], [3.2, -2, -10], [3.8, 1.9, -14], [5.4, .2, -19]
];
const doorPixels = [[22,276],[22,108],[50,53],[120,18],[190,53],[218,108],[218,276]];
export const GATE_POINTS = doorPixels.map(([x,y])=>[(x/240-.5)*5.24,3.15-y/300*6.55,-7]);

export function blockedBySphere(point, eye, center, radius) {
  const vector = sub(point, eye), distance = length(vector), direction = unit(vector);
  const oc = sub(eye, center), b = dot(oc, direction);
  const discriminant = b*b-dot(oc,oc)+radius*radius;
  if (discriminant < 0) return false;
  const hit = -b-Math.sqrt(discriminant);
  return hit > 0 && hit < distance;
}
export function isStarVisible(point, cam) {
  return dot(sub(point,cam.eye),cam.forward)>0 &&
    !blockedBySphere(point,cam.eye,MOON,MOON_RADIUS) &&
    !blockedBySphere(point,cam.eye,SUN,SUN_RADIUS);
}
export function blendPoint(a,b,t) { return a.map((v,i)=>v+(b[i]-v)*t); }
export function canCollectStar(phase,index,cam) {
  return phase==='searching' && index===MISSING_STAR && isStarVisible(MAP_POINTS[index],cam);
}
