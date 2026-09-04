import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {DISPLAY_FONT, TEXT_FONT} from './lib/fonts';
import {
  DEFAULT_TRANSITION_FRAMES,
  groupWords,
  shotFrames,
  transitionStarts,
  type ReelShot,
  type VerticalReelProps,
} from './lib/reel';

const GRAIN =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="220" height="220" filter="url(#n)" opacity="0.55"/></svg>',
  );

/**
 * Contorno negro por capas de sombra. Es lo que hace que el texto se lea sobre
 * cualquier fondo sin necesidad de una caja detrás — las cajas son justamente
 * lo que hacía que esto pareciera una diapositiva.
 */
const outline = (size = 4, glow = 26) =>
  [
    `${size}px ${size}px 0 #07080C`,
    `-${size}px -${size}px 0 #07080C`,
    `${size}px -${size}px 0 #07080C`,
    `-${size}px ${size}px 0 #07080C`,
    `0 ${size}px 0 #07080C`,
    `0 -${size}px 0 #07080C`,
    `${size}px 0 0 #07080C`,
    `-${size}px 0 0 #07080C`,
    `0 ${Math.round(size * 1.5)}px ${glow}px rgba(0,0,0,0.85)`,
  ].join(', ');

export const resolveSrc = (src: string) => {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return staticFile(src.replace(/^\/?public\//, '').replace(/^\//, ''));
};

/** Rebote con sobrepaso: entra pasado de largo y vuelve. Es la diferencia entre
 * "el texto aparece" (diapositiva) y "el texto llega" (reel). */
const pop = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: frame - delay,
    fps,
    config: {damping: 11, stiffness: 160, mass: 0.55},
    durationInFrames: 22,
  });

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${GRAIN}")`,
        backgroundSize: '220px 220px',
        backgroundPosition: `${(frame * 53) % 220}px ${(frame * 89) % 220}px`,
        opacity: 0.05,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

/** Grade suave: contraste y calidez sin quemar la imagen ("apacible a la vista"). */
const Grade: React.FC<{accentColor: string}> = ({accentColor}) => (
  <>
    <AbsoluteFill
      style={{
        background: `radial-gradient(125% 80% at 50% 12%, ${accentColor}1F, rgba(0,0,0,0) 58%)`,
        mixBlendMode: 'soft-light',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(85% 65% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.46) 100%)',
      }}
    />
    <Grain />
  </>
);

/**
 * Subtítulo karaoke: cada palabra entra con rebote y la que suena se marca con
 * un resaltador que barre de izquierda a derecha.
 */
