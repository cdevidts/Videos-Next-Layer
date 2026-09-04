import React from 'react';
import {Composition, staticFile} from 'remotion';
import {getVideoMetadata} from '@remotion/media-utils';
import {VerticalClip} from './VerticalClip';
import {VerticalReel} from './VerticalReel';
import {SampleSource} from './SampleSource';
import type {VerticalClipProps} from './lib/types';
import {
  DEFAULT_TRANSITION_FRAMES,
  reelDurationInFrames,
  type VerticalReelProps,
} from './lib/reel';
import './style.css';

export const FPS = 30;
export const DEFAULT_DURATION_IN_FRAMES = 900; // 30 segundos

const clipDefaults: VerticalClipProps = {
  // Ruta relativa a public/. La escribe scripts/fetchDriveClip.ts.
  src: 'input/sample.mp4',
  hook: 'Impresión 3D, a tu medida',
  subtitles: [],
  videoVolume: 1,
  audioVolume: 0.6,
  startFromSeconds: 0,
  accentColor: '#22D3EE',
};

/** Props de ejemplo: scripts/buildReel.ts escribe los reales en out/*.props.json. */
const reelDefaults: VerticalReelProps = {
  shots: [
    {src: 'input/sample.mp4', startFromSeconds: 0, durationInSeconds: 2, caption: 'Corte 1'},
    {src: 'input/sample.mp4', startFromSeconds: 2, durationInSeconds: 2, caption: 'Corte 2'},
  ],
  hook: 'Un gancho *corto*',
  cta: 'Next Layer',
  ctaSub: 'Impresión 3D',
  accentColor: '#FF8A3D',
  sfx: {
    whoosh: 'sfx/whoosh.wav',
    tick: 'sfx/tick.wav',
    riser: 'sfx/riser.wav',
    impact: 'sfx/impact.wav',
  },
  transitionInFrames: DEFAULT_TRANSITION_FRAMES,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VerticalReel"
        component={VerticalReel}
        durationInFrames={reelDurationInFrames(reelDefaults.shots, FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={reelDefaults}
        calculateMetadata={({props}) => ({
          durationInFrames: reelDurationInFrames(
            props.shots,
            FPS,
            props.transitionInFrames ?? DEFAULT_TRANSITION_FRAMES,
          ),
        })}
      />
      <Composition
        id="VerticalClip"
        component={VerticalClip}
        durationInFrames={DEFAULT_DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={clipDefaults}
        calculateMetadata={async ({props}) => {
          const duration = await resolveDurationInSeconds(props);
          if (duration === null) {
            return {durationInFrames: DEFAULT_DURATION_IN_FRAMES};
          }
          const usable = Math.max(duration - (props.startFromSeconds ?? 0), 1);
          return {durationInFrames: Math.max(Math.round(usable * FPS), 1)};
        }}
      />
      <Composition
        id="SampleSource"
        component={SampleSource}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};

/**
 * Prioridad: la duración calculada con ffprobe por scripts/processClip.ts; si no
 * llega por props, se intenta leer del archivo con @remotion/media-utils.
 */
const resolveDurationInSeconds = async (
  props: VerticalClipProps,
): Promise<number | null> => {
  if (props.durationInSeconds && props.durationInSeconds > 0) {
    return props.durationInSeconds;
  }
  try {
    const src = /^(https?:)?\/\//.test(props.src)
      ? props.src
      : staticFile(props.src.replace(/^\/?public\//, '').replace(/^\//, ''));
    const metadata = await getVideoMetadata(src);
    return metadata.durationInSeconds;
  } catch {
    return null;
  }
};
