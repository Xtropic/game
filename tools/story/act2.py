"""Builds data/story/act2.json: from the first harvest after the raid to the next summer.
Rhea's stages start "ab", Corran's interludes "ac" (both start with "a", so the open world of Act I,
its towns and its camp stay as they were)."""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "../../data/story/act2.json")


def say(who, text): return {"say": who, "text": text}
def n(text): return {"say": "", "text": text}
def q(who, text): return {"say": who, "text": f"“{text}”".replace("“", '"').replace("”", '"')}
def stage(s): return {"stage": s}
def run(s): return {"run": s}
def fade(c): return {"fade": c}
def goto(m, x, y, facing="up"): return {"goto": {"map": m, "x": x, "y": y, "facing": facing}}
def sett(**kw): return {"set": {k.replace("__", "."): v for k, v in kw.items()}}
def setf(d): return {"set": d}
def add(d): return {"add": d}
def toast(t): return {"toast": t}
def iff(cond, then, els=None):
    s = {"if": cond, "then": then}
    if els is not None: s["else"] = els
    return s
def opt(label, do, hint=None, by=None, when=None):
    o = {"label": label}
    if hint: o["hint"] = hint
    if by: o["by"] = by
    if when: o["when"] = when
    o["do"] = do
    return o
def choose(prompt, *options): return {"choose": prompt, "options": list(options)}
def R(t): return '"' + t + '"'   # a spoken line, in quotes


cast = {
    "oakes": "Sergeant Oakes", "lyle": "Lyle", "dorrit": "Dorrit", "hesk": "Hesk Marrow", "ume": "Grandmother Ume",
    "tobin": "Tobin", "factor": "The Guild factor", "carter": "The carter", "smuggler": "The man with the tins",
    "child": "A girl at the gate", "posy": "Posy", "rider": "Kane's rider", "warden2": "Warden",
}

objectives = {
    # Rhea
    "ab1": "Kane will want to hear about Oda's trays. He's in his tent at the top of the camp.",
    "ab2": "Take the section up to Thornwick, the ruined monastery on the Cloudline: up the mountain road, then east of Larkfold.",
    "ab3": "Wild loftbucks have taken the old bathhouse in the north-west corner. Get them out: sing (Q), or drive them out.",
    "ab3c": "The spring is only a trickle. Take the stair behind the altar stone in the chapel, and find what's blocking the monks' channel.",
    "ab3e": "The water's running. Something is screaming in the cistern behind the grate, at the east end of the passage.",
    "ab4": "Brannoc wants a word about the work before the snow. He's by the fire.",
    "ab5": "Dorrit's supply cart has come up from the camp. She's at the gate.",
    "ab6": "Evening. Ash is restless in the new pen on the east side. Go and sing to him (Q).",
    "ab7": "Turn in. Your tent is the one in the south-west corner.",
    "ab8": "The first snow. Oda is at the cellar door by the spring. She's sent for you.",
    "ab9": "Go to Ume's terraces, west of Larkfold on the Cloudline, and ask the clan for moss.",
    "ab10": "Bring Tobin home to Thornwick.",
    "ab11": "Take Tobin to Oda at the cellar door. She has his first greenling ready.",
    "ab12": "Turn in at your tent.",
    "ab13": "Midwinter. Kane's supply cart is stuck on the ice at the gate.",
    "ab14": "Go down to the Commons camp and ask Kane about the crates.",
    "ab15": "Go back up to Thornwick before the snow shuts the road.",
    "ab16": "The two prisoners are tied in the chapel ruin. Talk to them.",
    "ab17": "The section is at the fire. They're waiting for you to decide.",
    "ab18": "Turn in.",
    "ab19": "Spring. A rider from Kane is at the gate.",
    "ab20": "Kell's Bridge. Varro is on this bank. The Guild's officer is waiting in the middle of the bridge.",
    "ab21": "Home to Thornwick. Turn in when you're ready.",
    "ab22": "Late spring. Tobin is at the gate with his pack, and Ume has come down to see him go.",
    "ab23": "Turn in.",
    "ab24": "Summer. Kane has come up to Thornwick. He's in the chapel with Brannoc.",
    "ab25": "Turn in, Lieutenant.",
    "ab26": "A girl has walked up to the gate on her own. Go and see to her.",
    # Corran
    "ac1": "Captain Halloran has sent for you. He's in the yard.",
    "ac2": "Dr Lisle wants to see the burns before your watch.",
    "ac3": "Evening. Your rooms. The letter is still on the table.",
    "ac5": "Finch's birthday. You promised him something. He's by the door.",
    "ac6": "The high pass. Finch has gone up toward the wild loftbucks.",
    "ac7": "Dr Lisle's surgery.",
    "ac8": "A back room on the Spindle canal. The man with the tins is waiting.",
    "ac9": "Home. Finch has waited up.",
    "ac10": "Night watch at House Mire's hatchery. The tin is in your pocket.",
    "ac11": "The pressure bell. Get the children out of the brood room, then get to the door.",
    "ac12": "Morning. Walk the brood rooms.",
    "ac13": "Captain Halloran has come down to the brood rooms.",
}

S = {}  # scripts

# ------------------------------------------------------------------ the camp, autumn
S["act2Start"] = [
    setf({"act2": True, "light": "dusk", "noWild": False, "hero": "rhea"}),
    iff({"flag": "recruited.oda"},
        [say("rhea", R("Back to the camp. Oda's trays won't keep in a cave on their own all winter, and I'm not leaving them there."))],
        [say("rhea", R("Back to the camp. There's nothing left up there."))]),
    say("brannoc", R("Then back to the camp it is. Slowly, if nobody minds. My back minds.")),
    fade("A week on the road, down the mountain and east along the drove road."),
    setf({"light": "day"}),
    goto("camp", 12, 10, "up"),
    run("frost"),
]
S["frost"] = [
    iff({"not": "recruited.oda"}, [
        n("Someone thin as a stick is waiting by the hay bales, with three brood trays wrapped in sacking at her feet."),
        say("oda", R("Rhea Caddow. I heard singing on the terraces at harvest. By the time I'd climbed out of the caves you were gone. I followed your tracks down.")),
        n("Old Oda, who kept Larkfold's greenling trays. She has lived in the spring caves since the raid."),
        setf({"recruited.oda": True}),
    ]),
    n("The first frost came in the night. Oda has unwrapped one of her trays on the hay. The larvae in it are grey and still."),
    say("oda", R("Larvae die in the cold. Every child in Larkfold knew that. I've kept the other two alive under my own blankets, and that won't last a week of this.")),
    say("oda", R("They need warm water under them. A spring, like home. There's no spring in this camp.")),
    choose("Oda waits.",
           opt(R("There's a ruin on the Cloudline, east of Larkfold. Thornwick. It's built over a hot spring."), [], by="rhea"),
           opt(R("I'll find you somewhere warm, Oda. Give me a day."), [say("oda", R("You've got about two.")), n("Rhea thinks of the ruin she walked past on the Cloudline, steaming in the cold. Thornwick.")], by="rhea")),
    say("oda", R("Then ask your Marshal for it. Nobody else is using it.")),
    stage("ab1"),
]

S["kane2"] = [
    iff({"stage": "ab1"}, [run("kaneThornwick")], [
        iff({"stage": "ab14"}, [run("kaneCrates")], [
            iff({"stage": "ab2"}, [say("kane", R("Thornwick, Caddow. Before the snow."))], [
                say("kane", R("You've a post to hold, Caddow. Go and hold it."))])])]),
]
S["kaneThornwick"] = [
    n("Kane is at his map table, with a list of the camp's winter stores weighted down under his knife."),
    say("kane", R("Caddow. Brannoc says you brought an old woman down the mountain with three trays of greenlings. Is that true?")),
    say("rhea", R("Two trays now. The frost took one. They need warm water under them, or they'll all go.")),
    say("kane", R("We've a hundred people in the weaning tents and nothing to wean them with but what we take off Guild carts. Two trays of greenlings is worth more to me than a cart of flour.")),
    choose("Kane waits for the rest.",
           opt(R("There's a ruin over a hot spring on the Cloudline. Thornwick. Give me the section and I'll hold it through the winter."), [], by="rhea"),
           opt(R("Larkfold had a spring. Thornwick has one too. Let us go and keep them alive there."), [], by="rhea")),
    say("kane", R("Thornwick. Monks built it, a hundred years ago, and the cold drove them out. It'll be roofless and full of kith.")),
    say("kane", R("I can't spare a company for a ruin. A section, I can spare. Yours. You'll have Brannoc too: his back won't be fit to march to Millbridge before spring, and he can be useless just as well up there.")),
    say("kane", R("Keep those trays alive, Sergeant. Keep your people alive. Don't light big fires where the valley can see them.")),
    toast("Thornwick is east of Larkfold on the Cloudline. Up the mountain road from the vale."),
    setf({"thornwick": True}),
    stage("ab2"),
]

