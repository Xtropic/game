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
    "hm-boy": "A Highmoss boy", "mf-herder": "A Mistfold herder", "mf-old": "Gobber's widow", "innkeeper": "The Millbridge postmistress",
    "kr-smith": "The toll keeper", "ds-keeper": "The stargazer", "smuggler": "Gaunt", "wb-child": "A mill child", "gully": "Gully",
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
        say("dellan", R("My mother wants us to stay. My husband would. Bel would; she's already got a bird. And Thornwick's breeding pens are half mine now. Hesk's old, and his lines would fall apart in a season without someone on them.")),
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
                   setf({"lowWater": "greenlings"}),
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
        iff({"eq": {"road.lorne": "won"}}, [
            say("harl", R("You got a ringed man off the rope in a Holm court. Their own court. If there's anyone they'd listen to, it's you.")),
        ], [iff({"eq": {"road.lorne": "lost"}}, [
            say("harl", R("You know what they do. You stood in Holm and watched them do it to your own man.")),
        ], [iff({"eq": {"road.lorne": "breakout"}}, [
            say("harl", R("And Lorne's already at war with you, captain, since Holm. They'd hang you on the same quay as us.")),
        ])])]),
        n("The marines have stopped on the harbour steps. Their officer, a heavy grey man in an admiral's coat, is looking at the town as if it smells."),
        choose("The admiral is waiting for Osk's answer. Harl, who is Osk's mayor, is looking at Rhea.",
               opt("Walk the admiral through Osk", [
                   say("rhea", R("Admiral. Before you read your list, walk round the town with me. One hour. Then do what you like.")),
                   say("admiral", R("Brisk. Admiral of the North Squadron. I don't take walks with rebels, madam. ...One hour.")),
                   fade("One hour. The ash-swept steps, the smoke-house, the school."),
                   n("The school is the worst of it for him. Fifteen children reciting their tables, and a teacher with the whole of her neck white with rings, and a lull scar on the back of each hand where she used to set them."),
                   n("Then the harbour, where Osk's fishermen are hauling nets, collars down, rings in the sun. A man with eleven rings mending a sail. A woman with twenty carrying her baby."),
                   say("admiral", R("They told me Osk was a nest. Pirates. Men too far gone on the lull to work. That's what the Admiralty's papers say.")),
                   say("admiral", R("My brother wore lulls. After the Sound. Four years. The Admiralty hanged him for it, on the Holm quay, under the ring law, and I stood in my dress coat and watched.")),
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
                n("The Ashby pages go round the country all that winter: the Guild's first pairings, two hundred years old, in the Guild's own clerk's hand. Which kith they bred, which ones they let go into the marsh when they wouldn't tame, and what they were trying to make."),
                n("The Houses call it forgery. Nobody south of Corvane believes them. The pages are pinned up in every Commons mess hall, and read aloud in the inns to people who can't read."),
                n("And nobody in Ostrel will ever say the Salt House's name again without saying Guild in the same breath. The panners' salt sells for half in every market. Ysolde says it's cheap at the price."),
                setf({"saltBurn": "published"}),
                toast("The Salt House records are read all over Ostrel. The Salt House pays for it."),
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
                   setf({"saltStory": "true"}),
               ], hint="Leave out only the worst."),
               opt("With a happy end", [
                   n("She tells it the way Teodric would, with the Commons winning in the spring and everyone home for harvest. The children cheer the end."),
                   n("Walking back along the dyke she finds she wants it to be true so badly that she has to stop for a moment, out of sight of the pans."),
                   setf({"saltStory": "happy"}),
               ], hint="For them, not for her."),
               opt("Let Posy tell it", [
                   n("Posy tells it. She tells it from the brood room: the trays, the drain, the girl who walked out first. She tells it in the Houses' voice and then in her own."),
                   n("The Salt House children listen to Posy the way children only listen to other children. Afterwards three of them follow her round the pans all day."),
                   setf({"saltStory": "posy"}),
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
            n("The matriarch is grazing on her own, the size of a cottage, with the scars of forty winters' fights on her hide. She lifts her head when they come."),
            say("tavi", R("She's old. She knows it. Every matriarch picks the one she'll leave with, at the end, and goes with them, and the herd goes to her eldest daughter. She's never picked anyone not of the Herd. Not in the songs.")),
            n("Rhea sings. The Spire way, if she knows it; her mother's way if she doesn't. The matriarch walks to her across the grass, and stops, and lowers her great head until it's level with Rhea's, and breathes on her."),
            say("tavi", R("Well. That's that, then. Look after her. She'll look after you; she's never lost a fight in her life.")),
            kith("matriarch", 30, "matriarch", "The Matriarch", "steady"),
            toast("The Matriarch, oldest of the Wandering Herd, goes with Rhea."),
        ], [n("The herd grazes into the wind. Without the matriarch it moves a little more carefully, the way a family does.")]),
    ], [iff({"eq": {"herdPoach": "bought"}}, [n("Hurdle pens, empty, and trampled grass going east.")], [n("The summer fold is quiet. The herd is a long way off, grazing into the wind.")])]),
]
actor("rider-fold", FOLD, 11, 6, "tavi", "side.herdPoachers", when(span("ah25"), **{"eq": {"herdDone": "stopped"}, "not": "kith.matriarch"}))

# ================================================================== the breeder's road (Hesk Marrow)
# Hesk comes to Thornwick in Act II (act2.py heskComes). Pim's offer and the great drove are recruits.py's "pim".
ACT2_ON = span("ab8")
ACT1_ON = span("a1b")
MILL_ON = span("ad4")

