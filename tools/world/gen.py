"""Generates the lands of Ostrel (data/maps/land-*.json) from the plans below.

  python3 tools/world/gen.py            # writes every land
  python3 tools/world/gen.py --print    # also prints each land as text

Ostrel is not one map. It is ten lands, each its own scrolling map, joined by roads that leave one land at its
edge and come into the next (a "way"). The story keeps a way shut, with a reason Rhea can see, until it's time:
snow in the passes, a Guild checkpoint, a town's shut gate. The lands the story reaches late (the Millcities,
Vantry, the Ember Courts) sit several lands away from Larkfold, so they're far to walk to and easy to keep shut.

Inside a land, each region has a seed point, a biome and a weight; every tile goes to the nearest seed (with a
little noise so borders wander). Terrain comes from the region's biome plus noise. Then the land's own features go
on top (cloud sea, coast, mountain walls, rivers, canals), then the places, then roads between places and out to
each way, found by a cheapest-path search so they bend round hills and cross mountains only at passes.
The output is deterministic: same plan, same lands."""
import heapq, json, math, os, random, sys

def noise_grid(scale, seed, W, H):
    rnd = random.Random(seed)
    gw, gh = W // scale + 4, H // scale + 4
    g = [[rnd.random() for _ in range(gw)] for _ in range(gh)]
    def at(x, y):
        fx, fy = (x % W) / scale, (y % H) / scale; ix, iy = int(fx), int(fy); tx, ty = fx - ix, fy - iy
        sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = g[iy][ix] * (1 - sx) + g[iy][ix + 1] * sx; b = g[iy + 1][ix] * (1 - sx) + g[iy + 1][ix + 1] * sx
        return a * (1 - sy) + b * sy
    return at

KIND = {"~": "sea", "-": "shoal", "c": "cloud", ".": "plains", ",": "meadow", "h": "hills", "M": "mount", "*": "snow", "P": "pines",
        "f": "forest", "w": "cloudwood", "t": "terraces", "m": "marsh", "r": "reeds", "s": "steppe", "d": "sand", "p": "saltpan",
        "R": "river", "=": "bridge", "#": "road", "^": "pass", "C": "canal", "S": "spire", "a": "ashrock", "o": "orchard", "T": "townground"}
T = {v: k for k, v in KIND.items()}
LOWLAND = {"river", "orchards", "hilltowns", "mills", "lowland", "coast", "parks", "uplands"}
SETTLED = {"village", "town", "city", "port", "castle", "palace", "fort", "college"}

