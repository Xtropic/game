"""Records every line in lines.json with OmniVoice (k2-fsa/OmniVoice) into public/vo/<hash>.mp3, and writes
public/vo/index.json (loudness envelopes for lip sync).

  node tools/voice/extract.mjs
  python3 tools/voice/gen_omni.py            # needs: pip install omnivoice librosa (torch CPU is fine)

How a character gets their voice
  1. CASTING below says who each speaker is: gender, age, pitch, the accent of the land they come from, how fast
     they talk, and a light touch of colour (an old man's tremble, a big man's chest). Accents follow home ground,
     so everyone from one place sounds like they grew up together (see ACCENT).
  2. The voice is DESIGNED by reading one of the character's own lines, not a neutral test sentence, several
     times with different seeds. The take whose measured pitch best fits the character, and sits furthest from
     the voices already cast, becomes the reference: tools/voice/refs/<who>.wav (+ refs/<who>.txt).
  3. Every line that character speaks is CLONED from that one reference with a fixed seed per line.
  4. CONSISTENCY: when a character's lines are done, each line's pitch and timbre are compared with the rest of
     theirs. Lines that drift away are recorded again with a new seed (up to RETRIES times), keeping the closest.

Speakers who are the same person under two ids share one voice (SAME).
Delete a ref (or REVOICE=who,who) to cast that voice again; FRESH=1 records every line again; REDO=who,who just
those speakers; ONLY=who,who limits a run to those speakers. Unchanged lines keep their file.
Model weights are CC-BY-NC (non-commercial): replace before any paid release."""
import hashlib, json, os, re, subprocess, sys
import numpy as np, soundfile as sf, torch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("VO_OUT") or os.path.join(HERE, "..", "..", "public", "vo")
REFS = os.path.join(HERE, "refs")
STEPS = int(os.environ.get("STEPS", "16"))
RETRIES = int(os.environ.get("RETRIES", "2"))
torch.set_num_threads(os.cpu_count() or 4)