# ------------------------------------------------------------------ Thornwick, autumn
S["thornArrive"] = [
    n("The mountain road gives out a mile short of Thornwick. A whole shoulder of the hill has come down across it: scree, split boulders, a pine lying with its roots in the air."),
    say("brannoc", R("Spring melt. Took the road with it. Nobody's been up here in years, Sergeant, and this is why.")),
    choose("How do you get the carts across?",
           opt("Dig a ledge across the slide", [setf({"road": "dug"}), fade("Two days with picks and crowbars, and a ledge just wide enough for a cart."),
                                                 say("tamsin", R("My hands have stopped being hands."))], hint="Slow and safe."),
           opt("Rope the carts across", [setf({"road": "roped"}),
                                          n("Tamsin runs a line from the pine's roots to a spur of rock on the far side, and the section walks the carts over one at a time, holding their breath."),
                                          n("The last cart's back wheel goes over the edge. Brannoc holds it on the rope, red to the ears, until the others drag it back.")], hint="Quick, and risky.")),
    n("Halfway across, the scree moves where nobody has stepped. Grey backs among the grey stones. Eyes."),
    say("tamsin", R("Reedcats. A whole den of them in the slide, and we're walking on their roof.")),
    {"battle": "thornwick-road", "win": [
        n("The reedcats scatter up the slope and watch you go from the rocks."),
        run("thornGate"),
    ]},
]
S["thornGate"] = [
    n("Thornwick's gate is choked to the lintel with fallen stone, and the lintel itself has cracked and dropped across the gap."),
    say("brannoc", R("Stand back.")),
    n("Brannoc gets his shoulder under the broken lintel, and lifts, and holds it, shaking, while the rest of you drag the rubble out from under him a stone at a time."),
    fade("An afternoon of shifting stone."),
    goto("thornwick", 13, 13, "up"),
    {"alone": True},
    n("Thornwick sits on a shelf of rock over the cloud. A chapel with no roof. A bathhouse with no door. Walls the frost has been pulling apart for a hundred years."),
    n("In the middle of it all, a shallow pool steams in the cold, and the air smells of wet stone and warm water."),
    say("tamsin", R("It's a ruin, Rhea.")),
    say("rhea", R("It's a warm ruin.")),
    n("Something bellows from the old bathhouse in the north-west corner, and hooves skitter on stone."),
    say("brannoc", R("And somebody already lives here.")),
    stage("ab3"),
]
S["bucks"] = [
    iff({"stage": "ab3"}, [
        n("Two wild loftbucks have made the warm bathhouse their winter den: a big grey buck and a yearling half his size. The buck lowers his horns at you."),
        choose("The buck stamps.",
               opt("Drive them out", [run("bathFight")], hint="A fight. They're wild, not wicked."),
               opt("Step back and sing", [n("You back off a few steps. The foal song works best when they can hear it and see you aren't coming closer. Press Q.")], hint="The foal song (Q).")),
    ], [n("The loftbucks have gone.")]),
]
S["bathFight"] = [
    {"regroup": True},
    {"battle": "thornwick-bathhouse", "win": [
        {"alone": True},
        n("The loftbucks crash out through the gap in the wall and away down the terraces into the cloud. The bathhouse is yours, and it smells terrible."),
        setf({"bathhouse": "driven"}),
        run("bathDone"),
    ]},
]
S["bathSong"] = [
    n("Rhea sings the foal song, low and slow, the way she sang it at Larkfold. The buck's ears swing toward her. His head comes up."),
    n("He listens all the way through. Then he walks out of the bathhouse past her, close enough to touch, and away down the terraces into the cloud."),
    n("The yearling doesn't follow. It stands in the doorway, looking at Rhea, and then at Ash, and then lies down in the warm."),
    say("tamsin", R("I think you've been adopted.")),
    {"kith": {"species": "loftbuck", "level": 3, "id": "thornwick-yearling", "name": "Burr", "temperament": "gentle"}},
    toast("A wild loftbuck yearling stays at Thornwick. Tamsin names it Burr, for the burrs in its coat."),
    setf({"bathhouse": "sung"}),
    run("bathDone"),
]
S["bathDone"] = [
    n("Rhea kneels by the spring. It's warm, but it's hardly a pool: a skin of water over the stones, fed by a trickle from a pipe in the chapel wall."),
    say("oda", R("That won't keep trays warm through a winter, child. There's more water than that under this hill. Listen.")),
    n("She's right. Put an ear to the stones and there's a roar down there, somewhere under the chapel."),
    say("brannoc", R("The monks will have cut a channel to bring it up. It'll be blocked. There's a stair under the chapel floor, behind the altar stone. Take the lamps.")),
    setf({"sluice": 0}),
    stage("ab3c"),
]
S["underDown"] = [
    {"regroup": True},
    goto("undercroft", 2, 2, "down"),
    iff({"not": "underSeen"}, [
        setf({"underSeen": True}),
        n("Thirty steps down, the air turns warm and wet. The lamps show a long stone passage, a channel running black along one side of it, and a hundred years of fallen roof."),
        say("tamsin", R("Something lives down here. Smell that?")),
    ]),
]
S["underUp"] = [goto("thornwick", 14, 4, "down"), {"alone": True}]
S["kits"] = [
    n("Two half-grown reedcats, big as hounds, stand in the gap in the rubble with their backs up. Behind them, the passage goes on into the dark."),
    choose("They spit at the lamps.",
           opt("Drive them off", [run("kitsFight")], hint="A fight."),
           opt("Step back and sing", [n("You back off a few steps and set the lamps down. The foal song works best when they can see you aren't coming closer. Press Q.")], hint="The foal song (Q).")),
]
S["kitsFight"] = [
    {"battle": "thornwick-kits", "win": [n("The kits bolt away past the sluices and through the bars of an iron grate at the far end."), setf({"kits": True})]},
]
S["kitsSong"] = [
    n("Rhea sings low. The kits' ears come round. One sits. The other yawns, enormously, the way frightened cats do, and then they both slip away through the bars of an iron grate at the far end of the passage."),
    setf({"kits": True}),
]
S["carving"] = [
    n("Words cut into the wall over three iron wheels, worn shallow, filled with green: THE HIGH WATER FIRST. THE LOW WATER AFTER. LAST, THE WHEEL THAT SINGS."),
    say("brannoc", R("Monks. Couldn't just paint an arrow.")),
]
def valve(desc, need, after):
    return [choose(desc,
                   opt("Turn it", [iff({"eq": {"sluice": need}}, after, [run("sluiceWrong")])]),
                   opt("Leave it", []))]
S["valveHigh"] = valve("A wheel on a pipe that climbs into the roof, up toward the spring.", 0,
                       [setf({"sluice": 1}), n("It grinds round. Somewhere above, water knocks in the pipe.")])
S["valveLow"] = valve("A wheel on a pipe that runs along the floor and down into the channel.", 1,
                      [setf({"sluice": 2}), n("It turns stiffly. The channel at your feet gurgles and starts to rise.")])
S["valveSing"] = valve("A wheel on a short, thick pipe. Tap it, and it rings a clear note that goes on a long time.", 2,
                       [setf({"sluice": 3}), run("sluiceOpen")])
S["sluiceWrong"] = [
    n("The wheel turns, and the pipes shriek. A joint bursts and scalding water roars out across the passage; everyone throws themselves flat."),
    n("When it stops, all three wheels have spun back shut."),
    setf({"sluice": 0}),
]
S["sluiceOpen"] = [
    n("The last wheel turns, and the note it sings drops lower and lower until it's under your feet. Then the whole hill groans."),
    n("Water roars down the channel. Behind the iron grate at the end of the passage, the cistern starts to fill, and something in the dark there screams."),
    say("tamsin", R("That wasn't a pipe.")),
    stage("ab3e"),
]
S["cisternBoss"] = [
    n("The grate's lock is a lump of rust. It gives at the first kick. Beyond is the cistern: a stone hall, the water rising, warm as breath."),
    n("On the dry shelf at the back, over a nest of moss and stolen rags, a reedcat the size of a pony gets to her feet. Grey at the muzzle. Scarred across both shoulders. A kit presses against her legs."),
    say("brannoc", R("That's the biggest reedcat I've ever seen. She's had this hill longer than the monks did, I'd say.")),
    say("rhea", R("And we've just flooded her house.")),
    n("She's too proud to hear a song from someone she's never seen tired. Wear her down first, then sing."),
    {"battle": "thornwick-cistern", "win": [run("cisternDone")]},
]
S["cisternDone"] = [
    n("The Old Mother backs up the shelf, her kit under her chin, and squeezes out through a crack in the cistern roof where the hillside lets in a grey square of sky."),
    n("At the top she stops, and looks down at Rhea for a long moment. Then she's gone."),
    goto("thornwick", 14, 7, "down"), {"alone": True},
    n("Up in the yard, the spring is filling. It steams and spreads and overflows its old stone lip, and runs away down the channel the monks cut for it, out over the cliff into the cloud."),
    say("oda", R("Now that's a spring.")),
    say("tamsin", R("Rhea. Look at it. It's ours.")),
    say("brannoc", R("Road, gate, bathhouse, cellar and a cat the size of a cart. Right. Now the work starts. Come and find me by the fire when you've had a look round.")),
    toast("Thornwick is yours."),
    setf({"thornwickClaimed": True}),
    stage("ab4"),
]
S["workChoice"] = [
    n("Brannoc is sitting on an upturned crate by the fire, with a stick, drawing in the dirt."),
    say("brannoc", R("Two jobs before the snow, Sergeant, and the snow's about ten days off. You can smell it.")),
    say("brannoc", R("One: the spring. The cellar beside it is full of a hundred years of rubble, and Oda needs it clear to set her trays over the warm water.")),
    say("brannoc", R("Two: the storeroom. The roof's half in. If Kane sends up flour and it gets wet, we eat paste till spring.")),
    say("brannoc", R("We've hands for one before the weather turns. The other gets done after, in the cold, slower.")),
    choose("Which first?",
           opt("Clear the spring first", [setf({"firstJob": "spring"}), say("oda", R("Thank you. The trays have three days left in them, maybe four."))], hint="Oda's trays won't wait."),
           opt("Roof the storeroom first", [setf({"firstJob": "store"}), say("oda", R("Then I'll sleep with the trays in my blankets a while longer. Don't take too long, child."))], hint="Stores that stay dry feed everyone.")),
    fade("Ten days of work. Rubble out, timber up, blisters on everyone."),
    iff({"eq": {"firstJob": "spring"}}, [
        n("The cellar is clear. Oda's trays sit on stone shelves over the warm water, and the larvae are eating again. The storeroom roof is still half sky."),
    ], [
        n("The storeroom has a roof. The cellar is only half clear, and the cold got into Oda's blankets one night. She lost a second tray. One is left, and it's eating."),
        setf({"lostTray": True}),
    ]),
    stage("ab5"),
]
S["dorrit"] = [
    iff({"stage": "ab5"}, [
        n("A cart from the camp has come up the mountain road, and a woman in round spectacles is walking round it, counting sacks under her breath."),
        say("dorrit", R("Dorrit. Quartermaster. Kane says you're to have flour, salt, lamp oil, nails, and no more than your share of anything.")),
        n("She ties off the last sack with the knot every Commons crate is tied with: a miners' hitch, with a red thread laid through it so a thief can't retie it without anyone knowing."),
        say("dorrit", R("Where am I putting it?")),
        iff({"eq": {"firstJob": "store"}}, [
            n("Rhea shows her the storeroom, roofed and dry. Dorrit stands in the middle of it for a long time, sniffing the air for damp."),
            say("dorrit", R("Well. It's a cellar with ideas above itself, but it's dry. I could keep stores in this. Properly, I mean. With a ledger.")),
            say("dorrit", R("Kane's got three of me down at the camp. He won't miss one. I'll stay, if you'll have me.")),
            setf({"recruited.dorrit": True}),
            toast("Dorrit stays at Thornwick to run the stores."),
        ], [
            n("Rhea shows her the storeroom. Dorrit looks up through the roof at the sky."),
            say("dorrit", R("No. Absolutely not. I'll leave you what will keep under a tarp, and the rest goes back down with me.")),
            n("She's kind about it, in a brisk way. She leaves before dark."),
        ]),
        stage("ab6"), setf({"light": "dusk"}),
    ], [say("dorrit", R("Everything's counted. Don't touch the lamp oil without telling me."))]),
]
S["heskComes"] = [
    n("Rhea leans on the pen fence and sings the foal song to Ash, quietly, the way she sang it to the yearlings at Larkfold. Ash stops pacing and lies down in the hay."),
    n("When Rhea turns round, there's an old man in a flat cap standing at the gap in the fence, with a string of three tired kith on a lead behind him."),
    say("hesk", R("Don't stop on my account. I haven't heard that song sung properly since I was a boy. Larkfold, is it?")),
    say("rhea", R("It was.")),
    say("hesk", R("Hesk Marrow. I breed kith. Bred them. The Guild's buyers have had the last of my stock off me for the price of the feed, and I'm walking what's left of them somewhere the buyers don't go.")),
    say("hesk", R("You've a pen, a spring that keeps the frost off, and somebody who can sing a kith quiet. That's more than most places have. I'll work for my keep.")),
    iff({"eq": {"bathhouse": "sung"}}, [say("hesk", R("And you've a wild yearling sleeping in your bathhouse like a house cat. I'd like to see what you do with that one."))]),
    setf({"recruited.hesk": True}),
    toast("Hesk Marrow stays at Thornwick to keep the kith pens."),
    stage("ab7"),
]

