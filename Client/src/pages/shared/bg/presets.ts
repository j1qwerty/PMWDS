import type { BgConfig, BgPreset } from './types';

const STORAGE_KEY = 'bg-custom-presets';

export const DEFAULT_CONFIG: BgConfig = {
  pattern: 'gradient',
  gradient: { type: 'radial', color1: '#4F46E5', color2: '#7C3AED', color3: '#A855F7', angle: 135, opacity: 0.15 },
  overlay: { color: '#4F46E5', opacity: 0.3, size: 40, strokeWidth: 0.5, angle: 45 },
  waves: { color: '#4F46E5', opacity: 0.2, amplitude: 15, frequency: 2, speed: 1, count: 3 },
  blobs: { color1: '#4F46E5', color2: '#7C3AED', opacity: 0.12, count: 3, animation: 'float', speed: 1, size: 1 },
};

function c(base: BgConfig, patch: Partial<BgConfig>): BgConfig {
  return {
    pattern: patch.pattern ?? base.pattern,
    gradient: { ...base.gradient, ...(patch.gradient || {}) },
    overlay: { ...base.overlay, ...(patch.overlay || {}) },
    waves: { ...base.waves, ...(patch.waves || {}) },
    blobs: { ...base.blobs, ...(patch.blobs || {}) },
  };
}

