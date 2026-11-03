// The game's authored content: every map, and the story that plays across them.
import type { MapFile } from "./map";
import { mergeStories, type Story } from "../story/story";
import prologue from "../../data/story/prologue.json";
import act1 from "../../data/story/act1.json";
import towns from "../../data/story/towns.json";
import wild from "../../data/story/wild.json";

const files = import.meta.glob<MapFile>("../../data/maps/*.json", { eager: true, import: "default" });
export const MAPS: Record<string, MapFile> = Object.fromEntries(Object.values(files).map((m) => [m.id, m]));
/** The whole story so far, prologue first. */
export const STORY = mergeStories([prologue as unknown as Story, act1 as unknown as Story, towns as unknown as Story, wild as unknown as Story]);

import regionData from "../../data/kith/regions.json";
export interface RegionInfo { name: string; kind: "nation" | "hidden" | "wild"; biome: string; }
/** The 25 regions of Ostrel: their names, what kind of land they are, and what it looks like. */
export const REGIONS = (regionData as unknown as { regions: Record<string, RegionInfo> }).regions;
