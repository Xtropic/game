// The recruitable cast (design doc: "The Lull: Recruitable Cast"). Each recruit comes from a storyline in the
// story bible or the side storylines; about half only join on one side of a hard choice. `role` decides where
// they serve: in the party, leading a unit in army battles, or in a job at Thornwick.
import data from "../../data/cast/recruits.json";

export type RecruitRole = "party" | "command" | "base";

export interface Recruit {
  id: string;
  name: string;
  from: string;
  act: string;
  role: RecruitRole;
  job: string;
  how: string;
  /** Appearance brief for the portrait prompt ("done" for the main cast, painted earlier). */
  look: string;
  age?: number;
  /** Background colour words for the portrait prompt. */
  bg?: string;
}

export const RECRUITS: readonly Recruit[] = data as Recruit[];

export const recruit = (id: string): Recruit | undefined => RECRUITS.find((r) => r.id === id);
export const recruitsByRole = (role: RecruitRole): Recruit[] => RECRUITS.filter((r) => r.role === role);
