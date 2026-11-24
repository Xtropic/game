import { Game } from "./core/game";
import { ExploreScene } from "./world/exploreScene";
import { BattleScene } from "./battle/battleScene";
import { DuelScene } from "./battle/duelScene";
import { ArmyScene } from "./army/armyScene";
import { drawPortrait, loadPortraits } from "./art/portraits";
import { loadBattleArt } from "./battle/painted";
import { castSheet, looksSheet } from "./art/gallery";
import { MAPS, STORY } from "./world/content";
import { bakeWorld } from "./art/worldTiles";
import { WorldMap } from "./world/map";
import { fromOldWorld } from "./world/oldWorld";
import { TRACK_NAMES, attachSound, audio } from "./audio/music";
import { settings, type Settings } from "./core/settings";
import { TouchControls } from "./core/touch";

async function boot(): Promise<void> {
  const game = new Game();
  await game.init(document.getElementById("game")!);
  await Promise.all([game.voices.load(), loadPortraits(), loadBattleArt()]);
  const saved = game.saves.read("auto");
  if (saved?.place.map === "ostrel") { const at = fromOldWorld(saved.place.x, saved.place.y, MAPS); if (at) saved.place = at; }
  const scene = new ExploreScene(STORY, MAPS, saved && MAPS[saved.place.map] && saved.flags.stage ? saved.place : undefined);
  if (saved && saved.flags.stage) { game.playSeconds = saved.playSeconds; game.flags = { ...saved.flags }; game.party = { ...saved.party }; game.gear = { ...saved.gear }; game.coin = saved.coin; game.kith = { ...game.kith, ...saved.kith }; }
  game.scenes.replace(scene);
  // phones and tablets: tilt (or a stick) to walk, A/B/Sing/Run buttons
  if (TouchControls.wanted() || location.search.includes("touch")) { game.touch = new TouchControls(game.input, () => scene.canWalk()); game.touch.attach(); }
  // sound: starts on the first press; N switches music, effects and voices on and off together
  attachSound(window);
  game.voices.muted = !audio.on;
  // settings from the menu: levels, voices, always run
  const apply = (s: Settings) => { audio.setLevels(s.music, s.effects); game.voices.volume = s.voices; if (s.voices <= 0) game.voices.stop(); game.input.runToggle = s.alwaysRun; };
  apply(settings.value); settings.onChange(apply);
  audio.onChange((on) => { game.voices.muted = !on; if (!on) game.voices.stop(); scene.toast(on ? "Sound on (N)" : "Sound off (N)"); });
  setInterval(() => audio.track(game.scenes.top instanceof BattleScene || game.scenes.top instanceof DuelScene || game.scenes.top instanceof ArmyScene ? "battle" : scene.musicNow()), 300);
  // Test and debugging hook; read-only views plus the input object so automated tests can play.
  (window as unknown as { __lull: unknown }).__lull = { game, input: game.input, explore: () => scene.debug(), scene: () => scene, saves: () => game.saves.list(),
    battle: () => { const top = game.scenes.top; return top instanceof BattleScene ? top : null; },
    startBattle: (id: string) => scene.startBattle(id),
    duel: (id: string) => scene.duel(id, () => {}),
    armyState: () => { const top = game.scenes.top; return top instanceof ArmyScene ? { phase: top.phase, t: top.s.t, over: top.s.over, paused: top.paused, cos: top.s.cos.map((c) => `${c.id}:${c.state}:${Math.round(c.men)}:${c.x.toFixed(1)},${c.y.toFixed(1)}`) } : null; }, duelState: (foeGuard?: number) => { const top = game.scenes.top; if (top instanceof DuelScene && foeGuard != null) top.s.foe.guard = foeGuard; return top instanceof DuelScene ? { phase: top.phase, round: top.s.round, over: top.s.over, hero: top.s.hero.guard, foe: top.s.foe.guard } : null; },
    goto: (map: string, x: number, y: number) => scene.goto(map, x, y, undefined, () => {}),
    refresh: () => scene.refresh(),
    menu: () => scene.openMenu(), settings,
    sound: audio, tracks: TRACK_NAMES,
    looks: () => looksSheet(),
    cast: () => castSheet(),
    worldMap: (id = "land-cloudline") => bakeWorld(new WorldMap(MAPS[id])).toDataURL(),
    portrait: (id: string, size = 256, talk = 0) => { const c = document.createElement("canvas"); c.width = c.height = size; drawPortrait(c.getContext("2d")!, id, size, 0.5, talk, game.buildFor(id)); return c.toDataURL(); } };
}

boot();
