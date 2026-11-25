"""The Long Road's maps: the seats of the nations Rhea visits between Lockside and the Broodhouse autumn.
Painted onto a grid so every row comes out the right width. Run: python3 tools/world/roadmaps.py
Each map's exits are 'e' tiles; tools/story/road.py walks them back to the land (or the next district)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2maps import G, save  # noqa: E402

TOWN = {"#": "stonewall", ".": "cobble", ",": "grass", ":": "path", "h": "wall", "r": "roof", "d": "door", "w": "well",
        "S": "stall", "H": "hay", "x": "crate", "f": "fence", "~": "water", "=": "bridge", "e": "exit", "C": "cart",
        "F": "campfire", "t": "tent", "T": "tree", "*": "flowers", "p": "plank", "b": "table", "g": "gate", "R": "rock",
        "I": "iwall", "k": "shelf", "B": "bed", "_": "wetfloor", "v": "tray", "c": "canal", "m": "marsh", "q": "reeds", "n": "snow", "P": "pines", "^": "steps", "s": "steppe", "a": "sand"}
MAPS = []


def house(g, x0, y0, x1, y1, doors):
    """A building seen from outside: roof on top, a wall row along the bottom with its doors."""
    g.rect(x0, y0, x1, y1 - 1, "r"); g.rect(x0, y1, x1, y1, "h")
    for x in doors: g.put(x, y1, "d")


def town(id, name, music, g, spawn, rest=True):
    legend = {k: v for k, v in TOWN.items() if any(k in r for r in g.rows())}
    m = save(id, name, music, legend, g, spawn, rest=rest)
    MAPS.append(m)
    return m


# ================================================================ leg 1: the West, Hollin and the College
# ---------------- Hollin's harvest fair, outside the town gate ----------------
# 28 x 14. The fair meadow under the wall: stalls, the target range (east), the gate north into the square,
# the road out (bottom middle).
F = G(28, 14, ",")
F.rect(0, 0, 27, 1, "#"); F.rect(13, 0, 14, 0, "g"); F.rect(13, 1, 14, 1, "d")   # the gate; its doorway is the trigger                 # the town wall and its gate
F.rect(12, 2, 15, 13, ":")                                            # the road up to the gate
for x in (3, 7, 18, 22): F.rect(x, 4, x + 1, 4, "S")                  # stalls
F.rect(2, 8, 4, 9, "t"); F.rect(7, 9, 8, 9, "C"); F.put(10, 6, "F")
F.box(19, 7, 26, 12, "f"); F.rect(20, 8, 25, 11, ","); F.put(19, 10, ",")  # the target range
F.rect(25, 8, 25, 11, "H")                                            # the butts
F.put(1, 12, "T"); F.put(26, 2, "T"); F.rect(0, 13, 11, 13, "T"); F.rect(16, 13, 27, 13, "T")
F.rect(13, 13, 14, 13, "e")
HFAIR = town("hollin-fair", "Hollin, the harvest fair", "town", F, (13, 12))

# ---------------- Hollin's square ----------------
# 30 x 18. The speaking stone in the middle, the town hall (north), the inn (west), the quay lane (west edge),
# the tanners' lane (east edge), the College road (north-east), the gate back to the fair (bottom middle).
Q = G(30, 18, ".")
Q.rect(0, 0, 29, 0, "#"); Q.rect(0, 17, 29, 17, "#"); Q.rect(0, 0, 0, 17, "#"); Q.rect(29, 0, 29, 17, "#")
house(Q, 9, 1, 20, 5, (14, 15))   # the town hall
house(Q, 1, 7, 7, 10, (5,))                       # the inn
house(Q, 22, 1, 28, 5, (25,))                    # the clerks' house
Q.rect(13, 9, 16, 10, "b")                                                                 # the speaking stone
Q.put(10, 13, "w"); Q.rect(19, 12, 20, 12, "S"); Q.rect(22, 14, 23, 14, "S"); Q.rect(4, 14, 5, 14, "x")
Q.put(0, 13, "e"); Q.put(0, 14, "e")                                                       # to the quay
Q.put(29, 9, "e"); Q.put(29, 10, "e")                                                      # to the tannery
Q.rect(14, 17, 15, 17, "e")                                                                # back to the fair
HSQUARE = town("town-hollin", "Hollin, the square", "town", Q, (14, 16))

# ---------------- Hollin's quay ----------------
# 26 x 12. The river (north), the fishers' jetty, the Guild grain barge moored at the east end, the net sheds.
K = G(26, 12, ".")
K.rect(0, 0, 25, 4, "~"); K.rect(0, 5, 25, 5, "p")
K.rect(4, 2, 5, 4, "p"); K.rect(12, 2, 13, 4, "p")                    # jetties
K.rect(17, 1, 24, 3, "p"); K.rect(17, 1, 24, 1, "x"); K.put(20, 4, "p")  # the barge, deck and hold
house(K, 1, 7, 6, 9, (4,)); house(K, 9, 7, 13, 9, (11,))   # net sheds
K.rect(16, 8, 17, 8, "x"); K.put(20, 9, "F")
K.rect(0, 11, 25, 11, "#"); K.put(25, 8, "e"); K.put(25, 9, "e")
HQUAY = town("hollin-quay", "Hollin, the quay", "town", K, (24, 8))

# ---------------- Hollin's tannery ----------------
# 24 x 12. Lime pits and tan vats (trays of wet floor), the drying racks, the cellar where the clinic runs.
T = G(24, 12, ".")
T.rect(0, 0, 23, 0, "#"); T.rect(0, 11, 23, 11, "#"); T.rect(23, 0, 23, 11, "#")
for y in (2, 5): T.rect(3, y, 6, y, "v"); T.rect(9, y, 12, y, "v")
T.rect(15, 2, 21, 2, "k"); T.rect(15, 4, 21, 4, "k")                 # drying racks
T.box(13, 7, 21, 10, "I"); T.rect(14, 8, 20, 9, "_"); T.put(16, 7, "d"); T.rect(18, 8, 19, 8, "B")   # the cellar
T.rect(2, 8, 3, 9, "x")
T.rect(0, 0, 0, 11, "#"); T.put(0, 5, "e"); T.put(0, 6, "e")
HTAN = town("hollin-tannery", "Hollin, the tanners' yard", "dusk", T, (1, 5))

# ---------------- Peatmoor, in the fens ----------------
# 26 x 14. Farm houses on a dry island in the marsh, the kith pens the thief raids, reed beds (east).
P = G(26, 14, "m")
P.rect(2, 2, 15, 11, ","); P.rect(8, 11, 9, 13, ":")
house(P, 3, 3, 7, 6, (5,))
house(P, 10, 3, 14, 6, (12,))
P.box(4, 8, 13, 10, "f"); P.rect(5, 9, 12, 9, ","); P.put(9, 8, ","); P.put(6, 9, "H")   # kith pens
P.rect(17, 1, 24, 12, "q"); P.rect(18, 5, 21, 7, ","); P.put(16, 6, ",")              # reed beds, the thief's hide
P.rect(8, 13, 9, 13, "e")
PEAT = town("town-peatmoor", "Peatmoor", "dusk", P, (8, 12))

# ---------------- The College of Physicians ----------------
# 28 x 16. The college court with its pump and lime trees, the great hall (north, where the hearing sits),
# the library door (east), the Provost's lodge (west), the gate (bottom).
C = G(28, 16, ".")
C.rect(0, 0, 27, 0, "#"); C.rect(0, 15, 27, 15, "#"); C.rect(0, 0, 0, 15, "#"); C.rect(27, 0, 27, 15, "#")
C.box(6, 1, 21, 6, "I"); C.rect(7, 2, 20, 5, "p"); C.rect(9, 2, 18, 2, "b"); C.rect(13, 6, 14, 6, "d")   # the great hall
house(C, 1, 8, 6, 11, (4,))      # the Provost's lodge
house(C, 21, 8, 26, 11, (23,))  # the library
C.put(13, 10, "w"); C.put(9, 9, "T"); C.put(18, 9, "T"); C.put(9, 13, "T"); C.put(18, 13, "T")
C.rect(13, 15, 14, 15, "e")
COLLEGE = town("town-college", "The College of Physicians", "town", C, (13, 14))

# ---------------- The College archive, under the library ----------------
# 30 x 16. Stacks in rows, locked reading rooms, the porters' lodge, the Provost's own press at the far end.
A = G(30, 16, "R")
A.rect(1, 1, 28, 14, "p")
for x in range(3, 26, 4): A.rect(x, 2, x, 6, "k"); A.rect(x, 9, x, 13, "k")
A.rect(1, 7, 28, 8, "p")
A.box(25, 1, 28, 5, "I"); A.rect(26, 2, 27, 4, "p"); A.put(25, 3, "d"); A.put(27, 2, "k"); A.put(26, 4, "b")   # the Provost's press
A.box(1, 10, 5, 14, "I"); A.rect(2, 11, 4, 13, "p"); A.put(5, 12, "d"); A.put(2, 11, "F")                        # porters' lodge
A.put(14, 0, "e")
ARCHIVE = town("college-archive", "The College archive", "caves", A, (14, 1), rest=False)

# ================================================================ leg 2: the Coast, Port Ashby
# ---------------- Reedhythe: the smugglers' landing in the western reeds ----------------
# 26 x 14. Stilt huts over the water, a landing stage, Mother Saul's hut, the coast road out (south-east).
R = G(26, 14, "q")
R.rect(0, 0, 25, 3, "~"); R.rect(3, 4, 21, 10, ","); R.rect(9, 3, 11, 3, "p"); R.rect(10, 0, 10, 2, "p")   # the landing stage
house(R, 4, 5, 8, 7, (6,)); house(R, 14, 5, 19, 7, (16,))
R.put(11, 8, "F"); R.rect(4, 9, 5, 9, "x"); R.rect(18, 9, 19, 9, "C")
R.rect(12, 10, 13, 13, ":"); R.rect(12, 13, 13, 13, "e")
REED = town("town-reedhythe", "Reedhythe", "dusk", R, (12, 12))

# ---------------- Port Ashby: the harbour ----------------
# 32 x 18. The harbour (north) with the mole running out into it, the brig at anchor off the mole's end,
# the harbourmaster's office (north-east), the tavern row (west), the market (middle), the gate (bottom).
H = G(32, 18, ".")
H.rect(0, 0, 31, 5, "~"); H.rect(0, 6, 31, 6, "p")
H.rect(15, 1, 16, 5, "p"); H.rect(15, 1, 16, 1, "e")                 # the mole, and the boat at its end
H.rect(24, 1, 29, 2, "x")                                            # a moored lighter
house(H, 23, 8, 30, 11, (26,))                                       # the harbourmaster's office
house(H, 1, 8, 9, 11, (3, 7))                                        # the tavern row: the Lantern and the Gull
house(H, 1, 13, 6, 16, (4,))
H.rect(12, 10, 13, 10, "S"); H.rect(17, 10, 18, 10, "S"); H.rect(12, 13, 13, 13, "S"); H.put(15, 12, "w")
H.rect(20, 14, 21, 14, "x"); H.rect(28, 14, 29, 15, "H")
H.rect(0, 17, 31, 17, "#"); H.rect(15, 17, 16, 17, "e")
ASHBY = town("town-ashby", "Port Ashby", "town", H, (15, 16))

# ---------------- The Lantern: the card tavern ----------------
# 24 x 12. Three card tables under lanterns, the bar, the stair up (closed), the door out (bottom).
L = G(24, 12, "p")
L.rect(0, 0, 23, 0, "I"); L.rect(0, 11, 23, 11, "I"); L.rect(0, 0, 0, 11, "I"); L.rect(23, 0, 23, 11, "I")
L.rect(2, 1, 9, 1, "k"); L.rect(2, 2, 9, 2, "b")                    # the bar
L.rect(4, 6, 5, 7, "b"); L.rect(11, 6, 12, 7, "b"); L.rect(18, 4, 19, 5, "b")   # the card tables
L.rect(14, 1, 16, 1, "x"); L.put(21, 9, "F")
L.rect(11, 11, 12, 11, "e")
LANTERN = town("ashby-tavern", "The Lantern, Port Ashby", "dusk", L, (11, 10))

# ---------------- The brig, at anchor ----------------
# 26 x 12. The deck (top half) with the mast and hatch, the hold below (bottom half) where the children are.
B = G(26, 12, "~")
B.rect(2, 1, 23, 5, "p"); B.rect(2, 1, 23, 1, "x"); B.put(12, 3, "R"); B.rect(18, 4, 19, 4, "x")
B.rect(2, 6, 23, 6, "I")
B.rect(2, 7, 23, 10, "_"); B.rect(3, 8, 4, 9, "B"); B.rect(20, 8, 21, 9, "B"); B.rect(9, 10, 16, 10, "x")
B.put(7, 6, "d")                                                     # the hatch down
B.put(0, 3, "e"); B.rect(1, 3, 1, 3, "p")                            # the boat alongside, back to the mole
BRIG = town("ashby-brig", "The Guild brig Patience", "night", B, (1, 3), rest=False)

# ================================================================ legs 3 and 4: the North, the Drevka clans and Lorne
# ---------------- Grazehold: the clans' riders' camp at the head of the drove road ----------------
# 26 x 14. Hide tents round a fire, the ironback lines, the drove road coming up from the south.
Z = G(26, 14, ",")
Z.rect(0, 0, 25, 1, "P"); Z.put(0, 2, "P"); Z.put(25, 2, "P")
for x in (3, 8, 15, 20): Z.rect(x, 3, x + 2, 4, "t")
Z.put(12, 7, "F"); Z.box(17, 8, 24, 11, "f"); Z.rect(18, 9, 23, 10, ","); Z.put(17, 10, ","); Z.rect(22, 9, 23, 9, "H")
Z.rect(12, 9, 13, 13, ":"); Z.rect(12, 13, 13, 13, "e"); Z.rect(2, 10, 3, 11, "x")
GRAZE = town("town-grazehold", "Grazehold", "camp", Z, (12, 12))

# ---------------- Kestrel Fort: the clans' hall on its crag ----------------
# 30 x 18. The great hall (north), the stables (east), the champion's ring (middle), the gate (bottom).
K2 = G(30, 18, ".")
K2.rect(0, 0, 29, 0, "#"); K2.rect(0, 17, 29, 17, "#"); K2.rect(0, 0, 0, 17, "#"); K2.rect(29, 0, 29, 17, "#")
house(K2, 7, 1, 22, 5, (14, 15))                                     # the hall
house(K2, 23, 8, 28, 11, (25,))                                      # the stables
K2.box(10, 8, 19, 13, "f"); K2.rect(11, 9, 18, 12, ","); K2.put(14, 13, ","); K2.put(15, 13, ",")   # the ring
K2.put(4, 9, "F"); K2.rect(2, 13, 4, 14, "x"); K2.rect(24, 14, 26, 14, "H")
K2.rect(14, 17, 15, 17, "e")
KESTREL = town("town-kestrel-fort", "Kestrel Fort", "camp", K2, (14, 16))

# ---------------- Snowgate: the high pass ----------------
# 28 x 14. The pass between two walls of rock, the hostel (west), the slope where the snow comes down (east).
N = G(28, 14, "n")
N.rect(0, 0, 27, 1, "R"); N.rect(0, 0, 2, 13, "R"); N.rect(25, 0, 27, 13, "R")
house(N, 4, 3, 9, 5, (6,))
N.rect(12, 2, 15, 13, ":"); N.rect(18, 3, 23, 6, "R"); N.rect(17, 8, 23, 10, "x")   # the rocks above, the buried mule train
N.rect(12, 13, 15, 13, "e"); N.rect(12, 1, 15, 1, "e")
SNOW = town("town-snowgate", "Snowgate", "road", N, (13, 12))

# ---------------- Holm: the King of Lorne's city ----------------
# 32 x 18. The gate (bottom), the square with its gallows (middle), the court (west), the king's hall (north),
# Aurel's house (east), the gaol stair (south-west).
M2 = G(32, 18, ".")
M2.rect(0, 0, 31, 0, "#"); M2.rect(0, 17, 31, 17, "#"); M2.rect(0, 0, 0, 17, "#"); M2.rect(31, 0, 31, 17, "#")
house(M2, 9, 1, 22, 5, (15, 16))                                     # the king's hall
house(M2, 1, 7, 7, 10, (4,))                                         # the court
house(M2, 24, 7, 30, 10, (27,))                                      # Aurel's house
house(M2, 1, 12, 5, 14, (3,))                                        # the gaol stair
M2.rect(14, 9, 17, 10, "b"); M2.put(15, 8, "R")                      # the gallows platform and its post
M2.put(11, 13, "w"); M2.rect(20, 13, 21, 13, "S"); M2.rect(24, 14, 25, 14, "x")
M2.rect(15, 17, 16, 17, "e")
HOLM = town("town-holm", "Holm", "town", M2, (15, 16))

# ---------------- Holm's gaol ----------------
# 24 x 12. Cells along the north wall, the guardroom (east), the stair up (south-west).
J = G(24, 12, "R")
J.rect(1, 1, 22, 10, "_")
for x in (2, 7, 12, 17): J.box(x, 1, x + 4, 4, "I"); J.rect(x + 1, 2, x + 3, 3, "_"); J.put(x + 2, 4, "d"); J.put(x + 1, 2, "B")
J.box(17, 6, 22, 10, "I"); J.rect(18, 7, 21, 9, "p"); J.put(17, 8, "d"); J.put(20, 7, "b"); J.put(21, 9, "F")
J.put(1, 10, "e")
GAOL = town("holm-gaol", "Holm gaol", "caves", J, (2, 10), rest=False)

# ---------------- Frostmere: the fishing village on the ice ----------------
# 26 x 14. Huts on the shore, the frozen mere with fishing holes, the drying racks.
O = G(26, 14, "n")
O.rect(0, 0, 25, 5, "~"); O.rect(3, 2, 22, 5, "_")
for x in (6, 12, 18): O.put(x, 3, "~")
house(O, 2, 7, 6, 9, (4,)); house(O, 9, 7, 13, 9, (11,)); house(O, 17, 7, 22, 9, (19,))
O.rect(15, 11, 16, 11, "k"); O.put(7, 11, "F")
O.rect(12, 12, 13, 13, ":"); O.rect(12, 13, 13, 13, "e")
FROST = town("town-frostmere", "Frostmere", "dusk", O, (12, 12))

# ================================================================ leg 5: the East, the Corvane League and Tarsis
# ---------------- Tally Hill: the League's toll house on the hill road ----------------
# 26 x 14. The hill road runs up the middle to the toll bar; the toll house (west), the stables (east), the hills.
Y = G(26, 14, ",")
Y.rect(0, 0, 25, 0, "T"); Y.rect(0, 0, 0, 13, "T"); Y.rect(25, 0, 25, 13, "T")
Y.rect(12, 0, 13, 13, ":")
Y.rect(10, 6, 11, 6, "f"); Y.rect(14, 6, 15, 6, "f"); Y.rect(12, 6, 13, 6, ":")       # the toll bar, lifted
house(Y, 3, 3, 9, 6, (6,))                                                             # the toll house
house(Y, 17, 3, 23, 6, (20,))                                                          # the stables
Y.rect(3, 9, 4, 10, "x"); Y.put(8, 10, "w"); Y.rect(18, 9, 22, 9, "f"); Y.rect(19, 10, 21, 11, "H")
Y.rect(12, 0, 13, 0, "e"); Y.rect(12, 13, 13, 13, "e")
TALLY = town("town-tallyhill", "Tally Hill toll house", "road", Y, (12, 12))

# ---------------- Corvane: the League's counting-town ----------------
# 30 x 18. The council hall (north), the counting house (east), Ilse's house (west), the scales fountain.
V = G(30, 18, ".")
V.rect(0, 0, 29, 0, "#"); V.rect(0, 17, 29, 17, "#"); V.rect(0, 0, 0, 17, "#"); V.rect(29, 0, 29, 17, "#")
house(V, 9, 1, 20, 5, (14, 15))                                                        # the council hall
house(V, 22, 7, 28, 10, (25,))                                                         # the counting house
house(V, 1, 7, 7, 10, (4,))                                                            # Ilse's house
house(V, 1, 12, 6, 14, (3,))                                                           # the Guild's house
V.rect(14, 9, 15, 10, "w"); V.rect(18, 13, 19, 13, "S"); V.rect(10, 13, 11, 13, "S"); V.rect(23, 14, 24, 14, "x")
V.rect(14, 17, 15, 17, "e")
CORV = town("town-corvane", "Corvane", "town", V, (14, 16))

# ---------------- The counting house at night ----------------
# 24 x 12. The front office, the long hall of ledgers, the vault (north-east), the strongroom of the Houses' notes.
X = G(24, 12, "R")
X.rect(1, 1, 22, 10, "p")
X.box(1, 1, 22, 10, "I")
for y in (3, 5, 7): X.rect(4, y, 12, y, "k")                                         # ledger stacks
X.box(15, 1, 22, 6, "I"); X.rect(16, 2, 21, 5, "p"); X.put(18, 6, "d"); X.rect(19, 2, 21, 2, "k"); X.put(17, 3, "b")
X.put(1, 9, "e")
VAULT = town("corvane-vault", "The counting house, at night", "night", X, (2, 9), rest=False)

# ---------------- Tarsis: the sellsword fortress on the steppe ----------------
# 30 x 18. A walled fort on the dry steppe: Vela's hall (north), barracks (west), the practice yard, the gate.
U = G(30, 18, "s")
U.box(1, 1, 28, 16, "#")
house(U, 9, 2, 20, 6, (14, 15))                                                        # Vela's hall
house(U, 2, 8, 8, 11, (5,))                                                            # the barracks
house(U, 22, 8, 27, 11, (24,))                                                         # the infirmary
U.box(11, 9, 18, 13, "f"); U.rect(12, 10, 17, 12, "a"); U.put(14, 13, "a"); U.put(15, 13, "a")   # the practice yard
U.put(4, 14, "F"); U.rect(22, 14, 23, 14, "x"); U.rect(25, 13, 26, 13, "C")
U.rect(14, 16, 15, 16, ":"); U.rect(14, 17, 15, 17, "e")
TARSIS = town("town-tarsis", "Tarsis", "camp", U, (14, 15))

# ================================================================ leg 6: the Ember Courts
# ---------------- Ember: the city of the courts ----------------
# 30 x 18. Sand streets, the palace of Prince Khalis (north), the gate to the Prince's Garden (east),
# the caravanserai (west), the market, the city gate (bottom middle).
E = G(30, 18, "a")
E.rect(0, 0, 29, 0, "#"); E.rect(0, 17, 29, 17, "#"); E.rect(0, 0, 0, 17, "#"); E.rect(29, 0, 29, 17, "#")
house(E, 8, 1, 21, 5, (14, 15))                                                        # the palace
house(E, 1, 7, 7, 10, (4,))                                                            # the caravanserai
E.rect(28, 8, 28, 9, "e")                                                              # to the Prince's Garden
E.rect(14, 9, 15, 10, "w"); E.rect(10, 13, 11, 13, "S"); E.rect(18, 13, 19, 13, "S"); E.rect(22, 12, 23, 12, "S")
E.put(5, 13, "T"); E.put(24, 3, "T"); E.put(4, 3, "T"); E.rect(24, 14, 25, 14, "x")
E.rect(14, 17, 15, 17, "e")
EMBER = town("town-ember", "Ember", "town", E, (14, 16))

# ---------------- The Prince's Garden ----------------
# 26 x 14. Terraced orange trees, a long pool, and the old guards' house at the far end.
D = G(26, 14, ",")
D.box(0, 0, 25, 13, "#")
D.rect(6, 5, 19, 7, "~"); D.rect(12, 8, 13, 12, ":"); D.rect(1, 6, 5, 6, ":")
for x in (3, 8, 17, 22): D.put(x, 2, "T"); D.put(x, 10, "T")
D.rect(4, 3, 5, 3, "*"); D.rect(20, 11, 21, 11, "*")
house(D, 19, 1, 24, 3, (21,))                                                          # the old guards' house
D.put(0, 6, "e")
GARDEN = town("ember-garden", "The Prince's Garden", "dusk", D, (1, 6))

# ---------------- Khalis' palace, at night ----------------
# 24 x 12. The colonnade, the treasury, the Prince's study with the sealed agreements.
P = G(24, 12, "R")
P.rect(1, 1, 22, 10, "p"); P.box(1, 1, 22, 10, "I")
for x in (5, 9, 13, 17): P.put(x, 4, "I"); P.put(x, 7, "I")
P.box(15, 1, 22, 4, "I"); P.rect(16, 2, 21, 3, "p"); P.put(18, 4, "d"); P.rect(19, 2, 21, 2, "k"); P.put(17, 2, "b")
P.put(12, 10, "e")
PALACE = town("ember-palace", "Prince Khalis' palace, at night", "night", P, (12, 9), rest=False)

# ================================================================ leg 7: the Crown at Kingsmere
# ---------------- Kingsmere: the royal town ----------------
# 30 x 18. The palace (north), the palace yard gate, the chapel (east), the parks gate (west edge), the town gate (bottom).
K7 = G(30, 18, ".")
K7.rect(0, 0, 29, 0, "#"); K7.rect(0, 17, 29, 17, "#"); K7.rect(0, 0, 0, 17, "#"); K7.rect(29, 0, 29, 17, "#")
house(K7, 7, 1, 22, 5, (14, 15))                                                       # the palace
house(K7, 23, 8, 28, 11, (25,))                                                        # the chapel
house(K7, 2, 12, 7, 14, (4,))                                                          # the guardhouse
K7.rect(11, 8, 18, 11, ","); K7.rect(14, 9, 15, 10, "w"); K7.put(11, 8, "T"); K7.put(18, 11, "T")   # the palace green
K7.rect(19, 14, 20, 14, "S"); K7.rect(9, 14, 10, 14, "S")
K7.rect(0, 7, 0, 8, "e")                                                               # to the royal parks
K7.rect(14, 17, 15, 17, "e")
KMERE = town("town-kingsmere", "Kingsmere", "town", K7, (14, 16))

# ---------------- The royal parks and the hunting lodge ----------------
# 30 x 18. Old oaks, the crownhorn herd's paddock, the hunting lodge, the keepers' cottage, the gate back to town.
L7 = G(30, 18, ",")
L7.rect(0, 0, 29, 0, "T"); L7.rect(0, 17, 29, 17, "T"); L7.rect(0, 0, 0, 17, "T"); L7.rect(29, 0, 29, 17, "T")
for (x, y) in ((4, 3), (9, 2), (3, 9), (7, 13), (13, 15), (20, 2), (16, 5), (5, 6)): L7.put(x, y, "T")
house(L7, 9, 6, 15, 9, (12,))                                                          # the hunting lodge
house(L7, 2, 14, 5, 15, (3,))                                                          # the keepers' cottage
L7.box(18, 6, 27, 14, "f"); L7.rect(19, 7, 26, 13, "*"); L7.put(18, 10, ",")           # the paddock
L7.rect(22, 14, 23, 14, "g")                                                           # the paddock's far gate
L7.rect(12, 10, 12, 16, ":"); L7.rect(13, 10, 28, 10, ":"); L7.put(18, 10, ":")
L7.rect(29, 7, 29, 8, "e")
PARKS = town("royal-parks", "The royal parks", "hope", L7, (28, 8))

# ---------------- The palace at night ----------------
# 26 x 12. The long gallery, the dining hall (west), the King's door (north-east), the queen mother's rooms.
Q7 = G(26, 12, "R")
Q7.rect(1, 1, 24, 10, "p"); Q7.box(1, 1, 24, 10, "I")
Q7.box(1, 1, 9, 6, "I"); Q7.rect(2, 2, 8, 5, "p"); Q7.rect(3, 3, 7, 4, "b"); Q7.put(9, 4, "d")     # the dining hall
Q7.box(17, 1, 24, 5, "I"); Q7.rect(18, 2, 23, 4, "p"); Q7.put(20, 5, "d"); Q7.put(22, 2, "B")     # the King's rooms
Q7.rect(11, 3, 14, 3, "k")
Q7.put(13, 10, "e")
NIGHT = town("kingsmere-palace", "Kingsmere palace, at night", "night", Q7, (13, 9), rest=False)

if __name__ == "__main__":
    for m in MAPS:
        print(m["id"]); print("\n".join(m["rows"]))