S["heskFoal"] = [
    iff({"not": "br.foal"}, [
        n("A loftbuck doe is down in the straw in the far pen, on her side, breathing hard. Hesk is kneeling at her tail with his sleeves rolled to the shoulder."),
        say("hesk", R("Don't stand there, Caddow. Get your hands washed and get in here. She's turned it wrong, and my hands are too old to turn it back.")),
        n("It takes an hour. Rhea's arms are in to the elbow and Hesk is talking her through it, low and steady, the way he'd talk to the doe: there, round, gently, now pull, now."),
        n("The foal comes out all legs, onto the straw, and lies there. Then it sneezes, and the doe turns round and starts to lick it, and Hesk sits back against the pen wall with his eyes shut."),
        say("hesk", R("That's yours, then. You pulled it. I've seen you with Ash; you've the hands and the voice. You haven't the knowing. I'll teach you, if you want. Starting tonight.")),
        say("hesk", R("A foal that age feeds every three hours, through the night, for a month. The mother can't make enough after a turned birth. Somebody has to get up.")),
        choose("Thornwick's pen boys are watching from the rail. One of them is already yawning.",
               opt("Do the night feeds herself", [
                   fade("A month of nights. Up at midnight, at three, at dawn, with a skin of warm milk and a lamp."),
                   n("By the end of it the foal follows her round the pen like a dog, and Rhea is falling asleep over her supper. Hesk tells her that's how it's meant to go."),
                   setf({"br.nights": "rhea"}),
               ], hint="It'll know her. She'll be tired."),
               opt("Put the pen boys on a rota", [
                   fade("A month of nights. The pen boys take turns, and fight about whose turn it is, and the foal thrives anyway."),
                   n("It's friendly with everyone and nobody's in particular. Hesk shrugs."),
                   setf({"br.nights": "rota"}),
               ], hint="Thornwick shares it.")),
        n("At six weeks, the first lead rope. The foal hates it: rears, bucks, sits down like a dog. Hesk leans on the rail and won't help."),
        say("hesk", R("Not by pulling. Never by pulling. Walk away from it with the rope slack, and let it decide it wants to be where you are.")),
        n("Rhea walks away with the rope slack. The foal stands there, outraged. Then it trots after her, and the rope goes on hanging slack between them, and that's the lesson."),
        n("The first fall is on the steps a week later: legs everywhere, a cut knee, a great deal of noise. The foal gets up on its own before Rhea can reach it. Hesk nods, as if he'd arranged it."),
        say("hesk", R("Name it, then. Breeders don't name them till they've fallen once and got up.")),
        kith("loftbuck", 2, "br-thimble", "Thimble", "gentle"),
        setf({"br.foal": True}),
        toast("Thimble the loftbuck foal joins the company. Hesk will teach Rhea to breed."),
    ], [iff({"flag": "br.strainsAsked"}, [run("rareStrainsBack")], [
        iff({"flag": "br.show"}, [run("rareStrains")], [say("hesk", R("There's a kith fair at Hollin every harvest. Take Thimble when you're that way. Watch the judges. You'll learn more in an hour than I could teach you in a year."))])])]),
]
# Hesk's own spot by the pens (act2/act3 stand him at 22,10 until the Road), so it's placed directly, not via rc.spot.
actors.append({"id": "side-foaling-pen", "map": TW, "x": 22, "y": 10, "look": "hesk", "when": when(ROAD_ON, flag="recruited.hesk"), "talk": [run("side.heskFoal")]})

S["hollinShow"] = [
    iff({"not": "br.show"}, [
        n("The judging ring at the Hollin fair: a rope square on the meadow, three judges in tall hats, and fifteen yearlings walking the rope with their breeders."),
        n("Rhea walks Thimble round. Thimble is clean-legged and quick, and doesn't pull, and keeps looking at the crowd as if it would like to meet all of them. Twelfth of fifteen, by the judges' faces."),
        n("The beast they're all looking at is a Guild stud's yearling, a grey with a coat like poured silver, walked by a man in a Corvane coat with rosettes down his front. It's the most beautiful kith Rhea has ever seen."),
        n("It's also lame. Off fore, at the trot. It's been shod to hide it, and walked only at the walk. Hesk taught her to see that in the first week: watch the head, not the leg."),
        choose("The judges are reaching for the first-prize ribbon.",
               opt("Ask the judges to see the grey trot", [
                   say("rhea", R("I'd like to see the grey trotted out, please. Off fore.")),
                   n("The Corvane man looks at her as if she'd spat. But the head judge nods, and the grey trots, and bobs its head at every second step like a pigeon, and the crowd goes quiet."),
                   n("The grey is sent out of the ring. The ribbon goes to a plain brown filly from the clans. Thimble comes fourth, which Hesk later says is a scandal, and a fair one."),
                   say("rhea", R("He'll breed from it anyway. Won't he.")),
                   say("hesk", R("Of course he will. Lame mares, lame foals, sold to the Wardens by the hundred. Now you've seen how a Guild stud gets so big. Now you know what you're breeding against.")),
                   setf({"br.show": "spoke", "br.rival": True}), pay(-25),
                   toast("Thimble comes fourth at the Hollin fair. 25 coin in prize money."),
               ], hint="He'll make an enemy of the Corvane stud."),
               opt("Say nothing", [
                   n("The grey takes first prize. The Corvane man shakes hands all round the ring. Thimble comes twelfth."),
                   say("hesk", R("You saw it. Good. Most of them didn't. Some day it'll matter that you can see it, and you'll be glad it was only a ribbon the first time.")),
                   setf({"br.show": "quiet"}),
               ], hint="It isn't your ring.")),
    ], [say("hesk", R("Watch the head, not the leg."))]),
]
actor("judging-ring", "hollin-fair", 14, 6, "vil5", "side.hollinShow", when(ROAD_ON, flag="br.foal", **{"not": "br.show"}))