# ---- the plans ----
# A land: id, name, size, regions (id, seed x, seed y, biome, weight), features, places (id, name, x, y, icon),
# roads (pairs of place ids, or a place id and a way id), and ways (id, side, position along that side, land it leads to).
LANDS = [
    dict(id="cloudline", name="The Cloudline", w=56, h=40,
         regions=[("cloudline", 22, 22, "terraces", 1.3), ("cloud-forest", 44, 16, "cloudwood", 0.9)],
         cloud=["west"], wall=[("south", 3), ("north", 3)],
         places=[("larkfold", "Larkfold", 22, 22, "ruins"), ("thornwick", "Thornwick", 32, 29, "ruins"), ("umes", "Ume's terraces", 10, 21, "village"),
                 ("highmoss", "Highmoss", 17, 10, "village"), ("dripstone", "Dripstone", 45, 24, "village"), ("mistfold", "Mistfold", 41, 9, "village")],
         roads=[("larkfold", "thornwick"), ("thornwick", "w:cloudline-vale"), ("larkfold", "umes"), ("umes", "highmoss"), ("larkfold", "highmoss"),
                ("thornwick", "dripstone"), ("dripstone", "mistfold"), ("mistfold", "w:cloudline-north"), ("umes", "w:cloudline-vael")],
         ways=[("cloudline-vale", "south", 38, "vale"), ("cloudline-north", "north", 34, "north"), ("cloudline-vael", "west", 21, "vael")],
         start=(22, 23)),
    dict(id="vale", name="The Kerrow Vale", w=72, h=48,
         regions=[("millbridge", 28, 30, "river", 1.1), ("kerrow-gorge", 12, 10, "gorge", 0.8), ("old-drove-road", 58, 14, "uplands", 1.0)],
         wall=[("north", 2)],
         rivers=[[(10, 1), (12, 8), (18, 14), (26, 20), (30, 26), (28, 32), (34, 38), (38, 47)]],
         places=[("ferrow", "Ferrow Cross", 15, 14, "inn"), ("kerrow", "Kerrow", 6, 18, "village"), ("ropebridge", "Ropebridge", 22, 8, "village"),
                 ("millbridge", "Millbridge", 27, 29, "town"), ("weirbank", "Weirbank", 37, 22, "village"), ("bend", "Hob's Bend", 43, 33, "sign"),
                 ("sallow", "Sallow hatchery", 52, 41, "hatchery"), ("camp", "Commons camp", 60, 17, "camp"),
                 ("drovers-halt", "Drovers' Halt", 52, 7, "village"), ("longbarrow", "Longbarrow", 66, 28, "village")],
         roads=[("w:cloudline-vale", "ferrow"), ("ferrow", "millbridge"), ("ferrow", "kerrow"), ("ferrow", "ropebridge"), ("millbridge", "weirbank"),
                ("millbridge", "bend"), ("bend", "sallow"), ("bend", "camp"), ("weirbank", "camp"), ("camp", "drovers-halt"), ("camp", "longbarrow"),
                ("drovers-halt", "w:vale-north"), ("kerrow", "w:vale-west"), ("longbarrow", "w:vale-east"), ("sallow", "w:vale-millcities")],
         ways=[("cloudline-vale", "north", 14, "cloudline"), ("vale-north", "north", 60, "north"), ("vale-west", "west", 30, "west"),
               ("vale-east", "east", 34, "east"), ("vale-millcities", "south", 46, "millcities")]),
    dict(id="north", name="The High North", w=64, h=40,
         regions=[("high-passes", 14, 30, "passes", 1.0), ("lorne", 24, 8, "cold", 1.2), ("drevka", 46, 27, "highland", 1.1), ("storm-roost", 54, 7, "peak", 0.7)],
         places=[("cairn-hostel", "Cairn Hostel", 9, 33, "village"), ("snowgate", "Snowgate", 19, 23, "fort"), ("holm", "Holm", 25, 6, "castle"),
                 ("frostmere", "Frostmere", 36, 11, "town"), ("kestrel-fort", "Kestrel Fort", 45, 22, "fort"), ("grazehold", "Grazehold", 54, 31, "village"),
                 ("stormwatch", "Stormwatch", 53, 4, "fort"), ("roost-foot", "Roost Foot", 59, 12, "village")],
         roads=[("w:cloudline-north", "cairn-hostel"), ("cairn-hostel", "snowgate"), ("snowgate", "holm"), ("holm", "frostmere"), ("snowgate", "kestrel-fort"),
                ("kestrel-fort", "grazehold"), ("grazehold", "w:vale-north"), ("frostmere", "roost-foot"), ("roost-foot", "stormwatch"), ("kestrel-fort", "roost-foot")],
         ways=[("cloudline-north", "south", 10, "cloudline"), ("vale-north", "south", 56, "vale")]),
    dict(id="vael", name="The Spires of Vael", w=34, h=26,
         regions=[("vael", 16, 12, "spires", 2.0)], spires=True,
         places=[("highspire", "Highspire", 11, 9, "village"), ("ropeway", "Ropeway", 22, 16, "village")],
         roads=[("highspire", "ropeway"), ("ropeway", "w:cloudline-vael")],
         ways=[("cloudline-vael", "east", 16, "cloudline")]),
    dict(id="west", name="The Free Towns and the Fens", w=64, h=44,
         regions=[("hollin", 44, 12, "orchards", 1.1), ("college", 34, 30, "lowland", 0.9), ("fens", 12, 28, "fen", 1.0)],
         sea=["south-west"],
         places=[("hollin", "Hollin", 46, 14, "town"), ("applegarth", "Applegarth", 34, 7, "village"), ("college", "The College", 30, 27, "college"),
                 ("lanthorn", "Lanthorn", 41, 33, "town"), ("peatmoor", "Peatmoor", 14, 20, "village"), ("reedhythe", "Reedhythe", 10, 32, "village")],
         roads=[("w:vale-west", "hollin"), ("hollin", "applegarth"), ("hollin", "college"), ("college", "lanthorn"), ("college", "peatmoor"),
                ("peatmoor", "reedhythe"), ("lanthorn", "w:west-millcities"), ("college", "w:west-coast")],
         ways=[("vale-west", "east", 14, "vale"), ("west-coast", "south", 24, "coast"), ("west-millcities", "east", 36, "millcities")]),
    dict(id="east", name="The Hill Towns and the Steppe", w=64, h=44,
         regions=[("corvane", 14, 20, "hilltowns", 1.0), ("tarsis", 36, 28, "steppe", 1.1), ("wandering-herd", 54, 12, "plateau", 0.9)],
         places=[("corvane", "Corvane", 13, 23, "town"), ("tallyhill", "Tallyhill", 20, 10, "town"), ("tarsis", "Tarsis", 38, 28, "fort"),
                 ("dry-hollow", "Dry Hollow", 33, 15, "village"), ("summer-fold", "Summer Fold", 54, 9, "village"), ("stone-rings", "Stone Rings", 57, 22, "village")],
         roads=[("w:vale-east", "corvane"), ("corvane", "tallyhill"), ("corvane", "tarsis"), ("tarsis", "dry-hollow"), ("tarsis", "w:east-ember"),
                ("summer-fold", "stone-rings")],
         ways=[("vale-east", "west", 22, "vale"), ("east-ember", "south", 40, "ember")]),
    dict(id="coast", name="The Salt Coast", w=64, h=40,
         regions=[("ashby", 26, 14, "coast", 1.1), ("salt-house", 48, 24, "saltmarsh", 0.9), ("osk", 8, 31, "volcanic", 0.5)],
         sea=["west", "south"], island=(9, 31, 4.2),
         places=[("ashby", "Port Ashby", 20, 17, "port"), ("gullstair", "Gullstair", 31, 7, "village"), ("salt-house", "The Salt House", 47, 22, "town"),
                 ("brinepans", "Brinepans", 54, 29, "village"), ("cinder-landing", "Cinder Landing", 9, 29, "village"), ("pumice", "Pumice", 11, 33, "village")],
         roads=[("w:west-coast", "gullstair"), ("gullstair", "ashby"), ("ashby", "salt-house"), ("salt-house", "brinepans"), ("cinder-landing", "pumice")],
         shoals=[[(19, 19), (16, 22), (13, 26), (11, 28)]],
         ways=[("west-coast", "north", 36, "west")]),
    dict(id="millcities", name="The Millcities", w=60, h=40,
         regions=[("millcities", 30, 14, "mills", 1.3), ("low-water", 40, 31, "mills", 0.7)],
         rivers=[[(27, 0), (26, 8), (30, 14), (28, 22), (32, 30), (30, 39)]],
         canals=[[(6, 18), (54, 18)], [(44, 6), (44, 34)]],
         places=[("cinderwick", "Cinderwick", 20, 12, "city"), ("lockside", "Lockside", 38, 9, "town"),
                 ("candle-galleries", "The Candle Galleries", 37, 30, "village"), ("lockkeepers-deep", "Lockkeeper's Deep", 47, 33, "village")],
         roads=[("w:vale-millcities", "cinderwick"), ("cinderwick", "lockside"), ("w:west-millcities", "cinderwick"), ("cinderwick", "w:millcities-heartland"),
                ("candle-galleries", "lockkeepers-deep")],
         ways=[("vale-millcities", "north", 22, "vale"), ("west-millcities", "west", 26, "west"), ("millcities-heartland", "south", 18, "heartland")]),
    dict(id="ember", name="The Ember Courts", w=60, h=40,
         regions=[("ember", 22, 16, "desert", 1.1), ("deep-desert", 44, 27, "dunes", 1.0)],
         places=[("ember", "The Ember Courts", 21, 19, "palace"), ("duskwell", "Duskwell", 12, 9, "town"), ("last-well", "Last Well", 40, 23, "village"),
                 ("glassdune", "Glassdune", 50, 32, "village")],
         roads=[("w:east-ember", "ember"), ("ember", "duskwell"), ("ember", "last-well"), ("last-well", "glassdune")],
         ways=[("east-ember", "north", 20, "east")]),
    dict(id="heartland", name="Vantry and the Crown", w=64, h=44,
         regions=[("guild", 42, 20, "hatchery", 1.1), ("crown", 18, 28, "parks", 1.0)],
         sea=["south"],
         places=[("vantry", "Vantry", 41, 19, "city"), ("coldhatch", "Coldhatch", 52, 30, "village"), ("kingsmere", "Kingsmere", 18, 24, "castle"),
                 ("queensford", "Queensford", 25, 35, "town")],
         roads=[("w:millcities-heartland", "vantry"), ("vantry", "coldhatch"), ("vantry", "kingsmere"), ("kingsmere", "queensford")],
         ways=[("millcities-heartland", "north", 30, "millcities")]),
]
# hidden regions: no roads in from outside; found by walking in
HIDDEN = {"vael", "low-water", "osk", "salt-house", "wandering-herd"}

