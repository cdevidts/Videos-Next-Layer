import {Config} from '@remotion/cli/config';
import {enableTailwind} from '@remotion/tailwind-v4';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setChromiumOpenGlRenderer('angle');
Config.overrideWebpackConfig(enableTailwind);