S["rareStrains"] = [
    say("hesk", R("Fourth at Hollin. You'll do. Now listen.")),
    say("hesk", R("Every line at Thornwick comes from the same few dozen kith. In ten years it'll be weak in the same places the Guild's lines are weak. We need blood from where nobody breeds.")),
    say("hesk", R("Three strains. The crested mistwings of the Spire Folk, in Vael. The salt reedcats of the Salt House pans. And a loftbuck that grazes only at night, in the Kerrow gorge. Nobody's ever haltered one. Bring me any of them, and I'll show you what a line is.")),
    setf({"br.strainsAsked": True}),
    toast("Hesk wants rare blood: a spirecrest from Vael, a salt reedcat from the Salt House, the night-grazer of Kerrow."),
]
S["rareStrainsBack"] = [
    iff({"atLeast": {"br.strains": 2}}, [
        iff({"not": "br.strainsDone"}, [
            iff({"flag": "br.salt"}, [say("hesk", R("Two new bloods in my pens, and one of them came out of a salt marsh. My old master would've thrown me out of the stud for less. Good. Good."))],
                [say("hesk", R("Two new bloods in my pens, and neither of them was ever in a stud book. My old master would've thrown me out for less. Good. Good."))]),
            say("hesk", R("Now we wait. Breeding's slow. Give me a season with them, and then come and see what we've made.")),
            setf({"br.strainsDone": True, "wait.br": 6}),
            toast("Hesk is pairing the new bloods. Come back to Thornwick in a while."),
        ], [iff({"not": "wait.br"}, [run("flawedLine")], [say("hesk", R("Not yet, Caddow. You can't hurry a doe. Go and do your war."))])]),
    ], [say("hesk", R("Two of the three, Caddow. The spire, the salt or the night. I'm not getting any younger."))]),
]
S["spirecrestGift"] = [
    iff({"not": "br.spire"}, [
        n("Isel takes Rhea out along the highest bridge, to a ledge where a crested mistwing is sitting on two eggs, with a third chick already out and squawking."),
        say("isel", R("The elders say: the third chick is always too many. The mother can't feed three. Most years it dies.")),
        iff({"flag": "spireSongs"}, [say("isel", R("They say: you sing our verses. Take it down the ridge, and raise it the Spire way."))], [say("isel", R("They say: you came over the ridge for Dellan. Take it, and raise it well."))]),
        kith("spirecrest", 4, "br-spirecrest", "Frost", "proud"),
        setf({"br.spire": True}), add({"br.strains": 1}),
        toast("A spirecrest chick joins the company, for Hesk's pens."),
    ], [n("The crested mistwing on her ledge, with two chicks now.")]),
]
actor("spire-ledge", HIGH, 16, 6, "isel", "side.spirecrestGift", when(ROAD_ON, flag="br.strainsAsked", **{"not": "br.spire", "atLeast": {"spireTrust": 0}}))
S["saltCatGift"] = [
    iff({"not": "br.salt"}, [
        n("A salt reedcat is sitting on the dyke, white as the pans, with four kits behind her in a hole in the bank. She watches Rhea with eyes like brine."),
        n("A panner comes along with her rake and stops."),
        say("panner", R("She's ours, that one. Keeps the rats off the pans. She'd go with you, if you sang. They like singing. But you'd take the smallest kit, not her, if you were decent. The smallest never gets fed.")),
        choose("The salt reedcat's smallest kit is half the size of the others.",
               opt("Take the smallest kit", [
                   n("The kit fits in her hat. It sleeps the whole way back, and then screams the whole of the first night at Thornwick."),
                   kith("salt-reedcat", 3, "br-saltkit", "Pinch", "nervous"), setf({"br.salt": "kit"}), add({"br.strains": 1}),
                   toast("A salt reedcat kit joins the company, for Hesk's pens."),
               ], hint="Decent."),
               opt("Sing to the mother", [
                   n("She comes. Of course she comes. The panner says nothing at all, and the four kits watch from the hole in the bank as their mother walks away down the dyke behind a stranger."),
                   n("Rhea gets as far as the causeway before she turns round and brings her back. The panner nods, and holds out the smallest kit."),
                   kith("salt-reedcat", 3, "br-saltkit", "Pinch", "nervous"), setf({"br.salt": "kit"}), add({"br.strains": 1}),
                   toast("A salt reedcat kit joins the company, for Hesk's pens."),
               ], hint="Stronger blood.")),
    ], [n("The salt reedcat on the dyke, and three kits now.")]),
]
actor("salt-dyke", SALT, 14, 9, "vil3", "side.saltCatGift", when(ROAD_ON, flag="br.strainsAsked", **{"not": "br.salt"}))
S["nightGrazer"] = [
    iff({"not": "br.night"}, [
        n("The Kerrow gorge, after dark, by the old drove road. Something is grazing on the far side of the beck, pale in the starlight, too big for a loftbuck and too quiet for anything else."),
        n("It lifts its head when Rhea crosses the stones. It doesn't run. It watches her the way the cloud watches the terraces."),
        choose("The night-grazer is three steps away, and hasn't moved.",
               opt("Sit down in the grass and wait", [
                   fade("She sits in the wet grass until the stars turn. It goes on grazing. Near dawn it walks over and stands beside her, as if it had been her idea."),
                   n("When she walks back across the beck, it follows. Nobody has ever haltered one, Hesk said. She hasn't. That's why."),
                   kith("night-grazer", 8, "br-nightgrazer", "Hush", "calm"), setf({"br.night": True}), add({"br.strains": 1}),
                   toast("The night-grazer of Kerrow follows Rhea home."),
               ], hint="It's done this before. You haven't."),
               opt("Sing", [
                   n("She sings. It listens to the whole of the first verse, very politely, and then turns and walks into the dark and isn't there."),
                   n("Some kith don't need soothing. She'll come back another night and try something else."),
               ], hint="It always works with Ash.")),
    ], [n("Pale grass, flattened where something slept.")]),
]
actor("gorge-beck", "town-kerrow", 22, 4, "loftbuck", "side.nightGrazer", when(ROAD_ON, flag="br.strainsAsked", **{"not": "br.night"}))

