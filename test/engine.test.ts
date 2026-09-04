import { describe, expect, it } from "vitest";
import { DRAFT_CHART } from "../src/engine/constants.js";
import {
  chartValue,
  describeOverall,
  overallPick,
  valuePick,
} from "../src/engine/pickValue.js";
import { ageMultiplier, devMultiplier, valuePlayer } from "../src/engine/playerValue.js";
import { evaluateTrade } from "../src/engine/trade.js";
import type { PickAsset, PlayerAsset } from "../src/engine/types.js";

const CTX = { nextDraftYear: 2027 };

function pick(round: number, pickInRound = 16, year = 2027): PickAsset {
  return { kind: "pick", round, pickInRound, year, exact: true, slotLabel: `pick ${pickInRound}` };
}

function player(overrides: Partial<PlayerAsset> & Pick<PlayerAsset, "ovr" | "position">): PlayerAsset {
  return { kind: "player", name: "Test Player", age: 26, dev: "normal", ...overrides };
}

describe("draft chart", () => {
  it("has 224 strictly decreasing values from 3000", () => {
    expect(DRAFT_CHART).toHaveLength(224);
    expect(DRAFT_CHART[0]).toBe(3000);
    for (let i = 1; i < DRAFT_CHART.length; i++) {
      expect(DRAFT_CHART[i]).toBeLessThan(DRAFT_CHART[i - 1]);
    }
  });

  it("maps rounds and slots to overall picks", () => {
    expect(overallPick(1, 1)).toBe(1);
    expect(overallPick(2, 4)).toBe(36);
    expect(overallPick(7, 32)).toBe(224);
    expect(chartValue(16)).toBe(1000);
    expect(describeOverall(36)).toContain("2nd");
  });
});

describe("pick valuation", () => {
  it("gives full value to current-year picks", () => {
    const v = valuePick(pick(1, 1), CTX);
    expect(v.points).toBe(3000);
    expect(v.warnings).toHaveLength(0);
  });

  it("discounts future picks 40% per year out", () => {
    const now = valuePick(pick(1, 16, 2027), CTX);
    const oneOut = valuePick(pick(1, 16, 2028), CTX);
    const twoOut = valuePick(pick(1, 16, 2029), CTX);
    expect(oneOut.points).toBeCloseTo(now.points * 0.6, 0);
    expect(twoOut.points).toBeCloseTo(now.points * 0.36, 0);
    expect(oneOut.warnings.join(" ")).toContain("discounted");
  });

  it("a future 1st is worth roughly a current 2nd", () => {
    const future1st = valuePick(pick(1, 16, 2028), CTX);
    const current2nd = valuePick(pick(2, 16, 2027), CTX);
    expect(future1st.points / current2nd.points).toBeGreaterThan(0.9);
    expect(future1st.points / current2nd.points).toBeLessThan(1.7);
  });
});

describe("player valuation", () => {
  it("values elite players disproportionately", () => {
    const elite = valuePlayer(player({ ovr: 95, position: "WR" }));
    const good = valuePlayer(player({ ovr: 85, position: "WR" }));
    const mid = valuePlayer(player({ ovr: 75, position: "WR" }));
    expect(elite.points / good.points).toBeGreaterThan(2.5);
    expect(good.points / mid.points).toBeGreaterThan(2.5);
  });

  it("premium positions outvalue non-premium at the same rating", () => {
    const qb = valuePlayer(player({ ovr: 85, position: "QB" }));
    const wr = valuePlayer(player({ ovr: 85, position: "WR" }));
    const rb = valuePlayer(player({ ovr: 85, position: "HB" }));
    expect(qb.points).toBeGreaterThan(wr.points);
    expect(wr.points).toBeGreaterThan(rb.points);
  });

  it("ages RBs faster than QBs", () => {
    const rbDropoff = ageMultiplier(29, "HB") / ageMultiplier(24, "HB");
    const qbDropoff = ageMultiplier(29, "QB") / ageMultiplier(24, "QB");
    expect(rbDropoff).toBeLessThan(qbDropoff);
  });

  it("dev traits matter more for young players", () => {
    expect(devMultiplier("xfactor", 22)).toBeCloseTo(1.5, 2);
    expect(devMultiplier("xfactor", 31)).toBeLessThan(1.25);
    expect(devMultiplier("xfactor", 31)).toBeGreaterThan(1.0);
  });

  it("warns when age is assumed", () => {
    const v = valuePlayer({ kind: "player", name: "X", position: "WR", ovr: 80 });
    expect(v.warnings.join(" ")).toContain("assumed");
  });

  it("a young superstar is worth first-round value, an old backup a late pick", () => {
    const star = valuePlayer(player({ ovr: 92, position: "WR", age: 24, dev: "superstar" }));
    expect(star.points).toBeGreaterThan(1500); // early 1st territory
    const backup = valuePlayer(player({ ovr: 72, position: "HB", age: 29 }));
    expect(backup.points).toBeLessThan(100); // day-3 pick territory
  });
});

describe("trade verdicts", () => {
  it("calls a mirror trade fair", () => {
    const a = [player({ ovr: 85, position: "WR" })];
    const b = [player({ ovr: 85, position: "WR" })];
    const result = evaluateTrade("A", a, "B", b, CTX);
    expect(result.verdict).toBe("fair");
    expect(result.favors).toBeNull();
  });

  it("flags the classic exploit: future 1st for a mediocre player", () => {
    const result = evaluateTrade(
      "Victim",
      [pick(1, 16, 2028)],
      "Shark",
      [player({ ovr: 74, position: "HB", age: 29 })],
      CTX
    );
    expect(result.verdict).toBe("lopsided");
    expect(result.favors).toBe("B"); // the shark receives the pick value
    expect(result.warnings.join(" ")).toContain("Pick-fleece");
  });

  it("rates star-for-picks packages sanely", () => {
    // 94 OVR X-Factor WR (26) for an early current 1st + mid 2nd: close-ish.
    const result = evaluateTrade(
      "Seller",
      [player({ ovr: 94, position: "WR", age: 26, dev: "xfactor" })],
      "Buyer",
      [pick(1, 4, 2027), pick(2, 16, 2027)],
      CTX
    );
    expect(["fair", "slight", "strong"]).toContain(result.verdict);
  });

  it("small-value noise stays fair", () => {
    const result = evaluateTrade(
      "A",
      [pick(7, 4, 2027)],
      "B",
      [pick(7, 30, 2027)],
      CTX
    );
    expect(result.verdict).toBe("fair");
  });
});
