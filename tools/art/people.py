"""Composes the pixel people for the explore view: 16 x 24 frames, 4 facings x 5 frames (stand + a 4-step walk).

Parts are drawn as flat colour shapes (palette letters), then the outline is added round the outside, so the
silhouette stays clean whatever the pose. Writes src/art/peopleFrames.json; preview with --png out.png.

Letters: h hair, H hair light, d hair dark, s skin, S skin shade, n mouth, e eye, w eye white, c coat, C coat shade,
r accent (scarf, collar), R accent shade, l legs, L legs shade, b boots, B boot light, o outline.
"""
import json, os, sys

W, H = 16, 24
FACINGS = ["down", "up", "left", "right"]


class Grid:
    def __init__(self): self.g = [["."] * W for _ in range(H)]
    def set(self, x, y, c):
        if 0 <= x < W and 0 <= y < H: self.g[y][x] = c
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.set(x, y, c)
    def outline(self):
        out = [r[:] for r in self.g]
        for y in range(H):
            for x in range(W):
                if self.g[y][x] != ".": continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.g[ny][nx] not in ".o": out[y][x] = "o"; break
        self.g = out
    def rows(self): return ["".join(r).rstrip(".") for r in self.g]


def head_front(g, top, hair="short", beard="none", back=False):
    """Hair styles: short, braid, bun, bald, cap. Beards: none, full, moustache."""
    bald = hair == "bald"
    H1 = "s" if bald else "h"
    g.rect(5, top, 10, top, H1); g.rect(4, top + 1, 11, top + 3, H1)
    if bald:
        g.set(6, top + 1, "w"); g.set(5, top + 2, "S"); g.set(10, top + 1, "S"); g.set(11, top + 2, "S"); g.set(11, top + 3, "S")
        g.set(4, top + 3, "h"); g.set(11, top + 3, "d")
    else:
        g.set(6, top + 1, "H"); g.set(7, top + 1, "H"); g.set(5, top + 2, "H")
        g.set(11, top + 2, "d"); g.set(11, top + 3, "d")
    if hair == "cap":
        g.rect(5, top, 10, top, "p"); g.rect(4, top + 1, 11, top + 1, "p"); g.rect(4, top + 2, 11, top + 2, "P"); g.set(6, top, "P"); g.set(9, top + 1, "P")
    if back:
        if bald: g.rect(4, top + 4, 11, top + 5, "h"); g.rect(4, top + 1, 11, top + 3, "s"); g.set(10, top + 2, "S"); g.set(11, top + 3, "S"); g.rect(5, top, 10, top, "s"); g.set(6, top + 1, "w")
        else:
            g.rect(4, top + 4, 11, top + 5, "h"); g.rect(5, top + 6, 10, top + 6, "d"); g.set(10, top + 4, "d"); g.set(10, top + 5, "d")
            if hair != "cap": g.set(6, top + 3, "H")
        g.rect(6, top + 7, 9, top + 7, "S")  # nape
        if hair == "braid":
            for i, y in enumerate(range(top + 6, top + 13)): g.set(7, y, "h" if i % 2 else "H"); g.set(8, y, "d" if i % 2 else "h")
            g.set(7, top + 13, "r"); g.set(8, top + 13, "r")
        if hair == "bun": g.rect(6, top + 2, 9, top + 4, "h"); g.set(6, top + 2, "H"); g.set(7, top + 2, "H"); g.rect(7, top + 5, 8, top + 5, "d")
        return
    g.rect(5, top + 3, 10, top + 6, "s"); g.rect(6, top + 7, 9, top + 7, "s")
    if not bald:
        g.set(5, top + 3, "h"); g.set(6, top + 3, "h"); g.set(9, top + 3, "h"); g.set(10, top + 3, "h")  # fringe
        g.set(4, top + 4, "h"); g.set(4, top + 5, "h"); g.set(11, top + 4, "d"); g.set(11, top + 5, "d")  # side hair
    else:
        g.set(4, top + 4, "h"); g.set(11, top + 4, "d")
    g.set(6, top + 4, "d"); g.set(9, top + 4, "d")     # brows
    g.set(6, top + 5, "e"); g.set(9, top + 5, "e")     # eyes
    g.set(10, top + 6, "S"); g.set(5, top + 6, "S"); g.set(9, top + 7, "S")  # jaw shade
    g.set(8, top + 6, "S")                              # nose
    g.set(7, top + 7, "n"); g.set(8, top + 7, "n")      # mouth
    if beard == "full":
        for x, y in ((5, 6), (10, 6), (6, 7), (9, 7), (7, 8), (8, 8), (5, 5), (10, 5)): g.set(x, top + y, "f")
    if beard == "moustache": g.rect(6, top + 7, 9, top + 7, "f"); g.set(7, top + 8, "s"); g.set(8, top + 8, "s")
    if hair == "braid":   # over the shoulder, on the viewer's left
        for i, y in enumerate(range(top + 5, top + 12)): g.set(4, y, "h" if i % 2 else "H"); g.set(3 if i > 2 else 4, y, "d" if i > 2 else "h")
        g.set(4, top + 12, "r")
    if hair == "bun": g.rect(10, top, 12, top + 2, "h"); g.set(11, top, "H"); g.set(12, top + 2, "d")


