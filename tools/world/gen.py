"""Generates the world map of Ostrel (data/maps/ostrel.json) from the region plan below.

  python3 tools/world/gen.py

Each region has a seed point, a biome and a weight; every tile goes to the nearest seed (with a little noise so
borders wander). Terrain comes from the region's biome plus noise. Then the fixed features go on top: the cloud
sea round the highlands, the mountain wall between highlands and lowlands, the river from the Cloudline down to
the sea, the canals of the Millcities, and roads between places (found by a cheapest-path search, so they bend
round hills and cross mountains only at passes). The output is deterministic: same plan, same map."""
import heapq, json, math, os, random

W, H = 96, 64
random.seed(7)

def noise_grid(scale, seed):
    rnd = random.Random(seed)
    gw, gh = W // scale + 4, H // scale + 4
    g = [[rnd.random() for _ in range(gw)] for _ in range(gh)]
    def at(x, y):
        fx, fy = (x % W) / scale, (y % H) / scale; ix, iy = int(fx), int(fy); tx, ty = fx - ix, fy - iy
        sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = g[iy][ix] * (1 - sx) + g[iy][ix + 1] * sx; b = g[iy + 1][ix] * (1 - sx) + g[iy + 1][ix + 1] * sx
        return a * (1 - sy) + b * sy
    return at

N1, N2, N3 = noise_grid(8, 1), noise_grid(4, 2), noise_grid(12, 3)
def noise(x, y): return 0.55 * N1(x, y) + 0.3 * N2(x, y) + 0.15 * N3(x, y)

# id, seed x, seed y, biome, weight (bigger claims more), char in the region layer
REGIONS = [
    ("lorne", 50, 4, "cold", 1.3), ("high-passes", 46, 12, "passes", 1.0), ("storm-roost", 74, 11, "peak", 0.6),
    ("drevka", 80, 20, "highland", 1.1), ("cloudline", 19, 21, "terraces", 1.25), ("cloud-forest", 34, 21, "cloudwood", 0.9),
    ("vael", 5, 12, "spires", 0.55), ("kerrow-gorge", 47, 27, "gorge", 0.7), ("old-drove-road", 61, 27, "uplands", 0.95),
    ("millbridge", 36, 35, "river", 0.8), ("hollin", 21, 36, "orchards", 1.0), ("corvane", 61, 37, "hilltowns", 0.9),
    ("millcities", 46, 42, "mills", 0.95), ("low-water", 44, 44, "mills", 0.65), ("guild", 53, 50, "hatchery", 0.85),
    ("crown", 38, 53, "parks", 1.0), ("college", 27, 46, "lowland", 0.8), ("fens", 14, 50, "fen", 0.95),
    ("ashby", 12, 59, "coast", 0.7), ("salt-house", 30, 61, "saltmarsh", 0.6), ("tarsis", 74, 39, "steppe", 1.0),
    ("wandering-herd", 89, 33, "plateau", 0.9), ("ember", 72, 54, "desert", 1.0), ("deep-desert", 88, 55, "dunes", 0.9),
    ("osk", 3, 47, "volcanic", 0.4),
]
CH = "abcdefghijklmnopqrstuvwxy"
assert len(REGIONS) == len(CH)

