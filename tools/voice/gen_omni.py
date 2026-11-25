"""Records every line in lines.json with OmniVoice (k2-fsa/OmniVoice, the engine VoiceStudio runs by default) into
public/vo/<hash>.mp3, and writes public/vo/index.json (loudness envelopes for lip sync), like gen.py did with Kokoro.

  node tools/voice/extract.mjs
  python3 tools/voice/gen_omni.py            # needs: pip install omnivoice (torch CPU is fine); model from Hugging Face

Each character's voice is DESIGNED once from a short description (gender, age, pitch, accent) reading a fixed sample
line, saved as tools/voice/refs/<who>.wav, and every line that character speaks is then CLONED from that sample, so a
character sounds the same in every line. Delete a ref (or set REVOICE=who,who) to design that voice again.
Set FRESH=1 to record every line again; REDO=who,who re-records just those speakers. Unchanged lines keep their file.
Model weights are CC-BY-NC (non-commercial): replace before any paid release."""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf, torch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("VO_OUT") or os.path.join(HERE, "..", "..", "public", "vo")
REFS = os.path.join(HERE, "refs")
STEPS = int(os.environ.get("STEPS", "32"))
torch.set_num_threads(os.cpu_count() or 4)

# who: (voice description, speed). Descriptions use OmniVoice's voice-design attributes.
CAST = {
    "narrator": ("female, middle-aged, low pitch, british accent", 0.95),
    "rhea": ("female, young adult, moderate pitch, british accent", 0.97),
    "corran": ("male, young adult, moderate pitch, american accent", 0.95),
    "finch": ("male, teenager, high pitch, american accent", 1.0),
    "tamsin": ("female, young adult, moderate pitch, american accent", 1.0),
    "maren": ("female, elderly, low pitch, american accent", 0.9),
    "rook": ("male, elderly, low pitch, british accent", 0.88),
    "oda": ("female, middle-aged, low pitch, british accent", 0.92),
    "runner": ("male, teenager, high pitch, american accent", 1.05),
    "pell": ("female, child, high pitch, american accent", 1.0),
    "sela": ("female, teenager, high pitch, american accent", 1.0),
    "halloran": ("male, middle-aged, very low pitch, american accent", 0.92),
    "lisle": ("female, young adult, moderate pitch, american accent", 0.98),
    "warden": ("male, middle-aged, low pitch, british accent", 0.98),
    "hessa": ("female, young adult, high pitch, british accent", 0.97),
    "davin": ("male, young adult, moderate pitch, american accent", 1.02),
    "kane": ("male, middle-aged, low pitch, american accent", 0.96),
    "brannoc": ("male, middle-aged, very low pitch, american accent", 0.92),
    "innkeeper": ("male, middle-aged, moderate pitch, british accent", 0.98),
    "ferris": ("male, young adult, moderate pitch, american accent", 1.0),
    "cartwarden": ("male, middle-aged, low pitch, american accent", 0.98),
    "reeve": ("female, middle-aged, moderate pitch, american accent", 0.97),
    "oren": ("male, elderly, moderate pitch, british accent", 0.9),
    "woman": ("female, middle-aged, moderate pitch, american accent", 1.0),
    "ketti": ("female, teenager, high pitch, american accent", 1.02),
    "nurse": ("female, young adult, moderate pitch, american accent", 1.0),
    "soldier": ("male, young adult, low pitch, american accent", 1.02),
    "varro": ("female, middle-aged, low pitch, american accent", 0.98),
    "oakes": ("male, middle-aged, low pitch, british accent", 0.95),
    "lyle": ("male, young adult, high pitch, american accent", 1.02),
    "ume": ("female, elderly, low pitch, british accent", 0.88),
    "tobin": ("male, young adult, low pitch, american accent", 0.95),
    "posy": ("female, teenager, high pitch, american accent", 1.0),
    "child": ("female, child, very high pitch, american accent", 1.0),
    "dorrit": ("female, middle-aged, moderate pitch, american accent", 1.02),
    "hesk": ("male, middle-aged, low pitch, british accent", 0.94),
    "factor": ("male, middle-aged, moderate pitch, british accent", 0.98),
    "carter": ("male, middle-aged, moderate pitch, american accent", 1.02),
    "smuggler": ("male, middle-aged, very low pitch, british accent", 0.97),
    "rider": ("male, young adult, moderate pitch, american accent", 1.05),
    "warden2": ("male, young adult, moderate pitch, british accent", 1.0),
    "wren": ("female, child, high pitch, american accent", 1.0),
    "hallet": ("male, middle-aged, very low pitch, american accent", 0.95),
    "haldane": ("male, elderly, low pitch, british accent", 0.9),
    "fennick": ("male, young adult, high pitch, american accent", 1.02),
    "tam": ("male, child, high pitch, american accent", 1.02),
    # the Long Road
    "speaker": ("female, elderly, moderate pitch, british accent", 0.9),
    "gil": ("male, teenager, moderate pitch, american accent", 1.05),
    "provost": ("male, elderly, moderate pitch, british accent", 0.95),
    "weaver": ("female, middle-aged, low pitch, american accent", 0.95),
    "perrine": ("female, middle-aged, moderate pitch, british accent", 0.97),
    "gerd": ("male, middle-aged, very low pitch, scottish accent", 0.9),
    "arvo": ("male, teenager, moderate pitch, scottish accent", 1.0),
    "aurel": ("male, elderly, low pitch, british accent", 0.92),
    "king": ("male, elderly, very low pitch, british accent", 0.88),
    "ilse": ("female, middle-aged, moderate pitch, british accent", 1.0),
    "councillor": ("male, elderly, low pitch, british accent", 0.92),
    "vela": ("female, middle-aged, low pitch, american accent", 0.95),
    "kesh": ("male, young adult, low pitch, american accent", 0.95),
    "khalis": ("male, middle-aged, low pitch, british accent", 0.9),
    "rashid": ("male, young adult, moderate pitch, american accent", 1.0),
    "nadra": ("female, young adult, high pitch, american accent", 1.0),
    "aldous": ("male, teenager, moderate pitch, british accent", 0.97),
    "esme": ("female, young adult, high pitch, british accent", 1.0),
}
SAMPLE = "The road was quiet this morning, and the river ran high after the rain. I waited by the gate until you came."

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

