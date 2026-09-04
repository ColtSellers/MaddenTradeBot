import { PICKS_PER_ROUND, ROUNDS, SLOT_PICK_IN_ROUND, type DevTrait } from "../engine/constants.js";
import { canonicalPosition } from "../engine/playerValue.js";
import type { Asset, PickAsset, PlayerAsset } from "../engine/types.js";

export interface ParseContext {
  /** Default draft year for picks written without a year. */
  nextDraftYear: number;
}

export interface ParseResult {
  assets: Asset[];
  errors: string[];
}

export const SYNTAX_HELP = [
  "**Player** — `Name POS AGE OVR [dev] [Nyr]`, e.g.:",
  "> `Justin Jefferson WR 26 94 xfactor`",
  "> `Breece Hall RB 24 88 star 2yr`",
  "**Pick** — `[year] ROUND [early|mid|late|pick #]`, e.g.:",
  "> `2027 1st early` • `2026 3rd` • `2028 2nd pick 45`",
  "Dev traits: `normal`, `star`, `superstar`, `xfactor` (or `xf`).",
].join("\n");

const DEV_WORDS: Record<string, DevTrait> = {
  normal: "normal",
  star: "star",
  superstar: "superstar",
  xfactor: "xfactor",
  "x-factor": "xfactor",
  xf: "xfactor",
};

const ROUND_WORDS: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
};

/** Split a modal textarea into candidate asset lines. */
export function splitLines(text: string): string[] {
  return text
    .split(/[\n;]+/)
    .map((l) => l.replace(/^\s*(?:[•*\-]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
}

export function parseAssets(text: string, ctx: ParseContext): ParseResult {
  const assets: Asset[] = [];
  const errors: string[] = [];
  for (const line of splitLines(text)) {
    const result = parseAssetLine(line, ctx);
    if (typeof result === "string") {
      errors.push(`\`${line}\` — ${result}`);
    } else {
      assets.push(result);
    }
  }
  if (assets.length === 0 && errors.length === 0) {
    errors.push("No assets found — enter one player or pick per line.");
  }
  return { assets, errors };
}

/** Parse one line into an Asset, or return an error message string. */
export function parseAssetLine(line: string, ctx: ParseContext): Asset | string {
  const tokens = line.split(/[\s,()]+/).filter(Boolean);

  // A line is a player if it contains a recognizable position token;
  // otherwise we try to read it as a pick.
  const hasPosition = tokens.some((t) => canonicalPosition(t) !== null && !/^\d/.test(t));
  if (hasPosition) {
    return parsePlayer(tokens);
  }
  return parsePick(tokens, ctx);
}

function parsePlayer(tokens: string[]): PlayerAsset | string {
  let position: string | undefined;
  let dev: DevTrait | undefined;
  let contractYears: number | undefined;
  const numbers: number[] = [];
  const nameParts: string[] = [];

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (position === undefined && !/^\d/.test(t)) {
      const pos = canonicalPosition(t);
      // Only treat short tokens as positions so a name like "Ott" isn't eaten.
      if (pos !== null && t.length <= 4) {
        position = pos;
        continue;
      }
    }
    if (lower in DEV_WORDS) {
      dev = DEV_WORDS[lower];
      continue;
    }
    const contract = lower.match(/^(\d)(?:yrs?|years?)$/);
    if (contract) {
      contractYears = parseInt(contract[1], 10);
      continue;
    }
    if (/^\d+$/.test(t)) {
      numbers.push(parseInt(t, 10));
      continue;
    }
    nameParts.push(t);
  }

  if (position === undefined) {
    return "couldn't find a position (QB, RB, WR, ...).";
  }

  // Assign numbers: OVR is 40-99, age is 18-39. With two numbers the
  // smaller in-age-range one is age.
  let ovr: number | undefined;
  let age: number | undefined;
  for (const n of numbers) {
    if (n >= 40 && n <= 99 && (ovr === undefined || n > ovr)) {
      ovr = n;
    } else if (n >= 18 && n <= 39 && age === undefined) {
      age = n;
    }
  }
  if (ovr === undefined) {
    return "couldn't find an overall rating (40-99).";
  }
  const name = nameParts.join(" ") || "Unnamed player";

  return { kind: "player", name, position, ovr, age, dev, contractYears };
}

function parsePick(tokens: string[], ctx: ParseContext): PickAsset | string {
  let year: number | undefined;
  let round: number | undefined;
  let slot: keyof typeof SLOT_PICK_IN_ROUND | undefined;
  let pickNumber: number | undefined;
  let expectPickNumber = false;

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (/^20\d{2}$/.test(t)) {
      year = parseInt(t, 10);
      continue;
    }
    if (lower in ROUND_WORDS) {
      round = ROUND_WORDS[lower];
      continue;
    }
    const roundMatch = lower.match(/^(?:r|rd|round)(\d)$/);
    if (roundMatch) {
      round = parseInt(roundMatch[1], 10);
      continue;
    }
    if (lower === "round" || lower === "rd" || lower === "r") {
      expectPickNumber = false;
      continue; // "round 3" — the bare number after is the round
    }
    if (lower === "pick" || lower === "#") {
      expectPickNumber = true;
      continue;
    }
    if (lower === "early" || lower === "mid" || lower === "late") {
      slot = lower;
      continue;
    }
    if (/^\d{1,3}$/.test(t)) {
      const n = parseInt(t, 10);
      if (expectPickNumber) {
        pickNumber = n;
        expectPickNumber = false;
      } else if (round === undefined && n >= 1 && n <= ROUNDS) {
        round = n;
      } else {
        pickNumber = n;
      }
      continue;
    }
  }

  if (round === undefined && pickNumber !== undefined && pickNumber > ROUNDS) {
    // An overall pick number alone, e.g. "2027 pick 45".
    round = Math.floor((pickNumber - 1) / PICKS_PER_ROUND) + 1;
  }
  if (round === undefined) {
    return "not a player (no position found) and not a pick (no round found). " +
      "Use e.g. `2027 1st early` or `Name WR 26 94`.";
  }
  if (round < 1 || round > ROUNDS) {
    return `round must be 1-${ROUNDS}.`;
  }

  let pickInRound: number;
  let exact = false;
  let slotLabel: string;
  if (pickNumber !== undefined) {
    if (pickNumber > PICKS_PER_ROUND) {
      const overallRound = Math.floor((pickNumber - 1) / PICKS_PER_ROUND) + 1;
      if (overallRound !== round) {
        return `pick #${pickNumber} is in round ${overallRound}, not round ${round}.`;
      }
      pickInRound = ((pickNumber - 1) % PICKS_PER_ROUND) + 1;
    } else {
      pickInRound = pickNumber;
    }
    exact = true;
    slotLabel = `pick ${pickInRound} of the round`;
  } else if (slot !== undefined) {
    pickInRound = SLOT_PICK_IN_ROUND[slot];
    exact = false;
    slotLabel = slot;
  } else {
    pickInRound = SLOT_PICK_IN_ROUND.mid;
    exact = false;
    slotLabel = "mid";
  }

  return {
    kind: "pick",
    year: year ?? ctx.nextDraftYear,
    round,
    pickInRound,
    exact,
    slotLabel,
  };
}
