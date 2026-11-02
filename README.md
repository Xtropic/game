# The Lull

A story-driven RPG built in TypeScript with PixiJS. The world is drawn as pixel art at 320 x 180; battles and dialogue are drawn in HD on top.

## Run it

    npm install
    npm run dev        # play at the address Vite prints
    npm test           # unit tests
    npm run build      # production build in dist/
    npm run e2e        # plays the built game in a browser (needs Playwright)

## Layout

- `src/core` - game loop (fixed 60 Hz logic), input actions, scene stack, saves
- `src/world` - maps, collision, the explore scene
- `src/art` - pixel-art helpers, the tile set, character sprite sheets
- `src/battle` - battle rules (pure, unit-tested), HD fighter art and effects, the battle scene
- `data/maps` - maps as rows of characters plus a legend and entities
- `data/battle` - skills and battle line-ups
- `tests/unit` - Vitest rule tests; `tests/e2e` - browser play tests (explore, and a full battle)

## Controls

Arrows or WASD to move, Shift to run, Enter / Space / E to talk, M to save.

Battles: Up/Down to pick a move, Enter to choose, then Left/Right to pick a target and Enter. When a ring closes on someone, press Space (or tap) as it meets the inner ring: on your hits for more damage, on enemy hits to brace. T turns on auto timing. Taps work for everything on a phone.

To try a battle, talk to the warden standing on the trail south of the square.