def biome_tile(b, x, y, noise, N3):
    n = noise(x, y); r = random.random()
    if b in LOWLAND:
        w = N3(x * 2.3, y * 2.3)
        if w > 0.74: return "forest"
        if w < 0.2: return "hills"
    if b == "cold": return "snow" if n > 0.62 else "pines" if n > 0.45 else "plains" if r > 0.3 else "snow"
    if b == "passes": return "mount" if n > 0.5 else "snow"
    if b == "peak": return "mount" if n > 0.4 else "snow"
    if b == "highland": return "mount" if n > 0.68 else "hills" if n > 0.4 else "meadow"
    if b == "terraces": return "terraces" if n > 0.42 else "meadow" if n > 0.3 else "hills"
    if b == "cloudwood": return "cloudwood" if n > 0.32 else "meadow"
    if b == "spires": return "spire" if r > 0.6 else "meadow"
    if b == "gorge": return "mount" if n > 0.6 else "forest" if n > 0.42 else "hills"
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

def way_tile(side, pos, W, H):
    return {"north": (pos, 0), "south": (pos, H - 1), "west": (0, pos), "east": (W - 1, pos)}[side]

def build(L, seed):
    W, H = L["w"], L["h"]
    random.seed(seed)
    N1, N2, N3 = noise_grid(8, seed + 1, W, H), noise_grid(4, seed + 2, W, H), noise_grid(12, seed + 3, W, H)
    def noise(x, y): return 0.55 * N1(x, y) + 0.3 * N2(x, y) + 0.15 * N3(x, y)
    R = L["regions"]
    region = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            wx, wy = x + (N2(x, y) - 0.5) * 7, y + (N3(x, y) - 0.5) * 7
            region[y][x] = min(range(len(R)), key=lambda i: math.hypot(wx - R[i][1], wy - R[i][2]) / R[i][4])
    grid = [[biome_tile(R[region[y][x]][3], x, y, noise, N3) for x in range(W)] for y in range(H)]
    def setk(x, y, k):
        if 0 <= x < W and 0 <= y < H: grid[y][x] = k
    def line(points, kind, wobble=0.0):
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            n = max(abs(x1 - x0), abs(y1 - y0), 1); last = None
            for i in range(n + 1):
                x = round(x0 + (x1 - x0) * i / n + (N3(i, x0 + y0) - 0.5) * wobble); y = round(y0 + (y1 - y0) * i / n)
                if last and last[0] != x and last[1] != y: setk(last[0], y, kind)   # keep it 4-connected
                setk(x, y, kind); last = (x, y)
    edge = lambda side, x, y, d: {"west": x < d, "east": x >= W - d, "north": y < d, "south": y >= H - d,
                                  "south-west": x + (H - 1 - y) < d * 1.6}[side]
    # cloud sea: the highlands fall away into cloud on their open sides
    for side in L.get("cloud", []):
        for y in range(H):
            for x in range(W):
                if edge(side, x, y, 3 + (N1(x, y) - 0.5) * 4): grid[y][x] = "cloud"
    # coasts
    for side in L.get("sea", []):
        d0 = {"south-west": 14}.get(side, 5)
        for y in range(H):
            for x in range(W):
                if edge(side, x, y, d0 + (N1(x * 1.3, y) - 0.5) * 5): grid[y][x] = "sea"
    if "island" in L:
        ix, iy, ir = L["island"]
        for y in range(H):
            for x in range(W):
                if R[region[y][x]][0] == "osk": grid[y][x] = "ashrock" if math.hypot(x - ix, y - iy) < ir + (N2(x, y) - 0.5) * 2 else "sea"
    for s in L.get("shoals", []): line(s, "shoal")
    # Vael: spires standing out of the cloud sea, joined by ridges of meadow
    if L.get("spires"):
        for y in range(H):
            for x in range(W):
                if noise(x, y) < 0.42 or min(x, y, W - 1 - x, H - 1 - y) < 2: grid[y][x] = "cloud"
    # mountain walls along a side: a band of peaks the roads must cross at a pass
    for side, depth in L.get("wall", []):
        for y in range(H):
            for x in range(W):
                if edge(side, x, y, depth + (N2(x, y) - 0.5) * 2) and grid[y][x] not in ("cloud", "sea"): grid[y][x] = "mount"
    for r in L.get("rivers", []): line(r, "river", 1.5)
    for c in L.get("canals", []): line(c, "canal")
    # places: clear the ground round each one
    places = L["places"]
    for _, _, x, y, _ in places:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                k0 = grid[y + dy][x + dx]
                if k0 in ("river", "canal") and (dx == 0 or dy == 0): setk(x + dx, y + dy, "bridge")   # a river town keeps its river, with a crossing
                elif k0 in ("mount", "spire", "cloud", "sea", "river", "canal", "shoal"): setk(x + dx, y + dy, "meadow")
        setk(x, y, "townground")
    # ways: the road leaves the land here
    ways = []
    for wid, side, pos, to in L["ways"]:
        x, y = way_tile(side, pos, W, H)
        ways.append({"id": wid, "x": x, "y": y, "side": side, "to": to})
        dx, dy = {"north": (0, 1), "south": (0, -1), "west": (1, 0), "east": (-1, 0)}[side]
        for i in range(5):   # the way comes in over solid ground, even out of the cloud or across the shore
            k0 = grid[y + dy * i][x + dx * i]
            if k0 in ("cloud", "sea", "spire", "shoal", "mount"): setk(x + dx * i, y + dy * i, "pass" if k0 == "mount" else "meadow")
            if k0 in ("river", "canal"): setk(x + dx * i, y + dy * i, "bridge")
        setk(x, y, "road")
    P = {p[0]: (p[2], p[3]) for p in places}
    for w in ways: P["w:" + w["id"]] = (w["x"], w["y"])
    COST = {"sea": None, "cloud": None, "spire": None, "shoal": 6, "ashrock": 4, "mount": 25, "river": 18, "canal": 18, "snow": 4, "marsh": 5,
            "reeds": 4, "forest": 4, "cloudwood": 4, "pines": 4, "hills": 3, "sand": 3, "saltpan": 3, "road": 0.5, "pass": 0.6, "bridge": 0.5, "townground": 0.5}
    if L.get("spires"): COST["cloud"] = 10   # in Vael the paths run along narrow ridges through the cloud
    def path(a, b):
        (sx, sy), (gx, gy) = a, b
        dist = {(sx, sy): 0}; prev = {}; q = [(0, sx, sy)]
        while q:
            d, x, y = heapq.heappop(q)
            if (x, y) == (gx, gy): break
            if d > dist[(x, y)]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < W and 0 <= ny < H): continue
                c = COST.get(grid[ny][nx], 1.5)
                if c is None and (nx, ny) != (gx, gy): continue
                nd = d + (c or 1) + 0.4 * noise(nx, ny)
                if nd < dist.get((nx, ny), 1e9): dist[(nx, ny)] = nd; prev[(nx, ny)] = (x, y); heapq.heappush(q, (nd, nx, ny))
        out, p = [], (gx, gy)
        assert p in prev, f"{L['id']}: no road from {a} to {b}"
        while p in prev: out.append(p); p = prev[p]
        return out[::-1]
    for a, b in L["roads"]:
        for x, y in path(P[a], P[b]):
            k = grid[y][x]
            if k == "townground": continue
            grid[y][x] = "pass" if k in ("mount", "snow") else "bridge" if k in ("river", "canal") else "road"
    # check: every place stands in a region it belongs to, and every way and place can be walked to from the first
    BLOCK = {"sea", "cloud", "spire", "river", "canal", "mount"}
    start = L.get("start", (places[0][2], places[0][3] + 1))
    seen, todo = {start}, [start]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and grid[ny][nx] not in BLOCK: seen.add((nx, ny)); todo.append((nx, ny))
    hidden_ok = lambda pid, x, y: R[region[y][x]][0] in HIDDEN
    for pid, _, x, y, _ in places:
        assert (x, y) in seen or hidden_ok(pid, x, y), f"{L['id']}: {pid} can't be reached"
    for w in ways: assert (w["x"], w["y"]) in seen, f"{L['id']}: way {w['id']} can't be reached"
    CH = "abcdefghij"
    rows = ["".join(T[grid[y][x]] for x in range(W)) for y in range(H)]
    rrows = ["".join(CH[region[y][x]] for x in range(W)) for y in range(H)]
    return {
        "id": f"land-{L['id']}", "name": L["name"], "music": "world", "world": True,
        "legend": dict(KIND), "rows": rows,
        "regions": {"legend": {CH[i]: r[0] for i, r in enumerate(R)}, "rows": rrows},
        "places": [{"id": p[0], "name": p[1], "x": p[2], "y": p[3], "icon": p[4]} for p in places],
        "ways": ways,
        "entities": [{"id": "start", "kind": "spawn", "x": start[0], "y": start[1]}],
    }