# The accent of each land. Ostrel's two big peoples are the highlanders (Larkfold, the Cloudline clans) and the
# lowlanders (Millbridge, the Commons army, the Guild and its Wardens); the far nations each have their own.
ACCENT = {
    "highlands": "british accent", "lowlands": "american accent", "hollin": "british accent",
    "crown": "british accent", "lorne": "british accent", "ashby": "australian accent", "tarsis": "australian accent",
    "drevka": "russian accent", "league": "canadian accent", "ember": "portuguese accent",
}
# who: (gender, age, pitch, land, speed, colour, takes). colour: "" | "old" (a slight tremble) | "chest" (a big man's
# low warmth) | "crisp" (a clipped officer's edge) | "thin" (a frail, papery top). takes: designs to choose from.
CASTING = {
    # Larkfold and the Cloudline
    "rhea": ("female", "young adult", "moderate pitch", "highlands", 0.96, "", 3),        # 30s, doctor, steady and warm
    "finch": ("female", "young adult", "low pitch", "highlands", 1.02, "", 4),   # 12 to 16, a boy voiced by a young woman (the model makes no real boys), cheeky, then closed
    "tamsin": ("female", "young adult", "high pitch", "highlands", 1.06, "", 3),        # 20, quick runner, dry humour
    "maren": ("female", "elderly", "low pitch", "highlands", 0.86, "old", 4),            # 70, elder, firm
    "rook": ("male", "elderly", "low pitch", "highlands", 0.82, "frail", 4),              # 80, dying, calm
    "oda": ("female", "elderly", "moderate pitch", "highlands", 0.85, "old", 4),         # 71, gentle tray keeper
    "davin": ("male", "elderly", "moderate pitch", "highlands", 0.88, "old", 4),        # 70s, kindly gatekeeper
    "sela": ("female", "young adult", "very high pitch", "highlands", 0.98, "", 3),                # 8, quiet, watchful
    "pell": ("female", "young adult", "very high pitch", "highlands", 1.04, "", 1),
    "posy": ("female", "young adult", "moderate pitch", "highlands", 0.98, "", 3),              # 15, hard, unflinching
    "ume": ("female", "elderly", "high pitch", "highlands", 0.84, "thin", 4),           # 84, tiny, amused, sharp
    "tobin": ("male", "middle-aged", "low pitch", "highlands", 0.92, "", 2),            # 40, miner, shaking, worn
    # the lowlands: Millbridge, the Commons army
    "corran": ("male", "young adult", "low pitch", "lowlands", 0.92, "", 3),            # mid 30s, ex-Warden, tired, haunted
    "kane": ("male", "middle-aged", "moderate pitch", "lowlands", 0.97, "", 3),         # 52, charming, persuasive
    "brannoc": ("male", "middle-aged", "very low pitch", "lowlands", 0.93, "chest", 3), # huge, gentle, mines
    "varro": ("female", "middle-aged", "low pitch", "lowlands", 1.0, "crisp", 3),       # 40s lieutenant, brisk
    "ferris": ("male", "young adult", "moderate pitch", "lowlands", 1.06, "", 3),       # 27, sly ex-driver, chatty
    "hallet": ("male", "middle-aged", "very low pitch", "lowlands", 1.0, "crisp", 2),   # 41, hard captain
    "hessa": ("female", "middle-aged", "moderate pitch", "lowlands", 0.95, "", 2),      # late 30s mill worker
    "oren": ("male", "middle-aged", "low pitch", "lowlands", 0.88, "chest", 2),         # ~50, grieving mason
    "reeve": ("female", "middle-aged", "low pitch", "lowlands", 0.97, "crisp", 2),      # 50s, firm town reeve
    "ketti": ("female", "young adult", "high pitch", "lowlands", 1.06, "", 3),            # 12, fierce
    "soldier": ("male", "young adult", "moderate pitch", "lowlands", 1.04, "", 2),      # early 20s, easy grin
    "nurse": ("female", "middle-aged", "moderate pitch", "lowlands", 1.0, "", 1),
    "woman": ("female", "middle-aged", "moderate pitch", "lowlands", 1.0, "", 1),
    "innkeeper": ("male", "middle-aged", "moderate pitch", "lowlands", 0.96, "", 1),
    "runner": ("male", "young adult", "high pitch", "lowlands", 1.08, "", 1),
    "rider": ("male", "young adult", "high pitch", "lowlands", 1.08, "", 1),
    "carter": ("male", "middle-aged", "moderate pitch", "lowlands", 1.02, "", 1),
    "dorrit": ("female", "middle-aged", "high pitch", "lowlands", 1.06, "", 1),
    "wren": ("female", "young adult", "very high pitch", "lowlands", 1.02, "", 3),             # 10, walked out of Mire
    "tam": ("female", "young adult", "very high pitch", "lowlands", 1.06, "", 3),   # a boy, voiced by a young woman, as cartoons do                    # Mire runaway boy
    # the Guild, its Wardens and Vantry
    "halloran": ("male", "middle-aged", "very low pitch", "lowlands", 0.9, "crisp", 3), # late 50s, iron, unhurried
    "lisle": ("female", "middle-aged", "moderate pitch", "lowlands", 0.94, "", 2),      # composed physician
    "warden": ("male", "middle-aged", "low pitch", "lowlands", 1.0, "crisp", 1),
    "warden2": ("male", "young adult", "low pitch", "lowlands", 1.02, "", 2),           # hard-faced, sneering
    "cartwarden": ("male", "middle-aged", "low pitch", "lowlands", 0.94, "", 2),        # cold
    "oakes": ("male", "young adult", "low pitch", "lowlands", 0.94, "", 2),             # 35, plain, ashamed
    "lyle": ("male", "young adult", "high pitch", "lowlands", 1.08, "", 1),             # 24, nervous
    "factor": ("male", "middle-aged", "high pitch", "lowlands", 1.02, "crisp", 1),      # pinched clerk
    "smuggler": ("male", "middle-aged", "very low pitch", "lowlands", 0.96, "", 1),
    # Hollin and the Free Towns, the College, the fens
    "haldane": ("male", "elderly", "moderate pitch", "hollin", 0.92, "aged", 4),         # 67, brisk old professor
    "speaker": ("female", "elderly", "moderate pitch", "hollin", 0.88, "aged", 3),          # keeper of the speaking stone
    "provost": ("male", "elderly", "low pitch", "hollin", 0.88, "aged", 3),             # pompous
    "perrine": ("female", "young adult", "low pitch", "hollin", 0.95, "", 3),           # 34, sorrowful debater
    "weaver": ("female", "middle-aged", "low pitch", "hollin", 0.95, "", 1),
    "ansel": ("male", "elderly", "very low pitch", "hollin", 0.86, "old", 3),           # fen elder
    "gil": ("male", "young adult", "high pitch", "hollin", 1.1, "", 3),                # 17, cheeky poacher
    # the Crown and Lorne
    "aldous": ("male", "young adult", "moderate pitch", "crown", 0.95, "", 3),          # 19, tired young king
    "esme": ("female", "young adult", "high pitch", "crown", 1.0, "", 1),               # 24, court musician
    "aurel": ("male", "middle-aged", "low pitch", "lorne", 0.92, "crisp", 2),           # austere magistrate
    "king": ("male", "elderly", "very low pitch", "lorne", 0.84, "old", 3),
    # the far nations
    "gully": ("male", "middle-aged", "moderate pitch", "ashby", 1.06, "", 3),           # sly harbourmaster
    "gerd": ("male", "middle-aged", "very low pitch", "drevka", 0.88, "chest", 2),      # massive clan champion
    "arvo": ("male", "young adult", "high pitch", "drevka", 1.0, "", 3),               # 16, sullen
    "ilse": ("female", "young adult", "moderate pitch", "league", 1.04, "crisp", 3),    # 35, precise treasurer
    "councillor": ("male", "elderly", "low pitch", "league", 0.88, "aged", 3),
    "vela": ("female", "middle-aged", "low pitch", "tarsis", 0.96, "", 2),              # 42, tough mercenary
    "kesh": ("male", "young adult", "low pitch", "tarsis", 0.98, "", 1),                # 30, wry, worn
    "khalis": ("male", "middle-aged", "moderate pitch", "ember", 0.94, "", 2),          # smooth courtier
    "rashid": ("male", "young adult", "low pitch", "ember", 1.04, "", 2),               # 29, intense
    "nadra": ("female", "young adult", "high pitch", "ember", 1.02, "", 2),             # 23, falconer
}
SAME = {"child": "wren"}   # the girl at Thornwick's gate is Wren, before she gives her name
# (before levelling, after levelling): the tremble goes last, because lame chokes on vibrato's first samples
# age is heard as an unsteady pitch (vibrato), an unsteady breath (tremolo) and a duller, thinner top (lowpass)
# measured on a pure tone: vibrato d=0.1 swings about 30 cents, d=0.3 about 90. Two rates at once make the waver
# uneven, as an old voice's is, instead of a singer's even vibrato.
AGE = {"aged": ",vibrato=f=5.3:d=0.14,vibrato=f=8.1:d=0.06,tremolo=f=4.7:d=0.15,lowpass=f=7000",
       "old": ",vibrato=f=5.6:d=0.24,vibrato=f=8.7:d=0.1,tremolo=f=5.1:d=0.25,lowpass=f=6000",
       "frail": ",vibrato=f=6.1:d=0.32,vibrato=f=9.3:d=0.14,tremolo=f=5.7:d=0.35,lowpass=f=5200"}