# ------------------------------------------------------------------ the bed at Thornwick: each night that matters
S["thornBed"] = [
    iff({"stage": "ab7"}, [setf({"light": "evening"}), fade("Vantry. The same autumn."), run("evenings")], [
    iff({"stage": "ab12"}, [setf({"light": "evening"}), fade("Vantry, midwinter."), run("birthday")], [
    iff({"stage": "ab18"}, [fade("The snow melts off the terraces. Spring."), setf({"light": "day"}), stage("ab19"), run("springRider")], [
    iff({"stage": "ab21"}, [setf({"light": "evening"}), fade("Vantry. That same spring."), run("hiding")], [
    iff({"stage": "ab23"}, [fade("Summer comes up the mountain."), setf({"light": "day"}), run("summer")], [
    iff({"stage": "ab25"}, [setf({"light": "evening"}), fade("Vantry. A hot summer night."), run("bell")], [
        toast("Your tent. It's not time to sleep yet."),
    ])])])])])]),
]

# ------------------------------------------------------------------ Corran: evenings (autumn)
S["evenings"] = [
    {"hero": "corran"}, {"alone": True}, setf({"light": "day", "showHold": True}),
    stage("ac1"), goto("yard", 11, 6, "up"),
    n("A year in Vantry. The burns on your back and hands have healed into shiny skin that pulls when you reach for anything."),
    n("You've worked the hatchery night watch every night of that year. You've not been late once."),
]
S["halloranPromote"] = [
    iff({"stage": "ac1"}, [
        say("halloran", R("Dace. A year on the night watch. One bad night with the boilers, and you went into the steam yourself instead of running for help. Do you know how rare that is?")),
        say("halloran", R("The Houses have noticed. They want the watch officers to be men who can keep a boiler room quiet. I want you to have a lieutenant's tabs and three hatcheries to keep quiet instead of one.")),
        choose("Halloran holds out the tabs.",
               opt(R("Thank you, Captain."), [add({"hold": -2})], by="corran", hint="Take them."),
               opt(R("I didn't come back for tabs."), [say("halloran", R("No. You came back for a boy. And now you've got one, and he eats. Take the tabs.")), add({"hold": 1})], by="corran")),
        say("halloran", R("You're useful when you're quiet, Dace. Stay quiet.")),
        setf({"rank.corran": "Lieutenant"}),
        toast("Corran is made a Warden lieutenant."),
        stage("ac2"), goto("surgery", 4, 4, "up"),
    ], [say("halloran", R("Go and do your job, Lieutenant."))]),
]
S["lisleEvenings"] = [
    iff({"stage": "ac2"}, [
        say("lisle", R("Turn round. Lift your shirt.")),
        n("Cool fingers on the shiny skin of your back."),
        say("lisle", R("Healed. As much as it's going to. Does it hurt?")),
        say("corran", R("Not the burns.")),
        say("lisle", R("Then what?")),
        n("The evenings. When the watch hasn't started and the rooms are quiet and there's nothing to do but think about your mother and your sister, and Rhea on a roof in the dark."),
        choose("Lisle waits, pen over the ledger.",
               opt(R("Evenings are hard. I sleep badly."), [
                   say("lisle", R("A lot of my officers say that. A field line, for the evenings. One at a time, and you come to me for the next one, not to a shop.")),
                   n("Lisle writes your name in the ledger, and a line under it, and passes you a tin."),
                   setf({"evenings": "lull", "mods.corran": "lull"}), add({"hold": -8, "rings.corran": 1}),
               ], by="corran", hint="Ask for a lull for the evenings."),
               opt(R("Nothing. It doesn't hurt."), [
                   say("lisle", R("Good. Come back if it does.")),
                   setf({"evenings": "none"}), add({"hold": 6}),
               ], by="corran", hint="Sit through the evenings.")),
        fade("That evening."), setf({"light": "evening"}),
        stage("ac3"), goto("rooms", 2, 3, "right"),
        iff({"eq": {"evenings": "lull"}}, [n("The bite at the back of your neck is a cold pinch, then nothing. The room is very quiet. It's the first quiet evening in a year.")],
            [n("The rooms are very quiet. Every sound from the street comes in through the shutters.")]),
    ], [say("lisle", R("You're healed, Lieutenant. Go home."))]),
]
S["letter"] = [
    iff({"stage": "ac3"}, [
        n("A letter, on the table, where it's been for a month. The first line says Rhea. The second line is empty."),
        choose("The ink is dry on the pen.",
               opt("Write a line", [n("You write: I took Finch out of the brood rooms. He's well. He's growing. He doesn't"), n("You can't finish the sentence. You put the pen down."), setf({"letter": "line"})]),
               opt("Put it away", [n("You fold it into the back of the ledger, where you won't see it."), setf({"letter": "away"})])),
        n("A knock at the inner door. Finch, wanting something, or wanting nothing and pretending he does."),
        iff({"eq": {"evenings": "lull"}}, [
            n("You mean to get up. It's a long way to the door, through all that quiet."),
            n("He knocks twice more and stops."),
            add({"finchCorran": -5}),
        ], [
            say("finch", R("Warden. Your tabs are on wrong.")),
            n("He fixes them without being asked, and goes back to his room without another word. It's the most he's said to you in a week."),
            add({"finchCorran": 3}),
        ]),
        run("backToRhea1"),
    ]),
]
S["backToRhea1"] = [
    fade("Thornwick. The first snow."),
    {"hero": "rhea"}, setf({"light": "snow", "showHold": False, "mods.corran": ""}),
    stage("ab8"), goto("thornwick", 3, 14, "up"),
]

# ------------------------------------------------------------------ Thornwick, early winter: the moss, Ume, Tobin
S["mossOut"] = [
    iff({"stage": "ab8"}, [
        say("oda", R("The larvae have eaten every scrap of moss I brought down. Duskwort, child. It's the only thing they'll eat, and it only grows up here, above the mist.")),
        say("oda", R("There's wild duskwort on these terraces, but not enough to feed a tray for a week. The clans grow it by the field. Ume's people are a day west, past Larkfold.")),
        say("oda", R("Every leaf they grow is sold to the Guild before it's picked. But Ume knew your mother. Go and ask her.")),
        stage("ab9"),
    ], [
        iff({"stage": "ab11"}, [run("tobinFirst")], [
            say("oda", R("Warm and fed, the lot of them. Go and do something else, child, you're making them nervous."))])]),
]
S["umesArrive"] = [
    goto("umes", 12, 12, "up"),
    n("Ume's terraces climb out of the snow in green stripes. Somebody has laid straw over the moss to keep the frost off it, row by row, all the way up the hill."),
    n("By the weighing stall a man in a Guild coat is tallying baskets in a book. Nobody near him is talking."),
]
S["factor"] = [
    iff({"flag": "umeMet"}, [say("factor", R("The clan's baskets are counted, Commons. Don't make me write you down as well."))], [
        say("factor", R("Every basket on this hill is the Guild's before it's picked, miss. Seed debt, tool debt, flour debt. Grandmother Ume's family is paid up to the year their grandchildren die.")),
        say("factor", R("If you're buying, you're buying from the Guild, at the Guild's price, in Vantry.")),
    ]),
]
S["umeMeet"] = [
    iff({"stage": "ab9"}, [
        n("A tiny old woman is sitting on the step of the end house in a terrace-patterned shawl, with her leg stretched out in front of her."),
        n("There's a grey lull on her bare hip, just above the knee. A wild one: small, pale, and fat with feeding."),
        say("ume", R("Don't stare, girl. It's rude. I've set a wild lull on this hip every winter for seventy years, and it drops off when it's full, and I've never once wanted another.")),
        say("ume", R("Your face. You're a Caddow. Your mother came up here once, years ago. She wanted to know how we set a wild lull, and how we knew it wouldn't hook anyone. No lowland healer ever asked us that before or since.")),
        say("rhea", R("She bred greenlings from what you told her. In Larkfold. For people coming off Guild lulls.")),
        say("ume", R("I heard. I heard what it cost, too.")),
        n("Someone is sitting in the doorway behind her: a man of forty in a miner's coat, with his arms wrapped round himself. He's shaking. His neck is ringed with scars from his collar to his ear."),
        say("ume", R("My son Tobin. He went down to the Coldharrow pits at sixteen, and a foreman set a Guild lull on him after a rock fall so he'd finish the shift. Twenty years. There's no counting his rings any more, they've run together. He came home in the summer with nothing left to buy one with.")),
        say("tobin", R("Ma.")),
        say("ume", R("He's tried three times to come off them on his own, up here, in the cold. The raw sends him back down the mountain every time.")),
        choose("What does Rhea ask for?",
               opt(R("We need moss for our greenlings. And I think Tobin needs greenlings."), [], by="rhea"),
               opt(R("Let me take Tobin to Thornwick. Oda can wean him."), [], by="rhea")),
        say("ume", R("The Guild's factor counts every basket. He doesn't count the gleanings, the scraps we pick off the terraces after the harvest. They're ours by clan law. He doesn't know they're worth anything.")),
        say("ume", R("You can have the gleanings, a basket every month, for as long as you need them. And you take my son, and you bring him back to me clean. That's the price.")),
        say("tobin", R("I've had the raw three times, Ma. I can't do it a fourth.")),
        say("rhea", R("It won't be the raw. That's what greenlings are for. You wear a weaker one, then a weaker one, as slowly as you need, and your body learns to manage without, a little at a time.")),
        n("Tobin looks at his mother for a long time. Then he gets up, slowly, and goes to get his coat."),
        setf({"umeMet": True, "recruited.tobin": True}),
        {"follow": ["tobin"]},
        toast("Ume will send a basket of moss gleanings to Thornwick every month."),
        stage("ab10"),
    ], [
        iff({"flag": "tobinClean"}, [say("ume", R("You brought him back. I'd heard a lot of things about Larkfold. Nobody told me you keep your word."))],
            [say("ume", R("Look after my son, Caddow."))]),
    ]),
]
S["tobinHome"] = [
    goto("thornwick", 13, 13, "up"), {"alone": True}, {"follow": []},
    n("Tobin stops inside the gate and looks at the steaming pool, the patched storeroom, the kith pens, the tents."),
    say("tobin", R("This is it? The place that weans people?")),
    say("rhea", R("It is now.")),
    stage("ab11"),
]
S["tobinFirst"] = [
    n("Down in the warm cellar, Oda has a greenling ready on a square of damp moss: the strongest of her strengths, the first."),
    say("oda", R("Sit down, Tobin. Head forward. You've done this hundreds of times. This is the last time it'll be this strong. In Larkfold we stepped people down every fortnight. Twenty years on Guild lulls, you'll go by the month.")),
    n("Oda takes the Guild lull off the back of his neck, the dying one he came up the mountain wearing, and sets the greenling in its place before the raw can start."),
    say("tobin", R("It's weaker.")),
    say("oda", R("It's meant to be. Next month it'll be weaker still. By the thaw you won't need one.")),
    say("tobin", R("And if I can't?")),
    say("oda", R("Then you'll have a weaker one for another month. Nobody here is in a hurry, son.")),
    setf({"tobinWean": 1}),
    stage("ab12"),
]
S["tobinVisit"] = [
    iff({"stage": ["ab12"]}, [say("tobin", R("It's not the raw. Your Oda was right. It's not good, either. But it's not the raw."))], [
    iff({"stage": ["ab13", "ab14", "ab15"]}, [
        n("Tobin is mending the storeroom wall, slowly, with his sleeves rolled up. The greenling on his neck is smaller than the last one."),
        say("tobin", R("Second strength. My hands shake in the mornings. Oda says that's the body remembering how to do its own work.")),
        setf({"tobinWean": 2}),
    ], [
    iff({"stage": ["ab16", "ab17", "ab18"]}, [
        say("tobin", R("Third strength. Last one, Oda says. I slept the whole night through last night. First time since I was sixteen.")),
        setf({"tobinWean": 3}),
    ], [say("tobin", R("Nothing on my neck at all. I keep reaching for it."))])])]),
]

