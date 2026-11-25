#!/usr/bin/env python3
"""Builds data/story/side.json: the side storylines that sit beside the main story.

Mathew (2026-11-25, "start building these out"): the five hidden nations get their whole storyline, not just a
recruit; then the breeder's road with Hesk and Pim, and the novelty side quests. The briefs are the doc "The Lull:
Nation and Side Storylines" (https://claude.ai/artifact/3Fu73axJxMtMdAZXpZpyrd).

Each hidden nation's first scene (and its recruits) is in tools/story/recruits.py; this file carries every storyline
on from the flags those scenes set: a hard choice, a fight or an ordeal, a lasting outcome and a high point.

Run: python3 tools/story/side.py   (after recruits.py, whose actors it stands clear of)"""
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from act2 import say, n, stage, run, fade, goto, setf, add, toast, iff, opt, choose, R  # noqa: E402,F401
import recruits as rc  # noqa: E402  (its actors are placed first, so ours stand clear of them)

ROOT = rc.ROOT
OUT = os.path.join(ROOT, "data/story/side.json")
span, when, unit = rc.span, rc.when, rc.unit

S, actors = {}, []
cast = {
    "amaru": "Amaru of Highspire", "abbess": "Abbess Ondine", "dying": "A man in the raw", "admiral": "Admiral Brisk",
    "panner": "A salt panner", "saltchild": "A Salt House child", "herdrider": "A Herd rider", "trapper": "Guild trapper",
}
for k in ("isel", "dellan", "agathe", "cass", "brannoc", "harl", "kel", "ysolde", "jessamy", "tavi", "senne", "rhea", "corran", "posy", "hesk", "pim", "kane", "varro"):
    cast[k] = rc.cast.get(k, k.capitalize())
cast.update({"rhea": "Rhea", "corran": "Corran", "brannoc": "Brannoc", "hesk": "Hesk Marrow", "kane": "Kane", "varro": "Varro", "posy": "Posy"})


def actor(id, mid, x, y, look, script, w):
    x, y = rc.spot(mid, x, y)
    actors.append({"id": "side-" + id, "map": mid, "x": x, "y": y, "look": look, "when": w, "talk": [run(script)]})


def pay(coin, then=(), els=()):
    return {"pay": coin, "then": list(then), "else": list(els)}


def kith(species, level, id, name, temperament=None):
    g = {"species": species, "level": level, "id": id, "name": name}
    if temperament: g["temperament"] = temperament
    return {"kith": g}


HIGH, GAL, OSK, SALT, FOLD, TW = "town-highspire", "town-candle-galleries", "town-cinder-landing", "town-salt-house", "town-summer-fold", "thornwick"
ROAD_ON = span("ah0")            # the year of the Road and after
LATE_ROAD = span("ah23")         # after the Lorne leg