COLOUR = {
    "": ("", ""), "aged": ("", AGE["aged"]), "old": ("", AGE["old"]), "frail": ("", AGE["frail"]),
    "thin": ("highpass=f=160,", AGE["old"]),
    "chest": ("bass=g=3:f=140:w=0.8,", ""), "crisp": ("treble=g=2.5:f=3500,", ""),
}
def chain(who, lift):
    pre, post = COLOUR[CASTING[who][5]]
    return lift_filter(who, lift) + pre + "afade=t=in:d=0.02,highpass=f=70,loudnorm=I=-18:TP=-2" + post
# what each pitch word means in hertz (median voiced pitch), by gender and age: the take nearest this is kept
BASE = {("male", "child"): 235, ("male", "teenager"): 165, ("male", "young adult"): 120, ("male", "middle-aged"): 112,
        ("male", "elderly"): 118, ("female", "child"): 265, ("female", "teenager"): 225, ("female", "young adult"): 205,
        ("female", "middle-aged"): 190, ("female", "elderly"): 185}
STEP = {"very low pitch": -4, "low pitch": -2, "moderate pitch": 0, "high pitch": 2, "very high pitch": 4}

# the model can't make a real child's voice from a description (its "child" comes out an adult's pitch), so young
# voices are lifted afterwards with rubberband: children with their formants (a smaller throat), teenagers without
LIFT_CAP = {}   # 2026-11-26 Mathew: lifted children were unusable; young parts are now cast as young women and young men
def lift_for(who, hz):
    cap = LIFT_CAP.get(CASTING[who][1], 0.0)
    return round(min(cap, max(0.0, 12 * np.log2(target_hz(who) / max(hz, 1)))), 1) if cap else 0.0
