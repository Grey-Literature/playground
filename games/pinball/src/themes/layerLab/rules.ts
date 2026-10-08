// Layer Lab rules: just enough scoring to make the layer transitions legible.

import type { PhysEvent } from '../../engine/types';
import type { ThemeRules } from '../../engine/theme';
import { useGame } from '../../engine/store';
import { flash, addShake, gameRef } from '../../engine/runtime';
import { sound } from '../../engine/audio';

const core = () => useGame.getState();

export const rules: ThemeRules = {
  reset() {},
  resetBall() {},
  onEvent(e: PhysEvent) {
    const g = core();
    switch (e.type) {
      case 'bumper':
        flash(`bumper:${e.id}`); addShake(0.08); sound.bumper(gameRef.bumperCombo); g.addScore(120);
        break;
      case 'sling': flash(`sling:${e.id}`); sound.sling(); g.addScore(80); break;
      case 'post': sound.post(); g.addScore(30); break;
      case 'sensor':
        if (e.kind === 'lane') { flash(`lane:${e.id.replace('lane', '')}`); sound.lane(); g.addScore(400); }
        else { sound.inlane(); g.addScore(200); }
        break;
      case 'rideEnter':
        sound.ramp(); g.addScore(e.id === 'lift' ? 1500 : 2500, e.id === 'lift' ? 'LIFT' : 'RAMP');
        break;
      case 'layer':
        if (e.via === 'ride') { sound.jackpot(); g.addScore(2000, 'NEST LANDING'); g.setBigMessage('ON THE NEST'); }
        else if (e.via === 'hole') { sound.tunnel(); g.addScore(1000, 'DROP HOLE'); g.setMessage('DROPPED THROUGH — UNDER THE NEST'); }
        else { sound.orbit(); g.addScore(750, 'WATERFALL'); g.setMessage('WATERFALL — BACK TO THE FIELD'); }
        break;
      default: break;
    }
  },
  onAttractEvent(e) {
    if (e.type === 'bumper') flash(`bumper:${e.id}`);
    if (e.type === 'sling') flash(`sling:${e.id}`);
  },
};
