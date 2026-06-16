import type { BgConfig } from './types';

export function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function uri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function buildGridPattern(color: string, size: number, sw: number, opacity: number): string {
  const c = hexToRgba(color, opacity);
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<line x1='0.25' y1='0' x2='0.25' y2='${size}' stroke='${c}' stroke-width='${sw}'/>` +
      `<line x1='0' y1='0.25' x2='${size}' y2='0.25' stroke='${c}' stroke-width='${sw}'/>` +
      `</svg>`
  );
}

export function buildDotsPattern(color: string, size: number, radius: number, opacity: number): string {
  const c = hexToRgba(color, opacity);
  const h = size / 2;
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<circle cx='${h}' cy='${h}' r='${radius}' fill='${c}'/>` +
      `</svg>`
  );
}

export function buildDiagonalPattern(color: string, size: number, sw: number, opacity: number, angle: number): string {
  const c = hexToRgba(color, opacity);
  const rad = (angle * Math.PI) / 180;
  const len = size * 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const h = size / 2;
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' style='overflow:visible'>` +
      `<line x1='${h - cos * len}' y1='${h - sin * len}' x2='${h + cos * len}' y2='${h + sin * len}' stroke='${c}' stroke-width='${sw}'/>` +
      `</svg>`
  );
}

export function buildCrosshatchPattern(color: string, size: number, sw: number, opacity: number, angle: number): string {
  const c = hexToRgba(color, opacity);
  const rad = (angle * Math.PI) / 180;
  const len = size * 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const h = size / 2;
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' style='overflow:visible'>` +
      `<line x1='${h - cos * len}' y1='${h - sin * len}' x2='${h + cos * len}' y2='${h + sin * len}' stroke='${c}' stroke-width='${sw}'/>` +
      `<line x1='${h - cos * len}' y1='${h + sin * len}' x2='${h + cos * len}' y2='${h - sin * len}' stroke='${c}' stroke-width='${sw}'/>` +
      `</svg>`
  );
}

export function buildHexPattern(color: string, size: number, sw: number, opacity: number): string {
  const c = hexToRgba(color, opacity);
  const r = size / 2;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${r + r * Math.cos(a)},${r + r * Math.sin(a)}`;
  }).join(' ');
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<polygon points='${pts}' fill='none' stroke='${c}' stroke-width='${sw}' stroke-linejoin='round'/>` +
      `</svg>`
  );
}

export function buildRingsPattern(color: string, size: number, sw: number, opacity: number, radius: number): string {
  const c = hexToRgba(color, opacity);
  const h = size / 2;
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<circle cx='${h}' cy='${h}' r='${radius}' fill='none' stroke='${c}' stroke-width='${sw}'/>` +
      `</svg>`
  );
}

export function buildDiamondsPattern(color: string, size: number, sw: number, opacity: number): string {
  const c = hexToRgba(color, opacity);
  const h = size / 2;
  const q = size / 4;
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<polygon points='${h},${h - q} ${h + q},${h} ${h},${h + q} ${h - q},${h}' fill='none' stroke='${c}' stroke-width='${sw}' stroke-linejoin='round'/>` +
      `</svg>`
  );
}

