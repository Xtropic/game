"""Shy wild kith on the world map: they never fight, they bolt when anyone comes close, and they only come to
bait they like, left by someone who then keeps still. Writes data/story/wild.json.

Each spot: a kith grazing in the open, and a wide ring around it. Walking into the ring startles it into
watching you; then you can leave something out for it. The right food brings it to you; anything else and it
keeps its distance (walk out of the ring and back in to try again). The hint says what it wants without naming it.
"""
import json, os

OFFERS = ["salt lick", "dried fish", "honey bread", "cave moss"]   # src/kith/befriend.ts OFFERS
SPOTS = [
    # id, map, x, y, species, look, level, food, what it is doing (the hint), where it goes
    ("terrace-doe", "land-cloudline", 30, 7, "terrace-doe", "loftbuck", 3, "salt lick",
     "A terrace doe is grazing at the far side of the meadow, small and russet, with a white throat. It lifts its head.",
     "It keeps going back to lick at a bare grey rock, where salt has dried in the cracks.", "the terraces"),
    ("fog-reedcat", "land-cloudline", 53, 8, "fog-reedcat", "reedcat", 4, "dried fish",
     "Something grey moves at the edge of the cloud forest: a reedcat, so pale it's hard to see against the mist. Its eyes find you.",
     "It's nosing at the bones of a trout someone cooked here and left.", "the cloud"),
    ("drove-buck", "land-vale", 66, 4, "drove-loftbuck", "loftbuck", 5, "salt lick",
     "A drove buck stands on the rise, shaggy and heavy-horned, left behind by some herd. It stamps once.",
     "Where the drovers camp, it has licked the stones pale.", "the hills"),
]

def spot(sid, mp, x, y, species, look, level, food, seen, hint, away):
    flag = f"kith.shy-{sid}"
    name = seen.split(":")[0]
    kind = {"terrace-doe": "doe", "fog-reedcat": "reedcat", "drove-buck": "buck"}[sid]
    options = []
    for f in OFFERS:
        if f == food:
            do = [{"say": "", "text": f"You set the {f} on a flat stone, back away downwind, and sit very still."},
                  {"fade": "An hour later."},
                  {"say": "", "text": f"The {kind} comes, one careful step at a time. It eats. When it's done it looks at you for a long moment, and doesn't run."},
                  {"say": "", "text": "When you get up to go, it follows."},
                  {"kith": {"species": species, "level": level, "id": f"shy-{sid}"}}]
        else:
            do = [{"say": "", "text": f"You set the {f} down and wait, downwind and still. The {kind} lifts its nose, and stays where it is. Whatever it wants, that isn't it."}]
        options.append({"label": f"Leave out {f}", "do": do})
    options.append({"label": "Walk on", "do": [{"say": "", "text": f"You leave it be. The {kind} watches you until you're gone."}]})
    script = [{"say": "", "text": seen}, {"say": "", "text": f"One step closer and it will be gone into {away}. {hint}"},
              {"choose": "Leave something out for it, and keep still?", "options": options}]
    actor = {"id": f"shy-{sid}", "map": mp, "x": x, "y": y, "look": look, "when": {"not": flag},
             "talk": [{"say": "", "text": f"The {kind} bolts before you're close."}]}
    zone = {"map": mp, "area": [x - 3, y - 3, x + 3, y + 3], "when": {"not": flag}, "do": [{"run": f"shy_{sid.replace('-', '_')}"}]}
    return actor, zone, (f"shy_{sid.replace('-', '_')}", script)

actors, zones, scripts = [], [], {}
for s in SPOTS:
    a, z, (k, v) = spot(*s); actors.append(a); zones.append(z); scripts[k] = v
out = {"id": "wild", "title": "Shy kith", "voiced": [], "cast": {}, "objectives": {}, "actors": actors, "steps": [], "zones": zones,
       "looks": [], "songs": [], "hazards": [], "scripts": scripts, "moods": {"scenes": {k: "tender" for k in scripts}, "stages": {}}}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "story", "wild.json")
json.dump(out, open(path, "w"), indent=1)
print("wrote", len(SPOTS), "shy kith")
