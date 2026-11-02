import { Game } from "./core/game";
import { ExploreScene } from "./world/exploreScene";
import larkfold from "../data/maps/larkfold-square.json";
import type { MapFile } from "./world/map";

const MAPS: Record<string, MapFile> = { [larkfold.id]: larkfold as MapFile };

async function boot(): Promise<void> {
  const game = new Game();
  await game.init(document.getElementById("game")!);
  const saved = game.saves.read("auto");
  const file = (saved && MAPS[saved.place.map]) || MAPS["larkfold-square"];
  const scene = new ExploreScene(file, saved && MAPS[saved.place.map] ? saved.place : undefined);
  if (saved) game.playSeconds = saved.playSeconds;
  game.scenes.replace(scene);
  // Test and debugging hook; read-only views plus the input object so automated tests can play.
  (window as unknown as { __lull: unknown }).__lull = { game, input: game.input, explore: () => scene.debug(), saves: () => game.saves.list() };
}

boot();