region = [[0] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        best, bi = 1e9, 0
        wx, wy = x + (N2(x, y) - 0.5) * 7, y + (N3(x, y) - 0.5) * 7
        for i, (_, sx, sy, _, w) in enumerate(REGIONS):
            d = math.hypot(wx - sx, wy - sy) / w
            if d < best: best, bi = d, i
        region[y][x] = bi
RI = {r[0]: i for i, r in enumerate(REGIONS)}

# ---- terrain ----
# legend chars for terrain kinds
T = {"sea": "~", "shoal": "-", "cloud": "c", "plains": ".", "meadow": ",", "hills": "h", "mount": "M", "snow": "*", "pines": "P",
     "forest": "f", "cloudwood": "w", "terraces": "t", "marsh": "m", "reeds": "r", "steppe": "s", "sand": "d", "saltpan": "p",
     "river": "R", "bridge": "=", "road": "#", "pass": "^", "canal": "C", "spire": "S", "ashrock": "a", "orchard": "o", "town": "T"}
KIND = {"~": "sea", "-": "shoal", "c": "cloud", ".": "plains", ",": "meadow", "h": "hills", "M": "mount", "*": "snow", "P": "pines",
        "f": "forest", "w": "cloudwood", "t": "terraces", "m": "marsh", "r": "reeds", "s": "steppe", "d": "sand", "p": "saltpan",
        "R": "river", "=": "bridge", "#": "road", "^": "pass", "C": "canal", "S": "spire", "a": "ashrock", "o": "orchard", "T": "townground"}
T = {v: k for k, v in KIND.items()}

LOWLAND = {"river", "orchards", "hilltowns", "mills", "lowland", "coast", "parks", "uplands"}
def biome_tile(b, x, y):
    n = noise(x, y); r = random.random()
    # copses and low hills scattered through the lowlands, so the farmland isn't one flat green
    if b in LOWLAND:
        w = N3(x * 2.3, y * 2.3)
        if w > 0.74: return "forest"
        if w < 0.2: return "hills"
    if b == "cold": return "snow" if n > 0.62 else "pines" if n > 0.45 else "plains" if r > 0.3 else "snow"
    if b == "passes": return "mount" if n > 0.42 else "snow"
    if b == "peak": return "mount" if n > 0.35 else "snow"
    if b == "highland": return "mount" if n > 0.66 else "hills" if n > 0.4 else "meadow"
    if b == "terraces": return "terraces" if n > 0.42 else "meadow" if n > 0.3 else "hills"
    if b == "cloudwood": return "cloudwood" if n > 0.32 else "meadow"
    if b == "spires": return "spire" if r > 0.55 else "meadow"
    if b == "gorge": return "mount" if n > 0.55 else "forest" if n > 0.4 else "hills"
    if b == "uplands": return "hills" if n > 0.52 else "meadow"
    if b == "river": return "meadow" if n > 0.5 else "plains"
    if b == "orchards": return "orchard" if n > 0.55 else "meadow" if n > 0.4 else "plains"
    if b == "hilltowns": return "hills" if n > 0.45 else "plains"
    if b == "mills": return "plains" if n > 0.4 else "hills"
    if b == "hatchery": return "plains"
    if b == "parks": return "forest" if n > 0.66 else "meadow"
    if b == "lowland": return "plains" if n > 0.45 else "meadow"
    if b == "fen": return "marsh" if n > 0.5 else "reeds"
    if b == "coast": return "plains" if n > 0.45 else "meadow"
    if b == "saltmarsh": return "saltpan" if n > 0.5 else "marsh"
    if b == "steppe": return "steppe" if n > 0.3 else "hills"
    if b == "plateau": return "steppe" if n > 0.45 else "meadow"
    if b == "desert": return "sand" if n > 0.4 else "steppe"
    if b == "dunes": return "sand" if n > 0.25 else "saltpan"
    if b == "volcanic": return "ashrock"
    return "plains"

grid = [[biome_tile(REGIONS[region[y][x]][3], x, y) for x in range(W)] for y in range(H)]

def setk(x, y, k):
    if 0 <= x < W and 0 <= y < H: grid[y][x] = k

def carve(points, kind):
    """A 4-connected line through the points: steps along x, then y, so it can always be walked."""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        x, y = x0, y0
        while (x, y) != (x1, y1):
            setk(x, y, kind)
            if x != x1: x += 1 if x1 > x else -1
            else: y += 1 if y1 > y else -1
        setk(x1, y1, kind)

# the sea: west and south-west coast, with the Osk island well off shore and a line of shoals out to it
for y in range(H):
    for x in range(W):
        coast = 6 + (N1(x, y * 1.3) - 0.5) * 6 + (0 if y < 30 else (y - 30) * 0.12)
        south = y > 61 - (N2(x, y) - 0.5) * 3 and x < 60
        if (x < coast and y > 30) or south: grid[y][x] = "sea"
for y in range(H):
    for x in range(W):
        if REGIONS[region[y][x]][0] == "osk":
            grid[y][x] = "ashrock" if math.hypot(x - 3, y - 47) < 3.2 else "sea"
carve([(5, 48), (9, 48), (9, 50), (13, 50)], "shoal")
# the cloud sea: round the north-west highlands and Vael's spires
for y in range(H):
    for x in range(W):
        rid = REGIONS[region[y][x]][0]
        if rid == "vael" and (math.hypot(x - 5, y - 12) > 4.2 or noise(x, y) < 0.3): grid[y][x] = "cloud"
        if y < 8 and x < 26 and rid != "lorne": grid[y][x] = "cloud"
        if x < 4 and y <= 30: grid[y][x] = "cloud"
# a narrow ridge of spire rock leads from the Cloudline out to Vael (found only by walking it)
carve([(7, 14), (9, 14), (9, 16), (14, 16)], "meadow")

# the highland wall: mountains between the highlands and the lowlands, broken only where roads cross
for x in range(8, 90):
    y0 = int(29 + (N1(x, 3) - 0.5) * 4 - (x - 40) * 0.04)
    for dy in range(2):
        if REGIONS[region[min(H - 1, y0 + dy)][x]][0] not in ("kerrow-gorge",): setk(x, y0 + dy, "mount")

# the river Kerrow: from the Cloudline terraces, down the gorge, past Millbridge, through the Millcities to the sea
def draw_river(points):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n + (N3(i, x0) - 0.5) * 1.5); y = round(y0 + (y1 - y0) * i / n)
            setk(x, y, "river")
