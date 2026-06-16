import React from 'react';
import type { BgConfig, BgPattern } from './types';
import { buildGradientStyle, buildPatternStyle, buildWavesSvg, getAnimStyle, ANIM_KEYFRAMES } from './utils';

interface BgRendererProps {
  config: BgConfig;
  absolute?: boolean;
}

const PATTERN_TYPES: BgPattern[] = ['grid', 'dots', 'diagonal', 'crosshatch', 'hexagons', 'rings', 'diamonds'];

export function BgRenderer({ config, absolute }: BgRendererProps) {
  const pos = absolute ? 'absolute' : 'fixed';
  const { pattern, gradient, overlay, waves, blobs } = config;

  const showGradient = pattern !== 'none';
  const showPattern = PATTERN_TYPES.includes(pattern);
  const showWaves = pattern === 'waves';

  const gradientStyle = showGradient ? buildGradientStyle(gradient) : {};
  const patternStyle = showPattern ? buildPatternStyle(config) : {};

  return (
    <>
      {showGradient && (
        <div className={`${pos} inset-0 pointer-events-none z-0`} style={gradientStyle} />
      )}

      {showPattern && (
        <div
          className={`${pos} inset-0 pointer-events-none z-0`}
          style={{ backgroundImage: patternStyle.backgroundImage, backgroundRepeat: 'repeat' }}
        />
      )}

      {showWaves && (
        <div className={`${pos} inset-0 pointer-events-none z-0 overflow-hidden`} style={{ opacity: waves.opacity }}>
          <div
            className="absolute"
            style={{
              width: '200%',
              bottom: 0,
              left: 0,
              animation: `bg-wave ${20 / waves.speed}s linear infinite`,
            }}
            dangerouslySetInnerHTML={{
              __html: buildWavesSvg(waves.color, 1.5, 1, waves.amplitude, waves.frequency, waves.count),
            }}
          />
        </div>
      )}

      {blobs.opacity > 0 &&
        Array.from({ length: blobs.count }, (_, i) => {
          const positions = [
            { top: '10%', right: '5%' },
            { bottom: '10%', left: '5%' },
            { top: '40%', left: '30%' },
            { bottom: '30%', right: '20%' },
          ];
          const p = positions[i % positions.length];
          const sz = (280 + i * 40) * blobs.size;
          return (
            <div
              key={i}
              className={`${pos} rounded-full pointer-events-none z-0`}
              style={{
                ...p,
                width: sz,
                height: sz,
                filter: 'blur(80px)',
                backgroundColor: i % 2 === 0 ? blobs.color1 : blobs.color2,
                opacity: i === 2 ? blobs.opacity * 0.6 : blobs.opacity,
                ...getAnimStyle(blobs.animation, blobs.speed, i),
              }}
            />
          );
        })}

      <style>{ANIM_KEYFRAMES}</style>
    </>
  );
}
