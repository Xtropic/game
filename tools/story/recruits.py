#!/usr/bin/env python3
"""Builds data/story/recruits.json: a way to join for every recruit in data/cast/recruits.json that the acts and the
Long Road don't already bring in themselves (Mathew 2026-11-25: "Make sure all recruitable characters are in fact
recruitable"). Each recruit's "how" in recruits.json is the brief for their scene here.

Every scene is a person standing somewhere Rhea can walk to, in a window of the story, with the choice their brief
names. Joining is the flag recruited.<id> (people who travel also {"join": id}). Places with no map of their own
yet are made by tools/world/recruitmaps.py. tests/unit/recruits.test.ts checks that every recruit has a way in.

Run: python3 tools/world/recruitmaps.py && python3 tools/story/recruits.py"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "world"))
from act2 import say, n, stage, run, fade, goto, setf, add, toast, iff, opt, choose, R  # noqa: E402,F401
from recruitmaps import FOLK, PLACES  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "../..")
OUT = os.path.join(ROOT, "data/story/recruits.json")
RECRUITS = {r["id"]: r for r in json.load(open(os.path.join(ROOT, "data/cast/recruits.json")))}

# ------------------------------------------------------------------ when: windows of the story
ORDER = json.load(open(os.path.join(ROOT, "data/world/gates.json")))["order"]
CORRAN_STAGES = ("ac", "ae", "ai", "ag")  # Corran's own chapters: Rhea isn't walking about
RHEA = [s for s in ORDER if not s.startswith(CORRAN_STAGES)]


def span(a, b=None):
    """Rhea's stages from a through b (to the end of the story if b is None)."""
    i = RHEA.index(a); j = RHEA.index(b) + 1 if b else len(RHEA)
    return RHEA[i:j]


def when(stages, **c):
    out = {"stage": stages, "hero": "rhea"}
    out.update({k: v for k, v in c.items() if v is not None})
    return out


ACT1 = span("a1b", "a7c")
ACT2 = span("ab1", "ab26")
ROAD = span("ah0", "ah42")
BEFORE_ACT4 = span("a1b", "ah42")

# ------------------------------------------------------------------ where: free ground on a map
TILES = open(os.path.join(ROOT, "src/world/map.ts")).read()
SOLID = {k: s == "true" for k, s in re.findall(r'(\w+): \{ kind: "\w+", solid: (true|false)', TILES)}
NOT_STAND = {"door", "exit", "gate", "innerdoor", "cave", "ladder", "bridge"}
_taken = {}


def _maps(mid):
    return json.load(open(os.path.join(ROOT, "data/maps", f"{mid}.json")))


def _occupied(mid):
    if mid not in _taken:
        t = set()
        for f in os.listdir(os.path.join(ROOT, "data/story")):
            if f in ("recruits.json", "side.json") or not f.endswith(".json"): continue  # side.py places its own after these
            d = json.load(open(os.path.join(ROOT, "data/story", f)))
            t |= {(a["x"], a["y"]) for a in d["actors"] if a["map"] == mid}
            t |= {tuple(s["at"]) for s in d["steps"] if s["map"] == mid}
        m = _maps(mid)
        t |= {(e["x"], e["y"]) for e in m["entities"]}
        t |= {(e["x"], e["y"] - 1) for e in m["entities"] if e["kind"] == "spawn"}
        _taken[mid] = t
    return _taken[mid]


def spot(mid, x, y):
    """The nearest tile to (x, y) a person can stand on that nobody else uses."""
    m = _maps(mid); rows, legend = m["rows"], m["legend"]
    best = None
    for yy in range(len(rows)):
        for xx in range(len(rows[0])):
            k = legend.get(rows[yy][xx])
            if k is None or SOLID.get(k, True) or k in NOT_STAND or (xx, yy) in _occupied(mid): continue
            d = abs(xx - x) + abs(yy - y)
            if best is None or d < best[0]: best = (d, xx, yy)
    assert best, f"no room on {mid}"
    _occupied(mid).add((best[1], best[2]))
    return best[1], best[2]


# ------------------------------------------------------------------ helpers
S, actors, zones, steps = {}, [], [], []
cast = {}


def actor(id, mid, x, y, look, script, w):
    x, y = spot(mid, x, y)
    actors.append({"id": id, "map": mid, "x": x, "y": y, "look": look, "when": w, "talk": [run(script)]})


def joins(id, travels=None):
    """The recruit joins: a flag (they serve at Thornwick or with the Commons), and on the road with Rhea if they travel."""
    r = RECRUITS[id]
    travels = r["role"] == "party" if travels is None else travels
    out = [setf({f"recruited.{id}": True})]
    if travels: out.append({"join": id})
    return out


def pay(coin, then, els):
    return {"pay": coin, "then": then, "else": els}


def kith(species, level, id, name):
    return {"kith": {"species": species, "level": level, "id": id, "name": name}}


for rid, r in RECRUITS.items():
    cast[rid] = r["name"]


# ================================================================== ACT I: the Commons camp and the vale
CAMP, MB, WHARF = "camp", "millbridge", "millbridge--wharf"

# ---- Lanto: asleep on his post
S["lanto"] = [
    iff({"not": "lantoCovered"}, [
        n("Lanto is on the kith-line picket, leaning on his bow. He's asleep on his feet, the way soldiers learn to be, with his chin on his chest."),
        n("Across the lines, a lantern is coming. Kane's sergeant of the watch, doing his round. Sleeping on a picket is a flogging in the Commons. Two, if a kith gets loose."),
        choose("The lantern is fifty paces off.",
               opt("Take his post", [
                   n("Rhea takes the bow out of his hands, stands where he stood, and nudges him into the dark behind the lines with her boot."),
                   n("The lantern comes level. The sergeant looks at her, and at the bow, and at the picket roster in his hand."),
                   say("rhea", R("Lanto's gone to the latrine. I said I'd hold it.")),
                   n("The sergeant grunts and goes on. When the lantern is gone, Lanto comes back out of the dark. He doesn't say anything for a long time."),
                   say("lanto", R("I haven't slept in four nights. My sister's in an indenture house in Spindlegate. I keep thinking about what time it is there.")),
                   say("lanto", R("I owe you a flogging. I'll pay it back. You'll see.")),
                   setf({"lantoCovered": True}), *joins("lanto"),
                   toast("Lanto joins Rhea's company."),
               ], hint="Lie for him."),
               opt("Wake him", [
                   n("She kicks his ankle. He comes awake all at once, with an arrow half drawn, and sees the lantern, and goes white."),
                   n("He's standing straight when the sergeant gets there. It's enough. Nobody is flogged. Nobody is grateful, either."),
                   say("lanto", R("Thanks, Caddow.")),
                   setf({"lantoCovered": "woke"}),
               ], hint="He's not your problem."),
               opt("Let the sergeant find him", [
                   n("Rhea goes back to her own post. Behind her, after a while, she hears the sergeant's voice, and then Lanto's, and then nothing."),
                   n("He's flogged in the morning, in front of the section. He doesn't look at her once."),
                   setf({"lantoCovered": "reported"}),
               ], hint="Rules are rules.")),
    ], [say("lanto", R("Four nights' sleep last week. I'm a new man. A tired new man."))]),
]
actor("lanto-picket", CAMP, 22, 6, "lanto", "lanto", when(span("a2h", "ab26"), **{"not": None}))
actors[-1]["when"]["not"] = "lantoCovered"

# ---- Rafe: caught deserting in the quiet month, and keeping his word
S["rafeFence"] = [
    n("A big man is going over the west fence at dusk with a pack on his back. He gets one leg over and sees Rhea, and stops."),
    say("rafe", R("Don't. Caddow, isn't it? Don't shout.")),
    say("rafe", R("My father died. Word came this morning. There's nobody else to put him in the ground, and the Commons won't give leave to a private for a dead farmer.")),
    say("rafe", R("Four days there, four back. Then I'll come back and they can hang me for going, if they want. I'll come back. On my mother.")),
    choose("Rafe sits on the fence and waits to hear what she'll do.",
           opt("Let him go", [
               say("rhea", R("Four days. If anyone asks, I never saw you.")),
               n("He looks at her as if she's done something he doesn't understand. Then he drops down the far side of the fence and is gone into the dusk."),
               setf({"rafeLet": True}),
           ], hint="Trust him."),
           opt("Call the guard", [
               n("She calls. He doesn't run. He climbs back down off the fence and stands there with his hands open while the guard comes."),
               say("rafe", R("That's fair. That's the army.")),
               n("He spends nine days in the stockade. His father is buried by the neighbours. He deserts properly the week after, and nobody sees him again."),
               setf({"rafeLet": "called"}),
           ], hint="Desertion is desertion.")),
]
S["rafeBack"] = [
    n("Rafe is sitting by the west fence with his pack between his feet, on the inside this time. His boots are white with road dust."),
    say("rafe", R("Buried him under his apple tree. Ten days, not eight. I'm sorry about the two.")),
    say("rafe", R("Nobody's said a word to me. I think nobody noticed. I think you made sure nobody noticed.")),
    say("rafe", R("I'll fight anywhere you say, Caddow. Just tell me where.")),
    *joins("rafe"), toast("Rafe joins Rhea's company."),
]
actor("rafe-fence", CAMP, 2, 8, "rafe", "rafeFence", when(["a5b"], **{"not": "rafeLet"}))
actor("rafe-back", CAMP, 3, 9, "rafe", "rafeBack", when(span("a6c", "ad20"), flag="rafeLet", **{"not": "recruited.rafe"}))
actors[-1]["when"]["eq"] = {"rafeLet": True}

# ---- Juno: the cart inquiry, then Thornwick
S["junoInquiry"] = [
    iff({"not": "junoAsked"}, [
        n("A cart-loftbuck stands on three legs by the farrier's anvil, with a shoe hanging off the fourth. A quartermaster's clerk is writing in a book. The farrier, a big woman in a burnt apron, is standing with her arms folded."),
        say("juno", R("The cart came off the road at Hob's Bend and lamed him. The clerk says I shod him badly. I say the axle was cracked before it left camp, and I told them so.")),
        say("juno", R("They'll take it out of my pay. Three months. I've a boy at the nurses' tent with the cough, and three months is his medicine.")),
        n("Rhea was at Hob's Bend. She remembers the axle: split along the grain, and old, with tar in the crack where someone had tried to hide it."),
        setf({"junoAsked": True}),
        choose("The clerk looks up from his book.",
               opt(R("I saw that axle. It was cracked before the shoe ever came off. There's tar in the split."), [
                   n("The clerk sighs, and crosses something out, and writes something else. The farrier doesn't thank her. She just nods, once, the way you'd nod to someone across a fight."),
                   say("juno", R("Juno. I'll remember it.")),
                   setf({"junoSpoke": True}),
               ], by="rhea", hint="Speak up."),
               opt("Say nothing", [n("It isn't Rhea's business. The clerk writes three months in the book, and the farrier goes back to her anvil without a word.")],
                   hint="Not your business.")),
    ], [iff({"flag": "junoSpoke"}, [say("juno", R("Boy's cough is better. Medicine came this week."))], [n("The farrier is shoeing a loftbuck and doesn't look up.")])]),
]
S["junoThornwick"] = [
    n("Juno climbs down off Dorrit's cart with an anvil wrapped in sacking, which she carries as if it were a loaf."),
    say("juno", R("Thornwick has loftbucks and a road like a goat track. You'll want a farrier. Dorrit says you've none.")),
    say("juno", R("I asked to come. Someone spoke up for me once. I'd sooner shoe for her than for the clerk.")),
    *joins("juno"), toast("Juno joins the Commons at Thornwick."),
]
actor("juno-anvil", CAMP, 18, 11, "juno", "junoInquiry", when(span("a4", "a7c")))
actor("juno-tw", "thornwick", 14, 12, "juno", "junoThornwick", when(span("ab5", "ad20"), flag="junoSpoke", **{"not": "recruited.juno"}))