# ================================================================== the Spire Folk of Vael: The Song That Went Down
# recruits.py: Isel opens the ridge, the elders ask after Dellan, Rhea finds Dellan and tells her (or doesn't).
S["dellanHome"] = [
    iff({"not": "vaelHome"}, [
        n("Dellan is at the pens, as she is every evening, with her daughter on the rail beside her. When she sees Rhea she puts the bucket down."),
        say("dellan", R("I've been working up to it all month. I'd like to go up the ridge. I'd like you to come. I don't think I can walk into that village on my own and say who I am.")),
        fade("The spire ridge. Cloud all the way, and Isel's mistwing going ahead like a lamp."),
        goto(HIGH, 12, 12, "up"),
        n("The whole of Highspire is on the white stones by the fire, waiting. Nobody sent word. They knew anyway; Isel's bird came back alone a day early."),
        n("An old woman gets up from the end of the bench. She's tiny. She has three dots under one eye, faded nearly to nothing."),
        say("amaru", R("Dellan.")),
        n("Dellan doesn't move. Then her daughter, who is six and has never been anywhere, walks straight across the white stones to the old woman and takes hold of her coat, the way she takes hold of anyone she's decided about."),
        n("The old woman begins to sing the foal song, very quietly. At the third line, the line nobody below the cloud sings right, Dellan sings it with her."),
        say("amaru", R("Twenty-three years I've sung that line to the cloud, so you'd hear it. You heard it.")),
        n("They sit by the fire until it's dark. Nobody asks Rhea to leave, so she doesn't."),
        n("In the morning Dellan finds her at the edge of the ridge."),
        say("dellan", R("My mother wants us to stay. My husband would. Bel would; she's already got a bird. And Thornwick's breeding pens are half mine now. Pim's lines, Hesk's lines. They'd fall apart in a season without someone on them.")),
        say("dellan", R("You're my captain. Tell me which, and I'll do it, and I won't have to have chosen.")),
        choose("Dellan is waiting. Behind her, on the white stones, her mother is plaiting Bel's hair.",
               opt(R("Stay. Thornwick will manage. You've been gone twenty-three years."), [
                   setf({"vaelHome": "stayed", "recruited.dellan": False}), add({"spireTrust": 20}),
                   say("dellan", R("Thank you. I'll send you foals. The best I ever breed, every spring, down the ridge.")),
                   n("Rhea walks back down the ridge alone, with Isel's bird. The pens at Thornwick feel very big for a while."),
                   toast("Dellan stays at Highspire with her mother. The Spire Folk will not forget it."),
               ], by="rhea", hint="She leaves Thornwick."),
               opt(R("Come back with me. Bring them up here every summer. Thornwick needs you."), [
                   setf({"vaelHome": "summers"}), add({"spireTrust": 5}),
                   say("dellan", R("Every summer. You'll hold me to it.")),
                   n("Her mother doesn't argue. She ties a white feather into Bel's plait, and one into Dellan's, and goes back to her fire."),
               ], by="rhea", hint="She stays on at the pens.")),
        goto(TW, 13, 12, "up"),
    ], [say("dellan", R("Bel's bird sleeps on her bed. Don't tell Oda."))]),
]
actor("dellan-pens", TW, 24, 6, "dellan", "side.dellanHome", when(span("ad8", "ah42"), **{"eq": {"dellanDone": "truth"}, "not": "vaelHome"}))

S["vaelTrappers"] = [
    iff({"not": "spireSongs"}, [
        n("Highspire is too quiet. The children have been sent into the high spires, and the women are on the bridges with bows that look older than the village."),
        say("isel", R("Trappers. The Guild's. They've come every spring for the mistwing eggs since before I was born. This year there are more of them, and they've brought nets for the grown birds. Somebody's paying for war mounts.")),
        iff({"flag": "dellanDone"}, [say("isel", R("They're the same trappers' guild that took her. Different men. Same ropes."))]),
        n("Ropes are coming up the lowest spire. Rhea can hear the men on them, swearing at the cold."),
        {"battle": "side-vael-trappers", "win": [
            n("The trappers go back down their ropes faster than they came up, and the women on the bridges cut the ropes behind them."),
            n("That night the elders call Rhea to the white-stone fire, and there are no questions this time. Amaru sits beside her."),
            say("amaru", R("Below the cloud you sing the foal song to soothe. That's the half of it you kept. There are verses for calling a frightened animal back to itself, and for a hurt one, so it lets you near. We'll teach you. It takes the night.")),
            fade("It takes the night. By the end Rhea's voice is gone and she knows eleven verses she has never heard, that her mother would have known."),
            setf({"spireSongs": True}),
            toast("The Spire verses: Rhea's foal song now calms wild kith faster and steadies her own kith more."),
        ]},
    ], [say("isel", R("The elders say you sing the eighth verse like a lowlander. They say it fondly. Mostly."))]),
]
actor("isel-bridge", HIGH, 9, 9, "isel", "side.vaelTrappers", when(ROAD_ON, flag="vaelAsked", **{"not": "spireSongs"}))

