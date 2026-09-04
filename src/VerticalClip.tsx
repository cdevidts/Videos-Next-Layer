import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {SubtitleCue, VerticalClipProps} from './lib/types';

const resolveSrc = (src: string) => {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) {
    return src;
  }
  return staticFile(src.replace(/^\/?public\//, '').replace(/^\//, ''));
};

const activeCue = (
  subtitles: SubtitleCue[] | undefined,
  seconds: number,
): SubtitleCue | null => {
  if (!subtitles?.length) {
    return null;
  }
  return (
    subtitles.find(
      (cue) => seconds >= cue.fromSeconds && seconds < cue.toSeconds,
    ) ?? null
  );
};

export const VerticalClip: React.FC<VerticalClipProps> = ({
  src,
  hook,
  subtitles,
  audioSrc,
  videoVolume = 1,
  audioVolume = 0.6,
  startFromSeconds = 0,
  accentColor = '#22D3EE',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps, width, height} = useVideoConfig();
  const seconds = frame / fps;

  // Barra de progreso: avanza linealmente con el frame actual.
  const progress = interpolate(frame, [0, Math.max(durationInFrames - 1, 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Entrada del gancho superior.
  const hookIn = spring({frame, fps, config: {damping: 200}, durationInFrames: 20});
  const hookOpacity = interpolate(hookIn, [0, 1], [0, 1]);
  const hookY = interpolate(hookIn, [0, 1], [-60, 0]);

  // Fundido de salida en el último medio segundo.
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(fps / 2), durationInFrames - 1],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease},
  );

  const cue = activeCue(subtitles, seconds);

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: fadeOut}}>
      {/* Video centrado y recortado a 9:16 (cover). */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <OffthreadVideo
          src={resolveSrc(src)}
          volume={videoVolume}
          startFrom={Math.round(startFromSeconds * fps)}
          style={{
            width,
            height,
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </AbsoluteFill>

      {audioSrc ? <Audio src={resolveSrc(audioSrc)} volume={audioVolume} /> : null}

      {/* Degradados para legibilidad del texto. */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Gancho / título superior. */}
      {hook ? (
        <div
          className="absolute inset-x-0 top-0 flex justify-center px-16 pt-32"
          style={{opacity: hookOpacity, transform: `translateY(${hookY}px)`}}
        >
          <h1
            className="text-center font-black uppercase leading-tight tracking-tight text-white"
            style={{
              fontFamily:
                'Inter, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
              fontSize: 82,
              textShadow: '0 8px 32px rgba(0,0,0,0.65)',
              borderBottom: `10px solid ${accentColor}`,
              paddingBottom: 18,
            }}
          >
            {hook}
          </h1>
        </div>
      ) : null}

      {/* Subtítulos opcionales. */}
      {cue ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-14 pb-56">
          <p
            className="text-center font-bold leading-snug text-white"
            style={{
              fontFamily:
                'Inter, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
              fontSize: 58,
              textShadow: '0 6px 24px rgba(0,0,0,0.8)',
              backgroundColor: 'rgba(0,0,0,0.42)',
              borderRadius: 24,
              padding: '18px 32px',
            }}
          >
            {cue.text}
          </p>
        </div>
      ) : null}

      {/* Barra de progreso animada en el borde inferior. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{height: 16, backgroundColor: 'rgba(255,255,255,0.18)'}}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 28px ${accentColor}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
