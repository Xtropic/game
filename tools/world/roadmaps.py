"""The Long Road's maps: the seats of the nations Rhea visits between Lockside and the Broodhouse autumn.
Painted onto a grid so every row comes out the right width. Run: python3 tools/world/roadmaps.py
Each map's exits are 'e' tiles; tools/story/road.py walks them back to the land (or the next district)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2maps import G, save  # noqa: E402

TOWN = {"#": "stonewall", ".": "cobble", ",": "grass", ":": "path", "h": "wall", "r": "roof", "d": "door", "w": "well",
        "S": "stall", "H": "hay", "x": "crate", "f": "fence", "~": "water", "=": "bridge", "e": "exit", "C": "cart",
        "F": "campfire", "t": "tent", "T": "tree", "*": "flowers", "p": "plank", "b": "table", "g": "gate", "R": "rock",
        "I": "iwall", "k": "shelf", "B": "bed", "_": "wetfloor", "v": "tray", "c": "canal", "m": "marsh", "q": "reeds"}
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

if __name__ == "__main__":
    for m in MAPS:
        print(m["id"]); print("\n".join(m["rows"]))