# ================================================================== the Low Water Sisters: The Cold Weaning
# recruits.py: Cass takes Rhea down to the galleries; Agathe takes Thornwick's greenlings (or doesn't);
# Rhea keeps the galleries' secret or tells Varro (then the galleries are bricked up).
S["abbess"] = [
    iff({"not": "lowWater"}, [
        n("The Abbess's chair stands at the end of the long gallery, where the water runs fastest under the floor. Abbess Ondine is very old and very straight, and her hands are chapped from forty years of cold cloths."),
        iff({"flag": "agatheBroke"}, [
            say("abbess", R("You took my best Sister from me, greenling woman. With a parcel of moss.")),
        ], [say("abbess", R("You're the greenling woman. Agathe told me what you offered her, and that she refused it. I'm proud of her. She's never forgiven me for it.")),]),
        say("abbess", R("You think we chain them for cruelty. We chain them because the raw makes a man tear his own throat out to stop the itching. We pour the water because the fever kills faster than the raw does. We pray because there's nothing else left to do at the fourth night, and the praying is for us, not for them.")),
        say("abbess", R("One in five dies. Every one of them was turned away from every other door in Ostrel first. Your greenlings are for the ones you can save. We're for everyone else.")),
        say("rhea", R("A greenling would save most of your one in five.")),
        say("abbess", R("And the order that comes after it would not be the Low Water. It would be a hospital with your name on the door. I'm too old to watch that happen. I'm not too old to understand why you want it.")),
        choose("The Abbess folds her chapped hands. Behind her a man on a pallet begins to shake.",
               opt(R("I'll leave a greenling parcel at the gallery mouth every month. Any Sister who wants it can take it. I won't ask you."), [
                   setf({"lowWater": "greenlings"}), add({"thornTrust": 5}),
                   n("The Abbess looks at her for a long time."),
                   say("abbess", R("Half of them will take it. The young ones. And the Low Water will split down the middle, and I'll be the abbess of the other half, in the cold, with the old women.")),
                   say("abbess", R("Leave it, then. God forgive us both. Fewer will die. I can't argue with that, and I can't stand it.")),
                   n("The first month, four Sisters take a parcel. The second, eleven. By the winter the long gallery is half greenling and half cold water, with a curtain between, and the dying fall from one in five to one in thirty on the greenling side."),
                   n("On the other side of the curtain the old women go on as they always have. The Abbess sits with every one of their dead."),
               ], by="rhea", hint="The order splits. Fewer die."),
               opt(R("This is your house. I won't bring greenlings into it."), [
                   setf({"lowWater": "respected"}),
                   say("abbess", R("Thank you. You'll think of the one in five, nights. So do I. I'd rather you thought of them than took them from me.")),
                   n("The Low Water goes on as it always has: the cold, the chains, the singing. And because the Commons let it be, the Sisters take in the Commons' own lost, the ones Thornwick's greenlings didn't take on, without a word."),
               ], by="rhea", hint="Their way, and their dead.")),
    ], [iff({"eq": {"lowWater": "greenlings"}}, [say("abbess", R("Your parcel came. Nine Sisters took from it. I counted. I always count."))],
            [say("abbess", R("Four this month. Ninety-one since the spring. Pray for them, if you do."))])]),
]
actor("abbess-chair", GAL, 16, 4, "elder2", "side.abbess", when(span("ad5"), flag="galleriesDone", **{"not": "lowWater", "eq": {"cassDone": "kept"}}))