# ---- Wick: the ferryman's brother's debt
S["wick"] = [
    iff({"not": "wickDone"}, [
        n("A huge ferryman is sitting on the gunwale of his punt with his head in his hands. A Guild agent with a ledger stands on the wharf above him, and two Commons soldiers with him, looking embarrassed."),
        say("wick", R("Wick. You took my ferry across with your section last spring, sergeant. I ferried you for nothing.")),
        say("wick", R("My brother drowned at the weir in the winter. He owed the Guild for his boat. Now the Guild says I owe it, and the Commons says if the Guild's taking the ferry, the Commons will take it first. Requisition.")),
        n("The agent turns a page so Rhea can see it. Twenty-five coin, and the brother's mark at the bottom, a wobbly cross."),
        setf({"wickAsked": True}),
        choose("The soldiers wait for a sergeant to tell them what to do.",
               opt("Pay the debt (25 coin)", [pay(25, [
                   n("Rhea counts it out onto the agent's ledger. He blows on the coins, as if they might be dirty, and writes PAID across the brother's cross."),
                   say("wick", R("That was a lot of coin for a punt.")),
                   say("rhea", R("It's not for the punt.")),
                   n("Wick stands up. The punt rocks. He's even bigger standing."),
                   say("wick", R("The Commons can have the ferry. It can have me with it. Where do you want me?")),
                   setf({"wickDone": "paid"}), *joins("wick"), toast("Wick joins Rhea's company."),
               ], [say("wick", R("You haven't got it either. Nobody has. Go on, sergeant. I'll think of something."))])], hint="Not cheap."),
               opt("Let the section take the ferry", [
                   n("The soldiers take the punt pole out of Wick's hands, quite gently. He lets them. The agent shuts his ledger, because there is nothing left on the river for him to take."),
                   say("wick", R("Mind she pulls left in the current.")),
                   setf({"wickDone": "seized"}),
               ], hint="The Commons needs boats.")),
    ], [iff({"eq": {"wickDone": "paid"}}, [say("wick", R("Best punt on the river, and the Commons got her for twenty-five coin and a ferryman. Bargain."))],
            [n("A Commons soldier is poling Wick's punt across, badly. Wick is nowhere to be seen.")])]),
]
actor("wick-punt", WHARF, 12, 6, "wick", "wick", when(span("a6", "ad20"), **{"not": "recruited.wick"}))

# ---- Yew: the herb bundles and the hut in the cloud
S["yewBundle"] = [
    iff({"not": "yewBundle"}, [
        n("A bundle of herbs, tied with a twist of grass, lying on the fence post by the nurses' tent. Moss for wounds, fever bark, a root Rhea's mother used for sleep."),
        n("The nurses say one turns up every few days. Nobody's seen who leaves them. The grass ties all point the same way: north, to the mountain road."),
        setf({"yewBundle": True}),
        toast("The bundles point north, up the mountain road toward Mistfold."),
    ], [n("Another bundle on the post. Fresh. The grass ties still point north.")]),
]
S["yewHut"] = [
    iff({"not": "yewMet"}, [
        n("A hut at the edge of the cloud forest, low and green, with moss on the roof. A small woman is sitting outside it, sorting roots into a basket. She doesn't get up."),
        say("yew", R("You followed the ties. Nobody's done that in nine years. I tie them to point the wrong way, most of the time. I must be getting old.")),
        say("yew", R("Yew. I grow what your nurses need, and I leave it where they'll find it. That's all. I don't want thanks and I don't want visitors.")),
        say("yew", R("The Guild burned my sister's garden at Highmoss for growing the wrong weeds. If they knew where this one was, they'd burn it too. So.")),
        setf({"yewMet": True}),
        choose("Yew is waiting to hear what kind of person found her.",
               opt(R("Nobody will hear about this hut from me. Not the nurses, not Kane."), [
                   n("Yew looks at her for a long time, then goes back to her roots."),
                   say("yew", R("Your camp burns through fever bark faster than I can grow it. I'll come down and show your nurses what else works. Once. Then I'll see.")),
                   setf({"yewKept": True}), *joins("yew"), toast("Yew joins the Commons."),
               ], by="rhea", hint="Keep her secret."),
               opt(R("The Commons would pay for what you grow. Kane's quartermaster could send a cart up."), [
                   n("Yew puts the root she's holding back in the basket, very carefully."),
                   say("yew", R("Then I'll be gone by the time it gets here. Thank you for coming, captain.")),
                   n("The next time Rhea passes, the hut is empty and the garden is pulled up by the roots."),
                   setf({"yewKept": False, "yewGone": True}),
               ], by="rhea", hint="The camp needs more than a few bundles.")),
    ], [iff({"flag": "yewKept"}, [say("yew", R("Still nobody's come. Good."))], [n("An empty hut, and a garden pulled up by the roots.")])]),
]
actor("yew-bundle", CAMP, 6, 11, "glint", "yewBundle", when(ACT1 + ACT2, **{"not": "yewMet"}))
actor("yew-hut", "town-mistfold", 20, 5, "yew", "yewHut", when(span("a1b", "ad20"), flag="yewBundle", **{"not": "yewGone"}))

# ---- Grue: the toll bridge riddler at Kerrow
RIDDLES = [
    ("What has a neck and no head, and wears a ring and no finger?", "A bottle", "Heard it. My grandmother's. She had it from hers."),
    ("The more you take, the more you leave behind. What are they?", "Footsteps", "Heard it. Every child on the drove road knows that one."),
    ("Three lines to the song, and only the third one's hard. Sing the first two wrong and it still comes. Sing the third wrong and nothing does. What is it?",
     "The foal song", None),
]
S["grue"] = [
    iff({"not": "grueDone"}, [
        n("An old man in a moth-eaten toll keeper's coat sits in a box at the end of the Kerrow bridge, with a chain of keys round his neck. The toll board says: ONE RIDDLE. NO COIN."),
        say("grue", R("Grue. Eighty years on this bridge, and my father before me. I've heard every riddle in Ostrel. Tell me one I don't know, and I'll owe you.")),
        choose("Which riddle does Rhea tell?", *[
            opt(q_, [say("grue", R(heard)), say("grue", R("Try again. I'm not going anywhere."))] if heard else [
                n("Grue opens his mouth to answer. Then he shuts it. Then he opens it again, and nothing comes out."),
                say("grue", R("A song. A song with a wrong line in it, and only one line can be wrong. That's not a riddle. That's a lock.")),
                say("rhea", R("It's how we call the loftbucks in Larkfold. My mother's mother made it.")),
                say("grue", R("Eighty years. Eighty years, and a girl from Larkfold.")),
                n("He takes the chain of keys off his neck and hangs it on the toll board, and climbs out of his box for what looks like the first time in a decade."),
                say("grue", R("I owe you. I've a head full of every old story in this country and nobody to tell them to. Your Commons could use somebody who remembers things.")),
                setf({"grueDone": True}), *joins("grue"), toast("Grue joins the Commons."),
            ], by="rhea") for q_, _, heard in RIDDLES]),
    ], [say("grue", R("What has eighty years and no bridge? Me. Ha."))]),
]
actor("grue-toll", "town-kerrow", 13, 4, "grue", "grue", when(span("a1b"), **{"not": "grueDone"}))

# ---- Edda: the stampede on the lowest terrace (Act I); she joins once the clans' debts are broken
S["eddaStampede"] = [
    iff({"not": "eddaStampede"}, [
        n("A shout from the lowest terrace, and then the ground starts to shake. Wild loftbucks, a whole herd of them, coming down off the ridge in the fog, straight for the moss."),
        n("A clanswoman with wrapped fists and two auburn braids has planted herself in the gap in the terrace wall, alone, waving her arms at a thousand weight of frightened kith."),
        say("edda", R("Don't just stand there, lowlander! If they get through the gap they'll have the whole terrace down the hill!")),
        setf({"eddaStampede": True}),
        choose("The herd is coming.",
               opt("Hold the gap with her", [
                   {"battle": "recruit-stampede", "win": [
                       n("The herd breaks round the wall like water round a stone, and pours away down the ridge into the fog, and the terrace holds."),
                       say("edda", R("Edda. Of the lowest terrace, which is still here. I owe you a terrace.")),
                       say("edda", R("I'd follow you down the mountain, but the clan owes the Guild everything down to its boots, and the Guild would call it running off with its property. One day.")),
                       setf({"eddaHelped": True}),
                   ]},
               ], hint="A fight."),
               opt("Get out of the way", [
                   n("Rhea gets behind a drying shed. The herd goes through the gap. When the fog clears, the lowest terrace is gone, scraped down to the rock, and the clanswoman is sitting in the ruin of it with her fists in her lap."),
               ], hint="It isn't your terrace.")),
    ], [iff({"flag": "eddaHelped"}, [say("edda", R("Still here. The terrace too."))], [n("The lowest terrace is being rebuilt, stone by stone, by one woman with wrapped fists.")])]),
]
S["eddaJoins"] = [
    say("edda", R("The factor's book is ash, and I'm my own woman again. I said I owed you a terrace. I can't carry one. I can carry a sling.")),
    *joins("edda"), toast("Edda joins Rhea's company."),
]
actor("edda-terrace", "town-highmoss", 12, 4, "edda", "eddaStampede", when(ACT1))

# ---- Bee: letters to the moon, and the mistwing post
S["bee"] = [
    iff({"not": "beeDone"}, [
        n("A girl of ten in a pair of flight goggles far too big for her is folding a letter into a paper boat on the weir wall. There are a dozen more in a satchel at her feet."),
        say("bee", R("They go over the weir and down the river and out to sea, and the sea goes up to the sky at the edge, and the moon picks them up. Everybody knows that.")),
        n("Rhea unfolds the next boat before it goes in. It's addressed to MA, AT THE MOON. It says the goat had twins and Bee is being good and please come home from the hatchery soon."),
        say("bee", R("They took Ma for the indenture. Nan says she's at the moon now. I write every week.")),
        choose("Bee is waiting for her boat back.",
               opt(R("Thornwick has a mistwing that carries letters. It goes a lot further than the river. We need someone to run the post."), [
                   n("Bee looks at her for a long time, through the enormous goggles."),
                   say("bee", R("Does it go to the moon?")),
                   say("rhea", R("No. But it goes to the hatcheries. If your ma is in one, we can ask.")),
                   say("bee", R("Then I'll have to ask Nan. Nan says yes to everything if you ask her while she's milking.")),
                   n("Nan says yes. Bee comes up the mountain the next week with her satchel and her goggles and a list of every hatchery in Ostrel, written in her own hand, spelled wrong."),
                   setf({"beeDone": True}), *joins("bee"), toast("Bee joins Thornwick as the post runner."),
               ], by="rhea", hint="Give her a better way to write."),
               opt("Give her the boat back", [n("Bee puts it on the water. It goes over the weir, and down the river, toward the sea, and the moon."),
                                              say("bee", R("Next week I'm going to tell her about you."))], hint="Leave her be.")),
    ], [say("bee", R("No letters from the moon yet. I'm keeping count."))]),
]
actor("bee-weir", "town-weirbank", 12, 6, "bee", "bee", when(span("ab5", "ah42"), **{"not": "recruited.bee"}))

# ---- Linnet: the Vale midwife, and the wounded left at the roadside after Sallow
S["linnet"] = [
    iff({"not": "linnetAsked"}, [
        n("A freckled woman with her sleeves rolled to the shoulder is splinting a soldier's leg on a nurses' table, fast and neat, without looking up."),
        say("linnet", R("Linnet. Midwife, from the Vale. I came when I saw the smoke from Sallow. Your nurses are good. There aren't enough of them.")),
        say("linnet", R("There are eleven more burned at Hob's Bend, lying in a barn. The quartermaster's sent every cart back to Sallow for the Guild's grain before somebody else takes it. The wounded can wait, he says. They can't.")),
        setf({"linnetAsked": True}),
        choose("The quartermaster's carts are lined up at the gate, empty, about to go.",
               opt("Take the carts for the wounded", [
                   n("Rhea stands in front of the first cart until the carter stops. Then she sends all of them to Hob's Bend, and the quartermaster's shouting follows her all the way down the line."),
                   n("The eleven are in the nurses' tent by dark. Ten of them live. The Guild's grain at Sallow is gone by morning, taken by the villagers, which the quartermaster takes very personally."),
                   say("linnet", R("You'll be in trouble for that.")),
                   say("rhea", R("Probably.")),
                   say("linnet", R("Then you'll want someone who can set a bone in a ditch. I'll come with your section, sergeant, if you'll have a midwife.")),
                   setf({"linnetDone": True}), *joins("linnet"), toast("Linnet joins Rhea's company."),
               ], hint="The grain will be gone."),
               opt("Let the grain come first", [
                   n("The carts go to Sallow for the grain. They go to Hob's Bend the next day. Seven of the eleven are still alive when they get there."),
                   say("linnet", R("Seven. Well. That's an army, I suppose.")),
                   setf({"linnetDone": "grain"}),
               ], hint="The camp has to eat.")),
    ], [iff({"eq": {"linnetDone": True}}, [say("linnet", R("Hold still. This won't hurt. It will, actually. Hold still anyway."))], [n("The midwife from the Vale has gone home.")])]),
]
actor("linnet-tent", CAMP, 8, 10, "linnet", "linnet", when(span("a6c", "a7c"), **{"not": "linnetDone"}))

