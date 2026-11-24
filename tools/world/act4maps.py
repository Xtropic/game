"""Act IV maps: the drains under Vantry to the Broodhouse grate, and the Broodhouse itself.
Painted onto a grid so every row comes out the right width. Run: python3 tools/world/act4maps.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2maps import G, save  # noqa: E402

# ---------------- The drains under Vantry, from the canal at Cinderwick to the Broodhouse grate ----------------
# 30 x 9. In from the canal bank (west); a fork where the old Mire drain goes off north; the grate (east), with
# the Broodhouse's outflow room behind it, where Finch comes down at night.
D = G(30, 9, "R")
D.rect(1, 3, 23, 4, "_"); D.rect(1, 5, 23, 5, "~")
D.rect(10, 1, 11, 2, "_"); D.put(10, 0, "o")                    # the old Mire drain, going off north
D.rect(16, 6, 18, 7, "_")                                       # a side bay
D.rect(24, 2, 24, 6, "|")                                       # the grate
D.rect(25, 2, 28, 6, "_"); D.rect(25, 6, 28, 6, "~")            # the outflow room behind it
D.put(0, 3, "e"); D.put(0, 4, "e")
DRAINS = save("underdrain", "The drains under Vantry", "caves",
              {"R": "rock", "_": "cavefloor", "~": "water", "e": "exit", "o": "cave", "|": "fence"},
              D, (1, 3))

# ---------------- The Broodhouse, inside Vantry's wall ----------------
# 32 x 22. The outer yard and the street gate (south); the inner wall and its gate (row 13); the inner yard with
# its fire; the two long brood halls (west and east); the line house (north middle), where the breeding lines are kept.
B = G(32, 22, ".")
B.rect(0, 0, 31, 0, "#"); B.rect(0, 21, 31, 21, "#"); B.rect(0, 0, 0, 21, "#"); B.rect(31, 0, 31, 21, "#")
# brood halls
for x0 in (1, 23):
    B.box(x0, 1, x0 + 7, 12, "#"); B.rect(x0 + 1, 2, x0 + 6, 11, "_")
    for y in (3, 5, 7, 9):
        B.rect(x0 + 2, y, x0 + 5, y, "t")
    B.put(x0 + 1, 2, "B"); B.put(x0 + 6, 2, "B")
B.put(8, 8, "d"); B.put(23, 8, "d")
# the line house
B.box(10, 1, 21, 6, "I"); B.rect(11, 2, 20, 5, "p")
B.rect(12, 2, 19, 2, "k"); B.put(13, 4, "T"); B.put(18, 4, "T"); B.put(15, 3, "L"); B.put(16, 3, "L")
B.rect(15, 6, 16, 6, "d")
# inner yard
B.put(15, 9, "F"); B.rect(10, 10, 11, 11, "x"); B.rect(20, 10, 21, 11, "x")
# the inner wall and its gate
B.rect(1, 13, 30, 13, "#"); B.rect(15, 13, 16, 13, "g")
# the outer yard: the carts, the stores, the street gate
B.rect(3, 16, 6, 17, "x"); B.rect(25, 16, 28, 17, "H"); B.put(9, 18, "w")
B.rect(15, 21, 16, 21, "e")
BROOD = save("broodhouse", "The Broodhouse", "hatchery",
             {"#": "brick", ".": "cobble", "_": "wetfloor", "t": "tray", "B": "boiler", "d": "door", "I": "iwall", "p": "plank",
              "k": "shelf", "T": "table", "L": "tray", "F": "fire", "x": "crate", "g": "gate", "H": "hay", "w": "well", "e": "exit"},
             B, (15, 19))

if __name__ == "__main__":
    for m in (DRAINS, BROOD):
        print(m["id"]); print("\n".join(m["rows"]))