draw_river([(24, 18), (30, 24), (40, 28), (46, 30), (40, 34), (38, 38), (42, 44), (34, 50), (24, 56), (16, 62)])
# canals in the Millcities, and the Low Water galleries under them
for x in range(41, 54): setk(x, 43, "canal")
for y in range(39, 47): setk(49, y, "canal")

# ---- places ----
PLACES = [
    ("larkfold", "Larkfold", 22, 20, "ruins"), ("ferrow", "Ferrow Cross", 31, 31, "inn"), ("camp", "Commons camp", 59, 26, "camp"),
    ("millbridge", "Millbridge", 36, 36, "town"), ("bend", "Hob's Bend", 44, 37, "sign"), ("sallow", "Sallow hatchery", 50, 41, "hatchery"),
    ("vantry", "Vantry", 53, 50, "city"), ("holm", "Holm", 52, 4, "castle"), ("kestrel-fort", "Kestrel Fort", 80, 19, "fort"),
    ("corvane", "Corvane", 62, 37, "town"), ("hollin", "Hollin", 21, 37, "town"), ("college", "The College", 27, 46, "college"),
    ("kingsmere", "Kingsmere", 38, 54, "castle"), ("ashby", "Port Ashby", 12, 58, "port"), ("tarsis", "Tarsis", 74, 40, "fort"),
    ("ember", "The Ember Courts", 72, 55, "palace"), ("umes", "Ume's terraces", 14, 24, "village"), ("thornwick", "Thornwick", 27, 25, "ruins"),
]
# every region has at least two settlements: the story's places above, then these, set down where there is room
SETTLED = {"village", "town", "city", "port", "castle", "palace", "fort", "college"}
HIDDEN = {"vael", "low-water", "osk", "salt-house", "wandering-herd"}
EXTRA = {
    "guild": [("coldhatch", "Coldhatch", "village")],
    "crown": [("queensford", "Queensford", "town")],
    "millcities": [("cinderwick", "Cinderwick", "city"), ("lockside", "Lockside", "town")],
    "millbridge": [("weirbank", "Weirbank", "village")],
    "cloudline": [("highmoss", "Highmoss", "village")],
    "corvane": [("tallyhill", "Tallyhill", "town")],
    "hollin": [("applegarth", "Applegarth", "village")],
    "college": [("lanthorn", "Lanthorn", "town")],
    "drevka": [("grazehold", "Grazehold", "village")],
    "ember": [("duskwell", "Duskwell", "town")],
    "tarsis": [("dry-hollow", "Dry Hollow", "village")],
    "ashby": [("gullstair", "Gullstair", "village")],
    "lorne": [("frostmere", "Frostmere", "town")],
    "vael": [("highspire", "Highspire", "village"), ("ropeway", "Ropeway", "village")],
    "low-water": [("candle-galleries", "The Candle Galleries", "village"), ("lockkeepers-deep", "Lockkeeper's Deep", "village")],
    "osk": [("cinder-landing", "Cinder Landing", "village"), ("pumice", "Pumice", "village")],
    "salt-house": [("salt-house", "The Salt House", "town"), ("brinepans", "Brinepans", "village")],
    "wandering-herd": [("summer-fold", "Summer Fold", "village"), ("stone-rings", "Stone Rings", "village")],
    "cloud-forest": [("dripstone", "Dripstone", "village"), ("mistfold", "Mistfold", "village")],
    "high-passes": [("cairn-hostel", "Cairn Hostel", "village"), ("snowgate", "Snowgate", "fort")],
    "kerrow-gorge": [("kerrow", "Kerrow", "village"), ("ropebridge", "Ropebridge", "village")],
    "fens": [("peatmoor", "Peatmoor", "village"), ("reedhythe", "Reedhythe", "village")],
    "deep-desert": [("last-well", "Last Well", "village"), ("glassdune", "Glassdune", "village")],
    "storm-roost": [("stormwatch", "Stormwatch", "fort"), ("roost-foot", "Roost Foot", "village")],
    "old-drove-road": [("drovers-halt", "Drovers' Halt", "village"), ("longbarrow", "Longbarrow", "village")],
}
UNBUILDABLE = ("sea", "cloud", "spire", "river", "canal", "shoal", "mount", "bridge")
def edge_dist(x, y, ri, cap=4):
    for d in range(1, cap + 1):
        for dx in range(-d, d + 1):
            for dy in (-d, d):
                for ax, ay in ((x + dx, y + dy), (x + dy, y + dx)):
                    if not (0 <= ax < W and 0 <= ay < H) or region[ay][ax] != ri: return d
    return cap + 1