# ---- Fairweather: the honest smuggler's ledger
S["fairweather"] = [
    iff({"not": "fairweatherDone"}, [
        n("A plump old man in a battered felt hat and a waistcoat with too many pockets is sitting on a bollard, watching the Commons search a canal barge. His barge."),
        say("fairweather", R("Lom Fairweather. Trader. Honest, mostly. Your lieutenant's lads have had my ledger off me, and given it to you, I'm told, because you're the officer present and nobody else wants to be responsible for it.")),
        n("It's in Rhea's pack: a fat book in oilcloth, tied shut with a knot she doesn't know."),
        say("fairweather", R("Every name I ever moved up or down a canal is in there. Some of them would hang. Some of them would hang other people. I'd like it back. Shut, if it's all the same to you.")),
        choose("Fairweather holds out his hand for the book.",
               opt("Give it back unread", [
                   n("Rhea gives it back, still tied. He looks at the knot, carefully, and then at her."),
                   say("fairweather", R("You didn't even look. Your lieutenant would've read it to the whole wharf.")),
                   say("fairweather", R("Your Thornwick's a long way from a canal, and has no market, and won't eat well this winter. I know people who sell things. Honestly, mostly. Shall I come and set up a stall?")),
                   setf({"fairweatherDone": "unread"}), *joins("fairweather"), toast("Lom Fairweather joins Thornwick, to run its market."),
               ], hint="Whatever's in it stays in it."),
               opt("Read it first", [
                   n("Rhea cuts the knot. Fairweather doesn't move. The book is names, dates, prices: people moved off hatchery carts, a family out of an indenture house, a crate of something marked only with a moss leaf."),
                   say("fairweather", R("Well. Now you know who I am. I don't know who you are, though. Keep it. I'll start another.")),
                   n("He walks off down the towpath, and is not seen on the river again that year."),
                   setf({"fairweatherDone": "read"}),
               ], hint="Know who you're dealing with.")),
    ], [say("fairweather", R("Fresh eggs, and nobody asks where from. That's the Thornwick market."))]),
]
actor("fairweather-barge", WHARF, 18, 4, "fairweather", "fairweather", when(span("ab19", "ah42"), **{"not": "fairweatherDone"}))

# ---- Kane: commands the army from the day Rhea enlists, until he's taken away
zones.append({"map": CAMP, "area": [0, 0, 27, 14], "when": when(span("a2b"), **{"not": ["recruited.kane", "kaneArrested", "kaneTaken"]}),
              "do": [setf({"recruited.kane": True})]})

# ================================================================== ACT II: Thornwick, the terraces, the camp
TW, UMES = "thornwick", "umes"

# ---- Mags: Brannoc's Kitchen
S["mags"] = [
    iff({"not": "magsDone"}, [
        n("A stout woman with flour on her cheek and a wooden spoon as long as her arm has taken over the cook fire. Brannoc is standing beside it with his arms folded, which is the angriest Rhea has ever seen him."),
        say("mags", R("Mags. Cook to the south companies, twenty years. Came up on Dorrit's cart to see what this mountain eats. I've had his stew. I've had better stew off a boot.")),
        say("brannoc", R("I've fed this section for a year on turnips and goat.")),
        say("mags", R("Then they've suffered enough. One pot each, tonight. The sergeant judges. Loser washes the other's pot for a month.")),
        fade("That evening. Two pots on the fire."),
        n("Brannoc's: goat, turnip, mountain thyme, the same stew as every night, and good, the way bread is good. Mags's: something red and thick with dried fish from the canal and a spice Rhea has never tasted, and the whole section is trying not to look as if they want more."),
        choose("The section is watching Rhea, with their bowls.",
               opt("Brannoc's stew wins", [say("brannoc", R("Ha.")), say("mags", R("Loyal. Wrong, but loyal. I'll wash the pot.")), setf({"magsDone": "brannoc"})],
                   hint="Loyalty."),
               opt("Mags's stew wins", [say("mags", R("Of course it does.")), n("Brannoc washes Mags's pot that night with great dignity, and asks her for the name of the spice."), setf({"magsDone": "mags"})],
                   hint="Honesty."),
               opt("Call it a draw", [say("mags", R("Coward.")), say("brannoc", R("Coward.")), n("They wash each other's pots together, arguing about salt."), setf({"magsDone": "draw"})],
                   hint="Keep the peace.")),
        say("mags", R("I'm staying. Somebody has to teach this mountain to cook. He can help.")),
        *joins("mags"), toast("Mags joins the Commons at Thornwick."),
    ], [say("mags", R("Brannoc and I have agreed on salt. We'll never agree on anything else, and I'm glad of it."))]),
]
actor("mags-fire", TW, 15, 11, "mags", "mags", when(span("ab5", "ab26")))

# ---- Severin: the officers' lull fitter at the camp
S["severin"] = [
    iff({"not": "severinDone"}, [
        n("A pale man in a high-collared black coat is coming out of an officer's tent with a slim leather case under his arm. He has fine gloves on. He doesn't take them off to shake hands, and doesn't offer to."),
        say("severin", R("Severin. I fit for the Guild. Kane's officers have needs, and the Guild meets them. Discreetly. You've seen the crates, I hear. So we needn't pretend.")),
        n("He opens his book to make a note. It falls open at a page of names: officers, with a tally of rings beside each, month after month. Hundreds of marks. Rhea reads the page upside down."),
        choose("Severin is waiting for her to step aside.",
               opt(R("How many rings have you put on people, Severin? Count them. It's all in your book."), [
                   n("He laughs, and then he looks down at his own book, at the columns and columns of tally marks in his own neat hand, and stops laughing."),
                   say("severin", R("Four thousand, one hundred. Give or take. I've never added them up before. Why would I?")),
                   n("He takes off one glove. There are pale rings on the back of his wrist, under the cuff, where nobody would see. Six, seven. A new one."),
                   say("severin", R("We fit ourselves first, to know the strength. Every fitter does. Nobody's ever stopped.")),
                   say("rhea", R("Thornwick weans people. Oda weans people. Nobody there will ask you to stop all at once.")),
                   n("He puts the glove back on, very carefully, finger by finger."),
                   say("severin", R("And the officers will need a man who knows every one of them by his neck. I'll come. Before I change my mind.")),
                   setf({"severinDone": True}), *joins("severin"), toast("Severin joins the Commons at Thornwick, to be weaned."),
               ], by="rhea", hint="Make him count."),
               opt("Let him pass", [n("Severin tips his hat and goes on to the next tent. Rhea hears the case click open inside.")], hint="Not now.")),
    ], [say("severin", R("Third strength. My hands are shaking, look. Oda says that's good. Oda is a hard woman."))]),
]
actor("severin-tent", CAMP, 18, 3, "severin", "severin", when(span("ab14", "ad20"), flag="sawCrates", **{"not": "recruited.severin"}))

# ---- Ume and the clans' debts to the Guild
S["umeDebts"] = [
    iff({"not": "clanDebtsBroken"}, [
        n("The Guild's factor is at the weighing stall with his book, as always. Ume is on her step, as always. Today the whole clan is standing round the stall, not working, and the factor is pretending not to notice."),
        say("ume", R("My son came home clean. Thornwick did that, and the clan's moss, and a lot of nights nobody slept. And the Guild's book says that moss was the Guild's.")),
        say("ume", R("Clan law says a debt dies with the book it's written in. The Guild never thought anybody would read clan law. Well. We've been reading it all winter.")),
        say("factor", R("That book is Guild property, grandmother. Touch it and the Guild will send men up this hill.")),
        choose("The clan is looking at Rhea. So is the factor.",
               opt("Burn the book", [
                   n("Rhea takes the book off the stall. The factor grabs for it and finds himself looking at Edda's wrapped fists, and at a great many clanspeople behind them."),
                   n("The book goes on the drying fire. Seed debt, tool debt, flour debt, three generations of it, going up the chimney in ten minutes. The clan watches it burn in total silence."),
                   say("factor", R("The Guild will hear of this, Commons.")),
                   say("rhea", R("I hope so. Tell them it was the Commons.")),
                   setf({"clanDebtsBroken": "burned"}),
               ], hint="The Guild will hear of it."),
               opt("Buy the debt out (60 coin)", [pay(60, [
                   n("Rhea counts out the coin on the stall. The factor counts it twice, and writes PAID across every page, and hands her the book, because there's nothing in it for the Guild any more."),
                   n("The clan burns it anyway, on the drying fire. Ume says it's the principle."),
                   setf({"clanDebtsBroken": "paid"}),
               ], [say("ume", R("Not that way, then. Come back with more coin, or with matches."))])], hint="Costly, and lawful."),
               opt("Leave it for now", [say("ume", R("Then we'll wait. We've waited sixty years. We're good at it."))])),
        iff({"flag": "clanDebtsBroken"}, [
            say("ume", R("Seventy years I've sat on this step. I'd like to see the war before I'm too old to be rude to anybody in it. I'm coming down the mountain, girl. Don't argue.")),
            *joins("ume"), toast("Grandmother Ume joins Rhea's company."),
            iff({"flag": "eddaHelped"}, [run("eddaJoins")]),
        ]),
    ], [say("ume", R("Free terraces. Free moss. Free to starve if the harvest fails. It's wonderful."))]),
]
actor("ume-debts", UMES, 13, 9, "ume", "umeDebts", when(span("ab22"), flag="umeMet", **{"not": "recruited.ume"}))
S["eddaLate"] = [iff({"flag": "eddaHelped"}, [run("eddaJoins")], [say("edda", R("The lowest terrace is mine again. Rebuilt it myself."))])]
actor("edda-umes", UMES, 6, 10, "edda", "eddaLate", when(span("ab22"), flag="clanDebtsBroken", **{"not": "recruited.edda"}))

# ---- Teo: the climber who cut the factor's rope
S["teo"] = [
    iff({"not": "teoDone"}, [
        n("A young man is hiding behind the moss bales in the drying shed, with a coil of climbing rope over his shoulder and moss stains to the elbows. He puts a finger to his lips."),
        say("teo", R("Teo. The factor's hoist. The one that lowers the Guild's baskets down the cliff to his carts. I cut the rope last night with forty baskets on it.")),
        say("teo", R("I didn't think. I just went up and did it. Now the factor's saying a Guild saboteur hangs at Vantry, and he's asking every house on the hill for the climber.")),
        say("teo", R("The clan would give me to the elders for clan law. A year's labour, no rope. The factor would give me to a rope. Either way I'm somebody's.")),
        choose("Teo is watching the shed door.",
               opt("Hide him", [
                   n("Rhea throws a moss bale over him and sits on it. The factor's man looks into the shed, sees a Commons officer resting on a bale, and goes away."),
                   n("That night Teo walks down to Thornwick between two of the section, in a borrowed Commons coat."),
                   say("teo", R("I'll climb anything you point at. Walls, cliffs. Hatchery chimneys.")),
                   setf({"teoDone": "hidden"}), *joins("teo", True), toast("Teo joins Rhea's company."),
               ], hint="Clan law can wait."),
               opt("Take him to the elders", [
                   n("The elders hear it on Ume's step. A year's labour. They give the year to Thornwick, because Thornwick has walls that need climbing, and nobody from the Guild will look for him there."),
                   say("teo", R("A year carrying stones up your monastery. Fine. Fair.")),
                   setf({"teoDone": "elders"}), *joins("teo", False), toast("Teo serves his year at Thornwick."),
               ], hint="Clan law, not the Guild's.")),
    ], [say("teo", R("They're still looking for the climber. Nobody looks at a man carrying stones."))]),
]
actor("teo-shed", UMES, 20, 6, "teo", "teo", when(span("ab10"), flag="umeMet", **{"not": "teoDone"}))

