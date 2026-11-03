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

## Attributes and levels

Every character has seven attributes (might, grit, finesse, nerve, wits, heart, presence) that grow with level, from 1 to 60. Growth profiles are in `data/cast/attributes.json`: twelve archetypes, and each person leans toward one or two attributes and away from others. Growth is deterministic, with no random level-ups. `src/cast/attributes.ts` holds the formulas every system uses: party battles (damage, health, timing windows, braces, healing, song, enemy nerve), army officers, duels, Thornwick jobs and checks. A battle unit with `"cast": "<id>"` gets that character's attributes at their saved level. Winning a battle gives experience, and the levels are kept in save files (save version 2).

## Weapons and kith

Each character keeps one keepsake weapon (`data/gear/weapons.json`, `src/gear/weapons.ts`), reforged at Thornwick through five tiers (Worn, Mended, Tempered, Masterwork with a branch choice, Named), with two fitting slots that tune attributes, timing and kith bond. Battles take a `gear` map of loadouts; weapon tier multiplies damage. Save version 3 stores gear and coin.

Kith (`data/kith/species.json`, `src/kith/kith.ts`): 8 families of 3 base species, 16 hybrids, 12 unseen kith with hidden breeding recipes, and 4 legends; 40 traits, six temperaments, colour strains. Kith use people's seven attributes, scaled by 1 to 5 star potential per attribute, level to 50 through four life stages, and breed with inherited potential, traits (the bone sickness is recessive), moves and temperament.


### Regions and breeding variations

`data/kith/regions.json` defines 25 regions: the 13 nations, 5 hidden nations and 7 wild places. Each region has its native species (`species.region`; regional kith live wild nowhere else), the kinds that roam there, its own coat colours, and a breeding bonus. There are 148 species in 12 families: 36 base, 45 regional, 36 hybrids, 25 unseen and 6 legends, and every new species has a `look`.

Breeding (`breed`, `breedLitter` in `src/kith/kith.ts`) adds several variations:

- Regional forms: breeding a family inside a region with a form of it can give that form.
- Region bonuses: an attribute's potential, a trait, no bone sickness at the College, and nerve from lull-scarred parents on Osk.
- Coat genes: two colour and two pattern genes, with dominance (`coat`, `shownCoat`).
- Throwbacks to a grandparent's species (`lineage`).
- Twins, more often from bonded pairs.
- True-breeding lines (`line`): three same-species generations, or two at the Salt House.
- 13 new unseen recipes tied to regions.

Legends are fixed: the same potential, level, temperament and traits for every player (`legendKith`). They never breed normally. Once per game, after its quest, at full bond and in its lair, a legend can sire one heir with a grown kith of its own family (`canSireHeir`, `breedHeir`). The heir is a strong one-of-a-kind species. Its own foals take the other parent's species, and they carry a little of the legend's blood in its five-star attributes.

### Raising kith, and looks that follow attributes

Players never assign kith points. A kith is steered by how it is raised (`data/kith/upbringing.json`, `src/kith/upbringing.ts`): feed, pen, work, its handler and what it does in battle all pull on its attributes as habits. At each level up a share of growth follows the habits and is taken from what they pull against (`shapeLevel` in `src/kith/kith.ts`), capped by potential (`shapeCap`) and floored at `SHAPE_FLOOR`. Habits fade each level, so changing a kith's life changes its direction. Temperament scales how fast it can be steered. The game describes the direction in words (`readKith`), never numbers.

Looks follow attributes (`src/art/build.ts`). `buildOf` turns attributes into a build (bulk, brawn, reach, poise, keen, warmth, bearing, wear, lull rings, the raw), measured against a baseline: a kith against itself unsteered, a person against who they were at the start. Battle figures and kith are drawn from the build. Painted portraits pick the most specific variant that exists (`<id>@raw`, `@ringed`, `@hardened`, `@heavy`, `@lean`, then `<id>`); without a raw variant the plain portrait is drained of colour. Character mods come from the flags `mods.<id>` (for example `"lull"`) and `rings.<id>`. Ash is a real kith from the start (save version 4 stores kith) and learns from each battle it fights. `__lull.looks()` returns a sheet of example builds.

## Portraits

Painted anime portraits for the main cast (Rhea, Corran, Finch, Tamsin, Elder Maren, Elder Rook, Captain Halloran, Dr Lisle) are in `public/portraits`, made with Figma's image AI; the originals are in the Figma file "The Lull - portraits". They are listed in `public/portraits/index.json`, for example `{ "rhea": ["rhea.jpg"] }`, with an optional second, open-mouth image shown while the voice is loud; without one, a soft light swells with the voice. Characters with no painted portrait use a close-up of their HD battle figure.

The recruitable cast (53 characters: party, army commanders and Thornwick staff) is in `data/cast/recruits.json`, typed by `src/cast/recruits.ts`, with who they are, how they join and a short look description. Every recruit has a portrait; a unit test fails if one is missing. To paint a new one in the same style, print its prompt with `node tools/portraits/prompt.mjs <id>`. Some portraits are still 256px previews; replacing them with 512px versions from the Figma file needs no code change.
