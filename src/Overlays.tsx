/**
 * La capa gráfica del reel: íconos, stickers animados y fotos, cada uno con su
 * sonido de entrada. Es lo que a estos reels les faltaba entero — footage +
 * subtítulo y nada más se ve plano al lado de cualquier reel editado.
 *
 * Nada de esto se dibuja: los archivos los baja `npm run assets` desde Iconify,
 * LottieFiles, Noto, SourceSplash o Wikimedia. Acá solo se componen y se animan.
 */
import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Lottie, type LottieAnimationData} from '@remotion/lottie';
import type {ReelOverlay, SfxRef} from './lib/reel';

const src = (s: string) =>
  /^(https?:)?\/\//.test(s) ? s : staticFile(s.replace(/^\/?public\//, '').replace(/^\//, ''));

/** Ganancia medida del catálogo → factor de volumen. */
export const ganancia = (ref?: SfxRef) => (ref ? 10 ** (ref.gananciaDb / 20) : 1);

/**
 * Un efecto cuyo PICO cae en el frame `en`. Si el pico está más adentro del
 * archivo que el espacio disponible antes del evento, se recorta el inicio en
 * vez de correr el golpe: el golpe es lo que no se negocia.
 *
 * `antes` limita cuánto suena antes del pico (un riser de 6 s se reduce a los
 * últimos 1,8 s, que es lo que pide la directiva). `crece` lo hace subir de
 * 15 % a 100 % hasta el pico: un riser a volumen pleno desde el inicio no es
 * un riser, es un ruido que aparece.
 */
export const EfectoEn: React.FC<{
  efecto: SfxRef;
  en: number;
  volumen: number;
  antes?: number;
  crece?: boolean;
  nombre?: string;
}> = ({efecto, en, volumen, antes, crece, nombre}) => {
  const {fps} = useVideoConfig();
  const picoFrames = Math.round(efecto.picoSeg * fps);
  const previo = antes === undefined ? picoFrames : Math.min(picoFrames, Math.round(antes * fps));
  const desde = en - previo;
  const recorte = picoFrames - previo + Math.max(0, -desde);
  const inicio = Math.max(desde, 0);
  const g = volumen * ganancia(efecto);
  const hastaPico = Math.max(en - inicio, 1);
  return (
    <Sequence from={inicio} durationInFrames={hastaPico + Math.round(fps * 2.5)} name={nombre ?? `SFX ${efecto.id ?? efecto.src}`}>
      <Audio
        src={src(efecto.src)}
        trimBefore={recorte > 0 ? recorte : undefined}
        volume={(f) =>
          crece ? g * interpolate(f, [0, hastaPico], [0.15, 1], {extrapolateRight: 'clamp'}) : g
        }
      />
    </Sequence>
  );
};

const DURACION: Record<ReelOverlay['tipo'], number> = {icon: 1.4, sticker: 1.9, photo: 1.9};

/**
 * Posiciones elegidas mirando frames, no a ojo: arriba lo ocupa el gancho los
 * primeros 2,2 s, abajo el subtítulo, y el sujeto queda al centro-derecha en
 * casi todos los cortes. Por eso el default del ícono es la banda izquierda a
 * media altura, y el del sticker la derecha, más arriba.
 */
const CAJA: Record<NonNullable<ReelOverlay['pos']>, React.CSSProperties> = {
  left: {alignItems: 'flex-start', justifyContent: 'flex-start', padding: '820px 0 0 74px'},
  right: {alignItems: 'flex-end', justifyContent: 'flex-start', padding: '640px 60px 0 0'},
  center: {alignItems: 'center', justifyContent: 'center'},
  top: {alignItems: 'center', justifyContent: 'flex-start', padding: '250px 0 0 0'},
};

const LottieSticker: React.FC<{archivo: string}> = ({archivo}) => {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`Lottie ${archivo}`));
  useEffect(() => {
    fetch(src(archivo))
      .then((r) => r.json())
      .then((json: LottieAnimationData) => {
        setData(json);
        continueRender(handle);
      })
      .catch((error: unknown) => cancelRender(error));
  }, [archivo, handle]);
  return data ? <Lottie animationData={data} loop style={{width: 320, height: 320}} /> : null;
};

export const Overlay: React.FC<{overlay: ReelOverlay; color: string; sfxVolume: number}> = ({
  overlay,
  color,
  sfxVolume,
}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const entrada = Math.round(overlay.atSeconds * fps);
  // Se va antes del corte para no competir con el whoosh del siguiente.
  const salida = Math.min(entrada + Math.round((overlay.durationSeconds ?? DURACION[overlay.tipo]) * fps), durationInFrames - 6);
  if (salida <= entrada + 4) return null;
  return (
    <>
      <Sequence from={entrada} durationInFrames={salida - entrada} name={`${overlay.tipo} ${overlay.src}`}>
        <Pieza overlay={overlay} color={color} />
      </Sequence>
      {overlay.sfx ? <EfectoEn efecto={overlay.sfx} en={entrada + 2} volumen={sfxVolume} nombre={`SFX entrada ${overlay.tipo}`} /> : null}
    </>
  );
};

const Pieza: React.FC<{overlay: ReelOverlay; color: string}> = ({overlay, color}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  // Entra con resorte y un pelo de rotación: un elemento que aparece con
  // opacidad lineal se lee como error de render, no como diseño.
  const entra = spring({frame, fps, config: {damping: 11, stiffness: 190, mass: 0.6}});
  const sale = interpolate(frame, [durationInFrames - 5, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const escala = interpolate(entra, [0, 1], [0.4, 1]);
  const pos = overlay.pos ?? (overlay.tipo === 'icon' ? 'left' : overlay.tipo === 'photo' ? 'top' : 'right');
  // El contorno oscuro es lo que lo hace legible sobre madera, pared blanca o
  // un mueble rojo sin tener que ponerle una caja detrás.
  const sombra = 'drop-shadow(0 0 10px rgba(7,8,12,.95)) drop-shadow(0 6px 26px rgba(0,0,0,.8))';

  let pieza: React.ReactNode;
  if (overlay.tipo === 'icon') {
    pieza = overlay.multicolor ? (
      <Img src={src(overlay.src)} style={{width: 200, height: 200, filter: sombra}} />
    ) : (
      // Los íconos monocromos se tiñen con la paleta vía máscara: el SVG queda
      // neutro y cambiar de marca no obliga a rebajarlo.
      <div
        style={{
          width: 190,
          height: 190,
          backgroundColor: color,
          maskImage: `url(${src(overlay.src)})`,
          WebkitMaskImage: `url(${src(overlay.src)})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          filter: sombra,
        }}
      />
    );
  } else if (overlay.tipo === 'sticker') {
    pieza = (
      <div style={{filter: sombra}}>
        <LottieSticker archivo={overlay.src} />
      </div>
    );
  } else {
    pieza = (
      <Img
        src={src(overlay.src)}
        style={{
          width: 640,
          maxHeight: 620,
          objectFit: 'cover',
          borderRadius: 26,
          border: '10px solid white',
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{...CAJA[pos], pointerEvents: 'none'}}>
      <div
        style={{
          opacity: Math.min(entra, sale),
          transform: `scale(${escala}) rotate(${interpolate(entra, [0, 1], [overlay.tipo === 'photo' ? 8 : -14, overlay.tipo === 'photo' ? -3 : 0])}deg)`,
        }}
      >
        {pieza}
      </div>
    </AbsoluteFill>
  );
};