def lift_filter(who, semi):
    if not semi: return ""
    return f"rubberband=pitch={2 ** (semi / 12):.4f}:formant={'shifted' if CASTING[who][1] == 'child' else 'preserved'},"

def voice_of(who): return SAME.get(who, who)
def instruct(who):
    g, a, p, land, *_ = CASTING[who]
    return f"{g}, {a}, {p}, {ACCENT[land]}"
def target_hz(who):
    g, a, p, *_ = CASTING[who]
    return BASE[(g, a)] * 2 ** (STEP[p] / 12)

def clean(t): return re.sub(r"\s+", " ", re.sub("[“”\"]", "", t)).strip()
def fnv(s):
    h = 0x811c9dc5; b = s.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8); h = (h * 0x01000193) & 0xffffffff
    return format(h, "08x")
def seed_of(s): return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)

def envelope(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = len(x) // 400; r = np.sqrt((x[: n * 400].reshape(n, 400) ** 2).mean(1))
    lv = np.clip(r / (np.percentile(r, 90) + 1e-6), 0, 1)
    return "".join(str(int(round(v * 9))) for v in lv)

def trim(a):
    nz = np.nonzero(np.abs(a) > 0.01)[0]
    return a[max(0, nz[0] - 480): nz[-1] + 2400] if len(nz) else a

def features(a, sr=24000):
    """Median voiced pitch (Hz) and a timbre fingerprint (mean MFCCs of voiced frames)."""
    import librosa
    from scipy.signal import butter, sosfilt
    y = librosa.resample(a.astype(np.float32), orig_sr=sr, target_sr=16000)
    y = sosfilt(butter(6, 85, "highpass", fs=16000, output="sos"), y).astype(np.float32)   # the model leaves a low rumble
    f0, vflag, _ = librosa.pyin(y, fmin=60, fmax=520, sr=16000, frame_length=1024)
    hz = float(np.nanmedian(f0)) if np.any(vflag) else 0.0
    m = librosa.feature.mfcc(y=y, sr=16000, n_mfcc=13)
    return hz, m[1:].mean(1)


def hp(a, sr=24000):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(4, 60, "highpass", fs=sr, output="sos"), a).astype(np.float32)

def semis(a, b): return 12 * abs(np.log2(max(a, 1) / max(b, 1)))

