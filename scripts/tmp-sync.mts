import {transcribe} from '@remotion/install-whisper-cpp';
import fs from 'node:fs';
const main = async () => {
  const props = JSON.parse(fs.readFileSync('out/video-46.reel.props.json','utf8'));
  const fps = 30, T = (props.transitionInFrames ?? 3) / fps;

  // Linea de tiempo global de los subtitulos, tal como los ve el espectador.
  const esperadas: Array<{t:string;s:number}> = [];
  let cursor = 0;
  for (const shot of props.shots) {
    for (const w of shot.words ?? []) esperadas.push({t: w.text, s: cursor + w.start});
    cursor += shot.durationInSeconds - T;
  }

  const {transcription} = await transcribe({
    inputPath: '/tmp/full.wav',
    whisperPath: '/home/user/Videos-Next-Layer/whisper.cpp',
    model: 'medium', language: 'es' as never,
    tokenLevelTimestamps: true, whisperCppVersion: '1.5.5', printOutput: false,
  });
  const real: Array<{t:string;s:number}> = [];
  for (const it of transcription) {
    const raw = it.text ?? '';
    if (!raw.trim() || /[[(*\]]/.test(raw)) continue;
    if (raw.startsWith(' ') || real.length===0) real.push({t: raw.trim(), s: it.offsets.from/1000});
    else real[real.length-1].t += raw;
  }

  const norm = (x:string)=>x.toLowerCase().replace(/[.,¿?¡!"]/g,'');
  const desfases: number[] = [];
  console.log('palabra          subtitulo   audio real   desfase');
  for (const e of esperadas) {
    // busca la misma palabra dentro de +-1.5s, para no emparejar repeticiones lejanas
    const m = real.filter(r => norm(r.t)===norm(e.t) && Math.abs(r.s-e.s)<1.5)
                  .sort((a,b)=>Math.abs(a.s-e.s)-Math.abs(b.s-e.s))[0];
    if (m) {
      const d = m.s - e.s; desfases.push(d);
      console.log('%s %s %s %s', e.t.padEnd(15), (e.s.toFixed(2)+'s').padStart(9),
        (m.s.toFixed(2)+'s').padStart(11), ((d>=0?'+':'')+d.toFixed(2)+'s').padStart(8));
    }
  }
  const abs = desfases.map(Math.abs);
  console.log('\n%d palabras emparejadas de %d', desfases.length, esperadas.length);
  console.log('desfase medio: %.2fs   peor: %.2fs', abs.reduce((a,b)=>a+b,0)/abs.length, Math.max(...abs));
};
main();