# ------------------------------------------------------------------ Corran: the birthday (midwinter)
S["birthday"] = [
    {"hero": "corran"}, {"alone": True}, setf({"light": "day", "showHold": True}),
    stage("ac5"), goto("rooms", 2, 3, "right"),
    iff({"eq": {"evenings": "lull"}}, [
        n("A fresh tin from Lisle on the table. You've been back for one every month since the autumn. It makes the evenings quiet, and lately the mornings too."),
    ], [n("You told Lisle nothing hurt, in the autumn, and you've kept to it. Some evenings it takes the whole evening.")]),
    n("Finch is fourteen today. A year ago you promised to take him up to the high passes above the city, to see the wild loftbucks come down to graze. You said: when you're fourteen."),
]
S["finchBirthday"] = [
    iff({"stage": "ac5"}, [
        say("finch", R("You said the high passes. When I was fourteen.")),
        n("He says it as if he doesn't care either way. He's been ready since dawn: boots on, coat buttoned wrong."),
        choose("It's a long climb, and your head aches.",
               opt(R("Get your scarf. It's cold up there."), [setf({"birthday": "kept"}), run("passClimb")], by="corran", hint="Keep the promise."),
               opt(R("Not today. Next week. I've a report to write."), [run("birthdayBroken")], by="corran", hint="Stay home.")),
    ]),
]
S["birthdayBroken"] = [
    setf({"birthday": "broken"}), add({"finchCorran": -12}),
    say("finch", R("All right.")),
    iff({"eq": {"evenings": "lull"}}, [
        setf({"mods.corran": "lull"}), add({"hold": -10, "rings.corran": 1}),
        n("He goes out alone. You put the fresh lull on, for the headache, and the afternoon goes by very smoothly."),
    ], [n("He goes out alone. You sit over the report all afternoon and don't write a word of it.")]),
    n("He comes back after dark with snow in his hair, and doesn't say where he's been. You don't ask. He never asks you for anything again."),
    run("backToRhea2"),
]
S["passClimb"] = [
    fade("Three hours' climb above the city."),
    stage("ac6"), goto("highpass", 11, 10, "up"),
    n("Above Vantry's smoke the air is so clear it hurts. The pass is a long green saddle between two peaks, and there's a herd of wild loftbucks grazing on it in the snow."),
    {"follow": []},
]
S["finchPass"] = [
    iff({"stage": "ac6"}, [
        n("Finch is sitting on a rock at the top of the path, watching the herd. He doesn't turn round."),
        say("finch", R("There was a foal at home. Smoke. He got stuck on a ledge once and wouldn't come down for anyone.")),
        say("finch", R("My sister sang him down. She sang, and he came. Every time.")),
        n("It's the first time in a year he has said the word home."),
        choose("Finch is watching the herd, not you.",
               opt(R("I remember. I was there."), [say("finch", R("I know you were.")), n("He's quiet for a long time after that. But he doesn't get up and leave.")], by="corran"),
               opt(R("Do you want to try? Singing?"), [say("finch", R("I don't know the words any more.")), n("He hums three notes of it, very quietly, and stops. One of the loftbucks lifts its head.")], by="corran"),
               opt("Say nothing. Sit with him.", [n("You sit down on the next rock. The loftbucks graze. After a while, his shoulder is against yours. Neither of you mentions it.")])),
        add({"finchCorran": 15, "hold": 8}),
        setf({"finchHome": True}),
        n("You stay until the light goes. On the way down, he walks beside you instead of ahead."),
        run("backToRhea2"),
    ]),
]
S["backToRhea2"] = [
    fade("Thornwick. Midwinter."),
    {"hero": "rhea"}, setf({"light": "snow", "showHold": False, "mods.corran": ""}),
    stage("ab13"), goto("thornwick", 13, 12, "down"),
    n("A shout from the gate. Kane's supply cart has slid on the ice at the top of the road and gone over on one wheel."),
]

# ------------------------------------------------------------------ Thornwick, midwinter: the crates
S["carter"] = [
    iff({"stage": "ab13"}, [
        n("The cart lies tipped against the gatepost. Sacks of flour, a barrel of lamp oil, and three long crates. One of the crates has split open on the stones."),
        n("It's packed with duskwort moss. In the moss, row on row, are lull tins. Guild tins, each with a House seal stamped in the lid."),
        n("The crate was tied with a miners' hitch with a red thread laid through it. The Commons knot. The same knot Dorrit tied on your flour."),
        say("carter", R("Don't touch that, Sergeant. Those aren't yours.")),
        choose("The carter is already pushing the moss back over the tins.",
               opt(R("Whose are they?"), [say("carter", R("The Marshal's. They go down to the lowlands on the north road. They don't stop here, and you didn't see them."))], by="rhea"),
               opt(R("Those are Guild lulls. In a Commons crate."), [say("carter", R("Taken off a Guild cart, fair and square. Where they go after that is the Marshal's business, not mine and not yours."))], by="rhea")),
        iff({"flag": "recruited.tobin"}, [n("Tobin is standing at the storeroom door with a sack on his shoulder, looking at the tins. He doesn't move until the carter has nailed the crate shut again.")]),
        setf({"sawCrates": True, "noWild": False}),
        stage("ab14"),
    ], [say("carter", R("Mind the ice."))]),
]
S["kaneCrates"] = [
    n("Kane is alone in his tent, writing. He doesn't look surprised to see you."),
    say("kane", R("The cart went over on your ice. I heard. Sit down, Caddow.")),
    say("rhea", R("There were Guild lulls in that crate. Hundreds. Tied with our knot.")),
    say("kane", R("There were. We take them off Guild carts on the Vantry road, and we sell them in the lowland towns for less than the Guild does. That's how this army eats.")),
    say("kane", R("Who did you think paid for your boots? For Dorrit's flour? For the nurses' linen and the arrows and the bread? The highlands are three generations in debt. The towns that love us can't feed us.")),
    choose("Kane waits. He has had this conversation before.",
           opt(R("We're selling the thing we're fighting."), [
               say("kane", R("We're selling the thing people will buy anyway. If they don't buy it from us, they buy it from the Guild, and the Guild's coin builds more hatcheries.")),
               say("kane", R("Every lull we sell is a lull the Guild didn't. Every coin of it is a child out of a brood room. I can live with that. So can you."))], by="rhea"),
           opt(R("Does Brannoc know?"), [
               say("kane", R("Ask him. He's a grown man. Most of the old hands know, and most of them would rather not think about it.")),
               say("kane", R("Brannoc was down the pits for twenty years. He knows what people do to get through the day. He doesn't judge them, and he doesn't judge me."))], by="rhea"),
           opt(R("Some of those lulls go back into Vantry."), [
               say("kane", R("Some. A lull doesn't care who wears it.")),
               say("kane", R("Neither do I, Caddow. Not this winter. Not with a hundred people in the weaning tents."))], by="rhea")),
    say("kane", R("You've done good work up at Thornwick. Greenlings, and a clan that talks to us, and an old man's kith in the pens. Don't spoil it by being simple about money.")),
    say("kane", R("Go back up before the snow shuts the road.")),
    setf({"kaneTold": True}),
    stage("ab15"),
]

# ------------------------------------------------------------------ the raid in the snow, and the prisoners
S["raidHome"] = [
    goto("thornwick", 13, 13, "up"),
    setf({"light": "night"}),
    n("Thornwick, after dark. The section is round the fire. Hesk's kith are pacing their pens, ears flat."),
    say("tamsin", R("Rhea. Lamps on the road. Five of them, and kith.")),
    say("brannoc", R("Wardens. They've followed the smoke.")),
    n("You were told not to light big fires the valley could see. Somebody did, on the coldest night of the winter, and you didn't stop them."),
    {"regroup": True},
    say("rhea", R("Everyone to the gate.")),
    {"battle": "thornwick-gate", "win": [
        {"alone": True},
        n("Three of the Wardens run back down the road into the dark. Two don't get the chance. A sergeant with a split lip, and a red-haired archer, hardly more than a boy."),
        n("The section ties their hands and puts them in the chapel ruin, out of the wind."),
        setf({"light": "night"}),
        stage("ab16"),
    ]},
]
S["oakesTalk"] = [
    iff({"stage": "ab16"}, [
        n("The sergeant is sitting against the chapel wall with his tied hands in his lap. He looks at Rhea, and then at the floor, and keeps looking at it."),
        say("oakes", R("Oakes. Sergeant, Wardens of the Brood Guild. That's all you'll get, and you won't get it twice.")),
        say("rhea", R("Where were you a year ago last autumn, Sergeant Oakes?")),
        n("He's quiet for a long time."),
        say("oakes", R("I know who you are. Caddow. They talked about you, after. The one who wasn't there.")),
        say("oakes", R("I was in Halloran's column. Larkfold. I held the torches. I didn't light any, but I held them for the men who did.")),
        say("oakes", R("You'll hang me for it. I'd hang me for it. I just wanted you to hear it from me, and not from someone else after.")),
        setf({"oakesTold": True}),
        iff({"flag": "lyleTalked"}, [stage("ab17")]),
    ], [
        iff({"stage": "ab17"}, [say("oakes", R("Go on. They're waiting for you."))], [say("oakes", R("Caddow."))]),
    ]),
]
S["lyleTalk"] = [
    iff({"stage": "ab16"}, [
        say("lyle", R("I wasn't at Larkfold. I swear it. I was in a mill in Spindlegate till last spring. They give you a coat and a meal.")),
        say("lyle", R("Sergeant Oakes said we'd go up, look at the smoke, and come home. He said you were only highland smugglers.")),
        n("He's nineteen, at most. He has a bowstring callus and a sunburned nose and he can't stop his knees shaking."),
        setf({"lyleTalked": True}),
        iff({"flag": "oakesTold"}, [stage("ab17")]),
    ], [say("lyle", R("Is it now? Is it tonight?"))]),
]
S["verdict"] = [
    n("The section sits round the fire. Nobody is eating."),
    say("soldier", R("He held the torches at Larkfold. He said so himself.")),
    say("soldier", R("They hanged your elders from their own drying house, Sergeant. We all heard. What do you want to do with the men who held the light for it?")),
    iff({"flag": "recruited.oren"}, [say("oren", R("Whatever you decide, decide it so you can live with it in a year. That's all I'll say."))]),
    say("brannoc", R("It's your section, Caddow. They'll do what you say. That's what it means.")),
    choose("Two Wardens in the chapel. What does Rhea say?",
           opt(R("Nobody hangs. Not at Thornwick. We keep them for an exchange, and we feed them like our own."), [
               setf({"wardens": "spared"}), add({"finchTrust": 4}),
               say("soldier", R("And when he goes back and holds the torches somewhere else?")),
               say("rhea", R("Then I'll have been wrong. I'd rather be wrong that way.")),
               n("Some of them look at the fire. Some of them look at her. Nobody argues after that."),
           ], by="rhea", hint="Spare them, though they hanged Larkfold's elders."),
           opt(R("Hang them. As they hanged ours."), [
               setf({"wardens": "hanged"}), add({"finchTrust": -15}),
               n("Nobody says anything. Brannoc gets up and goes to find rope, because he won't ask anyone else to do it."),
               n("In the morning there are two shapes under the chapel arch. Nobody looks at them, and nobody goes that way for a week."),
           ], by="rhea", hint="As they hanged the elders.")),
    setf({"light": "night"}),
    stage("ab18"),
]