def pick_line(who, lines):
    """The design reads one of the character's own lines: the fullest one of a natural length."""
    mine = [clean(l["text"]) for l in lines if voice_of(l["who"]) == who]
    good = [t for t in mine if 50 <= len(t) <= 150]
    if good: return max(good, key=lambda t: (len(set(re.findall(r"[.,?!]", t))), len(t)))
    text = " ".join(sorted(mine, key=len, reverse=True))[:150]   # few or short lines: all of them, then a plain one
    return text if len(text) >= 50 else (text + " The road was quiet this morning, and I waited by the gate until you came.").strip()

if __name__ == "__main__":
    from omnivoice import OmniVoice
    lines = json.load(open(os.path.join(HERE, "lines.json")))
    for ln in lines:
        if voice_of(ln["who"]) not in CASTING: sys.exit(f"no voice cast for '{ln['who']}' (line: {ln['text'][:40]})")
    only = set(filter(None, os.environ.get("ONLY", "").split(",")))
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)
    os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(REFS, ".done"), exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    cast_path = os.path.join(HERE, "cast.json")
    cast = json.load(open(cast_path)) if os.path.exists(cast_path) else {}
    revoice = set(filter(None, os.environ.get("REVOICE", "").split(",")))
    count = {}
    for l in lines: count[voice_of(l["who"])] = count.get(voice_of(l["who"]), 0) + 1
    # cast the biggest parts first, so smaller parts are steered away from them
    order = sorted({voice_of(l["who"]) for l in lines}, key=lambda w: -count[w])
    if only: order = [w for w in order if w in only]
    prompts = {}

    def design(who):
        ref, txt = os.path.join(REFS, who + ".wav"), os.path.join(REFS, who + ".txt")
        if who not in revoice and os.path.exists(ref) and os.path.exists(txt) and who in cast: return
        text, want = pick_line(who, lines), target_hz(who)
        g = CASTING[who][0]
        others = [(c.get("heard_hz", c["hz"]), np.array(c["mfcc"])) for w, c in cast.items() if w != who and w in CASTING and CASTING[w][0] == g]
        best = None
        for take in range(CASTING[who][6] + 3):
            torch.manual_seed(seed_of(f"{who}#design#{take}"))
            a = trim(hp(model.generate(text=text, instruct=instruct(who), num_step=STEPS, speed=CASTING[who][4])[0]))
            hz, mf = features(a)
            hz_heard = hz * 2 ** (lift_for(who, hz) / 12)
            near = min([semis(hz_heard, h) + np.linalg.norm(mf - m) / 25 for h, m in others] or [9])
            score = semis(hz_heard, want) - min(near, 3) * 0.6    # fit the character, then stand apart from the rest
            print(f"  design {who} take {take}: {hz:.0f} Hz (want {want:.0f}), nearest other {near:.2f}, score {score:.2f}", flush=True)
            if best is None or score < best[0]: best = (score, a, hz, mf)
            if take + 1 >= CASTING[who][6] and best[0] < 3: break
            if take >= CASTING[who][6] + 2: break   # nowhere near after two extra takes: keep the best of them
        sf.write(ref, best[1], 24000); open(txt, "w").write(text)
        cast[who] = {"hz": round(best[2], 1), "mfcc": [round(float(v), 2) for v in best[3]], "instruct": instruct(who),
                     "speed": CASTING[who][4], "colour": CASTING[who][5], "line": text,
                     "lift": lift_for(who, best[2]), "heard_hz": round(best[2] * 2 ** (lift_for(who, best[2]) / 12), 1)}
        json.dump(cast, open(cast_path, "w"), indent=1, sort_keys=True)
        print("cast", who, f"{best[2]:.0f} Hz", flush=True)

    def short_text(text):
        """A few seconds of the design line: cloning time grows with the length of the reference."""
        parts, out = re.split(r"(?<=[.!?])\s+", text), ""
        for p in parts:
            if out and len(out) + len(p) > 90: break
            out = (out + " " + p).strip()
            if len(out) >= 45: break
        return out if len(out) >= 25 else "I waited by the gate until you came."

    def prompt(who):
        if who in prompts: return prompts[who]
        sw, st = os.path.join(REFS, who + ".short.wav"), os.path.join(REFS, who + ".short.txt")
        if who in revoice or not os.path.exists(sw):
            full = model.create_voice_clone_prompt(ref_audio=os.path.join(REFS, who + ".wav"), ref_text=open(os.path.join(REFS, who + ".txt")).read())
            text = short_text(open(os.path.join(REFS, who + ".txt")).read())
            torch.manual_seed(seed_of(who + "#short"))
            a = trim(hp(model.generate(text=text, voice_clone_prompt=full, speed=CASTING[who][4], num_step=max(STEPS, 24))[0]))
            sf.write(sw, a, 24000); open(st, "w").write(text); print("short reference", who, f"{len(a) / 24000:.1f}s", flush=True)
        prompts[who] = model.create_voice_clone_prompt(ref_audio=sw, ref_text=open(st).read())
        return prompts[who]

    def record(who, text, seed):
        torch.manual_seed(seed)
        return trim(hp(model.generate(text=text.replace("…", "..."), voice_clone_prompt=prompt(who), speed=CASTING[who][4], num_step=STEPS)[0]))

    def save(who, a, out):
        sf.write("/tmp/lull-vo.wav", a, 24000)
        fx = chain(who, cast[who]["lift"])
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/lull-vo.wav", "-af", fx, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", out], check=True)

    for w in order: design(w)
    if os.environ.get("DESIGN_ONLY"): sys.exit(0)
    redo_who = set(filter(None, os.environ.get("REDO", "").split(",")))
    keep, n = {}, 0
    for who in order:
        mine = [l for l in lines if voice_of(l["who"]) == who]
        got = {}   # hash -> (audio, out path, text)
        for ln in mine:
            n += 1
            text = clean(ln["text"]); h = fnv(f"{ln['who']}|{text}"); out = os.path.join(OUT, h + ".mp3"); mark = os.path.join(REFS, ".done", h)
            redo = (os.environ.get("FRESH") and not os.path.exists(mark)) or who in redo_who or who in revoice
            if redo and os.path.exists(out): os.remove(out)
            if not os.path.exists(out):
                a = record(who, text, seed_of(h)); got[h] = (a, out, text)
                save(who, a, out); open(mark, "w").close(); index.pop(h, None)
                print(f"[{n}/{len(lines)}] {who}: {text[:50]}", flush=True)
            keep[h] = None
        # keep each character's lines together: a line whose pitch or timbre wanders off is recorded again
        if len(got) >= 3:
            ref_hz, ref_mf = cast[who]["hz"], np.array(cast[who]["mfcc"])
            def dist(a):
                hz, mf = features(a)
                return semis(hz, ref_hz) / 2 + np.linalg.norm(mf - ref_mf) / 20
            ds = {h: dist(a) for h, (a, _, _) in got.items()}
            cut = max(1.2, float(np.median(list(ds.values())) * 1.8))
            for h, d in ds.items():
                if d <= cut: continue
                a, out, text = got[h]; best = (d, a)
                for r in range(RETRIES):
                    b = record(who, text, seed_of(f"{h}#{r + 1}")); db = dist(b)
                    if db < best[0]: best = (db, b)
                    if db <= cut: break
                print(f"  steadied {who}: {text[:40]} ({d:.2f} -> {best[0]:.2f})", flush=True)
                save(who, best[1], out); index.pop(h, None)
    for h in keep: keep[h] = index.get(h) or envelope(os.path.join(OUT, h + ".mp3"))
    if not only:
        for f in os.listdir(OUT):
            if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(OUT, f)); print("removed", f)
        json.dump(keep, open(idx_path, "w"), indent=0, sort_keys=True)
    else:
        index.update(keep); json.dump(index, open(idx_path, "w"), indent=0, sort_keys=True)
    print(len(keep), "lines,", sum(os.path.getsize(os.path.join(OUT, h + ".mp3")) for h in keep) // 1024, "KB")