def head_side(g, top, hair="short", beard="none"):
    # facing right: hair over the back of the head, a narrow face in front
    bald = hair == "bald"
    if bald:
        g.rect(5, top, 9, top, "s"); g.rect(4, top + 1, 11, top + 2, "s"); g.set(6, top + 1, "w"); g.set(4, top + 2, "S")
        g.rect(4, top + 3, 8, top + 5, "h"); g.rect(5, top + 6, 7, top + 6, "d"); g.set(8, top + 3, "s")
    else:
        g.rect(5, top, 9, top, "h"); g.rect(4, top + 1, 11, top + 2, "h"); g.rect(4, top + 3, 8, top + 5, "h"); g.rect(5, top + 6, 7, top + 6, "d")
        g.set(6, top + 1, "H"); g.set(7, top + 1, "H"); g.set(8, top + 1, "H"); g.set(5, top + 2, "H")
        g.set(4, top + 4, "d"); g.set(4, top + 5, "d")
    if hair == "cap": g.rect(5, top, 9, top, "p"); g.rect(4, top + 1, 11, top + 1, "p"); g.rect(4, top + 2, 11, top + 2, "P")
    g.rect(9, top + 3, 11, top + 6, "s"); g.set(12, top + 5, "s"); g.rect(9, top + 7, 10, top + 7, "s")
    if not bald: g.set(11, top + 3, "h"); g.set(10, top + 3, "h")   # fringe
    g.set(10, top + 4, "d")                             # brow
    g.set(10, top + 5, "e")                             # eye
    g.set(9, top + 5, "S")                              # ear
    g.set(11, top + 6, "n")                             # mouth
    g.set(9, top + 7, "S")
    if beard == "full":
        for x, y in ((9, 6), (10, 6), (9, 7), (10, 7), (11, 7), (10, 8)): g.set(x, top + y, "f")
    if beard == "moustache": g.set(11, top + 6, "f"); g.set(12, top + 6, "f")
    if hair == "braid":
        for i, y in enumerate(range(top + 6, top + 12)): g.set(4, y, "h" if i % 2 else "H"); g.set(5, y, "d" if i % 2 else "h")
        g.set(4, top + 12, "r")
    if hair == "bun": g.rect(2, top + 1, 4, top + 3, "h"); g.set(3, top + 1, "H"); g.set(2, top + 3, "d")


