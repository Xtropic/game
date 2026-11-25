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

cast = {"gateward": "Hollin's gate-ward", "speaker": "The Speaker of the square", "ansel": "Ansel", "orla": "Orla", "davy": "Davy",
        "netmaker": "Bryn", "provost": "Provost Amory", "weaver": "Hanne", "kit": "Kit", "gil": "Gil", "perrine": "Perrine",
        "bargeman": "Guild bargemaster", "linnet": "Linnet",
        "saul": "Mother Saul", "clerk": "Harbour clerk", "pike": "Old Pike", "meg": "Sister Meg", "annet": "Annet", "gully": "Gully Sorne",
        "fairweather": "Fairweather", "posy": "Posy", "dorrit": "Dorrit", "oren": "Oren Tull"}

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
    "ai1": "Autumn, while Rhea is away.",
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
]

def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s

# where each place lets out onto its land map, and back
PLACES = {("west", "hollin"): (FAIR, (13, 12)), ("west", "college"): (COL, (13, 14)), ("west", "peatmoor"): (PEAT, (8, 12)),
          ("west", "reedhythe"): (REED, (12, 12)), ("coast", "ashby"): (ASH, (15, 16))}
LANDS = {l: {p["id"]: (p["x"], p["y"]) for p in json.load(open(os.path.join(ROOT, f"data/maps/land-{l}.json")))["places"]} for l in {k[0] for k in PLACES}}
LAND = LANDS["west"]
steps = []
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
]
zones = [
    {"map": FAIR, "area": [11, 9, 16, 11], "when": {"stage": "ah1"}, "do": [run("fairArrive")]},
    {"map": QUAY, "area": [17, 2, 24, 4], "when": {"flag": "quayAsked", "not": "ward.fishers"}, "do": [run("barge")]},
    {"map": PEAT, "area": [16, 5, 18, 7], "when": {"flag": "fensAsked", "not": "ward.fens"}, "do": [run("reedHide")]},
    {"map": ARC, "area": [1, 7, 28, 8], "when": {"stage": "ah5", "not": "archiveFought"}, "do": [run("archiveGuards")]},
    {"map": ASH, "area": [12, 13, 19, 16], "when": {"stage": "ah9"}, "do": [run("ashbyArrive")]},
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
}

def duel(name, backdrop, intro, foe, words, won, lost, must=True):
    return {"name": name, "backdrop": backdrop, "mustWin": must, "intro": intro, "foe": foe, "words": words, "won": won, "lost": lost}
def foe(name, look, cast, level, moves, feint, hit, hurt, yld, down):
    return {"name": name, "look": look, "cast": cast, "level": level, "moves": dict(zip(("high", "low", "thrust"), moves)), "feint": feint,
            "lines": {"hit": hit, "hurt": hurt, "yield": yld, "down": down}}
def word(id, label, attr, vs, amount, line, land, miss):
    return {"id": id, "label": label, "attr": attr, "vs": vs, "effect": "resolve", "amount": amount, "line": line, "land": land, "miss": miss}

DUELS = {
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
voiced = ["roadStart", "speaker", "gilCaught", "haldaneGate", "hearing", "perrineSquare", "theVote", "gully", "brigWon", "harbourPrice", "corranCell"]
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
