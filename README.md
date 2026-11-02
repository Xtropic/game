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
- `src/ui`, `src/audio` - dialogue box with talking portraits, recorded voice playback
- `public/vo` - recorded voice lines (generated, see below); `public/portraits` - painted portrait art, when it exists
- `tools/voice` - records every spoken line in the data
- `tests/unit` - Vitest rule tests; `tests/e2e` - browser play tests (explore, and a full battle)

## Controls

Arrows or WASD to move, Shift to run, Enter / Space / E to talk, M to save.

Battles: Up/Down to pick a move, Enter to choose, then Left/Right to pick a target and Enter. When a ring closes on someone, press Space (or tap) as it meets the inner ring: on your hits for more damage, on enemy hits to brace. T turns on auto timing. Taps work for everything on a phone.

To try a battle, talk to the warden standing on the trail south of the square.

## Voices

Every spoken line in `data/maps` is recorded ahead of time with the Kokoro-82M voice model, one fixed voice per character (casting in `tools/voice/gen.py`). After adding or changing a line:

    node tools/voice/extract.mjs
    pip install kokoro-onnx soundfile        # once; ffmpeg must be installed
    KOKORO_DIR=/path/to/model python3 tools/voice/gen.py

`KOKORO_DIR` holds `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the kokoro-onnx GitHub releases. Unchanged lines are kept, unused recordings are removed, and `npm test` fails if any line has no recording.

## Portraits

Until painted art exists, each speaker's portrait is a close-up of their HD battle figure, with the mouth following the voice. To use painted art, add images to `public/portraits` and list them in `public/portraits/index.json`, for example `{ "rhea": ["rhea.png", "rhea-open.png"] }`: a closed-mouth image, then an optional open-mouth image shown while the voice is loud.
