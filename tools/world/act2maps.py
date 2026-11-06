"""Act II maps: Thornwick, Ume's terraces, Kell's Bridge, the high pass, the canal back room.
Painted onto a grid so every row comes out the right width."""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "../../data/maps")


class G:
    def __init__(self, w, h, fill):
        self.w, self.h = w, h
        self.g = [[fill] * w for _ in range(h)]

    def put(self, x, y, c):
        assert 0 <= x < self.w and 0 <= y < self.h, (x, y)
        self.g[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def box(self, x0, y0, x1, y1, c):
        for x in range(x0, x1 + 1):
            self.put(x, y0, c); self.put(x, y1, c)
        for y in range(y0, y1 + 1):
            self.put(x0, y, c); self.put(x1, y, c)

    def rows(self):
        return ["".join(r) for r in self.g]


def save(id, name, music, legend, g, spawn, rest=False, entities=()):
    rows = g.rows()
    for r in rows:
        assert len(r) == g.w
        for ch in r:
            assert ch in legend, (id, ch)
    m = {"id": id, "name": name, "music": music}
    if rest:
        m["rest"] = True
    m["legend"] = legend
    m["rows"] = rows
    m["entities"] = [{"id": "start", "kind": "spawn", "x": spawn[0], "y": spawn[1]}, *entities]
    with open(os.path.join(OUT, id + ".json"), "w") as f:
        json.dump(m, f, indent=1)
        f.write("\n")
    return m


# ---------------- Thornwick: a ruined terrace monastery over a hot spring ----------------
# 28 x 16. Bathhouse (north-west), chapel (north), spring and cellar (middle), storeroom (west),
# kith pen (east), the section's tents (south), the gate (bottom middle).
t = G(28, 16, ",")
t.rect(0, 0, 27, 0, "K"); t.rect(0, 15, 27, 15, "K"); t.rect(0, 0, 0, 15, "K"); t.rect(27, 0, 27, 15, "K")
t.rect(1, 1, 26, 1, "c"); t.rect(1, 1, 1, 14, "c"); t.rect(26, 1, 26, 14, "c")
# bathhouse: broken stone walls round a little pool; the way in at the bottom
t.box(3, 2, 9, 6, "s"); t.rect(4, 3, 8, 5, "."); t.rect(6, 3, 7, 3, "~"); t.put(6, 6, "."); t.put(9, 4, ",")
# chapel: roofless, rubble in the nave, the way in at the bottom
t.box(11, 2, 17, 5, "s"); t.rect(12, 3, 16, 4, "."); t.put(14, 5, "."); t.put(12, 3, "R"); t.put(16, 4, "R")
# well and an old wall in the north-east
t.put(21, 3, "w"); t.rect(19, 2, 24, 2, "s"); t.put(22, 2, ",")
# the spring: a steaming pool, and the cellar door beside it
t.rect(12, 7, 15, 8, "~"); t.put(16, 8, "k")
# storeroom (west): roof over walls, door facing the yard
t.rect(3, 8, 7, 9, "r"); t.rect(3, 10, 7, 10, "h"); t.put(5, 10, "d")
# kith pen (east): a fence with a gap on the west side, hay inside
t.box(19, 7, 24, 11, "f"); t.put(19, 9, ","); t.rect(22, 8, 23, 8, "H")
# paths: from the gate up to the spring, and across the yard
t.rect(13, 9, 14, 14, "."); t.rect(5, 11, 18, 11, "."); t.rect(6, 7, 11, 7, ".")
# tents and the fire (south)
for x in (3, 7, 18, 22):
    t.rect(x, 12, x + 1, 13, "A")
t.put(10, 13, "F"); t.rect(16, 13, 16, 13, "x")
t.rect(13, 15, 14, 15, "e")
THORNWICK = save("thornwick", "Thornwick", "camp",
                 {"K": "cloud", "c": "cliff", ",": "grass", ".": "cobble", "s": "stonewall", "~": "water", "R": "rock",
                  "w": "well", "k": "cave", "r": "roof", "h": "wall", "d": "door", "f": "fence", "H": "hay", "A": "tent",
                  "F": "campfire", "x": "crate", "e": "exit"},
                 t, (13, 14), rest=True)

# ---------------- Ume's terraces: a clan village on moss terraces ----------------
u = G(26, 14, ",")
u.rect(0, 0, 25, 0, "K"); u.rect(0, 13, 25, 13, "K"); u.rect(0, 0, 0, 13, "K"); u.rect(25, 0, 25, 13, "K")
u.rect(1, 1, 24, 1, "c"); u.rect(1, 1, 1, 12, "c"); u.rect(24, 1, 24, 12, "c")
u.rect(2, 2, 23, 2, "m"); u.rect(2, 3, 23, 3, "a"); u.put(20, 3, "S"); u.put(21, 3, "S")
u.rect(2, 4, 23, 4, "m"); u.rect(2, 5, 23, 5, "a"); u.put(5, 5, "S"); u.put(6, 5, "S")
# houses
u.rect(3, 7, 6, 7, "r"); u.rect(3, 8, 6, 8, "h"); u.put(5, 8, "d")      # Ume's house
u.rect(16, 7, 19, 7, "r"); u.rect(16, 8, 19, 8, "h"); u.put(17, 8, "d")
# the factor's weighing stall and baskets
u.put(11, 7, "L"); u.put(12, 7, "L"); u.rect(13, 7, 13, 7, "x")
u.put(10, 10, "w")
u.rect(4, 9, 21, 9, ":"); u.rect(12, 10, 13, 12, ":")
u.rect(2, 11, 3, 12, "T"); u.rect(22, 11, 23, 12, "T")
u.rect(12, 13, 13, 13, "e")
UMES = save("umes", "Ume's terraces", "larkfold",
            {"K": "cloud", "c": "cliff", ",": "grass", "m": "moss", "a": "terrace", "S": "steps", "r": "roof", "h": "wall",
             "d": "door", "L": "stall", "x": "crate", "w": "well", ":": "path", "T": "tree", "e": "exit"},
            u, (12, 12), rest=True)

# ---------------- Kell's Bridge: an old stone bridge over the Kerrow ----------------
k = G(26, 14, ",")
k.rect(0, 0, 25, 0, "T"); k.rect(0, 13, 25, 13, "T"); k.rect(0, 0, 0, 13, "T"); k.rect(25, 0, 25, 13, "T")
k.rect(1, 5, 24, 8, "~"); k.rect(12, 5, 13, 8, "=")
k.rect(12, 1, 13, 4, "."); k.rect(12, 9, 13, 12, ".")
k.rect(3, 2, 5, 3, "A"); k.rect(20, 2, 22, 3, "A")      # the Guild's tents across the river
k.rect(4, 10, 5, 11, "A"); k.rect(19, 10, 20, 11, "A")  # the Commons' tents on this side
k.put(8, 11, "F"); k.rect(1, 4, 3, 4, "R"); k.rect(22, 9, 24, 9, "R")
k.rect(12, 13, 13, 13, "e")
KELLS = save("kellsbridge", "Kell's Bridge", "town",
             {"T": "tree", ",": "grass", "~": "water", "=": "bridge", ".": "path", "A": "tent", "F": "campfire", "R": "flowers", "e": "exit"},
             k, (12, 12))

# ---------------- The high pass above Vantry: grazing for the wild loftbucks ----------------
p = G(24, 12, ",")
p.rect(0, 0, 23, 0, "K"); p.rect(0, 0, 0, 11, "c"); p.rect(23, 0, 23, 11, "c"); p.rect(0, 11, 23, 11, "c")
p.rect(1, 1, 22, 1, "c"); p.rect(2, 2, 6, 3, "R"); p.rect(17, 2, 21, 2, "R"); p.rect(8, 9, 10, 10, "R")
p.rect(11, 3, 12, 10, ":"); p.rect(12, 4, 20, 4, ":")
p.rect(3, 6, 6, 7, "m"); p.rect(15, 7, 19, 8, "m")
p.rect(11, 11, 12, 11, "e")
PASS = save("highpass", "The high pass", "dusk",
            {"K": "cloud", "c": "cliff", ",": "grass", "R": "rock", ":": "path", "m": "flowers", "e": "exit"},
            p, (11, 10))

# ---------------- A back room on the Spindle canal, Vantry ----------------
b = G(12, 7, "_")
b.box(0, 0, 11, 6, "#"); b.rect(2, 1, 4, 1, "k"); b.rect(8, 1, 10, 1, "x"); b.rect(5, 3, 6, 3, "t"); b.put(10, 4, "x")
b.put(5, 6, "e")
BACK = save("backroom", "A back room on the Spindle canal", "lull",
            {"#": "iwall", "_": "plank", "k": "shelf", "x": "crate", "t": "table", "e": "exit"},
            b, (5, 5))

if __name__ == "__main__":
    for m in (THORNWICK, UMES, KELLS, PASS, BACK):
        print(m["id"]); print("\n".join(m["rows"]))
