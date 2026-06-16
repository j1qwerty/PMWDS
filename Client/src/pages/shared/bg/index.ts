export type { BgConfig, BgPreset, BgPattern, BgAnimation, BgGradientType } from './types';
export { BgRenderer } from './BgRenderer';
export { BgControls } from './BgControls';
export { DEFAULT_CONFIG, BUILTIN_PRESETS, loadSavedPresets, saveCustomPreset, deleteCustomPreset } from './presets';
export { hexToRgba, buildGradientStyle, buildPatternStyle } from './utils';
