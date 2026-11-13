# Fowl Play

A 2D Thanksgiving survival comedy. You are the turkey. The farmer has the only gate key, and the farm has an exemplary selection of workplace hazards.

Open `index.html` directly, or run `npm run dev` and visit http://127.0.0.1:4173. There are no dependencies or build step. Google Fonts is optional; local system fonts take over offline. All game art is drawn in Canvas.

Move with WASD / arrows, sprint with Shift, gobble with Space, and interact with E. Place rakes (1), greased pumpkins (2), gobble cans (3), or hay bales (4) beneath you, then get out of the way. The equipment tray and touch controls support phones and tablets. P / Escape pauses.

Knock the farmer down, collect his dropped key, then escape through the northeast gate. Three feathers or the dinner timer running out means you lose. Retries restart the current night and its score. Complete all five nights to win the campaign. Only the best score is stored locally.

Each night adds a threat: Biscuit tracks footprints and accepts cornbread bribes; Grandma investigates sound; a drone searches while corn shortcuts change; the combine patrols the central lane on the final night. Corn cover hides quiet movement. Traps have friendly fire and a short placement grace period. Repeated trap types give the farmer shorter knockdowns, and lost composure makes him faster and more reckless.

Names for the turkey and farmer remain deliberately unsettled.

Verification: `npm run check` checks JavaScript syntax; `npm test` runs 14 logic checks covering map connectivity, navigation, luring, traps, friendly fire, resource recovery, losses, retries, progression, and the approved scarecrow employment egg. These use a simulated DOM and canvas; they do not replace browser visual QA.
