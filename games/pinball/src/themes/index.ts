// The hall's roster. Registration order = picker order; the first theme is the
// default for first-time visitors. Hidden (fixture) tables are reachable only
// via ?theme=<id>.

import { registerTheme } from '../engine/theme';
import { deadStarDisco } from './deadStarDisco';
import { salamander } from './salamander';
import { layerLab } from './layerLab';

registerTheme(deadStarDisco);
registerTheme(salamander);
registerTheme(layerLab);