# ------------------------------------------------------------------ spring: Kell's Bridge
S["springRider"] = [
    goto("thornwick", 4, 14, "up"),
    n("Water runs everywhere. The terraces below the walls are turning green."),
    iff({"flag": "party.brannoc"}, [
        say("brannoc", R("Back's mended. Kane's sent word: the Millbridge company has waited all winter for me, and it can't wait any longer.")),
        say("brannoc", R("You've done well up here, Caddow. Don't let anyone tell you different. Not even you.")),
        {"leave": "brannoc"},
        toast("Brannoc goes down to the Millbridge company."),
    ]),
]
S["rider"] = [
    iff({"stage": "ab19"}, [
        say("rider", R("From the Marshal, Sergeant. There's to be an exchange of prisoners at Kell's Bridge on the Kerrow, under a truce flag. Five of ours the Guild has taken on the Vantry road this winter, for five of theirs we hold.")),
        iff({"eq": {"wardens": "spared"}}, [say("rider", R("Two of theirs are yours. The Marshal wants them brought down, and you with them, as their escort."))],
            [say("rider", R("The Marshal wants you with the escort. You've seen Wardens up close."))]),
        say("rider", R("Lieutenant Varro does the talking. The Guild has named its own officer for the bridge.")),
        n("The rider hesitates, then hands over a second, smaller paper. The Guild's letter, copied in Varro's neat hand. At the bottom, the name of the officer who will meet them."),
        n("Lieutenant C. Dace, Wardens of the Brood Guild."),
        say("tamsin", R("Rhea.")),
        say("rhea", R("I know. I can read.")),
        choose("Kane hasn't ordered her. He's asked.",
               opt(R("I'll go."), [], by="rhea"),
               opt(R("Tell Kane I'll be there."), [], by="rhea")),
        {"regroup": True},
        fade("Two days down the mountain and along the Kerrow, under a white flag."),
        setf({"light": "day"}),
        stage("ab20"), goto("kellsbridge", 12, 12, "up"),
        n("Kell's Bridge is old stone, three arches over the Kerrow, with the Commons tents on this bank and the Guild's grey ones on the other."),
        n("A man in a Warden lieutenant's coat is waiting alone in the middle of the bridge."),
    ], [say("rider", R("The Marshal's waiting on your answer, Sergeant."))]),
]
S["varroBridge"] = [
    iff({"stage": "ab20"}, [
        say("varro", R("It's all agreed, Caddow. Our five for their five. He asked who the escort was, and I told him.")),
        say("varro", R("Walk them out to the middle. He'll want to count them. If you need me, I'm here.")),
    ], [say("varro", R("Done. Let's go home before anyone changes their mind."))]),
]
S["bridge"] = [
    iff({"stage": "ab20"}, [
        n("The spring sun is hot on the bridge. The river is loud under the arches."),
        n("Corran is thinner. His hair is cut short, the Warden way. He has a lieutenant's tabs on a grey coat, and the collar is buttoned high up his neck, in the heat."),
        say("corran", R("Rhea.")),
        n("He says it the way he used to say it across the drying-house roof, and she hates him for that more than for anything."),
        say("corran", R("Five of ours. Five of yours. I need to count them.")),
        iff({"eq": {"wardens": "spared"}}, [
            n("He counts. When he gets to Oakes, Oakes doesn't step forward."),
            say("oakes", R("I'm not going back, Lieutenant. Write me down as dead, or deserted, or whatever you like.")),
            say("corran", R("You know what they do to deserters, Oakes.")),
            say("oakes", R("You'd know.")),
            n("Corran looks at him for a long moment, and writes something in his book."),
            say("corran", R("Dead in the snow at Thornwick. Four, then.")),
            say("lyle", R("Sergeant?")),
            say("oakes", R("Go home, lad. Go back to your mill. You've done nothing to be ashamed of yet.")),
            n("Lyle crosses to the Guild's side alone, looking back the whole way."),
        ], [n("He counts the Commons' three Wardens from the stockade. Two of the five he was expecting aren't there. He doesn't ask why. He knows.")]),
        n("The exchange is done. Nobody moves."),
        say("corran", R("Do you still sing?")),
        n("Her hand goes to her collar without her meaning it to. To the cord under her shirt, and the ring on it. He sees."),
        choose("Corran is waiting. Varro is watching from the bank.",
               opt(R("Every harvest. On the terraces. Nothing ever comes."), [
                   setf({"parley": "answered"}), add({"hold": 10}),
                   n("Something happens to his face, and then doesn't."),
                   say("corran", R("No. It wouldn't. Not now.")),
                   say("corran", R("I'm glad you still sing.")),
               ], by="rhea", hint="Answer him."),
               opt(R("You don't get to ask me that. You don't get to ask me anything. You walked them in with a lamp, Corran."), [
                   setf({"parley": "toldoff"}), add({"hold": -10}),
                   say("corran", R("I know what I did.")),
                   say("rhea", R("Then say it.")),
                   n("He doesn't. He turns, and walks back to the grey tents, and his back is very straight."),
               ], by="rhea", hint="Tell him what she thinks of him.")),
        iff({"eq": {"wardens": "spared"}}, [
            say("oakes", R("Sergeant. I'm a dead man on their books now. I'd sooner be useful than dead. If you'll have me.")),
            {"join": "oakes"}, setf({"recruited.oakes": True}),
            toast("Oakes joins Rhea's company."),
        ]),
        stage("ab21"),
    ], [n("The bridge is empty now. The river is loud under the arches.")]),
]
S["bridgeHome"] = [
    fade("Two days back up the mountain."),
    goto("thornwick", 13, 13, "up"), {"alone": True},
    iff({"eq": {"parley": "answered"}}, [say("tamsin", R("You answered him. I saw. I'm not going to say anything.")), say("tamsin", R("I'm only going to say that I saw."))],
        [say("tamsin", R("Good. He had it coming. Now go and lie down, before you fall down."))]),
]

# ------------------------------------------------------------------ Corran: the hiding (spring)
S["hiding"] = [
    {"hero": "corran"}, {"alone": True}, setf({"light": "day", "showHold": True}),
    stage("ac7"), goto("surgery", 4, 4, "up"),
    iff({"eq": {"parley": "toldoff"}}, [
        setf({"mods.corran": "lull"}), add({"hold": -6, "rings.corran": 1}),
        n("You put a fresh lull on the night you came back from the bridge, and the night after that. You were going to make the tin last the month. It has lasted nine days."),
    ], [iff({"eq": {"evenings": "lull"}},
            [n("You've been sleeping, since the bridge. Not well. But sleeping. The tin from Lisle has run out early anyway. It always does now.")],
            [n("Since the bridge you haven't slept. Three nights. Four. Every time you close your eyes she says it again: you walked them in with a lamp.")])]),
]
S["lisleHiding"] = [
    iff({"stage": "ac7"}, [
        iff({"eq": {"evenings": "lull"}}, [
            say("corran", R("The field line doesn't do anything any more. I need the house line.")),
            say("lisle", R("You need less, Lieutenant. Not more. The Guild counts every line I set, and every officer I set them on. Your name is in that ledger nine times since the autumn.")),
            say("lisle", R("No. Come back in a month.")),
        ], [
            say("corran", R("I can't sleep. You offered me something for the evenings, in the autumn.")),
            say("lisle", R("And you told me nothing hurt. The Guild counts every line I set now. New names wait a month for the ledger. Come back in a month.")),
        ]),
        n("Out in the street, a Warden you've seen in the yard catches your eye and walks with you a while. He knows a place, he says. On the Spindle canal. They don't keep ledgers."),
        stage("ac8"), goto("backroom", 5, 5, "up"),
        n("A low room that smells of canal water and moss. Crates along the walls. A man at the table with a stack of tins and a ledger he isn't writing in."),
    ], [say("lisle", R("A month, Lieutenant."))]),
]
S["smuggler"] = [
    iff({"stage": "ac8"}, [
        say("smuggler", R("House lines. Real Guild stock, sealed, straight off the cart. Half the shop price, and nobody writes your name down.")),
        n("He opens a crate to show you. Tins, packed in duskwort moss. The crate was tied with a miners' hitch, with a red thread laid through it."),
        say("smuggler", R("Don't ask where from, Lieutenant, and I won't ask where your coat's from.")),
        choose("The tins are packed in moss, row on row.",
               opt("Buy three", [
                   setf({"bought": True, "mods.corran": "lull"}), add({"hold": -12, "rings.corran": 2}),
                   n("You pay. He wraps them in a page torn from a newspaper. The house line is like stepping into warm water."),
               ], hint="Half the price, and no ledger."),
               opt("Walk out with nothing", [
                   setf({"bought": False, "mods.corran": "raw"}), add({"hold": 10}),
                   n("You walk out. By the time you're home, the shaking has started. By midnight it's the raw, and it doesn't stop for four days."),
               ], hint="And sit out the raw.")),
        fade("Home."),
        stage("ac9"), goto("rooms", 2, 3, "right"),
    ], [say("smuggler", R("Come again, Lieutenant."))]),
]
S["finchLie"] = [
    iff({"stage": "ac9"}, [
        say("finch", R("Where were you?")),
        iff({"eq": {"bought": True}}, [
            say("corran", R("Watch report. It ran late.")),
            n("Finch looks at you. At your collar. He's not a child any more, and he grew up in a hatchery, and he knows exactly what a man looks like the evening after a fresh house line."),
            say("finch", R("All right.")),
            n("He goes to bed. He pretends to believe you. You let him."),
            add({"finchCorran": -6}),
        ], [
            say("corran", R("Out. Walking.")),
            n("You're shaking so hard you can't undo your coat. Finch watches you try for a while. Then he comes over and undoes it for you, and doesn't say anything at all."),
            n("In the morning there's a cup of hot water and honey on the table by your bed. He must have sat up to make it."),
            add({"finchCorran": 6}),
        ]),
        run("backToRhea3"),
    ]),
]
S["backToRhea3"] = [
    fade("Thornwick. Late spring."),
    {"hero": "rhea"}, setf({"light": "day", "showHold": False, "mods.corran": ""}),
    stage("ab22"), goto("thornwick", 13, 12, "down"),
]

