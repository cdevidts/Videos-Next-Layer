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
import {EfectoEn, ganancia, Overlay} from './Overlays';
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

/**
 * Fundido corto en los dos extremos de un corte. Devuelve 0->1 en los primeros
 * `n` frames y 1->0 en los últimos `n`. Es lo que evita que dos cortes suenen
 * encimados durante el cross-fade, y de paso mata los clics del empalme.
 */
const bordes = (frame: number, total: number, n: number) => {
  if (n <= 0) return 1;
  const entrada = interpolate(frame, [0, n], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const salida = interpolate(frame, [total - n, total], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return Math.min(entrada, salida);
};

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

/**
 * Grade suave: contraste y calidez sin quemar la imagen ("apacible a la vista").
 *
 * El tinte de arriba va con el azul principal de la marca, no con el acento. Es
 * lo que hace que el azul esté presente en todo el video y no solo en la placa
 * final. Va en `soft-light` y a 1F (12 %) justo porque el material es madera y
 * un mueble rojo: más azul que eso los vuelve grises.
 */
const Grade: React.FC<{primaryColor: string}> = ({primaryColor}) => (
  <>
    <AbsoluteFill
      style={{
        background: `radial-gradient(125% 80% at 50% 12%, ${primaryColor}1F, rgba(0,0,0,0) 58%)`,
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
      className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-7 gap-y-1 px-12"
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
                // El resaltador sobresale poco a los lados: con Anton/Inter de
                // verdad las palabras quedan más juntas que con la fuente de
                // respaldo, y con -12px las cajas de dos palabras contiguas se
                // tocaban y se leían como una sola.
                inset: '2px -9px 6px -9px',
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
  primaryColor: string;
  secondaryColor: string;
  voiceVolume: number;
  sfxVolume: number;
  fadeFrames: number;
}> = ({
  shot,
  index,
  accentColor,
  primaryColor,
  secondaryColor,
  voiceVolume,
  sfxVolume,
  fadeFrames,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps, width, height} = useVideoConfig();

  // Alternar la dirección del zoom evita que se sienta repetitivo.
  const zoomsIn = index % 2 === 0;
  // Cuanto más dura el corte, más recorrido necesita el zoom: una toma larga
  // sobre una imagen quieta (una pantalla de computador) se muere sin
  // movimiento. Un corte de 1s no alcanza a mostrar un zoom largo; uno de 6s
  // sin movimiento se hace eterno.
  const segundos = durationInFrames / fps;
  const recorrido = interpolate(segundos, [1, 6], [0.06, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = zoomsIn
    ? interpolate(frame, [0, durationInFrames], [1.03, 1.03 + recorrido], {
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, durationInFrames], [1.03 + recorrido, 1.03], {
        extrapolateRight: 'clamp',
      });

  // Golpe de entrada: llega pasado de tamaño y se asienta.
  // El primer corte entra con más golpe: es el que decide si alguien se queda.
  const punch = interpolate(frame, [0, index === 0 ? 14 : 9], [index === 0 ? 1.22 : 1.09, 1], {
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
          playbackRate={shot.speed ?? 1}
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
          playbackRate={shot.speed ?? 1}
          /* En una TransitionSeries los dos cortes están montados durante el
             cross-fade, así que sin esto suenan LAS DOS VOCES a la vez unos
             100 ms en cada empalme. Con 11 empalmes eso es un eco/tartamudeo
             constante que se percibe como "el audio está desfasado" aunque la
             sincronía esté perfecta. Acá cada corte entra y sale con un fundido
             del largo de la transición, así que en el solape suman uno. */
          volume={(f) => voiceVolume * bordes(f, durationInFrames, fadeFrames)}
        />
      ) : null}

      {/* Sonido que corresponde a la imagen (taladro sobre el taladro, teclado
          sobre la pantalla del computador). Entra 2 frames antes del corte
          porque el oído procesa antes que el ojo. */}
      {shot.sfx ? (
        <Sequence from={0} durationInFrames={durationInFrames} name={`SFX ${shot.sfx.id ?? shot.sfx.src}`}>
          <Audio
            src={resolveSrc(shot.sfx.src)}
            /* Un riser que empieza a volumen pleno no es un riser, es un ruido
               que aparece. Tiene que CRECER hacia el corte que viene: eso es lo
               que hace que el corte siguiente se sienta ganado y no puesto. */
            volume={(f) =>
              shot.sfx?.rol === 'riser'
                ? sfxVolume * ganancia(shot.sfx) * interpolate(f, [0, durationInFrames - 1], [0.18, 1], {
                    extrapolateRight: 'clamp',
                  })
                : sfxVolume * ganancia(shot.sfx) * bordes(f, durationInFrames, 3)
            }
          />
        </Sequence>
      ) : null}

      <Grade primaryColor={primaryColor} />
      <AbsoluteFill style={{backgroundColor: `rgba(255,255,255,${flash})`}} />

      {shot.overlays?.map((overlay, i) => (
        <Overlay key={`${overlay.src}-${i}`} overlay={overlay} color={secondaryColor} sfxVolume={sfxVolume} />
      ))}

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
        className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-10"
        style={{top: 210, transform: `scale(${outScale})`}}
      >
        {words.map(({word, highlighted}, index) => {
          const enter = pop(frame, fps, index * 2);
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
                    inset: '6px -11px 12px -11px',
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
  finalOverlaySrc,
  accentColor = '#FF6600',
  primaryColor = '#0047AB',
  secondaryColor = '#00D4FF',
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

  // Frames donde hay voz, para que la música se aparte.
  const speechRanges: Array<[number, number]> = [];
  // Frame en que arranca el último corte: ahí va el cierre prerenderizado, para
  // que la gráfica esté montada sobre el reveal completo y no sobre el final de
  // la línea de tiempo (que caía a un segundo de haber empezado la toma).
  let ultimoCorte = 0;
  {
    let cursor = 0;
    shots.forEach((shot, index) => {
      const largo = shotFrames(shot, fps);
      if (shot.words?.length) speechRanges.push([cursor, cursor + largo]);
      if (index === shots.length - 1) ultimoCorte = cursor;
      cursor += largo - transitionInFrames;
    });
  }

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
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                voiceVolume={voiceVolume}
                sfxVolume={sfxVolume}
                fadeFrames={transitionInFrames}
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

      {/* Cama musical con ducking: baja cuando alguien habla. Sin esto la
          música pelea con la voz, que siempre manda en la jerarquía de audio. */}
      {musicSrc ? (
        <Audio
          src={resolveSrc(musicSrc)}
          loop
          volume={(f) => {
            const hayVoz = speechRanges.some(([a, b]) => f >= a - 6 && f < b + 6);
            const base = hayVoz ? musicVolume * 0.3 : musicVolume;
            // Entrada y salida suaves: un corte seco de música se nota feo.
            const entrada = interpolate(f, [0, fps], [0, 1], {extrapolateRight: 'clamp'});
            const salida = interpolate(
              f,
              [durationInFrames - fps * 1.5, durationInFrames],
              [1, 0],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            return base * entrada * salida;
          }}
        />
      ) : null}

      {sfx?.riserApertura ? (
        /* El riser de apertura dura hasta el PRIMER CORTE y crece hacia él. Antes
           duraba 1 s fijo y moría en medio del gancho, sin nada que lo recibiera:
           un riser que no desemboca en un corte se oye como un ruido suelto. */
        <Sequence durationInFrames={cuts[0] ?? Math.round(fps)} name="SFX riser de apertura">
          <Audio
            src={resolveSrc(sfx.riserApertura.src)}
            volume={(f) =>
              sfxVolume *
              ganancia(sfx.riserApertura) *
              interpolate(f, [0, (cuts[0] ?? fps) - 1], [0.15, 1], {extrapolateRight: 'clamp'})
            }
          />
        </Sequence>
      ) : null}

      {/* Clímax: el riser crece 1,8 s y su PICO cae en el corte del reveal, donde
          golpea el impacto grave. Se alinean por el pico medido de cada archivo,
          no por su inicio: si no, el golpe llega tarde y el reveal se siente flojo. */}
      {sfx?.riser && ultimoCorte > 0 ? (
        <EfectoEn efecto={sfx.riser} en={ultimoCorte} antes={1.8} volumen={sfxVolume} crece nombre="SFX riser al reveal" />
      ) : null}
      {sfx?.impact && ultimoCorte > 0 ? (
        <EfectoEn efecto={sfx.impact} en={ultimoCorte} volumen={sfxVolume * 1.2} nombre="SFX impacto del reveal" />
      ) : null}
      {/* Whoosh solo donde cambia la escena de verdad. En los jump cuts dentro
          de un mismo clip (los que produce el corte de silencios) no cambia
          nada en pantalla, y ahí un whoosh suena puesto por reloj — que es
          exactamente lo que hace que un video parezca editado por una máquina.
          La skill de edición lo dice directo: 90% de los cortes deben ser secos. */}
      {sfx?.whooshes?.length
        ? cuts
            .map((start, index) => ({start, index, shot: shots[index + 1]}))
            .filter(({shot}) => shot?.isSceneChange)
            // El corte del reveal se lo queda su propio sonido. Un whoosh corto
            // encima de un swell largo se oyen como dos cosas peleando por el
            // mismo instante, justo donde el video tiene que respirar.
            .filter(({index}) => !(index === cuts.length - 1 && shots[shots.length - 1]?.sfx))
            .map(({start, index}) => {
              // Rotan, y además varía el volumen: aun con efectos distintos, el
              // mismo nivel en cada corte se oye mecánico.
              const efecto = sfx.whooshes![index % sfx.whooshes!.length];
              const variacion = 0.85 + (index % 3) * 0.1;
              return (
                <EfectoEn
                  key={`whoosh-${index}`}
                  efecto={efecto}
                  en={start}
                  volumen={sfxVolume * variacion}
                  nombre={`SFX cambio de escena ${index + 1}`}
                />
              );
            })
        : null}

      <Sequence durationInFrames={hookFrames} name="Gancho">
        <Hook text={hook} accentColor={accentColor} />
      </Sequence>

      {finalOverlaySrc ? (
        /* Cierre diseñado en HyperFrames y prerenderizado con alfa: el sello de
           precio responde la pregunta del gancho sobre el reveal, y de ahí pasa
           a la placa de marca. Va desde el inicio del último corte para que el
           mueble se vea limpio los primeros cuadros. */
        <Sequence from={ultimoCorte} name="Cierre (HyperFrames)">
          <OffthreadVideo
            src={resolveSrc(finalOverlaySrc)}
            transparent
            muted
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </Sequence>
      ) : cta ? (
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
                    color: secondaryColor,
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