const KaraokeCaption: React.FC<{shot: ReelShot; accentColor: string}> = ({
  shot,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const groups = React.useMemo(() => groupWords(shot.words ?? []), [shot.words]);

  const activeIndex = groups.findIndex(
    (group) => seconds >= group[0].start - 0.14 && seconds < group[group.length - 1].end + 0.3,
  );
  if (activeIndex === -1) return null;

  const group = groups[activeIndex];
  const groupStartFrame = Math.round((group[0].start - 0.14) * fps);

  return (
    <div
      className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-12"
      style={{bottom: 300}}
    >
      {group.map((word, index) => {
        const enter = pop(frame, fps, groupStartFrame + index * 2);
        const isActive = seconds >= word.start - 0.04 && seconds < word.end + 0.08;
        // El resaltador barre mientras la palabra suena.
        const sweep = isActive
          ? interpolate(seconds, [word.start - 0.04, word.start + 0.12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          : 0;

        return (
          <span
            key={`${word.text}-${index}`}
            style={{
              position: 'relative',
              display: 'inline-block',
              opacity: interpolate(enter, [0, 0.35], [0, 1], {extrapolateRight: 'clamp'}),
              transform: `scale(${interpolate(enter, [0, 1], [0.55, 1])}) translateY(${interpolate(
                enter,
                [0, 1],
                [26, 0],
              )}px) rotate(${interpolate(enter, [0, 1], [random(word.text) > 0.5 ? 5 : -5, 0])}deg)`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: '2px -12px 6px -12px',
                backgroundColor: accentColor,
                borderRadius: 8,
                transform: `scaleX(${sweep})`,
                transformOrigin: 'left center',
              }}
            />
            <span
              style={{
                position: 'relative',
                fontFamily: TEXT_FONT,
                fontSize: 66,
                fontWeight: 900,
                letterSpacing: -1,
                color: sweep > 0.5 ? '#07080C' : 'white',
                textShadow: sweep > 0.5 ? 'none' : outline(4),
              }}
            >
              {word.text.trim()}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Texto de B-roll: entra palabra por palabra, sin caja. */
const StaticCaption: React.FC<{text: string; accentColor: string}> = ({text, accentColor}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-14"
      style={{bottom: 300, opacity: exit}}
    >
      {words.map((word, index) => {
        const enter = pop(frame, fps, 3 + index * 2);
        const highlighted = word.startsWith('*') && word.endsWith('*');
        const clean = highlighted ? word.slice(1, -1) : word;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: 'inline-block',
              fontFamily: TEXT_FONT,
              fontSize: 62,
              fontWeight: 900,
              letterSpacing: -1,
              color: highlighted ? accentColor : 'white',
              textShadow: outline(4),
              opacity: interpolate(enter, [0, 0.35], [0, 1], {extrapolateRight: 'clamp'}),
              transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])}) translateY(${interpolate(
                enter,
                [0, 1],
                [24, 0],
              )}px)`,
            }}
          >
            {clean}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Un corte. El movimiento nunca se detiene: zoom que alterna de dirección por
 * corte, más un golpe de escala al entrar para que el corte se sienta.
 */
const Shot: React.FC<{
  shot: ReelShot;
  index: number;
  accentColor: string;
  voiceVolume: number;
}> = ({shot, index, accentColor, voiceVolume}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps, width, height} = useVideoConfig();

  // Alternar la dirección del zoom evita que se sienta repetitivo.
  const zoomsIn = index % 2 === 0;
  const zoom = zoomsIn
    ? interpolate(frame, [0, durationInFrames], [1.04, 1.15], {extrapolateRight: 'clamp'})
    : interpolate(frame, [0, durationInFrames], [1.15, 1.04], {extrapolateRight: 'clamp'});

  // Golpe de entrada: llega pasado de tamaño y se asienta.
  const punch = interpolate(frame, [0, 9], [1.09, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const flash = interpolate(frame, [0, 4], [0.3, 0], {extrapolateRight: 'clamp'});
  const drift = interpolate(frame, [0, durationInFrames], [0, zoomsIn ? 14 : -14], {
    extrapolateRight: 'clamp',
  });

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
            transform: `scale(${zoom * punch}) translateX(${drift}px)`,
            filter: 'saturate(1.14) contrast(1.07) brightness(1.02)',
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

      {shot.words?.length ? (
        <KaraokeCaption shot={shot} accentColor={accentColor} />
      ) : shot.caption ? (
        <StaticCaption text={shot.caption} accentColor={accentColor} />
      ) : null}
    </AbsoluteFill>
  );
};

/** Gancho: las palabras llegan de golpe, escalonadas, con resaltador en lo marcado. */
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

  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outScale = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-10"
        style={{top: 210, transform: `scale(${outScale})`}}
      >
        {words.map(({word, highlighted}, index) => {
          const enter = pop(frame, fps, index * 4);
          const sweep = interpolate(enter, [0.4, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span
              key={`${word}-${index}`}
              style={{
                position: 'relative',
                display: 'inline-block',
                opacity: interpolate(enter, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
                transform: `scale(${interpolate(enter, [0, 1], [0.4, 1])}) translateY(${interpolate(
                  enter,
                  [0, 1],
                  [56, 0],
                )}px) rotate(${interpolate(enter, [0, 1], [index % 2 === 0 ? -8 : 8, 0])}deg)`,
              }}
            >
              {highlighted ? (
                <span
                  style={{
                    position: 'absolute',
                    inset: '6px -14px 12px -14px',
                    backgroundColor: accentColor,
                    borderRadius: 10,
                    transform: `scaleX(${sweep})`,
                    transformOrigin: 'left center',
                  }}
                />
              ) : null}
              <span
                style={{
                  position: 'relative',
                  fontFamily: DISPLAY_FONT,
                  fontSize: 124,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: highlighted && sweep > 0.5 ? '#07080C' : 'white',
                  textShadow: highlighted && sweep > 0.5 ? 'none' : outline(5, 34),
                }}
              >
                {word}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
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

  const hookFrames = Math.round(fps * 2.2);
  const ctaFrames = Math.round(fps * 2.4);
  const ctaStart = durationInFrames - ctaFrames;
  const ctaIn = spring({
    frame: frame - ctaStart,
    fps,
    config: {damping: 12, stiffness: 150, mass: 0.6},
    durationInFrames: 24,
  });

  const cuts = transitionStarts(shots, fps, transitionInFrames);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <TransitionSeries>
        {shots.map((shot, index) => (
          <React.Fragment key={`${shot.src}-${index}`}>
            <TransitionSeries.Sequence durationInFrames={shotFrames(shot, fps)}>
              <Shot
                shot={shot}
                index={index}
                accentColor={accentColor}
                voiceVolume={voiceVolume}
              />
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

      {sfx?.riser ? (
        <Sequence durationInFrames={Math.round(fps)} name="SFX riser">
          <Audio src={resolveSrc(sfx.riser)} volume={sfxVolume} />
        </Sequence>
      ) : null}
      {sfx?.whooshes?.length
        ? cuts.map((start, index) => {
            // Se rota entre los whooshes y se varía el volumen, para que dos
            // cortes seguidos nunca suenen igual.
            const src = sfx.whooshes![index % sfx.whooshes!.length];
            const variacion = 0.85 + (index % 3) * 0.1;
            return (
              <Sequence
                key={`whoosh-${index}`}
                from={Math.max(start - 5, 0)}
                durationInFrames={Math.round(fps * 1.1)}
                name={`SFX corte ${index + 1}`}
              >
                <Audio src={resolveSrc(src)} volume={sfxVolume * variacion} />
              </Sequence>
            );
          })
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
              backgroundColor: `rgba(6,8,14,${interpolate(ctaIn, [0, 1], [0, 0.62])})`,
            }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '0 70px',
                transform: `scale(${interpolate(ctaIn, [0, 1], [0.7, 1])})`,
                opacity: interpolate(ctaIn, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
              }}
            >
              <p
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 132,
                  lineHeight: 1,
                  margin: 0,
                  color: 'white',
                  textTransform: 'uppercase',
                  textShadow: outline(5, 40),
                }}
              >
                {cta}
              </p>
              {ctaSub ? (
                <p
                  style={{
                    fontFamily: TEXT_FONT,
                    fontSize: 46,
                    fontWeight: 800,
                    letterSpacing: 1,
                    marginTop: 22,
                    color: accentColor,
                    textShadow: outline(3, 20),
                  }}
                >
                  {ctaSub}
                </p>
              ) : null}
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
