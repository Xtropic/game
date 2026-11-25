#!/usr/bin/env python3
"""Army battles (src/army/army.ts). Writes data/army/battles.json. Run: python3 tools/army/gen.py

The field is a grid of cells; our side holds the top, theirs comes from the bottom. The first of "ours" is the
hero's own company: orders reach the others from it, and if it breaks the battle is lost.
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
LEGEND = {".": "open", "T": "woods", "^": "hill", "~": "water", "=": "ford", ":": "road", "#": "wall", "g": "gate", "y": "yard"}


def field(w, h, paint):
    g = [["." for _ in range(w)] for _ in range(h)]
    paint(g)
    return ["".join(r) for r in g]


def thornwick(g):
    W, H = len(g[0]), len(g)
    def fill(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H: g[y][x] = ch
    fill(1, 0, W - 2, 4, "y")                       # the yard inside the walls
    fill(0, 5, W - 1, 5, "#")                       # the south wall
    fill(19, 5, 20, 5, "g"); fill(3, 5, 3, 5, "g")  # the main gate and the west postern
    fill(2, 8, 10, 18, "T"); fill(0, 10, 2, 16, "T")  # the west wood
    fill(29, 6, 36, 10, "^")                        # the north-east knoll
    fill(0, 14, W - 1, 14, "~")                     # the stream
    fill(18, 14, 21, 14, "="); fill(5, 14, 6, 14, "=")  # two fords: the road's, and one in the wood
    for y in range(6, H): g[y][19] = g[y][19] if g[y][19] in "=~" else ":"; g[y][20] = g[y][20] if g[y][20] in "=~" else ":"


def lockside(g):
    W, H = len(g[0]), len(g)
    def fill(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H: g[y][x] = ch
    fill(1, 0, W - 2, 4, "y"); fill(13, 0, 26, 1, "#")  # Corvel's yard, the brood house along the back
    fill(0, 5, W - 1, 5, "#"); fill(19, 5, 20, 5, "g"); fill(34, 5, 34, 5, "g")  # the wall, the main gate, the cart gate
    fill(0, 8, W - 1, 8, ":")                          # the towpath
    fill(0, 9, W - 1, 10, "~")                         # the canal
    fill(8, 9, 9, 10, "="); fill(31, 9, 32, 10, "=")   # the two lock bridges
    fill(33, 12, 39, 20, "T"); fill(0, 14, 5, 19, "T")  # willows east, a coppice west
    for y in range(11, H): g[y][19] = ":"; g[y][20] = ":"


def fill_in(g, x0, y0, x1, y1, ch):
    W, H = len(g[0]), len(g)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H: g[y][x] = ch


def terraces(g):
    """The clan terraces: steep ground below, walls of the terraces in bands, a drove road up the middle."""
    W, H = len(g[0]), len(g)
    fill_in(g, 0, 0, W - 1, 3, "T")                       # the cloud forest we come out of
    fill_in(g, 18, 0, 21, 3, ":")
    fill_in(g, 0, 11, W - 1, 11, "#"); fill_in(g, 3, 16, W - 4, 16, "#")  # terrace walls
    for x in (6, 19, 20, 33): g[11][x] = "g"
    for x in (12, 19, 20, 27): g[16][x] = "g"
    fill_in(g, 0, 12, W - 1, 15, "^"); fill_in(g, 3, 17, W - 4, 23, "^")  # the terraces themselves
    fill_in(g, 0, 17, 2, 23, "T"); fill_in(g, W - 3, 17, W - 1, 23, "T")
    for y in range(4, H):
        for x in (19, 20):
            if g[y][x] not in "#g": g[y][x] = ":"


def millbridge_field(g):
    """Millbridge from the north bank: the river, the old bridge and a ford, the town wall beyond."""
    W, H = len(g[0]), len(g)
    fill_in(g, 0, 9, W - 1, 10, "~"); fill_in(g, 19, 9, 20, 10, "="); fill_in(g, 34, 9, 35, 10, "=")  # river, bridge, ford
    fill_in(g, 2, 15, W - 3, 15, "#"); fill_in(g, 19, 15, 20, 15, "g"); fill_in(g, 6, 15, 6, 15, "g")
    fill_in(g, 3, 16, W - 4, 23, "y")                     # the town inside its wall
    fill_in(g, 0, 2, 8, 7, "T"); fill_in(g, 30, 11, 39, 14, "T")
    for y in range(0, 9): g[y][19] = ":"; g[y][20] = ":"
    for y in range(11, 15): g[y][19] = ":"; g[y][20] = ":"


def foundry(g):
    """Cinderwick's foundry yards from the canal: a cut across the field, two swing bridges, the yard walls behind."""
    W, H = len(g[0]), len(g)
    fill_in(g, 0, 7, W - 1, 8, "~"); fill_in(g, 9, 7, 10, 8, "="); fill_in(g, 29, 7, 30, 8, "=")
    fill_in(g, 0, 6, W - 1, 6, ":"); fill_in(g, 0, 9, W - 1, 9, ":")  # towpaths
    fill_in(g, 0, 14, W - 1, 14, "#"); fill_in(g, 9, 14, 10, 14, "g"); fill_in(g, 29, 14, 30, 14, "g"); fill_in(g, 19, 14, 20, 14, "g")
    fill_in(g, 0, 15, W - 1, 23, "y")
    fill_in(g, 14, 18, 25, 19, "#"); fill_in(g, 19, 18, 20, 18, "g")  # the furnace house
    fill_in(g, 34, 10, 39, 13, "T")                       # a dump of slag and scrub