NEW_ROADS = []
# only build where Rhea can walk to (before roads cut passes): flood from Larkfold
BLOCK = ("sea", "cloud", "spire", "river", "canal", "mount")
reach, todo = {(22, 21)}, [(22, 21)]
while todo:
    x, y = todo.pop()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in reach and grid[ny][nx] not in BLOCK: reach.add((nx, ny)); todo.append((nx, ny))
for rid, extra in EXTRA.items():
    ri = RI[rid]
    room = 3 if sum(row.count(ri) for row in region) > 40 else 2   # the Low Water galleries are small
    have = sum(1 for p in PLACES if p[4] in SETTLED and region[p[3]][p[2]] == ri)
    for pid, name, icon in extra:
        best, at = -1e9, None
        for y in range(2, H - 3):
            for x in range(2, W - 2):
                if region[y][x] != ri or grid[y][x] in UNBUILDABLE or grid[y + 1][x] in UNBUILDABLE or (x, y) not in reach or (x, y + 1) not in reach: continue
                near = min(math.hypot(x - p[2], y - p[3]) for p in PLACES)
                if near < room: continue
                score = min(near, 9) + 1.5 * edge_dist(x, y, ri) + noise(x, y)
                if score > best: best, at = score, (x, y)
        assert at, f"no room for {name} in {rid}"
        # roads: hidden lands keep to themselves (a road only to a neighbour in the same land); the rest join the nearest place
        same = [p for p in PLACES if region[p[3]][p[2]] == ri]
        pool = same if rid in HIDDEN else PLACES
        if pool: NEW_ROADS.append((pid, min(pool, key=lambda p: math.hypot(p[2] - at[0], p[3] - at[1]))[0]))
        PLACES.append((pid, name, at[0], at[1], icon)); have += 1
    assert have >= 2, f"{rid} has {have} settlements"
