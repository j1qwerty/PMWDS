export type BgPattern =
  | 'none'
  | 'gradient'
  | 'grid'
  | 'dots'
  | 'waves'
  | 'diagonal'
  | 'crosshatch'
  | 'hexagons'
  | 'rings'
  | 'diamonds';

export type BgAnimation = 'none' | 'float' | 'pulse' | 'rotate' | 'drift' | 'breathe';

export type BgGradientType = 'radial' | 'linear' | 'conic';

export interface BgConfig {
  pattern: BgPattern;
  gradient: {
    type: BgGradientType;
    color1: string;
    color2: string;
    color3: string;
    angle: number;
    opacity: number;
  };
  overlay: {
    color: string;
    opacity: number;
    size: number;
    strokeWidth: number;
    angle: number;
  };
  waves: {
    color: string;
    opacity: number;
    amplitude: number;
    frequency: number;
    speed: number;
    count: number;
  };
  blobs: {
    color1: string;
    color2: string;
    opacity: number;
    count: 2 | 3 | 4;
    animation: BgAnimation;
    speed: number;
    size: number;
  };
}

export interface BgPreset {
  id: string;
  name: string;
  icon: string;
  config: BgConfig;
}