export function buildWavesSvg(color: string, sw: number, opacity: number, amplitude: number, frequency: number, count: number): string {
  const c = hexToRgba(color, opacity);
  const w = 600;
  const h = amplitude * 2 * count + sw * 2;
  const paths = Array.from({ length: count }, (_, i) => {
    const baseY = amplitude + sw + i * amplitude * 2;
    let d = `M0 ${baseY}`;
    for (let x = 0; x <= w; x += 1) {
      const y = baseY + amplitude * Math.sin((x / w) * Math.PI * 2 * frequency + i * 0.8);
      d += ` L${x} ${y.toFixed(2)}`;
    }
    return `<path d='${d}' fill='none' stroke='${c}' stroke-width='${sw}' stroke-linecap='round' opacity='${0.4 + (i * 0.2)}'/>`;
  }).join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${paths}</svg>`;
}

export function buildGradientStyle(cfg: BgConfig['gradient']): React.CSSProperties {
  const { type, color1, color2, color3, angle, opacity } = cfg;
  const c1 = hexToRgba(color1, opacity);
  const c2 = hexToRgba(color2, opacity);
  const c3 = hexToRgba(color3, opacity * 0.6);
  if (type === 'conic') {
    return { background: `conic-gradient(from ${angle}deg, ${c1}, ${c2}, ${c3}, ${c1})` };
  }
  if (type === 'linear') {
    return { background: `linear-gradient(${angle}deg, ${c1}, ${c2})` };
  }
  return {
    background: [
      `radial-gradient(ellipse at 0% 0%, ${c1} 0%, transparent 60%)`,
      `radial-gradient(ellipse at 100% 100%, ${c2} 0%, transparent 60%)`,
      `radial-gradient(ellipse at 50% 0%, ${c3} 0%, transparent 50%)`,
    ].join(','),
  };
}

export function buildPatternStyle(cfg: BgConfig): React.CSSProperties {
  const { pattern, overlay } = cfg;
  const { color, opacity, size, strokeWidth, angle } = overlay;
  if (pattern === 'grid') return { backgroundImage: buildGridPattern(color, size, strokeWidth, opacity), backgroundRepeat: 'repeat' };
  if (pattern === 'dots') return { backgroundImage: buildDotsPattern(color, size, strokeWidth * 3, opacity), backgroundRepeat: 'repeat' };
  if (pattern === 'diagonal') return { backgroundImage: buildDiagonalPattern(color, size, strokeWidth, opacity, angle), backgroundRepeat: 'repeat' };
  if (pattern === 'crosshatch') return { backgroundImage: buildCrosshatchPattern(color, size, strokeWidth, opacity, angle), backgroundRepeat: 'repeat' };
  if (pattern === 'hexagons') return { backgroundImage: buildHexPattern(color, size, strokeWidth, opacity), backgroundRepeat: 'repeat' };
  if (pattern === 'rings') return { backgroundImage: buildRingsPattern(color, size, strokeWidth, opacity, size / 3), backgroundRepeat: 'repeat' };
  if (pattern === 'diamonds') return { backgroundImage: buildDiamondsPattern(color, size, strokeWidth, opacity), backgroundRepeat: 'repeat' };
  return {};
}

const ANIM_KEYFRAMES = `
@keyframes bg-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
@keyframes bg-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.7} }
@keyframes bg-rotate { 0%{transform:rotate(0deg) scale(1)} 100%{transform:rotate(360deg) scale(1)} }
@keyframes bg-drift { 0%,100%{transform:translate(0,0)} 25%{transform:translate(25px,-20px)} 50%{transform:translate(-15px,15px)} 75%{transform:translate(20px,25px)} }
@keyframes bg-breathe { 0%,100%{transform:scale(1);filter:blur(80px)} 50%{transform:scale(1.15);filter:blur(90px)} }
@keyframes bg-wave { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
`;

export function getAnimStyle(anim: string, speed: number, seed: number): React.CSSProperties {
  if (anim === 'none') return {};
  const dur = (4 + seed * 2) / speed;
  const delay = seed * 0.7;
  const map: Record<string, string> = {
    float: `bg-float ${dur}s ease-in-out ${delay}s infinite`,
    pulse: `bg-pulse ${dur}s ease-in-out ${delay}s infinite`,
    rotate: `bg-rotate ${dur * 3}s linear ${delay}s infinite`,
    drift: `bg-drift ${dur * 2}s ease-in-out ${delay}s infinite`,
    breathe: `bg-breathe ${dur * 2.5}s ease-in-out ${delay}s infinite`,
  };
  return { animation: map[anim] || 'none' };
}

export { ANIM_KEYFRAMES };
