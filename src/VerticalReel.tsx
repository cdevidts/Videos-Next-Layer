import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {
  DEFAULT_TRANSITION_FRAMES,
  groupWords,
  shotFrames,
  transitionStarts,
  type ReelShot,
  type VerticalReelProps,
} from './lib/reel';

const {fontFamily: antonFamily} = loadAnton();
const {fontFamily: interFamily} = loadInter();

const DISPLAY_FONT = `${antonFamily}, "Arial Black", Impact, system-ui, sans-serif`;
const TEXT_FONT = `${interFamily}, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif`;

const GRAIN =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="220" height="220" filter="url(#n)" opacity="0.55"/></svg>',
  );

export const resolveSrc = (src: string) => {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return staticFile(src.replace(/^\/?public\//, '').replace(/^\//, ''));
};

/** Grano de película: se mueve cada frame para que no se vea estático. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${GRAIN}")`,
        backgroundSize: '220px 220px',
        backgroundPosition: `${(frame * 53) % 220}px ${(frame * 89) % 220}px`,
        opacity: 0.07,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

/** Corrección de color: contraste, split-tone cálido/frío y viñeta. */
const Grade: React.FC<{accentColor: string}> = ({accentColor}) => (
  <>
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 75% at 50% 0%, ${accentColor}26, rgba(0,0,0,0) 62%)`,
        mixBlendMode: 'soft-light',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(110% 70% at 50% 100%, rgba(10,26,54,0.6), rgba(0,0,0,0) 68%)',
        mixBlendMode: 'multiply',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(78% 62% at 50% 44%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.58) 100%)',
      }}
    />
    <Grain />
  </>
);

/** Chip de sección arriba a la izquierda. */
const LabelChip: React.FC<{label: string; accentColor: string}> = ({label, accentColor}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame: frame - 3, fps, config: {damping: 200}, durationInFrames: 14});
  const exit = interpolate(frame, [durationInFrames - 12, durationInFrames - 2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="absolute left-14 top-40 flex items-center"
      style={{
        opacity: enter * exit,
        transform: `translateX(${interpolate(enter, [0, 1], [-90, 0])}px)`,
      }}
    >
      <div style={{width: 10, height: 52, backgroundColor: accentColor, borderRadius: 4}} />
      <span
        style={{
          fontFamily: TEXT_FONT,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.45)',
          padding: '12px 22px',
          marginLeft: 14,
          borderRadius: 10,
          textShadow: '0 4px 18px rgba(0,0,0,0.6)',
        }}
      >
        {label}
      </span>
    </div>
  );
};

const CaptionPill: React.FC<{children: React.ReactNode; opacity: number; y: number}> = ({
  children,
  opacity,
  y,
}) => (
  <div
    className="absolute inset-x-0 bottom-0 flex justify-center px-12 pb-52"
    style={{opacity, transform: `translateY(${y}px)`}}
  >
    <div
      style={{
        backgroundColor: 'rgba(8,10,16,0.62)',
        border: '2px solid rgba(255,255,255,0.10)',
        borderRadius: 26,
        padding: '20px 34px',
        maxWidth: 900,
        backdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </div>
  </div>
);

/** Subtítulos karaoke: la palabra que suena se pinta con el color de acento. */
const KaraokeCaption: React.FC<{shot: ReelShot; accentColor: string}> = ({
  shot,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const groups = React.useMemo(() => groupWords(shot.words ?? []), [shot.words]);

  const activeIndex = groups.findIndex(
    (group) => seconds >= group[0].start - 0.12 && seconds < group[group.length - 1].end + 0.28,
  );
  if (activeIndex === -1) return null;

  const group = groups[activeIndex];
  const enter = interpolate(seconds, [group[0].start - 0.12, group[0].start + 0.05], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CaptionPill opacity={enter} y={interpolate(enter, [0, 1], [26, 0])}>
      <p
        className="text-center"
        style={{
          fontFamily: TEXT_FONT,
          fontSize: 60,
          fontWeight: 900,
          lineHeight: 1.12,
          margin: 0,
          textShadow: '0 6px 22px rgba(0,0,0,0.75)',
        }}
      >
        {group.map((word, index) => {
          const isActive = seconds >= word.start && seconds < word.end + 0.06;
          return (
            <span
              key={`${word.text}-${index}`}
              style={{
                color: isActive ? accentColor : 'white',
                display: 'inline-block',
                transform: `scale(${isActive ? 1.06 : 1})`,
                margin: '0 8px',
              }}
            >
              {word.text.trim()}
            </span>
          );
        })}
      </p>
    </CaptionPill>
  );
};

const StaticCaption: React.FC<{text: string; accentColor: string}> = ({text, accentColor}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame: frame - 4, fps, config: {damping: 200}, durationInFrames: 16});
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CaptionPill opacity={enter * exit} y={interpolate(enter, [0, 1], [40, 0])}>
      <p
        className="text-center"
        style={{
          fontFamily: TEXT_FONT,
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.15,
          margin: 0,
          color: 'white',
          textShadow: '0 6px 22px rgba(0,0,0,0.8)',
          borderLeft: `8px solid ${accentColor}`,
          paddingLeft: 22,
          textAlign: 'left',
        }}
      >
        {text}
      </p>
    </CaptionPill>
  );
};

/** Un corte: video en cover, zoom lento, golpe de entrada, grade y textos. */
const Shot: React.FC<{shot: ReelShot; accentColor: string; voiceVolume: number}> = ({
  shot,
  accentColor,
  voiceVolume,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps, width, height} = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1.05, 1.13], {
    extrapolateRight: 'clamp',
  });
  const punch = interpolate(frame, [0, 7], [1.035, 1], {extrapolateRight: 'clamp'});
  const flash = interpolate(frame, [0, 5], [0.22, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <OffthreadVideo
          src={resolveSrc(shot.src)}
          trimBefore={Math.round(shot.startFromSeconds * fps)}
          muted
          style={{
            width,
            height,
            objectFit: 'cover',
            objectPosition: 'center',
            transform: `scale(${zoom * punch})`,
            filter: 'saturate(1.16) contrast(1.09) brightness(1.02)',
          }}
        />
      </AbsoluteFill>

      {shot.audioSrc ? (
        <Audio
          src={resolveSrc(shot.audioSrc)}
          trimBefore={Math.round((shot.audioStartFromSeconds ?? shot.startFromSeconds) * fps)}
          volume={voiceVolume}
        />
      ) : null}

      <Grade accentColor={accentColor} />
      <AbsoluteFill style={{backgroundColor: `rgba(255,255,255,${flash})`}} />

      {shot.label ? <LabelChip label={shot.label} accentColor={accentColor} /> : null}
      {shot.words?.length ? (
        <KaraokeCaption shot={shot} accentColor={accentColor} />
      ) : shot.caption ? (
        <StaticCaption text={shot.caption} accentColor={accentColor} />
      ) : null}
    </AbsoluteFill>
  );
};

/** Gancho: entra palabra por palabra; *lo marcado* va en caja de acento. */
const Hook: React.FC<{text: string; accentColor: string}> = ({text, accentColor}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean);
  const words = parts.flatMap((part) => {
    const highlighted = part.startsWith('*') && part.endsWith('*');
    const clean = highlighted ? part.slice(1, -1) : part;
    return clean
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({word, highlighted}));
  });

  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scrim = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0.6, 0.42, 0.42, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${scrim})`}} />
      <div className="absolute inset-x-0 top-0 flex flex-wrap justify-center gap-x-6 gap-y-3 px-12 pt-56">
        {words.map(({word, highlighted}, index) => {
          const enter = spring({
            frame: frame - index * 3,
            fps,
            config: {damping: 200, mass: 0.6},
            durationInFrames: 18,
          });
          return (
            <span
              key={`${word}-${index}`}
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: 118,
                lineHeight: 1.02,
                textTransform: 'uppercase',
                color: highlighted ? '#0B0D12' : 'white',
                backgroundColor: highlighted ? accentColor : 'transparent',
                padding: highlighted ? '0 16px' : 0,
                borderRadius: highlighted ? 10 : 0,
                opacity: enter,
                display: 'inline-block',
                transform: `translateY(${interpolate(enter, [0, 1], [70, 0])}px) rotate(${interpolate(
                  enter,
                  [0, 1],
                  [index % 2 === 0 ? -6 : 6, 0],
                )}deg)`,
                textShadow: highlighted ? 'none' : '0 10px 34px rgba(0,0,0,0.7)',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Barra de progreso segmentada: un tramo por corte. */
const Progress: React.FC<{shots: ReelShot[]; accentColor: string; transition: number}> = ({
  shots,
  accentColor,
  transition,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lengths = shots.map((shot) => shotFrames(shot, fps) - transition);
  const total = lengths.reduce((a, b) => a + b, 0);

  let consumed = 0;
  return (
    <div className="absolute inset-x-0 bottom-0 flex gap-2 px-6 pb-6">
      {lengths.map((length, index) => {
        const start = consumed;
        consumed += length;
        const value = interpolate(frame, [start, start + length], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={index}
            style={{
              flex: length / total,
              height: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.22)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${value * 100}%`,
                height: '100%',
                backgroundColor: accentColor,
                boxShadow: `0 0 22px ${accentColor}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const VerticalReel: React.FC<VerticalReelProps> = ({
  shots,
  hook,
  cta,
  ctaSub,
  accentColor = '#FF8A3D',
  musicSrc,
  musicVolume = 0.35,
  voiceVolume = 1,
  sfx,
  sfxVolume = 0.32,
  transitionInFrames = DEFAULT_TRANSITION_FRAMES,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  const hookFrames = Math.round(fps * 2.4);
  const ctaFrames = Math.round(fps * 2.2);
  const ctaStart = durationInFrames - ctaFrames;
  const ctaIn = spring({
    frame: frame - ctaStart,
    fps,
    config: {damping: 180, mass: 0.7},
    durationInFrames: 20,
  });

  const cuts = transitionStarts(shots, fps, transitionInFrames);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <TransitionSeries>
        {shots.map((shot, index) => (
          <React.Fragment key={`${shot.src}-${index}`}>
            <TransitionSeries.Sequence durationInFrames={shotFrames(shot, fps)}>
              <Shot shot={shot} accentColor={accentColor} voiceVolume={voiceVolume} />
            </TransitionSeries.Sequence>
            {index < shots.length - 1 ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({durationInFrames: transitionInFrames})}
              />
            ) : null}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {musicSrc ? <Audio src={resolveSrc(musicSrc)} volume={musicVolume} /> : null}

      {/* Diseño sonoro: riser de entrada, whoosh en cada corte, golpe en el cierre. */}
      {sfx?.riser ? (
        <Sequence durationInFrames={Math.round(fps)} name="SFX riser">
          <Audio src={resolveSrc(sfx.riser)} volume={sfxVolume} />
        </Sequence>
      ) : null}
      {sfx?.whoosh
        ? cuts.map((start, index) => (
            <Sequence
              key={`whoosh-${index}`}
              from={Math.max(start - 4, 0)}
              durationInFrames={Math.round(fps * 0.6)}
              name={`SFX corte ${index + 1}`}
            >
              <Audio src={resolveSrc(sfx.whoosh as string)} volume={sfxVolume * 0.85} />
            </Sequence>
          ))
        : null}
      {sfx?.impact && cta ? (
        <Sequence from={ctaStart} durationInFrames={Math.round(fps)} name="SFX cierre">
          <Audio src={resolveSrc(sfx.impact)} volume={sfxVolume * 1.4} />
        </Sequence>
      ) : null}

      <Sequence durationInFrames={hookFrames} name="Gancho">
        <Hook text={hook} accentColor={accentColor} />
      </Sequence>

      {cta ? (
        <Sequence from={ctaStart} name="Cierre">
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `rgba(6,8,14,${interpolate(ctaIn, [0, 1], [0, 0.82])})`,
            }}
          >
            <div
              style={{
                opacity: ctaIn,
                transform: `scale(${interpolate(ctaIn, [0, 1], [0.82, 1])})`,
                textAlign: 'center',
                padding: '0 70px',
              }}
            >
              <div
                style={{
                  width: interpolate(ctaIn, [0, 1], [0, 220]),
                  height: 12,
                  backgroundColor: accentColor,
                  margin: '0 auto 34px',
                  borderRadius: 999,
                }}
              />
              <p
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 120,
                  lineHeight: 1,
                  margin: 0,
                  color: 'white',
                  textTransform: 'uppercase',
                  textShadow: `0 0 70px ${accentColor}88`,
                }}
              >
                {cta}
              </p>
              {ctaSub ? (
                <p
                  style={{
                    fontFamily: TEXT_FONT,
                    fontSize: 44,
                    fontWeight: 700,
                    marginTop: 26,
                    color: 'rgba(255,255,255,0.78)',
                  }}
                >
                  {ctaSub}
                </p>
              ) : null}
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}

      <Progress shots={shots} accentColor={accentColor} transition={transitionInFrames} />
    </AbsoluteFill>
  );
};
