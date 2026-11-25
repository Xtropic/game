"""Builds data/story/act4.json, Act IV's party battle and its duels: from the autumn after Lockside, when the Houses
send every child they have left into the Broodhouse, to the gate of the Broodhouse in the spring, and the end of the story.
Rhea's stages start "af", Corran's "ag". Run: python3 tools/story/act4.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2 import say, n, stage, run, fade, goto, setf, add, toast, iff, opt, choose, R  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "../..")
OUT = os.path.join(ROOT, "data/story/act4.json")
TW = "thornwick"
BH = "broodhouse"

cast = {"tam": "Tam", "loyalist": "Kane's sergeant"}

objectives = {
    "af1": "Wren has brought someone up from Vantry. They're by the warm pool.",
    "af2": "Kane has called his officers. Go down to the Commons camp.",
    "af3": "The Broodhouse drain comes out on the canal bank at Cinderwick, by the old Mire drain. Go there at midnight.",
    "af4": "Follow the drain east, to the Broodhouse grate.",
    "af5": "Go home to Thornwick. Turn in at your tent.",
    "af6": "Dorrit wants you. She's at the crates with the ledger.",
    "af7": "Kane is in his tent at the top of the Commons camp.",
    "af8": "Winter. Turn in at your tent when you're ready.",
    "af9": "The column is waiting at Cinderwick. Go to Vantry.",
    "af10": "The Broodhouse. Halloran is in the inner yard.",
    "af11": "The inner gate. The fire is already lit.",
    "ag1": "Thornwick, an evening in autumn.",
}

S = {}

# ------------------------------------------------------------------ autumn: the Houses close ranks
S["act4Start"] = [
    fade("Autumn."),
    setf({"act4": True, "light": "day", "hero": "rhea"}),
    stage("af1"), goto(TW, 13, 12, "up"), {"alone": True},
    n("The terraces are gold. The first frost is on the chapel roof in the mornings, and the children who came out of Lockside and Mire have learned to run without being told to."),
    n("Wren has brought someone up the mountain in the night. A boy, thin as a rake, sitting by the warm pool with his feet in it and his shoes in his lap."),
]
S["runaway4"] = [
    iff({"stage": "af1"}, [
        say("wren", R("This is Tam. He came out of Rennick's, in the Houses' quarter. He came the drain way. I told him you'd want to hear.")),
        say("tam", R("They came for all of us. Rennick's, Ashby's, Dunmore's. Every House that's still got children. Carts at night, with the covers tied down.")),
        say("tam", R("They're putting everybody in the Broodhouse. The big one, inside the wall. They said it's so the Commons can't take us. They said it like it was for us.")),
        say("rhea", R("How many?")),
        say("tam", R("Nobody counts out loud in there. More than three hundred. Less than five.")),
        n("He takes his feet out of the water and looks at them, as if they belong to somebody else."),
        iff({"flag": "finchStripped"}, [
            say("tam", R("And the rider. Ninety. The Wardens brought him in at harvest with his hands tied and no coat. He's on the trays now, same as us.")),
        ], [
            say("tam", R("And the rider. The one they called Ninety. He came in on the trays last week, same as us. They took his coat and gave him his number back.")),
        ]),
        say("tam", R("He doesn't talk. He just works. The little ones go and stand next to him, and nobody touches them while they do.")),
        iff({"eq": {"corranFate": "thornwick"}}, [
            n("Behind the bathhouse wall, something is put down very carefully, the way a man puts something down when his hands won't stop shaking."),
        ]),
        say("wren", R("I told him you'd do something. You always do something.")),
        setf({"finchInBroodhouse": True}),
        n("By noon a runner comes up the road from the camp. Kane has called his officers."),
        stage("af2"),
    ], [say("tam", R("I'm going to stay in the water till my feet stop hurting. Wren says that's allowed here."))]),
]
S["council4"] = [
    n("Kane, Varro, Hallet, and the captains from the south. Somebody has pinned a drawing of Vantry's inner wards to the map table, and the Broodhouse is in the middle of it, inked black."),
    say("kane", R("The Guild has put every child it has left in one building, around the two breeding lines every Guild lull in Ostrel comes from. It thinks we won't come.")),
    say("hallet", R("It's built a wall of children. Clever. Filthy, but clever.")),
    iff({"eq": {"lockHeld": False}}, [say("varro", R("And it's taken Corvel's back. They'll say the Commons can't hold a hatchery. They'll say it at every town gate this winter."))],
        [say("varro", R("They saw what happened at Lockside. They know we can hold what we take. That's why they've pulled everything back inside the wall."))]),
    iff({"flag": "road"}, [
        say("varro", R("The League stopped paying their swords at the spring settling. Tarsis never marched for them. They've lost every court the Captain rode through, one way or another. A House without credit pulls in what it owns. That's what the Broodhouse is.")),
        say("kane", R("Nine nations, Captain. Some of them for us, some of them only not against us. It'll do. It'll have to.")),
    ]),
    say("kane", R("The council wants Vantry before the spring. I want the Broodhouse. One column, and one officer to take it.")),
    say("kane", R("Captain Caddow. You've walked children out of two hatcheries. You'll be Commander of the Vantry column, from today. Varro is your second.")),
    say("hallet", R("And the hardliners? My companies?")),
    say("kane", R("Yours march with her. Under her.")),
    n("Hallet looks at Rhea for a long moment. Then he nods, once, the way a man nods at weather."),
    setf({"rank": "Commander"}),
    toast("Promoted: Commander, of the Vantry column."),
    say("kane", R("Find me a way in, Commander.")),
    iff({"flag": "recruited.posy"}, [
        say("posy", R("There's a way in. The Broodhouse drain runs into the canal at Cinderwick, by Mire's. Every runaway in the Houses knows it. It's got a grate at the top, and the grate's got a lock, and the lock's on their side.")),
    ], [
        say("varro", R("The Mire boy, Tam, says the Broodhouse drain comes out at Cinderwick, by Mire's. There's a grate at the top. Locked, from their side.")),
    ]),
    say("rhea", R("Then I'll go and look at it.")),
    stage("af3"),
]
S["kane4"] = [
    iff({"stage": "af2"}, [run("council4")], [
        iff({"stage": "af7"}, [run("kaneOil")], [
            iff({"flag": "kaneArrested"}, [n("Kane's tent. Varro has the map table now. Kane is in the stockade, and asks for nobody.")], [say("kane", R("Commander."))])])]),
]

# ------------------------------------------------------------------ the grate: Finch
S["drainIn4"] = [
    fade("Cinderwick. Midnight."),
    setf({"light": "night"}), {"regroup": True},
    goto("underdrain", 1, 3, "right"),
    n("The old drain to Mire goes off to the left, a black mouth in the brick. This one goes on, east, under the wall. It's bigger. The Broodhouse makes a lot of warm water."),
    stage("af4"),
]
S["grate"] = [
    iff({"stage": "af4"}, [
        n("The grate. Iron bars as thick as a wrist, set into the stone, and a lock on the far side. Beyond it, a low room where the warm water comes down a chute from the brood halls."),
        n("Someone is sitting on the step inside, with his back to the wall and his knees up. He has been there a while. He has been waiting for whoever Tam would bring."),
        n("Sixteen. Taller than Rhea now. Sandy hair cropped to the skull, the way the Houses crop it. A number inked on his wrist."),
        say("finch", R("Tam got out, then. Good.")),
        say("rhea", R("Finch.")),
        say("finch", R("Don't. Not through bars. I've had enough of people looking at me through bars.")),
        iff({"atLeast": {"finchTrust": 60}}, [run("finchTruth")], [run("finchShut")]),
        say("finch", R("And I'm not coming out. Don't ask. There are four hundred in here, and the little ones sleep against me, and if I go they'll take it out on them.")),
        say("finch", R("Halloran sleeps in the line house, in the middle, with the lines. The Wardens are on the outer wall and the street gate. Nobody guards the halls. Nobody has to. Where would we go?")),
        n("Somewhere above, a bell rings for the night shift. Finch gets up."),
        say("finch", R("Don't come down here again. They count the grate.")),
        n("He goes up the chute without looking back. He climbs like someone who has done it a hundred times in the dark."),
        setf({"grateSeen": True}),
        stage("af5"),
    ], [n("The grate, and the empty step behind it.")]),
]
S["finchTruth"] = [
    n("He looks at the water for a long time. When he speaks, it's to the water."),
    say("finch", R("I've got something to tell you. I've been going to tell you for four years. I used to practise it on Smoke.")),
    say("finch", R("The last tray. At Larkfold. The brood that went down to Millbridge.")),
    say("finch", R("Corran's mother was so sick from weaning. You remember. She couldn't keep anything down. And I thought, if her greenling was a bit stronger, it would work faster, and she'd stop being sick.")),
    say("finch", R("So I gave the last tray a double measure of moss. I was twelve. I didn't tell anyone. And in the brood book I wrote Mother's measure, the right one, in my own hand. So the book said it was fine. So nobody would know.")),
    n("Millbridge. Eleven dead. The warning. The night on the cloud path. The fire. The carts."),
    say("finch", R("All of it. Every bit of it, from a measure of moss. I've known since I was twelve.")),
    setf({"finchTold": "rhea"}),
    choose("Finch won't look up from the water.",
           opt(R("You were twelve. You were trying to help her. Halloran did the rest, and Halloran knew what he was doing.")
               , [add({"finchTrust": 10}), setf({"mossAnswer": "absolved"}),
                  say("finch", R("You don't know that. You can't know that.")),
                  say("rhea", R("I know you. I know who taught you to measure moss. I did.")),
                  n("He puts his face in his hands. When he takes them away he's sixteen again, and also twelve.")], by="rhea", hint="Take it off him."),
           opt(R("Eleven people died in Millbridge, Finch. You don't get to carry that alone, and you don't get to put it down either."),
               [add({"finchTrust": 2}), setf({"mossAnswer": "shared"}),
                n("He nods. He nods for a long time, as if somebody has finally said the thing he was waiting to hear."),
                say("finch", R("Yes. That's right. That's fair."))], by="rhea", hint="Don't lie to him."),
           opt("Say nothing", [add({"finchTrust": -6}), setf({"mossAnswer": "silent"}),
                n("Rhea can't speak. Finch waits, and when nothing comes, he wipes his face with the back of his wrist, over the number."),
                say("finch", R("Right. Well. Now you know."))], hint="There's nothing to say.")),
]
S["finchShut"] = [
    say("finch", R("Whatever you've come to say, I don't want it. You sang my loftbuck off a bridge. You let them put me in a stockade for nine days. You never came.")),
    iff({"eq": {"bridgeAct": "sang"}}, [say("finch", R("Smoke was the only thing I had that was mine. Is he warm? Do you feed him properly? No. Don't tell me."))]),
    n("He doesn't say anything else for a while. The water runs under the grate."),
    iff({"eq": {"corranFate": "thornwick"}, "atLeast": {"finchCorran": 0, "hold": 50}}, [
        n("Then he takes a folded paper out of his shirt and pushes it through the bars, and lets go of it before she can touch his hand."),
        say("finch", R("That's for him. Not for you. Don't read it. Give it to him.")),
        setf({"finchLetter": True}),
    ]),
]

# ------------------------------------------------------------------ Corran's autumn: wherever he is
S["thornBed4"] = [
    iff({"stage": "af5"}, [setf({"light": "night"}), run("corranAutumn")], [
        iff({"stage": "af8"}, [run("winter4")], [n("Not yet. There's still a lot of the day left.")])]),
]
S["corranAutumn"] = [
    iff({"eq": {"corranFate": "thornwick"}}, [run("corranRoom")], [
        iff({"eq": {"corranFate": "left"}}, [run("corranHalls")], [
            iff({"eq": {"corranFate": "millbridge"}}, [run("corranGaol")])])]),
    run("backToRhea6"),
]
S["corranRoom"] = [
    fade("Thornwick. The same night."),
    setf({"hero": "corran"}), stage("ag1"),
    n("Oda has given him the cell at the end of the bathhouse, the one with a door. He has never had a door at Thornwick before. He keeps it open."),
    n("He can sleep now, most nights. He can eat. The rings on his neck are fading to pale marks, the way old scars do, and some mornings he forgets to touch them."),
    iff({"flag": "finchLetter"}, [
        n("Rhea comes to the door with a folded paper, and holds it out, and doesn't come in."),
        say("rhea", R("From Finch. He said not to read it. I haven't.")),
        n("She goes. He sits on the pallet with it for an hour before he opens it."),
        n("Finch's hand. He wrote like a twelve-year-old for years, and then one winter he didn't. Four lines."),
        n("I doubled the moss in the last tray at Larkfold. For your mother. It was me, not the Guild. I thought you should know before somebody kills you for it."),
        n("He reads it until the lamp goes out."),
        setf({"corranKnowsMoss": True}),
        choose("The letter, in the dark.",
               opt("Tell Rhea what it says", [setf({"mossToRhea": True, "finchTold": "rhea"}), add({"finchCorran": -10, "hold": 4}),
                    n("In the morning he goes to her tent and tells her, word for word, standing in the door. Then he goes back to his cell and shuts the door for the first time.")],
                   hint="She has a right to know. He asked you not to."),
               opt("Keep it", [add({"finchCorran": 12}),
                    n("He folds it small and puts it inside his shirt, where Finch kept it. He never tells anyone what it says.")],
                   hint="It was given to you. Only you.")),
    ], [
        n("Haldane comes by at the end of the day to look at his neck and write in the trial ledger. He's volunteer one hundred and five now. A number again, but a different kind."),
        say("haldane", R("You're doing well. Annoyingly well. You'll ruin my averages.")),
        n("When the old man has gone, Corran sits at the open door until late, humming the foal song. He gets the third line right now, nearly every time."),
    ]),
    setf({"hero": "rhea"}),
]
S["corranHalls"] = [
    fade("The Broodhouse. Autumn."),
    setf({"hero": "corran"}),
    n("When they emptied Mire into the carts, the sick-room orderly went with the children. Nobody asked him. Nobody asks anything of him. He carries the bitten ones to the sick room and the dead ones to the cart, and he isn't a Warden or a father or anything at all."),
    iff({"atLeast": {"hold": 35}}, [
        n("On the third night, at the trays in the west hall, a boy with a cropped head and a number on his wrist looks up and sees who is carrying the water."),
        say("finch", R("You.")),
        say("corran", R("Finch.")),
        choose("Finch is waiting. The little ones are asleep against his legs.",
               opt(R("Halloran told me they'd burn Larkfold. It was a lie. I showed them the way in, and it was a lie, and it was me."), [
                   setf({"finchKnowsWhy": True}), add({"finchCorran": 8, "hold": 6}),
                   say("finch", R("I know it was you. I watched you do it, for three years, every night, with the tin.")),
                   n("He goes back to the moss. But in the morning there's a bowl of the children's porridge by Corran's pallet, and nobody else would have put it there.")], by="corran", hint="Tell him all of it."),
               opt("Say nothing, and go back to work", [add({"finchCorran": -4}),
                   n("He goes back to carrying water. Finch watches him all the way down the hall.")], hint="He's earned nothing from you.")),
        setf({"corranInBroodhouse": True}),
    ], [
        n("He gets the cough in the first week of the frost. Everybody in the halls gets it. He gives his blanket to a girl who coughs worse."),
        n("On the last night, he can hear a boy singing at the far end of the hall, to keep the little ones quiet. The foal song. The third line right."),
        n("He tries to sing it with him, and can't find the breath for it, and then he doesn't need to."),
        setf({"corranDead": "broodhouse"}),
        n("They carry him to the cart in the morning with the others. Finch carries one end."),
    ]),
    setf({"hero": "rhea"}),
]
S["corranGaol"] = [
    fade("Millbridge. The gaol under the reeve's house."),
    setf({"hero": "corran"}),
    iff({"flag": "surveyTold"}, [
        n("The reeve comes down at first frost, with a lamp and the Wardens' map, the one with Larkfold left blank."),
        say("reeve", R("I'm supposed to hang you this week. I've read this every night since the summer instead.")),
        say("reeve", R("The Commons is going for the Broodhouse. They need someone who's been inside it. Someone who knows the halls.")),
        say("corran", R("I watched over Mire's brood room. The Broodhouse is bigger. I walked its halls with Halloran twice. I know where the lines are.")),
        say("reeve", R("Then you'll go with the column, in irons. And when it's done, you'll come back here, and we'll talk about the rope.")),
        n("He doesn't argue. It's the most anyone has offered him in a year."),
        setf({"corranChained": True}),
    ], [
        n("They hang him at the first frost, on the well steps, where they tried him. It's done early, before the market, without a crowd."),
        n("He asks for nothing. At the end, he asks them to tell Rhea that he got the third line right. The reeve writes it down, and never sends it."),
        setf({"corranDead": "hanged"}),
    ]),
    setf({"hero": "rhea"}),
]
S["backToRhea6"] = [
    fade("Thornwick. Morning."),
    {"hero": "rhea"}, setf({"light": "day"}),
    stage("af6"), goto(TW, 4, 13, "up"),
    iff({"eq": {"corranDead": "hanged"}}, [n("A letter comes up from Millbridge with the flour cart, in the reeve's square hand. Two lines. Rhea reads it standing at the gate, and then she puts it in the fire, and then she goes and sits in the chapel by herself until noon.")]),
    iff({"eq": {"corranDead": "broodhouse"}}, [n("Tam brings word up the drain road: the orderly from Mire died in the frost, in the west hall. The children sang over him. He doesn't know the man's name. Rhea does.")]),
    iff({"flag": "recruited.dorrit"}, [n("Dorrit is waiting at the crates with the ledger open, and a face like a shut door.")],
        [n("Varro's quartermaster is waiting at the crates with a ledger, and a face like a shut door.")]),
]

# ------------------------------------------------------------------ the lamp oil
S["oilLedger"] = [
    iff({"stage": "af6"}, [
        iff({"flag": "recruited.dorrit"}, [
            say("dorrit", R("I keep the camp's books as well as ours now. Kane's quartermaster sends me his tallies because he can't add. Look at this.")),
            say("dorrit", R("Forty barrels of lamp oil, drawn from the Lockside stores and sent down the canal to Cinderwick. Signed by Kane's own sergeant. Lamp oil, Caddow. Nobody needs forty barrels of light.")),
        ], [
            say("varro", R("Forty barrels of lamp oil, drawn from the Lockside stores and sent to Cinderwick. On Kane's seal. I've been a soldier twenty years. Nobody needs forty barrels of light.")),
        ]),
        n("Cinderwick is where the Broodhouse drain comes out. Rhea has stood in it."),
        iff({"flag": "finchTold"}, [run("millbridgeWord")]),
        stage("af7"),
    ], [say("dorrit", R("The books balance. They always balance. That's the frightening thing about books."))]),
]
S["millbridgeWord"] = [
    iff({"eq": {"millbridge": "elders"}}, [
        n("And there's the other thing, the one she's carried since the grate. Millbridge believes the Guild poisoned its brood, because she stood on the well steps and told them so."),
        choose("What Millbridge believes.",
               opt("Write to the reeve, and tell her the truth", [setf({"millbridgeTold": True}), add({"millbridgeTrust": -10}),
                    n("She writes it plainly: a boy of twelve, a measure of moss, and her own lie on the well steps afterwards. She doesn't ask for anything.")],
                   hint="It will come out. Better from you."),
               opt("Leave it", [setf({"millbridgeTold": False})], hint="The war needs Millbridge.")),
    ]),
]
S["kaneOil"] = [
    n("Kane is alone, at the map table, with the drawing of the Broodhouse pinned flat under four stones."),
    say("rhea", R("Forty barrels of lamp oil, to Cinderwick.")),
    n("He doesn't pretend. She'll give him that, afterwards. He never once pretends."),
    say("kane", R("The breeding lines, Commander. Two lines, in one room. Every Guild lull that has ever been put on a neck came from them. While they live, the Guild lives. Take Vantry and leave the lines, and they'll be breeding again in a year, somewhere we can't reach.")),
    say("kane", R("Hallet's men go in through the drain the night you take the Spindle gate. They oil the halls and the line house. One fire, and it's finished, for ever.")),
    say("rhea", R("There are four hundred children in the halls.")),
    say("kane", R("Yes.")),
    say("kane", R("And when the lines are gone, half of Ostrel goes into the raw in one winter, and some of them die of it, and I'll answer for that too. I've done the sum, Caddow. I've done it every night for a month. Four hundred against every child who'll ever be put on a tray again.")),
    iff({"flag": "offerKnown"}, [
        say("rhea", R("You did a sum once before. Every Larkfold child in the Houses, for me at Kell's Bridge. You burned that one too.")),
        say("kane", R("I did. And you're here, and you've taken three hatcheries. The sum was right.")),
    ]),
    iff({"flag": "finchInBroodhouse"}, [say("rhea", R("My brother is in there.")), say("kane", R("I know. I'm sorry. I'm not sorry enough to stop."))]),
    choose("Kane waits for her answer. His hand is flat on the drawing of the Broodhouse.",
           opt(R("You're relieved, Marshal. Varro, take his sword."), [setf({"kanePlan": "stopped"}), run("arrestKane")], by="rhea",
               hint="Arrest him. The hardliners won't stand for it."),
           opt(R("Take the gate, and leave the rest to you. Is that what you want me to say?"), [setf({"kanePlan": "ahead"}), run("planAhead")], by="rhea",
               hint="Let it go ahead. It may be the only way the Guild ever ends.")),
]
S["arrestKane"] = [
    n("Varro comes in. He looks at Kane, and at Rhea, and he puts his hand on his sword hilt and leaves it there."),
    iff({"atLeast": {"kaneTrust": 0}}, [
        n("Kane looks at the hand on the hilt. Then he unbuckles his own sword and lays it on the drawing of the Broodhouse, across the line house."),
        say("kane", R("You'll be wrong, Caddow. And you'll be Marshal. Those go together more often than you'd think.")),
        run("kaneTaken"),
    ], [
        say("kane", R("No. Not from you. Not after everything I kept you in the war for.")),
        n("He draws."),
        {"duel": "kane-tent", "win": [
            n("He goes down on one knee among the stones from the map table, and doesn't get up, and Varro takes the sword out of his hand."),
            run("kaneTaken"),
        ]},
    ]),
]
S["kaneTaken"] = [
    setf({"kaneArrested": True, "rank": "Marshal", "hardlinersGone": True}),
    n("By evening the whole camp knows. By morning, Hallet is gone, and his three companies with him, and the forty barrels of lamp oil with them."),
    iff({"flag": "offerKnown"}, [
        n("Varro reads the council the Guild's letter about Larkfold's children, the one that came to Kane's tent under a truce flag. The south captains stay to a man."),
    ], [
        n("Nobody tells the council why. Two of the south captains go after Hallet in the night. The rest stay, and watch her."),
        setf({"southGone": True}),
    ]),
    toast("Rhea is Marshal of the Commons Army."),
    say("varro", R("Marshal. Hallet's still got the oil. Wherever he's gone, he took that with him.")),
    stage("af8"),
]
S["planAhead"] = [
    say("kane", R("I want you to take the Spindle gate and hold it, so nobody comes up the ward while Hallet's in the drain. That's all I want.")),
    say("kane", R("When it's over, you can hate me. You'll have the war to do it in.")),
    n("She walks out. Varro is outside the tent. He has heard all of it. He doesn't say anything, and neither does she."),
    stage("af8"),
]

# ------------------------------------------------------------------ winter
S["winter4"] = [
    fade("Winter."), setf({"light": "night"}),
    iff({"flag": "roadKnown"}, [
        n("In the deep of the winter, the Guild comes up the Kerrow road that the toll warden let them by. A Warden column, in the snow, with ladders."),
        {"army": "thornwick-raid", "win": [n("They go back down the Kerrow road, carrying their ladders and their dead. They won't come again this winter.")],
         "lose": [n("They burn the stores and the kith pens before they go. Nobody inside the walls is taken. It's the only thing Rhea lets herself count.")]},
    ]),
    iff({"flag": "tobinRelapse"}, [n("No moss comes down from Ume's terraces this winter. Oda breeds the trays on what she has, and goes to bed later every night.")]),
    iff({"flag": "brannocBuilder", "not": "brannocHanged"}, [n("Brannoc builds scaling ladders in the chapel all winter, with his back strapped. Sixty of them, light enough for a child to carry. He doesn't say what they're for. Everybody knows.")]),
    iff({"flag": "catchersCame"}, [n("Fennick sleeps in the gatehouse now, with a lamp, as if being where the catchers would come first could pay for the two they took.")]),
    iff({"eq": {"corranFate": "thornwick"}}, [run("relapse")], [
        iff({"flag": "corranChained"}, [run("relapseChained")])]),
    fade("Spring."), setf({"light": "day"}),
    n("The column gathers at Cinderwick in the thaw. Every company the Commons can raise, and some it can't afford."),
    stage("af9"),
]
S["relapse"] = [
    fade("The night before Vantry."),
    setf({"hero": "corran"}),
    n("Corran's tent is at the edge of the column, where Varro put him, because he's the only one who has walked the Broodhouse's halls, and he's going in with them."),
    n("There's a tin in his coat pocket. He doesn't know how it got there. That isn't true. A sutler at Cinderwick sold it to him for the last of his pay, and he told himself he'd throw it in the canal on the way back."),
    n("A fresh lull, warm in the tin, turning slowly toward the heat of his hand."),
    n("Tomorrow he walks into the place where Halloran is. One fresh lull, and he'd be steady for it. Nobody would ever know."),
    choose("The tin, in his hand.",
           opt("Put it on. Just for tomorrow.", [setf({"relapseNight": "used", "corranWearing": True, "mods.corran": "lull"}), add({"hold": -25, "rings.corran": 1}),
                n("The cold, then the warmth, climbing up the back of his skull. The shaking stops. Tomorrow stops mattering. He sleeps like a child.")],
               hint="He'll be steady at the gate."),
           opt("Crush it", [setf({"relapseNight": "crushed"}), add({"hold": 10}),
                n("He crushes it under his heel in the mud, and stands there for a long time afterwards, and then he goes and sits by the watch fire until dawn, because he can't be alone with what he's just done.")],
               hint="Alone, in the dark."),
           opt("Take it to Rhea", [setf({"relapseNight": "given", "tinGiven": True}), add({"hold": 14}),
                n("He walks the length of the column in the dark to her tent, and stands in the door, and holds out the tin."),
                say("corran", R("I bought this. I'm not going to use it. I need you to have it, so I can't.")),
                n("She takes it. She doesn't say anything. She doesn't need to. She holds the tin in one hand and, after a moment, his wrist in the other, the way she used to take a pulse.")],
               hint="Somebody else has to hold it.")),
    setf({"hero": "rhea"}),
]
S["relapseChained"] = [
    fade("The night before Vantry."),
    n("They keep Corran in irons at the back of the column. Varro has a man sit with him. On the last night, the man comes to Rhea."),
    say("varro", R("He asked me to tell you he knows the way to the west hall. He said to say it was the only thing he could give you that was any use.")),
]

# ------------------------------------------------------------------ Vantry
S["vantry"] = [
    fade("Vantry. The Spindle gate, at dawn."),
    setf({"light": "day"}),
    iff({"flag": "hardlinersGone"}, [n("Hallet's companies are gone, and the forty barrels with them. Nobody knows where.")],
        [n("Hallet's companies are on the left of the line, with the drain detail held back behind them. Nobody talks to them.")]),
    run("millbridgeTurns"),
    {"army": "spindle-gate", "win": [
        setf({"spindleWon": True}),
        n("The Spindle gate goes in at the third push, and the Commons pours up the ward behind it, and the Wardens on the Broodhouse's outer wall throw down their crossbows and run."),
    ], "lose": [
        setf({"spindleWon": False}),
        n("The column breaks at the Spindle gate and falls back down the ward. But Rhea's own section is already in the drain, and the grate's lock is on the inside, and someone has left it open."),
    ]},
    {"regroup": True},
    goto(BH, 15, 19, "up"), stage("af10"),
    n("The Broodhouse's outer yard. Carts with their covers tied down. A well. Behind the inner wall, the long roofs of the brood halls, and the line house between them with smoke coming quietly out of its chimney."),
    iff({"flag": "kith.smoke-grey"}, [n("Smoke comes in behind her through the street gate, with nobody on his back, and stands in the middle of the yard with his ears up, listening for something.")],
        [n("In the corner of the yard there's a kith pen, and in it a huge grey loftbuck with a chewed rope, who lifts his head when Rhea comes in and doesn't put it down again.")]),
]
S["millbridgeTurns"] = [
    iff({"flag": "finchTold"}, [
        iff({"eq": {"millbridge": "elders"}}, [
            iff({"flag": "millbridgeTold"}, [
                n("Millbridge's company is on the right of the line. The reeve sent them with a letter: Millbridge will fight, it says, for the Broodhouse's children, and not for her."),
            ], [
                n("Millbridge's company isn't on the line. A runaway's story got to Millbridge in the winter, about a Larkfold boy and a measure of moss. The reeve called her company home, and sent no letter."),
                setf({"millbridgeGone": True}),
            ]),
        ]),
    ]),
]
S["wardensYard"] = [
    iff({"not": "yardFought"}, [
        n("The Broodhouse's own guard comes out of the stores at a run: Wardens, half-armed, and a hatchery reedcat on a chain."),
        {"regroup": True},
        {"battle": "broodhouse-yard", "win": [n("The yard is clear. The inner gate is shut, and barred from inside."), setf({"yardFought": True})]},
    ], [n("The inner gate is barred.")]),
]
S["halloranYard"] = [
    iff({"stage": "af10"}, [
        iff({"not": "yardFought"}, [run("wardensYard")]),
        n("The bar comes off the inner gate from the inside, and it opens."),
        n("Halloran is standing in the inner yard, by the fire, in his shirt sleeves, with his sword in his hand and his coat folded on a crate. He has been waiting. He has the look of a man who has always known how this would end and is only interested in the details."),
        say("halloran", R("Caddow. I wondered if it would be you or Kane. I'm glad it's you. Kane would have just burned it.")),
        iff({"flag": ["surveyTold"], "not": ["corranDead", "corranWearing"]}, [
            iff({"eq": {"corranFate": "thornwick"}}, [n("Corran comes through the gate behind her. Halloran sees him, and for the first time, something moves in his face.")]),
            iff({"flag": "corranChained"}, [n("Corran comes through the gate behind her, with the irons struck off his wrists for this. Halloran sees him, and for the first time, something moves in his face.")]),
            iff({"flag": "corranInBroodhouse"}, [n("Corran comes out of the west hall with a water yoke on his shoulders, and puts it down, and walks across the yard to stand beside her.")]),
            say("corran", R("There was no column. You never knew where Larkfold was. You'd drawn a cloud on the map where it should be.")),
            say("halloran", R("I drew a question mark, Dace. You answered it.")),
            {"duel": "halloran-two", "win": [run("halloranDown")]},
        ], [
            {"duel": "halloran", "win": [run("halloranDown")]},
        ]),
    ], [n("The inner yard. The fire has burned down.")]),
]
S["halloranDown"] = [
    n("He goes down by the fire, and stays down, and lies there looking at the sky over the Broodhouse as if it's the first time he's noticed it."),
    iff({"not": "surveyTold"}, [
        say("halloran", R("You never found it, did you. The survey. There was never a column, Caddow. Nobody in the Guild could have found your valley with a map and a year.")),
        say("halloran", R("I told Dace a story, and he believed it, because he loved you. That's all. That's all it ever takes.")),
    ]),
    setf({"halloranBeaten": True}),
    n("Then the smell reaches her. Lamp oil, and under it, smoke. Not the line house chimney. The halls."),
    iff({"eq": {"kanePlan": "ahead"}}, [run("burning")], [stage("af11")]),
]

# ------------------------------------------------------------------ the gate
S["theGate"] = [
    iff({"stage": "af11"}, [
        iff({"eq": {"kanePlan": "ahead"}}, [run("burning")], [
            n("Smoke is coming out under the brood hall doors, black and thick, and somewhere inside the west hall children are beginning to scream."),
            n("Hallet's men came up the drain with the oil while the column was at the Spindle gate. They're gone again. The fire isn't."),
            iff({"flag": "corranDead"}, [run("gateHallet")], [
                iff({"flag": "corranWearing"}, [run("gateWearing")], [run("gateClean")])]),
        ]),
    ], [n("The gate.")]),
]
S["gateClean"] = [
    n("Corran is at her side. He's grey in the face and he isn't shaking."),
    say("corran", R("The west hall has a door at the back that the Wardens chained. The children won't know it's there. I know. I watched it for two years.")),
    say("corran", R("I can't carry them all, Rhea. Come with me.")),
    n("They go in together, through the smoke, with wet cloths over their faces, and he takes her to the chained door by touch, and she breaks the chain."),
    n("They come out with the children in a long line, holding hands the way they were made to walk to the trays. The little ones first. Then the bigger ones, carrying the little ones. Then the last of them, and Finch behind the last of them, with the smallest one on his back."),
    n("He puts her down. He looks at Rhea. Then he sees who is with her."),
    run("gateChoice"),
]
S["gateWearing"] = [
    n("Corran is standing in the inner gate, with his back to the fire, between her and the halls. There's a fresh lull on his neck. He's steady as a stone."),
    say("corran", R("You'll get lost in there. You don't know the halls. Let me go in. Let me do one thing.")),
    say("rhea", R("Get out of the way.")),
    say("corran", R("I can't feel anything, Rhea. Do you understand? I can't feel the heat. I can go in where you can't.")),
    n("She doesn't believe him. Why would she? She has believed him before."),
    {"duel": "corran-gate", "win": [
        n("He goes down on the stones of the gate, and lies there smiling at nothing, and doesn't feel it."),
        n("And out of the smoke behind him, one after another, the children come. Finch has found the back door himself. He has a girl on his back and a boy by the hand, and he stops dead in the gate when he sees who is lying in it."),
        run("gateChoice"),
    ]},
]
S["gateHallet"] = [
    n("Someone is standing in the inner gate with a sword, between her and the halls. Not a Warden. A Commons coat."),
    say("hallet", R("Go home, Marshal. It's done. In an hour there won't be a breeding line left in Ostrel. Whatever it cost.")),
    say("rhea", R("Get out of my way, Hallet.")),
    {"duel": "hallet-gate", "win": [
        n("He goes down hard, and his sword skids away across the stones, and Rhea goes past him into the smoke."),
        n("She can't see. She doesn't know the halls. And then, somewhere ahead and to the left, through the roaring, somebody is singing."),
        n("The foal song. The third line right."),
        n("She follows it. It takes her to a door at the back of the west hall, chained from the outside, and she breaks the chain, and Finch comes out of the dark with the children behind him, singing so they'll keep walking."),
        setf({"gateChoice": "none"}),
        run("ending"),
    ]},
]
S["gateChoice"] = [
    choose("Finch is watching. Corran is on the stones at her feet.",
           opt(R("Get up. There are more children in the east hall, and you know the way."), [setf({"gateChoice": "spared"}),
                n("Corran gets up. He goes back into the smoke, and Finch, after a moment, goes with him. They bring out the east hall between them.")], by="rhea",
               hint="Spare him."),
           opt("Kill him", [setf({"gateChoice": "killed", "corranDead": "gate"}), add({"finchTrust": -40}),
                n("She does it quickly. It's the one mercy in it."),
                n("Finch watches the whole thing from the gate, with the girl on his back. Then he turns round, and goes back into the smoke for the east hall, alone.")],
               hint="For Larkfold. In front of Finch.")),
    run("ending"),
]
S["burning"] = [
    n("Kane's sergeant told her the drain detail would go in at noon. It's an hour past noon. She'd have known that, if anyone had told her the truth."),
    n("The brood halls are already burning from end to end, and the line house with them, and the heat comes across the inner yard like a wall. Nobody could go through that. Nobody does."),
    iff({"not": "corranDead"}, [n("Except Corran. She sees him go: one figure going into the fire at the west hall door, the way you'd walk into the sea. He doesn't come out.")]),
    n("And from somewhere inside the west hall, high and steady over the roaring, someone is singing the foal song. The third line right."),
    n("It goes on for a long time."),
    n("Then it stops."),
    setf({"gateChoice": "burning"}),
    run("ending"),
]

# ------------------------------------------------------------------ the endings
S["ending"] = [
    # who's won, by whatever road
    iff({"eq": {"nation.millcities": "pact"}}, [setf({"millcitiesWon": True})]),
    iff({"eq": {"nation.millcities": "held"}}, [setf({"millcitiesWon": True})]),
    iff({"flag": "collegeProof"}, [setf({"collegeWon": True})]),
    iff({"eq": {"nation.college": "pact"}}, [setf({"collegeWon": True})]),
    iff({"eq": {"kanePlan": "ahead"}}, [run("endBurning")], [
        iff({"eq": {"gateChoice": "killed"}}, [run("endEmpty")], [
            iff({"atLeast": {"finchTrust": 35}}, [
                iff({"eq": {"corranFate": "thornwick", "gateChoice": "spared"}, "flag": "tinGiven", "atLeast": {"finchTrust": 60}}, [run("endTable")], [
                    iff({"eq": {"trade": "shut"}, "flag": ["collegeWon", "millcitiesWon"]}, [run("endGreen")], [run("endGuild")])]),
            ], [run("endEmpty")]),
        ]),
    ]),
]
S["endBurning"] = [
    fade("That winter."),
    goto(TW, 13, 12, "up"), {"alone": True}, setf({"light": "dusk"}),
    n("The breeding lines are gone. There will never be another Guild lull bred in Ostrel. Kane was right about that."),
    n("He was right about the rest, too. Half the country goes into the raw that winter, all at once, in the cities and the canal towns and the mill rows. Oda's trays can't breed greenlings fast enough. Nobody's could."),
    n("Rhea spends the winter at Thornwick with the children who were never in the Broodhouse, and doesn't sing."),
    {"end": "burning"},
]
S["endEmpty"] = [
    fade("The war ends in the summer."),
    goto("larkfold", 12, 10, "up"), {"alone": True}, setf({"light": "dusk"}),
    n("The Guild signs at Vantry. The Houses are opened. The children go home, those who have homes."),
    n("Finch doesn't come to the signing. He takes Smoke from the Commons pens the night before, and rides north alone, and nobody stops him, because nobody would have known how."),
    n("Every harvest after that, Rhea goes back up to Larkfold, and stands on the empty terraces at sunset, and sings the foal song out over the cloud."),
    n("Nothing comes."),
    {"end": "empty"},
]
S["endTable"] = [
    fade("The next harvest. Larkfold."),
    goto("larkfold", 12, 10, "up"), {"alone": True}, setf({"light": "dusk"}),
    n("The terraces are green again. Oda planted them in the spring with greenling moss, and the children from the Houses dug them, and Ume came over the ridge to tell them they were doing it wrong."),
    n("On the first night of the harvest there's a table outside the rebuilt house, where the old house stood. Three chairs."),
    n("Finch sits at one end. Corran at the other. Rhea between them. Nobody says very much. Nobody has forgiven anybody anything. They eat."),
    n("When the plates are cleared, Rhea takes the ring off the cord round her neck, the one she's worn since the fire, and puts it on the table between them."),
    n("Nobody picks it up. Nobody has to, yet."),
    {"end": "table"},
]
S["endGreen"] = [
    fade("The Green Year."),
    goto(TW, 13, 12, "up"), {"alone": True}, setf({"light": "day"}),
    n("The Broodhouse is taken whole, and the lines in it are kept alive, and bred down, tray by tray, into greenlings. The Guild breaks in a month. The College puts its name to the weaning, and the Millcities open their cellar clinics to anyone who asks."),
    n("It takes a year to wean the cities. A hard year, with deaths in it. Fewer than anyone feared."),
    n("Finch comes home to Thornwick in the spring, and takes over the kith pens, and doesn't talk about the Broodhouse."),
    iff({"flag": "corranDead"}, [n("Corran isn't there to see it. Rhea goes up to the terrace wall some evenings and sings, and gets the third line right, for both of them.")],
        [n("Corran isn't there to see it. He went south after Vantry, alone, and nobody's heard from him. Some evenings Rhea goes up to the terrace wall and sings, in case.")]),
    {"end": "green"},
]
S["endGuild"] = [
    fade("A year after Vantry."),
    goto(TW, 13, 12, "up"), {"alone": True}, setf({"light": "day"}),
    n("The Commons holds the Broodhouse, and the breeding lines, and the royal charter that came with them."),
    n("There's a peace to pay for, and an army, and a country to feed through the winter. The council votes, and the Broodhouse opens again, under the Commons' seal. The children in it are paid now, and go home at night. The lulls are just as strong."),
    n("Rhea signs the first year's ledger herself. It's the same trade. It has new management."),
    {"end": "guild"},
]

# ------------------------------------------------------------------ actors
def actor(id, map, x, y, look, talk, when=None, **kw):
    a = {"id": id, "map": map, "x": x, "y": y, "look": look}
    if when: a["when"] = when
    if talk is not None: a["talk"] = talk
    a.update(kw)
    return a
def stages(*names): return {"stage": list(names)}
HOME = {"stagePrefix": "af"}
def home(flag): return {"stagePrefix": "af", "flag": flag}
EARLY = ["af1", "af2", "af3", "af4", "af5", "af6", "af7", "af8", "af9"]

actors = [
    # Thornwick in Act IV
    actor("tam", TW, 11, 9, "kid2", [run("runaway4")], {"stage": EARLY}),
    actor("wren-4", TW, 12, 9, "child", [say("wren", R("Tam's teaching the Lockside lot a game from the Houses. It's mostly hiding. They're very good at it."))], {"stage": EARLY}),
    actor("tamsin-4", TW, 11, 12, "tamsin", [iff({"flag": "finchTold"}, [say("tamsin", R("Whatever he told you down there, you've been carrying it round since like a full pail. Put it down for an hour. I'll hold it."))],
                                               [say("tamsin", R("Commander Caddow. Larkfold would have laughed itself sick. Then it would have followed you anywhere."))])], HOME),
    actor("oda-4", TW, 17, 9, "oda", [say("oda", R("Every tray I've got is breeding, child. If you're going where I think you're going, there'll be four hundred more needing them by spring."))], home("recruited.oda")),
    actor("dorrit-4", TW, 6, 11, "dorrit", [run("oilLedger")], home("recruited.dorrit")),
    actor("qm-4", TW, 6, 11, "varro", [run("oilLedger")], {"stage": "af6", "not": "recruited.dorrit"}),
    actor("haldane-4", TW, 18, 12, "haldane", [say("haldane", R("If you bring those children out of the Broodhouse, bring me their numbers. Not for the books. So I know how many trays."))], home("recruited.haldane")),
    actor("posy-4", TW, 7, 4, "posy", [say("posy", R("Four hundred. I keep saying it to myself, so it'll mean something. It doesn't. It's just a lot of Mires."))], {"stagePrefix": "af", "flag": "recruited.posy", "not": "party.posy"}),
    actor("corran-4", TW, 5, 4, "corran", [say("corran", R("The Broodhouse halls run north and south, with the line house between. The back doors of the halls are chained. I walked them with Halloran. I'll draw you every door I remember."))],
          {"stage": ["af6", "af7", "af8"], "eq": {"corranFate": "thornwick"}}),
    # the camp
    actor("varro-4", "camp", 13, 5, "varro", [say("varro", R("Talk to Kane, Caddow. Then talk to me."))], stages("af2", "af7")),
    actor("hallet-4", "camp", 17, 5, "hallet", [say("hallet", R("Commander."))], {"stage": "af2"}),
    # the grate
    actor("finch-grate", "underdrain", 26, 3, "finch", [run("grate")], stages("af4")),
    # the Broodhouse
    actor("halloran-4", BH, 15, 10, "halloran", [run("halloranYard")], stages("af10")),
    actor("gate-corran", BH, 15, 12, "corran", [run("theGate")], {"stage": "af11", "not": "corranDead"}),
    actor("gate-hallet", BH, 16, 12, "hallet", [run("theGate")], {"stage": "af11", "flag": "corranDead", "eq": {"kanePlan": "stopped"}}),
    actor("smoke-bh", BH, 26, 18, "loftbuck", [n("The grey loftbuck. He won't settle. He keeps turning his head toward the west hall.")], {"stage": ["af10", "af11"]}),
]

# ------------------------------------------------------------------ steps, zones, looks
def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s
steps = [
    step("land-millcities", (20, 12), [run("drainIn4")], stages("af3")),
    step("land-millcities", (20, 12), [run("vantry")], stages("af9")),
    *[step("underdrain", (0, y), [goto("land-millcities", 20, 13, "down")]) for y in (3, 4)],
    step("underdrain", (10, 0), [n("The old Mire drain. Somebody has chalked a little drawing of a girl with a slate on the bricks.")]),
    *[step(BH, (x, 21), [toast("Not now. Not with the children still in there.")], stages("af10", "af11")) for x in (15, 16)],
    *[step(BH, (x, 13), [run("halloranYard")], {"stage": "af10"}) for x in (15, 16)],
    *[step(TW, (x, 15), [toast("Not now.")], stages("af1", "af6")) for x in (13, 14)],
]
zones = [
    {"map": TW, "area": [3, 14, 4, 14], "when": stages("af5", "af8"), "do": [run("thornBed4")]},
    {"map": "underdrain", "area": [23, 3, 23, 4], "when": stages("af4"), "do": [run("grate")]},
    {"map": BH, "area": [12, 14, 19, 16], "when": {"stage": "af10", "not": "yardFought"}, "do": [run("wardensYard")]},
]
looks = [
    {"map": BH, "tile": "tray", "do": [n("Broodhouse trays, row on row, the moss turned by small hands. The larvae twist toward the lamps.")]},
    {"map": BH, "tile": "shelf", "do": [n("The line house shelves. Two sealed tanks, warm to the touch, each with a brass plate: the Guild's breeding lines.")]},
    {"map": BH, "tile": "hay", "do": [n("Hay for the Wardens' loftbucks.")]},
    {"map": "underdrain", "tile": "fence", "do": [n("The grate. The lock is on the far side, where nobody in the drain can reach it.")]},
    {"map": "underdrain", "tile": "water", "do": [n("Warm water from the Broodhouse halls, running down to the canal.")]},
]
songs = [
    {"when": {"map": BH, "stage": "af10"}, "near": "smoke-bh", "range": 6, "do": [
        n("Rhea sings a line of the foal song. The grey loftbuck comes to her at once, and stands at her shoulder, and won't be sent away.")]},
]

# ------------------------------------------------------------------ battles and duels
def unit(id, name, look, row, at, **kw):
    return {"id": id, "name": name, "look": look, "side": "foe", "row": row, **kw, "at": at}

BATTLES = {
    "broodhouse-yard": {
        "id": "broodhouse-yard", "name": "The Broodhouse guard", "backdrop": "yard", "party": True,
        "intro": ["The Broodhouse's own guard, out of the stores at a run, and a hatchery reedcat on a chain.", "The inner gate is behind them."],
        "won": "The outer yard is clear", "lost": "Driven back to the street gate",
        "units": [unit("by1", "Warden", "warden", "front", [170, 94], cast="warden", level=22, skills=["wstrike"]),
                  unit("by2", "Warden", "warden", "front", [196, 116], cast="warden", level=22, skills=["wstrike"]),
                  unit("byc", "Hatchery reedcat", "reedcat:#6a5a4a", "front", [162, 130], hp=60, kith=True, level=22, skills=["maul", "pounce"], species="market-reedcat"),
                  unit("bya", "Warden crossbow", "archer", "back", [230, 100], cast="archer", level=22, skills=["bow"])]},
}

def duel(name, backdrop, intro, foe, words, won, lost, must=True):
    return {"name": name, "backdrop": backdrop, "mustWin": must, "intro": intro, "foe": foe, "words": words, "won": won, "lost": lost}
def foe(name, look, cast, level, moves, feint, hit, hurt, yld, down):
    return {"name": name, "look": look, "cast": cast, "level": level, "moves": dict(zip(("high", "low", "thrust"), moves)), "feint": feint,
            "lines": {"hit": hit, "hurt": hurt, "yield": yld, "down": down}}
def word(id, label, attr, vs, amount, line, land, miss):
    return {"id": id, "label": label, "attr": attr, "vs": vs, "effect": "resolve", "amount": amount, "line": line, "land": land, "miss": miss}

DUELS = {
    "kane-tent": duel("Kane", "yard",
        ["Kane, in his own tent, with his sword out. He has drilled half the Commons Army himself. He fights the way he plans: patiently."],
        foe("Marshal Kane", "kane", "kane", 24, (2, 2, 3), 0.25,
            ["His point opens your sleeve.", "The flat of his blade cracks across your wrist."], ["He steps back, measuring.", "He breathes out hard through his nose."],
            "He lowers the point, and looks at it as if it belongs to someone else.", "Your blow drives him back into the map table."),
        [word("sum", R("You did the sum. Do it again."), "wits", "wits", 30, R("You did the sum. Four hundred against the rest. Do it again, with my brother in it."), "His guard falters. He's doing it.", "\"I have,\" he says. \"It comes out the same.\""),
         word("kept", R("You kept me in the war. Here I am."), "presence", "nerve", 35, R("You kept me in the war, Kane. Here I am. This is what you kept."), "He hears it. The point wavers.", "He doesn't hear it. He doesn't let himself.")],
        "Kane is down", "Kane holds his tent"),
    "halloran": duel("Halloran", "yard",
        ["Halloran, in his shirt sleeves, by the fire in the inner yard. Thirty years a Warden. He doesn't waste a step."],
        foe("Captain Halloran", "halloran", "halloran", 30, (3, 2, 3), 0.3,
            ["His blade comes round faster than it should.", "He steps inside your guard and hits you with the hilt."], ["He gives ground, a step.", "Blood on his sleeve. He looks at it, interested."],
            "He sets his sword down on the stones, and sits beside it.", "Your blow takes him across the ribs."),
        [word("larkfold", R("You drew a question mark."), "presence", "nerve", 30, R("You drew a question mark where Larkfold was, and you let a man burn his home to answer it."), "Something closes in his face. His next step is short.", "\"That's war, Caddow. Everyone draws question marks.\""),
         word("children", R("Four hundred children."), "heart", "nerve", 25, R("There are four hundred children in those halls. Yours. You put them there."), "He glances at the halls. Just once.", "He doesn't look. He's made a point of never looking.")],
        "Halloran is down", "Thrown down by the fire"),
    "halloran-two": duel("Halloran", "yard",
        ["Halloran, by the fire in the inner yard. Corran is beside you. Every time Halloran turns to one, the other is there."],
        foe("Captain Halloran", "halloran", "halloran", 27, (3, 2, 3), 0.2,
            ["His blade comes round faster than it should.", "He gets past you, and Corran is there, and only just."], ["He gives ground.", "He has to turn to watch Corran, and you're there."],
            "He sets his sword down on the stones, and sits beside it.", "Your blow and Corran's land together."),
        [word("dace", R("Look at him, Halloran."), "presence", "nerve", 35, R("Look at him. Look at what you made of him, with one story."), "He looks at Corran. It's a mistake, and he knows it as he makes it.", "\"I made a Warden of him once. He unmade himself.\""),
         word("larkfold", R("You drew a question mark."), "wits", "wits", 30, R("You drew a question mark where Larkfold was. We found the map."), "That reaches him. He didn't know it had been found.", "He shrugs. \"Then you know what I am. Good.\"")],
        "Halloran is down", "Thrown down by the fire"),
    "corran-gate": duel("Corran", "fire",
        ["Corran, in the inner gate with the fire behind him and a fresh lull on his neck. He can't feel the heat. He can't feel anything."],
        foe("Corran", "corran", "corran", 22, (2, 3, 2), 0.1,
            ["He hits you, and doesn't seem to notice he's done it.", "He shoves you back from the gate."], ["Your blow lands. He doesn't flinch. He doesn't feel it.", "He staggers, and smiles."],
            "He sits down in the gate, very suddenly, and looks at his hands.", "He goes down on the stones."),
        [word("song", "Sing the third line", "heart", "nerve", 40, "You sing the third line of the foal song, the one he always got wrong.", "He stops. Under the lull, something in him stops.", "He doesn't hear it. The lull hears everything for him."),
         word("finch", R("Finch is in there."), "presence", "nerve", 30, R("Finch is in there, Corran. Get out of my way."), "His face changes. The lull can't quite hold it.", "\"I know,\" he says, calmly. \"That's why it has to be me.\"")],
        "Corran is down", "Knocked back from the gate"),
    "hallet-gate": duel("Hallet", "fire",
        ["Hallet, in the inner gate, in a Commons coat, with the fire behind him."],
        foe("Captain Hallet", "hallet", "hallet", 26, (3, 2, 2), 0.2,
            ["He's strong. Your arm goes numb to the shoulder.", "He drives you back a step toward the yard."], ["He grunts, and gives no ground.", "He wipes his eyes. The smoke's in them."],
            "He throws his sword down. \"Go on, then. Go and burn with them.\"", "You get under his guard."),
        [word("coat", R("You're wearing a Commons coat."), "presence", "nerve", 30, R("You're wearing a Commons coat, Hallet. There are children behind you."), "He looks down at the coat. His sword drops an inch.", "\"So are you. Look where it's got us.\""),
         word("song", "Listen", "heart", "nerve", 25, "You stop, in the smoke, and make him listen to what's coming out of the halls.", "He listens. Nobody could not.", "He won't listen. He's made himself deaf to it on purpose.")],
        "Hallet is down", "Thrown back from the gate"),
}

# ------------------------------------------------------------------ voices and music
voiced = ["runaway4", "council4", "grate", "finchTruth", "finchShut", "kaneOil", "arrestKane", "relapse", "halloranYard", "halloranDown",
          "gateClean", "gateWearing", "gateHallet"]
moods = {
    "scenes": {"act4Start": "hope", "runaway4": "tender", "council4": "camp", "kane4": "camp", "drainIn4": "dread", "grate": "grief", "finchTruth": "grief",
               "finchShut": "grief", "thornBed4": "night", "corranAutumn": "night", "corranRoom": "tender", "corranHalls": "grief", "corranGaol": "dread",
               "backToRhea6": "camp", "oilLedger": "tension", "millbridgeWord": "tension", "kaneOil": "dread", "arrestKane": "tension", "kaneTaken": "tension",
               "planAhead": "dread", "winter4": "night", "relapse": "dread", "relapseChained": "night", "vantry": "tension", "millbridgeTurns": "tension",
               "wardensYard": "fire", "halloranYard": "dread", "halloranDown": "fire", "theGate": "fire", "gateClean": "fire", "gateWearing": "fire",
               "gateHallet": "fire", "gateChoice": "grief", "burning": "grief", "ending": "grief", "endBurning": "grief", "endEmpty": "grief",
               "endTable": "tender", "endGreen": "hope", "endGuild": "dread"},
    "stages": {"af4": "dread", "af10": "tension", "af11": "fire", "ag1": "night"},
}

story = {"id": "act4", "title": "Act IV: The Broodhouse", "voiced": voiced, "moods": moods, "cast": cast, "objectives": objectives,
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