def write(m):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "maps", m["id"] + ".json")
    with open(out, "w") as f:
        f.write("{\n")
        for k in ("id", "name", "music", "world", "legend"): f.write(f' {json.dumps(k)}: {json.dumps(m[k])},\n')
        f.write(' "rows": [\n' + ",\n".join(f"  {json.dumps(r)}" for r in m["rows"]) + "\n ],\n")
        f.write(' "regions": {\n  "legend": ' + json.dumps(m["regions"]["legend"]) + ',\n  "rows": [\n' + ",\n".join(f"   {json.dumps(r)}" for r in m["regions"]["rows"]) + "\n  ]\n },\n")
        f.write(' "places": [\n' + ",\n".join(f"  {json.dumps(p)}" for p in m["places"]) + "\n ],\n")
        f.write(' "ways": [\n' + ",\n".join(f"  {json.dumps(w)}" for w in m["ways"]) + "\n ],\n")
        f.write(f' "entities": {json.dumps(m["entities"])}\n}}\n')
    return out

if __name__ == "__main__":
    lands = {L["id"]: L for L in LANDS}
    # ways come in pairs: each way named in one land leads to a land that names it back
    for L in LANDS:
        for wid, _, _, to in L["ways"]:
            assert any(w[0] == wid and w[3] == L["id"] for w in lands[to]["ways"]), f"way {wid} from {L['id']} has no other end in {to}"
    count = {}
    for i, L in enumerate(LANDS):
        m = build(L, 7 + i * 11)
        for p in m["places"]:
            ch = m["regions"]["rows"][p["y"]][p["x"]]; r = m["regions"]["legend"][ch]
            if p["icon"] in SETTLED: count[r] = count.get(r, 0) + 1
        print("wrote", write(m))
        if "--print" in sys.argv:
            for r in m["rows"]: print(r)
    low = {r: n for r, n in count.items() if n < 2}
    assert not low, f"regions with fewer than two settlements: {low}"