S["brannocNight"] = [
    iff({"not": "brannocNight"}, [
        n("A Sister comes for Rhea at the gallery mouth. Not for her: for the big man with her."),
        n("There's a drover on the last pallet, forty years old, nine rings, on the fifth night of the raw. The fifth night is the one that kills. He's asked for a soldier. He was a soldier once. He wants one at the end."),
        n("Brannoc goes in. Rhea follows as far as the curtain and stops."),
        n("Brannoc sits down on the stone by the pallet without being asked, the way he sits by a camp fire, slowly, because his back is bad."),
        say("dying", R("They said you were here. In the cold. Years ago.")),
        say("brannoc", R("Eleven months on a lull. Six days in here. I was on that pallet, near enough. A Sister sat with me. I don't know her name. I never asked her. I've thought about that a lot.")),
        say("dying", R("Does it stop?")),
        say("brannoc", R("The itch stops. The rest doesn't, quite. You get used to carrying it. It gets lighter the way a pack does, when you stop noticing your shoulders.")),
        n("He takes the man's hand. The man is shaking so hard the pallet knocks against the stone. Brannoc holds on."),
        fade("He holds on all night. Rhea hears him through the curtain, now and then, talking about nothing: a kith he had as a boy, the best stew he ever ate, Sallow, the colour of the sky over the Cloudline in the morning."),
        n("Near dawn the shaking stops. The Sister comes to the curtain with her eyes down, to tell them."),
        n("But the man on the pallet is asleep. Breathing. The fever has broken. He's one of the four in five."),
        say("brannoc", R("I'll sit a bit longer. In case he wakes and doesn't know where he is.")),
        n("When he comes out at last, in the full morning, he walks past Rhea to the water's edge and stands there a long time with his back to her. She lets him."),
        setf({"brannocNight": True}), add({"have.bandage": 2}),
        toast("Brannoc sat the night through in the Low Water galleries."),
    ], [say("brannoc", R("He sent word. He's driving again. Loftbucks, the Kerrow road. I'd like to see that."))]),
]
actor("sister-curtain", GAL, 8, 6, "cass", "side.brannocNight", when(span("ad5"), flag="lowWater", **{"not": ["brannocNight", "brannocHanged"]}))

# ================================================================== the Exiles of Osk: The Ringed Island
# recruits.py: the ash flow; Harl and (maybe) Kel join. Here: Lorne's navy finds the island.
S["oskSails"] = [
    iff({"not": "oskFate"}, [
        n("A frigate in Osk's bay, under Lorne's ensign, with her guns run out. Her boats are on the beach. Marines in blue are walking up the ash-swept steps with a list."),
        say("harl", R("They found us. A Lorne whaler saw our fires in the winter and told the Admiralty. Lorne hangs ringed men, captain, you know that. Every one of us on that list ran from Lorne once, or from somewhere Lorne has a treaty with.")),
        iff({"flag": "road.lorne"}, [
            say("harl", R("You've been to Holm. You've stood in front of the King of Lorne. If there's anyone they'd listen to.")),
        ]),
        n("The marines have stopped on the harbour steps. Their officer, a heavy grey man in an admiral's coat, is looking at the town as if it smells."),
        choose("The admiral is waiting for the mayor of Osk. Harl is looking at Rhea.",
               opt("Walk the admiral through Osk", [
                   say("rhea", R("Admiral. Before you read your list, walk round the town with me. One hour. Then do what you like.")),
                   say("admiral", R("Brisk. Admiral of the North Squadron. I don't take walks with rebels, madam. ...One hour.")),
                   fade("One hour. The ash-swept steps, the smoke-house, the school."),
                   n("The school is the worst of it for him. Fifteen children reciting their tables, and a teacher with the whole of her neck white with rings, and a lull scar on the back of each hand where she used to set them."),
                   n("Then the harbour, where Osk's fishermen are hauling nets, collars down, rings in the sun. A man with eleven rings mending a sail. A woman with twenty carrying her baby."),
                   say("admiral", R("They told me Osk was a nest. Pirates. Men too far gone on the lull to work. That's what the Admiralty's papers say.")),
                   say("admiral", R("My brother wore lulls. After the Sound. Four years. The Admiralty hanged him for it, on the Holm quay, under the Pain Acts, and I stood in my dress coat and watched.")),
                   n("He folds the list and puts it in his coat."),
                   say("admiral", R("Osk is on my charts now, captain. I can't take it off them. But I can write what I saw beside it, and I will. If the King reads it, there may be a day when this place doesn't need hiding.")),
                   setf({"oskFate": "shown"}), add({"lorneTrust": 10}),
                   toast("Osk is on Lorne's charts, and so is the truth about it."),
               ], hint="Show him. Osk can't hide any more."),
               opt("Hide the island: fight them on the beach", [
                   say("rhea", R("Harl, get your people up the mountain. Kel, the boats. We'll hold the steps.")),
                   {"battle": "side-osk-marines", "win": [
                       n("The marines go back to their boats under the smoke, and the boats go back to the frigate, and the frigate stands out to sea."),
                       n("That night Kel rows out alone with a lantern and a pot of tar to the reef the frigate came in by, and moves the leading marks. A Lorne pilot will need six tries to find the way in again. The next whaler who comes will need nine."),
                       say("harl", R("They'll come back. Not this year. Maybe not in my life. Thank you, captain. Lorne won't love you for it.")),
                       setf({"oskFate": "hidden"}), add({"lorneTrust": -10}),
                       toast("Osk is hidden again. Lorne lost a landing party, and won't forget whose it was."),
                   ]},
               ], hint="A fight. Osk stays secret, and Lorne will know you did it.")),
    ], [iff({"eq": {"oskFate": "shown"}}, [say("harl", R("A Lorne schooner came last month. Salt beef and a letter from the admiral. No list."))],
            [say("harl", R("No sails this month. Kel goes up the mountain every morning to look."))])]),
]
actor("harl-harbour", OSK, 12, 10, "harl", "side.oskSails", when(LATE_ROAD, flag="oskDone", **{"not": "oskFate"}))