def spindle(g):
    """Vantry's outer ward: we muster in the street at the top; the Spindle wall across the middle, its gate and a
    postern; the ward beyond, with house blocks and the road up to the Broodhouse."""
    W, H = len(g[0]), len(g)
    fill_in(g, 0, 0, W - 1, 5, ":")                         # the muster street
    fill_in(g, 0, 8, W - 1, 8, "#")                         # the Spindle wall
    fill_in(g, 19, 8, 20, 8, "g"); fill_in(g, 6, 8, 6, 8, "g")   # the Spindle gate, and the postern
    fill_in(g, 2, 11, 8, 15, "T"); fill_in(g, 30, 11, 37, 15, "T")  # house blocks
    fill_in(g, 11, 17, 16, 21, "T"); fill_in(g, 23, 17, 28, 21, "T")
    fill_in(g, 0, 9, W - 1, 10, "y")                        # the yard behind the wall
    for y in range(9, H): g[y][19] = ":"; g[y][20] = ":"


def harbour(g):
    """Port Ashby's harbour mouth: our boats chained across the top, the water, the mole down the middle, the quay below."""
    W, H = len(g[0]), len(g)
    fill_in(g, 0, 0, W - 1, 2, "y")                       # the chained boats and the harbour mouth we hold
    fill_in(g, 0, 3, W - 1, 14, "~")                      # the harbour
    fill_in(g, 18, 3, 21, 14, ":")                        # the mole, the one dry way out to us
    fill_in(g, 2, 3, 7, 14, "=")                          # the shallows along the west steps, waist deep at low tide
    fill_in(g, 32, 3, 37, 14, "=")                        # and along the east shingle
    fill_in(g, 0, 15, W - 1, 15, ":")                     # the quay
    fill_in(g, 0, 19, 12, H - 1, "#"); fill_in(g, 27, 19, W - 1, H - 1, "#")   # warehouses
    fill_in(g, 13, 19, 26, H - 1, ".")