def trim(a):
    nz = np.nonzero(np.abs(a) > 0.01)[0]
    return a[max(0, nz[0] - 480): nz[-1] + 2400] if len(nz) else a

if __name__ == "__main__":
    from omnivoice import OmniVoice
    lines = json.load(open(os.path.join(HERE, "lines.json")))
    only = set(filter(None, os.environ.get("ONLY", "").split(",")))
    if only: lines = [l for l in lines if l["who"] in only]
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)
    os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(REFS, ".done"), exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    revoice = set(filter(None, os.environ.get("REVOICE", "").split(",")))
    prompts = {}
    def prompt_for(who):
        if who in prompts: return prompts[who]
        ref = os.path.join(REFS, who + ".wav")
        if who in revoice or not os.path.exists(ref):
            a = model.generate(text=SAMPLE, instruct=CAST[who][0], num_step=STEPS)[0]
            sf.write(ref, trim(a), 24000); print("designed voice", who, flush=True)
        prompts[who] = model.create_voice_clone_prompt(ref_audio=ref, ref_text=SAMPLE)
        return prompts[who]
    redo_who = set(filter(None, os.environ.get("REDO", "").split(",")))
    keep, done = {}, set()
    for n, ln in enumerate(lines):
        who, text = ln["who"], clean(ln["text"])
        if who not in CAST: sys.exit(f"no voice cast for '{who}' (line: {text[:40]})")
        h = fnv(f"{who}|{text}"); out = os.path.join(OUT, h + ".mp3"); mark = os.path.join(REFS, ".done", h)
        redo = (os.environ.get("FRESH") and not os.path.exists(mark)) or (who in redo_who and h not in done)
        if redo and os.path.exists(out): os.remove(out)
        if not os.path.exists(out):
            a = model.generate(text=text.replace("…", "..."), voice_clone_prompt=prompt_for(who), speed=CAST[who][1], num_step=STEPS)[0]
            sf.write("/tmp/lull-vo.wav", trim(a), 24000)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/lull-vo.wav", "-af", "afade=t=in:d=0.02,highpass=f=70,loudnorm=I=-18:TP=-2", "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", out], check=True)
            open(mark, "w").close()   # this line is in the new voice (lets an interrupted FRESH run carry on where it stopped)
            index.pop(h, None)
            print(f"[{n + 1}/{len(lines)}] recorded", who, text[:50], flush=True)
        done.add(h)
        keep[h] = index.get(h) or envelope(out)
    if not only:
        for f in os.listdir(OUT):
            if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(OUT, f)); print("removed", f)
        json.dump(keep, open(idx_path, "w"), indent=0, sort_keys=True)
    else:
        index.update(keep); json.dump(index, open(idx_path, "w"), indent=0, sort_keys=True)
    print(len(keep), "lines,", sum(os.path.getsize(os.path.join(OUT, h + ".mp3")) for h in keep) // 1024, "KB")