# Corran, in his midsummer at Thornwick, hears of Osk (run from road.py's corranSummerRoad).
S["corranOsk"] = [
    iff({"eq": {"corranFate": "thornwick"}}, [
        n("A pamphlet comes up the road in the post sack, from Ashby, a penny a copy: A TRUE ACCOUNT OF THE ISLAND OF OSK, WHERE THE RINGED LIVE OPEN. Dorrit leaves it on the bathhouse bench, by accident, or not."),
        n("He reads it in the warm pool, holding it above the water. A town where everyone's neck is like his. Where a man with eleven rings mends sails in the sun and nobody crosses the street."),
        n("He reads it four times. Then he tears out the page with the map on it, and folds it very small, and keeps it in his shirt, where the tin used to be."),
    ], [
        n("A pamphlet goes round the sick rooms and the cells that summer, from hand to hand, a penny a copy: A TRUE ACCOUNT OF THE ISLAND OF OSK, WHERE THE RINGED LIVE OPEN."),
        n("Corran reads it by the light under the door. He doesn't keep it. He passes it on, to the next ringed man, the way it came."),
    ]),
]

# ================================================================== the Salt House: The Struck-out Name
# recruits.py: Ysolde and Jessamy; the wild brine herd; the records published or kept.
S["saltBurners"] = [
    iff({"not": "saltBurn"}, [
        n("A salt panner comes running along the dyke, white to the knees, waving her rake."),
        say("panner", R("Riders. On the causeway. Guild coats, and torches in daylight. They're going for the record house.")),
        iff({"eq": {"saltRecords": "published"}}, [
            say("panner", R("Since the pages came out in Ashby, every Guild man in the south knows where the Salt House is. Ysolde said they'd come. She said it like she was looking forward to it.")),
        ], [say("panner", R("Somebody talked. Somebody always talks, in the end, for a Guild purse.")),]),
        {"battle": "side-salt-burners", "win": [
            n("The torches go into the brine pans and go out with a hiss. The riders go back down the causeway with nothing burned but their own sleeves."),
            iff({"eq": {"saltRecords": "published"}}, [
                n("The Ashby pages go round the country all that winter. The Pain Acts, word for word, set beside the Guild's own draft of them in the Salt House ledger, in the Guild's own clerk's hand. Two hundred years old. The same commas."),
                n("In the spring the Crown's court reads them aloud. Nobody in Kingsmere can say, after that, that the Pain Acts were the Crown's idea."),
                n("And nobody in Ostrel will ever say the Salt House's name again without saying Guild in the same breath. The panners' salt sells for half in every market south of Corvane. Ysolde says it's cheap at the price."),
                setf({"saltBurn": "repeal"}),
                toast("The Salt House records are read in the Crown's court. The Pain Acts are finished. The Salt House pays for it."),
            ], [
                n("Ysolde's ledgers are safe at Thornwick, shut, in oilcloth, in the dry room under the chapel. The Salt House is still the Salt House: a name nobody remembers, and salt that sells."),
                n("When the time comes to use them, if it comes, they'll be there."),
                setf({"saltBurn": "kept"}),
            ]),
        ]},
    ], [run("side.saltStory")]),
]
S["saltStory"] = [
    iff({"not": "saltStory"}, [
        n("The Salt House children have been waiting by the pans all morning, in a row, because the panner told them the captain would come."),
        say("saltchild", R("Tell us about the war. Like a story. With the start, and the bad part, and the end.")),
        say("saltchild", R("We've never seen a lull. Not ever. Ma says that's the best thing about the salt. Nobody wants to come here.")),
        n("Eight children who have never seen a lull, on an upturned salt barrow, waiting."),
        choose("How does Rhea tell it?",
               opt("As it was", [
                   n("She tells it as it was: the brood that went wrong, the night on the cloud path, the carts, the year in the camp. She leaves out the worst. Not much else."),
                   n("When she's finished nobody says anything. Then the smallest one asks if Finch got home. Rhea says she doesn't know yet. It's the truest thing she's said in a month."),
                   setf({"saltStory": "true"}), add({"hold": 4}),
               ], hint="Leave out only the worst."),
               opt("With a happy end", [
                   n("She tells it the way Teodric would, with the Commons winning in the spring and everyone home for harvest. The children cheer the end."),
                   n("Walking back along the dyke she finds she wants it to be true so badly that she has to stop for a moment, out of sight of the pans."),
                   setf({"saltStory": "happy"}), add({"hold": 2}),
               ], hint="For them, not for her."),
               opt("Let Posy tell it", [
                   n("Posy tells it. She tells it from the brood room: the trays, the drain, the girl who walked out first. She tells it in the Houses' voice and then in her own."),
                   n("The Salt House children listen to Posy the way children only listen to other children. Afterwards three of them follow her round the pans all day."),
                   setf({"saltStory": "posy"}), add({"hold": 5}),
               ], when={"flag": "recruited.posy"}, hint="She was there.")),
    ], [say("saltchild", R("Tell it again!"))]),
]
actor("panner-dyke", SALT, 10, 8, "vil3", "side.saltBurners", when(span("ah10"), flag="saltDone", **{"not": "saltStory"}))

