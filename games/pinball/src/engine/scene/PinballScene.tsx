import { useGame } from '../store';
import { themeById } from '../theme';
import { PhysicsLoop, CameraRig } from './loop';

// Engine root: the simulation + camera, then the active theme's playfield
// (inside the ~6.5° tilted group, far edge raised) and its surroundings.
// Keyed by theme so a table swap remounts every mesh cleanly.
export function PinballScene() {
  const themeId = useGame((s) => s.themeId);
  const theme = themeById(themeId);
  return (
    <>
      <PhysicsLoop />
      <CameraRig />
      {theme && (
        <group key={theme.id}>
          <group rotation={[0.115, 0, 0]}>
            <theme.Playfield />
          </group>
          <theme.Surroundings />
        </group>
      )}
    </>
  );
}