# ---- Hobb: the swearing loftbuck
S["hobb"] = [
    iff({"not": "hobbDone"}, [
        n("An old woman with a pipe in her teeth is trying to get a pack train of loftbucks moving up the terraces. The lead buck has planted his hooves and won't go. The whole train is stopped behind him."),
        say("hobb", R("Hobb. This is Bramble. He was my husband's, and my husband drove him forty years with words I won't say in front of a Commons officer.")),
        say("hobb", R("Husband's dead since the spring. Bramble only goes for the words, and I never learned them proper. I just know the shape. It starts rude and gets worse.")),
        say("hobb", R("Help me. Which comes first?")),
        choose("Bramble looks at Rhea with deep contempt.",
               opt(R("Get up the hill, you moss-eating disgrace."), [
                   n("Bramble's ears twitch. He takes one step. Then stops again."),
                   say("hobb", R("Closer. You've the start. Now what?")),
                   choose("Bramble waits, insultingly.",
                          opt(R("Your mother was a ditch-goat and your father was a wet sock."), [
                              n("Bramble snorts, lowers his head, and walks off up the terrace at a smart pace, and the whole train goes after him with their bells going."),
                              say("hobb", R("That's it. That's him exactly. I'd forgotten the sock.")),
                              n("She cries a bit, round the pipe stem. Then she wipes her face with her hat."),
                              say("hobb", R("Your Thornwick has a goat track for a road and nobody to drive it. Bramble and I'll take the job. We're both too rude for the terraces now.")),
                              setf({"hobbDone": True}), *joins("hobb"), kith("drove-loftbuck", 8, "bramble", "Bramble"),
                              toast("Hobb and Bramble join the Commons."),
                          ], by="rhea"),
                          opt(R("Please."), [say("hobb", R("Please! Forty years and he never heard please. Try again, girl, and mean it less."))], by="rhea")),
               ], by="rhea"),
               opt(R("Come on, Bramble. Good boy."), [say("hobb", R("Good boy. Ha. He'll die of shame. Ruder."))], by="rhea")),
    ], [say("hobb", R("Bramble's learned a new word off the section. I'm very proud."))]),
]
actor("hobb-train", UMES, 8, 6, "hobb", "hobb", when(span("ab10"), flag="umeMet", **{"not": "hobbDone"}))

# ---- Mirela: the stargazer on the highest terrace
S["mirela"] = [
    iff({"not": "mirelaDone"}, [
        n("At the very top of the terraces, an old woman in a shawl sewn with stars has set up a brass sighting tube on a tripod, pointing at the empty daytime sky."),
        say("mirela", R("Mirela. I read weather in the stars. Nobody believes me, but the clan plants by my calendar anyway, and the harvest comes in dry.")),
        say("mirela", R("Come back tonight. The cloud sea goes flat on clear nights, and you can see the whole sky twice: once up there, once in the cloud.")),
        fade("Night. The highest terrace."), setf({"light": "night"}),
        n("The cloud sea lies below them like a sheet of milk, and the stars are in it, upside down. Mirela points out the Plough, the Drover, the Kith. She has names for all of them that no book uses."),
        say("mirela", R("The Drover's low, and his lantern's red. That's rain in four days, from the south, and a long one.")),
        choose("Mirela waits to see if she's believed.",
               opt(R("Four days. I'll tell Kane's quartermaster to get the carts under cover."), [
                   n("It rains in four days, from the south, for a week. The Commons' carts are under cover. The Guild's on the Vantry road are not."),
                   setf({"mirelaDone": "believed"}),
               ], by="rhea", hint="Believe her."),
               opt(R("It's a nice story."), [
                   n("Mirela laughs. It rains in four days anyway, from the south, for a week."),
                   setf({"mirelaDone": "doubted"}),
               ], by="rhea", hint="Weather is weather.")),
        say("mirela", R("An army needs to know the weather before the other army does. I'm old, but I'm not that old. Take me down the mountain, captain. I'll bring the tube.")),
        *joins("mirela"), toast("Mirela joins the Commons."),
        setf({"light": "day"}),
    ], [say("mirela", R("The Kith is high tonight. Good night for a march."))]),
]
actor("mirela-top", UMES, 12, 2, "mirela", "mirela", when(span("ab10"), flag="umeMet", **{"not": "mirelaDone"}))

# ---- Pollard: the champion sold away at the tournament yard
S["pollard"] = [
    iff({"not": "pollardDone"}, [
        n("A tournament yard behind the inn: hurdles, a sand ring, a crowd. A gruff man in a teal waistcoat is arguing with a Guild buyer in a good coat, who is leading away a magnificent ironback on a silver chain."),
        say("pollard", R("Pollard. I trained that beast from a calf. Thistle. He lost the last round by a hair, and the stake was the kith, and the Guild buyer had been waiting all week for him to lose.")),
        say("pollard", R("There's one round left before the ring closes. Anyone can challenge. Winner takes the stake back. I've nothing left to challenge with.")),
        choose("The buyer's handlers are already loading Thistle onto a cart.",
               opt("Challenge the buyer", [{"battle": "recruit-pollard", "win": [
                   n("The buyer's kith go down in the sand, and the crowd roars, and the ring-keeper hands Rhea the silver chain."),
                   n("She gives it to Pollard. Thistle puts his huge head against Pollard's chest and pushes, and Pollard sits down in the sand and doesn't get up for a while."),
                   say("pollard", R("You could've kept him. He was yours by the rules.")),
                   say("pollard", R("The Commons has kith that need a yard and a man who knows what he's doing. I'll bring Thistle. He doesn't fight for anyone else.")),
                   setf({"pollardDone": True}), *joins("pollard"), toast("Pollard joins the Commons, and runs Thornwick's kith yard."),
               ]}], hint="A fight in the ring."),
               opt("Walk away", [n("The cart goes off down the road to Vantry with Thistle on it, bellowing. Pollard watches it the whole way.")])),
    ], [say("pollard", R("Thistle's eating everything at Thornwick that isn't nailed down. He's happy."))]),
]
actor("pollard-ring", "town-drovers-halt", 18, 6, "pollard", "pollard", when(span("ab19", "ad20"), **{"not": "pollardDone"}))

# ================================================================== ACT III: after Wren's slate, Lockside and Mire
# ---- Greet: the first greenlings go to the back streets, or to the officers
S["greet"] = [
    iff({"not": "greetDone"}, [
        n("A back street off the market, and a house with its shutters open and its door propped with a chair. Inside, on mattresses on the floor, a dozen people are shaking under blankets. A tired woman with a pocket full of spoons is going from one to the next."),
        say("greet", R("Greet. This is a weaning house, captain. I've no greenlings. I've broth, and blankets, and I sit with them. Some of them come through it. Some of them go back to the lull the first night they can walk.")),
        say("greet", R("They say Thornwick has greenlings now. They say the first trays are going to the army's officers, because the officers are the ones who can't be seen to go through the raw.")),
        n("She's right. Kane has asked for the next tray for his officers. The tray after that will be months away."),
        choose("Greet doesn't ask. She just waits.",
               opt("Send her Thornwick's next tray", [
                   n("The tray comes down from Thornwick on Dorrit's cart a week later, wrapped in wet moss. Kane's officers wait. Kane says nothing about it to Rhea, which is worse than saying something."),
                   say("greet", R("Twelve. Twelve of them, on greenlings, tonight. Do you know what you've done, captain? You've made me useless. Thank you.")),
                   say("greet", R("Take me to Thornwick. I know how to sit up with people. I'll teach your nurses.")),
                   setf({"greetDone": "sent", "greenlingsToStreets": True}), add({"kaneTrust": -5}), *joins("greet"), toast("Greet joins the Commons at Thornwick."),
               ], hint="Kane will notice."),
               opt("Keep it for the officers", [
                   n("The tray goes to the officers. Greet's house goes on with broth and blankets."),
                   say("greet", R("I understand. An army's an army. Come and see us when the next tray's ready. If we're still here.")),
                   setf({"greetDone": "officers"}),
               ], hint="An army needs its officers.")),
    ], [iff({"eq": {"greetDone": "sent"}}, [say("greet", R("Your nurses are good. They were never taught to sit still. I'm teaching them."))],
            [say("greet", R("Still broth and blankets. We manage."))])]),
]
actor("greet-house", MB, 4, 4, "greet", "greet", when(span("ad1"), **{"not": "greetDone"}))

# ---- Pell: a Larkfold boy among the ninety
S["pell"] = [
    n("One of the Lockside children is sitting by the warm pool with his sleeves rolled down over his arms, the way the hatchery children all do. He's gangly and freckled, with sandy hair cropped short. He's watching Rhea."),
    say("pell", R("You're Rhea Caddow. You used to sing the loftbucks down off the high pasture. You gave me a plum once, for carrying the bucket.")),
    n("Rhea knows the face then, seven years younger, at the bottom of the Larkfold terraces. A boy of eight in a too-big shirt."),
    say("rhea", R("Pell. Pell Ashdown. They took you in the raid.")),
    say("pell", R("I was in Corvel's caves. Seven years. I kept the trays. I'm good at trays. I know when a brood's going wrong before the keeper does.")),
    say("pell", R("I don't want to go anywhere else. I want to keep trays where nobody wears what comes out of them.")),
    *joins("pell"), toast("Pell joins Thornwick, in Oda's greenling caves."),
]
actor("pell-pool", TW, 10, 9, "pell", "pell", when(span("ad7"), **{"not": "recruited.pell"}))

# ---- Lyle: hears Finch is alive
S["lyle"] = [
    n("A young man in a Guild mill-worker's coat is standing at Thornwick's gate with his cap in his hands. It takes a moment to place him: the frightened prisoner from the chapel, the one who crossed Kell's Bridge alone."),
    say("lyle", R("Lyle. You let me go home, sergeant. Captain. I went back to the mill. Then the Wardens came round the mills for men again.")),
    say("lyle", R("In the barracks they were saying a Larkfold boy rides with the Wardens now. On a grey loftbuck. Finch. Your brother. He's alive.")),
    say("lyle", R("I thought you should hear it from somebody who'd tell you straight. And I thought, if a boy from Larkfold can stand it in there, I can stand it out here. If you'll have me.")),
    *joins("lyle"), toast("Lyle joins Rhea's company."),
]
actor("lyle-gate", TW, 13, 14, "lyle", "lyle", when(span("ad7"), flag="finchSeen", **{"not": "recruited.lyle", "eq": {"wardens": "spared"}}))

# ---- Merel: Mother Asca's private supply, and after the House falls
S["merelOffer"] = [
    n("A young woman in a high-collared black breeder's coat, with House Mire's silver on the cuffs, is waiting at the gate with a sealed case. She's very composed. Her eyes are red-rimmed."),
    say("merel", R("Merel, of House Mire. My grandmother, Mother Asca, sends her compliments to the captain of Thornwick, and a gift.")),
    n("She opens the case. Clean Guild lulls, two dozen, packed in wet moss, the best strength the Houses make."),
    say("merel", R("For your officers, or yourself, or whoever you choose. Every month, privately. Grandmother asks nothing for them. Only that Thornwick's greenlings stay in the highlands, and don't go down to the cities.")),
    choose("Merel holds the case open.",
           opt("Refuse it", [
               say("rhea", R("Tell your grandmother Thornwick's greenlings go wherever there are people who need them.")),
               n("Merel shuts the case. For a moment something moves in her face that isn't composure."),
               say("merel", R("I'll tell her. She won't be surprised. She says you're your mother's daughter.")),
               setf({"ascaRefused": True}),
           ], hint="The greenlings go to the cities."),
           opt("Take it", [
               n("Rhea takes the case. Merel bows, very correctly, and goes back down the road."),
               setf({"ascaSupply": True}),
           ], hint="Two dozen lulls, every month.")),
]
S["merelAfter"] = [
    n("Merel is at the gate again. No case this time, and no silver on her cuffs: she's cut it off. Her coat is muddy to the knee."),
    say("merel", R("House Mire is finished. The Commons opened its brood rooms. Grandmother sat in the records room until they came for her, and then she sat in it after.")),
    say("merel", R("She said you'd refuse the case. She said it was why she sent me. She wanted me to see what somebody looks like when they say no to her.")),
    say("merel", R("I know the second line. The one the Houses keep for the officers' lulls. Every pairing, every strength, back forty years. I can breed it down, the way your Oda does. If you want it.")),
    *joins("merel"), toast("Merel joins Thornwick, with House Mire's second line."),
]
actor("merel-offer", TW, 15, 14, "merel", "merelOffer", when(span("ad7", "ad15"), **{"not": ["ascaRefused", "ascaSupply"]}))
actor("merel-after", TW, 12, 14, "merel", "merelAfter", when(span("ad16"), flag=["ascaRefused", "mireFreed"], **{"not": "recruited.merel"}))

