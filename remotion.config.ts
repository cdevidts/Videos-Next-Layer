import {Config} from '@remotion/cli/config';
import {enableTailwind} from '@remotion/tailwind-v4';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setChromiumOpenGlRenderer('angle');
Config.overrideWebpackConfig(enableTailwind);

// Sin caché de webpack: con la caché tibia, el segundo render después de cambiar
// algo fallaba a veces en el bundle con "TypeError: Cannot read properties of
// undefined (reading 'length')" (wasm-hash.js), y el siguiente con la caché
// borrada salía bien (Video 44, cuatro renders). Rebundlear cuesta segundos; un
// render caído a los 20 minutos cuesta el render.
Config.setCachingEnabled(false);