# ================================================================== the Wandering Herd: The Last Herd
# recruits.py: Rhea stops her own foragers (Tavi joins, then Senne) or lets them forage.
S["herdPoachers"] = [
    iff({"not": "herdPoach"}, [
        n("A Herd rider comes into the summer fold at a dead gallop, with his ironback lathered to the shoulder."),
        say("herdrider", R("Netters, on the east plateau. Guild ones, with hooks and chains, and a buyer from the Vantry stables. They're after the matriarch's line: the big cows. War mounts.")),
        say("herdrider", R("And your Commons quartermaster is up there too, captain. Not with them. Waiting behind them, to buy whatever they take.")),
        n("A Commons quartermaster, with a purse from Kane's war chest, waiting to buy the Herd's cows from Guild poachers. Heavy cavalry for the spring."),
        {"battle": "side-herd-netters", "win": [
            n("The netters scatter off the plateau, leaving their chains. The quartermaster stays where he is, on his horse, with his purse, very still."),
            say("herdrider", R("Your man's still waiting, captain. There are calves in those nets they didn't get to drag off. He'll pay for them.")),
            choose("Six young ironbacks in the Guild's nets. The quartermaster has his purse out. The Herd's riders are watching Rhea.",
                   opt("Cut them loose. No one buys the Herd.", [
                       say("rhea", R("Cut them loose. All of them. Tell the Marshal I said so, and that the Commons doesn't buy what it was fighting poachers for an hour ago.")),
                       n("The calves go off to the herd at a lopsided gallop. The quartermaster rides back west without a word. In the spring, the Commons will march without the heavy horse Kane was counting on."),
                       setf({"herdPoach": "freed"}), add({"kaneTrust": -5}),
                   ], by="rhea", hint="Kane loses his heavy cavalry."),
                   opt("Let the Commons buy the calves", [
                       n("The quartermaster pays the Herd for the six calves, in good coin, which the Herd's riders throw on the ground and ride away from."),
                       n("In the spring the Commons will have ironback cavalry. The Herd will be forty miles east by morning, and won't come back to the summer fold."),
                       setf({"herdPoach": "bought", "herdCavalry": True}),
                   ], hint="An army has to win.")),
        ]},
    ], [run("side.matriarch")]),
]
S["matriarch"] = [
    iff({"eq": {"herdPoach": "freed"}}, [
        iff({"not": "kith.matriarch"}, [
            n("At dusk Tavi comes for Rhea and takes her out onto the plateau, among the herd, on foot. Nobody walks among the herd on foot."),
            n("The matriarch is grazing on her own, the size of a cottage, with the scars of three hundred winters' fights on her hide. She lifts her head when they come."),
            say("tavi", R("She's old. She knows it. Every matriarch picks the one she'll leave with, at the end, and goes with them, and the herd goes to her eldest daughter. She's never picked anyone not of the Herd. Not in the songs.")),
            n("Rhea sings. The Spire way, if she knows it; her mother's way if she doesn't. The matriarch walks to her across the grass, and stops, and lowers her great head until it's level with Rhea's, and breathes on her."),
            say("tavi", R("Well. That's that, then. Look after her. She'll look after you; she's never lost a fight in her life.")),
            kith("matriarch", 30, "matriarch", "The Matriarch", "steady"),
            toast("The Matriarch, oldest of the Wandering Herd, goes with Rhea."),
        ], [n("The herd grazes into the wind. Without the matriarch it moves a little more carefully, the way a family does.")]),
    ], [iff({"eq": {"herdPoach": "bought"}}, [n("Hurdle pens, empty, and trampled grass going east.")], [n("The summer fold is quiet. The herd is a long way off, grazing into the wind.")])]),
]
actor("rider-fold", FOLD, 11, 6, "tavi", "side.herdPoachers", when(span("ah25"), **{"eq": {"herdDone": "stopped"}, "not": "kith.matriarch"}))