S["flawedLine"] = [
    iff({"not": "br.flawed"}, [
        n("A season's breeding, and the best pairing Thornwick has made: Thimble's line crossed onto the new blood. Two foals. One is perfect. The other stands wrong from the first hour, with its hind legs bowed and too-soft at the hocks."),
        n("Hesk crouches by it a long time, feeling its legs. When he stands up, he's grey."),
        say("hesk", R("Bone sickness. Born with it. It's in the blood, and the blood's from me: I gave you my old Crown line for Thimble's dam.")),
        say("hesk", R("I bred war ironbacks for the Crown, Caddow. Thirty years. The best in Ostrel. When the Crown sold its studs, the Guild bought my lines, and the Wardens rode them. They rode them at Hask. My ironbacks carried the men who hanged the square at Hask, and my line carried this in it, every generation, and spread it to every Guild stable in the south.")),
        say("hesk", R("That's why I walk my kith where the buyers don't go. That's why I've never bred anything since but pullers and milkers. I should have told you before I let you near my lines.")),
        n("The foal is trying to stand. It can't, quite. It keeps trying."),
        say("hesk", R("It'll never work. It'll hurt every winter. Every breeder in Ostrel would put it down tonight, and they'd be right. It's your pen. Your foal.")),
        choose("The foal is trying to stand again.",
               opt("Raise it", [
                   n("She raises it. It walks, after a fashion, by the spring. It can't carry, can't run, can't fight. It hurts in the cold and leans on whoever is nearest."),
                   n("And every kith in the pens, from Ash to the oldest ironback, will let it lean. It's the only kith at Thornwick the others never quarrel over. When the children are frightened at night, they go and sleep in its straw."),
                   kith("loftbuck", 1, "br-patience", "Patience", "gentle"), setf({"br.flawed": "raised", "nofight.br-patience": True}),
                   toast("Patience will never fight. Thornwick's kith are calmer for having her."),
               ], hint="A life that hurts, and that matters."),
               opt("Let Hesk put it down", [
                   n("Hesk does it at dawn, with his own hands, quickly, the way he's done it a hundred times. Then he burns his stud book, the old one with the Crown line in it, in the forge, page by page."),
                   say("hesk", R("No more of my blood in anything. We'll start the Thornwick line clean, from Thimble's sire's side and your new strains. It'll take ten years. Good.")),
                   setf({"br.flawed": "ended"}),
               ], hint="Every breeder would.")),
        setf({"br.lineDone": "flawed"}),
    ], [run("droveAfter")]),
]
S["droveAfter"] = [
    iff({"eq": {"pimDone": "won"}}, [
        iff({"not": "br.motherLine"}, [
            say("hesk", R("You beat Pim over the Kerrow bridge with my old pupil's tricks and your mother's song. Every breeder in the north saw it. The stud book wants a name for the line, for the drove register.")),
            say("hesk", R("Not Thornwick. Not Caddow. The line's from her song as much as from my pens.")),
            n("Rhea writes it in the register herself, in her best hand, under Thimble's name: the Larkfold Mother line."),
            setf({"br.motherLine": True}), kith("foal-song-buck", 6, "br-songbuck", "Larkfold", "gentle"),
            toast("The Larkfold Mother line is registered at the great drove. Its first foal, a songbuck, joins the company."),
        ], [say("hesk", R("The Larkfold Mother line. Three foals this spring. I'll be dead before it's anything, and I've never been so glad of anything in my life."))]),
    ], [iff({"eq": {"pimDone": "sold"}}, [say("hesk", R("Your loftbucks are in every Guild stud in the south now, Caddow. Wardens riding Thornwick foals. I had thirty years of that. I'd not wish it on you."))],
            [say("hesk", R("The great drove comes round the drove road from Drovers' Halt. Take Thimble. Pim Calloway will be there. Watch him; he's the best I ever taught, and the worst."))])]),
]