# ---- Wystan: the Warden kennels at Longbarrow
S["wystan"] = [
    iff({"not": "kennelFought"}, [
        n("The old barn at the end of the barrow road is a Warden kennel post: a dozen hound kith in pens, and four kennel-men in grey, and a man in dented Warden plate in the end pen, chained to the post like one of the hounds."),
        n("The kennel-men see the Commons coats and let the hounds off their chains."),
        {"battle": "recruit-kennels", "win": [setf({"kennelFought": True}), run("wystanPen")]},
    ], [run("wystanPen")]),
]
S["wystanPen"] = [
    iff({"not": "wystanDone"}, [
        n("The man in the end pen has chiselled the badge off his own breastplate. The marks are still bright."),
        say("wystan", R("Wystan. Knight of the Wardens, once. I was given a hound kith at fourteen and swore on her collar I'd hunt whatever I was told to hunt.")),
        say("wystan", R("They told me to hunt children off a cart at Sallow. I let the hound off her lead and told her to go home. They chained me in her pen to wait for the Marshal.")),
        n("The hounds in the other pens are watching Rhea. Big, grey, kennel-bred, trained to the Warden whistle since they were whelps. The Commons has nothing like them."),
        say("wystan", R("They'll be put down when the Marshal comes, or sent to another post. Whatever you do with them, captain, don't make them hunt people.")),
        choose("The hounds are watching. So is Wystan.",
               opt("Open the pens and let them go wild", [
                   n("Rhea opens the pens one by one. The hounds don't believe it. Then one goes, and then all of them, out through the barn door and away over the barrows, grey shapes in the long grass."),
                   n("Wystan watches them go with his chain round his ankle and his face wet."),
                   say("wystan", R("Strike this off. I'll carry your shield, or the Commons' baggage, or anything you like. I've nothing to swear on now but you.")),
                   setf({"wystanDone": "freed"}), *joins("wystan"), toast("Wystan joins Rhea's company."),
               ], hint="Nobody hunts with them again."),
               opt("Keep the best hound for the Commons", [
                   n("The Commons takes the hounds. One of them, a big grey bitch who won't leave the barn door, comes to Rhea's hand when she whistles."),
                   say("wystan", R("Then you're the Wardens with a different coat. Leave me the chain, captain. I'll wait for the Marshal.")),
                   n("He won't be argued with. The Commons leaves him there, unchained, with the barn door open, and he's still sitting in the end pen when they ride away."),
                   setf({"wystanDone": "kept"}), kith("warden-reedcat", 10, "kennel-grey", "Greylock"),
               ], hint="A trained hound kith.")),
    ], [iff({"eq": {"wystanDone": "freed"}}, [n("An empty kennel, every pen open.")], [n("Wystan is still in the end pen, waiting for the Marshal.")])]),
]
actor("wystan-pen", "town-longbarrow", 14, 5, "wystan", "wystan", when(span("ad4"), **{"not": "wystanDone"}))

# ---- Tully: the Larkfold smith's mark
S["tully"] = [
    iff({"not": "tullyDone"}, [
        n("A forge in the Foundry Ward. A young smith with a shaved head and a flame-red beard is quenching a blade, and the steam goes up past a rack of finished knives, Guild issue, for the hatchery guards."),
        n("Rhea picks one up. On the ricasso, very small, under the Guild's stamp, there's another mark: a hammer, and over it three curved lines. A cloud over the anvil."),
        say("rhea", R("That's old Ashwin's mark. The Larkfold forge. My father bought his scythes from Ashwin.")),
        n("The smith goes completely still with the tongs in his hand."),
        say("tully", R("Ashwin was my grandfather. I put the mark on every one. Under the Guild's, where nobody looks. So that somebody from home would see it one day and know I was still alive.")),
        say("tully", R("Tully. I was twelve. I ran the wrong way in the raid, down the mountain instead of up it, and a Guild carter took me to Cinderwick and sold my indenture to a forge. Nobody came looking. I thought nobody was left to look.")),
        say("rhea", R("Thornwick needs a smith. There are keepsakes from Larkfold up there that nobody knows how to mend.")),
        n("Tully puts the tongs down. He takes his apron off, folds it, and lays it over the anvil."),
        say("tully", R("Then they've waited long enough.")),
        setf({"tullyDone": True}), *joins("tully"), toast("Tully joins Thornwick as its smith."),
    ], [say("tully", R("Every keepsake at Thornwick is getting a cloud over the anvil. I'm making up for seven years."))]),
]
actor("tully-forge", "town-cinderwick--foundry", 8, 6, "tully", "tully", when(span("ad4"), **{"not": "tullyDone"}))

# ---- The Coldharrow strike: Joss, Dunstan and Tess
S["joss"] = [
    iff({"not": "strikeMet"}, [
        n("The Spinning Rows are full of people who aren't spinning. A rangy man with a fierce copper moustache is standing on a barrel, with a red armband, shouting at the mill gate."),
        say("joss", R("Joss. The Coldharrow pits are out, and the mills with them. Tobin of the terraces sent word down the pits that there's a place up the mountain where they take the rings off you. Eight hundred men have walked off a Guild shift since.")),
        say("joss", R("Now the Guild's flooded the Deep to break us. They opened the lock on the old workings with a shift still down there, and said it was an accident. Thirty men. Dunstan's with them.")),
        setf({"strikeMet": True}),
        toast("The flooded pit is at Lockkeeper's Deep, south-east of Cinderwick."),
    ], [iff({"not": "strikeEnd"}, [
        iff({"flag": "deepDone"}, [run("strikeVote")], [say("joss", R("The Deep, captain. Thirty men in the dark. Talk to me after."))]),
    ], [run("jossAfter")])]),
]
S["deep"] = [
    iff({"not": "deepDone"}, [
        n("The pit head at Lockkeeper's Deep. Water is coming up out of the shaft in a slow black welling. Women with lanterns stand round the head of it. Nobody is going down."),
        n("A tap on the pipe, from below. Then another. Somebody is alive down there, and knocking."),
        choose("The shaft ladder goes down into the black water.",
               opt("Go down yourself", [
                   fade("Down the ladder. The water is to her chest at the third landing, and cold enough to stop a heart."),
                   n("Thirty men on a ledge above the flood, in the dark, with one lamp between them. A huge grey-bearded foreman is holding the lamp up, and holding up the man next to him with his other arm."),
                   say("dunstan", R("Dunstan. Foreman. You're the first thing that's come down that ladder in two days that wasn't water.")),
                   n("They come up one by one on the rope, with Rhea at the bottom and Dunstan at the top of each lift. He's the last off the ledge. He carries the lamp up in his teeth."),
                   say("dunstan", R("A Commons officer, down my pit, in that water. I'll follow anybody who does that. I'll follow them into Vantry.")),
                   setf({"deepDone": "went", "dunstanSaved": True}), *joins("dunstan"), toast("Dunstan joins the Commons."),
               ], hint="Someone has to."),
               opt("Send the section down", [
                   n("The section goes down on ropes. It takes all night. They bring up twenty-six men out of thirty."),
                   n("The foreman comes up last, carrying the twenty-seventh, who is dead. He puts him down by the shaft head and looks round for whoever was giving the orders, and finds Rhea standing dry at the top."),
                   setf({"deepDone": "sent"}),
               ], hint="You're needed alive.")),
    ], [n("The water at the Deep is going down. Somebody is pumping, by hand, all day and all night.")]),
]
S["strikeVote"] = [
    n("The strike meets in the Rows at dusk. Joss on his barrel. A young millgirl with a bandaged hand and three missing fingers beside him, leading the singing."),
    n("A Guild broker has come too, in a good coat, with a paper: a raise of a penny a day, the lock gates mended, no one punished. If the strike ends tonight."),
    say("joss", R("Captain. The Commons is the only army in Ostrel these men trust. Say what you'd do.")),
    choose("The Rows go quiet.",
           opt(R("Don't take the penny. Hold out. The Commons will stand at the mill gates with you."), [
               n("The Guild sends its strike-breakers in the night, with clubs, to the mill gates."),
               {"battle": "recruit-strikebreakers", "win": [
                   n("The strike-breakers go back up the Vantry road carrying each other. In the morning, the Guild's broker comes back with a different paper: the lock gates, the pits made safe, a shilling a day, and the lull fitters out of the pits for good."),
                   say("tess", R("We won. We won, didn't we? Somebody say it.")),
                   say("joss", R("We won.")),
                   say("tess", R("Tess. I sing in the Rows. Everybody says I'm too loud. Your Commons sings like a funeral, captain. I've heard you. Let me come.")),
                   setf({"strikeEnd": "won"}), *joins("tess"), *joins("joss"), toast("Tess and Joss join the Commons."),
               ]},
           ], by="rhea", hint="A fight at the mill gates."),
           opt(R("Take the penny. Take the lock gates. Get your people home alive."), [
               n("The strike takes the penny. The broker shakes Joss's hand, and Joss lets him."),
               say("joss", R("It's a penny and a lock gate. It's not nothing. It's not much either.")),
               say("joss", R("I'll come, captain. The pits'll need someone who knows the Commons when the next thing happens. And it will.")),
               setf({"strikeEnd": "broker"}), *joins("joss"), toast("Joss joins the Commons."),
           ], by="rhea", hint="Safer. Smaller.")),
]
S["jossAfter"] = [iff({"eq": {"strikeEnd": "won"}}, [say("joss", R("A shilling a day. The Rows have never seen a shilling."))], [say("joss", R("A penny and a lock gate."))])]
actor("joss-barrel", "town-cinderwick--rows", 12, 5, "joss", "joss", when(BEFORE_ACT4[BEFORE_ACT4.index("ad4"):], **{"not": "recruited.joss"}))
actor("deep-head", "town-lockkeepers-deep", 11, 5, "glint", "deep", when(span("ad4"), flag="strikeMet", **{"not": "deepDone"}))