# ================================================================== the corran-side hook, and the battles
BATTLES = {
    "side-vael-trappers": {"name": "The ropes on the lowest spire", "backdrop": "scree", "party": True,
                           "intro": ["Guild trappers coming up the spire ropes with nets and hooks, and a hooded reedcat for finding nests.", "The women on the bridges are holding their fire for you."],
                           "won": "The trappers go back down their ropes", "lost": "The trappers reach the nests",
                           "units": [unit("vt1", "Guild trapper", "cartwarden", 14, (176, 96), cast_="warden"),
                                     unit("vt2", "Guild trapper", "cartwarden", 14, (198, 118), cast_="warden"),
                                     unit("vt3", "Trap master", "warden", 15, (222, 104), cast_="warden"),
                                     unit("vt4", "Nest-sniffer", "reedcat:#6a6a72", 13, (160, 126), skills=("pounce", "maul"), kith_=True, hp=48, species="reedcat")]},
    "side-osk-marines": {"name": "The harbour steps", "backdrop": "road", "party": True,
                         "intro": ["Lorne marines in blue, with cutlasses and a boarding net, coming up Osk's harbour steps.", "Behind you, the town is climbing the mountain."],
                         "won": "The marines go back to their boats", "lost": "The marines take the steps",
                         "units": [unit("om1", "Lorne marine", "warden2", 21, (176, 96), cast_="warden"),
                                   unit("om2", "Lorne marine", "warden2", 21, (198, 118), cast_="warden"),
                                   unit("om3", "Marine sergeant", "warden2", 22, (222, 104), cast_="warden"),
                                   unit("om4", "Marine sharpshooter", "archer", 20, (236, 124), row="back", cast_="archer", skills=("bow",))]},
    "side-salt-burners": {"name": "The record house", "backdrop": "road", "party": True,
                          "intro": ["Guild riders on the salt causeway, with torches in broad daylight.", "Two hundred years of ledgers behind you, and a lot of dry oilcloth."],
                          "won": "The riders go back down the causeway", "lost": "The record house burns",
                          "units": [unit("sb1", "Guild rider", "cartwarden", 17, (176, 96), cast_="warden"),
                                    unit("sb2", "Guild rider", "cartwarden", 17, (198, 118), cast_="warden"),
                                    unit("sb3", "Guild agent", "factor", 18, (230, 110), row="back", cast_="archer", skills=("bow",))]},
    "side-herd-netters": {"name": "The netters on the plateau", "backdrop": "meadow", "party": True,
                          "intro": ["Guild netters with hooks and chains among the herd's calves, and a war hound to hold them.", "The herd is milling. If it stampedes, nobody walks away."],
                          "won": "The netters scatter off the plateau", "lost": "The netters drag the calves away",
                          "units": [unit("hn1", "Guild netter", "smuggler", 20, (176, 96), cast_="warden"),
                                    unit("hn2", "Guild netter", "smuggler", 20, (198, 118), cast_="warden"),
                                    unit("hn3", "Stable buyer's man", "cartwarden", 21, (222, 104), cast_="warden"),
                                    unit("hn4", "War hound", "reedcat:#5a5a62", 20, (160, 126), skills=("pounce", "maul"), kith_=True, hp=70, species="warden-reedcat")]},
}

