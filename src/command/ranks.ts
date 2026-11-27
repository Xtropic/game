// Ranks in the Commons Army. The story promotes Rhea (flags.rank); each rank opens something real in the game:
// how many travel with her, her pay, the council's stratagems, talks with the nations, pacts and marches.
// The pay comes each time the story moves on (a new stage), like the Thornwick day.
type Flags = Record<string, boolean | number | string>;

export interface Rank {
  id: string;
  /** Travelling party size besides the hero (Ash doesn't count). */
  party: number;
  /** Coin each time the story moves on. */
  pay: number;
  /** Stratagems the war council may pick at once. */
  stratagems: number;
  /** Envoys and gifts to the nations. */
  envoys: boolean;
  /** Pacts sealed, demands made, marches on a nation. */
  pacts: boolean;
  /** Allied companies from pacts that may join one army battle. */
  allies: number;
  /** What it opens, in plain words, for the promotion card and the Command page. */
  opens: string[];
}

export const RANKS: Rank[] = [
  { id: "Recruit", party: 3, pay: 2, stratagems: 1, envoys: false, pacts: false, allies: 0,
    opens: ["Three may travel with you, besides Ash.", "A recruit's pay: 2 coin each time the story moves on."] },
  { id: "Sergeant", party: 4, pay: 4, stratagems: 1, envoys: false, pacts: false, allies: 0,
    opens: ["Four may travel with you.", "A sergeant's pay: 4 coin."] },
  { id: "Lieutenant", party: 5, pay: 7, stratagems: 1, envoys: true, pacts: false, allies: 0,
    opens: ["Five may travel with you.", "A lieutenant's pay: 7 coin.", "Envoys: send someone with a letter, or a gift, to the clans and towns you know (Menu, Command)."] },
  { id: "Captain", party: 5, pay: 12, stratagems: 1, envoys: true, pacts: true, allies: 1,
    opens: ["A captain's pay: 12 coin.", "Pacts: when a nation's price is met, seal it.", "Demands, and marching on a nation that has turned against you.", "One allied company from a pact can join each army battle."] },
  { id: "Major", party: 5, pay: 18, stratagems: 2, envoys: true, pacts: true, allies: 2,
    opens: ["A major's pay: 18 coin.", "The war council may pick two stratagems.", "Two allied companies can join each army battle."] },
  { id: "Commander", party: 5, pay: 25, stratagems: 2, envoys: true, pacts: true, allies: 3,
    opens: ["A commander's pay: 25 coin.", "Three allied companies can join each army battle."] },
  { id: "Marshal", party: 5, pay: 35, stratagems: 3, envoys: true, pacts: true, allies: 4,
    opens: ["A marshal's pay: 35 coin.", "The war council may pick three stratagems.", "Four allied companies can join each army battle."] },
];

/** The hero's rank now (Corran's ranks are his own and don't count). Before the army takes her in, a recruit's. */
export function rankOf(f: Flags): Rank {
  const r = String(f.rank ?? "");
  return RANKS.find((x) => x.id === r) ?? RANKS[0];
}
export const rankIndex = (f: Flags): number => RANKS.indexOf(rankOf(f));
export const atLeast = (f: Flags, id: string): boolean => rankIndex(f) >= RANKS.findIndex((x) => x.id === id);

/** Called each time the flags change. Pays once per new stage, and says once when a promotion opens something.
 *  Returns lines to show (pay goes quietly into the purse; only a promotion speaks). */
export function rankTick(f: Flags, stage: string): { moved: boolean; pay: number; promoted?: Rank } {
  let pay = 0, promoted: Rank | undefined, moved = false;
  if (stage && f["paid.stage"] !== stage) {
    moved = !!f["paid.stage"];
    if (moved && f.rank) pay = rankOf(f).pay;
    f["paid.stage"] = stage;
  }
  const r = String(f.rank ?? "");
  if (r && RANKS.some((x) => x.id === r) && f["rank.seen"] !== r) {
    if (f["rank.seen"] !== undefined || r !== "Recruit") promoted = rankOf(f);
    f["rank.seen"] = r;
  }
  return { moved, pay, promoted };
}
