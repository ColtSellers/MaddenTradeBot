import type { DevTrait } from "./constants.js";

export interface PlayerAsset {
  kind: "player";
  name: string;
  /** Canonical Madden position (QB, HB, WR, ...). */
  position: string;
  ovr: number;
  age?: number;
  dev?: DevTrait;
  contractYears?: number;
}

export interface PickAsset {
  kind: "pick";
  /** Draft class year, e.g. 2027. */
  year: number;
  /** Round 1-7. */
  round: number;
  /** Pick within the round, 1-32. */
  pickInRound: number;
  /** True when the user gave an exact slot rather than early/mid/late/default. */
  exact: boolean;
  /** How the slot was specified, for display. */
  slotLabel: string;
}

export type Asset = PlayerAsset | PickAsset;

export interface Valuation {
  asset: Asset;
  /** Value in chart points. */
  points: number;
  /** One-line description of the asset for embeds. */
  label: string;
  /** Human-readable breakdown of how the number was reached. */
  breakdown: string[];
  /** Caveats: assumed age, future-pick discount, etc. */
  warnings: string[];
}

export type VerdictLevel = "fair" | "slight" | "strong" | "lopsided";

export interface SideResult {
  label: string;
  valuations: Valuation[];
  total: number;
}

export interface TradeResult {
  sideA: SideResult;
  sideB: SideResult;
  verdict: VerdictLevel;
  /** "A" | "B" | null — which side comes out ahead (receives more value). */
  favors: "A" | "B" | null;
  ratio: number;
  diff: number;
  warnings: string[];
}
