import { Game } from "./core/game";
import { ExploreScene } from "./world/exploreScene";
import { BattleScene } from "./battle/battleScene";
import { drawPortrait, loadPortraits } from "./art/portraits";
import { looksSheet } from "./art/gallery";
import larkfold from "../data/maps/larkfold-square.json";
import type { MapFile } from "./world/map";

const MAPS: Record<string, MapFile> = { [larkfold.id]: larkfold as MapFile };

async function boot(): Promise<void> {
  const game = new Game();
  await game.init(document.getElementById("game")!);
  await Promise.all([game.voices.load(), loadPortraits()]);
  const saved = game.saves.read("auto");
  const file = (saved && MAPS[saved.place.map]) || MAPS["larkfold-square"];
  const scene = new ExploreScene(file, saved && MAPS[saved.place.map] ? saved.place : undefined);
  if (saved) { game.playSeconds = saved.playSeconds; game.flags = { ...saved.flags }; game.party = { ...saved.party }; game.gear = { ...saved.gear }; game.coin = saved.coin; game.kith = { ...game.kith, ...saved.kith }; }
  game.scenes.replace(scene);
  // Test and debugging hook; read-only views plus the input object so automated tests can play.
  (window as unknown as { __lull: unknown }).__lull = { game, input: game.input, explore: () => scene.debug(), saves: () => game.saves.list(),
    battle: () => { const top = game.scenes.top; return top instanceof BattleScene ? top : null; },
    startBattle: (id: string) => scene.startBattle(id),
    looks: () => looksSheet(),
    portrait: (id: string, size = 256, talk = 0) => { const c = document.createElement("canvas"); c.width = c.height = size; drawPortrait(c.getContext("2d")!, id, size, 0.5, talk, game.buildFor(id)); return c.toDataURL(); } };
}

boot();
