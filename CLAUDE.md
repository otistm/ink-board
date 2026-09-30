# Ink Board: notes for Claude Code

Ink Board is a minimal mobile fingerboard game drawn like a paper-and-ink cartoon. It's a sister game to Ink Rally (`../ink-rally`) and Ink Nine (`../ink-nine`) and shares their look, fonts and way of working.

The idea: the phone is the ground. A skateboard lies on the screen, nose up, at fingerboard size, and you skate it with your pointer and middle fingers. The board stays still on the screen; the pavement slides and turns underneath it.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html` — the front page (a board rolling up the pavement and kickflipping, and a Play button).
- `play/index.html` — the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on touch, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION` and `SESSION` (how many seconds a session lasts) |
| core.js | Helpers, board and street sizes (`B`, `STREET`, `SLAB`, `CHUNK`), saved progress, the screen layout (`V`), the game state `S` |
| world.js | The street, built in chunks as you roll: grit, cracks, leaves, drain covers, and the obstacles (cones, twigs, rails, kickers); hit tests |
| audio.js | Procedural sounds: wheels rolling, slab joint clacks, finger scuff, pop, land, grind, bail |
| ui.js | Score and clock, the trick line, callouts, the first-time lesson (`TUT`), home, pause and finish cards |
| physics.js | Rolling, steering, pops, flips, shove-its, grinds, kickers, bails, and combos (`trickOf` names and scores tricks) |
| input.js | The two-finger controls, plus keys for a computer |
| draw.js | Drawing the pavement, obstacles, the board (grip side and underside) and finger rings |
| main.js | Starting and ending a session, the main loop (always last) |

## How it skates
Arcade, not a simulation. The world is measured in board units: the deck is 100 long and 28 wide.
- A finger that lands on the board holds it. A finger that lands on the ground is a foot.
- **Roll**: two fingers on the board and it rolls forward by itself, easing up to `CRUISE`. Lift a finger and it coasts.
- **Push** (optional, for extra speed): with a finger on the board, swipe a ground finger down. The board speeds up toward about 60% of the finger's speed, up to `B.vmax`. A ground finger held still for a moment brakes. Pushing without a finger on the board does nothing (a callout says so).
- **Steer**: slide a board finger sideways from where it landed. Turning needs a little speed.
- **Ollie**: two fingers on the board; the front one (nearest the top) slides at least 20 units toward the nose within a quarter second while the other is behind it. Air time grows with speed (`airTime`), so clearing things needs speed.
- **Flip and spin**: in the first half of the air, the front finger moving 12 units sideways flips the board (right is a kickflip, left a heelflip; 38 units is a double). The back finger moving sideways does a shove-it (34 units is a 360).
- **Catch**: a flip or shove-it that lands with a finger on the board is caught, worth 1.5×.
- **Obstacles**: the hit box runs between the trucks. Rolling into a cone, twig or rail, or landing on one, is a bail (cones and twigs get knocked over and stop counting). Clearing something in the air is worth a bonus.
- **Rails**: land on one lined up with it to grind a 50-50. Pop off it to keep the combo going.
- **Kickers**: roll up one the right way for a big launch; flick a trick in the air off it. Going up the wrong way is a bail.
- **Kerb**: the pavement is 200 wide. The kerb bounces you back.
- **Combos**: each trick adds points; a combo is banked after a second of rolling without a trick and is worth its points times the number of tricks. The same trick again in one combo is worth half each time.
- The session clock starts when you first get rolling (or when the lesson ends). When it runs out, the board finishes its trick or grind first.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). On a computer: arrow keys push, brake and steer; Space ollies, X kickflips, Z heelflips, C shove-its (Shift for doubles).
4. Test touch with two real fingers on a phone before shipping a change to the controls.

## Protect players' saved progress
Progress is kept in the browser's localStorage. An update must never wipe or break it.
- Keys: `inkboard-best` (`v`, best `score`, best `combo` and its `comboName`, number of `runs`), `inkboard-meta` (`v`, `tut` = lesson done, `sound`).
- Never rename or remove a saved field. Add new fields with defaults.

## Look and feel (same as the other Ink games; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey only for secondary text and soft shadows. Shading is hatching and stippling, never color.
- The board is solid black grip tape on white paper; its underside (seen mid-flip) is white with an ink "ink" graphic and trucks.
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out.
- Mobile first, portrait. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon beyond trick names.

## Smoke test
- First launch: the home card shows Skate. Skate starts the lesson: two fingers to roll, steer, ollie, kickflip, catch. Skip ends it. Then "Go!" and the clock runs.
- Two fingers on the board: it rolls forward by itself. Pushing with a ground finger speeds it up more and the pavement slides down; the wheels clack over slab joints.
- An ollie lifts the board (it grows and its shadow drops away); flicks during the air flip or spin it; it lands with a thud and the trick line shows the name and points.
- Rolling into a cone: "Bail!", the cone falls over, the board slides off and comes back.
- Landing on a rail lined up: "50-50" grind with sparks; it drops off the end.
- A kicker launches a big air.
- When the clock runs out: "Time!" and the finish card with score, tricks landed and best combo; the best score is kept after a refresh.
- No errors in the browser console.
