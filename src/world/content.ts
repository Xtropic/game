// The game's authored content: every map, and the story that plays across them.
import type { MapFile } from "./map";
import type { Story } from "../story/story";
import prologue from "../../data/story/prologue.json";

const files = import.meta.glob<MapFile>("../../data/maps/*.json", { eager: true, import: "default" });
export const MAPS: Record<string, MapFile> = Object.fromEntries(Object.values(files).map((m) => [m.id, m]));
export const STORY = prologue as unknown as Story;
