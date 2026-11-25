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

cast = {"gateward": "Hollin's gate-ward", "speaker": "The Speaker of the square", "ansel": "Ansel", "orla": "Orla", "davy": "Davy",
        "netmaker": "Bryn", "provost": "Provost Amory", "weaver": "Hanne", "kit": "Kit", "gil": "Gil", "perrine": "Perrine",
        "bargeman": "Guild bargemaster", "linnet": "Linnet"}

objectives = {
    "ah0": "The council in Thornwick chapel.",
    "ah1": "Take the west road out of the vale, to the Free Towns. Hollin is the big town on the river.",
    "ah2": "Hollin's gate is shut for the fair. Find someone at the fair who'll vouch for a stranger.",
    "ah3": "Go up to the speaking stone in the square.",
    "ah4": "Win over Hollin's wards before the vote: the fen farmers at Peatmoor, the tanners, and the fishers on the quay.",
    "ah5": "Haldane is waiting at the College gate. Go to the College tonight.",
    "ah6": "The College hall. The hearing sits at noon.",
    "ah7": "The square. The vote is at sunset.",
    "ah8": "Finch went down the coast road to Port Ashby. Follow him south.",
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
]

def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s

# where each West place lets out onto the land map, and back
PLACES = {"hollin": (FAIR, (13, 12)), "college": (COL, (13, 14)), "peatmoor": (PEAT, (8, 12))}
LAND = {p["id"]: (p["x"], p["y"]) for p in json.load(open(os.path.join(ROOT, "data/maps/land-west.json")))["places"]}
steps = []
for pid, (mid, (sx, sy)) in PLACES.items():
    lx, ly = LAND[pid]
    steps.append(step(WEST, (lx, ly), [goto(mid, sx, sy, "up")], {"stagePrefix": "a"}))
    rows = json.load(open(os.path.join(ROOT, f"data/maps/{mid}.json")))["rows"]
    for x, ch in enumerate(rows[-1]):
        if ch == "e": steps.append(step(mid, (x, len(rows) - 1), [goto(WEST, lx, ly + 1, "down")]))
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
]
zones = [
    {"map": FAIR, "area": [11, 9, 16, 11], "when": {"stage": "ah1"}, "do": [run("fairArrive")]},
    {"map": QUAY, "area": [17, 2, 24, 4], "when": {"flag": "quayAsked", "not": "ward.fishers"}, "do": [run("barge")]},
    {"map": PEAT, "area": [16, 5, 18, 7], "when": {"flag": "fensAsked", "not": "ward.fens"}, "do": [run("reedHide")]},
    {"map": ARC, "area": [1, 7, 28, 8], "when": {"stage": "ah5", "not": "archiveFought"}, "do": [run("archiveGuards")]},
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
voiced = ["roadStart", "speaker", "gilCaught", "haldaneGate", "hearing", "perrineSquare", "theVote"]
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