# ---- The Low Water Sisters: Cass and Agathe
S["cass"] = [
    iff({"not": "cassMet"}, [
        n("A slight young woman in a grey novice's cap is trimming the lamp at the gallery mouth, where the canal water goes down into the dark under the street."),
        say("cass", R("Cass. Novice of the Low Water. The Sisters nurse people in the raw down there, in the old galleries under the canals. Nobody above knows the galleries go all the way under Vantry. Nobody's supposed to.")),
        say("cass", R("I'll take you down, if you're who they say you are. You don't tell anyone where the way in is. Not even your own army.")),
        setf({"cassMet": True}),
        fade("Down. A long way down, by lamplight, along a ledge above black water."),
        run("galleries"),
    ], [iff({"not": "galleriesDone"}, [run("galleries")], [run("cassAfter")])]),
]
S["galleries"] = [
    n("A gallery as long as a street, lit with a thousand candles. People on pallets in rows, sweating, shaking, being sung to. Sisters in grey moving between them."),
    n("At the end, a tall woman with a shaved head and a water-drop pendant is holding a man down by his shoulders while the raw takes him. When it lets go of him, she looks up."),
    say("agathe", R("Agathe. You're the greenling woman. The Abbess says we may not take your greenlings. She says the raw is a cleansing. She says the ones who die of it were called.")),
    say("agathe", R("I've buried forty since the spring. I don't think any of them were called.")),
    iff({"flag": "greenlings"}, [
        choose("Agathe looks at the man on the pallet.",
               opt("Give her greenlings from Thornwick", [
                   n("Rhea puts the wet-moss parcel in her hands. Agathe holds it a long time. Then she walks the length of the gallery with it, past the Abbess's chair, without stopping, and sets the first greenling on the man's neck herself."),
                   n("The Abbess stands up. Agathe doesn't turn round."),
                   say("agathe", R("I'll be gone by morning, Mother. Thornwick needs someone to run its sick room who's sat with the raw as long as I have.")),
                   setf({"galleriesDone": True, "agatheBroke": True}), *joins("agathe"), toast("Agathe leaves the Sisters, and joins Thornwick's infirmary."),
               ], hint="She'll have to break with her Abbess."),
               opt("Leave it to the Sisters", [say("agathe", R("Then go with God, greenling woman. Pray for the forty.")), setf({"galleriesDone": True})])),
    ], [say("agathe", R("Come back when your greenlings are a real thing and not a story. We'll still be here. Most of us.")), setf({"galleriesDone": True})]),
    run("cassAfter"),
]
S["cassAfter"] = [
    iff({"not": "cassDone"}, [
        n("Back at the gallery mouth, a Commons runner is waiting for Rhea, from Varro, out of breath."),
        n("He looks at the dark mouth by the canal, and at Cass, and back at Rhea. A way under Vantry's walls. Varro would give a year's pay for it."),
        choose("The runner is waiting for an order. Cass is watching.",
               opt("Keep the Sisters' secret", [
                   say("rhea", R("A culvert. Nothing down there but rats. Tell Varro I'll come.")),
                   n("The runner goes. Cass lets out her breath."),
                   say("cass", R("You could have had Vantry. I'd have told you that myself. You didn't even ask.")),
                   say("cass", R("I'm done with the galleries. I want to see daylight with someone who keeps their word. Take me with you.")),
                   setf({"cassDone": "kept"}), *joins("cass"), toast("Cass joins Rhea's company."),
               ], hint="A way under Vantry, given up."),
               opt("Tell Varro about the galleries", [
                   say("rhea", R("Tell Varro there's a way under Vantry's walls, by the canal. I'll show him.")),
                   n("Cass turns round and goes back down into the dark without a word. The next time Rhea comes, the gallery mouth is bricked up from inside."),
                   setf({"cassDone": "told", "galleryWay": True}),
               ], hint="The Commons needs a way in.")),
    ], [iff({"eq": {"cassDone": "kept"}}, [n("The gallery mouth. Candlelight, a long way down.")], [n("The gallery mouth is bricked up from inside.")])]),
]
actor("cass-lamp", "town-candle-galleries", 11, 4, "cass", "cass", when(span("ad4"), **{"not": "cassDone"}))

# ---- Isel and Dellan: the Spire Folk
S["dellan"] = [
    iff({"not": "dellanMet"}, [
        n("A woman in a Guild breeder's apron is sitting on a bollard on the quay with her hands in her lap. Corvel's hatchery is empty behind her: the Commons took its children. She's out of work, and doesn't seem to mind."),
        n("She has three faint tattoo dots under one eye. While she sits, she's humming. It's very nearly the foal song. The third line is wrong in a way Rhea has never heard it wrong before."),
        say("dellan", R("Dellan. Breeder, Corvel's. Was. I've no idea where that tune's from. I've always had it. The Guild found me in a basket when I was little, they said, and raised me to the trays.")),
        setf({"dellanMet": True}),
    ], [iff({"flag": "vaelAsked"}, [run("dellanTruth")], [say("dellan", R("Still here. Nobody hires a breeder from the House the Commons emptied."))])]),
]
S["dellanTruth"] = [
    iff({"not": "dellanDone"}, [
        n("Dellan is on her bollard. The tune again."),
        choose("What does Rhea tell her?",
               opt(R("You weren't found in a basket. You were taken off a spire in Vael when you were four, by Guild trappers. Your people still sing the third line the way you do. Your mother's alive."), [
                   n("Dellan doesn't say anything for a long time. Then she touches the dots under her eye, as if she'd never noticed them."),
                   say("dellan", R("Twenty-three years. They told me the dots were a breeder's mark from the House.")),
                   say("dellan", R("I've a husband, and a girl of six. Can they come? To Thornwick first. I'd like to know who I am before I go and meet her.")),
                   setf({"dellanDone": "truth"}), *joins("dellan"), toast("Dellan joins Thornwick, with her family."),
                   n("At Thornwick, in the evening, she sits on the terrace wall while Rhea sings. When the third line comes, Dellan sings it with her, the Spire way, without knowing she knows it."),
               ], by="rhea", hint="All of it."),
               opt("Tell her nothing", [n("Rhea says nothing. Dellan goes on humming. Somewhere a long way off, on a spire, an old woman is still waiting."),
                                        setf({"dellanDone": "silent"})], hint="Some truths are too heavy.")),
    ], [iff({"eq": {"dellanDone": "truth"}}, [n("Dellan's bollard is empty.")], [say("dellan", R("Hello again, captain."))])]),
]
S["isel"] = [
    iff({"not": "iselMet"}, [
        n("A woman is standing on the cliff edge at the end of the village, with her white hair blowing loose, and a mistwing on her arm the size of a gate. The villagers stay well back from her."),
        say("isel", R("Isel, of Highspire. The Spire Folk heard you sing the foal song from the terraces, all the way across the cloud. Nobody's sung the third line of it right this side of the cloud in a hundred years.")),
        say("isel", R("The elders want to see the singer. The ridge path is cloud all the way. Follow the bird, not your feet, and you won't walk off the edge.")),
        setf({"iselMet": True, "open.cloudline-vael": True}),
        toast("The spire ridge west of the Cloudline is open: follow Isel's mistwing to Vael."),
    ], [say("isel", R("Follow the bird. Not your feet."))]),
]
S["elders"] = [
    iff({"not": "vaelAsked"}, [
        n("The elders of Highspire sit round the white-stone fire, five old women and a very old man, with their hair loose and mistwing feathers in it."),
        say("isel", R("They say: you sing the third line our way, lowlander. Where did your mother learn it?")),
        say("rhea", R("From her mother. From someone in the clans. Nobody ever said.")),
        say("isel", R("They say: twenty-three years ago, Guild trappers came over the ridge for mistwing eggs, and took a child from the lowest spire. Dellan, four years old. Three dots under her eye. They ask every lowlander who comes. Have you seen her?")),
        choose("The elders wait. The fire cracks.",
               opt(R("I've seen her. She's a breeder in the Millcities. She hums your song and doesn't know where it's from."), [
                   n("One of the old women puts her face in her hands."),
                   say("isel", R("Her mother. She says: thank you. She says: don't bring her here like a parcel. Let her choose.")),
                   setf({"vaelAsked": "told"}),
               ], when={"flag": "dellanMet"}, by="rhea"),
               opt(R("I haven't seen her. I'll look."), [say("isel", R("They say: then look. They have waited twenty-three years. They can wait for a lowlander to look.")), setf({"vaelAsked": "looking"})], by="rhea"),
               opt(R("She's gone. The Houses don't keep children that long."), [
                   n("The elders bow their heads. The old woman at the end begins to sing, very quietly, the song for the dead."),
                   setf({"vaelAsked": "dead"}),
               ], by="rhea", hint="Kinder than hope?")),
        say("isel", R("They have heard you. Whatever you told them, you came over the ridge to tell it. I'd like to see what the singer does next. My bird and I will come with you.")),
        *joins("isel"), toast("Isel joins Rhea's company."),
    ], [say("isel", R("The elders sing for you every evening now. You can't hear it. They don't mind."))]),
]
actor("dellan-quay", "town-lockside--quay", 12, 4, "dellan", "dellan", when(span("ad7"), **{"not": "dellanDone"}))
actor("isel-cliff", "town-mistfold", 4, 4, "isel", "isel", when(span("ad7"), **{"not": "recruited.isel"}))
actor("elders-fire", "town-highspire", 12, 10, "isel", "elders", when(span("ad7"), flag="iselMet", **{"not": "vaelAsked"}))

# ================================================================== the Long Road
# ---- Teodric: the Play About Rhea, at the Hollin fair
S["teodric"] = [
    iff({"not": "teodricDone"}, [
        n("A stage on a cart at the fair, and a crowd round it. A painted cloth says THE CAPTAIN OF THE CLOUD: A TRUE HISTORY. On the stage, an actress in a tan coat is fighting six Wardens at once with a scythe, and winning, and singing."),
        n("The Corran in the play has a black cloak and a moustache, and hisses. The crowd hisses back. The Finch in the play is a little boy carried off screaming by a Warden, and the crowd weeps."),
        say("teodric", R("Teodric. My play. Do you like it? You're her, aren't you? Of course you are. Look at your coat. Is the scythe right? I guessed the scythe.")),
        choose("The actress is singing a song Rhea has never sung, in a voice she's never had.",
               opt(R("Nobody fought six Wardens with a scythe. My husband didn't hiss. My brother wasn't carried off screaming. He went."), [
                   n("Teodric's face goes through several things at once. Then he takes the quill from behind his ear."),
                   say("teodric", R("He went? Of his own accord? Oh, that's better. That's much worse, and much better. Tell me all of it.")),
                   say("teodric", R("No, don't, not here. I'll come with you and watch. The Commons needs someone to tell its story to towns like this, and it ought to be the true one, more or less. More, mostly.")),
                   setf({"teodricDone": "truth"}),
               ], by="rhea", hint="Tell him the truth."),
               opt("Let the play run", [
                   n("Rhea watches to the end. The crowd stands and cheers the captain of the cloud. Three young men in the front row ask where the Commons recruits."),
                   say("teodric", R("You let it run! You know what it's for. I'll write you a better one on the road. With fewer scythes. Possibly.")),
                   setf({"teodricDone": "ran"}),
               ], hint="It's doing the Commons good.")),
        *joins("teodric"), toast("Teodric joins the Commons."),
    ], [say("teodric", R("Act Two needs a villain who's sorry. I've never written one of those. It's very difficult."))]),
]
actor("teodric-stage", "hollin-fair", 8, 6, "teodric", "teodric", when(span("ah8"), **{"not": "teodricDone"}))

# ---- Lisle: the surgeon who wants a way out
S["lisle"] = [
    iff({"not": "lisleDone"}, [
        n("A thin man with his hair in a knot is sitting on the College steps with a doctor's bag between his feet. His gown has the College's band on it, and under it, a Warden surgeon's grey."),
        say("lisle", R("Dr Lisle. Warden surgeon, at the Vantry barracks. College man, once. They've called me back to give evidence at the College's own trial, because the Guild's certificate had my name among the physicians who'd signed it.")),
        say("lisle", R("I signed it. I fit tins to officers who couldn't sleep. I told myself it was medicine. The Guild will want me to say so again, at the trial. The College will want me to say I was wrong. Either way, I'm finished in Vantry.")),
        say("lisle", R("I know who you are, captain. I've treated people you know. I'd rather not say who.")),
        choose("Lisle turns his bag round and round between his feet.",
               opt(R("Tell the College the truth. Then come to Thornwick. There's a lot of weaning to do, and nobody there who knows the Guild's strengths the way you do."), [
                   n("He laughs, once, a terrible little laugh."),
                   say("lisle", R("You'd have me. Knowing what I did.")),
                   say("rhea", R("I'd have you doing the opposite of it.")),
                   n("He gives his evidence the next morning, all of it. The College hears him out in silence. Afterwards, he walks out of the hall and keeps walking, north, to the mountain road."),
                   setf({"lisleDone": "thornwick"}), *joins("lisle"), toast("Dr Lisle joins Thornwick."),
               ], by="rhea", hint="A way out."),
               opt("Leave him to the College", [n("Rhea leaves him on the steps. He's still there when she goes, turning the bag round."), setf({"lisleDone": "left"})])),
    ], [iff({"eq": {"lisleDone": "thornwick"}}, [say("lisle", R("Thirty-one weaned this month. Oda says I'm too gentle. I've never been called that."))], [n("The College steps are empty.")])]),
]
actor("lisle-steps", "town-college", 14, 12, "lisle", "lisle", when(span("ah7"), **{"not": "lisleDone", "eq": {"road.college": "refused"}}))