# ================================================================== novelty quests: short, odd and warm
# ---- The Cheese Run (the prologue is spent, so it runs at Highmoss's harvest)
S["cheeseRun"] = [
    iff({"not": "nov.cheese"}, [
        n("Highmoss's harvest: the cheese run. A wheel of terrace cheese the size of a cartwheel goes off the top terrace, and every child in the village goes after it, down eleven terraces, and whoever lays a hand on it first takes it home."),
        say("hm-boy", R("Grown-ups can race. They never win. You're too big for the gaps.")),
        n("The wheel goes off the top terrace. Twenty children go after it like a flock of starlings."),
        choose("The wheel bounces off the first wall and takes the stair, not the slope.",
               opt("Take the stair after it", [n("Down the stair three at a time. The wheel takes the fourth terrace wall clean, and Rhea doesn't, quite."), run("cheeseLose")], hint="Follow the wheel."),
               opt("Cut across the moss terraces", [
                   n("Across the wet moss, where nobody runs because the clans would kill them. The wheel comes round the end of the ninth terrace and straight at her."),
                   choose("A small girl is two terraces behind, running her heart out.",
                          opt("Catch it", [n("She catches it. It knocks her flat. The whole of Highmoss cheers, and the girl sits down on the terrace and cries."), setf({"nov.cheese": "won"}), pay(-15),
                                           toast("The cheese is Rhea's. Highmoss will be talking about it for years.")], hint="Win."),
                          opt("Let it go past to the girl", [n("Rhea stumbles, very convincingly. The wheel goes past her to the girl, who gets her arms round it and is flattened, and gets up holding it over her head like a crown."),
                                                             n("Her mother sends a slice of it after Rhea that winter, wrapped in moss, with a drawing of a woman falling over."),
                                                             setf({"nov.cheese": "gave"}), add({"have.salve": 1})], hint="Lose, well.")),
               ], hint="The clans will be furious.")),
    ], [say("hm-boy", R("Next year I'll be big enough. You watch."))]),
]
S["cheeseLose"] = [n("A boy of nine gets it, three terraces down. Rhea limps the rest of the way. Highmoss loves her for it anyway."), setf({"nov.cheese": "lost"})]
actor("cheese-top", "town-highmoss", 6, 3, "hm-boy", "side.cheeseRun", when(ACT1_ON, **{"not": "nov.cheese"}))

# ---- The Loftbuck That Swears
S["swearBuck"] = [
    iff({"not": "nov.swearMet"}, [
        n("A loftbuck is standing in the middle of the lane with all four feet planted, and a cart behind it, and a clanswoman in front of it, pulling. It won't move. It hasn't moved since morning."),
        say("mf-herder", R("Old Gobber's buck. Gobber died at midsummer. The buck only ever went for Gobber's words, and Gobber had a mouth on him like a midden. His widow knows them. She won't say them. She's chapel.")),
        setf({"nov.swearMet": True}),
    ], [iff({"flag": "nov.swearWords"}, [
        iff({"not": "nov.swear"}, [
            n("Rhea leans close to the loftbuck's ear and says, very quietly, the eleven words old Gobber's widow taught her."),
            n("The loftbuck's ears go up. It sighs, the way a person sighs when someone finally says the right thing, and walks off down the lane with the cart as if it had always meant to."),
            say("mf-herder", R("What did you SAY to it?")),
            say("rhea", R("I'm chapel. I can't possibly repeat it.")),
            setf({"nov.swear": True}), pay(-10), toast("The loftbuck moves. Mistfold will never know what Rhea said."),
        ], [n("The loftbuck goes by with its cart, and gives Rhea a knowing look.")]),
    ], [n("The buck. Planted. The cart behind it, the clanswoman beside it, both of them sulking.")])]),
]
S["swearWidow"] = [
    iff({"not": "nov.swearWords"}, [
        iff({"flag": "nov.swearMet"}, [
            say("mf-old", R("You want his words. For the buck. Everyone wants his words for the buck.")),
            say("mf-old", R("Forty years I listened to that man swear at that animal every morning. I never said them once. Not once. ...Come here. Closer. I'm not saying them loud.")),
            n("She says them. Rhea's ears go hot. Old Gobber's widow sits back with her hands folded, pink, and very pleased with herself."),
            say("mf-old", R("He'd have liked you. He liked anybody who'd do a stupid thing for an animal.")),
            setf({"nov.swearWords": True}),
        ], [say("mf-old", R("I'm a widow. I've no time for callers. Unless it's about the buck."))]),
    ], [say("mf-old", R("Did it go? It went. Of course it went."))]),
]
actor("swear-lane", "town-mistfold", 12, 9, "loftbuck", "side.swearBuck", when(ACT1_ON, **{"not": "nov.swear"}))
actor("swear-widow", "town-mistfold", 18, 5, "mf-old", "side.swearWidow", when(ACT1_ON, **{"not": "nov.swearWords"}))

# ---- The Mistwing Post
S["mistPost"] = [
    iff({"not": "nov.postTaken"}, [
        n("The Millbridge postmistress keeps three mistwings in a loft over the wharf, for letters up the mountain. One of them is sick. The letters are piling up."),
        say("innkeeper", R("Three for Dripstone, two for Highmoss, and this one. Read the front.")),
        n("In a child's capitals: TO THE MOON. FROM BEN, MILLBRIDGE. PLEASE GIVE TO MY DAD, WHO IS THERE NOW."),
        say("innkeeper", R("He brings one every week. I keep them. I can't bring myself to throw them out. You're going up the mountain. Take the bag. And that one, if you can think what to do with it.")),
        setf({"nov.postTaken": True}),
    ], [iff({"atLeast": {"nov.post": 2}}, [
        iff({"not": "nov.post.moon"}, [
            n("The moon letter is still in the bottom of the bag."),
            choose("What does Rhea do with Ben's letter?",
                   opt("Send it up with a mistwing, at night", [
                       n("She takes it to the highest terrace she can find, after dark, and ties it to a mistwing's leg, and lets the bird go straight up into the dark, toward the moon, until she can't see it."),
                       n("The bird comes back in the morning without the letter. Nobody ever finds out where it went. When Rhea tells Ben, he nods as if that's the most obvious thing in the world, and goes home to write the next one."),
                       setf({"nov.post.moon": "sent"}),
                   ], hint="Answer it."),
                   opt("Write him a reply, from the moon", [
                       n("She writes it by the fire: the moon is very cold and very bright, and his dad can see the whole of Millbridge from there, and the wharf, and the roof where Ben sits. She signs it with a drawing of the moon, badly."),
                       n("Ben carries it in his shirt for a year. The postmistress says he's stopped bringing letters. She says it might be a good thing. She cries a bit, saying it."),
                       setf({"nov.post.moon": "answered"}),
                   ], hint="Kind, and a lie.")),
            pay(-20), toast("The Mistwing Post is delivered. 20 coin from the postmistress."),
        ], [say("innkeeper", R("Ben's started writing to the sun now. I've told him it's further."))]),
    ], [say("innkeeper", R("Dripstone and Highmoss. They've been waiting since the spring."))])]),
]
S["postDrop"] = [n("Rhea hands over the letters from the Millbridge bag. The old woman at the door reads the first one standing on her step, and laughs, and then sits down on her step."), add({"nov.post": 1})]
actor("post-wharf", "millbridge--wharf", 8, 6, "innkeeper", "side.mistPost", when(ACT1_ON, **{"not": "nov.post.moon"}))
actor("post-dripstone", "town-dripstone", 10, 7, "ds-keeper", "side.postDrop", when(ACT1_ON, flag="nov.postTaken", **{"not": "nov.post.drip"}))
actor("post-highmoss", "town-highmoss", 16, 8, "hm-widow", "side.postDropHigh", when(ACT1_ON, flag="nov.postTaken", **{"not": "nov.post.high"}))
S["postDropHigh"] = [*S["postDrop"], setf({"nov.post.high": True})]
S["postDrop"] = [*S["postDrop"], setf({"nov.post.drip": True})]