export const BUILTIN_PRESETS: BgPreset[] = [
  {
    id: 'default-gradient', name: 'Default Gradient', icon: '🎨',
    config: DEFAULT_CONFIG,
  },
  {
    id: 'ocean-grid', name: 'Ocean Grid', icon: '🌊',
    config: c(DEFAULT_CONFIG, {
      pattern: 'grid',
      gradient: { type: 'radial', color1: '#0EA5E9', color2: '#06B6D4', color3: '#22D3EE', angle: 135, opacity: 0.1 },
      overlay: { color: '#0EA5E9', opacity: 0.35, size: 48, strokeWidth: 0.5, angle: 0 },
      blobs: { color1: '#0EA5E9', color2: '#06B6D4', opacity: 0.08, count: 3, animation: 'float', speed: 0.8, size: 1.2 },
    }),
  },
  {
    id: 'cosmic-dots', name: 'Cosmic Dots', icon: '✨',
    config: c(DEFAULT_CONFIG, {
      pattern: 'dots',
      gradient: { type: 'radial', color1: '#6D28D9', color2: '#A855F7', color3: '#C084FC', angle: 135, opacity: 0.2 },
      overlay: { color: '#C084FC', opacity: 0.4, size: 32, strokeWidth: 1, angle: 0 },
      blobs: { color1: '#6D28D9', color2: '#A855F7', opacity: 0.15, count: 4, animation: 'pulse', speed: 0.6, size: 1.1 },
    }),
  },
  {
    id: 'minimal-dark', name: 'Minimal Dark', icon: '🌙',
    config: c(DEFAULT_CONFIG, {
      pattern: 'none',
      gradient: { type: 'linear', color1: '#1E293B', color2: '#0F172A', color3: '#334155', angle: 180, opacity: 1 },
      overlay: { color: '#475569', opacity: 0.1, size: 40, strokeWidth: 0.5, angle: 45 },
      blobs: { color1: '#334155', color2: '#475569', opacity: 0.3, count: 2, animation: 'breathe', speed: 0.5, size: 1.5 },
    }),
  },
  {
    id: 'sunset-waves', name: 'Sunset Waves', icon: '🌅',
    config: c(DEFAULT_CONFIG, {
      pattern: 'waves',
      gradient: { type: 'linear', color1: '#F97316', color2: '#EC4899', color3: '#FBBF24', angle: 135, opacity: 0.18 },
      overlay: { color: '#F97316', opacity: 0.3, size: 40, strokeWidth: 0.5, angle: 0 },
      waves: { color: '#EC4899', opacity: 0.25, amplitude: 18, frequency: 2.5, speed: 1.2, count: 4 },
      blobs: { color1: '#F97316', color2: '#EC4899', opacity: 0.1, count: 3, animation: 'drift', speed: 0.7, size: 1.3 },
    }),
  },
  {
    id: 'neon-hex', name: 'Neon Hex', icon: '💎',
    config: c(DEFAULT_CONFIG, {
      pattern: 'hexagons',
      gradient: { type: 'radial', color1: '#10B981', color2: '#06B6D4', color3: '#3B82F6', angle: 135, opacity: 0.08 },
      overlay: { color: '#10B981', opacity: 0.5, size: 56, strokeWidth: 0.7, angle: 0 },
      blobs: { color1: '#10B981', color2: '#06B6D4', opacity: 0.1, count: 3, animation: 'rotate', speed: 0.4, size: 1.4 },
    }),
  },
  {
    id: 'forest-cross', name: 'Forest Cross', icon: '🌲',
    config: c(DEFAULT_CONFIG, {
      pattern: 'crosshatch',
      gradient: { type: 'radial', color1: '#166534', color2: '#15803D', color3: '#22C55E', angle: 135, opacity: 0.1 },
      overlay: { color: '#15803D', opacity: 0.3, size: 44, strokeWidth: 0.4, angle: 45 },
      blobs: { color1: '#166534', color2: '#22C55E', opacity: 0.1, count: 2, animation: 'float', speed: 0.6, size: 1.6 },
    }),
  },
  {
    id: 'lavender-diag', name: 'Lavender Lines', icon: '💜',
    config: c(DEFAULT_CONFIG, {
      pattern: 'diagonal',
      gradient: { type: 'linear', color1: '#7C3AED', color2: '#A78BFA', color3: '#C4B5FD', angle: 135, opacity: 0.12 },
      overlay: { color: '#7C3AED', opacity: 0.35, size: 36, strokeWidth: 0.5, angle: 135 },
      blobs: { color1: '#7C3AED', color2: '#A78BFA', opacity: 0.1, count: 3, animation: 'float', speed: 0.8, size: 1 },
    }),
  },
  {
    id: 'deep-space', name: 'Deep Space', icon: '🚀',
    config: c(DEFAULT_CONFIG, {
      pattern: 'dots',
      gradient: { type: 'radial', color1: '#1E1B4B', color2: '#312E81', color3: '#4338CA', angle: 135, opacity: 0.25 },
      overlay: { color: '#818CF8', opacity: 0.25, size: 60, strokeWidth: 0.8, angle: 0 },
      waves: { color: '#6366F1', opacity: 0.15, amplitude: 12, frequency: 3, speed: 0.8, count: 2 },
      blobs: { color1: '#4338CA', color2: '#6366F1', opacity: 0.2, count: 4, animation: 'drift', speed: 0.5, size: 1.8 },
    }),
  },
  {
    id: 'clean-rings', name: 'Clean Rings', icon: '⭕',
    config: c(DEFAULT_CONFIG, {
      pattern: 'rings',
      gradient: { type: 'linear', color1: '#F8FAFC', color2: '#E2E8F0', color3: '#CBD5E1', angle: 180, opacity: 1 },
      overlay: { color: '#94A3B8', opacity: 0.25, size: 48, strokeWidth: 0.5, angle: 0 },
      blobs: { color1: '#CBD5E1', color2: '#94A3B8', opacity: 0.15, count: 2, animation: 'pulse', speed: 0.6, size: 1.2 },
    }),
  },
  {
    id: 'fire-diamonds', name: 'Fire Diamonds', icon: '🔥',
    config: c(DEFAULT_CONFIG, {
      pattern: 'diamonds',
      gradient: { type: 'conic', color1: '#DC2626', color2: '#F97316', color3: '#FBBF24', angle: 45, opacity: 0.12 },
      overlay: { color: '#DC2626', opacity: 0.35, size: 40, strokeWidth: 0.5, angle: 0 },
      blobs: { color1: '#DC2626', color2: '#F97316', opacity: 0.12, count: 3, animation: 'breathe', speed: 1.2, size: 1 },
    }),
  },
];

export function loadSavedPresets(): BgPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(name: string, config: BgConfig): BgPreset {
  const presets = loadSavedPresets();
  const id = `custom-${Date.now()}`;
  const preset: BgPreset = { id, name, icon: '⭐', config: { ...config } };
  presets.push(preset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  return preset;
}

export function deleteCustomPreset(id: string): void {
  const presets = loadSavedPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
