import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Clip sintético para probar el pipeline sin depender de Drive.
 *   npm run sample   ->   public/input/sample.mp4
 * Es horizontal a propósito: sirve para verificar el recorte 9:16 de VerticalClip.
 */
export const SampleSource: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const hue = interpolate(frame, [0, durationInFrames], [180, 320]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `hsl(${hue}, 70%, 22%)`,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 90,
        fontWeight: 700,
      }}
    >
      {Math.round(frame / 30)}s
    </AbsoluteFill>
  );
};
