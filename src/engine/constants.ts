/**
 * All tunable numbers for the valuation engine live in this file so the
 * league can audit and adjust the model in one place.
 *
 * The unit of value everywhere is "chart points" — the same scale as the
 * classic Jimmy Johnson draft trade value chart (No. 1 overall = 3000).
 * Players and picks are converted into chart points so they can be
 * compared directly, the same way real NFL front offices talk about
 * trades ("he's worth a late first").
 */

export const ENGINE_VERSION = "1.0";

/** Rounds in a Madden draft. */
export const ROUNDS = 7;
/** Picks per round (32 teams). */
export const PICKS_PER_ROUND = 32;

/**
 * Jimmy Johnson-style draft value chart, picks 1–224, one array per round.
 * Values are the industry-standard chart with light smoothing in the late
 * rounds. Higher = more valuable.
 */
export const DRAFT_CHART: readonly number[] = [
  // Round 1 (picks 1-32)
  3000, 2600, 2200, 1800, 1700, 1600, 1500, 1400, 1350, 1300, 1250, 1200,
  1150, 1100, 1050, 1000, 950, 900, 875, 850, 800, 780, 760, 740, 720, 700,
  680, 660, 640, 620, 600, 590,
  // Round 2 (picks 33-64)
  580, 560, 550, 540, 530, 520, 510, 500, 490, 480, 470, 460, 450, 440, 430,
  420, 410, 400, 390, 380, 370, 360, 350, 340, 330, 320, 310, 300, 292, 284,
  276, 270,
  // Round 3 (picks 65-96)
  265, 260, 255, 250, 245, 240, 235, 230, 225, 220, 215, 210, 205, 200, 195,
  190, 185, 180, 175, 170, 165, 160, 155, 150, 145, 140, 138, 136, 134, 132,
  130, 128,
  // Round 4 (picks 97-128)
  124, 120, 116, 112, 108, 104, 100, 96, 92, 88, 86, 84, 82, 80, 78, 76, 74,
  72, 70, 68, 66, 64, 62, 60, 58, 56, 54, 52, 50, 49, 48, 47,
  // Round 5 (picks 129-160)
  46, 45, 44, 43, 42, 41, 40, 39.5, 39, 38.5, 38, 37.5, 37, 36.5, 36, 35.5,
  35, 34.5, 34, 33.5, 33, 32.5, 32, 31.5, 31, 30.5, 30, 29.5, 29, 28.8, 28.6,
  28.4,
  // Round 6 (picks 161-192)
  28.2, 28, 27.8, 27.6, 27.4, 27.2, 27, 26.8, 26.6, 26.4, 26.2, 26, 25.8,
  25.6, 25.4, 25.2, 25, 24.8, 24.6, 24.4, 24.2, 24, 23.8, 23.6, 23.4, 23.2,
  23, 22.8, 22.6, 22.4, 22.2, 22,
  // Round 7 (picks 193-224)
  21.4, 20.8, 20.2, 19.6, 19, 18.4, 17.8, 17.2, 16.6, 16, 15.4, 14.8, 14.2,
  13.6, 13, 12.4, 11.8, 11.2, 10.6, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5,
  5, 4.5, 4,
];

/**
 * Discount applied per season a pick is in the future. NFL convention is
 * roughly "a future pick loses about a round of value per year out"; 0.6
 * per year is the modern middle ground. This is the single biggest fix for
 * the "CPU gives away future 1sts" exploit — Madden's CPU treats a 2028 1st
 * like a 2026 1st, this engine does not.
 */
export const FUTURE_PICK_DISCOUNT_PER_YEAR = 0.6;

/** Within-round pick slot assumptions when only early/mid/late is known. */
export const SLOT_PICK_IN_ROUND = { early: 4, mid: 16, late: 28 } as const;

/**
 * Player base value from overall rating, before multipliers:
 *   base = 3000 * e^(OVR_CURVE_K * (ovr - 99))
 * Exponential because elite players are disproportionately valuable —
 * a 92 is far more than twice a 76. Sample values with K = 0.11:
 *   99 -> 3000, 95 -> ~1930, 90 -> ~1115, 85 -> ~645, 80 -> ~370, 75 -> ~215, 70 -> ~125
 */
export const OVR_CURVE_K = 0.11;
export const OVR_CURVE_MAX = 3000;