# ------------------------------------------------------------------ late spring: Tobin walks down clean
S["tobinClean"] = [
    iff({"stage": "ab22"}, [
        n("Tobin stands at the gate with his pack on, in his mended miner's coat. There's nothing on the back of his neck. The rings on his neck have gone pale, and there's no new one."),
        n("Ume has come down from the terraces on a loftbuck, with her stick across her knees, to see it."),
        say("ume", R("Turn round. Let me look.")),
        n("He turns round. She looks at the back of his neck for a long time, and touches each ring once, the way you'd count beads."),
        say("ume", R("Twenty years I've watched the young ones go down the mountain and come back with rings. You're the first one I've seen come home without a new one.")),
        say("tobin", R("Six months. The first was the worst. Then it was just being ill. Then it was just tired. Then one morning I didn't think about it until noon.")),
        say("tobin", R("I'm going back down to Coldharrow. There's eight hundred men in those pits with rings on their necks. I want to tell them where Thornwick is.")),
        say("ume", R("Your mother knew this could be done, Caddow. She just never lived to see the end of it.")),
        say("rhea", R("Neither did I. Till now.")),
        n("Tobin walks down the road into the cloud without looking back, the way people do when they're sure."),
        setf({"tobinClean": True}),
        stage("ab23"),
    ], [say("ume", R("Go on with you. I'm an old woman watching a road."))]),
]

# ------------------------------------------------------------------ summer: Lieutenant, and the crates on the road
S["summer"] = [
    stage("ab24"), goto("thornwick", 13, 13, "up"),
    n("Thornwick in summer. The pool steams in the sun. The chapel has a roof again, of a sort. There are sixty people living inside the walls now: the section, weaners from the lowlands, children who walked up from the carts, Hesk's kith, Oda's trays."),
    n("Kane's horse is tied by the gate."),
]
S["promotion"] = [
    iff({"stage": "ab24"}, [
        n("Kane is in the chapel, looking up at the new roof. Brannoc is with him, standing straight for the first time since Sallow. Varro is sitting on the altar step with a ledger."),
        say("kane", R("Caddow. Look at this place. I gave you a section and a ruin.")),
        say("kane", R("Thornwick weans more people than every tent at the camp. The clans send moss. And word's going round the pits at Coldharrow that there's a place up the mountain where they take the rings off you.")),
        iff({"flag": "recruited.oakes"}, [say("kane", R("And there's a Warden sergeant in your company who walked away from the Guild on a bridge. Nobody's done that in ten years."))]),
        say("kane", R("It's not a section's post any more. It's a company's. A company needs a lieutenant, and the officers have to agree on who.")),
        say("varro", R("I've put my name to it. For what that's worth.")),
        say("brannoc", R("And I've put mine. I was her sergeant. I told the council she's the only recruit I ever had who stitched my back and then outvoted me.")),
        say("kane", R("There it is, then. Lieutenant Caddow, of the Thornwick company.")),
        setf({"rank": "Lieutenant"}),
        toast("Promoted: Lieutenant. Thornwick is now a company post."),
        say("kane", R("Now. One more thing, Lieutenant, and then I'll get out of your chapel.")),
        say("kane", R("Thornwick sits on the only road over the Cloudline that stays open all winter. I want my crates to go down that road, through your gate, to the lowland towns. Same crates you saw on the ice. They'll come through once a month, and they won't stop.")),
        say("kane", R("Half this army's pay goes down that road, Caddow. More, if the Vantry road gets watched.")),
        iff({"flag": "tobinClean"}, [n("Through the chapel door, Rhea can see the gate Tobin walked out of, clean, a month ago.")]),
        choose("Kane's crates on the Thornwick road.",
               opt(R("Not through my gate. Not Guild lulls, past the weaning house, to the people we're trying to wean."), [
                   setf({"trade": "shut"}), add({"kaneTrust": -20}),
                   say("kane", R("Then the army goes hungry this winter, Lieutenant. Half of it. I hope your greenlings are filling.")),
                   say("kane", R("I'll remember who shut the road.")),
                   n("He leaves before dark. He doesn't say goodbye."),
               ], by="rhea", hint="Shut the road, and lose half the army's pay."),
               opt(R("Send them through. The army has to eat."), [
                   setf({"trade": "open"}), add({"kaneTrust": 10}),
                   say("kane", R("Good. I knew you weren't simple.")),
                   n("He claps her on the shoulder on his way out. Brannoc doesn't look at either of them."),
               ], by="rhea", hint="Let them through. The army is fed.")),
        stage("ab25"),
    ], [say("kane", R("Lieutenant."))]),
]

# ------------------------------------------------------------------ Corran: the pressure bell (summer)
S["bell"] = [
    {"hero": "corran"}, {"alone": True}, setf({"light": "evening", "showHold": True}),
    stage("ac10"), goto("rooms", 2, 3, "right"),
    iff({"eq": {"trade": "shut"}}, [n("The man on the Spindle canal hasn't had stock for a month. His crates stopped coming, he said, somewhere up in the mountains. The tin in your pocket is the last you have.")],
        [n("There are always tins on the Spindle canal now. There's one in your pocket.")]),
    n("Tonight you have the watch at House Mire's hatchery. Twelve hours in the heat by the boilers, listening for the pressure bell."),
]
S["bellTin"] = [
    iff({"stage": "ac10"}, [
        choose("The tin is in your pocket. The watch starts in an hour.",
               opt("Put it on before the watch", [
                   setf({"bellNight": "lull", "mods.corran": "lull"}), add({"hold": -12, "rings.corran": 1}),
               ], hint="Twelve hours by the boilers will go by smoothly."),
               opt("Leave it in the tin", [
                   setf({"bellNight": "clean", "mods.corran": "raw"}), add({"hold": 8}),
                   n("Your hands are already shaking. It will be a long night."),
               ], hint="And sit the watch with the shakes.")),
        fade("House Mire's hatchery. The night watch."),
        setf({"light": "steam"}),
        iff({"eq": {"bellNight": "lull"}}, [
            goto("hatchery", 9, 8, "up"),
            n("The boiler room is warm. The chair by the gauges is comfortable. The night is very smooth, and very quiet."),
            n("You close your eyes for a moment."),
            fade("You wake to screaming."),
            n("The pressure bell has been ringing for a long time. The north boiler has burst. The brood room beyond it is white with steam, and the night shift is carrying children out of it."),
            n("You run in with them. You carry out who you can. It's too late for most of it."),
            setf({"bellDead": 6}),
            run("bellMorning"),
        ], [
            goto("hatchery", 9, 8, "up"),
            n("The boiler room is so hot your shirt sticks to the shakes. You walk the gauges every hour to stay awake."),
            n("Just before dawn, the pressure bell starts ringing. The north boiler. You hear it. You're already running."),
            stage("ac11"),
            n("Steam is coming through the wall from the north boiler. There are children asleep at the trays. Get them to the door, then get out yourself."),
        ]),
    ]),
]
S["bellChild"] = []   # filled per child below
S["bellOut"] = [
    n("You come out last, with the last of them. Behind you the north boiler goes with a sound like the sky splitting."),
    n("The night shift brings the others out of the far rooms. Not all of them."),
    setf({"bellDead": 2}),
    run("bellMorning"),
]
S["bellMorning"] = [
    fade("Morning."),
    setf({"light": "steam"}),
    stage("ac12"), goto("hatchery", 9, 8, "up"),
    iff({"eq": {"bellDead": 6}}, [
        n("The brood room is quiet now. Six trays stand empty. Someone has chalked six numbers on the boiler wall, the way the hatchery counts children."),
    ], [
        n("The brood room is quiet now. Two trays stand empty. Someone has chalked two numbers on the boiler wall, the way the hatchery counts children."),
    ]),
]
S["posyMorning"] = [
    iff({"stage": "ac12"}, [
        n("A girl of fifteen is scrubbing the floor by the empty trays, in a leather brood-room apron. Her arms are scarred with bites to the elbow. She doesn't stop scrubbing when you come in."),
        say("posy", R("You were on watch.")),
        iff({"eq": {"bellNight": "lull"}}, [
            say("posy", R("Everyone knows what you wear under that collar, Lieutenant. Everyone in the brood rooms knows what a man looks like when he's got a fresh one on. You were asleep.")),
            say("corran", R("Yes.")),
            n("She looks at you then, for the first time. You know her face. You knew it before she was fifteen. She was a child on the second cart, at Larkfold."),
            say("posy", R("Six. Write it down in your book.")),
        ], [
            say("posy", R("You heard it. They're saying you were the first one in. They're saying you carried three out.")),
            n("She looks at you then, for the first time. You know her face. She was a child on the second cart, at Larkfold."),
            say("posy", R("Two still died. I knew them both. Write that in your book as well.")),
        ]),
        setf({"metPosy": True}),
        stage("ac13"),
    ], [n("Posy goes on scrubbing.")]),
]
S["halloranBell"] = [
    iff({"stage": "ac13"}, [
        say("halloran", R("Dace. Walk with me.")),
        say("halloran", R("A boiler burst at Mire. It happens. The House's report says the valve failed, and it will say so for as long as anyone reads it.")),
        iff({"eq": {"bellNight": "lull"}}, [
            say("halloran", R("I know where you were. So does the House. Nobody is going to say it, because you're too useful, and because the Houses don't like to read about their officers.")),
            add({"hold": -10}),
        ], [say("halloran", R("I hear you were first in. Good. Nobody will write that down either."))]),
        say("halloran", R("Go home, Lieutenant. Sleep. Come back tonight.")),
        run("backToRhea4"),
    ], [say("halloran", R("Go home, Dace."))]),
]
S["backToRhea4"] = [
    fade("Thornwick. A fortnight later."),
    {"hero": "rhea"}, setf({"light": "day", "showHold": False, "mods.corran": ""}),
    stage("ab26"), goto("thornwick", 13, 12, "down"),
]
S["childGate"] = [
    iff({"stage": "ab26"}, [
        n("A girl of about ten is sitting just inside the gate, with her boots in her lap. Her feet are bleeding. She has walked a very long way."),
        say("child", R("Is this the place? Up the mountain? Where they don't send you back?")),
        say("rhea", R("This is the place. You're safe. Where have you come from?")),
        say("child", R("Mire. House Mire's hatchery, in Vantry. I walked.")),
        say("child", R("A boiler went. In the night. The north one.")),
        iff({"eq": {"bellDead": 6}}, [
            say("child", R("Six of us. Six didn't come out. The officer on watch was asleep. Everybody says so. He was wearing one, under his collar.")),
        ], [
            say("child", R("Two of us didn't come out. The officer on watch was the first one in. He carried out three. They still say it was his fault.")),
        ]),
        say("child", R("After, nobody was watching the gate. So I walked.")),
        n("Rhea sits down on the stones beside her and takes the bleeding feet into her lap, and starts to clean them, because it's the only thing she can think of to do."),
        n("She doesn't ask the officer's name. The girl wouldn't know it. There are a hundred officers in Vantry with high collars."),
        setf({"childMire": True}),
        {"end": "act2"},
    ]),
]

