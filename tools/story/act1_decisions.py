"""Adds the Act I decisions that change the story for good (see the 'Decisions that change the story' plan) to
data/story/act1.json. Safe to run more than once: each patch checks whether it is already in."""
import json, os
P = os.path.join(os.path.dirname(__file__), "..", "..", "data", "story", "act1.json")
d = json.load(open(P))
S = d["scripts"]
n = lambda t: {"say": "", "text": t}
say = lambda who, t: {"say": who, "text": '"' + t + '"'}
iff = lambda c, a, b=None: {"if": c, "then": a, **({"else": b} if b else {})}
setf = lambda x: {"set": x}
opt = lambda label, do, by=None, hint=None: {"label": label, "do": do, **({"by": by} if by else {}), **({"hint": hint} if hint else {})}
has = lambda script, key: key in json.dumps(S[script])

# 1. Sallow: the last two children (Brannoc, or Rhea's hands)
k = S["ketti"]
if not has("ketti", "sallowFire"):
    i = next(i for i, s in enumerate(k) if s.get("text", "").startswith("Brannoc and Tamsin go in"))
    k[i:i + 1] = [
        n("Brannoc and Tamsin go in with wet cloths over their faces and come out with four more. Brannoc goes back for the last two alone."),
        n("The roof over the back corner is sagging. Through the smoke you can see Brannoc's shape, bent over the trays. Tamsin has the others back from the door."),
        {"choose": "The roof groans.", "options": [
            opt("Go in after him", [
                n("Rhea pulls the wet cloth over her face and goes in."),
                n("She finds him on his knees with a child under each arm, and gets her shoulder under his. They're two steps from the door when the roof comes down."),
                n("A burning beam lands across Brannoc's back. Rhea gets her hands under it and lifts, and keeps lifting, while it burns her palms. Tamsin drags all four of them clear."),
                n("Nobody dies in the Sallow hatchery tonight. Brannoc very nearly does. Before dawn, Rhea's hands are wrapped to the wrist, and the nurse doesn't promise her anything about them."),
                setf({"sallowFire": "went", "mods.rhea": "burned", "rheaHands": True}),
            ]),
            opt("Hold the door", [
                n("Rhea keeps Tamsin and the others back from the door. Somebody has to, or the roof takes all of them."),
                n("Brannoc comes out with one child, a little girl, and the roof comes down behind him, across his back. He tries to go back in for the other. It takes three soldiers to hold him down in the yard while the brood house falls in."),
                say("ketti", "That was Wil. He was four. He used to sleep under my tray."),
                n("One child dies in the Sallow hatchery tonight. Brannoc's back is burned from his shoulders to his belt."),
                setf({"sallowFire": "door", "nofight.brannoc": True, "brannocBuilder": True}),
            ]),
        ]},
    ]
    j = next(i for i, s in enumerate(k) if s.get("text", "").startswith("By dawn the Sallow hatchery is ash"))
    k[j:j + 1] = [iff({"eq": {"sallowFire": "door"}},
                      [n("By dawn the Sallow hatchery is ash, and two hundred and five children are sitting in the road wrapped in Commons blankets.")],
                      [n("By dawn the Sallow hatchery is ash, and two hundred and six children are sitting in the road wrapped in Commons blankets.")])]

# the morning after: Ketti, and Brannoc in the nurses' tent
b = S["brannocDown"]
if not has("brannocDown", "kettiLeft"):
    b.insert(0, iff({"flag": "kettiLeft"}, [n("The nurses are still talking about the girl from Sallow. She came back in the night, took both little ones out of the tent while the nurse slept, and walked off with them. Nobody has seen any of them since.")]))
    i = next(i for i, s in enumerate(b) if s.get("say") == "brannoc")
    b.insert(i + 1, iff({"eq": {"sallowFire": "door"}}, [
        say("brannoc", "She says I'll walk. She says I'll never lift a shield again. I'll argue with her about that for a year, and lose."),
        say("brannoc", "And the boy. Don't tell me it was the right call, Caddow. I know it was. That's the worst of it."),
    ], [
        say("brannoc", "And look at your hands. You great fool. You'll never hold a staff the same."),
    ]))
v = S["sectionVote"]
if not has("sectionVote", "sallowFire"):
    i = next(i for i, s in enumerate(v) if s.get("say") == "tamsin")
    v.insert(i + 1, iff({"eq": {"sallowFire": "door"}}, [
        say("soldier", "Wil was four. She held the door while Brannoc went back in. I know why she did it. I'm still not putting my hand up."),
    ], [
        say("soldier", "She went in after him with her bare hands. Ask to see them. That's my vote."),
    ]))

# 6. Hob's Bend: the cart warden
c = S["cartFight"]
if not has("cartFight", "carter"):
    win = c[-1]["win"]
    i = next(i for i, s in enumerate(win) if s.get("say") == "brannoc")
    win.insert(i + 1, {"choose": "The cart warden lies in the road.", "options": [
        opt("Leave him in the road", [setf({"carter": "spared"}), n("Rhea steps over him.")]),
        opt("Tie him up. He goes to Kane.", [
            setf({"carter": "taken"}),
            n("Brannoc ties the warden's wrists with his own belt and slings him across a loftbuck. He doesn't say anything, which isn't like Brannoc."),
        ]),
    ]})
a = S["afterCart"]
if not has("afterCart", "carter"):
    a.insert(1, iff({"eq": {"carter": "taken"}}, [
        say("kane", "And you brought me a Guild cart warden. He'll hang at first light, from the oak by the drove road, where every Guild driver on the road will see him."),
        n("He does. By morning the warden is hanging from the oak by the drove road. He's still there a week later, and then he isn't, and nobody asks who cut him down."),
    ]))

# 8. Ferris on the night watch: why he stopped (Act III reads ferrisWhy at Lockside)
nw = S["nightWatch"]
if not has("nightWatch", "back gate"):
    ch = next(s for s in nw if "choose" in s)
    ch["options"][0]["do"].insert(-1, say("ferris", "Four years of it, and I still know which back gate nobody locks in every Guild yard from here to Vantry. Drivers learn that in their first month."))

json.dump(d, open(P, "w"), indent=1, ensure_ascii=False)
print("act1 decisions in")
