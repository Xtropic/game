// Battle data from JSON, typed once here: the skill book, and every written fight in data/battle.
import type { BattleDef, SkillBook } from "./rules";
import skills from "../../data/battle/skills.json";

export const SKILLS = skills as unknown as SkillBook;
const files = import.meta.glob<BattleDef>(["../../data/battle/*.json", "!../../data/battle/skills.json"], { eager: true, import: "default" });
export const BATTLES: Record<string, BattleDef> = Object.fromEntries(Object.values(files).map((b) => [b.id, b]));