# the three children in the brood room on the night of the bell (Corran's clean path)
for i, (x, y) in enumerate([(3, 3), (8, 5), (13, 7)], start=1):
    S[f"bellChild{i}"] = [
        iff({"stage": "ac11"}, [
            iff({"flag": f"bell.c{i}"}, [n("Already out.")], [
                n(["A boy asleep with his head on the tray rim. You get him up and push him toward the door.",
                   "A girl who can't see for the steam, turning in circles. You put her hand on your belt and walk her to the door.",
                   "The smallest one, under a tray, too frightened to come out. You reach in and carry him out under your arm."][i - 1]),
                setf({f"bell.c{i}": True}),
            ]),
        ]),
    ]
del S["bellChild"]

S["bellDoor"] = [
    iff({"stage": "ac11"}, [
        iff({"flag": ["bell.c1", "bell.c2", "bell.c3"]}, [run("bellOut")], [toast("There are still children at the trays.")]),
    ], [toast("Not now.")]),
]
S["bellSteamFail"] = [
    n("You go down on one knee in the white. Someone's hands drag you back by the collar."),
    n("You go back in."),
    goto("hatchery", 9, 8, "up"),
]

# ------------------------------------------------------------------ actors
def actor(id, map, x, y, look, talk, when=None, **kw):
    a = {"id": id, "map": map, "x": x, "y": y, "look": look}
    if when: a["when"] = when
    if talk is not None: a["talk"] = talk
    a.update(kw)
    return a

TW = "thornwick"
AB = {"stagePrefix": "ab"}
def stages(*names): return {"stage": list(names)}
ALL_AB = [f"ab{i}" for i in range(1, 27)]
AFTER = lambda n0: [f"ab{i}" for i in range(n0, 27)]

actors = [
    # the camp in autumn
    actor("oda-frost", "camp", 12, 11, "oda", [say("oda", R("Ask your Marshal, child. The trays won't wait."))], stages("ab1")),
    # Thornwick: the bathhouse loftbucks
    actor("buck1", TW, 5, 4, "loftbuck", [run("bucks")], stages("ab3")),
    actor("buck2", TW, 7, 5, "loftbuck", [run("bucks")], stages("ab3")),
    actor("burr", TW, 6, 4, "foal", [n("Burr, the wild yearling, asleep in the warm bathhouse with its legs folded under it. It opens one eye at you.")], {"stagePrefix": "ab", "eq": {"bathhouse": "sung"}}),
    # under Thornwick: the kits in the gap, the sluice wheels, the grate, and the Old Mother
    actor("kit1", "undercroft", 10, 6, "reedcat", [run("kits")], {"stage": "ab3c", "not": "kits"}),
    actor("kit2", "undercroft", 11, 7, "reedcat", [run("kits")], {"stage": "ab3c", "not": "kits"}),
    actor("carving", "undercroft", 13, 2, "glint", [run("carving")], {"stage": ["ab3c", "ab3e"]}),
    actor("valve-sing", "undercroft", 15, 2, "glint", [run("valveSing")], stages("ab3c")),
    actor("valve-high", "undercroft", 17, 2, "glint", [run("valveHigh")], stages("ab3c")),
    actor("valve-low", "undercroft", 19, 2, "glint", [run("valveLow")], stages("ab3c")),
    actor("grate", "undercroft", 21, 6, "glint", [n("An iron grate, rusted into the wall. Beyond it, black water and the smell of a den.")], stages("ab3c")),
    actor("old-mother", "undercroft", 23, 5, "reedcat", [run("cisternBoss")], stages("ab3e")),
    # Thornwick: the section at home (the party stays inside the walls)
    actor("brannoc-tw", TW, 9, 12, "brannoc", [iff({"stage": "ab4"}, [run("workChoice")], [say("brannoc", R("Eat something, Sergeant."))])], {"stage": AFTER(3)[:16], "flag": "party.brannoc"}),
    actor("tamsin-tw", TW, 11, 12, "tamsin", [iff({"stage": "ab17"}, [run("verdict")], [
        iff({"flag": "kaneTold"}, [say("tamsin", R("Kane's crates. I keep thinking about my mother's rings. Somebody sold her every one of those lulls, Rhea."))], [say("tamsin", R("It's a ruin. But it's warm. I'll give you that."))])])], {"stage": AFTER(3)}),
    actor("oda-tw", TW, 17, 8, "oda", [run("mossOut")], {"stage": AFTER(4)}),
    actor("ferris-tw", TW, 22, 14, "ferris", [say("ferris", R("Thistle likes it here. She's caught every rat in the chapel. There were a lot of rats in the chapel."))], {"stage": AFTER(3), "flag": "recruited.ferris"}),
    actor("ketti-tw", TW, 7, 14, "ketti", [say("ketti", R("The little ones like the warm pool. I make them wash in it. They hate that."))], {"stage": AFTER(3), "flag": "recruited.ketti"}),
    actor("sela-tw", TW, 4, 11, "sela", [say("sela", R("Dorrit's letting me keep the stores ledger. I counted trays at the sorting house. It's the same, but nobody shouts."))], {"stage": AFTER(6), "flag": ["recruited.sela", "recruited.dorrit"]}),
    actor("oren-tw", TW, 18, 14, "oren", [say("oren", R("Anna would have liked this place. She liked anywhere with a view and a kettle."))], {"stage": AFTER(3), "flag": "recruited.oren"}),
    actor("dorrit", TW, 12, 14, "dorrit", [run("dorrit")], stages("ab5")),
    actor("dorrit-tw", TW, 6, 11, "dorrit", [iff({"flag": "kaneTold"}, [say("dorrit", R("I tie that knot on everything that leaves the camp. I never once asked what was under the moss. I'm asking now."))], [say("dorrit", R("Flour, eighty-one measures. Lamp oil, eleven. Nails, not enough. Never enough nails."))])], {"stage": AFTER(6), "flag": "recruited.dorrit"}),
    actor("ash-pen", TW, 21, 9, "loftbuck", [n("Ash paces the new fence, turning at each corner. He doesn't like a pen he hasn't slept in yet.")], stages("ab6")),
    actor("hesk-tw", TW, 22, 10, "hesk", [iff({"eq": {"bathhouse": "sung"}}, [say("hesk", R("Your Burr's a good one. Wild-born, and she'll take a halter from you already. I'd breed from her one day, if I live that long."))], [say("hesk", R("Pens are mended. Feed's in. Nobody touches my kith without asking me first, Caddow. That includes you."))])], {"stage": AFTER(7), "flag": "recruited.hesk"}),
    actor("tobin-tw", TW, 9, 10, "tobin", [run("tobinVisit")], {"stage": AFTER(12)[:10]}),
    actor("carter", TW, 15, 14, "carter", [run("carter")], stages("ab13")),
    actor("crate", TW, 12, 13, "glint", [run("carter")], stages("ab13")),
    actor("oakes-pr", TW, 13, 3, "oakes", [run("oakesTalk")], stages("ab16", "ab17")),
    actor("lyle-pr", TW, 15, 3, "lyle", [run("lyleTalk")], stages("ab16", "ab17")),
    actor("oakes-tw", TW, 20, 13, "oakes", [say("oakes", R("I can carry a pack, dig a ditch and hold a gate, Lieutenant. I can't sing. I'm told that's important round here."))], {"stage": AFTER(21), "flag": "recruited.oakes", "not": "party.oakes"}),
    actor("rider", TW, 14, 13, "rider", [run("rider")], stages("ab19")),
    actor("tobin-gate", TW, 13, 13, "tobin", [run("tobinClean")], stages("ab22")),
    actor("ume-gate", TW, 15, 13, "ume", [run("tobinClean")], stages("ab22")),
    actor("kane-tw", TW, 14, 3, "kane", [run("promotion")], stages("ab24")),
    actor("brannoc-ch", TW, 12, 4, "brannoc", [say("brannoc", R("Go on. He's going to say something nice. Try to look surprised."))], stages("ab24")),
    actor("varro-tw", TW, 16, 3, "varro", [say("varro", R("Kane brought me up to see what you've done with his ruin. I'm impressed. Don't tell him I said so."))], stages("ab24")),
    actor("weaner1", TW, 16, 10, "vil2", [say("", "A weaver from Millbridge, on her second greenling. She waves at you with both hands, to show you they don't shake.")], {"stage": AFTER(24)}),
    actor("weaner2", TW, 9, 9, "vil4", [say("", "A miner from Coldharrow. He says Tobin sent him.")], {"stage": AFTER(24)}),
    actor("child-gate", TW, 13, 13, "child", [run("childGate")], stages("ab26")),
    # Ume's terraces
    actor("ume", "umes", 6, 9, "ume", [run("umeMeet")], {"flag": "act2"}),
    actor("tobin-umes", "umes", 4, 9, "tobin", [say("tobin", R("Ma says you're the Caddow girl. I'm not good company. Don't take it personally."))], stages("ab9")),
    actor("factor", "umes", 12, 8, "factor", [run("factor")], {"flag": "act2"}),
    actor("clan1", "umes", 18, 10, "vil5", [say("", "A clan woman with a basket of straw for the moss rows. She nods to you, and goes on spreading it.")], {"flag": "act2"}),
    # Kell's Bridge
    actor("corran-bridge", "kellsbridge", 12, 6, "corran", [run("bridge")], stages("ab20")),
    actor("varro-bridge", "kellsbridge", 10, 10, "varro", [run("varroBridge")], stages("ab20", "ab21")),
    actor("oakes-bridge", "kellsbridge", 11, 9, "oakes", [say("oakes", R("Go on, Caddow. Get it over with."))], {"stage": "ab20", "eq": {"wardens": "spared"}}),
    actor("lyle-bridge", "kellsbridge", 14, 9, "lyle", [say("lyle", R("Is that him? The lieutenant? They say he lived up in the highlands once. With the smugglers."))], {"stage": "ab20", "eq": {"wardens": "spared"}}),
    actor("warden-n1", "kellsbridge", 11, 2, "warden2", [say("warden2", R("Truce flag, Commons. Stay your side."))], stages("ab20")),
    actor("warden-n2", "kellsbridge", 14, 2, "warden", [say("warden", R("Truce flag, Commons. Stay your side."))], stages("ab20")),
    # Corran's Vantry
    actor("halloran-ac", "yard", 12, 5, "halloran", [run("halloranPromote")], stages("ac1")),
    actor("lisle-ac", "surgery", 3, 2, "lisle", [iff({"stage": "ac2"}, [run("lisleEvenings")], [run("lisleHiding")])], stages("ac2", "ac7")),
    actor("finch-ac3", "rooms", 9, 3, "finch", [run("letter")], stages("ac3")),
    actor("finch-ac5", "rooms", 9, 3, "finch", [run("finchBirthday")], stages("ac5")),
    actor("finch-ac6", "highpass", 16, 4, "finch", [run("finchPass")], stages("ac6")),
    actor("lb1", "highpass", 4, 6, "loftbuck", [n("A wild loftbuck, cropping the grass through the snow. It watches Finch, not you.")], stages("ac6")),
    actor("lb2", "highpass", 6, 7, "loftbuck", [n("A wild loftbuck, cropping the grass through the snow.")], stages("ac6")),
    actor("lb3", "highpass", 17, 8, "foal", [n("A young one, bucking at nothing in the cold.")], stages("ac6")),
    actor("smuggler", "backroom", 6, 2, "smuggler", [run("smuggler")], stages("ac8")),
    actor("finch-ac9", "rooms", 9, 3, "finch", [run("finchLie")], stages("ac9")),
    actor("finch-ac10", "rooms", 9, 3, "finch", [say("finch", R("You've got the watch tonight. Mire. The north boiler's been knocking all week."))], stages("ac10")),
    actor("child1", "hatchery", 3, 3, "kid", [run("bellChild1")], {"stage": "ac11", "not": "bell.c1"}),
    actor("child2", "hatchery", 8, 5, "kid2", [run("bellChild2")], {"stage": "ac11", "not": "bell.c2"}),
    actor("child3", "hatchery", 13, 7, "kid3", [run("bellChild3")], {"stage": "ac11", "not": "bell.c3"}),
    actor("posy", "hatchery", 12, 5, "posy", [run("posyMorning")], stages("ac12", "ac13")),
    actor("halloran-bell", "hatchery", 9, 7, "halloran", [run("halloranBell")], stages("ac13")),
]