# ---- The Thornwick Ghost
S["ghost"] = [
    iff({"not": "nov.ghost"}, [
        n("For a week the bell in the broken tower has rung at night: once, twice, a long silence, once. Nobody's been up there in a hundred years. The children won't sleep. Oda says it's the wind. The wind doesn't ring bells twice."),
        n("Rhea goes up at midnight with a lamp. The tower stair is half gone. At the top, under the bell, in a nest of old rope and pigeon feathers, there's a reedcat kitten, thin as a stick, with its claws hooked in the bell rope."),
        n("It looks at her. It pulls the rope. The bell goes once. It looks at her again, as if that ought to explain everything."),
        say("rhea", R("You've been ringing for your supper. All week.")),
        n("It comes down in her coat and eats a whole fish in the kitchen, in front of every child at Thornwick, who've all got out of bed to see the ghost. They name it Bell. Obviously."),
        kith("reedcat", 2, "nov-bell", "Bell", "curious"), setf({"nov.ghost": True}),
        toast("The Thornwick ghost was a reedcat kitten. Bell joins the pens."),
    ], [n("The bell rope is tied off now. Bell sleeps in the kitchen.")]),
]
actor("ghost-stair", TW, 14, 4, "kid", "side.ghost", when(ACT2_ON, **{"not": "nov.ghost"}))

# ---- Lantern Cards: three champions, three tells
S["cards"] = [
    iff({"not": "nov.cards.ashby"}, [
        n("Lantern Cards in the back room of the Lantern: four lamps on the table, each with a coloured shade, and a pile of coin under the green one. The Ashby champion is a fat, smiling woman with a cold pipe she never lights."),
        say("gully", R("Mother Gorse. Nine years champion. She's got one tell, and nobody's found it. You play three hands, captain; you need two.")),
        n("First hand. She turns her lamp down and looks at the ceiling. She sucks on the cold pipe twice."),
        choose("Does she have the lamps?",
               opt("Call her", [run("cardsPipe")], hint="She's bluffing."),
               opt("Fold", [n("Rhea folds. Mother Gorse shows a hand of nothing and laughs till she coughs."), run("cardsPipe2")], hint="She's got them.")),
    ], [iff({"not": "nov.cards.done"}, [say("gully", R("Two more champions. Hollin's, in the fair tent, and Corvane's, in the counting house cellar. Beat all three and the stake's yours."))],
            [say("gully", R("The Lantern champion of three towns. They'll be singing about you in the Lantern till the ice comes."))])]),
]
S["cardsPipe"] = [n("She was bluffing. Mother Gorse takes her pipe out of her mouth and looks at it, as if it had betrayed her. Two sucks on the pipe: nothing in her hand. Three: everything."),
                  n("Next hand she sucks on it three times. Rhea folds. Next hand, twice. Rhea calls."), setf({"nov.cards.ashby": True}), add({"nov.cards": 1}),
                  say("gully", R("Mother Gorse beaten, in her own back room. Hollin and Corvane next, if you want the stake.")), run("cardsCheck")]
S["cardsPipe2"] = [n("Rhea watches. Two sucks: nothing. She has it now. Three sucks, next hand: Rhea folds and Mother Gorse shows a full set. Two sucks, the last hand: Rhea calls, and wins."),
                   setf({"nov.cards.ashby": True}), add({"nov.cards": 1}), run("cardsCheck")]
