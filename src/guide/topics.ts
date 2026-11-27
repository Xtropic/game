// The Guide: how every system in the game works, in plain words, with the real numbers. A topic opens the first
// time the player meets its system (a "How it works" card), and stays in the Guide (G, or Menu > Guide) for good.
// Rules only: nothing here names a place, person or event the player hasn't reached, so nothing is spoiled.
// {confirm}, {space}, {cancel}, {menu}, {notes}, {ledger}, {company}, {guide}, {timing}, {auto}, {run} are
// replaced with the key (or pad button) for that action when the page is drawn.

/** touch / touchHead: the same page for a phone or tablet, where there are no keys. */
export interface GuidePage { head: string; text: string; touch?: string; touchHead?: string; }
export interface GuideTopic { id: string; group: string; title: string; pages: GuidePage[]; }

export const GROUPS = ["Basics", "Battles", "Your company", "Thornwick", "Kith", "Command"] as const;

export const TOPICS: GuideTopic[] = [
  // ---------------------------------------------------------------- Basics
  { id: "basics", group: "Basics", title: "Getting around", pages: [
    { head: "Walking and talking", text: "Walk with the arrow keys or WASD. Hold {run} to run (Settings can make running the default). Walk up to someone or something and press {confirm} to talk or look. The objective line on screen always says what you're working towards now.",
      touch: "Tilt the phone to walk, like rolling a marble: lean the top away to go up, an edge down to go that way, further to run. Tap Level to set how you like to hold it. With tilt off (the button at the bottom left, or Settings), drag anywhere on the left half of the screen instead. Walk up to someone or something and tap A to talk or look. Run switches running on and off. Tap anywhere to move a conversation on. The objective line at the top always says what you're working towards now. Turning the phone on its side shows more of the world." },
    { head: "Keys worth knowing", text: "{menu}: the menu (party, gear, items, Thornwick, command, settings, saves, and this Guide).\n{guide}: this Guide, from anywhere, even mid-fight.\n{notes}: your notes, every word the story has explained so far.\n{company}: everyone who has joined you.\n{ledger}: Thornwick's ledger, once you hold it.\nN: sound on and off.",
      touchHead: "Buttons worth knowing", touch: "Menu (bottom right): party, gear, items, Thornwick, command, settings, saves, and this Guide.\nGuide: this Guide, from anywhere.\nLedger: Thornwick's ledger, once you hold it.\nB: back out of anything.\nSing: Rhea's foal song, where it helps.\nMenu > Settings: sound, voices, tilt, text speed.\nIn lists, tap a row to choose it and tap it again to use it. Long pages scroll with a drag." },
    { head: "Saving", text: "The game saves itself whenever you change map, after every fight and after anything that changes your company. Menu > Save also has three slots of your own, and can load the last autosave." },
    { head: "Choices", text: "Some choices change the story for good: who lives, who stays with you, what people remember about you. Nothing marks which ones, and none of them can be taken back, so choose what Rhea would choose. A save slot is the only way to go back." },
  ] },
  { id: "wounds", group: "Basics", title: "Wounds and resting", pages: [
    { head: "Wounds carry over", text: "Health isn't refilled after a fight. After a win, everyone gets back about a third of what they lost (a breather, a bandage). Anyone who went down gets up with a quarter of their health. The next fight starts from there." },
    { head: "Healing fully", text: "Walk into a town, inn or camp and everyone rests: all wounds are seen to. On the road, bandages, salves and teas from Menu > Items give back part of what was lost. Menu > Party shows each person's health." },
    { head: "Losing", text: "If everyone on your side goes down in a fight the story needs, you try it again. In a fight on the road you're driven back, and carry on hurt." },
  ] },
  { id: "levels", group: "Basics", title: "Levels and attributes", pages: [
    { head: "Experience", text: "Everyone who fights gains experience; tougher foes give more. Each level raises that person's attributes in the way they lean (a fighter grows stronger, a healer kinder). People go up to level 60, kith to 50. Menu > Party shows levels and attributes." },
    { head: "The seven attributes", text: "Might: blows and heavy work.\nGrit: health and taking hits.\nFinesse: shots, a wider timing ring, dodging, acting first.\nNerve: braces, holding firm, finishers.\nWits: acting first, reading what foes will do, thrown things.\nHeart: healing, the song, bonds with kith.\nPresence: shaking a foe's nerve, persuading, leading." },
    { head: "Everywhere, not just fights", text: "The same attributes decide duels, army battles, jobs at Thornwick and talks with other peoples. A gap matters less as both sides grow, so nobody is ever untouchable." },
  ] },

  // ---------------------------------------------------------------- Battles
  { id: "battles", group: "Battles", title: "Party battles", pages: [
    { head: "Turns", text: "Your side moves, then theirs. On each person's turn, choose a move with Up and Down and press {confirm}, then choose who it's aimed at. Your people's health shows at the bottom right, with the thin focus bar under each. The quickest act first: that's finesse and wits. A foe far quicker than all of you strikes before your turns." },
    { head: "The ring", text: "When one of yours strikes, a ring closes on the target. Press {space} (or tap) as it closes. Perfect: 1.5 times the damage. Good: 1.2 times. Too early or late: a plain hit.\nWhen a foe strikes, a blue ring closes on the one being hit. Press as it closes to brace: a perfect brace takes only 30% of the blow, a good one 60%. Finesse widens the ring; nerve makes braces stronger." },
    { head: "Reading what they'll do", text: "The mark over each foe shows what it means to do next round, so you can brace, guard or strike first. Your sharpest wits against each foe's wits decides how much you see: the move and who it's aimed at, only the move, or just a question mark." },
    { head: "Nerve: how fights are won", text: "NERVE (top right) is the other side's nerve. Every blow wears it down, and more so from someone with presence. When it breaks, whoever is left runs and the fight is won. You also win when every foe is down. You lose when all of yours are down." },
    { head: "Rows and guarding", text: "Each side has a front and a back row. Blows up close can only reach the front row while anyone stands in it; shots and thrown things reach anyone. Guard puts someone in front of a friend: they take the blows meant for that friend this round." },
    { head: "Dodging and ambush", text: "Anyone can slip a blow completely: their finesse against the attacker's, from 2% to 25%. A foe blinded by smoke loses its next move, and hits on it land as an ambush for 1.4 times the damage or more (wits)." },
    { head: "Help with timing", text: "{timing} turns on auto timing: every ring lands as Good without pressing. {auto} turns on auto battle: moves are chosen for you as well. Both are in Menu > Settings too, with the battle speed." },
  ] },
  { id: "kithcall", group: "Battles", title: "Kith beside you: the Call", pages: [
    { head: "Bonded kith", text: "A bonded kith doesn't take turns of its own. It follows its partner's good and perfect blows with one of its own, and once a round it jumps in front of its partner to take a blow for them. Kith never die in these fights: badly hurt, they bolt and come back after." },
    { head: "The Call meter", text: "CALL (top left) fills with good and perfect hits and braces. At 40, the handler can ask their kith for its art: a heavy move of its family, costing 40 of the meter; heart makes it hit harder. When the meter is full, Call appears at the top of the handler's moves: the kith charges the foes' front line, and the meter empties." },
  ] },
  { id: "focus", group: "Battles", title: "Focus and finishers", pages: [
    { head: "Focus", text: "The thin bar under each person's health is their focus. It grows with good timing (a perfect hit +30, a good one +15; a perfect brace +25, a good one +12), and with healing, guarding, smoke and the song. It starts empty in every fight." },
    { head: "Finishers", text: "When the bar turns gold, that person's finisher appears at the top of their moves. It's the move of their keepsake weapon, it hits much harder than a normal blow, and some reach a whole row or every foe. It draws on nerve and wits, not might. Using it empties the bar." },
  ] },
  { id: "thrown", group: "Battles", title: "Thrown things", pages: [
    { head: "From the pack", text: "Fire pots, numbing darts and snare charges in the pack show at the end of everyone's move list. Anyone can throw one. They hit hard whoever threw them, drawing on wits rather than might, and some reach more than one foe or pin a foe so it loses its move. Each is used up when thrown." },
    { head: "Getting more", text: "They're found on the road, sold at some stalls, and made in Thornwick's workshop once it has one (Ledger > Make)." },
  ] },
  { id: "leaving", group: "Battles", title: "Leaving a fight", pages: [
    { head: "Run", text: "In fights the story doesn't need (wild kith, patrols on the road), Run is at the end of the move list. It shows your chance of getting clear, which is better the quicker your party is than theirs. If it fails, they get a free turn." },
    { head: "Let them go", text: "When the foes are far weaker than you, Let them go ends the fight at once. Nobody is hurt, and nobody learns anything from it either: no experience." },
  ] },
  { id: "wild", group: "Battles", title: "Wild kith and the song", pages: [
    { head: "Calming a wild kith", text: "Rhea's foal song takes three timed notes. Sung at a wild kith, it calms it; the mark over it shows how far. At 100% it stops fighting and backs off to the edge of the field. Heart and perfect notes calm faster. Each kith's temperament matters: gentle and curious ones listen readily, skittish and stubborn ones slowly, and a proud one won't listen at all until it's been beaten below half its health." },
    { head: "Winning it over", text: "After the fight, a calmed kith may still be waiting. Offer it food. Each family of kith has one food it likes best, and the right food matters far more than anything else. Rhea's heart, the song's perfect notes and a gentle temperament all help. If it trusts her, it joins your company." },
    { head: "On your own kith", text: "Sung at one of your own kith, the song steadies it: it heals a little, and its next blow does 1.5 times the damage. A few shy kith never fight at all. They bolt when anyone comes near, and only come to bait they like, left by someone who then keeps still." },
  ] },

  // ---------------------------------------------------------------- Your company
  { id: "company", group: "Your company", title: "Your company", pages: [
    { head: "Who travels", text: "People who join stay with you for good. {company} shows everyone. Only some travel with Rhea: Menu > Party chooses who, with {confirm} on a name. How many depends on her rank: three at first, then four, then five. Ash is always with her, and doesn't count." },
    { head: "Who stays behind", text: "Those who don't travel wait at camp, and later at Thornwick, where they can be given work. Only those who fight gain experience from fights (Thornwick's schoolroom changes that)." },
  ] },
  { id: "gear", group: "Your company", title: "Keepsake weapons", pages: [
    { head: "Keepsakes", text: "Everyone carries one weapon of their own for the whole game. It never gets swapped out; it gets better. There are five tiers: Worn, Mended, Tempered, Masterwork and Named. Each tier adds damage (up to 1.6 times at Named) and teaches a new battle move." },
    { head: "Reforging", text: "Weapons are reforged at Thornwick's forge, for coin: about 60, 180, 450 and 900 for each tier in turn, less with a good smith at work there. A higher tier needs a better forge. At Masterwork you choose which way the weapon goes, and that choice is for good. A Named weapon needs its own story first." },
    { head: "Fittings", text: "Each weapon has two fitting slots: a working part and a charm. Fittings raise attributes or widen the timing ring. They're bought at stalls, found, and won. Change them in Menu > Gear; a fitting can be moved from one weapon to another." },
  ] },
  { id: "items", group: "Your company", title: "Items and shops", pages: [
    { head: "Items", text: "Menu > Items holds what the company carries. Bandages, salves and teas give back part of the health lost in fights (some reach one person, some everyone), so you can go on between towns. Nothing is used if nobody it could help is hurt." },
    { head: "Coin and stalls", text: "Coin comes from beating people (not kith), from your pay as you rise in rank, and later from Thornwick's traders and from pacts. Stalls in towns sell items, things to throw and fittings. Up and Down choose, {confirm} buys. A people you have a pact with sells to you for less." },
  ] },

  // ---------------------------------------------------------------- Thornwick
  { id: "thornwick", group: "Thornwick", title: "Thornwick and the ledger", pages: [
    { head: "The ledger", text: "Thornwick is your post, and everything about it is run from the ledger. Open it with {ledger}, with the gold Ledger button at the bottom right, from Menu > Thornwick, or at the crates in Thornwick's yard. Left and Right (or {notes} and {ledger}) change pages." },
    { head: "Days", text: "Thornwick's work happens a day at a time. A day passes each time the story moves on, when you rest there, and when you choose \"Let a day pass\" on the Works page. Each day the people there work, the builders build, the workshop makes, and the kith in the pens are raised." },
    { head: "Coin and supplies", text: "Raising a building costs coin and supplies, then days of builders' work. Supplies come in from haulers and traders at the stores. The top of the ledger always shows coin, supplies, the day, and what's being built." },
    { head: "Works and people", text: "Works: each building has levels, and each level opens new jobs, recipes or kinds of care. People: everyone staying at Thornwick can be given a job. Each job draws on two attributes, so the right person does far more. Cooks raise everyone's work; teachers give those staying behind experience each day." },
    { head: "Forge and Make", text: "Forge: reforge keepsake weapons (see Keepsake weapons). Make: choose what the workshop and the infirmary make each day from supplies: things to throw, bandages and salves. An infirmary also mends anyone left behind hurt." },
  ] },
  { id: "pens", group: "Kith", title: "Raising and breeding kith", pages: [
    { head: "How kith grow", text: "Kith gain levels like people do. How they're raised steers what grows: what they're fed, where they sleep, what work they do, who tends them and how they fight. These build up as habits, and at each level a share of the growth follows them. You see the direction in words and in the kith's body, never as points to spend." },
    { head: "The pens", text: "Kith that aren't travelling stay in Thornwick's pens. On the Pens page, choose each one's feed, pen and work. Better pens offer more choices. Rest as its work lets a kith recover." },
    { head: "Breeding", text: "With a breeding wing, any two grown kith can be bred: one litter a day. Two of the same family give a foal of their own kind. Two from different families give a cross, a new kind of kith that is neither parent, and every pair of families has its own cross. Breed a cross with a kith of a third family and the foal can be another new kind again. A foal takes after both parents: their potential, some traits and moves, and temperament. A line bred true for generations grows stronger, and a better wing passes on more. Some kith have never been seen; they come only from the right pair in the right conditions." },
  ] },
  { id: "training", group: "Kith", title: "Kith care and training", pages: [
    { head: "Energy and spirits", text: "Every kith has energy and spirits. Drills and hard pen work tire it; a rest day or a night in the pens brings energy back. Spirits rise with good sessions and time with you, and fall with poor ones. Low spirits make drills teach less." },
    { head: "Time together", text: "The first row on the Training page spends time with one kith: it raises its bond and spirits. Once a day." },
    { head: "Drills", text: "Each drill trains one attribute, and each is a short game you can play: press {confirm} on a drill to attend it, and the game's rules show before it starts. Or set it as the daily drill (Left and Right, or the Daily button), and the keeper runs it each day the kith has the energy. The keeper's best is Good; only a session you attend can be Great or Perfect. A first Perfect at a drill teaches the kith a new technique." },
    { head: "Take care", text: "Driving a tired kith through hard drills is a risk for some. A good keeper notices the signs first." },
  ] },
  { id: "roads", group: "Kith", title: "Kith expeditions", pages: [
    { head: "Sending a kith off", text: "On the Roads page, a kith staying at Thornwick can be sent off with a drover on one expedition. Each has one goal: a rare fitting to bring back, or a technique to learn. It takes some days, and the kith is away meanwhile." },
    { head: "Coming home", text: "When it returns, the attribute named on the expedition is tested against how hard it is (the page shows the odds). Pass or fail, the kith gets better at it and gains experience. The goal itself is met only on a pass, and only the first time. A curious kith finds more." },
  ] },
  { id: "tourney", group: "Kith", title: "Kith tournaments", pages: [
    { head: "Ranks", text: "A kith's rank is earned only by winning an event: Unranked, Yearling, Terrace, Valley, Cloudline, Crown. Each event takes kith of the rank just below its own, so a kith climbs one rank per win." },
    { head: "Into the ring", text: "Choose up to two or three of your kith (the event says how many) and pay the fee. You don't fight: your kith do, round after round, and the health they lose carries from one round to the next. Lose a round and you're out. Win the final and every kith that went in takes the rank, with the purse and the prize. Winning an event again pays a smaller purse." },
  ] },

  // ---------------------------------------------------------------- Command
  { id: "ranks", group: "Command", title: "Ranks", pages: [
    { head: "Rising", text: "Rhea's rank rises through the story, when she has earned it. Each rank opens something real: Menu > Command shows her rank and what it opens, and a card says so when she's promoted." },
    { head: "What each rank opens", text: "Recruit: three travel with you; pay 2 coin each time the story moves on.\nSergeant: four travel; pay 4.\nLieutenant: five travel; pay 7; envoys and gifts to other peoples.\nCaptain: pay 12; pacts, demands and marches; one allied company in army battles.\nMajor: pay 18; the war council picks two stratagems; two allied companies.\nCommander: pay 25; three allied companies.\nMarshal: pay 35; three stratagems; four allied companies." },
  ] },
  { id: "nations", group: "Command", title: "Other peoples", pages: [
    { head: "Standing", text: "Menu > Command lists the peoples you know and where you stand with each, from -100 to 100. What you do in the story moves it too. Press {confirm} on one to deal with them." },
    { head: "Envoys and gifts", text: "From Lieutenant. An envoy carries a letter for 10 coin of road costs: the envoy's presence and wits against that people's temper decide how well it's received. A gift is coin or supplies, whichever they value. Each can be sent once per people each time the story moves on." },
    { head: "Pacts, demands, marches", text: "From Captain. A pact is sealed when their whole price is met and the way to their land is open; from then on they give you something each time the story moves on (supplies, coin, cheaper stalls, a company for army battles). A demand takes coin now and costs standing, more if they refuse. A people at -40 or worse whose land is open can be marched on: win the army battle and they're held by force, giving half as much and no company." },
  ] },
  { id: "duels", group: "Command", title: "Duels", pages: [
    { head: "An exchange", text: "One against one. Your opponent shows how they're about to come at you, high, low or a straight thrust, then commits. Answer before the ring closes: Up parries high, Down parries low, Left steps aside from a thrust, Right strikes into them. The right answer turns their blow and lands one of yours. Striking trades blows (yours hits harder). A wrong answer, or none, and theirs lands." },
    { head: "Reading and feints", text: "How long their stance shows is your wits against their finesse. Some opponents show one stance and switch to another at the last moment: sharp wits may catch the switch early." },
    { head: "Stamina", text: "Every exchange costs breath, and a strike costs more. Out of breath, you read them for less time. Grit gives you more." },
    { head: "Words", text: "Every few exchanges you both step back. You can speak: presence against their nerve to shake them, or heart to calm their kith. Each thing can be said once, and speaking costs a breath. Their resolve falls with their guard and with words; at nothing, they yield." },
  ] },
  { id: "army", group: "Command", title: "Army battles", pages: [
    { head: "Companies and officers", text: "Each company is led by an officer from your company. Their attributes decide the company's size (presence), its morale (nerve), its charge (might), its use of ground and flanks (wits), its volleys (finesse) and how long it lasts (grit). Its kind sets its speed and reach: foot, pikes, bows or riders." },
    { head: "The war council", text: "Before the battle, the council chooses who leads which company (tap a company to change it) and picks a stratagem: something that changes the ground, the plan or where you start. Your officers say what they think. Higher ranks pick more stratagems. You also see what's known of the enemy's plan: your sharpest officer's wits against their commander's." },
    { head: "Orders", touch: "Tap a company of yours (blue), then the ground to move there, or a red company to attack it. Orders take time to arrive: longer the further a company is from your own, and the slower its officer's wits. Pause stops the clock and you can give orders while paused. Next company picks the next one, Speed changes how fast time runs, Hold keeps a company where it is.", text: "Click a company of yours (blue), then the ground to move there, or a red company to attack it. Orders take time to arrive: longer the further a company is from your own, and the slower its officer's wits. {space} pauses and you can give orders while paused. Tab picks the next company, T or + and - change speed, H holds a company where it is." },
    { head: "Fighting and morale", text: "Battles are won by breaking the other side's nerve, not by killing everyone. Losses, being hit in the flank or rear, and friends running drain a company's morale; at nothing it breaks and runs. A blow to the flank or rear counts double. Woods and walls shelter, high ground helps. Pikes stop riders; riders smash anyone caught in the open; bows shoot anyone in range." },
    { head: "Winning", text: "Each battle says what it takes: hold out until dark, or break them before the daylight runs out. The faint red arrows on the field are what you know of the enemy's plan." },
  ] },
];

export const topic = (id: string): GuideTopic | undefined => TOPICS.find((t) => t.id === id);
