export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function constrain(point, width, height, size) {
  const mx = Math.min(size / 2 + 6, width / 2);
  const my = Math.min(size / 2 + 6, height / 2);
  return { x: clamp(point.x, mx, width - mx), y: clamp(point.y, my, height - my) };
}
// The pocket in the crescent sits at (105, 64) in its 160px drawing.
export function goalFor(orb, size) {
  return { x: orb.x - size * 25 / 160, y: orb.y + size * 16 / 160 };
}
export function distanceTo(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function isAligned(point, goal, size) { return distanceTo(point, goal) <= size * .145; }
