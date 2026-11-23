"""Builds data/story/act3.json and Act III's battles: from the morning after the girl from Mire walks up to Thornwick,
through the raids on the Houses' hatcheries, to the next summer, when Rhea is made Captain.
Rhea's stages start "ad", Corran's interludes "ae". Run: python3 tools/story/act3.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2 import say, n, stage, run, fade, goto, setf, add, toast, iff, opt, choose, R  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "../..")
OUT = os.path.join(ROOT, "data/story/act3.json")
TW = "thornwick"

cast = {"wren": "Wren", "hallet": "Captain Hallet", "haldane": "Professor Haldane", "fennick": "Fennick"}

objectives = {
    "ad1": "Wren, the girl who walked from Mire, is sitting by the warm pool.",
    "ad2": "Take Wren's slate down to Kane. His tent is at the top of the Commons camp.",
    "ad3": "Take the Guild checkpoint on the road south, below the ruins of Sallow at the bottom of the Vale.",
    "ad4": "Varro is waiting at Lockside, in the Millcities. Go there after dark.",
    "ad5": "Wake the children at the trays in the brood house, the long building on the left.",
    "ad6": "A rider on a grey loftbuck is holding the gate.",
    "ad6b": "Take the children out through the gate, and north.",
    "ad7": "A rider has come up from the camp. He's at the gate.",
    "ad8": "Kell's Bridge at dusk. Varro is on this bank, with the prisoners.",
    "ad9": "Go and find Kane. He's in his tent.",
    "ad10": "Go home to Thornwick. Turn in at your tent, in the south-west corner.",
    "ad11": "An old man in a physician's robe is at the gate.",
    "ad12": "Kane has sent for his officers. Go down to the Commons camp.",
    "ad13": "Wren's drain comes out on the canal bank at Cinderwick, in the Millcities. Go there at midnight.",
    "ad14": "Follow the drain east, under Vantry's wall.",
    "ad15": "House Mire. The records room is top right. The brood room is on the left, and there are guards at its door.",
    "ad16": "Corran is in the old bathhouse, in the north-west corner.",
    "ad16l": "Posy is sitting by the warm pool.",
    "ad17": "Turn in at your tent.",
    "ad18": "Summer. Professor Haldane is waiting in the chapel with his ledger.",
    "ad19": "Kane and the officers have come up to Thornwick. They're in the chapel.",
    "ad19b": "Lockside. Hold Corvel's hatchery against the Warden column.",
    "ad20": "Evening. Turn in when you're ready.",
    "ae1": "The tin is on the table.",
    "ae2": "Halloran is waiting for you in the yard.",
    "ae3": "The raw. Posy is by the sick-room door.",
    "ae4": "Someone is standing over your pallet.",
}

S = {}

# ------------------------------------------------------------------ autumn: Wren's slate
S["act3Start"] = [
    fade("Morning."),
    setf({"act3": True, "light": "day", "hero": "rhea"}),
    stage("ad1"), goto(TW, 13, 12, "up"), {"alone": True},
    n("The girl from Mire slept by the warm pool all night under Ketti's blanket. In the morning she tells Rhea her name is Wren, and asks for something to draw with."),
]
S["wrenSlate"] = [
    iff({"stage": "ad1"}, [
        n("Wren has found a roofing slate and a lump of chalk. She has drawn a building on it, room by room, with her tongue between her teeth."),
        say("wren", R("That's Mire. That's the brood room, where the trays are. Them's the boilers. That's where the north one went.")),
        say("wren", R("That's the sick room. They put you in there when you're too bit to work. And that's the records, where the clerks write your number down.")),
        say("rhea", R("And this line, going under the wall?")),
        say("wren", R("That's the drain. The water from the brood room runs out that way, under the wall, to the canal at Cinderwick. It's not very big. I'm not very big.")),
        n("She walked out of Vantry through a drain, and up a mountain, on her own. She's ten."),
        choose("Wren holds the slate out.",
               opt(R("Can I keep this?"), [say("wren", R("You can have it. I don't want to look at it any more."))], by="rhea"),
               opt(R("You're very brave, Wren."), [say("wren", R("No I'm not. I was just more scared of staying.")), n("She pushes the slate into Rhea's hands.")], by="rhea")),
        setf({"slate": True}),
        stage("ad2"),
    ], [iff({"flag": "lockFreed"}, [say("wren", R("Tam from the Lockside lot says she knows my cousin. She doesn't. But I like her."))],
                                    [say("wren", R("Ketti says I can keep the blanket."))])]),
]

S["kane3"] = [
    iff({"stage": "ad2"}, [run("council")], [
        iff({"stage": "ad9"}, [run("kaneFinch")], [
            iff({"stage": "ad12"}, [run("councilMire")], [say("kane", R("Lieutenant. You have your orders."))])])]),
]
S["council"] = [
    n("Kane's tent is full. Varro is there, and a broad captain with a burn scar down one cheek and a dented steel gorget at his throat, who doesn't get up."),
    say("kane", R("Caddow. You know Varro. This is Captain Hallet. He holds the Vantry road for me.")),
    say("hallet", R("The Thornwick lieutenant. The one who sings to kith.")),
    n("Rhea puts Wren's slate down on the map table."),
    say("rhea", R("A girl walked up the mountain from House Mire. She drew this. The brood room, the boilers, the records. And a drain under Vantry's wall that a child can walk through.")),
    n("Kane looks at it for a long time without touching it."),
    say("kane", R("Every hatchery the Houses keep outside Vantry is guarded by two dozen men and a few Wardens. Inside the wall, nobody has ever got near one.")),
    say("kane", R("Keep that slate safe, Lieutenant. Mire is for the spring.")),
    say("varro", R("For the autumn there's Lockside. House Corvel's outer hatchery, on the canal. Ninety children, give or take. I've had a man watching it since the summer.")),
    say("hallet", R("And between here and Lockside there's a Guild checkpoint on the Sallow road. A barrier and a dozen Wardens. Nobody gets into the Millcities without papers.")),
    say("kane", R("Which is why the Thornwick company is going to take it. Then you go on to Lockside after dark and meet Varro there. You open the brood house. Varro holds the yard.")),
    iff({"eq": {"trade": "shut"}}, [say("kane", R("You shut my road over the Cloudline, Caddow. This is how you make it up to the army. You open me another one."))],
        [say("kane", R("The crates still go down your road, and the army's eating. Now let's give it something to be proud of."))]),
    say("hallet", R("And the children? Ninety brats on the Lockside road, with the Wardens coming up behind them?")),
    say("rhea", R("I'll walk them up to Thornwick myself.")),
    say("kane", R("Then that's settled.")),
    toast("The Guild checkpoint is below the ruins of Sallow, at the bottom of the Vale."),
    stage("ad3"),
]

# ------------------------------------------------------------------ the Sallow checkpoint
S["checkpoint"] = [
    n("Below the burned shell of Sallow, the Guild has put a barrier across the road south: a pole on a pivot, a guardhouse, a brazier. Wardens behind it, and a tracker reedcat chained to the post."),
    iff({"flag": "party.tamsin"}, [say("tamsin", R("They're not even looking north. Nobody has ever come at them from the north."))]),
    {"regroup": True},
    {"battle": "sallow-checkpoint", "win": [
        n("The Wardens run south down the road toward the Millcities. The barrier pole goes into the ditch."),
        n("In the guardhouse there's a stack of papers on a nail. Indenture passes, for children moved south in the carts. A name and a number on every one."),
        choose("The passes on the nail.",
               opt(R("Burn them. Every one."), [setf({"passes": "burned"}), n("The children's numbers go up the guardhouse chimney.")], by="rhea", hint="Nobody can be hunted down by a number that's gone."),
               opt(R("Keep them. Kane will want to know who's been moved, and where."), [setf({"passes": "kept"}), add({"kaneTrust": 5})], by="rhea", hint="They're worth something to the army.")),
        setf({"open.vale-millcities": True}),
        toast("The road south into the Millcities is open."),
        stage("ad4"),
    ]},
]

# ------------------------------------------------------------------ Lockside, at night
S["lockside"] = [
    fade("Lockside. After dark."),
    setf({"light": "night"}), {"regroup": True},
    goto("lockhatch", 13, 14, "up"),
    n("House Corvel's outer hatchery stands on the canal bank behind a brick wall. The gate is open. Varro's people already have the watchmen tied up in the gatehouse."),
    say("varro", R("Quietly, Caddow. The brood house is the long building on your left. The officers' house is dark. Get the children moving before anyone wakes up.")),
    stage("ad5"),
]
for i, line in enumerate([
        "A boy asleep with his cheek on the tray rim. You shake him awake and put a finger to your lips. He understands at once. They all know how to be quiet.",
        "Two girls, holding hands under the tray. The older one looks at your coat, and then at your face, and starts waking the others herself.",
        "A little one who won't let go of his tray. He's been told, every day, that the trays come first. You tell him the trays can look after themselves tonight."], start=1):
    S[f"lockKid{i}"] = [
        iff({"stage": "ad5"}, [
            iff({"flag": f"lock.k{i}"}, [n("Awake, and waiting by the door.")], [n(line), setf({f"lock.k{i}": True})]),
            iff({"flag": ["lock.k1", "lock.k2", "lock.k3"]}, [run("lockGuards")]),
        ], [n("The children are waiting, very still.")]),
    ]
S["lockGuards"] = [
    n("Lamps at the boiler end. Corvel's house guards, half-dressed, with cudgels and a hatchery reedcat on a chain."),
    {"regroup": True},
    {"battle": "lockside-guards", "win": [
        n("The guards are down or gone. The children come out of the brood house in a long line, holding hands, the way they're made to walk to the trays."),
        n("Then hooves on the cobbles. A rider on a huge grey loftbuck comes round the end of the officers' house at a gallop, and pulls up across the gate, between the children and the road."),
        n("He wears a Warden's helm with the visor down. He has a spear. He doesn't say a word."),
        say("warden2", R("Ninety! Hold them, Ninety! Hold the gate!")),
        n("The shout comes from the gatehouse, where Varro's people are sitting on the watchmen. Somebody shuts him up."),
        stage("ad6"),
    ]},
]
S["lockRider"] = [
    iff({"stage": "ad6"}, [
        n("The grey loftbuck stamps and blows. The rider levels his spear. Behind you, ninety children are waiting to go through that gate."),
        say("rhea", R("Let them through. Nobody has to get hurt.")),
        n("The rider doesn't answer. He touches his heels to the grey."),
        {"duel": "lockside-rider", "win": [
            n("The grey goes up on its hind legs. The rider comes off backwards onto the cobbles and lies there winded, his helm knocked crooked over his face."),
            n("Varro's people are on him before he can get up. They bind his hands and pull a sack over his head, the way the Commons takes every prisoner."),
            n("The grey won't let anyone near. It stands over its rider and screams at anyone who comes close, until someone gets a rope on it."),
            say("varro", R("Go, Caddow. Get them out on the north road before the Wardens come up from Cinderwick. We'll take this lot down to the camp. Kane will want to trade for a rider like that.")),
            choose("Varro is waiting for an answer about the prisoners.",
                   opt(R("Feed them and keep them warm. Nobody lays a hand on them. Tell the stockade that's my order."), [
                       setf({"lockOrder": "kind"}), add({"finchTrust": 8}),
                       say("varro", R("I'll tell them."))], by="rhea", hint="They're someone's children too."),
                   opt(R("They're Wardens. Whatever Kane wants."), [
                       setf({"lockOrder": "kane"}), add({"finchTrust": -6}),
                       say("varro", R("Kane wants them alive and fit to trade. That's all he wants."))], by="rhea", hint="Leave it to the Marshal.")),
            setf({"lockFreed": True}),
            stage("ad6b"),
        ]},
    ], [n("Hoof marks on the cobbles, and a dent in the stones where the rider fell.")]),
]
S["northRoad"] = [
    fade("Nine days on the north road, with ninety-one children."),
    goto(TW, 13, 12, "up"), {"alone": True}, setf({"light": "dusk"}),
    n("Nine days of walking, with the youngest carried in turns and the oldest carrying the youngest. Nobody is lost. Oda counts them through the gate twice, because she doesn't believe it the first time."),
    n("Wren runs down the line of them, looking at faces. She stops at one, a thin girl of twelve, and the two of them stand and stare at each other, and then they're both crying."),
    n("Ninety-one children asleep in the chapel. The section sleeps in the bathhouse."),
    n("On the ninth evening a rider comes up the road from the camp."),
    stage("ad7"),
]

# ------------------------------------------------------------------ the exchange at Kell's Bridge
S["exchangeRider"] = [
    iff({"stage": "ad7"}, [
        say("rider", R("From the Marshal, Lieutenant. The Guild wants its people back from Lockside, and it's paying well: seven of ours for six of theirs and the rider. Kell's Bridge, tomorrow at dusk.")),
        say("rider", R("The Marshal wants the officer who took the hatchery there.")),
        say("rhea", R("Varro took the prisoners.")),
        say("rider", R("Varro's there too. He said to tell you the rider's well. Eats everything he's given. Hasn't said a word.")),
        {"regroup": True},
        fade("Down the mountain, and along the Kerrow."),
        setf({"light": "dusk"}),
        stage("ad8"), goto("kellsbridge", 12, 12, "up"),
        n("Kell's Bridge again, a year after the last time. The Commons tents on this bank. The Guild's grey ones on the far side."),
    ], [say("rider", R("Kell's Bridge, Lieutenant. Tomorrow at dusk."))]),
]
S["exchange"] = [
    iff({"stage": "ad8"}, [
        say("varro", R("Seven of ours for their six, and the rider. They want him badly, Caddow. Badly enough that I've wondered who he is.")),
        n("The Guild's officer waves from the far end of the bridge. The prisoners go out in a line, hooded, the Commons way, so they can't count the tents. Seven Commons soldiers come the other way, thin and blinking."),
        n("The rider goes last, leading the grey loftbuck on a short rope. On foot he's slighter than he looked in the saddle."),
        n("The sun goes down behind the Cloudline and the river turns copper. It's harvest week. Without thinking about it, the way she does at this hour every harvest, Rhea starts to hum."),
        n("The foal song. Low, and slow."),
        n("On the bridge, the grey loftbuck stops dead."),
        n("Its ears swing round to her. Then it turns its whole body, hooves scraping on the stone, and starts back toward her, and drags the rider with it. A step. Two. His heels skid."),
        n("The sack slips off his head."),
        n("Sandy hair, grown long. Freckles. Taller. Fifteen."),
        n("Finch."),
        n("And the grey is Smoke. Grown huge, gone grey all over, and still coming to the song."),
        n("Finch is past the middle of the bridge. Two Wardens on the far bank have their crossbows up. Varro has Rhea by the arm before she knows she has moved."),
        choose("Finch is looking straight at her.",
               opt(R("Finch!"), [
                   setf({"bridgeAct": "called"}), add({"finchTrust": 4}),
                   say("finch", R("Nine days. I was nine days in your stockade, and I asked for you every morning.")),
                   say("finch", R("You didn't come. You never come.")),
               ], by="rhea", hint="Call his name."),
               opt("Keep singing", [
                   setf({"bridgeAct": "sang"}),
                   n("She sings. Smoke strains at the rope toward her, groaning. Finch puts his face against the big grey neck and says something into its coat that nobody else hears."),
                   say("finch", R("Don't. Don't you dare sing to him.")),
               ], hint="Sing to Smoke."),
               opt("Run onto the bridge", [
                   setf({"bridgeAct": "ran"}), add({"finchTrust": 2}),
                   n("She tears free of Varro and gets three steps onto the stone. A crossbow bolt cracks off the bridge at her feet. Varro and two of the returned soldiers drag her back."),
                   say("finch", R("Stop it. They'll shoot you, and they'll say I did it.")),
               ], hint="Go after him.")),
        n("Finch hauls Smoke's head round, hard, and walks him off the bridge into the grey tents. He doesn't look back. Smoke does, all the way."),
        setf({"finchSeen": True}),
        stage("ad9"),
        run("varroAfter"),
    ], [run("varroAfter")]),
]
S["varroAfter"] = [
    say("varro", R("Caddow. I didn't know. I swear to you I didn't know.")),
    say("varro", R("The stockade sergeant said he asked for the Thornwick lieutenant every morning. By that name. I thought he wanted to spit at you for Lockside.")),
    iff({"eq": {"lockOrder": "kind"}}, [say("varro", R("They all knew you'd ordered them fed and kept warm. I think that's why he asked."))]),
    say("varro", R("The orders came from Kane's tent. The prisoners speak to nobody, and nobody speaks to them. I didn't think anything of it. Kane is always careful.")),
]
S["toKane"] = [
    fade("The Commons camp, before dawn."),
    goto("camp", 1, 9, "right"),
]
S["kaneFinch"] = [
    n("Kane is up, at the map table, as if he has been waiting for her all night."),
    say("rhea", R("You knew.")),
    say("kane", R("He gave his name the first night. Finch Caddow, of Larkfold. The stockade sergeant brought it to me, and I read it, and I burned it.")),
    say("kane", R("Sit down, Lieutenant.")),
    n("She doesn't."),
    say("kane", R("He rode for the Guild. He held a gate against my soldiers. If I'd told you, you'd have come down that mountain and sat in the stockade with him for nine days, and on the tenth you'd have traded the war for him.")),
    say("kane", R("The Guild would have had you the way it had Dace. I won't apologise for keeping you in the war. It's the only thing I've ever kept from you.")),
    choose("Kane waits.",
           opt(R("He's my brother. You had no right."), [
               add({"kaneTrust": -15}),
               say("kane", R("I had every right. I'm the Marshal. You'll hate me for a month, and then you'll take Mire for me.")),
           ], by="rhea", hint="Say it."),
           opt("Say nothing, and walk out", [
               add({"kaneTrust": -5}),
               n("She walks out of the tent without a word. Behind her, Kane doesn't call her back."),
           ], hint="Keep it."),
           opt(R("If you ever keep my family from me again, I'll take my company and go."), [
               add({"kaneTrust": -25}), setf({"kaneWarned": True}),
               say("kane", R("Noted, Lieutenant.")),
               n("He goes back to his map. His hand isn't quite steady on it."),
           ], by="rhea", hint="A threat, and he'll remember it.")),
    setf({"kaneKnewFinch": True}),
    stage("ad10"),
]

# ------------------------------------------------------------------ Corran: Lockside, the night of the raid
S["raidNight"] = [
    {"hero": "corran"}, {"alone": True}, setf({"light": "night", "showHold": True}),
    stage("ae1"), goto("lockhatch", 21, 4, "left"),
    n("Lockside. The night of the raid."),
    n("Halloran sent you out of Vantry after the bell. A quiet posting, out of the Houses' sight: the night guard at House Corvel's outer hatchery, on the canal. Finch came with you. He's fifteen, and he rides with the night patrol now."),
    iff({"eq": {"birthday": "kept"}}, [n("He rides a big grey loftbuck the Wardens took out of the highlands. He found it in the remount pens and wouldn't leave without it. You paid for it out of your own pay. It's the only thing he has ever asked you for.")],
        [n("He rides a big grey loftbuck the Wardens took out of the highlands. He found it in the remount pens and paid for it himself, a coin a week. He didn't ask you.")]),
]
S["raidTin"] = [
    iff({"stage": "ae1"}, [
        choose("The tin is on the table. The patrol goes out at midnight without you.",
               opt("Put it on", [
                   setf({"raidNight": "lull", "mods.corran": "lull"}), add({"hold": -12, "rings.corran": 1}),
                   n("The officers' house goes quiet and warm and far away."),
                   n("Somewhere a long way off, a bell is ringing. Someone is shouting your name: Finch's voice, at the door. It doesn't seem to need you."),
                   n("You sleep."),
               ], hint="The night will go by smoothly."),
               opt("Leave it in the tin", [
                   setf({"raidNight": "raw", "mods.corran": "raw"}), add({"hold": 6}),
                   n("By midnight the raw has you. Fever, and the shakes, and the floor tilting under you."),
                   n("The bell goes. You get as far as the door and your legs fold."),
                   say("finch", R("Stay down. Stay down, Corran. I'll take the patrol out.")),
                   say("corran", R("Finch. Finch, don't.")),
                   n("The door bangs. Hooves on the cobbles. You lie on the floor and listen to the yard fill with shouting, and can't get up."),
               ], hint="And lie in the raw.")),
        fade("Dawn."),
        setf({"light": "day"}),
        stage("ae2"), goto("lockhatch", 13, 10, "down"),
        n("The brood house is empty. The trays are overturned. Ninety-one children are gone. There's blood on the cobbles by the gate, and hoof marks, and a Warden's helm lying on its side."),
        n("Finch's helm."),
    ], [n("The table. An empty tin.")]),
]
S["halloranStrip"] = [
    iff({"stage": "ae2"}, [
        say("halloran", R("He held the gate. Your boy. Alone, with four men behind him who ran. He held it until the children were nearly through.")),
        say("halloran", R("Then the Commons' Thornwick lieutenant put him on his back in the yard. Caddow. With a staff. They have him in their stockade now.")),
        n("Halloran watches your face while he says the name."),
        say("halloran", R("We'll trade for him. He's worth it. You, Dace, are not.")),
        iff({"eq": {"raidNight": "lull"}}, [
            say("halloran", R("Where were you?")),
            n("You don't answer. Halloran turns your collar down with one finger and looks at the fresh lull on your neck."),
            n("He takes it off you himself. It comes away with a small wet sound. The world comes back all at once, much too loud."),
        ], [
            say("halloran", R("They tell me you were on the floor. Sick.")),
            say("corran", R("Yes.")),
            n("He turns your collar down with one finger and looks at the rings, all the way to your jaw. Then he has the tin brought from the table and drops it in the canal."),
        ]),
        say("halloran", R("The House of Corvel will want to know why its hatchery fell with a Warden lieutenant in the officers' house. I'll tell them. You're finished, Dace.")),
        say("halloran", R("House Mire is short of hands in its brood rooms since the boiler. You'll be a pair of hands. You know the way.")),
        setf({"rank.corran": "", "corranStripped": True, "mods.corran": "raw"}),
        fade("House Mire's brood rooms. Two weeks later."),
        setf({"light": "steam"}),
        stage("ae3"), goto("mire", 15, 10, "left"),
        n("The raw, without end. You can't keep water down. You can't lie still. The children step round your pallet on their way to the trays and don't look at you."),
    ], [say("halloran", R("Go and wait by the gate, Dace."))]),
]
S["posyRaw"] = [
    iff({"stage": "ae3"}, [
        n("Posy kneels by your pallet with a cup. She holds the back of your head up so you can drink, as if she has done it a hundred times. She probably has."),
        say("posy", R("Small sips. If you gulp it you'll bring it back up, and I'll have to fetch another, and I'm not fetching another.")),
        say("corran", R("Why?")),
        iff({"eq": {"bellNight": "clean"}}, [
            say("posy", R("Because you came in after them. The night of the bell. I saw you carry them out.")),
        ], [
            say("posy", R("Not for you. For them. If you die in here the little ones have to carry you out. They've carried enough.")),
        ]),
        n("She comes back the next night, and the next. She doesn't talk much. She sits with her back against the wall, and when the shaking is very bad she puts her hand flat on your chest and leaves it there."),
        add({"hold": 8}),
        setf({"posyNights": True, "light": "night"}),
        fade("The ninth night."),
        stage("ae4"),
        n("Somebody is standing over your pallet. Not Posy."),
    ], [n("Posy is at the trays. She doesn't look up.")]),
]
S["guardOffer"] = [
    iff({"stage": "ae4"}, [
        say("warden2", R("Dace. Lieutenant Dace. Look at you.")),
        n("He crouches, and opens his hand. A tin. A fresh lull in it, fat and blue, still moving."),
        say("warden2", R("Some of the brats are going to run. Down the drain, the way that little girl went in the summer. You've heard them whispering. You've been lying here listening all week.")),
        say("warden2", R("Names, Dace. Three or four names. Then this is yours, and you can sleep tonight.")),
        n("You know the names. You've heard them every night, under the trays. One of them is Posy's."),
        choose("The lull is moving in the tin.",
               opt("Give him the names", [
                   setf({"brood": "took", "mods.corran": "lull"}), add({"hold": -30, "rings.corran": 1}),
                   n("You say them. Four names. Your voice doesn't even shake. It hasn't the strength."),
                   n("He sets the lull on your neck himself. The raw goes out like a lamp."),
                   n("In the morning there are four empty places at the trays, and the House's men are in the brood room with a list. You hear the strap from the boiler end. You lie still and feel nothing at all, which is what you paid for."),
                   n("Posy doesn't come that night. Or the next. Or ever again."),
               ], hint="And sleep."),
               opt("Say nothing", [
                   setf({"brood": "refused"}), add({"hold": 20}),
                   say("corran", R("No.")),
                   say("warden2", R("No? You'll be begging me for this by morning.")),
                   say("corran", R("Probably.")),
                   n("He goes. The tin goes with him."),
                   n("Then the hardest hour. And every hour after it, the same hour again. You lie on the stone and shake until your teeth knock, and want it, and want it, and want it."),
                   n("Near dawn, a hand flat on your chest. Posy. She doesn't say anything. She doesn't need to."),
                   n("Something in you that has been falling for two years stops falling."),
               ], hint="And lie in the raw.")),
        run("backToRhea5"),
    ], [n("The tin is gone.")]),
]
S["backToRhea5"] = [
    fade("Thornwick. The thaw."),
    {"hero": "rhea"}, setf({"light": "day", "showHold": False, "mods.corran": ""}),
    stage("ad11"), goto(TW, 13, 11, "down"),
    n("The snow is going off the terraces. Ninety-one children have wintered at Thornwick, and nobody has died of it, though Oda says she's aged ten years."),
    n("There's an old man in a black physician's robe at the gate, arguing with whoever is on watch."),
]

# ------------------------------------------------------------------ spring: the College, and Mire
S["haldane"] = [
    iff({"stage": "ad11"}, [
        say("haldane", R("Lieutenant Caddow? Haldane. Professor of the College of Physicians at Hollin, for my sins. I've walked up a mountain to see your greenlings, and your sentry wants a password.")),
        say("rhea", R("There isn't a password.")),
        say("haldane", R("That's what I told him.")),
        n("Over tea in the chapel, among the children, he says what he has come for."),
        say("haldane", R("In the winter a miner walked into my lecture hall with a neck full of old rings. No fresh lull. No raw. He said a boy called Tobin had sent him down from a mountain.")),
        say("haldane", R("I have watched people die in the raw for forty years, Lieutenant. I don't believe in miracles. I believe in trials.")),
        say("haldane", R("Give me your trays and a year. A hundred volunteers, written down, watched every day, in the open. If greenlings wean people safely, the whole country will know it, and the Guild can't call it a smugglers' tale.")),
        iff({"flag": "recruited.oda"}, [say("oda", R("A year. People are dying in the raw now, in every town down there."))]),
        say("haldane", R("Yes. And if one brood comes out wrong and people die of the cure, nobody will ever touch it again. You of all people know that. Millbridge.")),
        choose("Oda's trays are full, and the lowland towns are begging for them.",
               opt(R("Send them down now. Millbridge, Weirbank, Kerrow. Every town that asks."), [
                   setf({"greenlings": "now"}),
                   say("haldane", R("Then I'll run my trial anyway, with what's left, and pray I'm not writing anyone's obituary.")),
               ], by="rhea", hint="Weaning starts this spring, before anyone has proved it's safe."),
               opt(R("You'll have your year, Professor. Nobody gets greenlings who isn't in your trial."), [
                   setf({"greenlings": "wait"}),
                   say("haldane", R("Thank you. They'll hate you for it in the lowlands. I'll try to make it worth it.")),
               ], by="rhea", hint="Wait for proof. The lowlands go without for a year.")),
        setf({"recruited.haldane": True}),
        toast("Professor Haldane stays at Thornwick to run the greenling trial."),
        n("While they're still at the table, a runner comes up the road from the camp. Kane has sent for his officers."),
        stage("ad12"),
    ], [say("haldane", R("Ninety-one children and a hot spring. If I'd known, I'd have come up years ago."))]),
]
S["councilMire"] = [
    n("Kane, Varro, Hallet. Wren's slate has been copied big onto the map table."),
    iff({"flag": "kaneWarned"}, [say("kane", R("Lieutenant. I haven't forgotten what you said in this tent in the autumn. Neither should you."))],
        [say("kane", R("Lieutenant."))]),
    say("kane", R("Mire. House Mire's hatchery is in Vantry's outer ward, against the wall. Three hundred children. The Houses think nobody can reach it.")),
    say("varro", R("At midnight my company makes a noise at the Spindle gate. Every Warden in the ward runs to see what it is.")),
    say("hallet", R("And Caddow crawls through a sewer.")),
    say("rhea", R("A drain. A ten-year-old walked out through it.")),
    say("kane", R("Your company goes in through Wren's drain, from the canal at Cinderwick. You open the brood room and bring out everyone who can walk. Hallet holds the canal bank.")),
    say("hallet", R("And we don't stop for anyone who can't walk, Caddow. I've heard about your nine days on the north road.")),
    stage("ad13"),
]
S["drainIn"] = [
    fade("Cinderwick. Midnight."),
    setf({"light": "night"}), {"regroup": True},
    goto("culvert", 1, 3, "right"),
    n("The drain is a brick tunnel half full of warm water. It smells of the brood rooms. Wren said it wasn't very big. She was being kind."),
    stage("ad14"),
]
S["drainKith"] = [
    n("Something moves in the dark ahead, low and quick, along the edge of the flow. Eyes in the lamplight. Drain reedcats, fat on whatever comes down from the brood rooms."),
    {"battle": "mire-drain", "win": [n("The reedcats scatter into the side bays. The water runs on, warm, toward the wall."), setf({"drainFought": True})]},
]
S["mireIn"] = [
    iff({"stage": "ad14"}, [
        goto("mire", 2, 15, "up"),
        n("A grate, rusted loose. Wren's grate. Beyond it, the warm dark of House Mire's yard, and, a long way off, Varro's company starting to make a noise at the Spindle gate."),
        stage("ad15"),
    ], [goto("mire", 2, 15, "up")]),
]
S["fennick"] = [
    iff({"not": "fennickDone"}, [
        n("A thin clerk in wire spectacles is behind the records table, feeding ledgers into the stove as fast as he can tear them up."),
        say("fennick", R("Don't. Please. I'm not a guard. I'm a clerk. Fennick. I'm burning the numbers.")),
        say("fennick", R("Every child in Mire has a number in these books, and the House uses the numbers to hunt them down when they run. If the books burn, the numbers burn.")),
        say("rhea", R("Keep burning.")),
        n("He hesitates over one bundle, tied with Warden tape."),
        say("fennick", R("Not this. This isn't children. It's the House's copy of the Wardens' papers on the highland raid. Every House keeps one. Somebody who isn't the Guild ought to read it.")),
        n("He pushes it into her hands."),
        setf({"survey": True, "fennickDone": True}),
        choose("Fennick goes back to the stove.",
               opt(R("Come with us, Fennick. They'll know who burned the books."), [
                   setf({"recruited.fennick": True}),
                   say("fennick", R("Yes. Yes, they will, won't they.")),
                   toast("Fennick comes out with the children. He'll keep Thornwick's books, and nobody else's."),
               ], by="rhea"),
               opt(R("Finish the books. Then get out of Vantry."), [
                   setf({"fennickStayed": True}),
                   n("He nods without looking up, and goes on tearing."),
               ], by="rhea")),
    ], [iff({"flag": "recruited.fennick"}, [say("fennick", R("Nearly done. The House will have to count them all again by hand. They can't count."))],
                                           [n("The stove roars. Fennick doesn't look up.")])]),
]
S["mireGuards"] = [
    iff({"flag": "mireGuards"}, [n("The brood room door is open.")], [
        n("Two of House Mire's guards at the brood room door, and a Warden with a crossbow. They've heard Varro at the gate and haven't gone to look."),
        {"regroup": True},
        {"battle": "mire-guards", "win": [n("The door is open. Inside it's hot and wet and very quiet, and three hundred children are looking at you."), setf({"mireGuards": True})]},
    ]),
]
S["mireCorran"] = [
    iff({"stage": "ad15"}, [
        n("In the sick room at the end of the brood room, a girl of sixteen stands over a pallet with a brood hook, and lifts it when Rhea comes in."),
        say("posy", R("Not him. You don't touch him.")),
        n("Rhea knows her. Posy, from the second cart at Larkfold, with her arms bitten to the elbow."),
        n("Then she sees who is on the pallet."),
        iff({"eq": {"brood": "took"}}, [
            n("Grey-faced, wasted. The rings climb his neck to the jaw, and there's a fresh lull on it, and his eyes are open and empty."),
        ], [
            n("Grey-faced, wasted, shaking so hard the pallet knocks against the wall. The rings climb his neck to the jaw. There's no lull on it."),
        ]),
        say("corran", R("Rhea.")),
        n("He says it as if she's something he has dreamed too often to believe in."),
        say("posy", R("They took his rank and his lull and threw him in here with us. Two months, he's been in here.")),
        iff({"eq": {"brood": "took"}}, [
            say("posy", R("He sold four of us to a guard for that thing on his neck. I know he did. I still won't let you kill him. Not in here. Not in front of them.")),
        ], [
            say("posy", R("A guard offered him a lull for our names. He said no. He lay there and shook all night and said no.")),
        ]),
        n("Outside, Varro's noise at the gate is getting closer. There isn't long."),
        choose("Corran, on the pallet.",
               opt(R("Bring him. He comes to Thornwick."), [setf({"corranFate": "thornwick"})], by="rhea", hint="Wean him at Thornwick, on greenlings."),
               opt(R("Leave him. He made this place."), [setf({"corranFate": "left"}),
                   say("posy", R("Then he dies in here. You know that.")),
                   n("She looks at him a long time. Then she lowers the hook and goes to the children, because they're waiting for her.")], by="rhea", hint="Leave him in the brood rooms."),
               opt(R("Bring him. Millbridge will want to try him for Larkfold, and they have the right."), [setf({"corranFate": "millbridge"}), add({"millbridgeTrust": 20})], by="rhea", hint="Millbridge is won. He'll stand trial.")),
        {"join": "posy"}, setf({"recruited.posy": True}),
        toast("Posy joins Rhea's company."),
        fade("Three hundred children out through Wren's drain, along the canal, and north. Posy at the front. The last of them out just before the gate gives."),
        setf({"mireFreed": True, "light": "day"}),
        iff({"eq": {"corranFate": "millbridge"}}, [run("trial")], [
            goto(TW, 13, 12, "up"), {"alone": True},
            iff({"eq": {"corranFate": "thornwick"}}, [
                n("Oda takes one look at Corran and puts him in the old bathhouse by the warm water, on a straw pallet, with a greenling tray at his feet. She doesn't ask Rhea anything. She doesn't need to."),
                stage("ad16"),
            ], [
                n("Posy doesn't speak to Rhea for three days. On the fourth she comes and sits by the warm pool, and waits to be noticed."),
                stage("ad16l"),
            ]),
        ]),
    ], [n("The sick room is empty.")]),
]

# ------------------------------------------------------------------ the truth
def confession(teller):
    """What Corran tells Rhea: himself, or Posy telling what he said in the raw."""
    c = "corran" if teller == "corran" else "posy"
    if teller == "corran":
        lines = [
            say("corran", R("Halloran came to see me, the summer before the raid. At Millbridge, after the brood went wrong. He said the Wardens had a column coming up the cloud path in the autumn. That they knew the valley. That they'd burn it, and hang everyone over fifteen.")),
            say("corran", R("He said there was another way. If I showed him the way in, at night, he'd take the elders and the trays and nobody would be hurt. And he'd put me on the Guild's books, with a line of my own, so I'd never go through the raw again.")),
            say("corran", R("I begged you to run. You remember. You thought I meant the brood. You said Larkfold doesn't run.")),
            say("rhea", R("I remember.")),
            say("corran", R("So I sent you down the mountain that night for salve. There was nothing wrong with my burns. I wanted you off the mountain when they came.")),
            say("corran", R("He lied. They burned it anyway. They hanged the elders anyway. And they took Finch for the carts.")),
            say("corran", R("I asked for the night watch at the hatcheries. The post nobody wants. In return Halloran signed Finch's indenture over to my household. Not the carts. That's what I gave for him. Me.")),
            iff({"eq": {"raidNight": "lull"}}, [say("corran", R("And at Lockside I was asleep with a lull on my neck, and he rode out to hold the gate in my place."))],
                [say("corran", R("And at Lockside I was on the floor in the raw, and he rode out to hold the gate in my place."))]),
            say("rhea", R("I put him on his back in that yard. I didn't know.")),
            say("corran", R("He knew you. He'd know that staff anywhere.")),
            n("Then, more quietly:"),
            say("corran", R("And the letter. The year after, the Guild sent the Commons an offer. Every one of Larkfold's children left in the Houses, if you'd give yourself up at Kell's Bridge. Halloran showed me the answer. You refused.")),
            say("rhea", R("I never saw it.")),
            n("He looks at her for a long time."),
            say("corran", R("It went to the Commons camp under a truce flag. To the Marshal's tent.")),
        ]
    else:
        lines = [
            say("posy", R("He talked. In the raw. Every night for two months, to the wall, to me, to nobody.")),
            say("posy", R("Halloran told him there was a column coming up the cloud path to burn Larkfold. Unless he showed them the way in, at night, and then nobody would be hurt.")),
            say("posy", R("He said he begged you to run, and you wouldn't. So he sent you down the mountain for salve he didn't need, to get you out of it.")),
            say("posy", R("He said he gave himself to the Guild for Finch. The night watch at the hatcheries, so Finch went to his house and not the carts. Like me.")),
            n("Rhea doesn't say anything. Posy goes on, looking at the water."),
            say("posy", R("And the letter. He said it every night. The Guild offered the Commons all of us, every Larkfold child in the Houses, if you'd give yourself up. And the answer came back that you refused.")),
            say("posy", R("They told us that too, in Mire. Your sister wouldn't come for you, they said. We hated you for a year.")),
            say("rhea", R("I never saw it.")),
            say("posy", R("Then who did?")),
        ]
    return lines + [
        n("Only one man opens the letters that come to the Marshal's tent."),
        say("rhea", R("Kane.")),
        setf({"offerKnown": True, "confessed": c}),
    ]

S["corranBath"] = [
    iff({"stage": "ad16"}, [
        iff({"not": "lullTalk"}, [
            n("A week in the bathhouse. The greenling has taken. He can keep food down. He can sit up. He watches the door, and looks away whenever it's her."),
            n("There's a Guild lull in a tin in Rhea's pack, taken off a guard at Mire. One fresh lull, and he'd be warm and easy, and he'd talk. Tonight."),
            choose("Corran won't meet her eyes.",
                   opt("Set the lull on him. Just for tonight.", [
                       setf({"lullTalk": "done"}), add({"hold": -15, "rings.corran": 1}),
                       n("He sees the tin, and makes a sound she has never heard a person make. Then he turns his head and offers her his neck."),
                       n("Ten minutes later he's talking, smoothly, easily, as if it's someone else's story."),
                   ], hint="Make him talk now. It'll cost him."),
                   opt("Wait. Let him tell it when he can.", [
                       setf({"lullTalk": "waited"}), add({"hold": 10}),
                       fade("Eleven more days."),
                       n("On the eleventh evening he asks her to sit down."),
                   ], hint="Days, or weeks.")),
        ]),
        *confession("corran"),
        add({"hold": 10}),
        run("surveyRead"),
    ], [
        iff({"flag": "surveyTold"}, [say("corran", R("There was no column. I keep saying it, as if it'll sound different."))],
            [say("corran", R("Oda says the greenling's the best she's ever bred. She says it every morning, so I'll believe her."))]),
    ]),
]
S["posyPool"] = [
    iff({"stage": "ad16l"}, [*confession("posy"), run("surveyRead")],
        [say("posy", R("The little ones want to know if they can swim in the warm pool. I said I'd ask. I'm asking."))]),
]
S["trial"] = [
    fade("Millbridge. A week later."),
    goto("millbridge", 12, 10, "up"),
    n("They try him in the market square, on the well steps, where Varro once stood to tell the town about Larkfold. Half of Millbridge has come. Some of them have the brood scars."),
    n("He doesn't ask for a lawyer. When they ask him what he has to say, he tells them everything."),
    *confession("corran"),
    n("The square is very quiet."),
    say("reeve", R("Corran Dace. You led the Guild's Wardens into Larkfold by night. Whatever you were told, whatever you were promised, you did it. You'll hang at midsummer.")),
    n("Nobody cheers. Most of them go home without looking at each other."),
    setf({"corranSentenced": True}),
    goto(TW, 13, 12, "up"), {"alone": True},
    run("surveyRead"),
]
S["surveyRead"] = [
    n("That night Rhea unties the Warden tape on Fennick's bundle, by the lamp in her tent."),
    n("Orders. Lists. A report of the Larkfold raid in Halloran's own neat hand. And under them, folded small, a map: the Wardens' survey of the highlands, dated the spring before the raid."),
    n("Every village on the Cloudline is on it. Highmoss. Dripstone. Ume's terraces. Mistfold. Each with its paths, its springs and its headcount."),
    n("Where Larkfold's valley should be, the map is blank. A smudge of drawn cloud, and a question mark."),
    n("No column was ever coming. Nobody in the Guild knew the way to Larkfold until somebody showed them."),
    n("The warning was the bait."),
    iff({"eq": {"corranFate": "thornwick"}}, [
        choose("The survey, in her hands.",
               opt("Take it to Corran", [run("surveyTell")], hint="He has a right to know. It may break him."),
               opt("Keep it, for now", [setf({"surveyTold": False}), n("She folds it small again and puts it under her pallet. He's barely clean. It can wait.")], hint="Not yet.")),
    ], [
        iff({"eq": {"corranFate": "millbridge"}}, [
            choose("The survey, in her hands.",
                   opt("Take it to the court at Millbridge", [setf({"surveyTold": True}), say("reeve", R("It changes why he did it, Lieutenant. It doesn't change what he did. The sentence stands.")),
                                                             n("But the reeve keeps the map, and reads it again when she thinks nobody is looking.")], hint="It won't save him. It may change how he's remembered."),
                   opt("Keep it", [setf({"surveyTold": False}), n("She folds it small again and puts it under her pallet.")], hint="It's Thornwick's business, not Millbridge's.")),
        ], [
            choose("The survey, in her hands.",
                   opt("Ask Posy to get a letter into Mire", [setf({"surveyTold": True}), say("posy", R("I can. There's always someone going back down the drain for someone.")),
                                                             n("Rhea writes three lines and folds the map inside them.")], hint="He'll read it alone, in the brood rooms."),
                   opt("Keep it", [setf({"surveyTold": False}), n("She folds it small again and puts it under her pallet.")], hint="Leave him with what he believes.")),
        ]),
    ]),
    stage("ad17"),
]
S["surveyTell"] = [
    setf({"surveyTold": True}),
    n("He reads it twice by the warm pool. Then he puts his finger on the blank place where Larkfold should be."),
    say("corran", R("There was no column.")),
    say("rhea", R("There was no column. There was you.")),
    n("He doesn't say anything else that night. In the morning Oda finds him sitting at the edge of the pool with his feet in the warm water, crying like a child, and she sits down beside him until he stops."),
]

# ------------------------------------------------------------------ summer: the trial's answer, and Captain
S["summerTrial"] = [
    iff({"stage": "ad18"}, [
        iff({"eq": {"greenlings": "wait"}}, [
            say("haldane", R("A hundred and four volunteers. Ninety-six weaned. Nobody died. Eight went back to the Guild's lulls, which is human, and not the greenlings' fault.")),
            say("haldane", R("And there's this.")),
            n("He puts down a bound report, brown with age, with the Guild's seal pressed into the cover."),
            say("haldane", R("The College library. Under G, for Guild, where nobody has looked in forty years. The Guild ran this trial themselves, before I was born. Greenlings. The same result as mine.")),
            say("haldane", R("They always knew, Lieutenant. They've known for forty years.")),
            setf({"collegeProof": True}),
            toast("The College puts its name to the greenling trial."),
        ], [
            say("haldane", R("Weirbank. One of the broods we sent down in the spring came out too strong. Two people died of it in the same week. A weaver and her husband.")),
            say("haldane", R("It's Millbridge all over again, they're saying. In Lorne they're calling greenlings the highland poison.")),
            say("haldane", R("And in every other town that took them, people are weaning. Hundreds of them. Months before my trial could have told anyone it was safe.")),
            say("haldane", R("The College has taken its name off my work. I'm staying. Someone has to finish it properly.")),
            setf({"collegeProof": False}),
        ]),
        stage("ad19"),
        n("Down at the gate, there are horses. Kane has come up the mountain with his officers."),
    ], [say("haldane", R("The ledger's done. Everything's in it, the good and the bad."))]),
]
S["captain"] = [
    iff({"stage": "ad19"}, [
        n("The chapel is full. Kane, Varro, Hallet, and the captains of the south companies, standing because there's nowhere to sit for children."),
        say("kane", R("Lockside. Mire. Three hundred and ninety children. The army holds two hatcheries now, and doesn't know what to do with either of them.")),
        say("kane", R("The council is making a new column to hold the freed houses and the people in them. The Houses column. It needs a captain, and the officers vote on who.")),
        say("hallet", R("I've put my name forward. Somebody has to hold those houses who'll hold them like a soldier and not like a nursemaid.")),
        say("varro", R("And I've put Caddow's. She took both of them. She walked every child out herself.")),
        iff({"flag": "recruited.oakes"}, [say("oakes", R("If a deserter's allowed a say: I'd follow her through a drain. I have."))]),
        n("The officers vote with their hands, the Commons way."),
        iff({"atLeast": {"kaneTrust": 0}}, [
            n("Hallet's hand. Then Varro's, and the captains from the south, one after another. And at the last, without looking at her, Kane's."),
            say("kane", R("Captain Caddow, of the Houses column.")),
        ], [
            n("Hallet's hand, and Kane's. Then Varro's, and every captain from the south, one after another, until Kane stops counting."),
            say("kane", R("The council has spoken. Captain Caddow, of the Houses column.")),
            n("He says it as if it costs him something. It does."),
        ]),
        setf({"rank": "Captain"}),
        toast("Promoted: Captain, of the Houses column."),
        iff({"flag": "offerKnown"}, [
            n("Afterwards, when the others have gone out into the sun, Kane stays behind by the altar stone."),
            choose("Kane is alone in the chapel.",
                   opt(R("The Guild's offer for Larkfold's children. It came to your tent. I know."), [
                       setf({"kaneConfronted": True}), add({"kaneTrust": -10}),
                       say("kane", R("Then you know I kept you in the war twice. The Guild would have hanged you at Kell's Bridge, Caddow, and not given back one child. That's what Guild offers are.")),
                       say("rhea", R("You don't know that.")),
                       say("kane", R("No. I don't. I decided.")),
                   ], by="rhea", hint="Tell him she knows."),
                   opt("Say nothing. Not yet.", [
                       setf({"kaneConfronted": False}),
                       n("She looks at him until he looks away, and then goes out into the sun."),
                   ], hint="Keep it until it can do some good.")),
        ]),
        stage("ad19b"), run("firstCommand"),
    ], [say("kane", R("Captain."))]),
]
# Mathew (2026-11-23) chose this for the first army battle in the story: the new Captain's first order.
S["firstCommand"] = [
    n("Kane waits until the chapel has emptied of everyone but his officers. Then he unrolls a map on the altar stone."),
    say("kane", R("Your first order, then, Captain. A Warden column came out of Cinderwick two nights ago, up the towpath. Six companies, and riders. They want Corvel's back.")),
    say("hallet", R("And the Guild wants it seen that the Commons can't hold what it takes.")),
    say("kane", R("The Houses column is yours. Varro's people, Thornwick's companies, whoever you can raise. Hold the hatchery.")),
    say("varro", R("They'll come over the lock bridges. There are two. They'll want both.")),
    fade("Lockside. Two days later."), setf({"light": "evening"}),
    n("Corvel's hatchery stands empty behind its wall, the brood rooms cold, the boilers silent. The children are long gone north. What's left to hold is the building, and what it means."),
    n("Down the towpath, drums. Grey coats in the evening light, coming on in good order."),
    {"army": "lockside-hold", "win": [
        setf({"lockHeld": True}), add({"kaneTrust": 6}),
        n("The last Warden company goes back over the lock bridge at a run, and the bargees on the far bank, who have watched the whole thing from their boats, start banging pans."),
        say("varro", R("They'll write that up in Vantry as a skirmish. Let them. Everyone on this canal saw it.")),
        toast("Corvel's hatchery holds. The Houses column has its first victory."),
    ], "lose": [
        setf({"lockHeld": False}), add({"kaneTrust": -6}),
        n("The column breaks back up the towpath in the dusk, carrying its wounded. Behind it, the Wardens run their grey flag up over Corvel's gate."),
        say("varro", R("The children are north. The building's only a building. Tell yourself that, Caddow, because Hallet will be telling Kane something else.")),
        toast("Corvel's hatchery is lost. The Houses column falls back."),
    ]},
    fade("Thornwick. Late."), setf({"light": "evening"}), stage("ad20"), goto(TW, 4, 13, "up"),
]
S["lastNight"] = [
    setf({"light": "evening"}),
    iff({"eq": {"corranFate": "thornwick"}}, [
        n("Late, when the children are asleep, Rhea goes down to the warm pool. Corran is sitting at the edge of it with his feet in the water, humming."),
        n("The foal song. He has the third line wrong. He always had the third line wrong."),
        n("She sits down beside him, not close, and sings the third line right. He stops. After a while he starts again from the top, and this time he gets it."),
    ], [
        n("Late, when the children are asleep, Rhea goes up onto the terrace wall and sings the foal song out over the cloud, toward Vantry."),
        n("Nothing comes. Somewhere down there, a grey loftbuck lifts its head."),
    ]),
    {"end": "act3"},
]
S["thornBed3"] = [
    iff({"stage": "ad10"}, [setf({"light": "night"}), fade("Lockside. Ten days earlier."), run("raidNight")], [
        iff({"stage": "ad17"}, [fade("Summer."), setf({"light": "day"}), stage("ad18"), goto(TW, 4, 13, "up")], [
            iff({"stage": "ad20"}, [run("lastNight")], [n("Not yet. There's still a lot of the day left.")])])]),
]

# ------------------------------------------------------------------ actors
def actor(id, map, x, y, look, talk, when=None, **kw):
    a = {"id": id, "map": map, "x": x, "y": y, "look": look}
    if when: a["when"] = when
    if talk is not None: a["talk"] = talk
    a.update(kw)
    return a
def stages(*names): return {"stage": list(names)}

AD = [f"ad{i}" for i in range(1, 21)] + ["ad6b", "ad16l"]
HOME = {"stagePrefix": "ad"}
def home(flag): return {"stagePrefix": "ad", "flag": flag}

actors = [
    # Thornwick in Act III: the company at home (the party waits inside the walls, as in Act II)
    actor("wren", TW, 11, 8, "child", [run("wrenSlate")], HOME),
    actor("tamsin-3", TW, 11, 12, "tamsin", [iff({"flag": "finchSeen"}, [say("tamsin", R("He's alive, Rhea. Whatever else. He's alive, and he's got Smoke."))],
                                                [say("tamsin", R("Ninety-one children in a chapel. Larkfold had forty, and we thought that was a lot."))])], HOME),
    actor("oda-3", TW, 17, 9, "oda", [iff({"eq": {"corranFate": "thornwick"}}, [say("oda", R("He eats what I give him and says thank you. I hate that he says thank you."))],
                                           [say("oda", R("New trays every week, child. The spring's never been so busy."))])], home("recruited.oda")),
    actor("ferris-3", TW, 22, 14, "ferris", [say("ferris", R("Thistle's adopted three of the Lockside children. Or they've adopted her. Hard to tell."))], home("recruited.ferris")),
    actor("ketti-3", TW, 7, 14, "ketti", [say("ketti", R("I'm teaching the little ones to wash. They've never been allowed to get the trays wet, so they think water is a punishment."))], home("recruited.ketti")),
    actor("dorrit-3", TW, 6, 11, "dorrit", [say("dorrit", R("Ninety-one more mouths. I've written to Kane for flour four times. He's sent it twice. I'm counting."))], home("recruited.dorrit")),
    actor("hesk-3", TW, 22, 10, "hesk", [iff({"flag": "finchSeen"}, [say("hesk", R("A grey loftbuck that turns for a song it learned as a foal. I've only heard of that once before. It doesn't forget, Caddow. Neither will he."))],
                                              [say("hesk", R("The Lockside children want to feed the kith. I've told them yes, if they ask the kith first."))])], home("recruited.hesk")),
    actor("oakes-3", TW, 20, 13, "oakes", [say("oakes", R("I know the Lockside road, Lieutenant. I've walked it the other way, with carts."))], {"stagePrefix": "ad", "flag": "recruited.oakes", "not": "party.oakes"}),
    actor("kids-a", TW, 5, 7, "kid", [n("A Lockside boy, chasing a reedcat that doesn't want to be chased. He has never run anywhere in his life without being told to.")], {"stagePrefix": "ad", "flag": "lockFreed"}),
    actor("kids-b", TW, 9, 9, "kid2", [n("A girl from Lockside, counting the steps of the terrace under her breath. Brood-room children count everything.")], {"stagePrefix": "ad", "flag": "lockFreed"}),
    actor("kids-c", TW, 16, 11, "kid3", [n("One of the Mire children, asleep in the sun with his mouth open.")], {"stagePrefix": "ad", "flag": "mireFreed"}),
    actor("rider3", TW, 14, 13, "rider", [run("exchangeRider")], stages("ad7")),
    actor("haldane", TW, 14, 13, "haldane", [run("haldane")], stages("ad11", "ad12")),
    actor("haldane-ch", TW, 15, 4, "haldane", [run("summerTrial")], stages("ad18")),
    actor("haldane-3", TW, 18, 12, "haldane", [say("haldane", R("Volunteer forty-one walked to the gate this morning on her own legs. She cried. So did I. Don't tell anyone."))], {"stage": ["ad13", "ad14", "ad15", "ad16", "ad16l", "ad17"], "flag": "recruited.haldane"}),
    actor("fennick-3", TW, 4, 11, "fennick", [say("fennick", R("I've started a book of Thornwick's children. Names only. No numbers. Never numbers."))], {"stage": ["ad16", "ad16l", "ad17", "ad18", "ad19", "ad20"], "flag": "recruited.fennick"}),
    actor("posy-3", TW, 7, 4, "posy", [say("posy", R("He's asleep. Leave him. It's the first time in two months."))], {"stage": ["ad16", "ad17", "ad18", "ad19", "ad20"], "eq": {"corranFate": "thornwick"}, "not": "party.posy"}),
    actor("posy-pool", TW, 11, 9, "posy", [run("posyPool")], {"stage": ["ad16l", "ad17", "ad18", "ad19", "ad20"], "not": "party.posy", "eq": {"corranFate": "left"}}),
    actor("posy-tw", TW, 11, 9, "posy", [say("posy", R("The Mire children want me to tell them what happens next. I said I'd ask you."))], {"stage": ["ad16", "ad17", "ad18", "ad19", "ad20"], "not": "party.posy", "eq": {"corranFate": "millbridge"}}),
    actor("corran-bath", TW, 5, 4, "corran", [run("corranBath")], {"stage": ["ad16", "ad17", "ad18", "ad19", "ad20"], "eq": {"corranFate": "thornwick"}}),
    actor("kane-ch3", TW, 13, 4, "kane", [run("captain")], stages("ad19", "ad20")),
    actor("varro-ch3", TW, 15, 3, "varro", [say("varro", R("Two hatcheries, Caddow. Two. When I joined, we cheered for a cart."))], stages("ad19", "ad20")),
    actor("hallet-ch3", TW, 16, 3, "hallet", [say("hallet", R("Thornwick. I'd heard it was a ruin full of children. It's a ruin full of children."))], stages("ad19")),
    # the camp: the officers at Kane's tent for the councils
    actor("varro-c3", "camp", 13, 5, "varro", [say("varro", R("Talk to Kane, Caddow. I've said my piece."))], stages("ad2", "ad12")),
    actor("hallet-c3", "camp", 17, 5, "hallet", [say("hallet", R("Caddow."))], stages("ad2", "ad12")),
    # Lockside, the raid
    actor("varro-lock", "lockhatch", 12, 13, "varro", [say("varro", R("The brood house, Caddow. Quickly."))], stages("ad5", "ad6")),
    actor("lkid1", "lockhatch", 5, 4, "kid", [run("lockKid1")], {"stage": "ad5", "not": "lock.k1"}),
    actor("lkid2", "lockhatch", 10, 4, "kid2", [run("lockKid2")], {"stage": "ad5", "not": "lock.k2"}),
    actor("lkid3", "lockhatch", 8, 6, "kid3", [run("lockKid3")], {"stage": "ad5", "not": "lock.k3"}),
    actor("lkid1b", "lockhatch", 6, 10, "kid", [n("Holding the hand in front, and the hand behind. Waiting.")], stages("ad6", "ad6b")),
    actor("lkid2b", "lockhatch", 7, 10, "kid2", [n("Waiting, very still.")], stages("ad6", "ad6b")),
    actor("lkid3b", "lockhatch", 8, 10, "kid3", [n("Waiting, very still.")], stages("ad6", "ad6b")),
    actor("grey", "lockhatch", 13, 13, "loftbuck", [run("lockRider")], stages("ad6")),
    actor("varro-lock2", "lockhatch", 16, 12, "varro", [say("varro", R("Go, Caddow. North. We've got them."))], stages("ad6b")),
    # Kell's Bridge at dusk
    actor("varro-kb3", "kellsbridge", 10, 10, "varro", [run("exchange")], stages("ad8", "ad9")),
    actor("pris1", "kellsbridge", 14, 10, "warden2", [n("A Warden prisoner, hooded, hands tied in front of him. He's shivering.")], stages("ad8")),
    actor("pris2", "kellsbridge", 15, 11, "warden2", [n("A Warden prisoner, hooded.")], stages("ad8")),
    actor("hooded", "kellsbridge", 16, 10, "warden", [n("The rider from Lockside, hooded like the others, standing very straight. The grey loftbuck's rope is tied to his wrist.")], stages("ad8")),
    actor("smoke-kb", "kellsbridge", 17, 10, "loftbuck", [n("The grey loftbuck from Lockside. It won't take its eyes off its rider.")], stages("ad8")),
    # Corran: Lockside on the night, House Mire's brood rooms
    actor("finch-lock", "lockhatch", 18, 4, "finch", [say("finch", R("Patrol goes out at midnight. You're not coming, are you. It's fine. I'll tell them you're writing your report."))], stages("ae1")),
    actor("halloran-lock", "lockhatch", 12, 11, "halloran", [run("halloranStrip")], stages("ae2")),
    actor("posy-raw", "mire", 14, 9, "posy", [run("posyRaw")], stages("ae3")),
    actor("guard-raw", "mire", 14, 11, "warden2", [run("guardOffer")], stages("ae4")),
    actor("kid-raw1", "mire", 5, 4, "kid", [n("A boy turning moss in a tray, very carefully, without looking at you.")], {"stage": ["ae3", "ae4"]}),
    actor("kid-raw2", "mire", 9, 6, "kid2", [n("A girl asleep on her feet at the trays.")], {"stage": ["ae3", "ae4"]}),
    # House Mire, the raid
    actor("fennick", "mire", 23, 4, "fennick", [run("fennick")], stages("ad15")),
    actor("mire-guard1", "mire", 9, 13, "cartwarden", [run("mireGuards")], {"stage": "ad15", "not": "mireGuards"}),
    actor("mire-guard2", "mire", 10, 13, "cartwarden", [run("mireGuards")], {"stage": "ad15", "not": "mireGuards"}),
    actor("posy-mire", "mire", 14, 9, "posy", [run("mireCorran")], stages("ad15")),
    actor("corran-mire", "mire", 15, 10, "corran", [run("mireCorran")], stages("ad15")),
    actor("mkid1", "mire", 5, 4, "kid", [n("A Mire boy at the trays. When you hold out your hand, he looks at the guards first. There aren't any.")], stages("ad15")),
    actor("mkid2", "mire", 9, 8, "kid2", [n("A Mire girl, already walking toward the drain. She knows the way. Everyone in here knows the way.")], stages("ad15")),
]

# ------------------------------------------------------------------ steps, zones, looks, songs
def step(map, at, do, when=None):
    s = {"map": map, "at": list(at), "do": do}
    if when: s["when"] = when
    return s

NOT_NOW_TW = ("ad1", "ad7", "ad11", "ad16", "ad16l", "ad18", "ad19", "ad20")
steps = [
    # world: the checkpoint below Sallow, Lockside after dark, the drain at Cinderwick
    step("land-vale", (52, 41), [run("checkpoint")], stages("ad3")),
    step("land-millcities", (38, 9), [run("lockside")], stages("ad4")),
    step("land-millcities", (20, 12), [run("drainIn")], stages("ad13")),
    # Thornwick: nobody leaves while something here needs Rhea
    *[step(TW, (x, 15), [toast("Not now.")], stages(*NOT_NOW_TW)) for x in (13, 14)],
    # Lockside hatchery
    *[step("lockhatch", (x, 15), [toast("Not without the children.")], stages("ad5", "ad6")) for x in (13, 14)],
    *[step("lockhatch", (x, 15), [run("northRoad")], stages("ad6b")) for x in (13, 14)],
    *[step("lockhatch", (x, 15), [toast("Not yet.")], {"stagePrefix": "ae"}) for x in (13, 14)],
    *[step("lockhatch", (x, 15), [{"regroup": True}, goto("land-millcities", 38, 10, "down")]) for x in (13, 14)],
    step("lockhatch", (7, 8), [n("The brood house door. Warm, wet air comes out of it, and the smell of moss.")], {"stagePrefix": "ad"}),
    step("lockhatch", (20, 6), [n("The officers' house. Somebody has left a lamp burning in the window.")], {"stagePrefix": "ad"}),
    # Kell's Bridge
    *[step("kellsbridge", (x, 13), [toast("Not until the exchange is done.")], stages("ad8")) for x in (12, 13)],
    *[step("kellsbridge", (x, 13), [run("toKane")], stages("ad9")) for x in (12, 13)],
    # the drain, and Mire
    *[step("culvert", (0, y), [goto("land-millcities", 20, 13, "down")]) for y in (3, 4)],
    step("culvert", (25, 3), [run("mireIn")], stages("ad14", "ad15")),
    step("mire", (2, 16), [toast("Not without the children.")], stages("ad15")),
    step("mire", (2, 16), [n("The drain grate. The children whisper about it at night, under the trays.")], {"stagePrefix": "ae"}),
    *[step("mire", (x, 17), [toast("Varro's company is holding the street gate. Out the way you came.")]) for x in (26, 27)],
    step("mire", (9, 12), [n("The brood room door.")]),
    step("mire", (13, 9), [n("The sick room.")]),
    step("mire", (24, 8), [n("The records room. The clerks' lamps are still lit.")]),
]
zones = [
    {"map": TW, "area": [3, 14, 4, 14], "when": stages("ad10", "ad17", "ad20"), "do": [run("thornBed3")]},
    {"map": "culvert", "area": [10, 3, 12, 4], "when": {"stage": "ad14", "not": "drainFought"}, "do": [run("drainKith")]},
]
looks = [
    {"map": "lockhatch", "tile": "table", "when": stages("ae1"), "do": [run("raidTin")]},
    {"map": "lockhatch", "tile": "tray", "do": [n("Brood trays, the moss turned by small hands. The larvae in it twist toward the lamp.")]},
    {"map": "lockhatch", "tile": "canal", "do": [n("The canal cut, black and slow. It runs south to Cinderwick, and on to Vantry.")]},
    {"map": "lockhatch", "tile": "bed", "do": [n("An officer's cot, the blanket folded square.")]},
    {"map": "mire", "tile": "shelf", "do": [n("Ledgers. Every child in Mire, by number.")]},
    {"map": "mire", "tile": "tray", "do": [n("House Mire's trays. The north boiler's still cracked, and the trays nearest it are empty.")]},
    {"map": "mire", "tile": "bed", "do": [n("A straw pallet in the sick room. The straw is new. Somebody changes it.")]},
    {"map": "culvert", "tile": "water", "do": [n("Warm water from the brood rooms, running out under the wall. It smells of moss and children.")]},
]
songs = [
    {"when": {"map": "lockhatch", "stage": "ad6"}, "near": "grey", "range": 5, "do": [
        n("Rhea sings a line of the foal song without thinking. The grey loftbuck's ears swing round to her, and it takes one step toward her before the rider hauls it back.")]},
]

# ------------------------------------------------------------------ battles
def unit(id, name, look, row, at, **kw):
    u = {"id": id, "name": name, "look": look, "side": "foe", "row": row, **kw, "at": at}
    return u

BATTLES = {
    "sallow-checkpoint": {
        "id": "sallow-checkpoint", "name": "The Sallow checkpoint", "backdrop": "road", "party": True,
        "intro": ["The Guild checkpoint on the road south. Wardens at the barrier, an archer in the guardhouse door, a tracker reedcat on a chain.",
                  "Take the barrier, and the Millcities are open."],
        "won": "The road south is open", "lost": "Thrown back up the road",
        "units": [unit("cw1", "Warden", "warden", "front", [168, 92], cast="warden", level=6, skills=["wstrike"]),
                  unit("cw2", "Warden", "warden", "front", [194, 112], cast="warden", level=6, skills=["wstrike"]),
                  unit("crc", "Tracker reedcat", "reedcat:#c8c4ba", "front", [160, 128], hp=26, kith=True, level=6, skills=["pounce"], species="fog-reedcat"),
                  unit("cab", "Warden archer", "archer", "back", [228, 98], cast="archer", level=6, skills=["bow"])]},
    "lockside-guards": {
        "id": "lockside-guards", "name": "Corvel's house guards", "backdrop": "fire", "party": True,
        "intro": ["House Corvel's guards, woken by the noise, with cudgels and a hatchery reedcat.",
                  "Keep them off the children."],
        "won": "The brood house is open", "lost": "Driven out of the brood house",
        "units": [unit("lg1", "House guard", "cartwarden", "front", [170, 94], cast="warden", level=6, skills=["wstrike"]),
                  unit("lg2", "House guard", "cartwarden", "front", [196, 116], cast="warden", level=6, skills=["wstrike"]),
                  unit("lrc", "Hatchery reedcat", "reedcat:#8a7a6a", "front", [162, 130], hp=24, kith=True, level=6, skills=["pounce"], species="market-reedcat"),
                  unit("lab", "Guard archer", "archer", "back", [230, 100], cast="archer", level=6, skills=["bow"])]},
    "lockside-rider": {
        "id": "lockside-rider", "name": "The rider at the gate", "backdrop": "fire",
        "intro": ["A rider on a huge grey loftbuck, across the gate. Warden's helm, visor down. He hasn't said a word.",
                  "Put the rider down, or calm the grey with the foal song (Q) and he'll have to fight on foot."],
        "won": "The gate is open", "lost": "Knocked down in the yard",
        "units": [{"id": "rhea", "name": "Rhea", "look": "rhea", "side": "ally", "row": "front", "cast": "rhea", "skills": ["strike", "sing", "rally"], "at": [86, 94]},
                  {"id": "ash", "name": "Ash", "look": "ash", "side": "ally", "row": "front", "hp": 30, "skills": [], "kith": True, "bonded": "rhea", "at": [62, 124]},
                  unit("ninety", "Ninety", "warden", "front", [176, 96], cast="warden", level=7, skills=["wstrike"]),
                  unit("grey", "The grey loftbuck", "loftbuck:#b4b8bc", "front", [206, 120], hp=44, kith=True, level=7, skills=["horns"], species="loftbuck", temperament="gentle")]},
    "mire-drain": {
        "id": "mire-drain", "name": "In the drain", "backdrop": "cistern", "party": True,
        "intro": ["Drain reedcats, fat and bold, in the warm dark under Vantry's wall.", "Don't let them get behind you in the water."],
        "won": "The drain is clear", "lost": "Driven back to the canal",
        "units": [unit("dr1", "Drain reedcat", "reedcat:#5a5a52", "front", [168, 100], hp=24, kith=True, level=6, skills=["pounce"], species="market-reedcat"),
                  unit("dr2", "Drain reedcat", "reedcat:#5a5a52", "front", [196, 118], hp=24, kith=True, level=6, skills=["pounce"], species="market-reedcat"),
                  unit("dr3", "Old drain reedcat", "reedcat:#3e3e38", "front", [222, 96], hp=34, kith=True, level=7, skills=["maul", "pounce"], species="market-reedcat", temperament="proud")]},
    "mire-guards": {
        "id": "mire-guards", "name": "House Mire's guards", "backdrop": "yard", "party": True,
        "intro": ["Two of House Mire's guards and a Warden crossbowman, at the brood room door.", "Varro can't hold the gate for long. Be quick."],
        "won": "The brood room is open", "lost": "Pushed back into the yard",
        "units": [unit("mg1", "House guard", "cartwarden", "front", [170, 94], cast="warden", level=7, skills=["wstrike"]),
                  unit("mg2", "House guard", "cartwarden", "front", [196, 116], cast="warden", level=7, skills=["wstrike"]),
                  unit("mw", "Warden", "warden", "front", [160, 128], cast="warden", level=7, skills=["wstrike"]),
                  unit("mab", "Warden crossbow", "archer", "back", [230, 100], cast="archer", level=7, skills=["bow"])]},
}

# ------------------------------------------------------------------ voices and music
voiced = ["exchange", "kaneFinch", "halloranStrip", "guardOffer", "mireCorran", "corranBath", "posyPool", "surveyTell", "summerTrial", "captain"]
moods = {
    "scenes": {"act3Start": "hope", "wrenSlate": "tender", "council": "camp", "checkpoint": "tension", "lockside": "dread", "lockGuards": "fire",
               "lockKid1": "dread", "lockKid2": "dread", "lockKid3": "dread", "lockRider": "fire", "northRoad": "hope", "exchangeRider": "tension",
               "exchange": "grief", "varroAfter": "grief", "toKane": "dread", "kaneFinch": "dread", "raidNight": "night", "raidTin": "dread",
               "halloranStrip": "dread", "posyRaw": "tender", "guardOffer": "dread", "backToRhea5": "hope", "haldane": "hope", "councilMire": "camp",
               "drainIn": "dread", "drainKith": "tension", "mireIn": "dread", "fennick": "tension", "mireGuards": "fire", "mireCorran": "grief",
               "corranBath": "grief", "posyPool": "grief", "trial": "grief", "surveyRead": "dread", "surveyTell": "grief", "summerTrial": "hope",
               "captain": "camp", "firstCommand": "tension", "lastNight": "tender", "thornBed3": "night", "kane3": "camp"},
    "stages": {"ad3": "tension", "ad5": "dread", "ad6": "fire", "ad8": "grief", "ae1": "night", "ae3": "grief", "ae4": "dread", "ad14": "dread", "ad15": "tension",
               "ad16": "tender", "ad16l": "grief"},
}

story = {"id": "act3", "title": "Act III: The Houses", "voiced": voiced, "moods": moods, "cast": cast, "objectives": objectives,
         "actors": actors, "steps": steps, "zones": zones, "looks": looks, "songs": songs, "hazards": [], "scripts": S}

if __name__ == "__main__":
    with open(OUT, "w") as f:
        json.dump(story, f, indent=1, ensure_ascii=False); f.write("\n")
    for id, b in BATTLES.items():
        with open(os.path.join(ROOT, "data/battle", id + ".json"), "w") as f:
            json.dump(b, f, indent=1); f.write("\n")
    print(len(S), "scripts,", len(actors), "actors,", len(BATTLES), "battles")