def frame(facing, fr, small, hair="short", beard="none"):
    """fr 0 stand; 1 contact (left foot forward), 2 passing (up), 3 contact (right foot), 4 passing (up)."""
    g = Grid()
    torso = 3 if small else 5            # coat rows below the collar
    leg = 2 if small else 5              # leg rows above the boots
    bob = 1 if fr in (2, 4) else 0
    feet = 22                            # the boot soles sit on row 22
    hip = feet - 1 - leg                 # first leg row
    collar = hip - torso - 1 - bob
    top = collar - 8
    side = facing in ("left", "right")
    swing = {0: 0, 1: 1, 2: 0, 3: -1, 4: 0}[fr]   # +1: right arm forward / left leg forward

    # ---- legs ----
    if not side:
        for lx in (5, 9):
            lift = 1 if (lx == 5 and swing < 0) or (lx == 9 and swing > 0) else 0
            if fr in (2, 4): lift = 2 if (lx == 5) == (fr == 2) else 0
            y1 = feet - 1 - lift
            g.rect(lx, hip - bob, lx + 1, y1 - 1, "l"); g.set(lx + (1 if lx == 5 else 0), hip - bob, "L")
            g.rect(lx, y1, lx + 1, y1 + 1, "b"); g.set(lx, y1, "B")
            if lift: g.rect(lx, y1 - 1, lx + 1, y1 - 1, "L")
    else:
        def leg_side(x_hip, x_foot, lift, back):
            y0, y1 = hip - bob, feet - 1 - lift
            n = y1 - y0
            for i in range(n):
                x = round(x_hip + (x_foot - x_hip) * i / max(1, n - 1))
                g.set(x, y0 + i, "L" if back else "l"); g.set(x + 1, y0 + i, "L")
            g.rect(x_foot, y1, x_foot + 2, y1 + 1, "b"); g.set(x_foot + 2, y1, "B")
        if fr == 0: leg_side(6, 6, 0, True); leg_side(8, 8, 0, False)
        elif fr in (1, 3): leg_side(7, 4, 0, True); leg_side(8, 10, 0, False)
        else: leg_side(7, 6, 2, True); leg_side(8, 8, 0, False)

    # ---- torso ----
    if not side:
        g.rect(4, collar + 1, 11, collar + torso, "c")
        g.rect(5, collar, 10, collar, "c")
        if facing == "down": g.rect(6, collar, 9, collar + 1, "r"); g.set(8, collar + 1, "R"); g.set(7, collar + 2, "R")
        else: g.rect(5, collar, 10, collar, "r"); g.rect(6, collar + 2, 9, collar + 2, "C")
        g.rect(4, collar + torso, 11, collar + torso, "C")         # belt / hem
        # arms over the body's edges, a darker line inside so they read apart from the coat; hands swing a pixel
        for ax, inner, d in ((3, 4, -swing), (12, 11, swing)):
            if facing == "up": d = -d
            y1 = collar + torso - max(0, d) + (1 if d < 0 else 0)
            g.rect(ax, collar + 1, ax, y1 - 1, "c" if ax == 3 else "k"); g.rect(inner, collar + 1, inner, y1 - 1, "C" if ax == 3 else "k")
            g.set(ax, y1, "s" if ax == 3 else "S")
    else:
        g.rect(5, collar + 1, 10, collar + torso, "c"); g.rect(6, collar, 9, collar, "c")
        g.rect(8, collar, 10, collar, "r"); g.set(9, collar + 1, "r"); g.set(10, collar + 1, "R")
        g.rect(5, collar + torso, 10, collar + torso, "C"); g.rect(5, collar + 1, 5, collar + torso, "C")
        reach = {0: 0, 1: 2, 2: 0, 3: -2, 4: 0}[fr]
        y0 = collar + 1
        for i in range(torso):
            x = 7 + round(reach * i / max(1, torso - 1))
            g.set(x, y0 + i, "k"); g.set(x + 1, y0 + i, "c")
        hx = 7 + reach
        g.rect(hx, y0 + torso, hx + 1, y0 + torso, "s")

    # ---- head ----
    if side: head_side(g, top, hair, beard)
    else: head_front(g, top, hair, beard, back=(facing == "up"))

    g.outline()
    return g.rows()


HAIRS = ["short", "braid", "bun", "bald", "cap"]
BEARDS = ["none", "full", "moustache"]


def flip(rows): return [("".join(reversed(r.ljust(W, ".")))).rstrip(".") for r in rows]


def sheet(small, hair="short", beard="none"):
    return {f: [flip(frame("right", fr, small, hair, beard)) if f == "left" else frame(f, fr, small, hair, beard) for fr in range(5)] for f in FACINGS}


if __name__ == "__main__":
    data = {"note": "Generated by tools/art/people.py. 16 x 24 frames: sets[size|hair|beard][facing][stand, walk 1-4].", "w": W, "h": H,
            "sets": {f"{size}|{hair}|{beard}": sheet(size == "small", hair, beard) for size in ("adult", "small") for hair in HAIRS for beard in BEARDS}}
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "art", "peopleFrames.json")
    with open(out, "w") as f: json.dump(data, f, separators=(",", ":"))
    if "--png" in sys.argv:
        from PIL import Image
        pal = {"o": "#2a1d17", "h": "#3a2418", "H": "#5c3a26", "d": "#24160e", "s": "#e2b48c", "S": "#b8865f", "n": "#b06a58", "e": "#1a1210",
               "c": "#6b4a3a", "C": "#4f3428", "k": "#3e2a20", "w": "#efe6dc", "f": "#4a3a30", "p": "#4a5a34", "P": "#36432a", "r": "#c0452f", "R": "#8e2f20", "l": "#3b2e26", "L": "#2a201a", "b": "#221a15", "B": "#4a3a30"}
        S = 8
        combos = [("short", "none"), ("braid", "none"), ("bun", "none"), ("bald", "full"), ("cap", "none"), ("short", "moustache"), ("short", "full")]
        img = Image.new("RGB", (W * 4 * S * 2 + 40, H * len(combos) * S), "#7fae5a")
        for k, small in enumerate((False, True)):
          for ci, (hair, beard) in enumerate(combos):
            sh = sheet(small, hair, beard)
            for fi, f in enumerate(FACINGS):
                for fr in (0,):
                    for y, r in enumerate(sh[f][fr]):
                        for x, c in enumerate(r):
                            if c in pal:
                                X = k * (W * 4 * S + 40) + (fi * W + x) * S; Y = (ci * H + y) * S
                                img.paste(pal[c], (X, Y, X + S, Y + S))
        img.save(sys.argv[sys.argv.index("--png") + 1])
