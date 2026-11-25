"""Builds data/story/road.json and its battles and duels: the Long Road, the year between Lockside and the Broodhouse
autumn, when Rhea goes out as the Commons' envoy and the Guild's envoy is already on the road ahead of her.
Plan: https://claude.ai/artifact/TEXDmvVRc9FozF2VWysBKG (Mathew 2026-11-25: every nation mandatory, each one changes
the main story, and each is a long stretch of story quests, never a quick stop).
Rhea's stages start "ah", Corran's "ai". Run: python3 tools/story/road.py (after python3 tools/world/roadmaps.py)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2 import say, n, stage, run, fade, goto, setf, add, toast, iff, opt, choose, R  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "../..")
OUT = os.path.join(ROOT, "data/story/road.json")
TW = "thornwick"
FAIR, SQ, QUAY, TAN, PEAT, COL, ARC = "hollin-fair", "town-hollin", "hollin-quay", "hollin-tannery", "town-peatmoor", "town-college", "college-archive"
WEST = "land-west"
REED, ASH, TAV, BRIG = "town-reedhythe", "town-ashby", "ashby-tavern", "ashby-brig"
GRAZE, KEST, SNOW, HOLM, GAOL, FROST = "town-grazehold", "town-kestrel-fort", "town-snowgate", "town-holm", "holm-gaol", "town-frostmere"
TALLY, CORV, VAULT, TARS = "town-tallyhill", "town-corvane", "corvane-vault", "town-tarsis"

cast = {"gateward": "Hollin's gate-ward", "speaker": "The Speaker of the square", "ansel": "Ansel", "orla": "Orla", "davy": "Davy",
        "netmaker": "Bryn", "provost": "Provost Amory", "weaver": "Hanne", "kit": "Kit", "gil": "Gil", "perrine": "Perrine",
        "bargeman": "Guild bargemaster", "linnet": "Linnet",
        "saul": "Mother Saul", "clerk": "Harbour clerk", "pike": "Old Pike", "meg": "Sister Meg", "annet": "Annet", "gully": "Gully Sorne",
        "fairweather": "Fairweather", "posy": "Posy", "dorrit": "Dorrit", "oren": "Oren Tull",
        "abel": "Abel", "rider": "Clan rider", "gerd": "Gerd", "arvo": "Arvo", "brede": "Brede", "guard": "Guard captain", "aurel": "Aurel Hask",
        "finch": "Finch", "fisher": "Frostmere fisher", "sigrun": "Sigrun", "brannoc": "Brannoc", "king": "The King of Lorne", "woman": "A mother of the eleven",
        "tollman": "League toll-man", "factor": "Guild factor", "councillor": "First Councillor of the League", "ilse": "Ilse Varn",
        "ottilie": "Ottilie", "vela": "Vela Orme", "kesh": "Kesh"}

objectives = {
    "ah0": "The council in Thornwick chapel.",
    "ah1": "Take the west road out of the vale, to the Free Towns. Hollin is the big town on the river.",
    "ah2": "Hollin's gate is shut for the fair. Find someone at the fair who'll vouch for a stranger.",
    "ah3": "Go up to the speaking stone in the square.",
    "ah4": "Win over Hollin's wards before the vote: the fen farmers at Peatmoor, the tanners, and the fishers on the quay.",
    "ah5": "Haldane is waiting at the College gate. Go to the College tonight.",
    "ah6": "The College hall. The hearing sits at noon.",
    "ah7": "The square. The vote is at sunset.",
    "ah8": "Finch went down the coast road to Port Ashby. Smugglers hold it: their landing is Reedhythe, in the western reeds.",
    "ah9": "Port Ashby, on the coast. Find the harbourmaster's office.",
    "ah10": "The harbourmaster only sees people he's played. Win at Lantern Cards in the Lantern, on the tavern row.",
    "ah11": "The harbourmaster will see you. His office faces the harbour.",
    "ah12a": "Meet Gully at the end of the mole, at midnight.",
    "ah12": "The Guild brig Patience.",
    "ah13": "Gully is waiting in his office.",
    "ah14": "North, to Lorne, through the Drevka clans' lands. The drove road leaves the vale to the north.",
    "ah15": "Up the drove road to Grazehold, where the clans' riders keep the high grazing.",
    "ah16": "Kestrel Fort. The clans' champion speaks for them.",
    "ah17": "A duel with the clans' champion at dawn. The stables are on the east side of the fort.",
    "ah18": "Over the high pass at Snowgate, to Lorne, before the snow shuts it.",
    "ah19": "Holm, the King of Lorne's city, on the north coast.",
    "ah20": "Holm gaol.",
    "ah21": "The King's dinner, in the hall at the top of the square.",
    "ah22": "Find witnesses for Brannoc: Frostmere on the ice, and Sigrun in the square. Then tell Aurel you're ready.",
    "ah23": "East to Corvane, before the League's spring settling. Strangers have their letters stamped at the toll house on Tally Hill first.",
    "ah24": "Corvane. Find Ilse Varn.",
    "ah25": "Ilse's house is on the west side of Corvane's square.",
    "ah26": "Into the League's counting house, at night. Find the Houses' notes.",
    "ah27": "The spring settling, in Corvane's council hall.",
    "ah28": "South-east over the steppe to Tarsis. Vela Orme's contract ends at the new moon.",
    "ah29": "Vela wants to see the Commons fight. Go to her hall.",
    "ah30": "Tarsis' infirmary, then Vela's answer.",
    "ah31": "South, across the desert, to the Ember Courts.",
    "ai1": "Autumn, while Rhea is away.",
    "ai2": "Midwinter, while Rhea is away.",
}

S = {}

# ================================================================== the council that sends her
S["roadStart"] = [
    fade("Thornwick. The morning after."),
    setf({"road": True, "light": "day", "hero": "rhea"}),
    stage("ah0"), goto(TW, 14, 4, "up"),
    n("Kane comes up the mountain before the dew is off the terraces, with Varro and Hallet and the quartermaster from the south companies. They take over the chapel. Nobody asks whether they may."),
    say("hallet", R("We held the hatchery. Good. Now look at this.")),
    n("The quartermaster lays a letter on the altar stone. The seal has been cut, carefully, so it can be pressed shut again."),
    say("varro", R("A Guild courier, taken on the canal two nights ago. He tried to eat it.")),
    say("kane", R("The Houses have hired Tarsis. Four thousand sellswords off the steppe, to march in the autumn. The Houses can't pay for that out of their own purse. Someone else is paying.")),
    say("rhea", R("Who?")),
    say("kane", R("That's the question. The letter doesn't say. It says the envoy will settle the terms with the other courts himself.")),
    n("Rhea turns the letter over. The seal is a loftbuck, standing, with its head turned back over its shoulder. A Larkfold child's drawing, cut into Guild brass."),
    iff({"flag": "finchTold"}, [n("She has seen him draw it on a slate a hundred times.")], [n("Finch drew it on every slate he ever owned.")]),
    say("rhea", R("He's the envoy.")),
    say("kane", R("Then the Guild has sent its rider round the courts of Ostrel, and he left a month ago. Hollin, the coast, the north, the League. Whoever gets to them first decides the next war, Caddow. We can hold hatcheries. We can't take Vantry. If the rest of the country lines up behind the Houses, we lose without losing a battle.")),
    say("hallet", R("Send a captain who knows how to talk to people who aren't soldiers. I don't.")),
    say("kane", R("I'm sending the captain who walked ninety children out of Lockside. A captain can seal pacts for the Commons. Go and seal some.")),
    iff({"flag": "kaneConfronted"}, [
        n("He doesn't look at her while he says it. She wonders, not for the first time, how much of this is the war, and how much is Kane wanting her a long way from his tent."),
    ]),
    iff({"flag": "recruited.haldane"}, [
        say("haldane", R("Start at Hollin. The College is there, and I still have friends in it, God help them. I'll write you a letter for the Free Towns' border post, and come down myself before the College sits.")),
    ], [
        say("varro", R("Start at Hollin. Your Professor Haldane went back to his College. He wrote to say the Free Towns have shut their border to anyone from the north. He sent a letter to get you through it.")),
    ]),
    say("kane", R("Take who you want. Dorrit keeps Thornwick. Write when you can, and don't promise anything the Commons can't keep.")),
    setf({"open.vale-west": True}),
    toast("The west road to the Free Towns is open."),
    n("Choose who goes with her. The road will be long."),
    {"menu": "party"},
    stage("ah1"),
]

# ================================================================== leg 1: Hollin and the College
# ---- the fair, outside the gate
S["fairArrive"] = [
    iff({"stage": "ah1"}, [
        stage("ah2"),
        n("Hollin's harvest fair spills out of the gate and down the meadow: stalls, tents, a fiddler, and the smell of hot cider. Half the Free Towns are here."),
        n("The gate itself is shut. A gate-ward with a halberd and a list stands in front of it, turning people away."),
    ]),
]
S["gateward"] = [
    iff({"flag": "hollinIn"}, [say("gateward", R("Kit's friend. Go on in. Mind the speaking stone; somebody's always on it."))], [
        say("gateward", R("Fair week. Citizens of the Free Towns, and anyone a citizen will vouch for. Nobody else.")),
        say("rhea", R("I have a letter for the College.")),
        say("gateward", R("Then the College can come out and fetch you. Since the raids, nobody from the north comes into Hollin on paper. A citizen vouches, or you sleep at the fair.")),
        iff({"not": "metKit"}, [say("gateward", R("Try Kit at the targets. She vouches for anyone who beats her. Nobody ever does, so it's a safe rule."))]),
    ]),
]
S["kit"] = [
    iff({"flag": "hollinIn"}, [say("kit", R("I've got a stall to run and you've got a town to talk round. Off you go."))], [
        setf({"metKit": True}),
        n("A young woman in a patchwork jacket is throwing knives at a straw target from twenty paces, without seeming to look, while a crowd counts."),
        say("kit", R("Six. Seven. Eight. Who's next? A copper a throw, and anyone who outscores me gets their copper back and a kiss from the fair master.")),
        say("kit", R("You're not from here. You're from up there. You've got snow on your boots in August.")),
        say("rhea", R("I need someone to vouch for me at the gate.")),
        say("kit", R("Everyone does this week. I vouch for people who beat me at the targets. It keeps the riff-raff out and my purse full.")),
        choose("Kit spins a knife on her finger.",
               opt(R("Then I'll beat you."), [{"duel": "road-kit", "win": [run("kitBeaten")], "lose": [run("kitLost")]}], hint="A contest at the targets, Kit's rules."),
               opt(R("What do you owe the fair master?"), [run("kitDebt")], hint="Everyone at a fair owes somebody.")),
    ]),
]
S["kitBeaten"] = [
    say("kit", R("Well. That's a first. Don't tell anyone. ... Everyone saw. Wonderful.")),
    say("kit", R("All right, snowboots. I said I'd vouch, and I don't go back on a thing I've said in front of a crowd. Come on.")),
    run("kitVouch"),
    say("kit", R("And when you leave, I'm coming with you. Anyone who can throw like that knows where the interesting places are.")),
    setf({"recruited.kit": True}), {"join": "kit"},
]
S["kitLost"] = [
    say("kit", R("There. Now you know the rule's fair. Don't sulk.")),
    run("kitDebt"),
]
S["kitDebt"] = [
    say("kit", R("Forty coin to old Mander, for a stall I burned down last fair. It was an accident. Mostly.")),
    n("Rhea pays it from the Commons purse Kane gave her. It is more than a soldier earns in a season."),
    say("kit", R("You're mad. All right. I'll vouch for a madwoman. Hollin's full of them.")),
    run("kitVouch"),
]
S["kitVouch"] = [
    n("At the gate, Kit signs the gate-ward's list with a flourish and a little drawing of a knife."),
    setf({"hollinIn": True, "standing.hollin": 5}),
    stage("ah3"),
    say("gateward", R("On your head, Kit.")),
    say("kit", R("It's always on my head. Go and see the Speaker, snowboots. If you want the town, the Speaker's where you start.")),
]
S["fairGate"] = [
    iff({"flag": "hollinIn"}, [goto(SQ, 14, 16, "up")], [n("The gate-ward lowers his halberd across the gate. Not unkindly. Just firmly."), run("gateward")]),
]

# ---- the square
S["speaker"] = [
    iff({"stage": "ah3"}, [
        n("The speaking stone is a slab of grey rock in the middle of the square, worn smooth by four hundred years of feet. An old woman sits on a stool beside it with a ledger and an hourglass."),
        say("speaker", R("Anyone may stand on the stone and speak until the sand runs out. Anyone may ask the town to vote. The town keeps what it votes. That's the Free Towns.")),
        say("speaker", R("You're the other envoy. The Commons one. The Guild's boy said you'd come.")),
        say("rhea", R("What did he say?")),
        say("speaker", R("That the Guild would sell Hollin grain all winter at last year's price, if the Free Towns shut their gates to the war and kept them shut. No Commons soldiers through, no Commons barges, no Commons greenlings.")),
        say("speaker", R("A polite boy. He stabled his loftbuck at the inn and sang to it at night. The ostler's girl said it was the prettiest song she ever heard. He left by the coast road a month ago.")),
        n("Rhea doesn't ask which song. She knows which song."),
        say("speaker", R("The town votes on his offer in nine days, at sunset. And the College up the hill sits the same day, at noon, to decide whether your greenlings are a cure or a poison. His idea too, I'm told. He's been busy.")),
        say("speaker", R("If you want the vote, win the wards. Hollin votes by ward. The fen farmers at Peatmoor, the tanners, the fishers. Three wards in four is a majority. The fourth is the merchants, and they've already eaten his grain.")),
        stage("ah4"),
        toast("The vote is in nine days. Win three of Hollin's wards."),
    ], [
        iff({"stage": "ah4"}, [say("speaker", R("Peatmoor, the tanners, the fishers. Three wards in four. The merchants are his."))]),
        iff({"stage": "ah7"}, [run("theVote")]),
        iff({"stage": "ah8"}, [say("speaker", R("The town keeps what it votes. Even when it's wrong. That's the hard part."))]),
        iff({"stage": ["ah5", "ah6"]}, [say("speaker", R("The College first, then the square. Noon, then sunset. It'll be a long day."))]),
    ]),
]
S["wardDone"] = [
    add({"wards": 1, "standing.hollin": 6}),
    iff({"atLeast": {"wards": 3}}, [
        stage("ah5"),
        toast("Three wards in four. Hollin will hear you on the stone."),
        n("Word comes down from the College, carried by a porter's boy: Professor Haldane is at the College gate and asks the Commons envoy to come tonight, without fuss."),
    ], [toast("A ward won for the vote.")]),
]

# ---- ward one: the fens
S["ansel"] = [
    iff({"flag": "ward.fens"}, [say("ansel", R("Peatmoor votes with you. We said it on the dyke and we'll say it on the stone."))], [
        iff({"stage": "ah4"}, [
            say("ansel", R("The vote? I'll tell you about the vote. Something's been taking our kith out of the pens at night. Six reedcats and a draught buck since harvest. Every farm on the island.")),
            say("ansel", R("The Guild's boy said the Wardens would put a patrol on the fens if Hollin votes his way. Can the Commons do better than a promise?")),
            say("rhea", R("Where do they go?")),
            say("ansel", R("Into the reeds, east of the pens. We've followed the tracks. The tracks go into the water and don't come out. Nobody goes into the reeds at night. There are things in there older than the town.")),
            setf({"fensAsked": True}),
        ], [say("ansel", R("Fen business. Nothing for a stranger."))]),
    ]),
]
S["reedHide"] = [
    iff({"flag": "fensAsked", "not": "ward.fens"}, [
        setf({"light": "night"}),
        n("Night. The reeds stand higher than Rhea's head, and the water between them is black and warm. Somewhere ahead, a reedcat is purring, which reedcats do not do for strangers."),
        n("There's a dry hummock in the middle of the reed bed, with a hide of woven rushes on it. And in front of the hide, six stolen reedcats and a draught buck, all lying down together like a family."),
        n("A boy comes out of the hide with a net over his shoulder, sees Rhea, and whistles once. Every kith on the hummock gets up."),
        {"battle": "road-fen-thief", "win": [run("gilCaught")]},
    ]),
]
S["gilCaught"] = [
    setf({"light": "day"}),
    n("The kith scatter into the reeds. The boy doesn't run; there's nowhere to run to. He sits down on the hummock and holds out his wrists."),
    say("gil", R("Go on, then. Ansel's got a set of stocks with my name on them. He's been polishing them since harvest.")),
    say("rhea", R("Why take them? You don't sell them.")),
    say("gil", R("Who'd I sell them to? I just... they come to me. They always have. I can't work, nobody hires a fen rat. And the kith don't care what I am.")),
    choose("Gil waits for her answer, wrists out.",
           opt("Take him back to Ansel's stocks", [
               setf({"gilFate": "stocks"}),
               n("Ansel's stocks are on the dyke, where the whole island can see. Gil sits in them for two days in the sun. The farmers bring their children to look."),
               say("ansel", R("That's how fen law works. You caught him, we've punished him, and every kith's back in its pen. Peatmoor votes with you, envoy.")),
               n("On the third morning, the stocks are empty. Nobody on the island saw where he went."),
           ], hint="The farmers asked for justice."),
           opt(R("The Commons needs someone who can do that with kith."), [
               setf({"gilFate": "work", "recruited.gil": True}), {"join": "gil"},
               n("Rhea brings him back to the island with the reedcats following him in a line, like ducklings."),
               say("ansel", R("You're taking the thief into your army? ... Well. He's the Commons' trouble now, and not ours. And the cats came home.")),
               say("ansel", R("Peatmoor votes with you. Mind, if he takes a single hen on his way out of the fens, we'll vote again.")),
           ], hint="Give him work instead of the stocks.")),
    setf({"ward.fens": True}), run("wardDone"),
]

# ---- ward two: the tanners
S["orla"] = [
    iff({"flag": "ward.tanners"}, [say("orla", R("The cellar's still yours, whenever you need it. Davy wants to show you his hands."))], [
        iff({"stage": "ah4"}, [
            iff({"not": "tanAsked"}, [
                n("The tanners' yard stinks of lime and old hides. Boys and girls stand in the pits to their knees, scraping skins. Every one of them has a fresh lull on the neck, small and pale, half the size of a Guild lull."),
                say("orla", R("Penny lulls. The Guild sells them cheap to the yards. The lime eats your legs, and with a penny lull you don't feel it till the evening. Then you feel it.")),
                say("orla", R("I'm the yard's master, and I vote for this ward. Show me your greenlings work, and the tanners vote with you. I've got three apprentices who want to come off. Tonight, in my cellar, where the Guild's man can't see.")),
                say("rhea", R("The Guild's man?")),
                say("orla", R("There's always a Guild man. He sells the penny lulls. He sits in the cider house and counts who buys.")),
                setf({"tanAsked": True}),
            ], [say("orla", R("Tonight, in the cellar. Bring your greenlings."))]),
        ], [say("orla", R("We're busy. Hides don't wait."))]),
    ]),
]
S["cellar"] = [
    iff({"flag": "tanAsked", "not": "ward.tanners"}, [
        setf({"light": "night"}),
        n("The cellar under Orla's yard, by candlelight. Three apprentices sit on the cots with their collars open: two girls and a boy called Davy, all about fourteen."),
        iff({"flag": "recruited.linnet"}, [say("linnet", R("Slowly. Let me see the old ring first. There. Now the greenling, just below it. It'll feel like nothing. That's the point."))],
            [n("Rhea sets the greenlings herself, the way Oda showed her: below the old ring, never on it.")]),
        n("The girls take theirs. Davy looks at the greenling for a long time, and then shakes his head."),
        say("davy", R("I can't. If I can feel the lime tomorrow, I can't stand in the pit. If I can't stand in the pit, I don't eat.")),
        say("orla", R("Davy...")),
        say("davy", R("Next year. When I'm not in the pits. I promise.")),
        n("Before anyone can say anything, there are boots on the cellar steps. Four men with cudgels, and the Guild man from the cider house behind them, smiling."),
        say("davy", R("Told you. He counts everything.")),
        {"battle": "road-tannery", "win": [run("cellarWon")]},
    ]),
]
S["cellarWon"] = [
    setf({"light": "day"}),
    n("The Guild man leaves Hollin before morning, on a hired loftbuck, without his cudgel men."),
    say("orla", R("Two of mine came off tonight. One didn't. That's honest, and I've had enough of the other kind. The tanners vote with you.")),
    say("orla", R("And when you're done with this war, envoy, come back and do something about the lime.")),
    setf({"ward.tanners": True}), run("wardDone"),
]

# ---- ward three: the fishers
S["bryn"] = [
    iff({"flag": "ward.fishers"}, [say("netmaker", R("The quay votes with you. And the river remembers that barge. So do we."))], [
        iff({"stage": "ah4"}, [
            iff({"not": "quayAsked"}, [
                say("netmaker", R("The fishers like the Guild's offer. Cheap grain all winter, and all we have to do is let the Guild's barges use our quay.")),
                say("netmaker", R("That's the part they didn't put on the stone. The boy's contract says Hollin's quay carries Guild cargo downriver, toll-free, for ten years. There's one moored at the end now. Grain, they say.")),
                say("rhea", R("You don't believe them.")),
                say("netmaker", R("I've been mending nets on this quay for forty years. Grain barges ride high. That one's riding low.")),
                setf({"quayAsked": True}),
            ], [say("netmaker", R("The barge at the end. Riding low."))]),
        ], [say("netmaker", R("Mending. Always mending."))]),
    ]),
]
S["barge"] = [
    iff({"flag": "quayAsked", "not": "ward.fishers"}, [
        n("The barge's hold is full of grain sacks, as promised. Under the top layer of sacks, the hold is full of crates. Each one is stencilled with a Guild House mark and the word STORES."),
        n("Rhea breaks one open. Tins, packed in straw. Hundreds of them. Enough lulls for every tannery and mill in the Free Towns for a year."),
        say("bargeman", R("You'll put that back, miss, and you'll forget you saw it. Lads.")),
        {"battle": "road-barge", "win": [run("bargeWon")]},
    ]),
]
S["bargeWon"] = [
    n("The fishers come running at the noise. They stand on the quay and look at the open crates in the barge's hold for a long time without saying anything."),
    say("netmaker", R("Toll-free. Ten years. And we'd have carried it down the river for them, and taken their grain, and called it a good winter.")),
    say("netmaker", R("The quay votes with you, envoy. Every boat of it.")),
    setf({"ward.fishers": True, "bargeTins": True}), run("wardDone"),
]

# ---- the College by night: the archive
S["haldaneGate"] = [
    iff({"stage": "ah5"}, [
        setf({"light": "night"}),
        say("haldane", R("Caddow. Good. Come under the lime trees, where the porters can't hear.")),
        say("haldane", R("The hearing tomorrow is a play. The Provost has already written the College's answer. Greenlings are a poison, the Weirbank deaths prove it, the College advises the Crown to treat every greenling given as a death caused.")),
        say("rhea", R("The Crown hangs people for that.")),
        say("haldane", R("The Crown hangs people for less. Every clinic in Ostrel closes the day that certificate reaches Kingsmere. Every greenling doctor becomes a murderer. Including me, which I mind; and including you, which I mind more.")),
        say("haldane", R("Amory has had a lot of money from somewhere this year. New roof on his lodge. New wing on the library. His letters are in his own press, at the far end of the archive under the library. The porters walk it at night, with the College reedcats.")),
        say("haldane", R("I'm too old for this and you're not. I'll keep the porters' lodge talking about their pensions as long as I can.")),
        setf({"archiveOpen": True}),
        n("The library door is on the east side of the court."),
    ], [
        iff({"stage": "ah6"}, [say("haldane", R("Noon. In the hall. Bring whoever you can who's been weaned. Faces are better than figures."))]),
    ]),
]
S["libraryDoor"] = [
    iff({"flag": "archiveOpen", "not": "provostLetters"}, [goto(ARC, 14, 1, "down")], [n("The library door. Locked at night, and the porters keep the key.")]),
]
S["archiveGuards"] = [
    iff({"not": "archiveFought"}, [
        n("A lantern between the stacks. Two porters in College gowns, with long brass-shod staves, and a pair of College reedcats on leads, fat and bad-tempered."),
        say("rhea", R("Nobody has to get hurt down here.")),
        n("One of the porters blows a whistle. The reedcats are let off their leads."),
        {"battle": "road-archive", "win": [setf({"archiveFought": True}), n("The porters run for the stairs to fetch more porters. There isn't much time.")]},
    ]),
]
S["provostPress"] = [
    iff({"not": "provostLetters"}, [
        n("The Provost's press is a cupboard of black oak, locked, with the College crest on it. The lock is old. The wood round it is older."),
        n("Inside, in a cedar box: letters, tied with ribbon, in the order they came. The first is a year old. The paper is good and the hand is a House clerk's."),
        n("Debts paid on the Provost's behalf at the Corvane League. A library wing, endowed. A seat on the Crown's council of physicians, promised. And the last letter, a month old, with the certificate itself folded inside it, already written in the clerk's hand, waiting for the College's seal."),
        n("Under the certificate, a note in a different hand. A boy's careful letters, a Larkfold schoolroom hand: \"The Provost has been told the terms and agrees. He asks that his name not be mentioned. N.\""),
        setf({"provostLetters": True}),
        stage("ah6"),
        toast("The Provost's letters, and the Guild's certificate in a Guild clerk's hand."),
        fade("Morning."), setf({"light": "day"}), goto(COL, 13, 7, "up"),
    ]),
]

# ---- the hearing
S["hearing"] = [
    iff({"stage": "ah6"}, [
        n("The great hall of the College of Physicians. Forty physicians in black gowns along the benches, the Provost in a carved chair under the window, and the public gallery so full that people are standing on the window ledges."),
        say("provost", R("The College sits to advise the Crown on the matter of the so-called greenlings, bred in the highlands by persons unlicensed, and given to the sick without the College's leave.")),
        say("provost", R("The Commons asked to be heard. Very well. The Commons has the floor, for the length of one glass.")),
        n("Rhea stands. She has brought faces, not figures."),
        iff({"flag": "tobinNight"}, [
            n("Tobin, from Ume's terraces, who came off his last lull in a winter at Thornwick with his mother sitting up beside him. He tells them about the third night. His voice doesn't shake until the end."),
        ], [
            n("Brannoc, who wore lulls for eleven months and has eleven rings to show for it, and hasn't worn one since. He tells them about the eleventh month. He doesn't make it sound better than it was."),
        ]),
        iff({"flag": "collegeProof"}, [
            n("And Haldane's ledger: a hundred and four volunteers, written down, watched every day. Ninety-six weaned. Nobody died. Several of the physicians on the benches have read it already. One of them nods."),
        ], [
            n("And then a woman stands up in the gallery, unasked. A weaver's sister, from Weirbank."),
            say("weaver", R("My sister took your greenling in the spring, captain. She and her husband. They died in the same week, because the brood came out wrong and nobody knew yet how to tell. You were in a hurry. I understand why. They're still dead.")),
            n("The hall is very quiet. Rhea doesn't argue with her. There is nothing to argue with."),
            say("rhea", R("You're right. We were in a hurry, and two people died of it, and I'm sorry. Hundreds more came off and lived. Both of those are true.")),
        ]),
        say("provost", R("Moving. The College is not unmoved. But the College must think of the country, and the College's mind is...")),
        n("Rhea puts the cedar box on the table in front of his chair, and opens it, and takes out the certificate in the Guild clerk's hand."),
        say("rhea", R("Already made up. I know. It was made up for you a month ago, in Vantry. Would the College like to see who wrote it?")),
        n("The Provost doesn't move. Haldane gets up from the end of a bench, takes the letters out of the box one by one, and reads the first of them aloud, in his lecturer's voice, so the gallery can hear."),
        n("By the third letter, the physicians on the benches are not looking at the Commons envoy any more. They're looking at their Provost."),
        say("haldane", R("I move that the College decline to advise the Crown on this matter until the College has run its own trial. In the open. With its own name on it.")),
        n("The vote is by show of hands. It isn't close."),
        setf({"road.college": "refused", "deed.college": True}), add({"standing.college": 25}),
        toast("The College refuses the Guild's certificate. The clinics stay open."),
        n("The Provost leaves the hall by the side door, without his gown. Nobody stops him. Nobody follows him either."),
        stage("ah7"),
        say("haldane", R("That's the College. The square is yours. Sunset, Caddow.")),
    ], [say("haldane", R("Noon. Faces, not figures."))]),
]

# ---- the square
S["perrineSquare"] = [
    iff({"stage": "ah7"}, [
        n("A woman in a deep red coat is walking the edge of the square, going over a speech under her breath. She has a mourning pin on her collar, and faint old ring scars above it."),
        say("perrine", R("Captain Caddow. Perrine. I speak for the Guild's offer tonight. I thought we should meet before we try to ruin each other.")),
        say("perrine", R("I'm going to tell the town that greenlings kill people. I'll be telling the truth. Weaning killed someone I loved. I don't need the Guild to tell me what that looks like.")),
        say("rhea", R("Who?")),
        say("perrine", R("Ask the Speaker after, if you want to know. I don't say his name on the stone. It's the one thing I won't do.")),
        setf({"metPerrine": True}),
    ], [iff({"flag": "recruited.perrine"}, [say("perrine", R("I'm still not sure you're right. I'm sure you're honest. It turns out I needed the second one more."))], [
        say("perrine", R("I'll be on the stone at sunset. So will you."))])]),
]
S["theVote"] = [
    n("Sunset. The square is so full that the Speaker has to stand on her stool to turn the glass."),
    iff({"not": "metPerrine"}, [n("A woman in a deep red coat steps up first: Perrine, who speaks for the Guild's offer. She has faint old ring scars above her collar, and a mourning pin.")]),
    n("Perrine speaks first, without notes. She tells the town about the winters before the Guild's grain, and the ones after. She tells them about greenlings: young, unlicensed, bred in caves by people who aren't doctors. She doesn't shout once."),
    say("perrine", R("I was weaned with greenlings, at a hedge clinic, ten years ago. It worked. I'm standing here. The person who was weaned beside me isn't. Ask yourselves which of you is ready to bet a child on the toss.")),
    n("It's a good speech. The merchants' ward stamps its feet. Even some of the fishers look at the ground."),
    n("Then it's Rhea's turn. On the way up to the stone, the Speaker catches her sleeve and says one thing very quietly: a name, Anselm, and two words: her brother."),
    n("A greenling dose matched wrong, ten years ago, at a hedge clinic with no ledger. Perrine sat with him for four days. She has never once said his name on the stone."),
    choose("The sand is running. Rhea is on the stone.",
           opt(R("Perrine's brother died because nobody wrote anything down."), [
               setf({"road.hollin": "won", "perrineUsed": True, "nation.hollin": "pact", "deed.hollin": True}), add({"standing.hollin": 30}),
               n("She says his name. She says the hedge clinic had no ledger and no doctor, because the Guild's law made sure no doctor would touch it. She says Anselm Vey died of the Guild's law, not of the cure."),
               n("Perrine doesn't move, the whole time. Her face doesn't change. When Rhea steps down, Perrine walks out of the square before the hands go up, and nobody sees her go."),
               n("The hands go up. Fens, tanners, fishers: every hand. Even a few of the merchants."),
               say("speaker", R("Hollin declines the Guild's offer. The gates of the Free Towns stay open to the Commons. The town keeps what it votes.")),
               toast("Hollin votes with the Commons. A pact with the Free Towns."),
               n("By morning, the Guild's broadsheets have a new name on them. Perrine Vey, who lost her brother to the highland poison, and will tell anyone who'll listen."),
           ], hint="He died of the Guild's law. She knows it. The town doesn't."),
           opt("Say nothing about him. Talk about the cellar and the barge.", [
               setf({"road.hollin": "lost", "perrineUsed": False}), add({"standing.hollin": 10}),
               n("Rhea talks about the tanners' cellar, and Davy who wasn't ready, and the barge riding low at the quay. She doesn't mention Perrine's brother. She doesn't mention Perrine."),
               n("The hands go up. Fens, tanners, fishers. And then the merchants' ward, all of it, and a few of the fishers changing their minds at the last, looking at their feet."),
               say("speaker", R("Hollin takes the Guild's offer, by eleven hands. The gates of the Free Towns close to the war. The town keeps what it votes.")),
               toast("Hollin votes for the Guild's grain. The Free Towns close their gates to the war."),
               n("Afterwards, when the square has emptied, Perrine is sitting on the edge of the speaking stone, alone."),
               say("perrine", R("The Speaker told you. I saw her catch your sleeve.")),
               say("rhea", R("Yes.")),
               say("perrine", R("You'd have won. Anselm was the whole speech. I'd have stood there and let you.")),
               say("perrine", R("Your clinics. The ones with ledgers. Do they need someone who knows what it looks like when it goes wrong?")),
               setf({"recruited.perrine": True}),
           ], hint="Lose the vote, if it comes to that.")),
    stage("ah8"),
    run("whereNextWest"),
]
S["whereNextWest"] = [
    n("Before she leaves Hollin, Rhea asks at the inn's stable about the Guild's envoy and his loftbuck."),
    n("The ostler's girl remembers the song. She remembers the boy, too: how he paid for everything in Guild silver and tipped her a whole copper, and how he left with a Warden escort and a small iron-bound chest that he wouldn't let anyone else carry."),
    n("\"The coast road,\" she says. \"For Port Ashby. He asked how long the ships take, from there to the north.\""),
    toast("Finch went south to Port Ashby, with a chest he wouldn't let anyone carry."),
]

# ================================================================== leg 2: Port Ashby
# ---- the coast road: Reedhythe's smugglers
S["saul"] = [
    iff({"flag": "open.west-coast"}, [say("saul", R("The road's yours, envoy. Mind the tide at Gullstair."))], [
        iff({"stage": "ah8"}, [
            n("Mother Saul runs Reedhythe from a chair on her hut's porch, with a pipe and a ledger and four nephews who don't say much."),
            say("saul", R("The coast road's ours. Has been since my grandmother. Anyone who uses it pays, or swims.")),
            say("saul", R("The Guild's boy paid. In silver, and politely. He also said the Commons would come this way after him, and that the Guild would pay better for the Commons envoy than the Commons would pay for the road.")),
            iff({"flag": "recruited.fairweather"}, [
                say("fairweather", R("Saul. You owe me for the Kerrow lock, the winter it froze.")),
                say("saul", R("Fairweather. I'd hoped you were dead. ... Fine. One debt for one road. And tell your captain the Guild's boy wasn't just polite. He was sad. I've never had a sad one pay me before.")),
                run("roadOpen"),
            ], [
                choose("Saul's nephews are standing up, one by one.",
                       opt(R("Then let's see what the Guild's money buys."), [{"battle": "road-smugglers", "win": [
                           n("The nephews sit down again, more slowly than they stood up. Mother Saul hasn't moved from her chair."),
                           say("saul", R("Fine. The road's yours. I was only ever going to sell you to the highest bidder, and you've just bid with them.")),
                           run("roadOpen")]}], hint="Fight for the road."),
                       opt(R("What would the road cost, if the Commons paid?"), [
                           say("saul", R("Not coin. Your word. When the Commons owns the canals, Reedhythe keeps the coast road, and nobody comes asking what goes up and down it.")),
                           setf({"saulPromise": True}),
                           n("Rhea gives it. It's an easy promise to make, and she knows exactly what it will cost someone, one day."),
                           run("roadOpen")], hint="Pay the way smugglers like to be paid.")),
            ]),
        ], [say("saul", R("Reedhythe. We don't sell anything you'd want."))]),
    ]),
]
S["roadOpen"] = [
    setf({"open.west-coast": True}), stage("ah9"),
    toast("The coast road to Port Ashby is open."),
]

# ---- Ashby: the harbourmaster
S["ashbyArrive"] = [
    iff({"stage": "ah9"}, [
        n("Port Ashby smells of tar and fish and money. Ships from places Rhea has only seen on maps ride in the harbour, and the quay is louder than Millbridge on market day."),
        n("Out at the end of the stone mole, a brig rides at anchor, black-hulled, with the Guild's lamp painted on her bow."),
    ]),
]
S["clerkAshby"] = [
    iff({"stage": ["ah9", "ah10"]}, [
        say("clerk", R("Master Sorne doesn't see envoys. He doesn't see the Guild, he doesn't see the Crown, and he won't see the Commons.")),
        say("clerk", R("He sees people he's played at cards. It's how he knows what they are. Win at the Lantern, across the way, and he'll send for you. Lose, and you can wait with the rest.")),
        stage("ah10"),
    ], [say("clerk", R("Master Sorne is expecting you. Through there."))]),
]

S["harbourOffice"] = [
    iff({"stage": ["ah9", "ah10"]}, [run("clerkAshby")], [
        iff({"stage": ["ah11", "ah12a", "ah13"]}, [run("gully")], [n("The harbourmaster's office. The clerk is busy, and the door to the inner room is shut.")])]),
]
S["moleEnd"] = [
    iff({"stage": "ah12a"}, [run("mole")], [
        iff({"flag": "brigTaken"}, [n("Where the Patience rode at anchor, there's only grey water and a few gulls.")],
            [n("The end of the mole. Out in the harbour, the brig Patience rides at anchor, black-hulled, with the Guild's lamp painted on her bow.")])]),
]

# ---- Lantern Cards: three champions, each with a tell to read
def hand(prompt, right, wrong, win, lose):
    """One hand: the right answer plays on; a wrong one loses the hand."""
    return choose(prompt, opt(right[0], [n(right[1]), *win], hint=right[2]),
                  *[opt(w[0], [n(w[1]), *lose], hint=w[2]) for w in wrong])
S["cardsRules"] = [
    n("Lantern Cards. Five cards each, and the lantern card face down in the middle. Raise, call or fold. Everyone in Ostrel plays it, and everyone in Ashby plays it for money."),
    n("The trick isn't the cards. It's the player. Watch them, not the table."),
]
S["pike"] = [
    iff({"flag": "cards.pike"}, [say("pike", R("Go and beat Meg. Nobody beats Meg."))], [
        iff({"not": "cardsSeen"}, [setf({"cardsSeen": True}), run("cardsRules")]),
        n("Old Pike, a dockhand with arms like hawsers, chewing tar gum. He chews steadily as he deals."),
        hand("Pike looks at his cards, chewing, chewing.",
             (R("Raise."), "He chews a little faster, and folds. A man with a good hand stops chewing; Pike's never stopped.", "He's still chewing."),
             [(R("Fold."), "You fold. He turns over nothing, and grins, chewing.", "Play safe."), (R("Call."), "He calls you back, and wins with a pair of drays.", "See what he has.")],
             [hand("The second hand. Pike's jaw stops dead. He taps the lantern card twice.",
                   (R("Fold."), "You fold. He turns over three lanterns, sighs, and starts chewing again. \"Who told you?\"", "He's stopped chewing."),
                   [(R("Raise."), "He raises you back and takes the pot with three lanterns.", "Bluff him."), (R("Call."), "He wins with three lanterns.", "See it through.")],
                   [setf({"cards.pike": True}), say("pike", R("All right. You can watch. Go and try Meg; she'll eat you.")), toast("Pike beaten. Two champions to go.")],
                   [n("Pike rakes in the pot. \"Again?\"")])],
             [n("Pike rakes in the pot. \"Again?\"")]),
    ]),
]
S["meg"] = [
    iff({"flag": "cards.meg"}, [say("meg", R("He'd have liked you, my Tam. He liked anyone who could keep their mouth shut."))], [
        iff({"not": "cards.pike"}, [say("meg", R("Pike first, dear. There's an order to things."))], [
            n("Sister Meg, a net-widow in black, with a glass of rum and a great deal to say about her late husband's boat."),
            hand("Meg is quiet for once, counting her cards twice.",
                 (R("Fold."), "You fold. She turns over a full hand of crowns, and says nothing at all, which is how you know you were right.", "She's gone quiet."),
                 [(R("Raise."), "She raises you back without a word, and wins.", "Push her."), (R("Call."), "She wins, without a word.", "See it.")],
                 [hand("Meg tells you about her late husband's boat: the paint, the tar, the time it nearly sank off Gullstair, at length.",
                       (R("Raise."), "Halfway through the story about the tar, she folds. She had nothing. She always talks when she has nothing.", "She's talking again."),
                       [(R("Fold."), "You fold, and she shows you two odd cards and a lot of nothing.", "Wait for a better hand."), (R("Call."), "She folds before you can, chattering. She takes nothing; you take little.", "See what she has.")],
                       [setf({"cards.meg": True}), say("meg", R("Well, dear. Annet's at the far table. Annet doesn't talk, and she doesn't chew. Annet watches you.")), toast("Meg beaten. One champion to go.")],
                       [n("Meg pats your hand. \"Again, dear?\"")])],
                 [n("Meg pats your hand. \"Again, dear?\"")]),
        ]),
    ]),
]
S["annet"] = [
    iff({"flag": "cards.annet"}, [say("annet", R("Sorne's sent for you. Go on."))], [
        iff({"not": "cards.meg"}, [say("annet", R("I only play people who've beaten Meg."))], [
            n("Annet, at the far table, a young woman with a still face who deals without looking at the cards and looks only at you."),
            say("annet", R("I don't have a tell. You do. Let's see if you know what it is.")),
            choose("Annet waits for you to look at your cards.",
                   opt("Look, and raise at once", [
                       n("You don't give yourself time to think, so you don't give her anything to read. Her eyes narrow, just slightly."),
                       hand("The second hand. Annet turns the lantern card face up, which nobody does, and watches you look at it.",
                            (R("Call."), "You call, without looking at the lantern card again. She lays down her cards. You win by one. She smiles for the first time.", "Don't look at it."),
                            [(R("Raise."), "Your eyes went to the lantern card before you raised. She calls, and wins.", "It helps your hand."), (R("Fold."), "You fold, and she shows you nothing worth folding to.", "It helps hers.")],
                            [run("annetWon")], [n("Annet gathers the cards. \"You looked. Again?\"")]),
                   ], hint="Give her nothing to read."),
                   opt("Look, think it over, then raise", [n("You take your time. She takes your money. \"You hesitate when you're strong. Again?\"")], hint="Take your time."),
                   opt("Let Kit deal", [
                       setf({"cardsCheated": True}),
                       n("Kit deals. Rhea's hand is extraordinary. So is the next. Annet watches Kit's hands for a long time, and then lays her cards down, face up, and pushes the pot across."),
                       say("annet", R("Good hands. Your friend's. Sorne will see you; he only said you had to win.")),
                       setf({"cards.annet": True}), stage("ah11"), toast("The Lantern's champions are beaten. The harbourmaster will see you."),
                   ], hint="Kit has quick fingers.", when={"flag": "party.kit"})),
        ]),
    ]),
]
S["annetWon"] = [
    setf({"cards.annet": True}), stage("ah11"),
    say("annet", R("Nobody's read me in two years. I'll tell Sorne. And when you go, I'm coming. I want to know how you did it.")),
    setf({"recruited.annet": True}),
    toast("The Lantern's champions are beaten. The harbourmaster will see you."),
]

S["gully"] = [
    iff({"stage": "ah11"}, [
        n("The harbourmaster's office is all windows, facing the harbour. Gully Sorne is a wiry man near forty, with a crooked nose, a gold tooth, and a hatchery number tattooed on the inside of his wrist, where a cuff would hide it. He isn't hiding it."),
        say("gully", R("Sit. You played Annet. That tells me more than any letter Kane could write.")),
        say("gully", R("The Guild's boy came through a month ago. He had a chest he wouldn't put down, and he sailed north on the first ship out. I don't know what was in it. I don't ask what's in things. I'm the harbourmaster.")),
        say("rhea", R("You're from a hatchery.")),
        say("gully", R("Corvel's. I went out through the drain at nine and stowed away on a fish boat. Thirty years. I stopped asking what's in things the day I got here, and Ashby made me harbourmaster for it.")),
        say("gully", R("Then I'll show you something I stopped asking about. Tonight, at the end of the mole. Come alone, or as alone as you can.")),
        stage("ah12a"),
    ], [iff({"stage": "ah13"}, [run("harbourPrice")], [say("gully", R("Midnight. The end of the mole."))])]),
]
S["mole"] = [
    iff({"stage": "ah12a"}, [
        setf({"light": "night"}),
        n("Midnight at the end of the mole. The brig Patience rides at anchor fifty yards out, her lamps lit. A lighter is being rowed out to her from the Guild warehouse, low in the water."),
        n("Not crates. Children. Twenty or thirty of them, sitting in rows in the lighter with their knees up, and a Warden at each end."),
        say("gully", R("Indentured apprentices, for the Ember Courts and the islands. Every month, the Houses sell the indentures they can't use any more. The ones who cough. The slow ones. The ones who ask questions.")),
        say("gully", R("Thirty years I've stamped those papers, because a harbourmaster stamps papers. The tide turns in an hour. I've got a boat.")),
        stage("ah12"),
        goto(BRIG, 1, 3, "right"),
        n("The Patience's deck. Warden marines at the rail, and the bosun with a lantern, counting heads as the children come up the side."),
        {"battle": "road-brig", "win": [run("brigWon")]},
    ]),
]
S["brigWon"] = [
    n("The last marine goes over the rail into the harbour. In the hold, thirty-four children sit very still on the bare planks, the way hatchery children sit when they don't know yet what kind of trouble it is."),
    iff({"flag": "recruited.posy"}, [say("posy", R("You're not going anywhere hot. You're going up a mountain. There's a warm pool. I'll show you."))],
        [say("rhea", R("You're going up a mountain, to a place called Thornwick. There's a warm pool. Nobody there will put a number on you."))]),
    n("Gully goes through the bosun's cabin while Rhea counts the children twice. He comes out with the brig's manifest and a sealed packet, and his face has changed."),
    say("gully", R("The Patience carried your brother's chest north last month, to Holm. They kept a copy of what was in it, because the Guild keeps a copy of everything. Read it.")),
    n("A letter from the Houses to the King of Lorne, in a clerk's hand, signed with the standing loftbuck."),
    n("If Lorne closes its passes to the Commons and sends its army south over them in the autumn, then, when the Commons falls, the Houses will see that Lorne has the Drevka high grazing, from Kestrel Fort to the Storm Roost, for ever."),
    say("rhea", R("The clans' grazing. That isn't the Houses' to give.")),
    say("gully", R("It will be, if the Commons falls. That's how the Guild buys things. With what it'll own afterwards.")),
    setf({"lorneOffer": True, "brigTaken": True}),
    stage("ah13"),
    fade("Morning. The harbourmaster's office."), setf({"light": "day"}), goto(ASH, 26, 12, "up"),
    run("harbourPrice"),
]
S["harbourPrice"] = [
    say("gully", R("Now the hard part. The harbour council has been told what you did to a Guild ship in their harbour. They want to know what the Commons means to do about Ashby.")),
    say("gully", R("Ashby carries everything. Moss up, tins down, children out. It doesn't care who wins, so long as the ships keep coming. Promise the harbour its trade after the war, all of it, no questions, and the council looks the other way about the Patience.")),
    say("gully", R("Or close the harbour. Put the Commons' boats across the mouth and starve the Guild's sea trade. The council will fight you for it, and I'll be on the other side, because I'm the harbourmaster.")),
    choose("Gully waits, with his cuff turned back.",
           opt(R("The harbour keeps its trade. All of it."), [
               setf({"road.ashby": "promise", "nation.ashby": "pact", "deed.ashby": True, "recruited.gully": True, "recruited.rue": True}), add({"standing.ashby": 30}),
               say("gully", R("Then the council will call it a misunderstanding about a ship's papers. And I'm coming with you, because I want to see the drain I went out by, one more time, with the Commons on the other side of it.")),
               n("Rue, the harbour's marine captain, a tall woman with a boarding axe, signs the Commons' book after Gully, without being asked. \"Ashby keeps its word when it's paid,\" she says. \"You've paid.\""),
               n("Rhea knows what Ashby's trade is. She knows what will go down the coast road and out on the tide, one day, under a Commons flag, because she said so. She signs anyway."),
               toast("A pact with Port Ashby. Gully Sorne and Rue join the Commons."),
           ], hint="Ashby's trade is ugly. It's also Ashby's."),
           opt(R("Then we close it."), [
               setf({"road.ashby": "blockade"}), add({"standing.ashby": -40}),
               say("gully", R("Then I'm sorry. I mean it.")),
               {"army": "ashby-mole", "win": [
                   n("By evening, the Commons' fishing boats hold the harbour mouth, chained gunwale to gunwale. Nothing comes in. Nothing goes out. The Guild's sea trade stops."),
                   setf({"ashbyBlockaded": True}),
                   toast("Port Ashby's harbour is closed to the Guild."),
               ], "lose": [
                   n("The harbour marines drive the Commons boats back out past the mole. The Patience sails without her apprentices, but the next ship won't."),
                   setf({"ashbyBlockaded": False}),
                   toast("Thrown out of Ashby's harbour."),
               ]},
               n("Gully watches from his windows. He doesn't come out."),
           ], hint="Starve the Guild's ships. Ashby will hate the Commons for it.")),
    stage("ah14"),
    run("corranAutumnRoad"),
]

# ================================================================== Corran's autumn (the first interlude)
S["corranAutumnRoad"] = [
    iff({"eq": {"corranFate": "thornwick"}}, [run("corranPool")], [
        iff({"eq": {"corranFate": "left"}}, [run("corranMire")], [run("corranCell")])]),
    run("backToRoad1"),
]
S["corranPool"] = [
    fade("Thornwick. Autumn, while she is away."),
    setf({"hero": "corran", "light": "day"}), stage("ai1"),
    n("The Mire children are afraid of water. Most of them were never let near any that wasn't for the moss trays. So Corran stands in the warm pool to his waist every afternoon, and waits."),
    n("By the second week, the brave ones sit on the edge with their feet in. By the fourth, Wren is swimming, badly and loudly, and the others go in because Wren is."),
    n("A pedlar comes up the road at the end of the month, with a pack of needles and thread. When Dorrit has gone back inside, he puts a tin on the gate post, next to Corran's hand, and goes away without asking for anything."),
    choose("A Guild tin, on the gate post. Nobody else saw.",
           opt("Throw it in the spring", [setf({"pedlarTin": "drowned"}), add({"hold": 3}),
               n("He throws it underarm into the deep end of the warm pool, where the water comes up from the rock. It sinks without a sound. That night he can't sleep, and he knows exactly why.")], hint="Gone."),
           opt("Give it to Dorrit", [setf({"pedlarTin": "dorrit"}), add({"hold": 5}),
               say("dorrit", R("Somebody wants you back, then. ... I'll lock it with the powder. Nobody's touched the powder in a year either.")),
               n("She doesn't make anything of it. That's the kindest thing anyone at Thornwick has done for him.")], hint="Someone should know."),
           opt("Keep it", [setf({"pedlarTin": "kept"}), add({"hold": -6}),
               n("He puts it inside his shirt. It's only in case. He tells himself it's only in case, every night, for a long time.")], hint="Just in case.")),
    setf({"hero": "rhea"}),
]
S["corranMire"] = [
    fade("House Mire. Autumn."),
    setf({"hero": "corran", "light": "day"}), stage("ai1"),
    n("When the Commons emptied Mire's brood room into Wren's drain, the House kept what was left. Forty children who were too small or too sick to walk, and the orderly who wouldn't leave them."),
    n("He carries water. He changes the moss. He sits up with the ones who cough. Nobody in the House remembers he was ever a Warden. Nobody remembers he was ever anything."),
    n("At the end of the month, the House steward comes to the sick room with the indenture book and starts reading names, for the carts to Ashby."),
    choose("The steward has the book open. Three of the names are children asleep in front of him.",
           opt(R("Those three died in the night. I've already burned the bedding."), [setf({"mireLie": True}), add({"hold": 4}),
               n("The steward looks at the sleeping children, and at him, and crosses out three names. He doesn't know why he does it. Neither does Corran."),
               n("The carts go to Ashby without them.")], by="corran", hint="Lie."),
           opt("Say nothing", [add({"hold": -3}),
               n("The carts take them in the morning. He carries the smallest one down himself, because she asks him to.")], hint="It isn't his book.")),
    setf({"hero": "rhea"}),
]
S["corranCell"] = [
    fade("Millbridge. The gaol under the reeve's house. Autumn."),
    setf({"hero": "corran", "light": "day"}), stage("ai1"),
    n("Midsummer came and went, and nobody came down the steps with a rope. The town couldn't agree. The reeve said there should be a proper day for it; the eleven families said there should be no day at all; and then the harvest came, and everyone was busy."),
    n("Oren Tull brings his supper every night. Bread, cheese, an apple. He puts it through the bars and sits on the bottom step and doesn't speak. Oren's wife was one of the eleven."),
    n("On the last night of the month, he speaks."),
    say("oren", R("She was sick for four days. I used to think the worst thing was that she knew it was coming. It wasn't. The worst thing was that she forgave everyone, in the end. Even the ones she didn't know about.")),
    choose("Oren is sitting on the bottom step, waiting.",
           opt(R("Don't forgive me. Please."), [setf({"orenTalk": "unforgiven"}), add({"hold": 3}),
               say("oren", R("I wasn't going to.")),
               n("But he comes back the next night, and the next.")], by="corran", hint="He hasn't earned it."),
           opt(R("Tell me about her."), [setf({"orenTalk": "told"}), add({"hold": 5}),
               n("Oren tells him. It takes until the candle is out. Neither of them says anything about forgiveness at all.")], by="corran", hint="Listen.")),
    setf({"hero": "rhea"}),
]
S["backToRoad1"] = [
    fade("Port Ashby. The first frost."),
    setf({"hero": "rhea", "light": "day"}), stage("ah14"), goto(ASH, 15, 16, "up"),
    n("North, then. Ashby's captains won't cross Lorne's waters after the first frost; the ice comes down the coast. If she's to reach Holm before the King signs, it's overland: back up through the vale and over the clans' high grazing."),
    toast("North, through the Drevka clans' lands, to Lorne. The drove road leaves the vale to the north."),
]

# ================================================================== leg 3: the Drevka clans
S["abel"] = [
    iff({"stage": "ah14", "not": "abelDone"}, [
        n("Drovers' Halt is full of beasts. An old drover in a red coat, with a white moustache and a horn on a strap, is arguing with the Commons toll sergeant at the gate to the drove road."),
        say("abel", R("Three hundred head of ironback, captain, going up to the high grazing before the snow shuts it. Your sergeant says the army's carts go first. Your carts can wait a day. My beasts can't wait for the snow.")),
        say("abel", R("And you'll want to go up the drove road yourself, I'm told. The clans' riders turn back anyone they don't know. They know me. Forty years.")),
        choose("The toll sergeant looks at Rhea. The supply carts are lined up behind him.",
               opt(R("Let the herd through first."), [
                   setf({"abelDone": True, "recruited.abel": True}), {"join": "abel"},
                   n("The carts wait. The ironbacks go up the drove road in a long brown river, bells clanking, and Abel walks at the head with his crook."),
                   say("abel", R("Come on, then, captain. Walk with me, and the riders will think you're mine.")),
                   setf({"open.vale-north": True}), stage("ah15"), toast("The drove road north is open."),
               ], hint="The army's supplies wait a day."),
               opt(R("The army's carts go first."), [
                   setf({"abelDone": True}),
                   n("Abel spits, very precisely, beside the toll sergeant's boot. The carts go through. The herd goes up the next morning, in sleet."),
                   say("abel", R("You'll still want the riders to let you up. I'll tell them you're nobody worth killing. That's the best I can do.")),
                   setf({"open.vale-north": True}), stage("ah15"), toast("The drove road north is open."),
               ], hint="The war first.")),
    ], [say("abel", R("Ironbacks don't care who wins. They care about grass. Wise beasts."))]),
]
S["riders"] = [
    iff({"stage": "ah15"}, [
        n("Grazehold: hide tents round a fire, ironbacks on long lines, and a dozen clan riders who all stand up at once when the strangers come into the firelight."),
        say("rider", R("Valley people. Abel says you're harmless. Abel says that about wolves.")),
        say("rhea", R("I need to speak to your champion. Lorne has been offered your grazing.")),
        n("The riders laugh. Then one of them sees the paper in Rhea's hand, and the Guild's standing loftbuck pressed into its wax, and stops laughing."),
        say("rider", R("Kestrel Fort. Gerd speaks for the clans. If he wants to hear it, he'll hear it. If he doesn't, nobody will find you till the thaw.")),
        stage("ah16"),
    ], [say("rider", R("Kestrel Fort's to the north-west. Don't stray off the road. The road is the only thing up here that's yours."))]),
]
S["gerdHall"] = [
    iff({"stage": "ah16"}, [
        n("Gerd's hall is long and smoky, hung with old harness and older shields. Gerd himself sits at the high table: a huge grey-bearded man with clan tattoos on his shaved head, and a fresh bandage across his brow."),
        n("Rhea puts the Guild's letter on the table in front of him. He reads it twice."),
        say("gerd", R("Lorne has wanted the high grazing since my grandfather's time. They've never been offered it before.")),
        say("gerd", R("A paper from the coast. A seal anyone could cut. Lorne's envoy and the Guild's sat at this table at midsummer, and drank my mead, and said nothing of it.")),
        say("rhea", R("Then ask yourself why they came.")),
        say("gerd", R("I don't ask myself things. The clans follow strength. If the valley captain wants the clans to hear her, the clans' champion will meet her in the ring at dawn. My son Arvo is the champion this year.")),
        stage("ah17"),
        toast("A duel with the clans' champion, at dawn. The stables are to the east."),
    ], [iff({"stage": "ah17"}, [say("gerd", R("Dawn. In the ring."))], [say("gerd", R("Valley captain."))])]),
]
S["arvoStable"] = [
    iff({"stage": "ah17", "not": "arvoFound"}, [
        setf({"light": "night", "arvoFound": True}),
        n("The stables, late. The champion's ironback is restless in its stall, and the champion is sitting in the straw beside it with his knees up and his high fur collar pulled up to his ears."),
        n("Arvo is sixteen. He's shaking. Not with cold."),
        say("arvo", R("Go away. I'm fighting you tomorrow. We're not meant to talk.")),
        n("Rhea has seen the raw a hundred times. She crouches down in the straw and waits. After a while, he pulls his collar down."),
        n("A Guild lull on the side of his neck, fat and pale. And under it, two rings already."),
        say("arvo", R("A trader came up the pass with the Guild's boy, at midsummer. I hurt my shoulder at the Iron Ride and it wouldn't stop. He said this would help. It did. Then it fell off and I couldn't... I can't fight with the shakes. I can't fight without it.")),
        say("arvo", R("If the clans see a champion with rings, my father's finished. Nobody follows a man whose son wears the Guild.")),
        fade("Dawn."), setf({"light": "day"}),
        n("At dawn, Gerd walks into the ring, not Arvo. The bandage on his brow has bled through. He moves like a man with a cracked rib, and the whole clan can see it."),
        say("gerd", R("My son is unwell. The champion's father fights in his place. That's the old law.")),
        n("The clan murmurs. They know Arvo isn't unwell. They don't know what he is."),
        choose("Gerd waits in the ring, hurt. Arvo is watching from the stable door.",
               opt(R("Your champion is ringed. The Guild did this to your son, the same Guild that's selling your grazing."), [
                   setf({"drevkaWay": "shamed"}), add({"standing.drevka": 25}),
                   n("The clan hears it. They turn and look at the stable door. Arvo is gone from it."),
                   n("Gerd fights anyway, because he has to now, and he fights like a man with nothing left to lose. It isn't long."),
               ], hint="The truth wins the clans. It costs the boy everything."),
               opt("Say nothing, and fight Gerd", [
                   setf({"drevkaWay": "quiet"}), add({"standing.drevka": 10}),
                   n("Rhea steps into the ring. She doesn't look at the stable door."),
               ], hint="Beat a hurt man in front of his clan. Keep the boy's secret.")),
        {"duel": "road-gerd", "win": [run("gerdBeaten")]},
    ]),
]
S["gerdBeaten"] = [
    n("Gerd goes down on one knee in the trampled snow of the ring, and stays there, and the clan is silent."),
    iff({"eq": {"drevkaWay": "quiet"}}, [
        say("gerd", R("You saw him last night. You knew why I was in the ring. And you said nothing, in front of all of them.")),
        say("gerd", R("The clans heard you, valley captain. I'll ride south with your Commons when it's time, and every clan that follows me.")),
        n("That evening Arvo comes to Rhea's fire, with his collar down, in front of anyone who wants to look."),
        say("arvo", R("You have greenlings. Abel says so. I want to come off. And I want to ride with you while I do, so nobody here has to watch.")),
        setf({"recruited.gerd": True, "recruited.arvo": True, "road.drevka": "quiet", "nation.drevka": "pact", "deed.drevka": True}), {"join": "arvo"},
        toast("A pact with the Drevka clans. Gerd and Arvo join the Commons."),
    ], [
        say("gerd", R("You've won the clans. They'll ride for you. Not for me. I've got no son to follow me into the ring.")),
        n("Arvo's ironback is gone from its stall by morning, and the boy with it. A clan rider who went after him comes back alone, and says the tracks go down the pass towards the Guild's post at Snowgate."),
        setf({"road.drevka": "shamed", "arvoGuild": True, "nation.drevka": "pact", "deed.drevka": True}),
        toast("A pact with the Drevka clans. Arvo rides to the Guild."),
    ]),
    say("gerd", R("And now Lorne. If the King signs that paper, Lorne's riders come over the high pass in the spring, and the clans fight on two fronts. My riders will see you to Holm. Through Snowgate, before the pass shuts.")),
    stage("ah18"),
]
S["snowgate"] = [
    iff({"stage": "ah18", "not": "snowDone"}, [
        setf({"snowDone": True}),
        n("Snowgate. The pass between two walls of rock, with the hostel tucked in under the west wall, and the snow already knee-deep on the road."),
        n("A sound like a door slamming, very far away, high up on the east slope. And then the snow comes down."),
        fade("..."),
        n("When it stops, the road ahead is clear. Behind them, where the clan's mule train was coming up with the baggage and two drovers, there's a slope of fresh snow, and one mule's head above it, braying."),
        n("A woman in a crimson hood is already digging. She came out of the hostel at the first sound. She doesn't look up."),
        say("brede", R("There are two drovers under that. Help me or go on. The pass shuts at dark either way.")),
        choose("The light is going. Holm is a day on, over the top.",
               opt("Turn back and dig", [
                   setf({"snowDug": True, "recruited.brede": True}), {"join": "brede"},
                   n("They dig until their hands stop working. Both drovers come out alive, blue and swearing. Four of the mules don't."),
                   say("brede", R("You turned back. Nobody turns back on this pass. I'm Brede. I'll see you over the top, and I'll see you down the other side, and after that I'll see.")),
                   n("They cross the top in the dark, roped together, and lose a day."),
               ], hint="Lose a day. Two men under the snow."),
               opt("Press on, before the pass shuts", [
                   setf({"snowDug": False}),
                   n("The clan riders go back for the drovers. Rhea's party goes on over the top in the last of the light, and reaches Holm a day sooner."),
                   n("At Holm she hears that one of the drovers lived."),
               ], hint="Holm before the King signs.")),
        stage("ah19"),
        toast("Over the high pass, into Lorne. Holm is to the north."),
    ]),
]

# ================================================================== leg 4: Lorne
S["holmGate"] = [
    iff({"stage": "ah19"}, [
        n("Holm: a grey stone city on a grey sea, with a gallows in the middle of its square, and nothing hanging from it today."),
        iff({"flag": "brannocBuilder"}, [n("Brannoc has come all this way in the baggage cart, with his back strapped, because his sister lives in Holm and he hasn't seen her in twenty years.")],
            [n("Brannoc has come all this way because his sister lives in Holm, and he hasn't seen her in twenty years.")]),
        n("At the gate, the guard captain looks at the travel papers, and then at Brannoc, and then at Brannoc's neck."),
        say("guard", R("Eleven rings. And the rest of you carrying highland poison in your baggage. Arrest them all. The King's court will want to see this.")),
        fade("Holm gaol."), goto(GAOL, 3, 6, "up"), stage("ah20"),
        run("aurelCell"),
    ]),
]
S["aurelCell"] = [
    n("The cells under Holm stink of seawater. They put Brannoc in the end cell on his own, and Rhea's people in the others."),
    n("At midnight a lamp comes down the stair: a thin grey man in a magistrate's black robe, with a white rope-knot badge at his collar."),
    say("aurel", R("Aurel Hask. Magistrate of the King's court. My wife's name was Brannoc's, once. She cried for an hour when they told her who'd been brought in.")),
    say("aurel", R("I've signed for the rest of you, on my name, which is worth less tonight than it was this morning. Brannoc stays. In Lorne a man with rings hangs. That's the law. I've hanged men for it.")),
    say("rhea", R("He hasn't worn a lull in two years.")),
    say("aurel", R("Lorne doesn't care. A ring is a ring. Unless someone can prove to the court that a ringed man can come off, and stay off, and is no danger to anyone. Nobody's ever proved it. Nobody's ever tried.")),
    say("aurel", R("And the King gives a dinner tomorrow for the envoys. Both of them. You'll want to wash.")),
    setf({"holmFree": True}), stage("ah21"),
    goto(HOLM, 27, 11, "down"),
]
S["kingsDinner"] = [
    iff({"stage": "ah21"}, [
        setf({"light": "evening"}),
        n("The King of Lorne's hall: a long table, a fire at each end, and a thin old king in the middle who says very little and watches everything."),
        n("Across the table from Rhea, in a good grey coat with the Guild's loftbuck on the clasp, sits Finch."),
        n("He's taller. He has a scar through one eyebrow that he didn't have at Kell's Bridge. He doesn't look at her once, all through the dinner, and he speaks for the Guild beautifully."),
        say("finch", R("The Houses ask only for peace in the north. Lorne's passes closed. Lorne's riders where Lorne wants them. And the high grazing, which the clans have never used well.")),
        n("When it's Rhea's turn, she says what she came to say. The King listens to both of them with exactly the same face."),
        fade("Later. The city wall."), setf({"light": "night"}),
        n("He's on the wall above the harbour, alone, as if he knew she'd come. Maybe he did. He always knew where she'd go."),
        say("finch", R("You shouldn't be here. They hang people with rings in this town. They'd hang you for the trays in your baggage if Aurel hadn't signed.")),
        choose("Finch is looking at the sea, not at her.",
               opt(R("You offered them the clans' grazing. Abel's beasts. Gerd's people. Do you even know what that means?"), [
                   add({"finchTrust": -6}), setf({"finchWall": "blame"}),
                   say("finch", R("It means the Houses win, and fewer people die getting there. I did the sum. You taught me to do sums.")),
                   n("He goes in without another word."),
               ], hint="Say what he's done."),
               opt(R("Come home, Finch. Whatever they've told you."), [
                   add({"finchTrust": 6}), setf({"finchWall": "ask"}),
                   say("finch", R("Home's a burnt valley.")),
                   n("But he stays on the wall with her until the bell, and neither of them says anything else, and it's the longest they've stood together since the harvest before the raid."),
               ], hint="Ask."),
               opt("Stand beside him and say nothing", [
                   add({"finchTrust": 2}), setf({"finchWall": "silence"}),
                   n("They stand there. Out on the water, a seal comes up, looks at them, and goes down again. Finch nearly laughs. He catches it in time."),
               ], hint="He was always better at silence.")),
        stage("ah22"),
        toast("Prove to Lorne's court that a ringed man can be weaned. Find witnesses: Frostmere, the fishing village on the ice, and anyone in Holm who'll speak."),
        fade("Morning."), setf({"light": "day"}), goto(HOLM, 27, 11, "down"),
    ], [n("The King's hall. The door wardens don't move aside for valley folk.")]),
]
S["aurelCase"] = [
    iff({"stage": "ah22"}, [
        say("aurel", R("Witnesses. People the court can see. There are weaned people in Lorne; there have to be. Nobody admits it, because admitting it is a rope.")),
        say("aurel", R("Try Frostmere, out on the ice. The fishing families there don't come to Holm, and Holm doesn't go there. And there's a knight doing penance in the square, Sigrun. Ask her why.")),
        iff({"not": "ledgerCounted"}, [setf({"ledgerCounted": True}),
            iff({"flag": "collegeProof"}, [setf({"wit.ledger": True}), add({"witnesses": 1})],
                [iff({"eq": {"road.college": "refused"}}, [setf({"wit.ledger": True}), add({"witnesses": 1})])]),
            iff({"flag": "wit.ledger"}, [say("aurel", R("The College's record from Hollin will help. A court likes paper. It's not a face, though."))])]),
        iff({"atLeast": {"witnesses": 2}}, [say("aurel", R("You have enough to stand up in court. Whether it's enough to win, I don't know."))],
            [say("aurel", R("You haven't enough yet. One voice is a story. The court wants two."))]),
        choose("Aurel waits for an answer.",
               opt("I'm ready. Ask for the day.", [run("trialChoice")]),
               opt("Not yet.", [say("aurel", R("Don't take long. Winter's short in court and long in the cells."))])),
    ], [say("aurel", R("Holm is a hard town. It thinks that's the same as a fair one."))]),
]
S["frostmere"] = [
    iff({"stage": "ah22", "not": "wit.frostmere"}, [
        n("Frostmere is a dozen huts on the shore of a frozen mere. The fishers stop work when the strangers come, and the women take the children inside."),
        say("fisher", R("Valley folk. With the Commons? ... Then you'd best go before the hunters see you here. The King's ring-hunters come out every month to look at our necks.")),
        n("An old man is mending a net on the step of the end hut, with his collar open in the cold. His neck is a mass of old pale rings, faded nearly to nothing. Twenty, at least."),
        say("fisher", R("My father. He came off them on his own, forty winters ago, with the whole village sitting up with him. Half the old ones here did. We don't talk about it. In Holm it's a rope.")),
        n("Then the dogs. Four riders coming over the ice in a line, in Lorne blue, with ring-hunting hounds on long leashes."),
        say("fisher", R("Every month. They've never found him. They've never looked properly. Today they will, because you're here.")),
        {"battle": "road-ringhunters", "win": [
            n("The ring-hunters ride back to Holm with their dogs and a story. The old man watches them go from his step, and closes his collar."),
            say("fisher", R("Well. They'll be back with more. So I might as well go to Holm and be hanged in good company. I'll speak for your man. Forty winters, I'll tell them.")),
            setf({"wit.frostmere": True}), add({"witnesses": 1}),
            toast("A witness: the old man of Frostmere."),
        ]},
    ], [iff({"flag": "wit.frostmere"}, [say("fisher", R("Father's packing his good coat. He says if they hang him, he wants to look nice."))], [n("Frostmere's huts are shut tight against the wind.")])]),
]
S["sigrun"] = [
    iff({"stage": "ah22", "not": "sigrunAsked"}, [
        n("A tall knight in silver-blue plate kneels on the stones beside the gallows, bareheaded in the cold, with a stripe of black disgrace paint across her brow."),
        say("sigrun", R("Sigrun, once of the King's guard. Stripped of rank for letting a magistrate's letters through the border without reading them. The letters were from his wife's brother. In the valleys.")),
        say("rhea", R("Brannoc.")),
        say("sigrun", R("I read them afterwards. He wrote that he was eleven months on lulls and two years off them. I've seen men in the guard come off in secret, with nothing but a locked room and a friend outside it. Two of them. They're still in the guard.")),
        say("sigrun", R("If I say that in court, I'm finished in Lorne, and so are they.")),
        setf({"sigrunAsked": True}),
        choose("Sigrun kneels on the stones, waiting to see what you'll ask.",
               opt(R("Say it. Not their names. Just that you've seen it."), [
                   setf({"wit.sigrun": True}), add({"witnesses": 1}),
                   say("sigrun", R("No names. Very well. There's nothing left of me here to lose.")),
                   toast("A witness: Sigrun, once of the King's guard."),
               ], hint="It will finish her in Lorne."),
               opt("Don't ask her", [n("Rhea leaves her kneeling. Sigrun watches her go with an expression it takes Rhea a long time to understand: disappointment.")], hint="She's lost enough.")),
    ], [iff({"flag": "wit.sigrun"}, [say("sigrun", R("I'll be there."))], [say("sigrun", R("Lorne's justice. Enjoy it."))])]),
]
S["trialChoice"] = [
    iff({"stage": "ah22"}, [
        say("aurel", R("Before I ask the court for a day, you should know there's another way. Some of the gaol guards drink at the Anchor. Some of them owe me. A door could be left open on a winter night.")),
        say("aurel", R("If he walks out, Lorne will call it the Commons breaking the King's gaol. The King will sign the Guild's paper the same week. I'd lose my seat. I don't care about my seat.")),
        choose("Aurel waits. Brannoc is in the end cell.",
               opt("Put Brannoc on trial", [setf({"lorneWay": "trial"}), run("trial4")], hint="Win, and Lorne's law changes. Lose, and he hangs."),
               opt("Break him out", [setf({"lorneWay": "breakout"}), run("breakout4")], hint="He lives. Lorne goes to the Guild.")),
    ]),
]
S["trial4"] = [
    fade("The King's court. A grey morning."),
    goto(HOLM, 4, 11, "up"),
    n("The court is a cold stone room full of people in their coats. The King himself has come, and sits at the back, which nobody can remember him doing before."),
    n("Brannoc stands in the dock with his collar open, so the court can see all eleven rings."),
    say("brannoc", R("Eleven months. Then two years without. I'm not asking you to like it. I'm asking you to look.")),
    iff({"flag": "wit.frostmere"}, [n("The old man from Frostmere walks the length of the court, opens his collar, and tells them forty winters. Some of the fishermen's wives in the gallery start to cry, and don't explain why.")]),
    iff({"flag": "wit.sigrun"}, [n("Sigrun, still in her disgrace paint, tells the court she has seen men of the King's own guard come off lulls and serve on. She gives no names. The guard captain at the door goes white.")]),
    iff({"flag": "wit.ledger"}, [n("Rhea reads from the College's record: the hearing at Hollin, the trial ledger, the College refusing the Guild's certificate. The court's clerk asks for a copy.")]),
    iff({"atLeast": {"witnesses": 2}}, [
        n("The court deliberates for an hour. The King doesn't move from his bench at the back."),
        say("aurel", R("The court finds that the accused wears the marks of the Guild and not its creature. A ring is a scar, not a crime. He walks free. And the law of Lorne will be read again by the King's council, in the light of this.")),
        n("Nobody cheers. In Lorne nobody cheers in court. But on the way out, an old guardsman at the door undoes his collar, very slightly, and looks Rhea in the eye."),
        say("king", R("The Guild's envoy will be told that Lorne does not sign. Lorne doesn't buy grazing from people who don't own it. Tell the clans that from me.")),
        setf({"road.lorne": "won", "nation.lorne": "pact", "deed.lorne": True, "recruited.aurel": True}), add({"standing.lorne": 40}),
        iff({"flag": "wit.sigrun"}, [setf({"recruited.sigrun": True}), {"join": "sigrun"}, n("Sigrun asks the King for her pardon in front of the court, and gets it, and asks in the same breath for leave to ride south with the Commons.")]),
        toast("Lorne's court frees Brannoc. Lorne refuses the Guild."),
    ], [
        n("The court deliberates for an hour. Then the clerk reads the law, which is very old and very short."),
        say("aurel", R("The court finds that the accused wears the marks of the Guild. The law of Lorne is the law. He hangs at dawn.")),
        n("Aurel reads it in a steady voice. Afterwards he goes out to the yard and is sick against the wall."),
        fade("Dawn. The square."),
        n("Brannoc asks for nothing but a clear morning, and gets one. He looks at the sea the whole time. Rhea stands where he can see her, because he asked her to."),
        n("Afterwards, the King sends word that Lorne will not sign the Guild's paper. Nobody in Holm will say why. Everybody in Holm knows."),
        setf({"road.lorne": "lost", "brannocHanged": True, "nation.lorne": "held"}), {"leave": "brannoc"},
        toast("Brannoc hangs in Holm. Lorne refuses the Guild."),
    ]),
    run("afterLorne"),
]
S["breakout4"] = [
    fade("Holm gaol. A winter night."), setf({"light": "night"}),
    goto(GAOL, 2, 9, "up"),
    n("The door at the top of the stair is unlocked, as promised. The guardroom is not empty, as promised. Somebody else has paid the guards tonight too."),
    {"battle": "road-gaol", "win": [
        n("Brannoc comes out of the end cell on his own feet, with his collar up and his face set."),
        say("brannoc", R("They'll say the Commons broke the King's gaol. They'll be right.")),
        fade("Out of Holm, over the ice, before dawn."), setf({"light": "day"}),
        n("By the time they reach the high pass, the news has gone ahead of them: the King of Lorne has signed the Guild's paper. Lorne's riders will come south over the passes when the snow goes."),
        setf({"road.lorne": "breakout", "lorneWar": True}), add({"standing.lorne": -50, "standing.drevka": -10}),
        toast("Brannoc is free. Lorne signs with the Guild."),
    ]},
    run("afterLorne"),
]
S["afterLorne"] = [
    n("Before she leaves Lorne, Aurel brings her two things. A letter that came for her through the League's house in Holm, sealed with the Corvane League's scales. And a page from the Guild envoy's rooms, left behind when he went."),
    n("The page is a list in Finch's hand. Places and dates. Kestrel Fort, done. Holm, done. Corvane: \"the spring settling. The Houses' notes fall due. Without the League, no Tarsis.\""),
    n("The letter is from a League clerk named Ilse Varn. She has opened the League's ledgers, she writes, and she is frightened of what's in them. She asks for the Commons' protection. She will meet the envoy at Corvane before the spring settling."),
    setf({"ilseLetter": True}),
    stage("ah23"),
    run("corranWinterRoad"),
]

# ================================================================== Corran's winter (the second interlude)
S["corranWinterRoad"] = [
    iff({"eq": {"corranFate": "thornwick"}}, [run("corranStair")], [
        iff({"eq": {"corranFate": "left"}}, [run("corranFever")], [run("corranSentence")])]),
    run("backToRoad2"),
]
S["corranStair"] = [
    fade("Thornwick. Midwinter, while she is away."),
    setf({"hero": "corran", "light": "night"}), stage("ai2"),
    n("House catchers come up the Kerrow road in the snow at night, six of them, with a list of runaways and a cart with a cage on it. The watch sees their lanterns on the switchbacks an hour before they reach the gate."),
    say("dorrit", R("Six. We've got the cooks, Haldane, and you. The rest are down at the camp for the winter muster.")),
    n("Corran looks at the terrace stair: narrow, iced, two men wide. A Warden would hold it with six. He knows. He's held stairs."),
    choose("The lanterns are on the last switchback.",
           opt("Hold the stair, the Warden way", [setf({"stairHeld": "fight"}), add({"hold": 4}),
               n("He holds it with a door bar and Dorrit's lamp and the cooks behind him with pans. The catchers come up the ice one at a time, because that's how a stair works, and go back down it the same way. Nobody dies. One of them leaves a tooth."),
               n("The children watch from the bathhouse windows. In the morning, Wren draws him on her slate, holding the stair. She gives him a cape, which he hasn't got.")], hint="He knows how. He hates that he knows."),
           opt("Meet them at the gate and talk", [setf({"stairHeld": "talk"}), add({"hold": 2}),
               n("He goes down to the gate with no weapon and tells the catchers' sergeant his name, and his old rank, and the name of his old commander, and what Halloran will do to a sergeant who starts a fight at a Commons post without orders."),
               n("Every word is true. The catchers go back down the road. Corran is sick in the snow behind the gate afterwards, and doesn't know if it's the cold or the voice he used.")], hint="He was a Warden officer once. They'll listen to that voice.")),
    setf({"hero": "rhea"}),
]
S["corranFever"] = [
    fade("House Mire. Midwinter."),
    setf({"hero": "corran", "light": "night"}), stage("ai2"),
    n("The fever goes through Mire's sick room in the dark of the year. The House physician comes once, looks at the children on their pallets, and marks a cross in his book beside six names."),
    n("Corran sits up with the six. He has no medicine. He has water, and a cloth, and the foal song, with the third line wrong."),
    n("Four of them live. He doesn't know why four and not six. Nobody does."),
    setf({"mireFever": True}), add({"hold": 3}),
    setf({"hero": "rhea"}),
]
S["corranSentence"] = [
    fade("Millbridge. Midwinter."),
    setf({"hero": "corran", "light": "day"}), stage("ai2"),
    n("The town meets in the corn hall about the man in the gaol. Again. The reeve wants it done. Half the eleven families want it done. The other half have stopped coming to the meetings."),
    n("They bring him up from the cells to answer them. The first question comes from a woman whose son was one of the eleven."),
    say("woman", R("Why should you live?")),
    choose("The corn hall is silent, waiting.",
           opt(R("I shouldn't. I'm only asking you to wait until the war's done, so I can tell the Commons what I know first."), [setf({"corranAnswer": "use"}), add({"hold": 2}),
               n("It's true, and it's useful, and they hate that it's useful. They vote to wait.")], by="corran", hint="Give them a reason that isn't about him."),
           opt(R("I don't know. I'm not the one who should answer that."), [setf({"corranAnswer": "none"}), add({"hold": 4}),
               n("The woman looks at him for a long time. Then she sits down. Nobody else asks anything. The reeve puts it off again, until spring.")], by="corran", hint="The truth.")),
    setf({"hero": "rhea"}),
]
S["backToRoad2"] = [
    fade("Spring, on the road south."),
    setf({"hero": "rhea", "light": "day", "open.vale-east": True}), stage("ah23"), goto("town-longbarrow", 12, 11, "up"),
    n("Longbarrow, at the foot of the hill road. Ilse Varn's letter has a League seal on it, and the toll-men on the hill road are said to bow to that seal like a priest."),
    toast("East to Corvane, before the League's spring settling. The hill road leaves the vale past Longbarrow."),
]

# ================================================================== leg 5: the Corvane League and Tarsis
S["corvaneShut"] = [
    n("Corvane's gate wardens look at Ilse's letter, and at the stamp that isn't on it."),
    say("guard", R("Every stranger has their letter stamped at the toll house on Tally Hill. North, up the hill road. League law. Even for a League seal.")),
]
S["tollHouse"] = [
    iff({"stage": "ah23", "not": "tollFought"}, [
        setf({"tollFought": True}),
        n("Tally Hill. The toll bar is up, which it never is. The toll-men are nowhere. Six horses are tied outside the toll house, and they aren't League horses."),
        n("Warden riders come out of the toll house and the stables at the same time, the way men do who've been waiting for someone."),
        say("warden", R("Captain Rhea of the Commons. The Guild's envoy said you'd come this way. He was very sure.")),
        {"battle": "road-tollhouse", "win": [
            n("The last rider gets to his horse and goes down the hill road east at a gallop. The toll-men come out of the toll house cellar, where they've been tied up for two days, and are very grateful, and very frightened."),
            say("tollman", R("They knew your name. They knew the day. Somebody in Corvane sent word where you'd cross.")),
            n("He stamps Ilse's letter with the League's scales, and his hand is shaking so badly the stamp is crooked."),
            stage("ah24"), toast("The letter is stamped. Corvane is to the south."),
        ]},
    ], [say("tollman", R("Corvane's south, down the hill road. Mind who you talk to there."))]),
]
S["ottilie"] = [
    iff({"stage": "ah24"}, [
        n("Corvane: a tidy hill town of grey stone counting houses, every door with a brass plate, every plate polished. The square is quiet. Too quiet for market day."),
        n("A young knight in polished plate and a League-blue sash is waiting by the fountain with a sword and a buckler. She is very calm."),
        say("ottilie", R("Ottilie, sworn sword of the League. The council asks you to leave Corvane by the road you came in on, Captain. Today.")),
        say("rhea", R("I'm here to see Ilse Varn.")),
        say("ottilie", R("I know. I'm her guard. The council says she's unwell, and that you'll make her worse. I think the council is lying. I've sworn to obey it anyway.")),
        say("ottilie", R("So. To the first yield, Captain, and then one of us does what the other says.")),
        {"duel": "road-ottilie", "win": [
            n("Ottilie's sword is on the cobbles. Her buckler is on the cobbles. She is still standing, which is what she seems to mind most."),
            choose("Ottilie waits for you to say it.",
                   opt(R("Go back to Ilse. Tell her I'm coming, and tell her what the council asked you to do."), [
                       setf({"ottilieWay": "spared"}),
                       n("Ottilie picks up her sword, looks at it, and puts it back in its sheath. Then she bows, very correctly, and goes."),
                   ], hint="Ilse hears it from her own guard first."),
                   opt(R("You're coming with me. I'll tell Ilse myself."), [
                       setf({"ottilieWay": "beaten"}),
                       n("Rhea takes her sword and walks her across the square. People in the counting house windows watch them go. By the evening, every clerk in Corvane will know that the League's champion was marched through the square."),
                   ], hint="Make sure of her.")),
            stage("ah25"),
        ]},
    ]),
]
S["ilseHouse"] = [
    iff({"stage": "ah25"}, [
        setf({"light": "evening"}),
        n("Ilse Varn's house: narrow, tall, with every window shuttered and a cold fire. Ilse is in her coat, as if she's been ready to leave for days."),
        iff({"eq": {"ottilieWay": "spared"}}, [
            n("Ottilie is standing behind her chair. She has told Ilse everything. Ilse looks at Rhea, then at her guard."),
            say("ilse", R("You beat my sworn sword and sent her back to me to warn me about you. That's either very honest or very clever. I'll take it as honest. I haven't the time to do anything else.")),
            setf({"recruited.ottilie": True}), {"join": "ottilie"},
            say("ottilie", R("Where she goes, I go. That's what sworn means. The council can find another champion.")),
        ], [
            n("Ilse sees Ottilie come in without her sword, with Rhea behind her, and goes very still."),
            say("ilse", R("So the council sent her, and you beat her, and walked her through the square. Now everyone in Corvane knows I'm the one who wrote to you. Thank you, Captain.")),
            say("ottilie", R("She's right. I'd do it again, though. I'd still be in the square if you'd been the council's.")),
        ]),
        say("ilse", R("I'm a clerk of the second ledger. I count other people's money. Three months ago a ledger came to me that I wasn't meant to see, and I added it up.")),
        say("ilse", R("The proof is in the counting house vault. The Houses' notes. I can't get them out. The council has locked me out of my own office. But I know the night porters' round, and I know where every key hangs.")),
        say("ilse", R("Tonight, before the settling. After the settling, the notes go back to Vantry and nobody will ever see them again.")),
        stage("ah26"),
        toast("Into the counting house tonight. The door is on the east side of the square."),
    ], [iff({"stagePrefix": "ah2"}, [say("ilse", R("Counting is the only honest thing in Corvane. The numbers don't care who's reading them."))])]),
]
S["vaultIn"] = [
    iff({"stage": "ah26"}, [
        setf({"light": "night"}),
        n("Ilse unlocks the counting house's side door with a key she shouldn't have. Inside, the lamps are lit. They're never lit at night."),
        goto(VAULT, 2, 9, "right"),
    ], [n("The counting house. Shut, with a brass plate on the door: \"Hours of business, by appointment.\"")]),
]
S["vaultGuards"] = [
    n("The long hall of ledgers. Two League porters, and a vault ironback the size of a cart, chained by the strongroom door, and a man in a good grey coat counting crates of paper by lamplight. A Guild factor. Packing."),
    say("factor", R("The Commons captain. The envoy said you'd lose a day on the pass. He was wrong about something at last.")),
    {"battle": "road-vault", "win": [
        n("The factor runs for the front office and goes out through a window, leaving his coat. The ironback lies down where it was chained, and sighs, and goes to sleep."),
        setf({"vaultFought": True}),
    ]},
]
S["ledgers"] = [
    iff({"flag": "vaultFought", "not": "ledgersRead"}, [
        setf({"ledgersRead": True}),
        n("The strongroom. Ilse goes straight to a shelf and pulls down three ledgers bound in black, and lays them open on the table."),
        say("ilse", R("The first. The highland growers, every valley from the cloudline down. They owe for their seed, their trays, their kith. They used to owe the Guild. Two years ago, the League bought every one of those debts. Quietly. For half their worth.")),
        say("ilse", R("The second. The Houses. They've been borrowing against their next broods for three years. Not this year's children. Next year's. And the year after's.")),
        n("Rhea reads it twice. The Houses are borrowing against children who aren't born yet."),
        say("ilse", R("The third. The autumn contract with Tarsis. The Houses can't pay it. So the League is paying it for them, out of what the growers owe the League.")),
        say("ilse", R("The Guild isn't rich, Captain. It's in debt to us up to the eyes. And the highlands are paying the swords that will be sent to burn them. That's what I added up.")),
        n("At the bottom of the third ledger, in a different hand, a note: the next payment, and where it goes. Not to Tarsis. South. A season's coin, every season, to the Ember Courts."),
        say("ilse", R("I don't know what that one is. I've never known. Nobody here asks about the south.")),
        n("Ilse closes the books and picks up all three."),
        say("ilse", R("The settling is in the morning. The whole council, and every House's agent. I'm going to read these out. I'd like you standing next to me when I do.")),
        fade("Morning."), setf({"light": "day"}), goto(CORV, 14, 7, "up"), stage("ah27"),
        toast("The spring settling, in the council hall."),
    ], [iff({"flag": "ledgersRead"}, [n("Empty shelves, now.")], [n("The strongroom door. The vault ironback lies across it, chained, watching you.")])]),
]
S["settling"] = [
    iff({"stage": "ah27"}, [
        n("Corvane's council hall: a round table of black wood, twelve chairs, and on the wall behind them a great brass scale that has been perfectly level for two hundred years."),
        n("Every House has an agent here, in grey. The Guild factor from the counting house is one of them. He has a new coat."),
        n("Ilse reads out the three ledgers. It takes an hour. Nobody interrupts. When she gets to the Houses' borrowing against unborn broods, one of the old councillors puts his hand over his eyes."),
        say("factor", R("The Houses' notes are good. The Houses have never failed to pay.")),
        say("ilse", R("The Houses have never been asked to pay. That's different.")),
        n("Then the council turns to Rhea, because the growers whose debts the League holds are the Commons' own people, and the League needs to know what the Commons will do with them."),
        say("councillor", R("The League will stop paying Tarsis on the Houses' behalf. We are not fools. But the growers' debts are real money, Captain. Ten thousand savers in the lowland towns put their coin into them. Widows. Clerks. Mill pensions. What does the Commons say?")),
        choose("The whole council waits. Ilse doesn't look at you.",
               opt(R("Forgive the growers' debts. All of them. They were bought for half, from the people burning them."), [
                   setf({"road.league": "forgive"}), add({"standing.corvane": -15, "standing.millbridge": 10}),
                   n("The hall goes quiet. Then the arguing starts, and goes on all day. In the end the council votes it, seven to five, because Ilse's ledgers are on the table and nobody wants to be the one who read them and voted for the Guild."),
                   n("Ten thousand lowland savers lose what they put in. Some of them will be in the Commons' own ranks by autumn, and some of them will never forgive it."),
               ], hint="The highlands go free. The lowland savers are ruined."),
               opt(R("Write them down slowly. The growers pay what they can, over twenty years, and the savers get something back."), [
                   setf({"road.league": "writedown"}), add({"standing.corvane": 20}),
                   n("The council votes it before noon. It's sensible. It's fair to the savers. The highland growers will be paying the League for a generation, a little every harvest, and their children after them."),
               ], hint="Fair to the savers. The highlands stay in debt for a generation.")),
        say("councillor", R("Then the League's autumn contract with Tarsis is void. The Houses may pay their own swords, if they can find the coin.")),
        n("The Guild factor stands up, bows to the scale on the wall, and leaves. He doesn't take his papers."),
        setf({"recruited.ilse": True, "nation.corvane": "pact", "deed.corvane": True}),
        say("ilse", R("They'll need someone to keep the Commons' books, now you have creditors. I'm unemployed as of an hour ago. And I'd rather not be in Corvane when the Houses' agents get home.")),
        toast("The League stops paying the Guild's swords. Ilse Varn joins the Commons."),
        say("ilse", R("Tarsis has paid half its company in lulls for years, on the Houses' credit. Vela Orme's contract ends at the new moon. Without the League's coin, she's free to sell to whoever reaches her first. And the Guild's envoy has a fast horse.")),
        stage("ah28"),
        toast("South-east, over the steppe, to Tarsis."),
    ], [n("The council hall. Locked between sittings.")]),
]
S["tarsisGate"] = [
    iff({"stage": "ah28"}, [
        n("Tarsis: a fort of sun-baked stone on a bare rise in the steppe, with a black banner and a coin painted on it. Inside, a yard full of sellswords doing nothing in the patient way of people paid by the season."),
        n("Half of them have their collars turned up. In spring. On the steppe."),
        say("kesh", R("Commons? You're the second envoy this month. The first one had a better coat. Captain's in the hall.")),
        stage("ah29"),
    ]),
]
S["vela"] = [
    iff({"stage": "ah29", "not": "velaFought"}, [
        n("Vela Orme's hall: a long room with maps on every wall and a strongbox on the table, open, empty. Vela is sitting on the table beside it. White-blonde, scarred lip, a coin on a cord round her neck."),
        say("vela", R("The Guild's envoy was here eight days ago. Nice boy. He offered me the Houses' coin. Then a League rider came through and told me the League's not paying it. So he offered me the Houses' word instead. I'd rather have the coin.")),
        say("vela", R("Then he left, south, with his escort, in a hurry. And now you.")),
        say("rhea", R("The Commons will pay you not to march for the Guild.")),
        say("vela", R("Everyone pays me not to do things. I don't sell to people who can't fight. A company that's bought by losers is a company that's dead by winter.")),
        say("vela", R("So we'll find out. Tomorrow, on the flat below the fort. My companies against whatever you've brought. Blunted spears, no bows at the face. First side that yields the field.")),
        fade("The next morning. The flat below Tarsis."),
        {"army": "tarsis-yield", "win": [
            setf({"velaFought": True, "tarsisYield": "won"}), add({"standing.tarsis": 20}),
            n("Vela's companies give ground, and give ground, and then give the field. Vela rides out to the middle of it and holds up her open hand. The sellswords on both sides cheer, because sellswords cheer a good fight whoever wins it."),
            say("vela", R("Well. You can fight. Come up to the hall. We'll talk about money.")),
        ], "lose": [
            setf({"velaFought": True, "tarsisYield": "lost"}),
            n("The Commons yield the field. Vela rides out to the middle of it anyway, and looks at the Commons' lines for a long time."),
            say("vela", R("You lost. You lost well, and you didn't run, and nobody broke. That's worth more than you'd think. Come up to the hall.")),
        ]},
        stage("ah30"),
        toast("Vela will hear the Commons' offer. See the infirmary first."),
    ], [iff({"stage": "ah30", "flag": "kesh.seen"}, [run("lastContract")],
            [iff({"stage": "ah30"}, [say("vela", R("Go and see the infirmary first. You should know what you're buying."))], [say("vela", R("Captain."))])])]),
]
S["infirmary"] = [
    iff({"stage": "ah30", "not": "kesh.seen"}, [
        setf({"kesh.seen": True}),
        n("Tarsis' infirmary: two long rooms. In the first, ordinary wounds. In the second, with the shutters closed, a dozen sellswords lying on cots who aren't wounded at all. They're in the raw. The Houses' lulls stopped coming with the Houses' coin."),
        n("Kesh is sitting with one of them, holding a cup of water to his mouth."),
        say("kesh", R("Half the company wears them. Some of us asked for it, for the pain. Some of us got them in our pay and didn't ask anything. It's a good way to keep a man, Captain. Better than coin.")),
        say("kesh", R("Vela hates it. She took the contracts anyway. A captain who can't pay her company doesn't have a company.")),
        n("Rhea looks at the man on the cot. The rings on his neck go almost to his ear."),
        say("kesh", R("So whatever you're offering her, it had better have lulls in it, or it had better have doctors.")),
        toast("Back to Vela's hall."),
    ], [say("kesh", R("They're doing better today. Or worse. It's hard to tell, in here."))]),
]
S["lastContract"] = [
    n("Vela's hall. Vela, and her lieutenants, and the empty strongbox."),
    say("vela", R("So. What's the Commons offering?")),
    n("Rhea knows what the Commons has. Coin, a little. Greenlings, and Oda's trays. And the Guild lulls the Commons has captured: crates of them, in Kane's stores, waiting to be burned."),
    choose("Vela waits, with her hand on the coin round her neck.",
           opt(R("Lulls. The Guild's own, from our stores. Your whole company, paid the way it's always been paid."), [
               setf({"road.tarsis": "lulls", "recruited.vela": True, "nation.tarsis": "pact", "deed.tarsis": True}), setf({"lullTrade": True}),
               n("Vela doesn't smile. She just nods, like someone hearing a price she expected."),
               say("vela", R("The whole company, then. Every sword. For the season.")),
               n("In the infirmary, the shutters come open the next week. The men in the raw are up and on the walls again, with fresh lulls on their necks, from the Commons."),
               n("Kesh watches the first crate come in. He doesn't take one. He doesn't stay, either. By the new moon, he's gone."),
               toast("Tarsis marches for the Commons, every company of it. Paid in lulls."),
           ], hint="A full company. The Commons is in the lull trade."),
           opt(R("Greenlings, and doctors, and all the coin we have. Whoever wants to come off, comes off. Whoever doesn't, walks."), [
               setf({"road.tarsis": "greenlings", "recruited.vela": True, "recruited.kesh": True, "nation.tarsis": "pact", "deed.tarsis": True}), {"join": "kesh"},
               n("Vela looks at her lieutenants. Half of them look at the floor."),
               say("vela", R("Half my company walks out of that gate before midsummer. You know that.")),
               say("rhea", R("And the half that stays is yours. Not the Houses'.")),
               n("Over the next month, half of Tarsis goes through the raw on the infirmary cots, with greenlings from the Commons and Rhea sitting up with them. A third of those who start, finish. The rest take their pay and ride off over the steppe to find someone who still pays in lulls."),
               n("Kesh is one of those who finish. He comes to Rhea's fire on the last night, hollow-cheeked, with his twin blades on his back."),
               say("kesh", R("I owe you a month of not being dead. I'll pay it off on foot.")),
               toast("Half of Tarsis marches for the Commons, weaned. Kesh joins."),
           ], hint="Half a company, all of it loyal. Half of Tarsis goes through the raw.")),
    {"join": "vela"},
    say("vela", R("One more thing, since we're friends. The Guild's envoy didn't come here for me. I was on his way. He was going south, across the desert, with an iron chest from the Houses. Second one this year.")),
    say("ilse", R("A season's coin. To the Ember Courts. It's in the ledger. That's what it was.")),
    stage("ah31"),
    toast("South, across the desert, to the Ember Courts."),
]

# ================================================================== actors, steps, looks
def actor(id, map, x, y, look, talk, when=None, **kw):
    a = {"id": id, "map": map, "x": x, "y": y, "look": look}
    if when: a["when"] = when
    if talk is not None: a["talk"] = talk
    a.update(kw)
    return a
def stages(*names): return {"stage": list(names)}
ROAD = {"stagePrefix": "ah"}
W_ALL = ["ah1", "ah2", "ah3", "ah4", "ah5", "ah6", "ah7", "ah8"]

actors = [
    actor("gateward", FAIR, 15, 2, "warden2", [run("gateward")], ROAD),
    actor("kit-fair", FAIR, 21, 9, "kit", [run("kit")], {"stagePrefix": "ah", "not": "recruited.kit"}),
    actor("fair-cider", FAIR, 4, 5, "vil5", [n("A cider seller. \"Hot or cold, northerner? Hot. You look like you've come over a mountain.\"")], ROAD),
    actor("fair-fiddler", FAIR, 10, 7, "vil3", [n("A fiddler, playing a jig too fast for anyone to dance to. Children dance to it anyway.")], ROAD),
    actor("speaker", SQ, 15, 11, "elder2", [run("speaker")], ROAD),
    actor("perrine-sq", SQ, 18, 8, "perrine", [run("perrineSquare")], {"stage": ["ah7", "ah8"], "not": "perrineUsed"}),
    actor("sq-merchant", SQ, 20, 13, "vil6", [n("A grain merchant. \"Last year's price, all winter. Only a fool votes against bread.\"")], ROAD),
    actor("sq-clerk", SQ, 25, 6, "vil1", [n("A town clerk with ink to the elbows. \"Nine days to the vote, and every ward wants its say on the stone first. I haven't slept since the Guild's boy came.\"")], ROAD),
    actor("ansel", PEAT, 8, 7, "vil4", [run("ansel")], ROAD),
    actor("peat-wife", PEAT, 12, 8, "vil2", [n("A farmer's wife, counting reedcats in the pen. \"Four. There were nine at harvest. Something in the reeds is eating well.\"")], {"stagePrefix": "ah", "not": "ward.fens"}),
    actor("gil-fens", PEAT, 19, 6, "gil", None, {"stage": "ah4", "flag": "fensAsked", "not": "ward.fens"}),
    actor("orla", TAN, 7, 7, "vil7", [run("orla")], ROAD),
    actor("tan-apprentice", TAN, 10, 3, "kid3", [n("An apprentice in the pit, scraping a hide. \"Can't stop. Lime doesn't bite while you keep moving.\"")], ROAD),
    actor("davy", TAN, 4, 3, "kid", [say("davy", R("Next year. When I'm out of the pits. I mean it."))], {"stagePrefix": "ah", "flag": "ward.tanners"}),
    actor("bryn", QUAY, 6, 6, "wb-fisher", [run("bryn")], ROAD),
    actor("bargeman", QUAY, 21, 6, "factor", [say("bargeman", R("Guild barge. Grain for the Free Towns. Keep off the deck."))], {"stagePrefix": "ah", "not": "ward.fishers"}),
    actor("haldane-col", COL, 12, 9, "haldane", [run("haldaneGate")], stages("ah5", "ah6")),
    actor("provost", COL, 13, 3, "factor", [run("hearing")], stages("ah6")),
    actor("col-student", COL, 17, 12, "vil3", [n("A student in a gown too big for him. \"They say the Commons envoy's going to be heard in the hall. Nobody's been heard in the hall since my grandfather's time. They just read things out.\"")], ROAD),
    actor("porter", ARC, 12, 7, "warden2", [run("archiveGuards")], {"stage": "ah5", "not": "archiveFought"}),
    # Reedhythe and Port Ashby
    actor("saul", REED, 8, 8, "vil7", [run("saul")], ROAD),
    actor("reed-nephew", REED, 13, 8, "smuggler", [n("One of Mother Saul's nephews, whittling. He doesn't look up. He doesn't need to.")], ROAD),
    actor("reed-nephew2", REED, 9, 10, "smuggler", [n("Another nephew, mending a net that has never caught a fish.")], ROAD),
    actor("pike", TAV, 6, 7, "vil4", [run("pike")], ROAD),
    actor("meg", TAV, 13, 7, "vil2", [run("meg")], ROAD),
    actor("annet", TAV, 20, 5, "annet", [run("annet")], {"stagePrefix": "ah", "not": "recruited.annet"}),
    actor("tav-keeper", TAV, 6, 3, "innkeeper", [n("The Lantern's keeper, polishing a glass that was clean an hour ago. \"Cards are at the tables. Rum's here. Trouble's outside.\"")], ROAD),
    actor("ash-fishwife", ASH, 18, 12, "kr-mother", [n("A fishwife with a basket of herring. \"Guild ships, Crown ships, Ember ships. They all eat fish. Ashby doesn't ask.\"")], ROAD),
    actor("ash-docker", ASH, 10, 7, "vil4", [n("A docker coiling rope. \"The Patience? She's been loading for a week. Apprentices, they say. Funny sort of apprentices. They cry.\"")], {"stagePrefix": "ah", "not": "brigTaken"}),
    actor("ash-docker2", ASH, 10, 7, "vil4", [n("A docker coiling rope. \"Someone took the Patience's whole cargo off her in the night. Not a soul in Ashby saw anything. Not a soul.\"")], {"stagePrefix": "ah", "flag": "brigTaken"}),
    actor("ash-sailor", ASH, 22, 7, "smuggler", [n("A sailor from somewhere hot, watching the harbour. \"Lorne's waters ice up at the first frost. After that, nobody sails north till spring.\"")], ROAD),
    # Drovers' Halt, Grazehold, Kestrel Fort, Snowgate
    actor("abel", "town-drovers-halt", 13, 8, "abel", [run("abel")], {"stage": ["ah14"]}),
    actor("toll-sergeant", "town-drovers-halt", 12, 10, "soldier", [n("The Commons toll sergeant, counting carts. \"Supplies for the winter camps. Every one of them late.\"")], {"stage": ["ah14"]}),
    actor("rider", GRAZE, 11, 6, "vil4", [run("riders")], {"stagePrefix": "ah"}),
    actor("graze-rider2", GRAZE, 14, 8, "vil6", [n("A clan rider oiling a lance. She doesn't take her eyes off Rhea's hands.")], {"stagePrefix": "ah"}),
    actor("graze-herder", GRAZE, 20, 10, "vil3", [n("A herder among the ironbacks. \"Lorne riders took twelve head off the east slope last spring. They'll take the whole slope next.\"")], {"stagePrefix": "ah"}),
    actor("gerd-ring", KEST, 14, 7, "gerd", [say("gerd", R("The clans have heard you, valley captain. Now go and make Lorne hear you."))], {"stage": ["ah18", "ah19", "ah20", "ah21", "ah22", "ah23"]}),
    actor("kest-smith", KEST, 4, 10, "vil5", [n("The fort's smith, hammering out a lance head. \"Arvo won the Iron Ride with a cracked shoulder. Champions don't stop for a shoulder.\"")], {"stagePrefix": "ah"}),
    actor("kest-wife", KEST, 22, 15, "vil2", [n("A clanswoman with a baby on her back. \"Gerd's been champion, and his father, and his. That's three hundred years of fathers in the ring.\"")], {"stagePrefix": "ah"}),
    actor("snow-host", SNOW, 6, 7, "vil7", [n("The hostel keeper, sweeping snow off her step with a broom that's mostly handle. \"Brede? She's the only one who goes out after a slide. The rest of us count the mules and say a word.\"")], {"stagePrefix": "ah"}),
    actor("snow-drover", SNOW, 9, 10, "vil4", [n("A drover stamping his feet by a tethered mule. \"Up here the slope decides who crosses. Not the King, not the clans. The slope.\"")], {"stagePrefix": "ah"}),
    actor("snow-monk", SNOW, 20, 12, "elder2", [n("An old hostel brother, chipping ice off the post that marks the road. \"Forty-one years. I've buried eleven travellers and dug out two hundred. Brede's dug out more than me, and she's thirty.\"")], {"stagePrefix": "ah"}),
    # Holm and Frostmere
    actor("guard", HOLM, 13, 15, "warden2", [say("guard", R("Papers. And open your collar."))], {"stage": ["ah15", "ah16", "ah17", "ah18"]}),
    actor("aurel", HOLM, 26, 11, "aurel", [run("aurelCase")], {"stage": ["ah21", "ah22"]}),
    actor("sigrun", HOLM, 13, 11, "sigrun", [run("sigrun")], {"stage": ["ah22"]}),
    actor("holm-fishwife", HOLM, 20, 15, "kr-mother", [n("A fishwife with her collar buttoned to the chin, like everyone in Holm. \"The gallows? It's been empty since harvest. That's a long time, for Holm.\"")], {"stagePrefix": "ah"}),
    actor("holm-clerk", HOLM, 6, 11, "vil1", [n("A court clerk, hurrying. \"The court sits on fourth days. The King hasn't come to it in eleven years.\"")], {"stagePrefix": "ah"}),
    actor("fisher", FROST, 11, 10, "wb-fisher", [run("frostmere")], {"stagePrefix": "ah"}),
    actor("frost-old", FROST, 4, 10, "elder", [n("An old man mending a net on the step of the end hut. He keeps his collar closed when strangers look at him.")], {"stage": ["ah15", "ah16", "ah17", "ah18", "ah19", "ah20", "ah21"]}),
    actor("frost-child", FROST, 17, 12, "kid3", [n("A child on the ice with a hand line, pulling up a fish no longer than a finger, very proud of it.")], {"stagePrefix": "ah"}),
    # Tally Hill, Corvane, Tarsis
    actor("tollman", TALLY, 6, 8, "vil1", [run("tollHouse")], {"stagePrefix": "ah", "flag": "tollFought"}),
    actor("tally-groom", TALLY, 20, 8, "kid3", [n("A stable boy, sweeping out the stalls the Warden horses were in. \"They didn't pay for the hay. Wardens never pay for the hay.\"")], {"stagePrefix": "ah"}),
    actor("tally-drover", TALLY, 15, 11, "vil4", [n("A drover with three ironbacks, waiting for the toll bar. \"Corvane counts everything. They counted my beasts' teeth last year.\"")], {"stagePrefix": "ah"}),
    actor("ilse", CORV, 4, 11, "ilse", [run("ilseHouse")], {"stage": ["ah25"]}),
    actor("corv-clerk", CORV, 18, 7, "vil1", [n("A clerk in a black coat with ink on his cuffs, hurrying. \"Settling week. Nobody sleeps in settling week.\"")], {"stagePrefix": "ah"}),
    actor("corv-widow", CORV, 10, 12, "kr-mother", [n("An old woman in good black, at a stall. \"My husband's pension is in the growers' notes. Safe as stone, the League said. The League always says that.\"")], {"stagePrefix": "ah"}),
    actor("corv-porter", CORV, 24, 12, "warden2", [n("A League porter outside the counting house, with a brass-tipped staff. \"Hours of business are by appointment. Nobody has an appointment.\"")], {"stagePrefix": "ah", "not": "ledgersRead"}),
    actor("ilse-after", CORV, 16, 8, "ilse", [say("ilse", R("Ten thousand savers, or a generation of growers. I added it up both ways. Neither comes out even."))], {"stage": ["ah28"]}),
    actor("kesh", TARS, 15, 14, "kesh", [say("kesh", R("Captain's in the hall. Mind the dogs. Mind the captain more."))], {"stage": ["ah29"]}),
    actor("kesh-inf", TARS, 24, 12, "kesh", [run("infirmary")], {"stage": ["ah30"], "not": "kesh.seen"}),
    actor("vela", TARS, 14, 7, "vela", [run("vela")], {"stage": ["ah29", "ah30"]}),
    actor("tars-sword", TARS, 5, 13, "smuggler", [n("A sellsword sharpening a blade that's already sharp. His collar is turned up to his ears.")], {"stagePrefix": "ah"}),
    actor("tars-cook", TARS, 6, 14, "vil5", [n("The company cook, stirring a pot. \"Twenty years I've cooked for Tarsis. Never seen the strongbox empty. Never.\"")], {"stagePrefix": "ah"}),
    actor("tars-recruit", TARS, 20, 13, "vil3", [n("A young sellsword, watching the practice yard. \"Captain says we fight for whoever pays. Nobody's paid since the thaw.\"")], {"stagePrefix": "ah"}),
]

def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s

# where each place lets out onto its land map, and back
PLACES = {("west", "hollin"): (FAIR, (13, 12)), ("west", "college"): (COL, (13, 14)), ("west", "peatmoor"): (PEAT, (8, 12)),
          ("west", "reedhythe"): (REED, (12, 12)), ("coast", "ashby"): (ASH, (15, 16)),
          ("north", "grazehold"): (GRAZE, (12, 12)), ("north", "kestrel-fort"): (KEST, (14, 16)), ("north", "snowgate"): (SNOW, (13, 12)),
          ("north", "holm"): (HOLM, (15, 16)), ("north", "frostmere"): (FROST, (12, 12)),
          ("east", "tallyhill"): (TALLY, (12, 12)), ("east", "corvane"): (CORV, (14, 16)), ("east", "tarsis"): (TARS, (14, 15))}
LANDS = {l: {p["id"]: (p["x"], p["y"]) for p in json.load(open(os.path.join(ROOT, f"data/maps/land-{l}.json")))["places"]} for l in {k[0] for k in PLACES}}
LAND = LANDS["west"]
HOLM_SHUT = {"stage": ["ah15", "ah16", "ah17", "ah18"]}
steps = [step("land-north", tuple(LANDS["north"]["holm"]), [n("Holm's gates are shut to valley folk. A guard on the wall shouts down that the King gives no leave to strangers from the south this winter.")], HOLM_SHUT),
         step("land-east", tuple(LANDS["east"]["corvane"]), [run("corvaneShut")], {"stage": "ah23"}),
         step("land-east", tuple(LANDS["east"]["tarsis"]), [n("Tarsis' gate is barred. A sellsword on the wall calls down that the company takes no visitors while the captain's contract stands.")], {"stage": ["ah23", "ah24", "ah25", "ah26", "ah27"]})]
for (land, pid), (mid, (sx, sy)) in PLACES.items():
    lx, ly = LANDS[land][pid]
    steps.append(step(f"land-{land}", (lx, ly), [goto(mid, sx, sy, "up")], {"stagePrefix": "a"}))
    rows = json.load(open(os.path.join(ROOT, f"data/maps/{mid}.json")))["rows"]
    for x, ch in enumerate(rows[-1]):
        if ch == "e": steps.append(step(mid, (x, len(rows) - 1), [goto(f"land-{land}", lx, ly + 1, "down")]))
steps += [
    step(FAIR, (13, 13), [goto(WEST, LAND["hollin"][0], LAND["hollin"][1] + 1, "down")]),
    *[step(FAIR, (x, 1), [run("fairGate")]) for x in (13, 14)],
    *[step(SQ, (x, 17), [goto(FAIR, x, 3, "down")]) for x in (14, 15)],
    *[step(SQ, (0, y), [goto(QUAY, 24, 8, "left")]) for y in (13, 14)],
    *[step(QUAY, (25, y), [goto(SQ, 1, 13, "right")]) for y in (8, 9)],
    *[step(SQ, (29, y), [goto(TAN, 1, 5, "right")]) for y in (9, 10)],
    *[step(TAN, (0, y), [goto(SQ, 28, 9, "left")]) for y in (5, 6)],
    step(TAN, (16, 7), [run("cellar")], {"flag": "tanAsked", "not": "ward.tanners"}),
    step(COL, (23, 11), [run("libraryDoor")]),
    step(ARC, (14, 0), [goto(COL, 23, 12, "down")]),
    step(ARC, (25, 3), [run("provostPress")], {"not": "provostLetters"}),
    *[step(COL, (x, 6), [run("hearing")], {"stage": "ah6"}) for x in (13, 14)],
    # Port Ashby
    *[step(ASH, (x, 11), [goto(TAV, 11, 10, "up")]) for x in (3, 7)],
    *[step(TAV, (x, 11), [goto(ASH, 3, 12, "down")]) for x in (11, 12)],
    step(ASH, (26, 11), [run("harbourOffice")]),
    *[step(ASH, (x, 1), [run("moleEnd")]) for x in (15, 16)],
    step(BRIG, (0, 3), [goto(ASH, 15, 2, "down")]),
    # the North
    *[step(KEST, (x, 5), [run("gerdHall")]) for x in (14, 15)],
    step(KEST, (25, 11), [run("arvoStable")], {"stage": "ah17"}),
    step(KEST, (25, 11), [n("The stables. Ironbacks breathing in the dark, and harness on every peg.")]),
    step(SNOW, (6, 5), [n("The hostel. A fire, a pot, and a row of wet boots by the door.")]),
    *[step(SNOW, (x, 1), [goto("land-north", LANDS["north"]["snowgate"][0], LANDS["north"]["snowgate"][1] - 1, "up")]) for x in range(12, 16)],
    *[step(HOLM, (x, 5), [run("kingsDinner")]) for x in (15, 16)],
    step(HOLM, (27, 10), [n("Aurel Hask's house. The shutters are closed, and the knocker is a rope knot cast in iron.")]),
    step(HOLM, (4, 10), [n("The King's court. Locked, except on fourth days.")]),
    step(HOLM, (3, 14), [n("Holm gaol. A guard leans on the door and watches you until you go.")]),
    step(GAOL, (1, 10), [goto(HOLM, 3, 15, "down")]),
    *[step(FROST, (x, 9), [n("A fisher's hut, shut against the wind.")]) for x in (4, 11, 19)],
    # the East
    step(TALLY, (6, 6), [n("The toll house. A table, a ledger, a stamp on a chain.")]),
    step(TALLY, (20, 6), [n("The stables.")]),
    *[step(TALLY, (x, 0), [goto("land-east", LANDS["east"]["tallyhill"][0], LANDS["east"]["tallyhill"][1] - 1, "up")]) for x in (12, 13)],
    step(CORV, (4, 10), [run("ilseHouse")]),
    step(CORV, (25, 10), [run("vaultIn")]),
    *[step(CORV, (x, 5), [run("settling")]) for x in (14, 15)],
    step(CORV, (3, 14), [n("The Guild's house in Corvane. The shutters are closed, and the brass plate has been taken down.")]),
    step(VAULT, (1, 9), [goto(CORV, 25, 11, "down")]),
    step(VAULT, (18, 6), [run("ledgers")]),
    *[step(TARS, (x, 6), [run("vela")]) for x in (14, 15)],
    step(TARS, (24, 11), [run("infirmary")]),
    step(TARS, (5, 11), [n("The barracks. Bunks, kit, and the sweetish smell of the raw.")]),
]
zones = [
    {"map": FAIR, "area": [11, 9, 16, 11], "when": {"stage": "ah1"}, "do": [run("fairArrive")]},
    {"map": QUAY, "area": [17, 2, 24, 4], "when": {"flag": "quayAsked", "not": "ward.fishers"}, "do": [run("barge")]},
    {"map": PEAT, "area": [16, 5, 18, 7], "when": {"flag": "fensAsked", "not": "ward.fens"}, "do": [run("reedHide")]},
    {"map": ARC, "area": [1, 7, 28, 8], "when": {"stage": "ah5", "not": "archiveFought"}, "do": [run("archiveGuards")]},
    {"map": ASH, "area": [12, 13, 19, 16], "when": {"stage": "ah9"}, "do": [run("ashbyArrive")]},
    {"map": "town-drovers-halt", "area": [10, 9, 14, 11], "when": {"stage": "ah14", "not": "abelDone"}, "do": [run("abel")]},
    {"map": SNOW, "area": [11, 5, 16, 9], "when": {"stage": "ah18", "not": "snowDone"}, "do": [run("snowgate")]},
    {"map": HOLM, "area": [12, 13, 19, 16], "when": {"stage": "ah19"}, "do": [run("holmGate")]},
    {"map": TALLY, "area": [10, 7, 15, 10], "when": {"stage": "ah23", "not": "tollFought"}, "do": [run("tollHouse")]},
    {"map": CORV, "area": [12, 11, 17, 15], "when": {"stage": "ah24"}, "do": [run("ottilie")]},
    {"map": VAULT, "area": [3, 2, 13, 8], "when": {"stage": "ah26", "not": "vaultFought"}, "do": [run("vaultGuards")]},
    {"map": TARS, "area": [12, 13, 17, 15], "when": {"stage": "ah28"}, "do": [run("tarsisGate")]},
]
looks = [
    {"map": FAIR, "tile": "hay", "do": [n("Straw targets, stuck so full of knife holes that they're held together with string.")]},
    {"map": SQ, "tile": "table", "do": [n("The speaking stone. Four hundred years of feet have worn a dip in the middle where people stand.")]},
    {"map": TAN, "tile": "tray", "do": [n("A lime pit. The liquid is milky and smells of burnt hair. The edges are crusted white where children have climbed out.")]},
    {"map": ARC, "tile": "shelf", "do": [n("Stacks of bound reports, three hundred years of the College's opinions. Most of them have never been opened.")]},
    {"map": QUAY, "tile": "crate", "do": [n("Fish boxes, salted and stacked.")]},
]
songs = [
    {"when": {"map": PEAT, "flag": "fensAsked", "not": "ward.fens"}, "near": "gil-fens", "range": 8, "do": [
        n("Rhea sings the foal song into the reeds. Somewhere ahead, a reedcat answers. Then a second.")]},
]

# ================================================================== battles and duels
def unit(id, name, look, row, at, **kw):
    return {"id": id, "name": name, "look": look, "side": "foe", "row": row, **kw, "at": at}

BATTLES = {
    "road-fen-thief": {
        "id": "road-fen-thief", "name": "The reed hide", "backdrop": "meadow", "party": True,
        "intro": ["Six stolen reedcats and a draught buck, all answering one boy's whistle.", "Don't hurt them more than you must. They're the farmers' kith."],
        "won": "The kith scatter into the reeds", "lost": "Driven back into the water",
        "units": [unit("rf1", "Stolen reedcat", "reedcat:#7a6a4a", "front", [166, 96], hp=50, kith=True, level=16, skills=["pounce", "maul"], species="fog-reedcat"),
                  unit("rf2", "Stolen reedcat", "reedcat:#6a5a3a", "front", [192, 120], hp=50, kith=True, level=16, skills=["pounce", "maul"], species="fog-reedcat"),
                  unit("rf3", "Draught buck", "loftbuck:#8a7a5a", "front", [176, 136], hp=80, kith=True, level=16, skills=["maul"], species="drove-loftbuck"),
                  unit("rf4", "Stolen reedcat", "reedcat:#8a7a5a", "back", [226, 104], hp=46, kith=True, level=16, skills=["pounce"], species="market-reedcat")]},
    "road-tannery": {
        "id": "road-tannery", "name": "The Guild man's cudgels", "backdrop": "fire", "party": True,
        "intro": ["Four hired cudgels on the cellar steps, and the Guild man behind them.", "The apprentices are on the cots behind you."],
        "won": "The cellar is yours", "lost": "Thrown back against the cots",
        "units": [unit("tc1", "Hired cudgel", "cartwarden", "front", [170, 94], cast="warden", level=16, skills=["wstrike"]),
                  unit("tc2", "Hired cudgel", "cartwarden", "front", [196, 116], cast="warden", level=16, skills=["wstrike"]),
                  unit("tc3", "Hired cudgel", "cartwarden", "front", [162, 132], cast="warden", level=15, skills=["wstrike"]),
                  unit("tc4", "The Guild man", "factor", "back", [230, 100], cast="archer", level=16, skills=["bow"])]},
    "road-barge": {
        "id": "road-barge", "name": "The Guild barge", "backdrop": "road", "party": True,
        "intro": ["The bargemaster's crew, with boathooks, and a hatchery reedcat off its chain.", "Behind you, the open crates."],
        "won": "The barge is taken", "lost": "Knocked down the hold ladder",
        "units": [unit("bg1", "Barge hand", "warden", "front", [170, 94], cast="warden", level=17, skills=["wstrike"]),
                  unit("bg2", "Barge hand", "warden", "front", [196, 116], cast="warden", level=17, skills=["wstrike"]),
                  unit("bgc", "Hatchery reedcat", "reedcat:#6a5a4a", "front", [162, 130], hp=56, kith=True, level=17, skills=["maul", "pounce"], species="market-reedcat"),
                  unit("bga", "Bargemaster", "archer", "back", [230, 100], cast="archer", level=17, skills=["bow"])]},
    "road-archive": {
        "id": "road-archive", "name": "The College porters", "backdrop": "cistern", "party": True,
        "intro": ["Two College porters with brass-shod staves, and the College's reedcats, fat and furious.", "More porters are coming down the stairs. Be quick."],
        "won": "The stacks are clear", "lost": "Driven back to the stairs",
        "units": [unit("ap1", "College porter", "warden2", "front", [170, 96], cast="warden", level=17, skills=["wstrike"]),
                  unit("ap2", "College porter", "warden2", "front", [196, 118], cast="warden", level=17, skills=["wstrike"]),
                  unit("ac1", "College reedcat", "reedcat:#9a8a6a", "front", [160, 132], hp=54, kith=True, level=17, skills=["maul", "pounce"], species="market-reedcat"),
                  unit("ac2", "College reedcat", "reedcat:#8a7a5a", "back", [226, 104], hp=54, kith=True, level=17, skills=["pounce"], species="market-reedcat")]},
    "road-smugglers": {
        "id": "road-smugglers", "name": "Mother Saul's nephews", "backdrop": "meadow", "party": True,
        "intro": ["Four of Mother Saul's nephews, with boathooks and a fowling bow.", "Saul watches from her porch, smoking."],
        "won": "The nephews sit down again", "lost": "Pushed into the reeds",
        "units": [unit("sm1", "Saul's nephew", "smuggler", "front", [170, 94], cast="warden", level=17, skills=["wstrike"]),
                  unit("sm2", "Saul's nephew", "smuggler", "front", [196, 116], cast="warden", level=17, skills=["wstrike"]),
                  unit("sm3", "Saul's nephew", "smuggler", "front", [162, 132], cast="warden", level=16, skills=["wstrike"]),
                  unit("sm4", "Fowler", "smuggler", "back", [230, 100], cast="archer", level=17, skills=["bow"])]},
    "road-brig": {
        "id": "road-brig", "name": "The Patience's marines", "backdrop": "road", "party": True,
        "intro": ["Warden marines on the brig's deck, with cutlasses and a crossbow, and the bosun with his lantern.", "The children are coming up the side behind you."],
        "won": "The Patience is taken", "lost": "Driven back to the rail",
        "units": [unit("mb1", "Warden marine", "warden", "front", [170, 94], cast="warden", level=18, skills=["wstrike"]),
                  unit("mb2", "Warden marine", "warden", "front", [196, 116], cast="warden", level=18, skills=["wstrike"]),
                  unit("mb3", "Warden marine", "warden", "front", [162, 132], cast="warden", level=18, skills=["wstrike"]),
                  unit("mba", "Marine crossbow", "archer", "back", [230, 100], cast="archer", level=18, skills=["bow"]),
                  unit("mbb", "The bosun", "cartwarden", "back", [222, 128], cast="warden", level=19, skills=["wstrike"])]},
    "road-tollhouse": {
        "id": "road-tollhouse", "name": "The Warden riders at Tally Hill", "backdrop": "road", "party": True,
        "intro": ["Warden riders, dismounted, with sabres and a crossbow, coming out of the toll house and the stables.", "They were told you'd come."],
        "won": "The riders scatter down the hill road", "lost": "Pushed back down the hill",
        "units": [unit("tw1", "Warden rider", "warden", "front", [170, 94], cast="warden", level=21, skills=["wstrike"]),
                  unit("tw2", "Warden rider", "warden", "front", [196, 116], cast="warden", level=21, skills=["wstrike"]),
                  unit("tw3", "Warden rider", "cartwarden", "front", [162, 132], cast="warden", level=21, skills=["wstrike"]),
                  unit("tw4", "Rider's crossbow", "archer", "back", [230, 100], cast="archer", level=21, skills=["bow"]),
                  unit("tw5", "Escort sergeant", "warden", "back", [222, 128], cast="warden", level=22, skills=["wstrike"])]},
    "road-vault": {
        "id": "road-vault", "name": "The counting house at night", "backdrop": "cistern", "party": True,
        "intro": ["Two League porters with brass-shod staves, the Guild factor's bodyguard, and a vault ironback straining at its chain.", "Behind them, the strongroom."],
        "won": "The long hall is clear", "lost": "Driven back to the side door",
        "units": [unit("cv1", "League porter", "warden2", "front", [170, 96], cast="warden", level=21, skills=["wstrike"]),
                  unit("cv2", "League porter", "warden2", "front", [196, 118], cast="warden", level=21, skills=["wstrike"]),
                  unit("cvk", "Vault ironback", "ironback:#5a5a62", "front", [158, 132], hp=110, kith=True, level=22, skills=["maul", "horns"], species="vault-ironback"),
                  unit("cv3", "Factor's bodyguard", "smuggler", "back", [230, 100], cast="archer", level=22, skills=["bow"])]},
    "road-ringhunters": {
        "id": "road-ringhunters", "name": "The King's ring-hunters", "backdrop": "snow", "party": True,
        "intro": ["Four ring-hunters in Lorne blue, and their hounds, coming over the ice in a line.", "The old man is on his step behind you, with his collar open."],
        "won": "The ring-hunters ride back to Holm", "lost": "Driven back across the ice",
        "units": [unit("rh1", "Ring-hunter", "warden2", "front", [170, 94], cast="warden", level=19, skills=["wstrike"]),
                  unit("rh2", "Ring-hunter", "warden2", "front", [196, 116], cast="warden", level=19, skills=["wstrike"]),
                  unit("rk1", "Ring hound", "strider:#d8dde2", "front", [160, 132], hp=56, kith=True, level=19, skills=["pounce", "maul"], species="snow-strider"),
                  unit("rk2", "Ring hound", "strider:#c8ced4", "back", [222, 128], hp=56, kith=True, level=19, skills=["pounce"], species="snow-strider"),
                  unit("rh3", "Hunt captain", "archer", "back", [230, 100], cast="archer", level=20, skills=["bow"])]},
    "road-gaol": {
        "id": "road-gaol", "name": "Holm gaol, at night", "backdrop": "cistern", "party": True,
        "intro": ["The guardroom at the top of the stair. Gaolers with clubs, and two strangers in good boots who were paid more than the gaolers.", "Behind you, Brannoc's cell."],
        "won": "The stair is clear", "lost": "Thrown back down the stair",
        "units": [unit("hg1", "Gaoler", "warden2", "front", [170, 94], cast="warden", level=20, skills=["wstrike"]),
                  unit("hg2", "Gaoler", "warden2", "front", [196, 116], cast="warden", level=20, skills=["wstrike"]),
                  unit("hg3", "Paid knife", "smuggler", "front", [162, 132], cast="warden", level=21, skills=["wstrike"]),
                  unit("hg4", "Paid knife", "smuggler", "back", [230, 100], cast="archer", level=21, skills=["bow"])]},
}

def duel(name, backdrop, intro, foe, words, won, lost, must=True):
    return {"name": name, "backdrop": backdrop, "mustWin": must, "intro": intro, "foe": foe, "words": words, "won": won, "lost": lost}
def foe(name, look, cast, level, moves, feint, hit, hurt, yld, down):
    return {"name": name, "look": look, "cast": cast, "level": level, "moves": dict(zip(("high", "low", "thrust"), moves)), "feint": feint,
            "lines": {"hit": hit, "hurt": hurt, "yield": yld, "down": down}}
def word(id, label, attr, vs, amount, line, land, miss):
    return {"id": id, "label": label, "attr": attr, "vs": vs, "effect": "resolve", "amount": amount, "line": line, "land": land, "miss": miss}

DUELS = {
    "road-ottilie": duel("Ottilie", "yard",
        ["Corvane's square, by the scales fountain. The clerks have come to the counting house windows. Ottilie, sword and buckler, perfectly still. To the first yield."],
        foe("Ottilie", "ottilie", "ottilie", 22, (3, 2, 4), 0.3,
            ["Her buckler takes you in the face. Neat. Correct. Painful.", "Her point stops a finger from your throat, and withdraws, politely."], ["She steps back, and nods: a fair touch.", "\"Good.\""],
            "Ottilie lowers her sword and steps back. \"Yielded.\"", "Ottilie's sword rings on the cobbles."),
        [word("oath", R("You said the council's lying."), "presence", "nerve", 25, R("You said it yourself. The council's lying, and you're fighting for it anyway."), "Her guard hangs for a heartbeat.", "\"I said I'd obey. I didn't say I'd like it.\""),
         word("form", "Break her rhythm", "wits", "finesse", 30, "She fights by the book. You stop fighting by any book at all.", "She waits for a stroke that never comes, and you're inside her guard.", "She's read that book too.")],
        "Ottilie yields", "Ottilie wins the yield"),
    "road-gerd": duel("Gerd", "snow",
        ["The ring at Kestrel Fort, trampled snow inside a fence of lances, with the whole clan on the other side of it. Gerd, with a cracked rib and a war axe, and a bandage bleeding through."],
        foe("Gerd", "gerd", "gerd", 20, (4, 2, 2), 0.2,
            ["The axe haft takes you across the ribs. The clan roars.", "He's slow. He's still faster than you'd like."], ["He grunts and holds his side.", "\"Again.\""],
            "Gerd lowers his axe and goes down on one knee.", "Gerd falls in the snow and doesn't get up."),
        [word("rib", "Work his left side", "wits", "grit", 30, "You stop going for his head and go for the side he's guarding.", "He bends round the rib, and his guard drops.", "He knows his own weakness better than you do."),
         word("son", R("You don't have to do this for him."), "heart", "presence", 25, R("You don't have to bleed for him. Not like this."), "For a breath his axe hangs. He looks at the stable door.", "\"I'm his father. That's what fathers do.\"")],
        "Gerd yields", "Gerd wins the ring"),
    "road-kit": duel("Kit", "meadow",
        ["The target range at Hollin's fair, roped off, with half the fair leaning on the rope. Kit, with a bandolier of knives and a grin. Blunted blades, first to yield."],
        foe("Kit", "kit", "kit", 16, (2, 2, 4), 0.35,
            ["A blunted knife takes you on the shoulder. The crowd cheers.", "She's behind you before you've turned."], ["She skips back, laughing.", "\"Ow. Fair.\""],
            "Kit tosses her last knife into the straw, point first, and bows to you.", "You catch her wrist and she sits down in the grass."),
        [word("crowd", R("They're watching you lose."), "presence", "nerve", 25, R("Listen to them. They came to watch you win."), "Her grin slips. Just for a throw.", "\"They came to watch me. Win or lose. That's the trick.\""),
         word("tell", "Watch her feet", "wits", "finesse", 30, "You stop watching the knives and watch her feet.", "Her next throw comes exactly where her feet said it would.", "She has no tell. Or she has a dozen.")],
        "Kit yields", "Kit wins the round", must=False),
}

# ================================================================== voices and music
voiced = ["roadStart", "speaker", "gilCaught", "haldaneGate", "hearing", "perrineSquare", "theVote", "gully", "brigWon", "harbourPrice", "corranCell", "arvoStable", "gerdBeaten", "kingsDinner", "trial4", "ledgers", "settling", "lastContract"]
moods = {
    "scenes": {"roadStart": "camp", "fairArrive": "hope", "kit": "hope", "kitBeaten": "hope", "speaker": "tension", "ansel": "camp",
               "reedHide": "night", "gilCaught": "tender", "orla": "dread", "cellar": "night", "cellarWon": "hope", "bryn": "camp", "barge": "tension",
               "bargeWon": "hope", "haldaneGate": "night", "archiveGuards": "tension", "provostPress": "dread", "hearing": "tension",
               "perrineSquare": "tender", "theVote": "tension", "whereNextWest": "camp"},
    "stages": {"ah5": "night"},
}

for k in S:
    moods["scenes"].setdefault(k, "camp")

story = {"id": "road", "title": "The Long Road", "voiced": voiced, "moods": moods, "cast": cast, "objectives": objectives,
         "actors": actors, "steps": steps, "zones": zones, "looks": looks, "songs": songs, "hazards": [], "scripts": S}

if __name__ == "__main__":
    with open(OUT, "w") as f:
        json.dump(story, f, indent=1, ensure_ascii=False); f.write("\n")
    for id, b in BATTLES.items():
        with open(os.path.join(ROOT, "data/battle", id + ".json"), "w") as f:
            json.dump(b, f, indent=1); f.write("\n")
    dp = os.path.join(ROOT, "data/battle/duels.json")
    d = json.load(open(dp))
    d["duels"].update(DUELS)
    with open(dp, "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False); f.write("\n")
    print(len(S), "scripts,", len(actors), "actors,", len(BATTLES), "battles,", len(DUELS), "duels")
