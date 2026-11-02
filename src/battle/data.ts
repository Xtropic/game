// Battle data from JSON, typed once here.
import type { BattleDef, SkillBook } from "./rules";
import skills from "../../data/battle/skills.json";
import trailWardens from "../../data/battle/trail-wardens.json";

export const SKILLS = skills as unknown as SkillBook;
export const BATTLES: Record<string, BattleDef> = { [trailWardens.id]: trailWardens as unknown as BattleDef };