S["cardsHollin"] = [
    iff({"not": "nov.cards.hollin"}, [
        n("The Hollin champion is a solemn boy of sixteen in a College gown, who plays Lantern Cards the way he'd do sums. He never blinks."),
        n("Rhea watches three hands. He never blinks, but when he has the lamps he straightens the pile of coin in front of him, square, with one finger."),
        choose("He's squaring his coins.",
               opt("Fold", [n("Rhea folds. He shows the lamps, and looks at her for the first time with something like respect. The next time he squares his pile, she folds; the next time he doesn't, she calls. He loses two hands in a row and goes very pink."),
                            setf({"nov.cards.hollin": True}), add({"nov.cards": 1}), run("cardsCheck")], hint="He has them."),
               opt("Call", [n("He has them. He takes the hand without a flicker. Rhea loses the next one too. She'll have to come back when she's thought about it."), add({"nov.cardsLost": 1})], hint="He's bluffing.")),
    ], [n("The College boy is teaching the tent his sums.")]),
]
S["cardsCorvane"] = [
    iff({"not": "nov.cards.corvane"}, [
        n("The Corvane champion is a League clerk with ink on every finger, in the counting-house cellar, who plays for exact sums and writes each one down."),
        n("When he's bluffing, he writes the sum before the hand's done. When he's got the lamps, he waits."),
        choose("The clerk's pen is already moving.",
               opt("Call him", [n("He was bluffing. He crosses out the sum, neatly, and writes a smaller one, and Rhea takes the next hand the same way. He pays out to the last copper and gives her a receipt."),
                                setf({"nov.cards.corvane": True}), add({"nov.cards": 1}), run("cardsCheck")], hint="He's written it already."),
               opt("Fold", [n("He shows nothing at all, and writes a large sum in his book, very small."), add({"nov.cardsLost": 1})], hint="He's sure of himself.")),
    ], [n("The clerk nods at Rhea over his ledger.")]),
]
S["cardsCheck"] = [iff({"atLeast": {"nov.cards": 3}}, [iff({"not": "nov.cards.done"}, [
    n("Three champions, three towns. The stake under the green lamp at the Lantern is Rhea's: a purse, and a Guild cartographer's chart of the whole south coast, with every reef and every smugglers' landing marked."),
    setf({"nov.cards.done": True}), pay(-60), toast("Lantern champion of three ports: 60 coin, and a smugglers' chart of the south coast."),
])])]
actor("cards-lantern", "ashby-tavern", 12, 5, "gully", "side.cards", when(ROAD_ON, **{"not": "nov.cards.done"}))
actor("cards-hollin", "hollin-fair", 18, 8, "gil", "side.cardsHollin", when(ROAD_ON, flag="nov.cards.ashby", **{"not": "nov.cards.hollin"}))
actor("cards-corvane", "town-corvane", 8, 10, "factor", "side.cardsCorvane", when(ROAD_ON, flag="nov.cards.ashby", **{"not": "nov.cards.corvane"}))

# ---- The Toll Bridge Riddler
S["riddler"] = [
    iff({"not": "nov.riddle"}, [
        n("The old toll bridge over the Kerrow beck has a keeper in a chair in the middle of it, with a blanket on his knees and a brass bell. He's been there since before the bridge, people say."),
        say("kr-smith", R("Toll's a riddle. One I haven't heard. I've heard most. Fifty-one years on this bridge.")),
        choose("A riddle he hasn't heard.",
               opt("What has a neck but no head?", [say("kr-smith", R("A bottle. My grandmother. Next."))], hint="An old one."),
               opt("What gets wetter the more it dries?", [say("kr-smith", R("A towel. Fifty-one years, girl. Next."))], hint="Another."),
               opt("What sings three lines in the cloud, and the third one wrong?", [
                   n("He thinks about it for a long time. He opens his mouth, and shuts it, and frowns, and rings his bell slowly."),
                   say("kr-smith", R("I don't know. Tell me.")),
                   say("rhea", R("Everybody in Ostrel. Except the Spire Folk.")),
                   n("He laughs so hard the blanket falls off his knees. Then he wants the whole story, and gets it, and at the end he gives her his old brass lantern, because he won't be needing it, he says, with a riddle like that to think about."),
                   setf({"nov.riddle": True}), pay(-12), toast("The riddler is stumped. He gives Rhea his old brass lantern (12 coin)."),
               ], when={"flag": "iselMet"}, hint="One of her own.")),
    ], [say("kr-smith", R("Three lines. The third one wrong. I keep humming it."))]),
]
actor("riddler-bridge", "town-kerrow", 13, 7, "kr-smith", "side.riddler", when(ACT1_ON, **{"not": "nov.riddle"}))

# ---- The Cloud Sea Stargazer
S["stargazer"] = [
    iff({"not": "nov.stars"}, [
        iff({"not": "nov.starsMet"}, [
            n("On the highest terrace above the cloud, an old woman has set up a brass tube on three legs and a table of charts weighted with stones."),
            say("ds-keeper", R("Every star you can see from above the cloud, I've charted. All but three. They only come up in the small hours, and I can't stay awake past midnight any more. Would you? Three nights. Tell me where they rise.")),
            setf({"nov.starsMet": True}),
        ]),
        fade("A night on the terrace, above the cloud, with the brass tube and a lamp shaded red."),
        n("At three in the morning a star comes up out of the cloud sea where no star should be, low and gold, and then another beside it, and then a third, close, very faint."),
        choose("The three stars over the cloud. Rhea writes down what she sees.",
               opt("Three: one bright, one paler, one hardly there", [
                   say("ds-keeper", R("Three. I've waited thirty years to know if there were three. My mother said there were three. Larkfold folk called them something, she said, and I never found out what.")),
                   say("rhea", R("The mother, the girl and the little one. My mother used to show me from the drying-house roof.")),
                   n("The old woman writes it on her chart in tiny letters, beside the three gold dots: THE MOTHER, THE GIRL AND THE LITTLE ONE. NAMED BY THE LARKFOLD FOLK. CHARTED BY RHEA OF LARKFOLD."),
                   setf({"nov.stars": True}), toast("Three stars charted over the cloud sea, with their Larkfold names."),
               ], hint="Exactly as she saw them.")),
    ], [say("ds-keeper", R("The mother, the girl and the little one. I look for them every night now, even when I can't stay up."))]),
]
actor("stars-terrace", "town-dripstone", 4, 3, "ds-keeper", "side.stargazer", when(ACT1_ON, **{"not": "nov.stars"}))