# ================================================================== the file
moods = {"scenes": {
    "side.dellanHome": "tender", "side.vaelTrappers": "tension", "side.abbess": "sombre", "side.brannocNight": "tender",
    "side.oskSails": "tension", "side.corranOsk": "tender", "side.saltBurners": "tension", "side.saltStory": "tender",
    "side.herdPoachers": "tension", "side.matriarch": "hope",
}, "stages": {}}


def _prefix(o):
    if isinstance(o, dict):
        return {k: ("side." + v if k == "run" and v in S else _prefix(v)) for k, v in o.items()}
    if isinstance(o, list): return [_prefix(v) for v in o]
    return o


S = {"side." + k: _prefix(v) for k, v in S.items()}
story = {"id": "side", "title": "Side stories", "voiced": [], "moods": moods, "cast": cast, "objectives": {},
         "actors": actors, "steps": [], "zones": [], "looks": [], "songs": [], "hazards": [], "scripts": S}

if __name__ == "__main__":
    with open(OUT, "w") as f:
        json.dump(story, f, indent=1, ensure_ascii=False); f.write("\n")
    for id, b in BATTLES.items():
        with open(os.path.join(ROOT, "data/battle", id + ".json"), "w") as f:
            json.dump({"id": id, **b}, f, indent=1); f.write("\n")
    print(len(S), "scripts,", len(actors), "actors,", len(BATTLES), "battles")