# ------------------------------------------------------------------ doors, zones, songs, looks
def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s

steps = [
    # Thornwick on the Cloudline
    step("land-cloudline", (32, 29), [run("thornArrive")], stages("ab2")),
    step("land-cloudline", (32, 29), [run("raidHome")], stages("ab15")),
    step("land-cloudline", (32, 29), [run("tobinHome")], stages("ab10")),
    step("land-cloudline", (32, 29), [goto(TW, 13, 13, "up"), {"alone": True}], {"flag": "thornwick"}),
    step("land-cloudline", (32, 29), [toast("Thornwick. The spring is still steaming. Ask Kane first.")], {"flag": "act2"}),
    # Ume's terraces
    step("land-cloudline", (10, 21), [run("umesArrive")], stages("ab9")),
    step("land-cloudline", (10, 21), [goto("umes", 12, 12, "up")], {"flag": "umeMet"}),
    *[step("umes", (x, 13), [goto("land-cloudline", 10, 22, "down")]) for x in (12, 13)],
    # leaving Thornwick: the section comes along on the road
    *[step(TW, (x, 15), [toast("Not now.")], stages("ab3", "ab3c", "ab3e", "ab4", "ab5", "ab6", "ab16", "ab17", "ab20", "ab22", "ab24", "ab26")) for x in (13, 14)],
    *[step(TW, (x, 15), [{"regroup": True}, goto("land-cloudline", 32, 30, "down")]) for x in (13, 14)],
    # Kell's Bridge
    *[step("kellsbridge", (x, 13), [toast("Not until the exchange is done.")], stages("ab20")) for x in (12, 13)],
    *[step("kellsbridge", (x, 13), [run("bridgeHome")], stages("ab21")) for x in (12, 13)],
    # the stair under the chapel, and back up
    step(TW, (14, 3), [run("underDown")], stages("ab3c", "ab3e")),
    step(TW, (14, 3), [n("The stair down to the monks' channel. You can hear the water running from here.")], {"flag": "thornwickClaimed"}),
    *[step("undercroft", (x, 1), [run("underUp")]) for x in (2, 3)],
    # Thornwick's cellar
    step(TW, (16, 8), [n("Steps down into the warm dark, and Oda's trays on stone shelves over the running water. It smells like home.")], {"flag": "act2"}),
    # Corran's Vantry: the old ways out of the prologue's rooms
    step("surgery", (4, 5), [toast("Not yet.")], {"stagePrefix": "ac"}),
    step("yard", (5, 8), [toast("Not yet.")], {"stagePrefix": "ac"}),
    step("hatchery", (9, 9), [run("bellDoor")], stages("ac11")),
    step("hatchery", (9, 9), [toast("Not yet.")], {"stagePrefix": "ac"}),
    *[step("highpass", (x, 11), [toast("Finch is still up on the ridge.")], stages("ac6")) for x in (11, 12)],
    step("backroom", (5, 6), [toast("The man with the tins is watching you.")], stages("ac8")),
]
zones = [
    {"map": TW, "area": [3, 14, 4, 14], "when": stages("ab7", "ab12", "ab18", "ab21", "ab23", "ab25"), "do": [run("thornBed")]},
    {"map": TW, "area": [5, 2, 7, 6], "when": {"stage": "ab3", "not": "bathWarned"}, "do": [setf({"bathWarned": True}), n("The buck lowers his horns and paws the stone. Any closer and he'll charge.")]},
]
songs = [
    {"when": {"map": TW, "stage": "ab3"}, "near": "buck1", "range": 5, "do": [run("bathSong")]},
    {"when": {"map": "undercroft", "stage": "ab3c", "not": "kits"}, "near": "kit1", "range": 5, "do": [run("kitsSong")]},
    {"when": {"map": TW, "stage": "ab6"}, "near": "ash-pen", "range": 4, "do": [run("heskComes")]},
    {"when": {"map": TW, "stagePrefix": "ab"}, "do": [n("You sing the foal song while you work. Somebody across the yard picks up the tune and hums it with you.")]},
]
looks = [
    {"map": TW, "tile": "water", "do": [n("The spring is warm as a bath. Steam lifts off it into the cold and drifts out over the cloud.")]},
    {"map": TW, "tile": "tent", "do": [n("A tent of the section's, the canvas patched with the canvas of other tents.")]},
    {"map": TW, "tile": "stonewall", "do": [n("Old monastery walls, the stones fitted without mortar. Some of them have names cut into them, worn down to nothing.")]},
    {"map": TW, "tile": "well", "do": [n("Cold water, for drinking. Everything else up here is warm.")]},
    {"map": "umes", "tile": "stall", "do": [n("The Guild's weighing stall. Every basket is weighed and written in the factor's book before it leaves the hill.")]},
    {"map": "umes", "tile": "moss", "do": [n("Duskwort, pale and soft under straw. The larvae of every lull in Ostrel eat nothing else.")]},
    {"map": "kellsbridge", "tile": "water", "do": [n("The Kerrow, high and brown with snowmelt from the Cloudline.")]},
    {"map": "rooms", "tile": "table", "when": {"stagePrefix": "ac"}, "do": [run("roomsTable")]},
    {"map": "rooms", "tile": "innerdoor", "when": {"stagePrefix": "ac"}, "do": [n("Finch's room. The door is shut.")]},
    {"map": "rooms", "tile": "bed", "when": {"stagePrefix": "ac"}, "do": [n("Rhea's mother's blanket is folded at the foot of the bed. You've never once slept under it.")]},
    {"map": "hatchery", "tile": "tray", "when": {"stagePrefix": "ac"}, "do": [n("Brood trays, the larvae turning in damp moss. Children's hands turn them by day.")]},
    {"map": "backroom", "tile": "crate", "do": [n("Crates packed with moss. Each tied off with a miners' hitch and a red thread.")]},
]
S["roomsTable"] = [
    iff({"stage": "ac3"}, [run("letter")], [
        iff({"stage": "ac10"}, [run("bellTin")], [n("The table. The ledger, and the lamp.")])]),
]

hazards = [
    {"map": "hatchery", "when": stages("ac11"), "kind": "steam", "sources": [[18, 1], [18, 8]], "spreadEvery": 0.4, "spreadBy": 2, "max": 70,
     "on": "wetfloor", "burn": 18, "fail": [run("bellSteamFail")]},
]

voiced = ["cisternDone", "kaneThornwick", "kaneCrates", "oakesTalk", "verdict", "bridge", "tobinClean", "promotion", "posyMorning", "halloranBell", "childGate", "umeMeet", "finchPass", "halloranPromote"]

moods = {
    "scenes": {"act2Start": "road", "frost": "grief", "kaneThornwick": "camp", "thornArrive": "hope", "bathSong": "tender", "bathFight": "tension",
               "workChoice": "camp", "dorrit": "camp", "heskComes": "tender", "evenings": "night", "halloranPromote": "dread", "lisleEvenings": "night",
               "letter": "grief", "mossOut": "camp", "umesArrive": "hope", "umeMeet": "tender", "tobinHome": "hope", "tobinFirst": "tender",
               "birthday": "night", "finchPass": "tender", "birthdayBroken": "grief", "carter": "tension", "kaneCrates": "dread", "raidHome": "tension",
               "oakesTalk": "dread", "lyleTalk": "dread", "verdict": "grief", "springRider": "hope", "rider": "tension", "bridge": "grief",
               "bridgeHome": "tender", "hiding": "night", "lisleHiding": "dread", "smuggler": "dread", "finchLie": "grief", "tobinClean": "hope",
               "summer": "hope", "promotion": "camp", "bell": "night", "bellTin": "dread", "bellMorning": "grief", "posyMorning": "grief",
               "halloranBell": "dread", "childGate": "grief", "bucks": "tension", "bathDone": "hope", "thornGate": "camp", "underDown": "dread", "kits": "tension", "sluiceOpen": "tension",
               "cisternBoss": "fire", "cisternDone": "hope", "kitsFight": "tension", "kitsSong": "tender", "carving": "dread",
               "valveHigh": "dread", "valveLow": "dread", "valveSing": "dread", "sluiceWrong": "tension", "underUp": "dread",
               "factor": "tension", "tobinVisit": "tender", "finchBirthday": "tender", "passClimb": "hope", "backToRhea2": "tension",
               "varroBridge": "tension", "bellOut": "fire", "bellChild1": "fire", "bellChild2": "fire", "bellChild3": "fire", "bellSteamFail": "fire"},
    "stages": {"ab3": "tension", "ab3c": "dread", "ab3e": "tension", "ab6": "tender", "ab9": "road", "ab13": "tension", "ab16": "dread", "ab17": "dread", "ab20": "tension",
               "ac6": "tender", "ac8": "dread", "ac10": "dread", "ac11": "fire", "ac12": "grief", "ac13": "grief", "ab26": "grief"},
}

story = {
    "id": "act2", "title": "Act II: The Field", "voiced": voiced, "moods": moods, "cast": cast, "objectives": objectives,
    "actors": actors, "steps": steps, "zones": zones, "looks": looks, "songs": songs, "hazards": hazards, "scripts": S,
}
with open(OUT, "w") as f:
    json.dump(story, f, indent=1, ensure_ascii=False)
    f.write("\n")
print(len(S), "scripts,", len(actors), "actors")
