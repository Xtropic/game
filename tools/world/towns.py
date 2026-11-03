#!/usr/bin/env python3
"""The towns in the lands Rhea can reach in the first summer that the story doesn't otherwise use.

Mathew (2026-11-03): every town in a region that's open should be open too, unless the story blocks it.
Each town gets its own small map (data/maps/town-<id>.json) and its people (data/story/towns.json): who lives
there, what they say about the year since Larkfold burned, and a way back out to the land it sits in.
Run: python3 tools/world/towns.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
LEGEND = {
    "T": "tree", ",": "grass", ".": "cobble", ":": "path", "h": "wall", "r": "roof", "d": "door", "w": "well",
    "S": "stall", "H": "hay", "x": "crate", "f": "fence", "~": "water", "=": "bridge", "e": "exit", "C": "cart",
    "F": "campfire", "t": "tent", "R": "rock", "c": "cliff", "m": "moss", "s": "steps", "o": "cave", "*": "flowers",
    "p": "plank", "K": "cloud", "a": "terrace", "b": "table", "/": "trail",
}

# id, land, name, music, rows, people [(id, name, look, x, y, [lines])], signs [(x, y, text)]
# Lines: a string is said by that person; ("", text) is narration.
TOWNS = [
    dict(id="highmoss", land="cloudline", name="Highmoss", music="road", rows=[
        "KKKKKKKKKKKKKKKKKKKKKKKK",
        "KccccccccccccccccccccccK",
        "Kcmmmmmmmmmmmmmmmmmmmm,K",
        "Kcaaaaaaaaaaaaaaaaass,,K",
        "Kc,mmmmmmmmmmmmmmmm,,,,K",
        "Kc,,rrrr,,,,,rrrr,,,,,,K",
        "Kc,,hdhh,,,,,hhdh,,HH,,K",
        "Kc,,::::::::::::::,,HH,K",
        "Kc,,:,,,,,,w,,,,,:,,,,,K",
        "Kc,,::::::::::::::::,,,K",
        "Kc,,,,xx,,,,,,,,,,:,,,,K",
        "KcTT,,,,,,,,,,,,,,:,,TTK",
        "KcTTTTTTTTTTTTTTTT:TTTTK",
        "KKKKKKKKKKKKKKKKKKeeKKKK",
    ], spawn=(18, 12), people=[
        ("hm-gatherer", "Moss gatherer", "vil1", 9, 4, [
            "\"Moss for bedding, moss for wounds. It grows up here because nothing else will.\"",
            "\"The Commons buys all we can cut now. Kane's surgeons pack it into cuts. Better than the Guild paying us in tins.\""]),
        ("hm-widow", "Widow Sorrel", "vil2", 15, 8, [
            "\"Larkfold sang on harvest nights. We could hear it from here, over the cloud. It's been quiet a year.\"",
            "\"If you're from down there, girl, you're welcome to a bowl. Nobody's asked for a song since.\""]),
        ("hm-boy", "Tobin", "vil3", 6, 9, [
            "\"Ma says the grey coats came up the cloud path. There's no cloud path. I've looked.\""]),
    ], signs=[(11, 8, "A well with a moss-lined bucket. The water up here tastes of stone and cold.")]),

    dict(id="dripstone", land="cloudline", name="Dripstone", music="caves", rows=[
        "RRRRRRRRRRRRRRRRRRRRRR",
        "RRRRoRRRRRRRRRRRRoRRRR",
        "RR,,:,,,,,,,,,,,,:,,RR",
        "RR,,:::::::::::::::,RR",
        "RR,,,,,,,,~~,,,,,:,,RR",
        "RRrrrr,,,,~~,,rrrr:,RR",
        "RRhhdh,,,,~~,,hdhh:,RR",
        "RR,,:::::::==:::::::RR",
        "RR,,,,,,,,~~,,,,,,,,RR",
        "RR,xx,,,,,~~,,,,,SS,RR",
        "RR,,,,,,,,~~,,,,,,,,RR",
        "RRTT,,,,,,~~,:,,,,TTRR",
        "RRTTTTTTTT~~T:TTTTTTRR",
        "RRRRRRRRRRRRReeRRRRRRR",
    ], spawn=(13, 12), people=[
        ("ds-keeper", "Spring keeper", "vil4", 6, 7, [
            "\"Every drop in this village has been through the mountain first. Takes forty years, they say.\"",
            "\"The Guild wanted the springs for a hatchery. Brood rooms need warm water. The caves are too cold for them, thank the stone.\""]),
        ("ds-seller", "Water seller", "vil5", 16, 8, [
            "\"Mineral water. Good for the raw, people say. It isn't. Nothing is. But it's something to hold in your hands.\""]),
        ("ds-girl", "Nell", "kid2", 12, 10, [
            "\"There's a cave that sings when the wind's right. Like someone humming under the hill.\"",
            ("", "Ash's ears go flat at the cave mouth, then forward again.")]),
    ], signs=[(4, 2, "A cave mouth, dripping. Someone has chalked tally marks inside: days, or people.")]),

    dict(id="mistfold", land="cloudline", name="Mistfold", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,ffffffffff,,,rrrr,,,,T",
        "T,f,,,,,,,,f,,,hhdh,,,,T",
        "T,f,,,,,,,,f,,,,::,,,,,T",
        "T,f,,,,,,,,f::::::,,,,,T",
        "T,ffff::ffff:,,,,,,HH,,T",
        "T,,,,,::::::::,,,,,HH,,T",
        "T,rrrr,,,,,,,:,,,,,,,,,T",
        "T,hdhh,,,,w,,:,,rrrr,,,T",
        "T,,:::::::::::::hhhd,,,T",
        "T,,,,,,,,,,,,:,,,,,:,,,T",
        "TTTTTTTTTTTTT:TTTTT:TTTT",
        "TTTTTTTTTTTTTeeTTTTTTTTT",
    ], spawn=(13, 12), people=[
        ("mf-herder", "Loftbuck herder", "vil6", 12, 5, [
            "\"The mist sits in the fold all summer. The bucks like it. Keeps the flies off and the Wardens lost.\"",
            "\"A Warden came through in spring asking for Larkfold folk. We sent him round the fold three times. He went home wet.\""]),
        ("mf-buck", "", "loftbuck", 6, 4, [
            ("", "A big loftbuck, half asleep in the mist. It sniffs Ash, decides she's no trouble, and goes back to sleep.")]),
        ("mf-old", "Old Fen", "vil7", 8, 10, [
            "\"I wore a lull once, after the fall that did my hip. Six months. I've still got the rings.\"",
            "\"Took me a whole winter of the raw to come off it. I'd not wish that on a Warden.\""]),
    ], signs=[(10, 9, "The well is wrapped in old fleece against the frost.")]),

    dict(id="kerrow", land="vale", name="Kerrow", music="road", rows=[
        "cccccccccccccccccccccccccc",
        "c,,,rrrr,,,,,,,,,rrrr,,,,c",
        "c,,,hhdh,,,,,,,,,hdhh,,,,c",
        "c,,,,::::::::::::::,,,,,,c",
        "c,,,,:,,,,,,,,,,,,,,,,,,,c",
        "c~~~~~~~~~~==~~~~~~~~~~~~c",
        "c~~~~~~~~~~==~~~~~~~~~~~~c",
        "c,,,,,,,,,,::,,,,,,,,,,,,c",
        "c,,rrrr,,,,::,,,,SS,,xx,,c",
        "c,,hdhh,,,,::::::,,,,,,,,c",
        "c,,,::::::::,,,,,,,,,,,,,c",
        "c,,,,,,,,,,::,,,,,,,,,TT,c",
        "cTTTTTTTTTT::TTTTTTTTTTTTc",
        "ccccccccccceeccccccccccccc",
    ], spawn=(11, 12), people=[
        ("kr-ferry", "Bridge warden", "vil1", 12, 7, [
            "\"Kerrow's bridge, Kerrow's toll. One copper, or a song, or a good story. Commons go free since spring.\""]),
        ("kr-smith", "Smith Garra", "vil4", 18, 9, [
            "\"I shoe the Guild's cart horses and I shoe the Commons' too. A horse doesn't pick a side.\"",
            "\"But I put the Guild's nails in a little crooked. Don't tell anyone.\""]),
        ("kr-mother", "Annick", "vil2", 7, 3, [
            "\"The indenture carts take the gorge road because it's quiet. My eldest went on one, two winters back.\"",
            ("from", "a3", "\"You're with the Commons now? If you ever stop one of those carts, would you look for a boy called Dell? Freckles. Laughs like a goose.\"")]),
    ], signs=[(5, 4, "Gorge walls on both sides. The river under the bridge is loud enough to talk under.")]),

    dict(id="ropebridge", land="vale", name="Ropebridge", music="road", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,rrrr,,,,,,,,,,rrrr,,T",
        "T,,hhdh,,,,,,,,,,hdhh,,T",
        "T,,,,:::::::::::::,,,,,T",
        "T,,,,,,,,,,::,,,,,,,,,,T",
        "ccccccccccc::ccccccccccc",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "ccccccccccc::ccccccccccc",
        "T,,,xx,,,,,::,,,,,HH,,,T",
        "T,,,,,,,,,,::,,,,,,,,,,T",
        "TTTTTTTTTTT::TTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTT",
    ], spawn=(11, 12), people=[
        ("rb-ropemaker", "Ropemaker Hask", "vil5", 13, 10, [
            "\"Every rope in that bridge, I twisted. Walk it slow and don't look down. Down is a long way.\"",
            "\"Hask's my name, not the village. The village was further west. I don't talk about it.\""]),
        ("rb-girl", "Wren", "kid", 9, 4, [
            "\"I can run the bridge in eleven steps. Ma says if she sees me do it again she'll tie me to the post.\""]),
        ("rb-lookout", "Lookout", "vil3", 18, 3, [
            "\"From here you can see the whole Vale on a clear day. Millbridge, the weir, the Sallow chimneys.\"",
            "\"Those chimneys smoke day and night. My cousin says it's the boilers. Brood rooms have to be hot as summer.\""]),
    ], signs=[(12, 8, "The rope bridge sways under Rhea's weight. Far below, the gorge is full of cloud.")]),

    dict(id="weirbank", land="vale", name="Weirbank", music="town", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrrr,,,,rrrr,,,,rrrrr,T",
        "T,hhdhh,,,,hdhh,,,,hhhdh,T",
        "T,,,:,,,,,,,:,,,,,,,,,:,,T",
        "T,,,::::::::::::::::::::,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "T~~~~~~~~~~~=~~~~~~~~~~~~T",
        "TRRRRRRRRRRR=RRRRRRRRRRRRT",
        "T~~~~~~~~~~~=~~~~~~~~~~~~T",
        "T,,,,SS,,,,,:,,,,,,xx,,,,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("wb-miller", "Miller Bain", "vil4", 6, 6, [
            "\"The weir turns three wheels. Grain, fulling, and the Guild's saw. Guess which one pays.\"",
            "\"I hear Millbridge buried eleven last year. Larkfold greenlings, they said. I don't believe it. I knew Maren.\""]),
        ("wb-fisher", "Eel fisher", "vil6", 18, 10, [
            "\"Eels come up the weir in autumn. You can stand on the stones and pick them out of the water like apples.\""]),
        ("wb-child", "Pip", "kid3", 14, 4, [
            "\"Is that a real kith? Does it bite? Can I touch it? It's looking at me.\"",
            ("", "Ash allows one pat, then walks behind Rhea's legs.")]),
    ], signs=[(12, 8, "The weir. Water pours over the stones in a long white curtain.")]),

    dict(id="drovers-halt", land="vale", name="Drovers' Halt", music="camp", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrrrrrrr,,,,ffffffff,,T",
        "T,rrrrrrrrr,,,,f,,,,,,f,,T",
        "T,hhhhdhhhh,,,,f,,,,,,f,,T",
        "T,,,,,:,,,,,,,,f,,,,,,f,,T",
        "T,,CC,::::::::,ffff,,ff,,T",
        "T,,CC,,,,,,,::::::::,,,,,T",
        "T,,,,,,F,,,,:,,,,,,,,HH,,T",
        "T,,,,,,,,,,,:,,,,,,,,HH,,T",
        "T,,xx,,,,,,,:,,,,,,,,,,,,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("dh-host", "Innkeeper Marl", "vil7", 6, 5, [
            "\"Drovers' Halt. Last beds before the Drove Road goes up into nothing. The Commons drink here now. They pay, mostly.\"",
            "\"No rooms tonight, sorry. Every bed's full of Kane's lot sleeping off a march.\""]),
        ("dh-drover", "Drover", "vil1", 8, 8, [
            "\"Took forty loftbucks to the Mill Cities in spring. The Guild checkpoint took four of them for 'inspection'. Never saw them again.\"",
            "\"South of the Vale it's all checkpoints now. You need papers to sneeze.\""]),
        ("dh-buck", "", "loftbuck", 18, 4, [
            ("", "A drove loftbuck in the pen, horns wrapped in rag against the wind. It watches Ash with polite interest.")]),
        ("dh-cat", "", "reedcat", 20, 9, [
            ("", "A reedcat asleep on the hay. It opens one eye at Rhea and closes it again.")]),
    ], signs=[(7, 8, "A drovers' fire, kept in all night. A pot of something brown hangs over it.")]),

    dict(id="longbarrow", land="vale", name="Longbarrow", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,,mmmmmmmmmmmmmmmmmmm,,,T",
        "T,mmmmmmmmmmmmmmmmmmmmmm,T",
        "T,,mmmmmmmmmmmmmmmmmmm,,,T",
        "T,,,,R,,,,,,,,,,,,,,R,,,,T",
        "T,,,,,,::::::::::::,,,,,,T",
        "T,rrrr,:,,,,,,,,,,:,rrrr,T",
        "T,hdhh,:,,*,,,*,,,:,hhdh,T",
        "T,,:::::,,,,,,,,,,::::,,,T",
        "T,,,,,,,,,,,w,,,,,,,,,,,,T",
        "T,,,HH,,,,,,:,,,,,,,xx,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("lb-keeper", "Barrow keeper", "vil5", 11, 6, [
            "\"The long barrow's older than the Guild, older than the Vale's name. Nobody knows who's in it.\"",
            "\"People leave things on it. Rings, mostly. Lull rings, cut off with a knife when somebody finally gets clean.\""]),
        ("lb-farmer", "Farmer Tilde", "vil2", 20, 10, [
            "\"Two of my lads went off to join Kane in the spring. I told them the Commons can't win. They told me nobody ever stopped a Guild cart either.\"",
            ("from", "a4", "\"That cart at Hob's Bend. That was you? With the children? Well. Sit down, then. There's bread.\"")]),
        ("lb-boy", "Ansel", "kid", 4, 9, [
            "\"If you lie on the barrow at night you can hear it breathing. Ansel's brother says so. I'm Ansel.\""]),
    ], signs=[(5, 5, "A standing stone at the barrow's end. Dozens of little iron rings hang from a nail in it.")]),
]

LOOKS_NOTE = "vil1..vil7 are defined in src/art/people.ts"


ORDER = [s for s in json.load(open(os.path.join(ROOT, "data", "world", "gates.json")))["order"] if s.startswith("a")]


def main():
    lands = {l: json.load(open(os.path.join(ROOT, "data", "maps", f"land-{l}.json"))) for l in ("cloudline", "vale")}
    story = {"id": "towns", "title": "The open towns", "voiced": [], "cast": {}, "objectives": {}, "actors": [], "steps": [],
             "zones": [], "looks": [], "songs": [], "hazards": [], "scripts": {}}
    for t in TOWNS:
        rows = t["rows"]; w = len(rows[0])
        for i, r in enumerate(rows):
            assert len(r) == w, f"{t['id']} row {i} is {len(r)} wide, not {w}"
            for ch in r: assert ch in LEGEND, f"{t['id']}: unknown tile {ch!r}"
        legend = {k: v for k, v in LEGEND.items() if any(k in r for r in rows)}
        sx, sy = t["spawn"]
        entities = [{"id": "start", "kind": "spawn", "x": sx, "y": sy}]
        for i, (x, y, text) in enumerate(t["signs"]):
            entities.append({"id": f"{t['id']}-sign{i}", "kind": "sign", "x": x, "y": y, "props": {"text": text}})
        mid = f"town-{t['id']}"
        json.dump({"id": mid, "name": t["name"], "music": t["music"], "legend": legend, "rows": rows, "entities": entities},
                  open(os.path.join(ROOT, "data", "maps", f"{mid}.json"), "w"), indent=1)
        land = lands[t["land"]]
        place = next(p for p in land["places"] if p["id"] == t["id"])
        # in from the world map, out by the exit tiles at the bottom
        story["steps"].append({"map": f"land-{t['land']}", "at": [place["x"], place["y"]],
                               "do": [{"goto": {"map": mid, "x": sx, "y": sy - 1, "facing": "up"}}], "when": {"stagePrefix": "a"}})
        for x, ch in enumerate(rows[-1]):
            if ch == "e":
                story["steps"].append({"map": mid, "at": [x, len(rows) - 1],
                                       "do": [{"goto": {"map": f"land-{t['land']}", "x": place["x"], "y": place["y"] + 1, "facing": "down"}}]})
        for pid, name, look, x, y, lines in t["people"]:
            assert rows[y][x] in ",.:*m/", f"{pid} stands on {rows[y][x]!r}"
            talk = []
            for ln in lines:
                if isinstance(ln, tuple) and ln[0] == "from":  # only once the story has got that far
                    talk.append({"if": {"stage": ORDER[ORDER.index(ln[1]):]}, "then": [{"say": pid, "text": ln[2]}]})
                elif isinstance(ln, tuple): talk.append({"say": "", "text": ln[1]})
                else: talk.append({"say": pid, "text": ln})
            if name: story["cast"][pid] = name
            story["actors"].append({"id": pid, "map": mid, "x": x, "y": y, "look": look, "when": {"stagePrefix": "a"}, "talk": talk})
        for x, y, _ in t["signs"]:
            assert rows[y][x] not in "~K", f"{t['id']} sign at {x},{y}"
    json.dump(story, open(os.path.join(ROOT, "data", "story", "towns.json"), "w"), indent=1)
    print(len(TOWNS), "towns")


if __name__ == "__main__":
    main()
