"""Builds a listening page for the cast: each speaking character's portrait, who they are, the voice they were
given, and their reference take next to the voice they had before (refs-old). Run after gen_omni.py has cast them.

  python3 tools/voice/audition.py <out dir>      # writes index.html, a/<who>.mp3, o/<who>.mp3, p/<who>.jpg
"""
import glob, html, json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..")
sys.path.insert(0, HERE)
src = open(os.path.join(HERE, "gen_omni.py")).read().split("if __name__")[0]
G = {"__file__": os.path.join(HERE, "gen_omni.py")}; exec(src, G)
OUT = sys.argv[1]
for d in ("a", "o", "p"): os.makedirs(os.path.join(OUT, d), exist_ok=True)

cast = json.load(open(os.path.join(HERE, "cast.json")))
lines = json.load(open(os.path.join(HERE, "lines.json")))
names = {}
for f in glob.glob(os.path.join(ROOT, "data/story/*.json")):
    for k, v in json.load(open(f)).get("cast", {}).items():
        names.setdefault(k, v if isinstance(v, str) else v.get("name", k))
rj = json.load(open(os.path.join(ROOT, "data/cast/recruits.json")))
recs = {r["id"]: r for r in (rj["recruits"] if isinstance(rj, dict) else rj)}
looks = json.load(open(os.path.join(ROOT, "data/cast/portrait-looks.json")))
count = {}
for l in lines: count[G["voice_of"](l["who"])] = count.get(G["voice_of"](l["who"]), 0) + 1
LAND = {"highlands": "Larkfold and the Cloudline", "lowlands": "The lowlands: Millbridge, the Commons, the Guild",
        "hollin": "Hollin, the Free Towns and the fens", "crown": "The Crown", "lorne": "Lorne", "ashby": "Port Ashby",
        "drevka": "The Drevka clans", "league": "The Corvane League", "tarsis": "Tarsis", "ember": "The Ember Courts"}
COLOUR = {"aged": "a light old-age waver", "old": "an old-age waver", "frail": "a strong, frail waver", "thin": "a thin, papery top and an old-age waver", "chest": "extra chest", "crisp": "a crisp edge", "": ""}

def mp3(src, dst, fx="highpass=f=70,loudnorm=I=-18:TP=-2"):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-af", fx, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", dst], check=True)

groups = {}
for who, c in cast.items():
    if who not in G["CASTING"]: continue
    g, age, pitch, land, speed, colour, _ = G["CASTING"][who]
    mp3(os.path.join(HERE, "refs", who + ".wav"), os.path.join(OUT, "a", who + ".mp3"), G["chain"](who, c.get("lift", 0)))
    old = os.path.join(HERE, "refs-old", who + ".wav"); has_old = os.path.exists(old)
    if has_old: mp3(old, os.path.join(OUT, "o", who + ".mp3"))
    por = os.path.join(ROOT, "public/portraits", who + ".jpg")
    if os.path.exists(por): shutil.copy(por, os.path.join(OUT, "p", who + ".jpg"))
    r = recs.get(who, {})
    who_line = r.get("job") or (looks.get(who, "").split(",")[0] if looks.get(who) else "")
    if r.get("age"): who_line = f"{who_line}, {r['age']}"
    accent = G["ACCENT"][land].replace(" accent", "")
    voice = f"{g}, {age}, {pitch.replace(' pitch', '')} voice, {accent} accent" + (f", {COLOUR[colour]}" if colour else "") + (f", lifted {c['lift']:g} semitones" if c.get("lift") else "")
    pace = "slow" if speed < 0.92 else "unhurried" if speed < 0.97 else "quick" if speed > 1.04 else "even"
    groups.setdefault(land, []).append(dict(who=who, name=names.get(who, who.title()), what=who_line, voice=voice, pace=pace,
        line=c["line"], n=count.get(who, 0), portrait=os.path.exists(por), old=has_old,
        also=[k for k, v in G["SAME"].items() if v == who]))

def card(x):
    pic = f'<img src="p/{x["who"]}.jpg" alt="" loading="lazy">' if x["portrait"] else f'<div class="mono">{html.escape(x["name"][:1])}</div>'
    also = f' <span class="also">also speaks as {", ".join(x["also"])}</span>' if x["also"] else ""
    old = f'<button class="play old" data-src="o/{x["who"]}.mp3" aria-label="Play the old voice for {html.escape(x["name"])}">Before</button>' if x["old"] else ""
    return f'''<article class="card" id="{x["who"]}">
  <div class="pic">{pic}</div>
  <div class="body">
    <h3>{html.escape(x["name"])} <span class="n">{x["n"]} line{"s" if x["n"] != 1 else ""}</span></h3>
    <p class="what">{html.escape(x["what"])}{also}</p>
    <p class="voice">{html.escape(x["voice"])}; {x["pace"]} pace</p>
    <blockquote>{html.escape(x["line"])}</blockquote>
    <div class="btns"><button class="play new" data-src="a/{x["who"]}.mp3" aria-label="Play the new voice for {html.escape(x["name"])}">New voice</button>{old}</div>
  </div>
</article>'''

order = ["highlands", "lowlands", "hollin", "crown", "lorne", "ashby", "drevka", "league", "tarsis", "ember"]
sections = "".join(f'<section><h2>{LAND[l]} <span class="acc">{G["ACCENT"][l].replace(" accent", "")} accent</span></h2><div class="grid">'
                   + "".join(card(x) for x in sorted(groups[l], key=lambda x: -x["n"])) + "</div></section>" for l in order if l in groups)
page = open(os.path.join(HERE, "audition.html")).read().replace("<!--SECTIONS-->", sections).replace("<!--COUNT-->", str(sum(len(v) for v in groups.values())))
open(os.path.join(OUT, "index.html"), "w").write(page)
print("wrote", OUT, sum(len(v) for v in groups.values()), "voices")