for _, _, x, y, _ in PLACES:
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if grid[y + dy][x + dx] in ("mount", "spire", "cloud", "sea", "river", "canal"): setk(x + dx, y + dy, "meadow")
    setk(x, y, "townground")

# ---- roads: cheapest paths between places ----
COST = {"sea": None, "cloud": None, "spire": None, "ashrock": 4, "mount": 25, "river": 18, "canal": 18, "snow": 4, "marsh": 5, "reeds": 4,
        "forest": 4, "cloudwood": 4, "pines": 4, "hills": 3, "sand": 3, "saltpan": 3, "shoal": None, "road": 0.5, "pass": 0.6, "bridge": 0.5, "townground": 0.5}
def path(a, b):
    sx, sy = a; gx, gy = b
    dist = {(sx, sy): 0}; prev = {}; q = [(0, sx, sy)]
    while q:
        d, x, y = heapq.heappop(q)
        if (x, y) == (gx, gy): break
        if d > dist[(x, y)]: continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H): continue
            c = COST.get(grid[ny][nx], 1.5)
            if c is None: continue
            nd = d + c + 0.4 * noise(nx, ny)
            if nd < dist.get((nx, ny), 1e9): dist[(nx, ny)] = nd; prev[(nx, ny)] = (x, y); heapq.heappush(q, (nd, nx, ny))
    out, p = [], (gx, gy)
    while p in prev: out.append(p); p = prev[p]
    return out[::-1]
P = {p[0]: (p[2], p[3]) for p in PLACES}
ROADS = [("larkfold", "thornwick"), ("thornwick", "ferrow"), ("ferrow", "millbridge"), ("millbridge", "bend"), ("bend", "sallow"), ("sallow", "vantry"),
         ("bend", "camp"), ("bend", "corvane"), ("millbridge", "hollin"), ("hollin", "college"), ("college", "kingsmere"), ("kingsmere", "vantry"),
         ("college", "ashby"), ("corvane", "tarsis"), ("tarsis", "ember"), ("camp", "kestrel-fort"), ("ferrow", "holm"), ("larkfold", "umes")] + NEW_ROADS
for a, b in ROADS:
    for x, y in path(P[a], P[b]):
        k = grid[y][x]
        if k == "townground": continue
        grid[y][x] = "pass" if k in ("mount", "snow") else "bridge" if k in ("river", "canal") else "road"

# the Low Water Sisters are reached down a canal stair: one walkable tile in the canal
setk(45, 43, "bridge")

legend = {v: KIND[v] for v in KIND}
rows = ["".join(T[grid[y][x]] if grid[y][x] in T else T["townground"] for x in range(W)) for y in range(H)]
rrows = ["".join(CH[region[y][x]] for x in range(W)) for y in range(H)]
out = {
    "id": "ostrel", "name": "Ostrel", "music": "world", "world": True,
    "legend": legend, "rows": rows,
    "regions": {"legend": {CH[i]: r[0] for i, r in enumerate(REGIONS)}, "rows": rrows},
    "places": [{"id": p[0], "name": p[1], "x": p[2], "y": p[3], "icon": p[4]} for p in PLACES],
    "entities": [{"id": "start", "kind": "spawn", "x": 22, "y": 21}],
}
path_out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "maps", "ostrel.json")
with open(path_out, "w") as f:
    f.write("{\n")
    for k in ("id", "name", "music", "world", "legend"): f.write(f' {json.dumps(k)}: {json.dumps(out[k])},\n')
    f.write(' "rows": [\n' + ",\n".join(f"  {json.dumps(r)}" for r in rows) + "\n ],\n")
    f.write(' "regions": {\n  "legend": ' + json.dumps(out["regions"]["legend"]) + ',\n  "rows": [\n' + ",\n".join(f"   {json.dumps(r)}" for r in rrows) + "\n  ]\n },\n")
    f.write(' "places": [\n' + ",\n".join(f"  {json.dumps(p)}" for p in out["places"]) + "\n ],\n")
    f.write(f' "entities": {json.dumps(out["entities"])}\n}}\n')
print("wrote", path_out)
for r in rows: print(r)