# ---- Osk: Harl and Kel, and the ash flow
S["osk"] = [
    iff({"not": "oskDone"}, [
        n("A town of black stone on the side of a mountain that's breathing. The air tastes of struck matches. Ash is coming down like dirty snow."),
        n("A broad old man with a white beard and his collar open, his whole neck pale with old ring scars, is shouting orders on the harbour steps."),
        say("harl", R("Harl. Mayor of Osk, God help us. Exiles, every one of us. Lull-scarred, ring-marked. Ostrel threw us out, so we came here, where nobody else would live.")),
        say("harl", R("The mountain's going. Ash flow on the north side, coming down the gully. It'll be here by dark. We've boats for the upper town, and the lower town's cut off below the gully. We can't do both.")),
        choose("The mountain grumbles. Harl looks at the Commons officer on his harbour.",
               opt("The lower town first", [
                   n("Rhea takes the section down through the gully with ropes, and the lower town comes out on them: old men, children, a pregnant woman carried in a net."),
                   n("A young diver with a harpoon and salt-bleached hair goes back in three times for the people who won't leave, and comes out the third time with his hair on fire and an old woman on his back."),
                   say("kel", R("Kel. That's my grandmother. She wanted to finish her soup.")),
                   n("The ash comes down the gully at dusk, onto empty streets. The upper town gets out by boat. Some of the boats are slow. Everyone lives."),
                   setf({"oskDone": "lower"}), *joins("kel"), toast("Kel joins Rhea's company."),
               ], hint="The ones who can't get out on their own."),
               opt("The boats and the upper town", [
                   n("The upper town goes down to the harbour in good order, with Harl counting heads. The boats get out past the reef as the ash comes down the gully."),
                   n("The lower town gets itself out, mostly, over the rocks. Mostly."),
                   setf({"oskDone": "upper"}),
               ], hint="The most people, the fastest.")),
        say("harl", R("Osk's still here. Ash on everything, but here. You came across the sea for exiles, captain. The exiles will come across it for you. I'll raise what militia we have.")),
        *joins("harl"), toast("Harl joins the Commons, with the militia of Osk."),
    ], [say("harl", R("We're sweeping the ash off the steps. We'll be sweeping it for a year. We're good at that."))]),
]
actor("harl-steps", "town-cinder-landing", 11, 9, "harl", "osk", when(span("ah9"), **{"not": "oskDone"}))

# ---- The Salt House: Ysolde and Jessamy
S["saltHouse"] = [
    iff({"not": "saltDone"}, [
        n("A long low house of salt-crusted stone on the edge of the pans, with its doors open to the wind. Inside, from floor to roof, shelves of ledgers, wrapped in oilcloth against the damp."),
        say("ysolde", R("Ysolde. I keep the Salt House records. The Guild started here, captain, before Vantry. Breeding brine kith for salt-hauling, two hundred years ago. Every pairing they ever made is written down on these shelves.")),
        say("ysolde", R("They moved to Vantry and forgot this place. I didn't. I've read every book. There are things in them the Houses would burn the country to keep quiet.")),
        n("She hands Rhea one book, open. Notes on brine kith that would not breed tame, and were let go into the marsh, a hundred and thirty years ago, and bred wild there ever since."),
        say("ysolde", R("That herd is still out there. My tracker's been following it all summer.")),
        say("jessamy", R("Jessamy. Two hundred head on the far pans, wild since before your grandmother. The Guild's trappers are a day behind me. They'd like them back. Brine kith haul like nothing else alive.")),
        choose("Jessamy is watching Rhea. So is Ysolde.",
               opt("Leave the herd wild", [
                   n("The Commons fires the reed beds between the trappers and the pans, carefully, with the wind right. The trappers go round. It takes them a week. The herd is gone into the deep marsh by then."),
                   say("jessamy", R("You could've had two hundred haulers. You'd have won a war with them, maybe.")),
                   say("jessamy", R("I'll come. Somebody has to tell the Commons which marsh not to cross.")),
                   setf({"saltHerd": "wild"}), *joins("jessamy"), toast("Jessamy joins Rhea's company."),
               ], hint="Two hundred years free."),
               opt("Take a few for the Commons", [
                   n("Jessamy shows the Commons where the herd waters, and turns her back while they rope three young ones. She leaves that night without saying goodbye."),
                   setf({"saltHerd": "taken"}), kith("brineback", 14, "salt-brine", "Saltlick"),
               ], hint="Haulers for the war.")),
        choose("Ysolde is closing the book.",
               opt(R("Publish them. All of it. Let the country read where the Guild came from."), [
                   say("ysolde", R("Then I'll need a press and a safe place to run it. Thornwick, I'm told, has both, or will.")),
                   setf({"saltRecords": "published"}),
               ], by="rhea", hint="Ask her."),
               opt(R("Keep them safe. They're yours."), [
                   say("ysolde", R("Safe. Yes. They'll be safer at Thornwick than in a salt marsh with the Guild a day off. I'll come. The books come with me, and stay shut.")),
                   setf({"saltRecords": "kept"}),
               ], by="rhea", hint="Leave it to her.")),
        setf({"saltDone": True}), *joins("ysolde"), toast("Ysolde joins Thornwick, with the Salt House records."),
    ], [say("ysolde", R("Two hundred years of salt, and the ink still holds."))]),
]
actor("ysolde-house", "town-salt-house", 6, 5, "ysolde", "saltHouse", when(span("ah9"), **{"not": "saltDone"}))
actor("jessamy-pans", "town-salt-house", 8, 6, "jessamy", "saltHouse", when(span("ah9"), **{"not": "saltDone"}))

# ---- The Wandering Herd: Tavi and Senne
S["herd"] = [
    iff({"not": "herdDone"}, [
        n("The Wandering Herd's summer camp: felt tents, pens of woven hurdle, and out on the plateau, as far as Rhea can see, ironbacks. Thousands of them, moving slowly into the wind."),
        n("Three Commons foragers are by the pens, with an ironback calf roped. A young nomad with bone-beaded braids is standing between them and the calf, unarmed."),
        say("tavi", R("Tavi. The matriarch's rider. Your soldiers have taken nine calves this month, captain. They call it foraging. We call it what it is. The herd doesn't belong to anybody.")),
        n("The foragers look at Rhea. It's her column they're feeding."),
        choose("The calf is bawling for its mother.",
               opt("Stop them", [
                   say("rhea", R("Untie it. Pay for the nine you've taken, out of the column's purse. And nobody forages on the plateau again.")),
                   n("The foragers untie the calf. It goes off to the herd at a lopsided gallop. Tavi watches it all the way in."),
                   say("tavi", R("Nobody's ever stopped their own side for us. The matriarch will want to see that.")),
                   n("The matriarch, it turns out, is an ironback the size of a house, who looks at Rhea for a long time and then goes back to grazing. Tavi seems to think this is a great honour."),
                   setf({"herdDone": "stopped"}), *joins("tavi"), toast("Tavi joins Rhea's company."),
               ], hint="Your column eats less."),
               opt("Let them forage", [
                   n("The foragers take the calf. Tavi doesn't fight. She just turns and walks out onto the plateau, toward the herd, and doesn't look back."),
                   n("By morning, the whole herd has moved forty miles east, and the summer camp is gone with it."),
                   setf({"herdDone": "foraged"}),
               ], hint="An army has to eat.")),
    ], [iff({"eq": {"herdDone": "stopped"}}, [run("senne")], [n("Hurdle pens, empty, and trampled grass going east.")])]),
]
S["senne"] = [
    iff({"not": "senneDone"}, [
        n("A gentle old man in a saffron coat, with blue herd marks tattooed on his shaven head, is going along the Commons' own ironbacks, feeling their legs."),
        say("senne", R("Senne. Herd healer. Tavi said you'd want your beasts looked at. Two of them are lame, and one's been fed wrong all the way from Corvane.")),
        say("senne", R("Tavi vouches for you. Tavi doesn't vouch for her own cousins. I've healed the herd for forty years, and the herd can spare me. Your ironbacks can't.")),
        setf({"senneDone": True}), *joins("senne"), toast("Senne joins the Commons, to tend its ironbacks."),
    ], [say("senne", R("Feed them salt. They'll walk to the sea for you."))]),
]
actor("tavi-pens", "town-summer-fold", 7, 8, "tavi", "herd", when(span("ah24"), **{"not": "herdDone"}))
actor("senne-camp", "town-summer-fold", 16, 9, "senne", "senne", when(span("ah24"), flag="recruited.tavi", **{"not": "senneDone"}))

# ---- Thal: the Storm Roost nest
S["thal"] = [
    iff({"not": "thalDone"}, [
        n("A hut at the foot of the steps up into the storm. A young woman with storm-grey hair that stands straight up is coiling copper wire, fast, with her teeth set."),
        say("thal", R("Thal. There's a storm kith nest at the top of the Roost: a stormcrest and her clutch. I've watched them nine years. The Guild's trappers are coming up the north side tonight for the eggs.")),
        say("thal", R("I'm moving the nest. Up the steps, over the top, to the old roost on the south face where they can't climb. On my own it's a night's work and I won't finish. Help me, or get out of my light.")),
        choose("Thal goes on coiling wire.",
               opt("Help her move the nest", [
                   fade("Up the steps, into the storm."),
                   n("The stormcrest lets them come close because Thal sings to her, a flat crackling hum like a kettle. The eggs are as heavy as stones, and hot. They carry them over the top one at a time, in the dark, in the rain, with lightning walking on the ridge."),
                   n("The trappers come up the north side at dawn to an empty nest, and find Rhea and her party waiting at the top of their ropes."),
                   {"battle": "recruit-trappers", "win": [
                       n("The trappers go back down their ropes with nothing. On the south face, the stormcrest settles on her eggs in the old roost, and puts her head under her wing."),
                       say("thal", R("Nine years I've done this alone. That's the first time anyone's carried an egg for me.")),
                       say("thal", R("Your Commons fights in all weathers, I suppose. I read weather. Storm weather. I'll come down off the Roost, for once.")),
                       setf({"thalDone": "helped"}), *joins("thal"), toast("Thal joins Rhea's company."),
                   ]},
               ], hint="A long night, and a fight at dawn."),
               opt("Leave her to it", [n("Thal doesn't look up. In the morning there's smoke on the north side of the Roost, and the trappers' carts going down the road, loaded."), setf({"thalDone": "left"})])),
    ], [iff({"eq": {"thalDone": "helped"}}, [n("The hut is shut. Copper wire is coiled neatly by the door.")], [n("Thal's hut is shut, and she won't open it.")])]),
]
actor("thal-hut", "town-roost-foot", 6, 8, "thal", "thal", when(span("ah15"), **{"not": "thalDone"}))

# ---- Pim: the great drove
S["pim"] = [
    iff({"not": "pimDone"}, [
        n("Drovers' Halt is full: the great drove, once in a lifetime, every breeder in the north bringing their kith down the old road to the lowland markets at once. A dapper man with a waxed moustache and a teal coat covered in rosettes finds Rhea before she's off the road."),
        say("pim", R("Pim! Show judge, breeder, man of taste. You're the Thornwick lines. Everyone's talking about your loftbucks. Those foal-song lines. Name a price for the breeding rights. Any price.")),
        choose("Pim has a purse out already.",
               opt("Refuse", [
                   say("rhea", R("They're not for sale.")),
                   say("pim", R("Then race me for them! The great drove, Halt to Kerrow, first herd over the bridge. If you win, I'll come and breed for you, and gladly. If I win, I name the price after all.")),
                   fade("The great drove. Halt to Kerrow, two days on the old road."),
                   n("Pim's herd is faster on the flat. Rhea's is steadier. At the Kerrow gorge, where the road narrows to a ledge, Pim's lead buck balks at the drop, and the whole herd balls up behind it."),
                   n("Rhea sings. Ash goes first, and the Thornwick loftbucks go after him in a line along the ledge like beads on a string, and over the bridge."),
                   say("pim", R("The song. You cheated with the song. Ha! Wonderful. I've been on the wrong side all my life. I always come over to the winner, captain. Ask anyone.")),
                   setf({"pimDone": "won"}), *joins("pim"), toast("Pim joins Thornwick, to breed its lines."),
               ], hint="He'll want to race."),
               opt("Sell him the rights (150 coin)", [
                   pay(-150, [], []),
                   n("Pim pays in good Corvane coin and shakes hands, and in a year there will be foal-song loftbucks in every Guild stud in Ostrel."),
                   setf({"pimDone": "sold"}),
               ], hint="A fortune, and the lines go to whoever he sells them to.")),
    ], [iff({"eq": {"pimDone": "won"}}, [say("pim", R("Rosettes for everyone!"))], [n("Pim has gone down the road with his new breeding rights.")])]),
]
actor("pim-halt", "town-drovers-halt", 9, 8, "pim", "pim", when(span("ah0"), **{"not": "pimDone"}))