/** Canonical Madden positions and their positional value multiplier. */
export const POSITION_MULT: Record<string, number> = {
  QB: 1.75,
  HB: 0.8,
  FB: 0.3,
  WR: 1.15,
  TE: 0.95,
  LT: 1.2,
  LG: 0.9,
  C: 0.92,
  RG: 0.9,
  RT: 1.05,
  LE: 1.2,
  RE: 1.2,
  DT: 1.0,
  LOLB: 1.1,
  ROLB: 1.1,
  MLB: 0.9,
  CB: 1.2,
  FS: 0.95,
  SS: 0.95,
  K: 0.25,
  P: 0.2,
  LS: 0.15,
};

/** Aliases users may type -> canonical Madden position. */
export const POSITION_ALIASES: Record<string, string> = {
  RB: "HB",
  T: "LT",
  OT: "LT",
  G: "LG",
  OG: "LG",
  OL: "LG",
  DE: "LE",
  EDGE: "RE",
  NT: "DT",
  DL: "DT",
  OLB: "ROLB",
  LB: "MLB",
  ILB: "MLB",
  S: "FS",
};

export type AgeGroup = "qb" | "rb" | "skill" | "trench" | "spec";

/** Which aging curve each position uses. */
export const POSITION_AGE_GROUP: Record<string, AgeGroup> = {
  QB: "qb",
  HB: "rb",
  FB: "rb",
  WR: "skill",
  CB: "skill",
  FS: "skill",
  SS: "skill",
  MLB: "skill",
  LOLB: "skill",
  ROLB: "skill",
  TE: "trench",
  LT: "trench",
  LG: "trench",
  C: "trench",
  RG: "trench",
  RT: "trench",
  LE: "trench",
  RE: "trench",
  DT: "trench",
  K: "spec",
  P: "spec",
  LS: "spec",
};

/**
 * Age multiplier anchor points [age, multiplier], linearly interpolated.
 * Youth carries a premium (years of control + Madden development upside);
 * RBs fall off a cliff, QBs age gracefully — mirroring the real league.
 */
export const AGE_CURVES: Record<AgeGroup, ReadonlyArray<readonly [number, number]>> = {
  qb: [
    [21, 1.25], [24, 1.18], [27, 1.05], [29, 0.95], [31, 0.78],
    [33, 0.58], [35, 0.35], [38, 0.22],
  ],
  rb: [
    [21, 1.3], [23, 1.18], [25, 1.0], [27, 0.75], [29, 0.45],
    [31, 0.22], [33, 0.12],
  ],
  skill: [
    [21, 1.35], [23, 1.25], [25, 1.12], [27, 1.0], [29, 0.82],
    [31, 0.58], [33, 0.38], [35, 0.25], [38, 0.18],
  ],
  trench: [
    [21, 1.3], [24, 1.2], [26, 1.08], [28, 1.0], [30, 0.8],
    [32, 0.55], [34, 0.35], [37, 0.2],
  ],
  spec: [
    [21, 0.95], [30, 0.9], [35, 0.7], [40, 0.5],
  ],
};

/** Default age (with a warning) when the user doesn't provide one. */
export const DEFAULT_AGE = 27;

export type DevTrait = "normal" | "star" | "superstar" | "xfactor";

/**
 * Dev trait multipliers at full strength. The bonus tapers with age
 * (see DEV_TAPER) because dev traits are mostly about growth potential:
 * an X-Factor 22-year-old is a franchise cornerstone, an X-Factor
 * 31-year-old is just a good player today.
 */
export const DEV_MULT: Record<DevTrait, number> = {
  normal: 1.0,
  star: 1.12,
  superstar: 1.3,
  xfactor: 1.5,
};

/** Dev bonus taper: full through age DEV_FULL_AGE, floor of DEV_MIN_SHARE after DEV_FADED_AGE. */
export const DEV_FULL_AGE = 24;
export const DEV_FADED_AGE = 29;
export const DEV_MIN_SHARE = 0.35;

/** Contract-years-remaining multiplier (expiring deals are rentals). */
export const CONTRACT_MULT: ReadonlyArray<readonly [number, number]> = [
  [1, 0.85],
  [2, 0.95],
  [3, 1.0],
  [4, 1.03],
];

/** Trade verdict thresholds on the value ratio (bigger side / smaller side). */
export const VERDICT = {
  /** Absolute point difference below which any trade is fair (noise floor). */
  fairAbsoluteDiff: 60,
  fairRatio: 1.1,
  slightRatio: 1.3,
  strongRatio: 1.65,
} as const;
