"""Records every line in lines.json with Kokoro-82M (kokoro-onnx) into public/vo/<hash>.mp3, and writes
public/vo/index.json mapping each hash to its loudness envelope (20 samples/s, digits 0-9) for lip sync.

  node tools/voice/extract.mjs
  KOKORO_DIR=/path/to/model python3 tools/voice/gen.py

KOKORO_DIR holds kokoro-v1.0.onnx and voices-v1.0.bin (from the kokoro-onnx GitHub releases).
Each character has one fixed voice blend, speed and pitch shift, so they always sound the same.
Unchanged lines keep their file; recordings no longer used are deleted."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "vo")
MODEL = os.environ.get("KOKORO_DIR", ".")
k = Kokoro(os.path.join(MODEL, "kokoro-v1.0.onnx"), os.path.join(MODEL, "voices-v1.0.bin"))
V = lambda *mix: sum(w * k.get_voice_style(n) for n, w in mix)
# who: (voice blend, speed, pitch shift in semitones). Same casting as the prototype.
CAST = {
    "narrator": (V(("bm_fable", 1)), 0.95, 0),
    "rhea": (V(("bf_emma", 1)), 1.0, 0),
    "corran": (V(("bm_daniel", .7), ("bm_lewis", .3)), 0.92, -0.5),
    "finch": (V(("am_puck", 1)), 1.05, 3.5),
    "tamsin": (V(("bf_isabella", 1)), 1.05, 0),
    "maren": (V(("bf_alice", 1)), 0.88, -2.5),
    "rook": (V(("bm_george", 1)), 0.85, -3),
    "oda": (V(("bf_lily", .7), ("af_kore", .3)), 0.9, -2),
    "runner": (V(("am_echo", 1)), 1.12, 0),
    "pell": (V(("am_echo", .6), ("am_puck", .4)), 1.08, 5),
    "sela": (V(("bf_lily", 1)), 1.0, 3),
    "halloran": (V(("am_onyx", .5), ("bm_george", .5)), 0.9, -1.5),
    "lisle": (V(("bf_alice", .5), ("af_heart", .5)), 0.98, 0),
    "warden": (V(("am_fenrir", 1)), 1.0, -1),
}

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
keep = {}
for ln in lines:
    who, text = ln["who"], clean(ln["text"])
    if who not in CAST: sys.exit(f"no voice cast for '{who}' (line: {text[:40]})")
    h = fnv(f"{who}|{text}"); out = os.path.join(OUT, h + ".mp3")
    if not os.path.exists(out):
        style, speed, st = CAST[who]
        s, sr = k.create(text.replace("—", ", ").replace("…", "..."), voice=style, speed=speed, lang="en-gb")
        sf.write("/tmp/lull-vo.wav", s, sr)
        f = 2 ** (st / 12)
        af = (f"asetrate={int(sr * f)},aresample={sr},atempo={1 / f:.4f}," if st else "") + "afade=t=in:d=0.02,highpass=f=70,loudnorm=I=-18:TP=-2"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/lull-vo.wav", "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", out], check=True)
        print("recorded", who, text[:50])
    keep[h] = index.get(h) or envelope(out)
for f in os.listdir(OUT):
    if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(OUT, f)); print("removed", f)
json.dump(keep, open(idx_path, "w"), indent=0, sort_keys=True)
print(len(keep), "lines,", sum(os.path.getsize(os.path.join(OUT, h + ".mp3")) for h in keep) // 1024, "KB")