BATTLES = {
    "thornwick-raid": dict(
        name="The Wardens at Thornwick", hold=180,
        intro=["A Warden column has come up the road from the ford: seven companies, crossbows, pikes, and riders on loftbucks. Thornwick's gate is shut and everyone who can hold a weapon is on the yard.",
               "Click one of your companies (the blue banners), then click the ground to send it there, or click a red company to attack it. Orders take longer to reach companies far from your own.",
               "Break them, or hold until dark and they'll pull back. Space pauses; + and - change the speed."],
        terrain=field(40, 24, thornwick),
        commander=dict(name="The Warden captain", cast="warden", level=16),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 3]),
            dict(id="gate", name="The gate company", kind="foot", at=[19.5, 6.6]),
            dict(id="pikes", name="Pikes", kind="pike", at=[15, 6.8]),
            dict(id="bows-w", name="West bows", kind="bow", at=[12, 4]),
            dict(id="bows-e", name="East bows", kind="bow", at=[27, 4]),
            dict(id="riders", name="Kith riders", kind="horse", at=[7, 3]),
        ],
        theirs=[
            dict(id="w-foot1", name="Warden foot", kind="foot", at=[16, 20], officer="warden", level=13),
            dict(id="w-foot2", name="Warden foot", kind="foot", at=[23, 20], officer="warden", level=13),
            dict(id="w-pikes", name="Warden pikes", kind="pike", at=[19.5, 21.5], officer="warden", level=14),
            dict(id="w-xbow1", name="Crossbows", kind="bow", at=[12, 21], officer="archer", level=13),
            dict(id="w-xbow2", name="Crossbows", kind="bow", at=[27, 21], officer="archer", level=13),
            dict(id="w-horse", name="Warden riders", kind="horse", at=[33, 22], officer="warden", level=15),
            dict(id="w-reserve", name="The reserve", kind="foot", at=[19.5, 23], officer="warden", level=15),
        ],
        plan=[
            dict(at=3, note="The foot cross at the road ford and come at the gate; crossbows close to cover them.", orders=[
                dict(company="w-foot1", via=[18.5, 14.5], to=[18, 8]), dict(company="w-foot2", via=[20.5, 14.5], to=[21, 8]),
                dict(company="w-pikes", via=[19.5, 14.5], to=[19.5, 10]), dict(company="w-xbow1", via=[18.5, 14.5], to=[14, 11]), dict(company="w-xbow2", via=[21, 14.5], to=[25, 11])]),
            dict(at=25, note="Their riders swing west through the wood, across the wood ford, for the postern.", orders=[
                dict(company="w-horse", via=[9, 19], to=[3.5, 6.5])]),
            dict(when="half", note="When the attack falters, the reserve goes in at the gate.", orders=[
                dict(company="w-reserve", via=[19.5, 14.5], to=[19.5, 7])]),
            dict(at=60, note="The east crossbows climb the knoll to shoot down into the yard.", orders=[
                dict(company="w-xbow2", to=[32, 8])]),
        ],
        stratagems=[
            dict(id="ambush", name="Riders wait in the west wood", text="Your kith riders slip out before dawn and lie up in the wood by the wood ford. Hidden until they strike, and the first blow lands hard.",
                 opinions={"rider": "\"The wood's thick enough to hide a buck. Just.\"", "commander": "\"Only worth it if they come that way.\"", "skirmisher": "\"Let me take them. I know that wood.\""},
                 effect=dict(hide=["riders"], move={"riders": [6, 12]})),
            dict(id="stakes", name="Stakes before the gate", text="Sharpened stakes all across the ground in front of the gate. Anyone fighting there fights slower and bleeds for it, riders worst.",
                 opinions={"guardian": "\"Stakes I understand.\"", "vanguard": "\"Leave a gap for us to go out through.\"", "artisan": "\"Give me a day and the timber.\""},
                 effect=dict(stakes=[15, 6, 25, 9])),
            dict(id="fires", name="Fires on the knoll", text="Lanterns and cookfires all over the north-east knoll, as if a company held it. Their crossbows won't try for it, and the column comes on less sure of itself.",
                 opinions={"talker": "\"Let them count fires and sweat.\"", "scholar": "\"A captain who sees fires sees what he expects.\"", "hero": "\"Cheap, and it might be enough.\""},
                 effect=dict(skipPlan=3, enemyMorale=10)),
        ],
        won="Thornwick holds", lost="Thornwick's gate is down",
    ),
    "lockside-hold": dict(
        name="Corvel's hatchery", hold=200,
        intro=["Corvel's hatchery, at the head of the Lockside cut. The yard wall, the brood house behind it, the canal in front with its two lock bridges. Your first command.",
               "A Warden column is coming up from the south: foot, pikes, crossbows, and riders. They have to cross the canal at one of the lock bridges to reach you.",
               "Break them, or hold until dark."],
        terrain=field(40, 24, lockside),
        commander=dict(name="The Warden major", cast="warden", level=20),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 3]),
            dict(id="varro", name="Second company", kind="foot", at=[12, 7], unless="kaneConfronted"),
            dict(id="pikes", name="Pikes", kind="pike", at=[20, 6.6]),
            dict(id="bows-w", name="West bows", kind="bow", at=[9, 6.6]),
            dict(id="bows-e", name="East bows", kind="bow", at=[31, 6.6]),
            dict(id="riders", name="Kith riders", kind="horse", at=[30, 3]),
        ],
        theirs=[
            dict(id="w-foot1", name="Warden foot", kind="foot", at=[15, 20], officer="warden", level=17),
            dict(id="w-foot2", name="Warden foot", kind="foot", at=[24, 20], officer="warden", level=17),
            dict(id="w-pikes", name="Warden pikes", kind="pike", at=[19.5, 21.5], officer="warden", level=18),
            dict(id="w-xbow1", name="Crossbows", kind="bow", at=[11, 21], officer="archer", level=17),
            dict(id="w-xbow2", name="Crossbows", kind="bow", at=[28, 21], officer="archer", level=17),
            dict(id="w-horse", name="Warden riders", kind="horse", at=[30, 23], officer="warden", level=19),
            dict(id="w-reserve", name="The reserve", kind="foot", at=[19.5, 23], officer="warden", level=19),
        ],
        plan=[
            dict(at=3, note="The foot go for the west lock bridge and on to the gate; the pikes take the east bridge; crossbows line the south bank.", orders=[
                dict(company="w-foot1", via=[8.5, 11.5], to=[18, 7]), dict(company="w-foot2", via=[9, 11.5], to=[21, 7]),
                dict(company="w-pikes", via=[31.5, 11.5], to=[30, 7]), dict(company="w-xbow1", to=[12, 12]), dict(company="w-xbow2", to=[27, 12])]),
            dict(at=30, note="Their riders go round through the willows, over the east bridge, for the cart gate.", orders=[
                dict(company="w-horse", via=[36, 13], to=[34.5, 3])]),
            dict(when="half", note="When the attack falters, the reserve comes up the middle.", orders=[
                dict(company="w-reserve", via=[9, 11.5], to=[19.5, 7])]),
        ],
        stratagems=[
            dict(id="raise", name="Raise the west lock bridge", text="The lock-keepers can wind the west bridge up out of reach. Everything they send has to come over the east bridge, under your east bows, the long way round.",
                 opinions={"artisan": "\"Give me the lock-keepers and it's up by dawn.\"", "commander": "\"One bridge is one fight. I like one fight.\"", "talker": "\"The keepers will do it for the Commons. Ask them nicely.\""},
                 effect=dict(terrain=[[8, 9, "~"], [9, 9, "~"], [8, 10, "~"], [9, 10, "~"]])),
            dict(id="willows", name="Second company in the willows", text="Your second company lies up in the willows by the east bridge. Hidden until they strike, and anyone who comes that way meets them first.",
                 opinions={"skirmisher": "\"Willows are good cover. Wet, but good.\"", "rider": "\"If their riders come round, they'll come through there.\"", "hero": "\"It leaves the west bridge thin.\""},
                 effect=dict(hide=["varro"], move={"varro": [35, 13]})),
            dict(id="stakes", name="Stakes before the gate", text="Stakes across the ground in front of Corvel's gate. Whoever reaches the gate fights slowly there, and bleeds.",
                 opinions={"guardian": "\"Stakes I understand.\"", "vanguard": "\"Leave a gap for us to go out through.\""},
                 effect=dict(stakes=[16, 6, 24, 7.8])),
        ],
        won="Corvel's holds", lost="Corvel's is lost",
    ),
    "march-cloudline": dict(
        name="The march on the terraces", attack=True,
        intro=["You've turned the Commons on the clans of the Cloudline. They knew you were coming: they're up on the terraces, behind their field walls, and they know every gate in them.",
               "This time you're the ones attacking. Break every company they have. The walls and the high ground favour them, so go through the gates, or round.",
               "Click a blue company, then the ground or a red company. Space pauses."],
        terrain=field(40, 24, terraces),
        commander=dict(name="The clans' war-leader", cast="warden", level=22),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 2]),
            dict(id="foot2", name="Second company", kind="foot", at=[14, 5]),
            dict(id="pikes", name="Pikes", kind="pike", at=[25, 5]),
            dict(id="bows", name="Bows", kind="bow", at=[20, 6]),
            dict(id="riders", name="Kith riders", kind="horse", at=[32, 5]),
        ],
        theirs=[
            dict(id="c-sling1", name="Clan slingers", kind="bow", at=[10, 13], officer="archer", level=21),
            dict(id="c-sling2", name="Clan slingers", kind="bow", at=[29, 13], officer="archer", level=21),
            dict(id="c-spears", name="Clan spears", kind="pike", at=[19.5, 13.5], officer="warden", level=22),
            dict(id="c-foot", name="Terrace men", kind="foot", at=[12, 19], officer="warden", level=21),
            dict(id="c-foot2", name="Terrace men", kind="foot", at=[27, 19], officer="warden", level=20),
            dict(id="c-herd", name="Herders on loftbucks", kind="horse", at=[28, 20], officer="warden", level=22),
        ],
        plan=[
            dict(when="contact", note="They hold the walls. When you close, the terrace men come down through the west gate behind their slingers.", orders=[
                dict(company="c-foot", via=[12, 16.5], to=[10, 13])]),
            dict(when="half", note="If the first wall goes, their herders ride out of the east gate at whatever is nearest.", orders=[
                dict(company="c-herd", via=[27, 16.5], to=[30, 9])]),
        ],
        stratagems=[
            dict(id="fog", name="Come up in the morning fog", text="March by night and be under their walls before the fog lifts. The first blow lands before they're sure you're there.",
                 opinions={"skirmisher": "\"The fog lies thick till mid-morning up there.\"", "commander": "\"Fog cuts both ways. Keep the companies close.\""},
                 effect=dict(move={"foot2": [12, 9], "pikes": [25, 9]}, enemyMorale=8)),
            dict(id="riders-round", name="Riders round the east end", text="Your kith riders go round through the trees at the east end and come at the terraces from the side.",
                 opinions={"rider": "\"Loftbucks can climb that. Ours can too.\"", "guardian": "\"And if their herders are waiting there?\""},
                 effect=dict(hide=["riders"], move={"riders": [38, 14]})),
        ],
        won="The terraces are taken", lost="Thrown back from the terraces",
    ),
    "march-millbridge": dict(
        name="The march on Millbridge", attack=True,
        intro=["Millbridge has shut its gate on you. The town militia hold the old bridge and the wall beyond it, with the river in front.",
               "You're attacking: break every company they have. The bridge is narrow; there's a ford further east.",
               "Click a blue company, then the ground or a red company. Space pauses."],
        terrain=field(40, 24, millbridge_field),
        commander=dict(name="The reeve's captain", cast="warden", level=17),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 3]),
            dict(id="foot2", name="Second company", kind="foot", at=[13, 5]),
            dict(id="pikes", name="Pikes", kind="pike", at=[26, 5]),
            dict(id="bows", name="Bows", kind="bow", at=[20, 7]),
            dict(id="riders", name="Kith riders", kind="horse", at=[33, 4]),
        ],
        theirs=[
            dict(id="m-bridge", name="Bridge guard", kind="pike", at=[19.5, 12], officer="warden", level=16),
            dict(id="m-bows", name="Town bows", kind="bow", at=[14, 13], officer="archer", level=16),
            dict(id="m-wall1", name="Militia", kind="foot", at=[12, 17], officer="warden", level=16),
            dict(id="m-wall2", name="Militia", kind="foot", at=[27, 17], officer="warden", level=16),
            dict(id="m-wood", name="Wood-watch", kind="bow", at=[34, 12.5], officer="archer", level=16),
        ],
        plan=[
            dict(when="contact", note="They hold the bridge. Once you're across, the militia come out of the gate to push you back into the river.", orders=[
                dict(company="m-wall1", via=[19.5, 15], to=[18, 12]), dict(company="m-wall2", via=[20, 15], to=[22, 12])]),
        ],
        stratagems=[
            dict(id="ford", name="Cross at the east ford by night", text="Your riders and the pikes cross at the ford before dawn and come at the bridge from its own side.",
                 opinions={"rider": "\"The ford's knee-deep this time of year.\"", "commander": "\"Split forces. Be quick about it.\""},
                 effect=dict(move={"riders": [36, 12], "pikes": [33, 13]})),
            dict(id="talk", name="Shout terms across the river", text="Tell them who you are and what you'll do after. Some of the militia knew you when you were their friend.",
                 opinions={"talker": "\"Let me do the shouting.\"", "hero": "\"They're frightened. Frightened men listen.\""},
                 effect=dict(enemyMorale=14)),
        ],
        won="Millbridge opens its gate", lost="Thrown back at the bridge",
    ),
    "march-millcities": dict(
        name="The march on Cinderwick", attack=True,
        intro=["The mill owners of Cinderwick have hired every guard they could and armed their foremen. They hold the canal and the foundry yards behind it.",
               "You're attacking: break every company they have. Two swing bridges cross the cut; the yard wall has three gates.",
               "Click a blue company, then the ground or a red company. Space pauses."],
        terrain=field(40, 24, foundry),
        commander=dict(name="The owners' hired captain", cast="warden", level=20),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 2]),
            dict(id="foot2", name="Second company", kind="foot", at=[10, 3]),
            dict(id="pikes", name="Pikes", kind="pike", at=[30, 3]),
            dict(id="bows", name="Bows", kind="bow", at=[20, 4.5]),
            dict(id="riders", name="Kith riders", kind="horse", at=[35, 2]),
        ],
        theirs=[
            dict(id="h-guard1", name="Hired guards", kind="foot", at=[9.5, 11], officer="warden", level=18),
            dict(id="h-guard2", name="Hired guards", kind="foot", at=[29.5, 11], officer="warden", level=18),
            dict(id="h-xbow", name="Crossbows on the wall", kind="bow", at=[20, 12.5], officer="archer", level=18),
            dict(id="h-pikes", name="Foremen's pikes", kind="pike", at=[19.5, 16.5], officer="warden", level=19),
            dict(id="h-horse", name="Owners' riders", kind="horse", at=[33, 20], officer="warden", level=19),
            dict(id="h-reserve", name="The reserve", kind="foot", at=[8, 20], officer="warden", level=19),
        ],
        plan=[
            dict(when="contact", note="They hold the bridges. When you're over, the foremen's pikes come out of the middle gate.", orders=[
                dict(company="h-pikes", via=[19.5, 14], to=[20, 10.5])]),
            dict(when="half", note="When it goes badly for them, their riders and the reserve come out of the side gates.", orders=[
                dict(company="h-horse", via=[29.5, 14], to=[29.5, 10]), dict(company="h-reserve", via=[9.5, 14], to=[10, 10])]),
        ],
        stratagems=[
            dict(id="mill-hands", name="The mill hands open a gate", text="Someone inside owes the Commons. Your second company slips into the yards before dawn and waits behind the wall.",
                 opinions={"talker": "\"I know a foreman's wife.\"", "guardian": "\"If it's a trap, that company's gone.\""},
                 effect=dict(hide=["foot2"], move={"foot2": [4, 16]})),
            dict(id="swing", name="Swing the east bridge shut", text="A lock-keeper swings the east bridge out of line in the night. They can't come over it at you; you take only the west.",
                 opinions={"artisan": "\"Pull the pin, it swings. Simple.\"", "commander": "\"One bridge is one fight.\""},
                 effect=dict(terrain=[[29, 7, "~"], [30, 7, "~"], [29, 8, "~"], [30, 8, "~"]])),
        ],
        won="The foundry yards fall", lost="Thrown back at the cut",
    ),
    "ashby-mole": dict(
        name="Ashby's harbour mouth", hold=200,
        intro=["The Commons' boats are chained across Port Ashby's harbour mouth, and the harbour council wants them gone.",
               "Ashby's marines are coming out along the mole and wading the shallows at both ends. Rue leads them.",
               "Hold the harbour mouth until the tide turns, or break them."],
        terrain=field(40, 24, harbour),
        commander=dict(name="Rue, captain of Ashby's marines", cast="warden", level=21),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 1]),
            dict(id="boats", name="The boat crews", kind="foot", at=[8, 1.5]),
            dict(id="pikes", name="Pikes", kind="pike", at=[19.5, 2.5]),
            dict(id="bows-w", name="West bows", kind="bow", at=[12, 1]),
            dict(id="bows-e", name="East bows", kind="bow", at=[30, 1]),
        ],
        theirs=[
            dict(id="m-foot1", name="Ashby marines", kind="foot", at=[19.5, 16.5], officer="warden", level=19),
            dict(id="m-foot2", name="Ashby marines", kind="foot", at=[5, 16.5], officer="warden", level=19),
            dict(id="m-foot3", name="Ashby marines", kind="foot", at=[35, 16.5], officer="warden", level=19),
            dict(id="m-xbow", name="Harbour crossbows", kind="bow", at=[15, 17], officer="archer", level=19),
            dict(id="m-guild", name="Guild marines", kind="foot", at=[20, 21], officer="warden", level=20),
        ],
        plan=[
            dict(at=3, note="The marines come up the mole; two more companies wade the shallows at either end; crossbows line the quay.", orders=[
                dict(company="m-foot1", via=[19.5, 12], to=[19.5, 3]), dict(company="m-foot2", via=[4.5, 11], to=[6, 2]),
                dict(company="m-foot3", via=[34.5, 11], to=[33, 2]), dict(company="m-xbow", to=[19.5, 14])]),
            dict(when="half", note="When it falters, the Guild's own marines come up the mole behind them.", orders=[
                dict(company="m-guild", via=[19.5, 12], to=[19.5, 3])]),
        ],
        stratagems=[
            dict(id="fireboat", name="A fire boat down the mole", text="An old lighter full of tar, lit and pushed along the mole's side. Whoever is on the mole when it goes up will not stay there.",
                 opinions={"artisan": "\"Tar, a candle, and a long pole. I've done worse for a wedding.\"", "guardian": "\"Fire on water goes where the wind says. Mind the wind.\""},
                 effect=dict(enemyMorale=12)),
            dict(id="tide", name="Wait for the tide", text="Fight at high water: the shallows are too deep to wade, and everything they send has to come up the mole.",
                 opinions={"scholar": "\"Ashby's tide table is on every tavern wall.\"", "commander": "\"One road in is one fight.\""},
                 effect=dict(terrain=[[x, y, "~"] for x in list(range(2, 8)) + list(range(32, 38)) for y in range(3, 15)])),
        ],
        won="The harbour mouth holds", lost="Thrown out of the harbour",
    ),
    "spindle-gate": dict(
        name="The Spindle gate", attack=True,
        intro=["Vantry's outer ward. The Spindle wall stands across the street, with its gate and a postern. Behind it, the ward runs up to the Broodhouse.",
               "You're attacking: break every company they have. The gate is strong; the postern is narrow, and nobody's watching it closely.",
               "Click a blue company, then the ground or a red company. Space pauses."],
        terrain=field(40, 24, spindle),
        commander=dict(name="The Warden colonel of Vantry", cast="warden", level=28),
        ours=[
            dict(id="hq", name="Your company", kind="foot", at=[20, 2]),
            dict(id="varro", name="Varro's company", kind="foot", at=[13, 3]),
            dict(id="bows", name="Bows", kind="bow", at=[20, 5]),
            dict(id="riders", name="Kith riders", kind="horse", at=[33, 2]),
            dict(id="hallet1", name="Hallet's foot", kind="foot", at=[6, 3], unless="hardlinersGone"),
            dict(id="hallet2", name="Hallet's pikes", kind="pike", at=[9, 5], unless="hardlinersGone"),
            dict(id="south", name="The south companies", kind="pike", at=[27, 4], unless="southGone"),
            dict(id="millbridge", name="Millbridge's company", kind="foot", at=[30, 5], unless="millbridgeGone"),
        ],
        theirs=[
            dict(id="v-gate", name="Gate guard", kind="pike", at=[19.5, 10], officer="warden", level=26),
            dict(id="v-wall1", name="Wall crossbows", kind="bow", at=[12, 10], officer="archer", level=26),
            dict(id="v-wall2", name="Wall crossbows", kind="bow", at=[27, 10], officer="archer", level=26),
            dict(id="v-foot1", name="Wardens", kind="foot", at=[10, 17], officer="warden", level=27),
            dict(id="v-foot2", name="Wardens", kind="foot", at=[30, 17], officer="warden", level=27),
            dict(id="v-horse", name="Warden riders", kind="horse", at=[20, 22], officer="warden", level=28),
            dict(id="v-reserve", name="The Broodhouse guard", kind="foot", at=[19.5, 19], officer="warden", level=28),
        ],
        plan=[
            dict(when="contact", note="They hold the gate. Once you're through it, the Wardens in the ward close in from both sides.", orders=[
                dict(company="v-foot1", via=[15, 12], to=[17, 10]), dict(company="v-foot2", via=[25, 12], to=[22, 10])]),
            dict(when="half", note="When it goes badly, their riders and the Broodhouse guard come down the road.", orders=[
                dict(company="v-horse", to=[20, 11]), dict(company="v-reserve", to=[19.5, 12])]),
        ],
        stratagems=[
            dict(id="ladders", name="Ladders on the wall", text="Light scaling ladders, carried up in the dark. Your pikes and bows go over the wall either side of the gate while it's still shut.",
                 opinions={"artisan": "\"Light enough for a child to carry. That was the point.\"", "guardian": "\"Ladders are slow. Slow is dead, under crossbows.\""},
                 effect=dict(move={"bows": [14, 9.5]}, enemyMorale=6)),
            dict(id="postern", name="The postern, before dawn", text="A company goes through the postern in the last of the dark, and comes at the gate guard from behind.",
                 opinions={"skirmisher": "\"Nobody watches a postern. Nobody ever has.\"", "commander": "\"And if it's watched, that company's alone.\""},
                 effect=dict(hide=["varro"], move={"varro": [6, 11]})),
            dict(id="runaways", name="The runaways open the drains", text="Posy's runaways have been in the ward for a week. At the first push they set the Wardens' stores alight and shout that the Commons is in the drains.",
                 opinions={"talker": "\"Children are the best spies in Vantry. Nobody looks at them.\"", "hero": "\"Not one of them goes near a fight.\""},
                 effect=dict(enemyMorale=14)),
        ],
        won="The Spindle gate falls", lost="Thrown back from the Spindle gate",
    ),
}


def main():
    out = {"note": "Army battles; generated by tools/army/gen.py", "battles": {}}
    for bid, b in BATTLES.items():
        rows = b["terrain"]
        for r in rows: assert len(r) == len(rows[0])
        for c in b["ours"] + b["theirs"]:
            ch = rows[int(c["at"][1])][int(c["at"][0])]
            assert LEGEND[ch] not in ("water", "wall"), f"{c['id']} starts on {ch}"
        out["battles"][bid] = {"id": bid, "legend": LEGEND, **b}
    json.dump(out, open(os.path.join(ROOT, "data", "army", "battles.json"), "w"), indent=1, ensure_ascii=False)
    for k in ("march-cloudline","march-millbridge","march-millcities"):
        print(k)
        for r in BATTLES[k]["terrain"]: print(r)


if __name__ == "__main__":
    main()
