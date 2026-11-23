#!/usr/bin/env python3
"""The towns in the lands Rhea can reach in the first summer that the story doesn't otherwise use.

Mathew (2026-11-03): every town in a region that's open should be open too, unless the story blocks it.
Each town gets its own small map (data/maps/town-<id>.json) and its people (data/story/towns.json): who lives
there, what they say about the year since Larkfold burned, and a way back out to the land it sits in.
Run: python3 tools/world/towns.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
LEGEND = {
    "T": "tree", ",": "grass", ".": "cobble", ":": "path", "h": "wall", "r": "roof", "d": "door", "w": "well",
    "S": "stall", "H": "hay", "x": "crate", "f": "fence", "~": "water", "=": "bridge", "e": "exit", "C": "cart",
    "F": "campfire", "t": "tent", "R": "rock", "c": "cliff", "m": "moss", "s": "steps", "o": "cave", "*": "flowers",
    "p": "plank", "K": "cloud", "a": "terrace", "b": "table", "/": "trail",
}

# id, land, name, music, rows, people [(id, name, look, x, y, [lines])], signs [(x, y, text)]
# Lines: a string is said by that person; ("", text) is narration.
TOWNS = [
    dict(id="highmoss", land="cloudline", name="Highmoss", music="road", rows=[
        "KKKKKKKKKKKKKKKKKKKKKKKK",
        "KccccccccccccccccccccccK",
        "Kcmmmmmmmmmmmmmmmmmmmm,K",
        "Kcaaaaaaaaaaaaaaaaass,,K",
        "Kc,mmmmmmmmmmmmmmmm,,,,K",
        "Kc,,rrrr,,,,,rrrr,,,,,,K",
        "Kc,,hdhh,,,,,hhdh,,HH,,K",
        "Kc,,::::::::::::::,,HH,K",
        "Kc,,:,,,,,,w,,,,,:,,,,,K",
        "Kc,,::::::::::::::::,,,K",
        "Kc,,,,xx,,,,,,,,,,:,,,,K",
        "KcTT,,,,,,,,,,,,,,:,,TTK",
        "KcTTTTTTTTTTTTTTTT:TTTTK",
        "KKKKKKKKKKKKKKKKKKeeKKKK",
    ], spawn=(18, 12), people=[
        ("hm-gatherer", "Moss gatherer", "vil1", 9, 4, [
            "\"Moss for bedding, moss for wounds. It grows up here because nothing else will.\"",
            "\"The Commons buys all we can cut now. Kane's surgeons pack it into cuts. Better than the Guild paying us in tins.\""]),
        ("hm-widow", "Widow Sorrel", "vil2", 15, 8, [
            "\"Larkfold sang on harvest nights. We could hear it from here, over the cloud. It's been quiet a year.\"",
            "\"If you're from down there, girl, you're welcome to a bowl. Nobody's asked for a song since.\""]),
        ("hm-boy", "Tobin", "vil3", 6, 9, [
            "\"Ma says the grey coats came up the cloud path. There's no cloud path. I've looked.\""]),
    ], signs=[(11, 8, "A well with a moss-lined bucket. The water up here tastes of stone and cold.")]),

    dict(id="dripstone", land="cloudline", name="Dripstone", music="caves", rows=[
        "RRRRRRRRRRRRRRRRRRRRRR",
        "RRRRoRRRRRRRRRRRRoRRRR",
        "RR,,:,,,,,,,,,,,,:,,RR",
        "RR,,:::::::::::::::,RR",
        "RR,,,,,,,,~~,,,,,:,,RR",
        "RRrrrr,,,,~~,,rrrr:,RR",
        "RRhhdh,,,,~~,,hdhh:,RR",
        "RR,,:::::::==:::::::RR",
        "RR,,,,,,,,~~,,,,,,,,RR",
        "RR,xx,,,,,~~,,,,,SS,RR",
        "RR,,,,,,,,~~,,,,,,,,RR",
        "RRTT,,,,,,~~,:,,,,TTRR",
        "RRTTTTTTTT~~T:TTTTTTRR",
        "RRRRRRRRRRRRReeRRRRRRR",
    ], spawn=(13, 12), people=[
        ("ds-keeper", "Spring keeper", "vil4", 6, 7, [
            "\"Every drop in this village has been through the mountain first. Takes forty years, they say.\"",
            "\"The Guild wanted the springs for a hatchery. Brood rooms need warm water. The caves are too cold for them, thank the stone.\""]),
        ("ds-seller", "Water seller", "vil5", 16, 8, [
            "\"Mineral water. Good for the raw, people say. It isn't. Nothing is. But it's something to hold in your hands.\""]),
        ("ds-girl", "Nell", "kid2", 12, 10, [
            "\"There's a cave that sings when the wind's right. Like someone humming under the hill.\"",
            ("", "Ash's ears go flat at the cave mouth, then forward again.")]),
    ], signs=[(4, 2, "A cave mouth, dripping. Someone has chalked tally marks inside: days, or people.")]),

    dict(id="mistfold", land="cloudline", name="Mistfold", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,ffffffffff,,,rrrr,,,,T",
        "T,f,,,,,,,,f,,,hhdh,,,,T",
        "T,f,,,,,,,,f,,,,::,,,,,T",
        "T,f,,,,,,,,f::::::,,,,,T",
        "T,ffff::ffff:,,,,,,HH,,T",
        "T,,,,,::::::::,,,,,HH,,T",
        "T,rrrr,,,,,,,:,,,,,,,,,T",
        "T,hdhh,,,,w,,:,,rrrr,,,T",
        "T,,:::::::::::::hhhd,,,T",
        "T,,,,,,,,,,,,:,,,,,:,,,T",
        "TTTTTTTTTTTTT:TTTTT:TTTT",
        "TTTTTTTTTTTTTeeTTTTTTTTT",
    ], spawn=(13, 12), people=[
        ("mf-herder", "Loftbuck herder", "vil6", 12, 5, [
            "\"The mist sits in the fold all summer. The bucks like it. Keeps the flies off and the Wardens lost.\"",
            "\"A Warden came through in spring asking for Larkfold folk. We sent him round the fold three times. He went home wet.\""]),
        ("mf-buck", "", "loftbuck", 6, 4, [
            ("", "A big loftbuck, half asleep in the mist. It sniffs Ash, decides she's no trouble, and goes back to sleep.")]),
        ("mf-old", "Old Fen", "vil7", 8, 10, [
            "\"I wore a lull once, after the fall that did my hip. Six months. I've still got the rings.\"",
            "\"Took me a whole winter of the raw to come off it. I'd not wish that on a Warden.\""]),
    ], signs=[(10, 9, "The well is wrapped in old fleece against the frost.")]),

    dict(id="kerrow", land="vale", name="Kerrow", music="road", rows=[
        "cccccccccccccccccccccccccc",
        "c,,,rrrr,,,,,,,,,rrrr,,,,c",
        "c,,,hhdh,,,,,,,,,hdhh,,,,c",
        "c,,,,::::::::::::::,,,,,,c",
        "c,,,,:,,,,,,,,,,,,,,,,,,,c",
        "c~~~~~~~~~~==~~~~~~~~~~~~c",
        "c~~~~~~~~~~==~~~~~~~~~~~~c",
        "c,,,,,,,,,,::,,,,,,,,,,,,c",
        "c,,rrrr,,,,::,,,,SS,,xx,,c",
        "c,,hdhh,,,,::::::,,,,,,,,c",
        "c,,,::::::::,,,,,,,,,,,,,c",
        "c,,,,,,,,,,::,,,,,,,,,TT,c",
        "cTTTTTTTTTT::TTTTTTTTTTTTc",
        "ccccccccccceeccccccccccccc",
    ], spawn=(11, 12), people=[
        ("kr-ferry", "Bridge warden", "vil1", 12, 7, [
            "\"Kerrow's bridge, Kerrow's toll. One copper, or a song, or a good story. Commons go free since spring.\""]),
        ("kr-smith", "Smith Garra", "vil4", 18, 9, [
            "\"I shoe the Guild's cart horses and I shoe the Commons' too. A horse doesn't pick a side.\"",
            "\"But I put the Guild's nails in a little crooked. Don't tell anyone.\""]),
        ("kr-mother", "Annick", "vil2", 7, 3, [
            "\"The indenture carts take the gorge road because it's quiet. My eldest went on one, two winters back.\"",
            ("from", "a3", "\"You're with the Commons now? If you ever stop one of those carts, would you look for a boy called Dell? Freckles. Laughs like a goose.\"")]),
    ], signs=[(5, 4, "Gorge walls on both sides. The river under the bridge is loud enough to talk under.")]),

    dict(id="ropebridge", land="vale", name="Ropebridge", music="road", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,rrrr,,,,,,,,,,rrrr,,T",
        "T,,hhdh,,,,,,,,,,hdhh,,T",
        "T,,,,:::::::::::::,,,,,T",
        "T,,,,,,,,,,::,,,,,,,,,,T",
        "ccccccccccc::ccccccccccc",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "KKKKKKKKKKKppKKKKKKKKKKK",
        "ccccccccccc::ccccccccccc",
        "T,,,xx,,,,,::,,,,,HH,,,T",
        "T,,,,,,,,,,::,,,,,,,,,,T",
        "TTTTTTTTTTT::TTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTT",
    ], spawn=(11, 12), people=[
        ("rb-ropemaker", "Ropemaker Hask", "vil5", 13, 10, [
            "\"Every rope in that bridge, I twisted. Walk it slow and don't look down. Down is a long way.\"",
            "\"Hask's my name, not the village. The village was further west. I don't talk about it.\""]),
        ("rb-girl", "Wren", "kid", 9, 4, [
            "\"I can run the bridge in eleven steps. Ma says if she sees me do it again she'll tie me to the post.\""]),
        ("rb-lookout", "Lookout", "vil3", 18, 3, [
            "\"From here you can see the whole Vale on a clear day. Millbridge, the weir, the Sallow chimneys.\"",
            "\"Those chimneys smoke day and night. My cousin says it's the boilers. Brood rooms have to be hot as summer.\""]),
    ], signs=[(12, 8, "The rope bridge sways under Rhea's weight. Far below, the gorge is full of cloud.")]),

    dict(id="weirbank", land="vale", name="Weirbank", music="town", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrrr,,,,rrrr,,,,rrrrr,T",
        "T,hhdhh,,,,hdhh,,,,hhhdh,T",
        "T,,,:,,,,,,,:,,,,,,,,,:,,T",
        "T,,,::::::::::::::::::::,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "T~~~~~~~~~~~=~~~~~~~~~~~~T",
        "TRRRRRRRRRRR=RRRRRRRRRRRRT",
        "T~~~~~~~~~~~=~~~~~~~~~~~~T",
        "T,,,,SS,,,,,:,,,,,,xx,,,,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("wb-miller", "Miller Bain", "vil4", 6, 6, [
            "\"The weir turns three wheels. Grain, fulling, and the Guild's saw. Guess which one pays.\"",
            "\"I hear Millbridge buried eleven last year. Larkfold greenlings, they said. I don't believe it. I knew Maren.\""]),
        ("wb-fisher", "Eel fisher", "vil6", 18, 10, [
            "\"Eels come up the weir in autumn. You can stand on the stones and pick them out of the water like apples.\""]),
        ("wb-child", "Pip", "kid3", 14, 4, [
            "\"Is that a real kith? Does it bite? Can I touch it? It's looking at me.\"",
            ("", "Ash allows one pat, then walks behind Rhea's legs.")]),
    ], signs=[(12, 8, "The weir. Water pours over the stones in a long white curtain.")]),

    dict(id="drovers-halt", land="vale", name="Drovers' Halt", music="camp", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrrrrrrr,,,,ffffffff,,T",
        "T,rrrrrrrrr,,,,f,,,,,,f,,T",
        "T,hhhhdhhhh,,,,f,,,,,,f,,T",
        "T,,,,,:,,,,,,,,f,,,,,,f,,T",
        "T,,CC,::::::::,ffff,,ff,,T",
        "T,,CC,,,,,,,::::::::,,,,,T",
        "T,,,,,,F,,,,:,,,,,,,,HH,,T",
        "T,,,,,,,,,,,:,,,,,,,,HH,,T",
        "T,,xx,,,,,,,:,,,,,,,,,,,,T",
        "T,,,,,,,,,,,:,,,,,,,,,,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("dh-host", "Innkeeper Marl", "vil7", 6, 5, [
            "\"Drovers' Halt. Last beds before the Drove Road goes up into nothing. The Commons drink here now. They pay, mostly.\"",
            "\"No rooms tonight, sorry. Every bed's full of Kane's lot sleeping off a march.\""]),
        ("dh-drover", "Drover", "vil1", 8, 8, [
            "\"Took forty loftbucks to the Mill Cities in spring. The Guild checkpoint took four of them for 'inspection'. Never saw them again.\"",
            "\"South of the Vale it's all checkpoints now. You need papers to sneeze.\""]),
        ("dh-buck", "", "loftbuck", 18, 4, [
            ("", "A drove loftbuck in the pen, horns wrapped in rag against the wind. It watches Ash with polite interest.")]),
        ("dh-cat", "", "reedcat", 20, 9, [
            ("", "A reedcat asleep on the hay. It opens one eye at Rhea and closes it again.")]),
    ], signs=[(7, 8, "A drovers' fire, kept in all night. A pot of something brown hangs over it.")]),

    dict(id="longbarrow", land="vale", name="Longbarrow", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,,,T",
        "T,,mmmmmmmmmmmmmmmmmmm,,,T",
        "T,mmmmmmmmmmmmmmmmmmmmmm,T",
        "T,,mmmmmmmmmmmmmmmmmmm,,,T",
        "T,,,,R,,,,,,,,,,,,,,R,,,,T",
        "T,,,,,,::::::::::::,,,,,,T",
        "T,rrrr,:,,,,,,,,,,:,rrrr,T",
        "T,hdhh,:,,*,,,*,,,:,hhdh,T",
        "T,,:::::,,,,,,,,,,::::,,,T",
        "T,,,,,,,,,,,w,,,,,,,,,,,,T",
        "T,,,HH,,,,,,:,,,,,,,xx,,,T",
        "TTTTTTTTTTTT:TTTTTTTTTTTTT",
        "TTTTTTTTTTTeeTTTTTTTTTTTTT",
    ], spawn=(12, 12), people=[
        ("lb-keeper", "Barrow keeper", "vil5", 11, 6, [
            "\"The long barrow's older than the Guild, older than the Vale's name. Nobody knows who's in it.\"",
            "\"People leave things on it. Rings, mostly. Lull rings, cut off with a knife when somebody finally gets clean.\""]),
        ("lb-farmer", "Farmer Tilde", "vil2", 20, 10, [
            "\"Two of my lads went off to join Kane in the spring. I told them the Commons can't win. They told me nobody ever stopped a Guild cart either.\"",
            ("from", "a4", "\"That cart at Hob's Bend. That was you? With the children? Well. Sit down, then. There's bread.\"")]),
        ("lb-boy", "Ansel", "kid", 4, 9, [
            "\"If you lie on the barrow at night you can hear it breathing. Ansel's brother says so. I'm Ansel.\""]),
    ], signs=[(5, 5, "A standing stone at the barrow's end. Dozens of little iron rings hang from a nail in it.")]),

    # The Millcities, open once the Sallow checkpoint falls. Nobody here has a painted face yet, so they're heard
    # through Rhea's eyes (narration), not in speech boxes.
    dict(id="cinderwick", land="millcities", name="Cinderwick", music="town", rows=[
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
        "hrrrr.rrrrr..rrrrr.rrrrrrh",
        "hhdhh.hhdhh..hhdhh.hhhdhhh",
        "h........................h",
        "e..SS......w.......xx....e",
        "h........................h",
        "h~~~~~~~~~~==~~~~~~~~~~~~h",
        "h~~~~~~~~~~==~~~~~~~~~~~~h",
        "h.....p.....:.....p......h",
        "hrrrr.......:.......rrrr.h",
        "hhhdh.......:.......hdhh.h",
        "e...........:............h",
        "hhhhhhhhhhhhehhhhhhhhhhhhh",
    ], spawn=(12, 11), people=[
        ("cw-spinner", "", "vil2", 6, 4, [
            ("", "A spinner on her break, sitting on the edge of a stall. \"Fourteen hours on the frames. Fifteen, if the foreman's wearing. You get so you can't feel your fingers, then you get so you can't feel anything. That's what the tins are for.\"")]),
        ("cw-boy", "", "kid", 15, 5, [
            ("", "A boy with a sack of bobbins. \"The drain under the wall? Everybody knows about the drain. Nobody goes down it. It comes out at the Houses.\"")]),
        ("cw-lock", "", "vil6", 8, 8, [
            ("", "A lock-keeper leaning on his pole. \"Smoke and canals, that's Cinderwick. The mills drink the river and the Guild drinks the mills.\"")]),
    ], signs=[(11, 4, "A pump with a chained cup. A notice nailed above it: 'Indentured children may not drink from this pump.'")]),

    dict(id="lockside", land="millcities", name="Lockside", music="town", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T~~~~~~~~~~==~~~~~~~~~~T",
        "T,,,,,,,,,,:,,,,,,,,,,,T",
        "T,rrrr,,,,,:,,,,,rrrr,,T",
        "T,hhdh,,,,,:,,,,,hdhh,,T",
        "T,,,:::::::::::::::,,,,T",
        "e,,,,,,,,,,:,,,,,,,xx,,e",
        "T,,CC,,,,,,:,,,,F,,,,,,T",
        "T,,,,,,,,,,:,,,,,,,,,,,T",
        "TTTTTTTTTTTeTTTTTTTTTTTT",
    ], spawn=(11, 9), people=[
        ("ls-bargee", "", "vil4", 5, 7, [
            ("", "A bargee mending a rope. \"Corvel's hatchery is up the cut. You can hear the boilers knocking at night if the wind's right. Nobody round here goes near it.\""),
            ("from", "ad6b", "A bargee mending a rope. \"Ninety-one of them, walking up the towpath in the dark, holding hands. My wife cried. I didn't see anything, mind. I was asleep.\"")]),
        ("ls-woman", "", "vil5", 14, 6, [
            ("", "A woman hanging washing between two boats. \"My sister's girl went into Corvel's at seven. She'll come out at twenty, if she comes out. That's the indenture.\"")]),
        ("ls-dog", "", "reedcat", 19, 9, [
            ("", "A barge reedcat, asleep on a coil of rope in the sun. It doesn't care who you are.")]),
    ], signs=[(16, 8, "A brazier where the lock-keepers warm their hands. Someone has scratched a tally of boats into the post: hundreds of them.")]),

    dict(id="candle-galleries", land="millcities", name="The Candle Galleries", music="caves", rows=[
        "RRRRRRRRRRRRRRRRRRRRRR",
        "RRRoRRRRRRRRRRRRRRoRRR",
        "RR,:,,,,,,,,,,,,,,:,RR",
        "RR,:::::::::::::::::RR",
        "RR,,,,bb,,,,,,bb,,,,RR",
        "RR,xx,,,,,,,,,,,,,SSRR",
        "RR,,,,,,,,:,,,,,,,,,RR",
        "RR,,,,,,,,:,,,,,,,,,RR",
        "RRRRRRRRRReRRRRRRRRRRR",
    ], spawn=(10, 7), people=[
        ("cg-chandler", "", "vil7", 5, 6, [
            ("", "An old chandler dipping wicks. \"The galleries were cut for tallow, back when the mills ran on candles. Now the Sisters keep them lit, and nobody asks what for.\"")]),
        ("cg-novice", "", "vil3", 12, 2, [
            ("", "A young woman in a grey hood, trimming a lamp in a niche. She smiles at you, and doesn't say anything, and goes on to the next lamp.")]),
        ("cg-girl", "", "kid2", 15, 6, [
            ("", "A girl counting candles into a basket. \"Forty-one, forty-two. If I lose count I have to start again. I never lose count.\"")]),
    ], signs=[(14, 4, "A long table of cooling candles, hundreds of them, each stamped with a little lamp.")]),

    dict(id="lockkeepers-deep", land="millcities", name="Lockkeeper's Deep", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,T",
        "T,~~~~~~~~~~~~~~~~~~,T",
        "T,~~~~~~~~==~~~~~~~~,T",
        "T,,,,,,,,,:,,,,,,,,,,T",
        "T,rrrr,,,,:,,,,rrrr,,T",
        "T,hdhh,,,,:,,,,hhdh,,T",
        "T,,:::::::::::::::,,,T",
        "T,,,,,,,,,:,,,HH,,,,,T",
        "TTTTTTTTTTeTTTTTTTTTTT",
    ], spawn=(10, 8), people=[
        ("ld-keeper", "", "vil4", 6, 7, [
            ("", "The keeper of the deep lock, a big slow man. \"Deepest lock in Ostrel. Thirty feet of water. Takes an hour to fill. I've had a lot of hours to think.\"")]),
        ("ld-wife", "", "vil2", 15, 4, [
            ("", "His wife, gutting fish. \"He thinks too much. Here. Take a fish. You look like you've walked a long way.\"")]),
        ("ld-boy", "", "kid3", 12, 8, [
            ("", "A boy fishing off the lock gate with a bent nail. He hasn't caught anything. He doesn't mind.")]),
    ], signs=[(10, 3, "The deep lock's gate, green with weed, taller than a house.")]),
]

# ---- districts: the larger towns and cities have more than one street ------------------------------------------
# Mathew (2026-11-23): larger towns and cities need extra screens. Each district is its own map
# (data/maps/town-<town>--<district>.json, or <map>--<district> for a town with a hand-made map), joined to the
# town by gates ('e' tiles at the side). GATES lists both ways: (map, x, y) -> (map, x, y, facing).
# A person whose first line is ("shop", <id>) keeps a stall: talking opens that shop (data/towns/shops.json).
DISTRICTS = [
    dict(id="town-cinderwick--foundry", name="Cinderwick, the Foundry Ward", music="town", rows=[
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
        "hrrrrrr..rrrrrrr..rrrrrrrh",
        "hhhhdhh..hhhdhhh..hhdhhhhh",
        "h........................h",
        "h..xx....RR.....F....CC..h",
        "e........................h",
        "h...........:............h",
        "h~~~~~~~~~~~=~~~~~~~~~~~~h",
        "h~~~~~~~~~~~=~~~~~~~~~~~~h",
        "h.....xx....:.....HH.....h",
        "h............F...........h",
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
    ], people=[
        ("cf-puddler", "", "vil4", 14, 4, [
            ("", "A puddler with a long iron bar, stirring something white-hot through a hatch. He doesn't look up. \"Warden steel. They take every bar we make and pay for half. The other half's what they call protection.\"")]),
        ("cf-foreman", "", "vil6", 6, 6, [
            ("", "A foreman with a slate and a cough. \"Sixty hands on the day shift, forty at night. Forty-one, if you count the boy who sweeps the slag. I don't. He's not on the books.\""),
            ("from", "ad1", "The foreman again, quieter. \"Is it true about the cart? The children? ... Don't tell me. If I know, I'd have to say.\"")]),
        ("cf-ringkeeper", "", "vil1", 10, 9, [
            ("", "A woman with a slate and a bag of coin sits on an upturned crucible by a square of raked slag-sand. \"The Foundry ring. One on one, no blades, first to yield or fall. Beat my fighter and the purse is yours.\""),
            ("steps", [{"choose": "The ring-keeper waits, chalk in hand.", "options": [
                {"label": "Fight Slag Tam (purse 20)", "hint": "Strong, and not subtle.", "when": {"not": "won.duel.ring-tam"}, "do": [{"duel": "ring-tam", "win": [{"say": "", "text": "The ring-keeper chalks your name on the slate, under Tam's, and crosses his out. \"Hesketh next, if you want him.\""}], "lose": [{"say": "", "text": "\"Come back when you can stand,\" the ring-keeper says, not unkindly."}]}]},
                {"label": "Fight Hesketh (purse 40)", "hint": "Quick, and he feints.", "when": {"flag": "won.duel.ring-tam", "not": "won.duel.ring-hesketh"}, "do": [{"duel": "ring-hesketh", "win": [{"say": "", "text": "\"Nobody reads Hesketh,\" the ring-keeper says. \"Moll will want to meet you.\""}], "lose": [{"say": "", "text": "\"He does that to everyone,\" the ring-keeper says."}]}]},
                {"label": "Fight Iron Moll (purse 80)", "hint": "Champion six winters. Don't trade blows.", "when": {"flag": "won.duel.ring-hesketh", "not": "won.duel.ring-moll"}, "do": [{"duel": "ring-moll", "win": [{"say": "", "text": "The ring-keeper wipes the slate clean and writes one name at the top. Yours."}], "lose": [{"say": "", "text": "\"Six winters,\" the ring-keeper says. \"You won't be the last to try.\""}]}]},
                {"label": "Fight Moll again, for the crowd", "hint": "No purse. Just the noise.", "when": {"flag": "won.duel.ring-moll"}, "do": [{"duel": "ring-moll"}]},
                {"label": "Not now", "do": []}]}]),
        ]),
        ("cf-sweeper", "", "kid3", 19, 10, [
            ("", "The slag boy, black to the eyes. \"I'm saving for boots. Forty coin. I've got six. The rest of my wage is my mum's tins.\"")]),
    ], signs=[(9, 4, "A slag heap, still warm. Children pick through it for bits of good iron."),
              (16, 4, "The puddling furnace. The heat comes off it like a hand pushing you back.")]),

    dict(id="town-cinderwick--rows", name="Cinderwick, the Spinning Rows", music="dusk", rows=[
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
        "hrrrrrrrrrrr..rrrrrrrrrrrh",
        "hhhhhdhhhhhh..hhhhhhdhhhhh",
        "h........................h",
        "h.bb.bb.bb..........bb.bbh",
        "h........................e",
        "h.bb.bb.bb...w......bb.bbh",
        "h........................h",
        "h..xx.......:.......HH...h",
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
    ], people=[
        ("cr-girl", "", "kid2", 4, 5, [
            ("", "A girl of nine or ten, walking the length of the frames, tying broken threads without looking. \"Don't stand there, they'll see I've stopped.\" She hasn't stopped."),
            ("", "Her wrist has a number inked on it. Not a ring scar. An indenture number.")]),
        ("cr-overseer", "", "vil1", 16, 3, [
            ("", "An overseer with a watch on a chain. \"Visitors are not permitted on the rows. ... Very well. Five minutes. Don't speak to them, it slows them down.\"")]),
        ("cr-old", "", "vil7", 12, 7, [
            ("", "An old spinner on a stool by the pump, too slow for the frames now, sorting bobbins. \"I came in at eight. They said, ten years and your indenture's paid. That was fifty-one years ago. The sums changed.\"")]),
    ], signs=[(13, 6, "The row's pump. A sign: 'Water at the half-bell only.'"),
              (2, 4, "Spinning frames, hundreds of spindles each, running even with nobody at them.")]),

    dict(id="town-cinderwick--market", name="Cinderwick, the Canal Market", music="town", rows=[
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
        "h~~~~~~~~~~~~~~~~~~~~~~~~h",
        "h~~~~~~~~~~~~~~~~~~~~~~~~h",
        "hpppppppppppppppppppppppph",
        "h........................h",
        "h.SS...SS...SS....SS..SS.h",
        "h........................h",
        "h...x.......w.......CC...h",
        "h........................e",
        "hrrrrr...........rrrrrr..h",
        "hhhdhh...........hhdhhh..h",
        "hhhhhhhhhhhhhhhhhhhhhhhhhh",
    ], people=[
        ("cm-trader", "", "vil5", 8, 6, [("shop", "cinderwick"),
            ("", "A trader behind a stall of bandages, glass jars and iron fittings. \"Coin first, questions never. What are you after?\"")]),
        ("cm-bargewife", "", "vil2", 20, 4, [
            ("", "A bargewife unloading sacks onto the quay. \"Everything in Ostrel comes through this market once. Grain in, cloth out, children in, tins out.\"")]),
        ("cm-tinman", "", "vil3", 13, 6, [
            ("", "A stall with nothing on it but a locked box. The man behind it smiles. \"Tins are sold at the Guild counter, friend. I only hold places in the queue.\"")]),
        ("cm-boy", "", "kid", 5, 8, [
            ("", "A boy holding out a cap. \"A coin for the Houses, miss? My sister's in there. They let you buy them a candle.\"")]),
    ], signs=[(12, 7, "A market pump. Someone has chalked the price of bread on it, crossed it out, and chalked a higher one."),
              (3, 3, "The quay planks, slick with grain dust and canal water.")]),

    dict(id="town-lockside--quay", name="Lockside, the Quay", music="town", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "TppppppppppppppppppppppT",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,,SS,,,,CC,,,,xx,,HH,,T",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrr,,,,,,,,,,,,,,,,,e",
        "T,hhdh,,,,F,,,,,,,,,,,,T",
        "TTTTTTTTTTTTTTTTTTTTTTTT",
    ], people=[
        ("lq-chandler", "", "vil4", 3, 6, [("shop", "lockside"),
            ("", "A ship's chandler sitting on an upturned barrel. \"Rope, gut, bandage, and anything the bargees leave behind. Buying?\"")]),
        ("lq-girl", "", "kid2", 14, 4, [
            ("", "A girl dangling her feet over the quay. \"Boats go up full of grain and come down full of nothing. That's how you know they're from Corvel's.\"")]),
        ("lq-bargee", "", "vil6", 9, 7, [
            ("", "A bargee eating soup by the brazier. \"The lock gates here are older than the Guild. Older than the Crown. They'll be here when both are gone, and still leaking.\"")]),
    ], signs=[(10, 8, "A brazier for the night lock-crews. Kettles hang over it.")]),

    dict(id="town-lockside--towpath", name="Lockside, the Towpath", music="dusk", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T::::::::::::::::::::::T",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,,TT,,,,,,TT,,,,ffffffT",
        "T,,,,,,,,,,,,,,,,f,,,,,T",
        "e,,,,,,,,,,,,,,,,f,,,,,T",
        "T,,TT,,,,,,TT,,,,f,,,,,T",
        "TTTTTTTTTTTTTTTTTTTTTTTT",
    ], people=[
        ("lt-walker", "", "vil1", 8, 4, [
            ("", "A man leading a towing loftbuck along the path. \"Up to Corvel's and back, three times a day. The buck knows the way. I stopped looking at the fence a long time ago.\""),
            ("from", "ad6b", "The towing man stops. \"Ninety-one of them, coming down this path in the dark. Holding hands. The buck didn't even shy. Like it knew they were all right.\"")]),
        ("lt-kid", "", "kid3", 14, 7, [
            ("", "A boy throwing stones at the canal. \"There's a hatchery up there. You can't see it from here. You can smell it though.\"")]),
    ], signs=[(17, 6, "A Guild fence, new timber, tarred. A painted board: 'Corvel Hatchery. No visitors. No questions.'"),
              (12, 3, "The towpath, worn into two grooves by hooves.")]),

    dict(id="millbridge--mills", name="Millbridge, the Mill Quarter", music="town", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T~~~~~~=~~~~~~~~=~~~~~~T",
        "T,rrrrr,:,rrrrrr:,rrrr,T",
        "T,hhdhh,:,hhdhhh:,hdhh,T",
        "T,......:.......:......T",
        "e......................T",
        "T..SS......w.......xx..T",
        "T.....................HT",
        "TTTTTTTTTTTTTTTTTTTTTTTT",
    ], people=[
        ("mm-miller", "", "vil6", 12, 6, [
            ("", "A miller white to the elbows with flour. \"Three wheels on this race, and every one of them older than my grandmother. Millbridge grinds for the whole vale.\""),
            ("from", "a4", "The miller nods at you. \"You're the ones who stopped the cart at Hob's Bend. My cousin's girl was in it. Whatever you need ground, it's ground.\"")]),
        ("mm-stall", "", "vil5", 4, 8, [("shop", "millbridge"),
            ("", "A woman at a stall of mill silk, bandages and bits of harness. \"Mill silk cord, best on the river. And the willowbark's fresh. What'll it be?\"")]),
        ("mm-kid", "", "kid", 18, 5, [
            ("", "A girl sitting on a sack, watching the wheel go round. \"If you count to a hundred the big wheel goes round nine times. I've checked.\"")]),
    ], signs=[(7, 2, "A mill wheel, dark with water, turning slow and heavy. The whole quarter thumps with it."),
              (11, 7, "A pump with a flour-white handle.")]),

    dict(id="millbridge--wharf", name="Millbridge, the Wharf", music="road", rows=[
        "TTTTTTTTTTTTTTTTTTTTTTTT",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,rrrr,,,,,,,,,,,rrrr,,T",
        "T,hdhh,,,,xx,,,,,hhdh,,T",
        "T,,,,,,,,,,,,,,,,,,,,,,T",
        "T,,CC,,,,,,,,,,,,,,,HH,e",
        "TppppppppppppppppppppppT",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "T~~~~~~~~~~~~~~~~~~~~~~T",
        "TTTTTTTTTTTTTTTTTTTTTTTT",
    ], people=[
        ("mw-ferryman", "", "vil4", 8, 5, [
            ("", "A ferryman sitting in the stern of his flat boat. \"Down to Weirbank and back, a copper a head. Kith ride free if they don't stand up.\"")]),
        ("mw-wife", "", "vil2", 15, 4, [
            ("", "A woman counting sacks onto a cart. \"Flour out, salt in. Guild tolls on both. They say the Guild's a trade house. It's a toll gate with a hatchery attached.\"")]),
    ], signs=[(10, 3, "Crates stamped with the Guild's mark: a hand over a wheel.")]),
]

# Both ways through every gate: (map, x, y) -> (map, x, y, facing)
GATES = [
    (("town-cinderwick", 25, 4), ("town-cinderwick--foundry", 1, 5, "right")),
    (("town-cinderwick--foundry", 0, 5), ("town-cinderwick", 24, 4, "left")),
    (("town-cinderwick", 0, 4), ("town-cinderwick--rows", 24, 5, "left")),
    (("town-cinderwick--rows", 25, 5), ("town-cinderwick", 1, 4, "right")),
    (("town-cinderwick", 0, 11), ("town-cinderwick--market", 24, 8, "left")),
    (("town-cinderwick--market", 25, 8), ("town-cinderwick", 1, 11, "right")),
    (("town-lockside", 0, 7), ("town-lockside--quay", 22, 7, "left")),
    (("town-lockside--quay", 23, 7), ("town-lockside", 1, 7, "right")),
    (("town-lockside", 23, 7), ("town-lockside--towpath", 1, 7, "right")),
    (("town-lockside--towpath", 0, 7), ("town-lockside", 22, 7, "left")),
    (("millbridge", 29, 6), ("millbridge--mills", 1, 6, "right")),
    (("millbridge--mills", 0, 6), ("millbridge", 28, 6, "left")),
    (("millbridge", 0, 14), ("millbridge--wharf", 22, 5, "left")),
    (("millbridge--wharf", 23, 5), ("millbridge", 1, 14, "right")),
]
# Millbridge's own map is hand-made (Act I); its two gates are opened here.
HAND_GATES = {"millbridge": [(29, 6), (0, 14)]}

LOOKS_NOTE = "vil1..vil7 are defined in src/art/people.ts"


ORDER = [s for s in json.load(open(os.path.join(ROOT, "data", "world", "gates.json")))["order"] if s.startswith("a")]


def check(rows, tid):
    w = len(rows[0])
    for i, r in enumerate(rows):
        assert len(r) == w, f"{tid} row {i} is {len(r)} wide, not {w}"
        for ch in r: assert ch in LEGEND, f"{tid}: unknown tile {ch!r}"


def add_people(story, mid, rows, people):
    for pid, name, look, x, y, lines in people:
        assert rows[y][x] in ",.:*m/", f"{pid} stands on {rows[y][x]!r}"
        talk = []
        for ln in lines:
            if isinstance(ln, tuple) and ln[0] == "shop": continue
            if isinstance(ln, tuple) and ln[0] == "steps": talk.extend(ln[1]); continue
            if isinstance(ln, tuple) and ln[0] == "from":  # only once the story has got that far
                talk.append({"if": {"stage": ORDER[ORDER.index(ln[1]):]}, "then": [{"say": pid if name else "", "text": ln[2]}]})
            elif isinstance(ln, tuple): talk.append({"say": "", "text": ln[1]})
            else: talk.append({"say": pid, "text": ln})
        shop = next((ln[1] for ln in lines if isinstance(ln, tuple) and ln[0] == "shop"), None)
        if shop: talk.append({"shop": shop})
        if name: story["cast"][pid] = name
        story["actors"].append({"id": pid, "map": mid, "x": x, "y": y, "look": look, "when": {"stagePrefix": "a"}, "talk": talk})


def main():
    lands = {l: json.load(open(os.path.join(ROOT, "data", "maps", f"land-{l}.json"))) for l in ("cloudline", "vale", "millcities")}
    story = {"id": "towns", "title": "The open towns", "voiced": [], "cast": {}, "objectives": {}, "actors": [], "steps": [],
             "zones": [], "looks": [], "songs": [], "hazards": [], "scripts": {}}
    for t in TOWNS:
        rows = t["rows"]; check(rows, t["id"])
        legend = {k: v for k, v in LEGEND.items() if any(k in r for r in rows)}
        sx, sy = t["spawn"]
        entities = [{"id": "start", "kind": "spawn", "x": sx, "y": sy}]
        for i, (x, y, text) in enumerate(t["signs"]):
            entities.append({"id": f"{t['id']}-sign{i}", "kind": "sign", "x": x, "y": y, "props": {"text": text}})
        mid = f"town-{t['id']}"
        json.dump({"id": mid, "name": t["name"], "music": t["music"], "rest": True, "legend": legend, "rows": rows, "entities": entities},
                  open(os.path.join(ROOT, "data", "maps", f"{mid}.json"), "w"), indent=1)
        land = lands[t["land"]]
        place = next(p for p in land["places"] if p["id"] == t["id"])
        # in from the world map, out by the exit tiles at the bottom
        story["steps"].append({"map": f"land-{t['land']}", "at": [place["x"], place["y"]],
                               "do": [{"goto": {"map": mid, "x": sx, "y": sy - 1, "facing": "up"}}], "when": {"stagePrefix": "a"}})
        for x, ch in enumerate(rows[-1]):
            if ch == "e":
                story["steps"].append({"map": mid, "at": [x, len(rows) - 1],
                                       "do": [{"goto": {"map": f"land-{t['land']}", "x": place["x"], "y": place["y"] + 1, "facing": "down"}}]})
        add_people(story, mid, rows, t["people"])
        for x, y, _ in t["signs"]:
            assert rows[y][x] not in "~K", f"{t['id']} sign at {x},{y}"
    maps = {f"town-{t['id']}": t["rows"] for t in TOWNS}
    for d in DISTRICTS:
        rows = d["rows"]; check(rows, d["id"]); maps[d["id"]] = rows
        legend = {k: v for k, v in LEGEND.items() if any(k in r for r in rows)}
        entities = [{"id": f"{d['id']}-sign{i}", "kind": "sign", "x": x, "y": y, "props": {"text": text}} for i, (x, y, text) in enumerate(d["signs"])]
        for x, y, _ in d["signs"]: assert rows[y][x] not in "~K", f"{d['id']} sign at {x},{y}"
        # a district is entered by its gates, never spawned into
        gate = next(t for (_, t) in GATES if t[0] == d["id"])
        entities.insert(0, {"id": "start", "kind": "spawn", "x": gate[1], "y": gate[2]})
        json.dump({"id": d["id"], "name": d["name"], "music": d["music"], "rest": True, "legend": legend, "rows": rows, "entities": entities},
                  open(os.path.join(ROOT, "data", "maps", f"{d['id']}.json"), "w"), indent=1)
        add_people(story, d["id"], rows, d["people"])
    for mid, gates in HAND_GATES.items():
        path = os.path.join(ROOT, "data", "maps", f"{mid}.json"); m = json.load(open(path))
        for x, y in gates: m["rows"][y] = m["rows"][y][:x] + "e" + m["rows"][y][x + 1:]
        m["legend"]["e"] = "exit"
        json.dump(m, open(path, "w"), indent=1); maps[mid] = m["rows"]
    for (fm, fx, fy), (tm, tx, ty, facing) in GATES:
        assert maps[fm][fy][fx] == "e", f"gate {fm} {fx},{fy} is {maps[fm][fy][fx]!r}"
        assert maps[tm][ty][tx] in ",.:p", f"arrival {tm} {tx},{ty} is {maps[tm][ty][tx]!r}"
        story["steps"].append({"map": fm, "at": [fx, fy], "do": [{"goto": {"map": tm, "x": tx, "y": ty, "facing": facing}}]})
    json.dump(story, open(os.path.join(ROOT, "data", "story", "towns.json"), "w"), indent=1)
    print(len(TOWNS), "towns,", len(DISTRICTS), "districts")


if __name__ == "__main__":
    main()
