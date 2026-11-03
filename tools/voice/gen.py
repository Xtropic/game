"""Records every line in lines.json with Kokoro-82M (kokoro-onnx) into public/vo/<hash>.mp3, and writes
public/vo/index.json mapping each hash to its loudness envelope (20 samples/s, digits 0-9) for lip sync.

  node tools/voice/extract.mjs
  KOKORO_DIR=/path/to/model python3 tools/voice/gen.py

KOKORO_DIR holds kokoro-v1.0.onnx and voices-v1.0.bin (from the kokoro-onnx GitHub releases).
Each character has one fixed voice, speed and (for children) a small formant-preserving pitch lift.
Set FRESH=1 to record every line again.
Unchanged lines keep their file; recordings no longer used are deleted."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "vo")
MODEL = os.environ.get("KOKORO_DIR", ".")
k = Kokoro(os.path.join(MODEL, "kokoro-v1.0.onnx"), os.path.join(MODEL, "voices-v1.0.bin"))
V = lambda *mix: sum(w * k.get_voice_style(n) for n, w in mix)
# who: (voice blend, speed, pitch shift in semitones). Only Kokoro's better-graded voices, each read in its own accent;
# no blends of weak voices and no plain resampling (both made lines sound robotic). Children get a small pitch lift
# with rubberband, which keeps the formants so they don't sound sped up.
CAST = {
    "narrator": (V(("af_heart", 1)), 0.9, 0),
    "rhea": (V(("bf_emma", 1)), 0.94, 0),
    "corran": (V(("am_michael", 1)), 0.9, 0),
    "finch": (V(("am_puck", 1)), 0.98, 2),
    "tamsin": (V(("af_kore", 1)), 0.96, 0),
    "maren": (V(("af_sarah", 1)), 0.86, 0),
    "rook": (V(("bm_george", 1)), 0.84, 0),
    "oda": (V(("bf_isabella", 1)), 0.86, 0),
    "runner": (V(("am_puck", 1)), 1.0, 0),
    "pell": (V(("af_bella", 1)), 0.96, 2),
    "sela": (V(("af_aoede", 1)), 0.94, 2),
    "halloran": (V(("am_fenrir", 1)), 0.88, 0),
    "lisle": (V(("af_bella", 1)), 0.94, 0),
    "warden": (V(("bm_george", 1)), 0.95, 0),
    "hessa": (V(("bf_alice", 1)), 0.9, 0),
    "davin": (V(("am_puck", 1)), 1.0, 0),
    # Act I
    "kane": (V(("am_michael", .5), ("am_fenrir", .5)), 0.96, 0),
    # a big, soft-spoken man: a warm low voice at its natural pace (slowing Kokoro down makes it sound strange)
    "brannoc": (V(("am_fenrir", 1)), 0.97, 0),
    "innkeeper": (V(("bm_fable", 1)), 0.94, 0),
    "ferris": (V(("am_puck", 1)), 0.97, 0),
    "cartwarden": (V(("am_fenrir", 1)), 0.94, 0),
    "reeve": (V(("af_sarah", 1)), 0.94, 0),
    "oren": (V(("bm_fable", 1)), 0.86, 0),
    "woman": (V(("af_nicole", 1)), 0.96, 0),
    "ketti": (V(("af_kore", 1)), 0.96, 1.5),
    "nurse": (V(("af_aoede", 1)), 0.96, 0),
    "soldier": (V(("am_michael", 1)), 1.0, 0),
    "varro": (V(("af_nicole", 1)), 0.97, 0),
}
# the accent each voice was trained on (a = American, b = British)
def lang_for(who):
    v = {"rhea": "b", "rook": "b", "oda": "b", "warden": "b", "innkeeper": "b", "oren": "b", "hessa": "b"}.get(who, "a")
    return "en-gb" if v == "b" else "en-us"
# a breath between sentences, so long lines aren't rushed
PAUSE = {".": 0.38, "?": 0.42, "!": 0.36, "—": 0.22, "…": 0.45, ";": 0.25, ":": 0.25}

def speak(text, style, speed, lang):
    """Each sentence is read on its own and joined with a short pause; Kokoro hurries through long run-ons."""
    parts = [p for p in re.split(r"(?<=[.!?…])\s+|\s+—\s+|—", text) if p.strip()]
    out, sr = [], 24000
    for i, p in enumerate(parts):
        a, sr = k.create(p.replace("…", "..."), voice=style, speed=speed, lang=lang)
        nz = np.nonzero(np.abs(a) > 0.01)[0]
        if len(nz): a = a[max(0, nz[0] - 480): nz[-1] + 1200]   # trim the model's own silence, keep a little tail
        out.append(a)
        if i < len(parts) - 1:
            end = p.rstrip()[-1:] if p.rstrip() else "."
            out.append(np.zeros(int(sr * PAUSE.get(end, 0.22)), dtype=a.dtype))
    return np.concatenate(out), sr

def clean(t): return re.sub(r"\s+", " ", re.sub("[“”\"]", "", t)).strip()
def fnv(s):
    h = 0x811c9dc5; b = s.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8); h = (h * 0x01000193) & 0xffffffff
    return format(h, "08x")

def envelope(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = len(x) // 400; r = np.sqrt((x[: n * 400].reshape(n, 400) ** 2).mean(1))
    lv = np.clip(r / (np.percentile(r, 90) + 1e-6), 0, 1)
    return "".join(str(int(round(v * 9))) for v in lv)

lines = json.load(open(os.path.join(HERE, "lines.json")))
os.makedirs(OUT, exist_ok=True)
idx_path = os.path.join(OUT, "index.json")
index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
keep, done = {}, set()
for ln in lines:
    who, text = ln["who"], clean(ln["text"])
    if who not in CAST: sys.exit(f"no voice cast for '{who}' (line: {text[:40]})")
    h = fnv(f"{who}|{text}"); out = os.path.join(OUT, h + ".mp3")
    redo = os.environ.get("FRESH") or who in os.environ.get("REDO", "").split(",")   # REDO=brannoc,davin re-records just those speakers
    if redo and h not in done: os.path.exists(out) and os.remove(out)
    if not os.path.exists(out):
        style, speed, st = CAST[who]
        a, sr = speak(text, style, speed, lang_for(who))
        sf.write("/tmp/lull-vo.wav", a, sr)
        af = (f"rubberband=pitch={2 ** (st / 12):.4f}:formant=preserved," if st else "") + "afade=t=in:d=0.02,highpass=f=70,loudnorm=I=-18:TP=-2"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/lull-vo.wav", "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", out], check=True)
        print("recorded", who, text[:50])
    if redo and h not in done: index.pop(h, None)
    done.add(h)
    keep[h] = index.get(h) or envelope(out)
for f in os.listdir(OUT):
    if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(OUT, f)); print("removed", f)
json.dump(keep, open(idx_path, "w"), indent=0, sort_keys=True)
print(len(keep), "lines,", sum(os.path.getsize(os.path.join(OUT, h + ".mp3")) for h in keep) // 1024, "KB")
