"""Act III maps: the Guild's outer hatchery at Lockside, the drain under Vantry's wall, and House Mire's hatchery.
Painted onto a grid so every row comes out the right width. Run: python3 tools/world/act3maps.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from act2maps import G, save  # noqa: E402  (re-running act2maps's module code just rewrites its own maps, unchanged)

# ---------------- Lockside: House Corvel's outer hatchery by the canal ----------------
# 28 x 16. Brood house (north-west), officers' house (north-east), kith pens (south-east), the watch fire,
# the canal along the west wall, the gate (bottom middle).
L = G(28, 16, ".")
L.rect(0, 0, 27, 0, "#"); L.rect(0, 15, 27, 15, "#"); L.rect(0, 0, 0, 15, "#"); L.rect(27, 0, 27, 15, "#")
L.rect(1, 9, 2, 14, "~")                                  # the canal cut, inside the wall
L.box(2, 1, 13, 8, "#"); L.rect(3, 2, 12, 7, "_")         # brood house
L.rect(4, 3, 6, 3, "t"); L.rect(9, 3, 11, 3, "t"); L.rect(4, 5, 6, 5, "t"); L.rect(9, 5, 11, 5, "t")
L.put(3, 2, "B"); L.put(12, 2, "B"); L.put(7, 8, "d")
L.box(16, 1, 25, 6, "I"); L.rect(17, 2, 24, 5, "p")       # officers' house
L.put(23, 2, "b"); L.put(19, 3, "T"); L.put(17, 2, "k"); L.put(20, 6, "d")
L.box(18, 9, 25, 13, "f"); L.rect(19, 10, 24, 12, ","); L.put(18, 11, ","); L.rect(23, 10, 24, 10, "H")  # pens
L.put(8, 12, "F"); L.rect(4, 12, 5, 12, "x"); L.put(14, 11, "w")
L.rect(13, 15, 14, 15, "e")
LOCK = save("lockhatch", "Lockside hatchery", "hatchery",
            {"#": "brick", ".": "cobble", "~": "canal", "_": "wetfloor", "t": "tray", "B": "boiler", "d": "door", "I": "iwall",
             "p": "plank", "b": "bed", "T": "table", "k": "shelf", "f": "fence", ",": "grass", "H": "hay", "F": "campfire",
             "x": "crate", "w": "well", "e": "exit"},
            L, (13, 14))

# ---------------- The drain under Vantry's outer wall ----------------
# 26 x 8. In from the canal bank at Cinderwick (west), out through a grate into House Mire's yard (east).
C = G(26, 8, "R")
C.rect(1, 3, 24, 4, "_"); C.rect(1, 5, 24, 5, "~")
C.rect(8, 2, 10, 2, "_"); C.rect(15, 2, 17, 6, "_"); C.put(16, 5, "_")   # a side bay; a step over the flow
C.put(0, 3, "e"); C.put(0, 4, "e"); C.put(25, 3, "o")
DRAIN = save("culvert", "The drain under the wall", "caves",
             {"R": "rock", "_": "cavefloor", "~": "water", "e": "exit", "o": "cave"},
             C, (1, 3))

# ---------------- House Mire's hatchery, in Vantry's outer ward ----------------
# 30 x 18. The brood room (west, the one Corran watched over), the sick room off its east end, the records room
# (north-east), the yard (south-east), the drain grate the children run out by (bottom left), the street gate.
M = G(30, 18, ".")
M.rect(0, 0, 29, 0, "#"); M.rect(0, 17, 29, 17, "#"); M.rect(0, 0, 0, 17, "#"); M.rect(29, 0, 29, 17, "#")
M.box(1, 1, 17, 12, "#"); M.rect(2, 2, 16, 11, "_")
for y in (3, 5, 7, 9):
    M.rect(3, y, 6, y, "t"); M.rect(8, y, 11, y, "t")
M.put(2, 2, "B"); M.put(2, 11, "B"); M.put(12, 2, "B")
M.box(13, 7, 17, 12, "#"); M.rect(14, 8, 16, 11, "p"); M.put(16, 8, "b"); M.put(16, 10, "b"); M.put(13, 9, "d")  # sick room
M.put(9, 12, "d")                                                                                           # brood room door
M.box(20, 1, 28, 8, "I"); M.rect(21, 2, 27, 7, "p"); M.rect(21, 2, 27, 2, "k"); M.put(24, 5, "T"); M.put(24, 8, "d")  # records
M.rect(1, 14, 3, 16, "_"); M.put(2, 16, "o")                                                                # drain grate
M.rect(19, 12, 20, 13, "x"); M.put(25, 12, "F"); M.rect(26, 17, 27, 17, "g")                               # yard and gate
MIRE = save("mire", "House Mire's hatchery", "hatchery",
            {"#": "brick", ".": "cobble", "_": "wetfloor", "t": "tray", "B": "boiler", "d": "door", "I": "iwall", "p": "plank",
             "b": "bed", "k": "shelf", "T": "table", "x": "crate", "F": "fire", "o": "cave", "g": "gate"},
            M, (2, 15))

if __name__ == "__main__":
    for m in (LOCK, DRAIN, MIRE):
        print(m["id"]); print("\n".join(m["rows"]))