# ---- The Honest Smuggler
S["smugglerBook"] = [
    iff({"not": "nov.ledger"}, [
        n("In the reeds by the lock gates, wedged in the mud, an oilcloth packet. Inside, a ledger: names, sums, dates, going back twenty years. Every sum is a debt owed to a man called Gaunt. Every one of them, in the last column, is crossed out: FORGIVEN."),
        setf({"nov.ledger": "found"}), toast("A smuggler's ledger, every debt in it forgiven. Someone at Weirbank will want it back."),
    ], [n("Reeds. Mud. Nothing else.")]),
]
S["smuggler"] = [
    iff({"eq": {"nov.ledger": "found"}}, [
        say("smuggler", R("That's my book. Where'd you... the reeds. I dropped it running from the lock-keeper's men. Twenty years of it.")),
        say("smuggler", R("Gaunt. I run tea and lamp oil past the Guild's tolls, and lend to anyone on the canal who's short, and then I forget I lent it. My father said a book you never collect on is a book that collects for you. Half the canal owes me, and all of it would hide me in a flood.")),
        choose("Gaunt is holding his hand out for the book.",
               opt("Give it back", [
                   n("He takes it and tucks it into his coat, and gives her a canal man's nod: two fingers to the cap."),
                   say("smuggler", R("You're in it now. Under F. For favour. Don't collect on it; it's worth more if you don't.")),
                   setf({"nov.ledger": "returned", "canalFavour": True}), add({"have.firepot": 1}),
                   toast("Gaunt owes the Commons a favour. He leaves a fire pot in Rhea's pack, \"for the toll men\"."),
               ], hint="It's his."),
               opt("Hand it to the Commons quartermaster", [
                   n("Gaunt watches her put it away. He doesn't argue. He doesn't do anything at all, which is worse."),
                   n("The quartermaster finds no use for a book of forgiven debts, and loses it within the month. Half the canal hears what happened. The canal is quieter to the Commons after that."),
                   setf({"nov.ledger": "taken"}),
               ], hint="Names and places on the canal.")),
    ], [iff({"eq": {"nov.ledger": "returned"}}, [say("smuggler", R("Under F. Still uncollected."))], [say("smuggler", R("Nothing to buy today."))])]),
]
actor("ledger-reeds", "town-lockkeepers-deep", 4, 10, "folk", "side.smugglerBook", when(MILL_ON, **{"not": "nov.ledger"}))
actor("gaunt-weir", "town-weirbank", 16, 6, "smuggler", "side.smuggler", when(MILL_ON, flag="nov.ledger", **{"not": "canalFavour"}))

# ---- The Kith Beauty Show
S["beautyShow"] = [
    iff({"not": "nov.beauty"}, [
        n("The Canal Market has a show ring today, roped off with bunting, and the judges are eleven mill children on an upturned barge, with a box of ribbons they made themselves out of mill-ends."),
        say("wb-child", R("Every kith wins. That's the rule. We just have to decide what it wins FOR.")),
        choose("Which kith does Rhea show?",
               opt("Ash", [n("Ash walks the ring like a lord, and stops, and lets eleven children pat him at once."), say("wb-child", R("Ash wins Best At Standing Still While Being Patted. It's the hardest one.")), setf({"nov.beauty": "ash"})]),
               opt("Thimble", [n("Thimble walks the ring, and then walks out of it to look at the crowd, and has to be fetched back."), say("wb-child", R("Thimble wins Most Interested In Everybody.")), setf({"nov.beauty": "thimble"})], when={"flag": "kith.br-thimble"}),
               opt("Bell", [n("Bell sits in the middle of the ring and washes, and refuses to move, and is carried round."), say("wb-child", R("Bell wins Best Cat. There's only one cat, so that's fair.")), setf({"nov.beauty": "bell"})], when={"flag": "kith.nov-bell"}),
               opt("The Matriarch", [n("The Matriarch comes down the canal path and the whole market stops. She stands in the ring like a hill. Eleven mill children stand on the barge with their mouths open."), say("wb-child", R("She wins Biggest. And Best. And Oldest. She can have three. We made extra.")), setf({"nov.beauty": "matriarch"})], when={"flag": "kith.matriarch"})),
        n("The ribbon is made of mill-end calico, pink and blue, with the prize written on it in charcoal. It goes in Rhea's pack with the oddest things she owns, and stays there."),
        toast("A mill-end ribbon from the Kith Beauty Show."),
    ], [say("wb-child", R("Next year we're having a prize for Best Name. Start thinking."))]),
]
actor("beauty-ring", "town-cinderwick--market", 12, 6, "wb-child", "side.beautyShow", when(MILL_ON, **{"not": "nov.beauty"}))

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
    "side.heskFoal": "tender", "side.hollinShow": "camp", "side.rareStrains": "camp", "side.rareStrainsBack": "camp", "side.spirecrestGift": "hope",
    "side.saltCatGift": "camp", "side.nightGrazer": "night", "side.flawedLine": "grief", "side.droveAfter": "hope",
    "side.cheeseRun": "hope", "side.cheeseLose": "hope", "side.swearBuck": "camp", "side.swearWidow": "camp", "side.mistPost": "tender", "side.postDrop": "camp",
    "side.postDropHigh": "camp", "side.ghost": "night", "side.cards": "tension", "side.cardsPipe": "camp", "side.cardsPipe2": "camp", "side.cardsHollin": "tension",
    "side.cardsCorvane": "tension", "side.cardsCheck": "hope", "side.riddler": "camp", "side.stargazer": "night", "side.smugglerBook": "camp", "side.smuggler": "camp",
    "side.beautyShow": "hope",
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
