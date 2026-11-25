#!/usr/bin/env python3
"""Small maps for the places where recruits live that had no map of their own yet: Highspire in Vael, the Salt House,
Cinder Landing on Osk, the Wandering Herd's camp at Summer Fold, and Roost Foot under the Storm Roost.

The ways in from the world map and the people who stand in them are written by tools/story/recruits.py
(data/story/recruits.json), which imports PLACES from here. Run: python3 tools/world/recruitmaps.py
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from towns import LEGEND, check  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")

# id, land, name, music, rows, spawn, signs [(x, y, text)]
PLACES = [
    dict(id="highspire", land="vael", name="Highspire", music="dusk", rows=[
        "KKKKKKKKKKKKKKKKKKKKKKKK",
        "KKKRRRRRKKKKKKKKRRRRRKKK",
        "KKR,,,,,RKKKKKKR,,,,,RKK",
        "KKR,rrr,RKKKKKKR,rrr,RKK",
        "KKR,hdh,========,hdh,RKK",
        "KKR,,:,,RKKKKKKR,,:,,RKK",
        "KKKR,:,RKKKKKKKKR,:,RKKK",
        "KKKKR:RKKKKKKKKKKR:RKKKK",
        "KKKKR:RRRRRRRRRRRR:RKKKK",
        "KKKKR::::::::::::::RKKKK",
        "KKKKR,,,*,,F,,,*,,,RKKKK",
        "KKKKR,,,,,,,,,,,,,,RKKKK",
        "KKKKRRRRRRR::RRRRRRRKKKK",
        "KKKKKKKKKKKeeKKKKKKKKKKK",
    ], spawn=(11, 12), signs=[(11, 10, "A fire in a ring of white stones, kept in. The smoke goes straight up and vanishes into the cloud.")]),

    dict(id="salt-house", land="coast", name="The Salt House", music="dusk", rows=[
        "~~~~~~~~~~~~~~~~~~~~~~~~",
        "~,,,,,,,,,,,,,,,,,,,,,,~",
        "~,hhhhhhhhh,,,~~~~~~~,,~",
        "~,hhhhhhhhh,,,~~~~~~~,,~",
        "~,hhhhdhhhh,,,~~~~~~~,,~",
        "~,,,,,:,,,,,,,,,,,,,,,,~",
        "~,,,,,::::::::::::::,,,~",
        "~,xx,,,,,,,:,,,,,,,:,,,~",
        "~,xx,,~~~~,:,~~~~~,:,xx~",
        "~,,,,,~~~~,:,~~~~~,:,,,~",
        "~,,,,,,,,,,:,,,,,,,:,,,~",
        "~,,,,,,,,,,:::::::::,,,~",
        "~~~~~~~~~~~:~~~~~~~~~~~~",
        "~~~~~~~~~~~e~~~~~~~~~~~~",
    ], spawn=(11, 12), signs=[(3, 7, "Salt, stacked in blocks the size of a child and wrapped in reed matting. Each block has a year scratched into it."),
                              (12, 8, "A salt pan, white at the edges, pink in the middle where the brine is deepest.")]),

    dict(id="cinder-landing", land="coast", name="Cinder Landing", music="dusk", rows=[
        "RRRRRRRRRRRRRRRRRRRRRRRR",
        "RRRRRRRRRccccccRRRRRRRRR",
        "RR,,,,,,ccFFFFcc,,,,,,RR",
        "RR,rrrr,,cccccc,,rrrr,RR",
        "RR,hhdh,,,,,,,,,,hdhh,RR",
        "RR,,,:,,,,,,,,,,,,:,,,RR",
        "RR,,,::::::::::::::,,,RR",
        "RR,rrrr,,,,,:,,,,,rrrrRR",
        "RR,hdhh,,,,,:,,,,,hhdhRR",
        "RR,,:,,,,,,,:,,,,,,:,,RR",
        "RR,,::::::::::::::::,,RR",
        "~~~~~~~~~~ppp~~~~~~~~~~~",
        "~~~~~~~~~~ppp~~~~~~~~~~~",
        "~~~~~~~~~~eee~~~~~~~~~~~",
    ], spawn=(11, 12), signs=[(11, 2, "The mountain's mouth, high above the town. It glows at the lip, even in daylight."),
                              (3, 5, "Ash on every step, swept into neat grey heaps at the doors. Somebody sweeps it every morning.")]),

    dict(id="summer-fold", land="east", name="Summer Fold", music="road", rows=[
        "hhhhhhhhhhhhhhhhhhhhhhhh",
        "h,,,,,,,,,,,,,,,,,,,,,,h",
        "h,ffffffff,,,,,tt,,tt,,h",
        "h,f,,,,,,f,,,,,,,,,,,,,h",
        "h,f,,HH,,f,,,,,,,F,,,,,h",
        "h,f,,,,,,f,,,,,,,,,,,,,h",
        "h,ffff,fff,,,tt,,,,,tt,h",
        "h,,,,,:,,,,,,,,,,,,,,,,h",
        "h,,,,,:::::::::::::,,,,h",
        "h,,tt,,,,,,:,,,,,,:,,,,h",
        "h,,,,,,,,,,:,,,,,,:,,,,h",
        "h,,,,,,,,,,::::::::,,,,h",
        "hhhhhhhhhhh:hhhhhhhhhhhh",
        "hhhhhhhhhhheehhhhhhhhhhh",
    ], spawn=(11, 12), signs=[(17, 4, "A dung fire under an iron pot. Herd tea: butter, salt, and something bitter that grows on the plateau."),
                              (5, 4, "Fodder, cut and stacked. The herd will move on before it's eaten.")]),

    dict(id="roost-foot", land="north", name="Roost Foot", music="caves", rows=[
        "cccccccccccccccccccccccc",
        "cRRRRRRRRRRssRRRRRRRRRRc",
        "cR,,,,,,,,,ss,,,,,,,,,Rc",
        "cR,,RR,,,,,ss,,,,,RR,,Rc",
        "cR,,,,,,,,,::,,,,,,,,,Rc",
        "cR,rrrr,,,,:,,,,,,,,,,Rc",
        "cR,hhdh,,,,:,,,,,xx,,,Rc",
        "cR,,,:,,,,,:,,,,,,,,,,Rc",
        "cR,,,::::::::,,,,,,,,,Rc",
        "cR,,,,,,,,,:,,,,,RR,,,Rc",
        "cRR,,,,,,,,:,,,,,,,,,RRc",
        "ccRR,,,,,,,:,,,,,,,,RRcc",
        "cccRRRRRRRR:RRRRRRRRRccc",
        "ccccccccccceeccccccccccc",
    ], spawn=(11, 12), signs=[(12, 1, "Steps cut into the rock, going up into the cloud. The wind comes down them like water down a gutter."),
                              (18, 6, "Wire, coiled in a crate. Copper, bright where it's been cut.")]),
]

# The people who live there besides the recruits: (id, look, x, y, what Rhea sees and hears), narrated.
FOLK = {
    "highspire": [
        ("hs-weaver", "vil5", 6, 10, "An old man is weaving mistwing feathers into a cloak, one at a time, humming. He stops when he sees a lowlander, then starts again."),
        ("hs-child", "vil3", 16, 11, "A child is lying on her front at the edge of the spire, looking down into the cloud. \"There's a whole country under there,\" she says. \"I've never been.\""),
        ("hs-keeper", "vil6", 4, 5, "A woman is feeding a mistwing chick from her own mouth, like a bird. She doesn't stop to talk.")],
    "salt-house": [
        ("sh-raker", "vil1", 16, 10, "A salt raker leans on his rake. \"Rain's the enemy. Rain and the Guild. The Guild's further off.\""),
        ("sh-girl", "vil2", 20, 5, "A girl is licking a salt block, very seriously, while her mother isn't looking.")],
    "cinder-landing": [
        ("cl-sweeper", "vil4", 4, 6, "An old woman is sweeping ash off her step. Her neck is ringed with old pale scars. \"Every morning,\" she says. \"The mountain doesn't care. Neither do I.\""),
        ("cl-fisher", "vil1", 17, 9, "A fisherman is mending a net with his collar open. Nobody on Osk buttons a collar.")],
    "summer-fold": [
        ("sf-herder", "vil1", 13, 9, "A herder is watching the plateau. \"The matriarch decides where we go. We follow. It's restful, not deciding.\""),
        ("sf-child", "vil3", 20, 4, "A small child is riding an ironback calf round the pen, bareback, and falling off, and getting back on.")],
    "roost-foot": [
        ("rf-carter", "vil4", 15, 8, "A carter is unloading copper wire. \"Thal buys it by the mile. Says it keeps the lightning off. I don't ask.\""),
        ("rf-shepherd", "vil6", 4, 10, "A shepherd is counting sheep that won't stay still. \"Storm's coming,\" he says. \"It's always coming. That's the Roost.\"")],
}


def main():
    for p in PLACES:
        rows = p["rows"]; check(rows, p["id"])
        legend = {k: v for k, v in LEGEND.items() if any(k in r for r in rows)}
        sx, sy = p["spawn"]
        assert rows[sy][sx] in ",.:p", f"{p['id']} spawn on {rows[sy][sx]!r}"
        entities = [{"id": "start", "kind": "spawn", "x": sx, "y": sy}]
        for i, (x, y, text) in enumerate(p["signs"]):
            assert rows[y][x] not in "~K", f"{p['id']} sign at {x},{y}"
            entities.append({"id": f"{p['id']}-sign{i}", "kind": "sign", "x": x, "y": y, "props": {"text": text}})
        mid = f"town-{p['id']}"
        json.dump({"id": mid, "name": p["name"], "music": p["music"], "rest": True, "legend": legend, "rows": rows, "entities": entities},
                  open(os.path.join(ROOT, "data", "maps", f"{mid}.json"), "w"), indent=1)
    print(len(PLACES), "recruit places")


if __name__ == "__main__":
    main()