# ================================================================== the plot characters
# ---- Aldous: a free king rides out
S["aldous"] = [
    say("aldous", R("Captain. The court is mine again, for whatever that's worth after my mother's done with it. Lorne has a king who stood in his own court and was told the truth. Ostrel should have one too.")),
    say("aldous", R("My guard has never fought for anything but a hunting party. They'd like to. So would I. When the Commons goes to Vantry, the Crown goes with it.")),
    *joins("aldous"), toast("King Aldous joins the Commons, with the Crown's guard."),
]
actor("aldous-court", "town-kingsmere", 15, 8, "aldous", "aldous", when(span("ah42"), flag="aldousFree", **{"not": "recruited.aldous"}))

# ---- Hallet: stays when Kane is arrested, if Rhea shut the trade herself
S["hallet"] = [
    n("Hallet is outside the stockade where Kane is held, in full kit, alone, as if he's on guard. He isn't. He's waiting for Rhea."),
    say("hallet", R("I followed Kane for twenty years. I'd have burned the Broodhouse for him. I nearly did.")),
    say("hallet", R("You shut the lull trade with your own hands at Tarsis, when Kane would have sold it on. That's the only reason I'm standing here and not in there with him. Marshal. Where do you want me?")),
    *joins("hallet"), toast("Hallet stays with the Commons, under Rhea."),
]
actor("hallet-stockade", CAMP, 20, 3, "hallet", "hallet", when(span("af7", "af9"), flag="kaneArrested", **{"not": "recruited.hallet", "eq": {"road.tarsis": "greenlings"}}))

# ---- Corran: clean, at Thornwick, before the column goes
S["corranJoins"] = [
    n("Corran is at the gate with a pack on his shoulder, in a plain Commons coat that doesn't fit him. His neck is bare. There's nothing on it but scars."),
    say("corran", R("I know the Broodhouse. Every hall, every door, every guard's round. I watched it for two years from the other side.")),
    say("corran", R("I'm not asking for anything. Put me at the back of the column. Put me in chains if the men want it. Just let me be there.")),
    *joins("corran"), toast("Corran goes with the column to Vantry."),
]
actor("corran-gate4", TW, 14, 14, "corran", "corranJoins",
      when(["af9"], **{"not": ["recruited.corran", "corranWearing", "corranDead"], "eq": {"corranFate": "thornwick"}}))

# ---- Finch: comes down out of the halls for the last of it, if he trusts her
S["finchJoins"] = [
    n("A door in the inner wall opens a crack, and Finch slips out of it, with soot on his face and the number on his wrist, and Smoke's old halter rope coiled over his shoulder."),
    say("finch", R("The little ones are in the east hall with the door shut. They'll stay there. I told them I'd be back.")),
    say("finch", R("Halloran's by the fire in the inner yard. I've waited four years to see someone walk up to him. I'd like it to be us.")),
    *joins("finch"), toast("Finch joins Rhea for the last of it."),
]
actor("finch-yard", "broodhouse", 20, 16, "finch", "finchJoins",
      when(["af10"], flag=["finchInBroodhouse", "yardFought"], **{"not": ["recruited.finch", "halloranBeaten"], "atLeast": {"finchTrust": 60}}))
# at the gate the story has its own places for them: they go ahead of her
zones.append({"map": "broodhouse", "area": [0, 0, 31, 21], "when": when(["af11"], flag="party.finch"),
              "do": [{"leave": "finch"}, n("Finch goes ahead of her into the smoke, toward the halls, where the children are.")]})
zones.append({"map": "broodhouse", "area": [0, 0, 31, 21], "when": when(["af11"], flag="party.corran"),
              "do": [{"leave": "corran"}, n("Corran goes ahead of her to the inner gate.")]})


# ================================================================== ways into the new places, and who lives there
for p in PLACES:
    for fid, look, x, y, text in FOLK.get(p["id"], []):
        x, y = spot(f"town-{p['id']}", x, y)
        actors.append({"id": fid, "map": f"town-{p['id']}", "x": x, "y": y, "look": look, "when": {"stagePrefix": "a"}, "talk": [n(text)]})
    land = json.load(open(os.path.join(ROOT, "data/maps", f"land-{p['land']}.json")))
    place = next(pl for pl in land["places"] if pl["id"] == p["id"])
    mid, rows, (sx, sy) = f"town-{p['id']}", p["rows"], p["spawn"]
    steps.append({"map": f"land-{p['land']}", "at": [place["x"], place["y"]], "when": {"stagePrefix": "a"},
                  "do": [goto(mid, sx, sy - 1, "up")]})
    for x, ch in enumerate(rows[-1]):
        if ch == "e":
            steps.append({"map": mid, "at": [x, len(rows) - 1], "do": [goto(f"land-{p['land']}", place["x"], place["y"] + 1, "down")]})


# ================================================================== battles
def unit(id, name, look, lvl, at, row="front", cast_=None, skills=("wstrike",), kith_=None, hp=None, species=None):
    u = {"id": id, "name": name, "look": look, "side": "foe", "row": row, "level": lvl, "skills": list(skills), "at": list(at)}
    if cast_: u["cast"] = cast_
    if kith_: u["kith"] = True
    if hp: u["hp"] = hp
    if species: u["species"] = species
    return u


BATTLES = {
    "recruit-stampede": {"name": "The stampede", "backdrop": "meadow", "party": True,
                         "intro": ["Wild loftbucks out of the fog, mad with fright, coming for the gap in the terrace wall.", "Turn the leaders and the rest will follow."],
                         "won": "The herd breaks round the wall", "lost": "The herd goes through the gap",
                         "units": [unit("sb1", "Wild loftbuck", "loftbuck:#a8988a", 5, (168, 92), skills=("horns",), kith_=True, hp=36, species="loftbuck"),
                                   unit("sb2", "Wild loftbuck", "loftbuck:#9a8a7a", 4, (186, 114), skills=("horns",), kith_=True, hp=30, species="loftbuck"),
                                   unit("sb3", "Loftbuck yearling", "loftbuck:#c8b8a8", 3, (160, 126), skills=("horns",), kith_=True, hp=22, species="loftbuck")]},
    "recruit-pollard": {"name": "The last round", "backdrop": "yard", "party": True,
                        "intro": ["The Guild buyer's handlers, and the kith he brought to win with.", "The crowd is on Pollard's side. It doesn't help much."],
                        "won": "The ring-keeper hands over the chain", "lost": "The Guild buyer keeps his prize",
                        "units": [unit("pb1", "Guild handler", "cartwarden", 7, (176, 96), cast_="warden"),
                                  unit("pb2", "Show reedcat", "reedcat:#c8a870", 7, (160, 124), skills=("pounce",), kith_=True, hp=30, species="market-reedcat"),
                                  unit("pb3", "Guild handler", "cartwarden", 6, (200, 118), cast_="warden")]},
    "recruit-kennels": {"name": "The kennel post", "backdrop": "yard", "party": True,
                        "intro": ["Kennel-men in Warden grey, and the hounds they've let off the chain.", "The hounds are only doing what they were taught."],
                        "won": "The kennel-men run for the road", "lost": "Driven out of the kennel yard",
                        "units": [unit("kb1", "Kennel-man", "warden", 8, (176, 96), cast_="warden"),
                                  unit("kb2", "Warden hound", "reedcat:#8a8a90", 8, (160, 124), skills=("pounce", "maul"), kith_=True, hp=40, species="warden-reedcat"),
                                  unit("kb3", "Warden hound", "reedcat:#9a9aa0", 7, (198, 120), skills=("pounce",), kith_=True, hp=34, species="warden-reedcat")]},
    "recruit-strikebreakers": {"name": "The mill gates", "backdrop": "road", "party": True,
                               "intro": ["Guild strike-breakers with clubs, come down the Vantry road in the night.", "The millgirls are singing behind you."],
                               "won": "The strike-breakers go back up the Vantry road", "lost": "The mill gates are forced",
                               "units": [unit("st1", "Strike-breaker", "cartwarden", 10, (176, 96), cast_="warden"),
                                         unit("st2", "Strike-breaker", "cartwarden", 10, (196, 118), cast_="warden"),
                                         unit("st3", "Guild foreman", "warden", 11, (220, 104), cast_="warden")]},
    "recruit-trappers": {"name": "The trappers' ropes", "backdrop": "scree", "party": True,
                         "intro": ["Guild trappers at the top of their ropes, with nets, and a hooded reedcat for sniffing out nests.", "The stormcrest is on her eggs behind you."],
                         "won": "The trappers go back down their ropes", "lost": "The trappers reach the nest",
                         "units": [unit("tr1", "Guild trapper", "cartwarden", 19, (176, 96), cast_="warden"),
                                   unit("tr2", "Guild trapper", "cartwarden", 19, (198, 118), cast_="warden"),
                                   unit("tr3", "Nest-sniffer", "reedcat:#6a6a72", 18, (160, 126), skills=("pounce", "maul"), kith_=True, hp=56, species="reedcat")]},
}

# ================================================================== the file
objectives = {}
moods = {"scenes": {k: "camp" for k in S}, "stages": {}}
moods["scenes"].update({
    "lanto": "night", "linnet": "tension", "fairweather": "tension", "rafeFence": "dusk", "rafeBack": "hope", "junoInquiry": "camp", "junoThornwick": "hope", "wick": "tension",
    "yewBundle": "camp", "yewHut": "tender", "grue": "hope", "eddaStampede": "tension", "eddaJoins": "hope", "eddaLate": "camp", "bee": "tender",
    "mags": "camp", "severin": "dread", "umeDebts": "tension", "teo": "tension", "hobb": "hope", "mirela": "night", "pollard": "tension",
    "greet": "sombre", "pell": "tender", "lyle": "hope", "merelOffer": "dread", "merelAfter": "grief", "wystan": "tension", "wystanPen": "sombre",
    "tully": "tender", "joss": "tension", "deep": "dread", "strikeVote": "tension", "jossAfter": "camp", "cass": "night", "galleries": "sombre",
    "cassAfter": "tension", "dellan": "dusk", "dellanTruth": "tender", "isel": "hope", "elders": "tender", "teodric": "hope", "lisle": "sombre",
    "osk": "fire", "saltHouse": "dusk", "herd": "tension", "senne": "hope", "thal": "tension", "pim": "hope", "aldous": "hope", "hallet": "sombre",
    "corranJoins": "tender", "finchJoins": "tension",
})

# script names of their own, so they never clash with the acts' (the acts have a "lisle" scene of their own)
def _prefix(o):
    if isinstance(o, dict):
        return {k: ("rec." + v if k == "run" and v in S else _prefix(v)) for k, v in o.items()}
    if isinstance(o, list): return [_prefix(v) for v in o]
    return o


actors, zones, S = _prefix(actors), _prefix(zones), {"rec." + k: _prefix(v) for k, v in S.items()}
moods["scenes"] = {"rec." + k: v for k, v in moods["scenes"].items()}

story = {"id": "recruits", "title": "Recruits", "voiced": [], "moods": moods, "cast": cast, "objectives": objectives,
         "actors": actors, "steps": steps, "zones": zones, "looks": [], "songs": [], "hazards": [], "scripts": S}

if __name__ == "__main__":
    with open(OUT, "w") as f:
        json.dump(story, f, indent=1, ensure_ascii=False); f.write("\n")
    for id, b in BATTLES.items():
        with open(os.path.join(ROOT, "data/battle", id + ".json"), "w") as f:
            json.dump({"id": id, **b}, f, indent=1); f.write("\n")
    have = {k[len("recruited."):] for k in re.findall(r'"(recruited\.[a-z]+)"', json.dumps(story))}
    print(len(S), "scripts,", len(actors), "actors,", len(BATTLES), "battles;", len(have), "recruits can join here")
