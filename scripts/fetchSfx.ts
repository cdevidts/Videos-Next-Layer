/**
 * Descarga los efectos de sonido del reel a public/sfx/.
 *
 *   npm run sfx
 *
 * Por qué descargados y no sintetizados: la primera versión generaba los
 * whooshes con ruido filtrado por un pasa-bajos de un polo. Sin resonancia y
 * con un barrido simétrico, eso no suena a whoosh — suena a arena. Un whoosh
 * real tiene un barrido de frecuencia marcado (estos van de ~2.9 kHz a ~4.9 kHz
 * en 1,3 s) y eso es muy difícil de falsificar con síntesis simple.
 *
 * Licencia: Mixkit License — libre para usar en proyectos comerciales, sin
 * atribución. NO permite redistribuir los archivos por separado, por eso
 * public/sfx/ está en .gitignore y esto es un paso de setup, no assets del repo.
 * https://mixkit.co/license/#sfxFree
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'public/sfx';
const BASE = 'https://assets.mixkit.co/active_storage/sfx';
const MUSIC_BASE = 'https://assets.mixkit.co/music';

/**
 * Cama musical. Se eligió midiendo: "Close Up" varía solo 6 dB a lo largo del
 * tema, así que no salta por encima de la voz. Las alternativas variaban 21 y
 * 35 dB y peleaban con el diálogo.
 */
const MUSIC = {id: 1167, file: 'musica-cama.mp3', nombre: 'Close Up (Mixkit)'};

/**
 * Elegidos escuchando el barrido de frecuencia de cada uno, no por el nombre.
 * Los tres whooshes son distintos entre sí a propósito: usar el mismo sonido en
 * cada corte es lo que hace que un video suene hecho por una máquina.
 */
const SOUNDS: Array<{id: number; file: string; nombre: string}> = [
  // Transiciones: tres distintos, se rotan. Solo se usan cuando cambia la
  // escena de verdad, no en cada corte.
  {id: 1492, file: 'whoosh-1.mp3', nombre: 'Cinematic whoosh fast transition'},
  {id: 1490, file: 'whoosh-2.mp3', nombre: 'Fast whoosh transition'},
  {id: 1493, file: 'whoosh-3.mp3', nombre: 'Swirling whoosh'},
  // Sonidos que corresponden a lo que se ve en pantalla. Un sonido que no
  // tiene nada que ver con la imagen se nota como error aunque no se sepa por que.
  {id: 855, file: 'taladro.mp3', nombre: 'Electrical drill'},
  {id: 2531, file: 'teclado.mp3', nombre: 'Typing on a laptop keyboard'},
  {id: 1109, file: 'click.mp3', nombre: 'Select click'},
  {id: 235, file: 'reveal.mp3', nombre: 'Explainer video game reveal'},
  {id: 961, file: 'reveal-final.mp3', nombre: 'Musical reveal'},
  // Para el final: primero construye, después golpea y sostiene. Elegidos
  // midiendo la curva — el riser sube de -70 a -37 dB en 2,6s, y el swell
  // pega al 0,8s y sostiene 8s. Un reveal corto no aguanta la placa de marca.
  {id: 790, file: 'riser-final.mp3', nombre: 'Cinematic trailer riser'},
  {id: 2672, file: 'swell-reveal.mp3', nombre: 'Angelic swell presentation'},
  // Puntuacion
  {id: 3005, file: 'pop.mp3', nombre: 'Explainer video pops whoosh light pop'},
  {id: 2903, file: 'impact.mp3', nombre: 'Movie whoosh impact presentation'},
  {id: 2408, file: 'riser.mp3', nombre: 'Storm coming whoosh'},
];

const main = async () => {
  fs.mkdirSync(OUT_DIR, {recursive: true});

  for (const sound of SOUNDS) {
    const target = path.join(OUT_DIR, sound.file);
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
      console.log(`♻️  ${sound.file}`);
      continue;
    }
    const url = `${BASE}/${sound.id}/${sound.id}-preview.mp3`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo bajar ${sound.file} (${response.status}) desde ${url}`);
    }
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    console.log(`🔊 ${sound.file}  ← ${sound.nombre}`);
  }

  // Música
  const musicTarget = path.join(OUT_DIR, MUSIC.file);
  if (fs.existsSync(musicTarget) && fs.statSync(musicTarget).size > 1000) {
    console.log(`♻️  ${MUSIC.file}`);
  } else {
    const res = await fetch(`${MUSIC_BASE}/${MUSIC.id}/${MUSIC.id}.mp3`);
    if (!res.ok) throw new Error(`No se pudo bajar la música (${res.status})`);
    fs.writeFileSync(musicTarget, Buffer.from(await res.arrayBuffer()));
    console.log(`🎵 ${MUSIC.file}  ← ${MUSIC.nombre}`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'CREDITOS.txt'),
    [
      'Efectos de sonido descargados de Mixkit (https://mixkit.co).',
      'Mixkit License: uso libre, incluso comercial, sin atribución obligatoria.',
      'No se pueden redistribuir por separado, por eso esta carpeta no va en git.',
      'Los baja scripts/fetchSfx.ts con `npm run sfx`.',
      '',
      ...SOUNDS.map((s) => `${s.file.padEnd(18)} ${s.nombre}`),
      `${MUSIC.file.padEnd(18)} ${MUSIC.nombre}`,
    ].join('\n') + '\n',
  );

  console.log(`\n✅ ${SOUNDS.length} sonidos en ${OUT_DIR}/`);
};

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
