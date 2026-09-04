import { describe, expect, it } from "vitest";
import { parseAssetLine, parseAssets, splitLines } from "../src/parse/assetParser.js";
import type { PickAsset, PlayerAsset } from "../src/engine/types.js";

const CTX = { nextDraftYear: 2027 };

function asPlayer(line: string): PlayerAsset {
  const r = parseAssetLine(line, CTX);
  if (typeof r === "string" || r.kind !== "player") throw new Error(`not a player: ${line} -> ${JSON.stringify(r)}`);
  return r;
}

function asPick(line: string): PickAsset {
  const r = parseAssetLine(line, CTX);
  if (typeof r === "string" || r.kind !== "pick") throw new Error(`not a pick: ${line} -> ${JSON.stringify(r)}`);
  return r;
}

describe("player lines", () => {
  it("parses the canonical form", () => {
    const p = asPlayer("Justin Jefferson WR 26 94 xfactor");
    expect(p).toMatchObject({ name: "Justin Jefferson", position: "WR", age: 26, ovr: 94, dev: "xfactor" });
  });

  it("handles aliases, commas, and reordered numbers", () => {
    const p = asPlayer("Breece Hall, RB, 88, 24, star");
    expect(p).toMatchObject({ position: "HB", ovr: 88, age: 24, dev: "star" });
    expect(asPlayer("Micah Parsons EDGE 27 93").position).toBe("RE");
    expect(asPlayer("Some Guy S 25 80").position).toBe("FS");
  });

  it("parses contract years", () => {
    expect(asPlayer("Guy WR 26 85 2yr").contractYears).toBe(2);
    expect(asPlayer("Guy WR 26 85 1yr").contractYears).toBe(1);
  });

  it("leaves age undefined when missing", () => {
    const p = asPlayer("Mystery Man QB 88");
    expect(p.age).toBeUndefined();
    expect(p.ovr).toBe(88);
  });

  it("treats SS as strong safety, not superstar", () => {
    const p = asPlayer("Hard Hitter SS 25 84");
    expect(p.position).toBe("SS");
    expect(p.dev).toBeUndefined();
  });

  it("errors without an OVR", () => {
    expect(typeof parseAssetLine("Just A Name WR", CTX)).toBe("string");
  });
});

describe("pick lines", () => {
  it("parses year, round, and slot", () => {
    const p = asPick("2027 1st early");
    expect(p).toMatchObject({ year: 2027, round: 1, pickInRound: 4, exact: false });
  });

  it("defaults year and slot", () => {
    const p = asPick("3rd");
    expect(p).toMatchObject({ year: 2027, round: 3, pickInRound: 16 });
  });

  it("parses 'round N' and exact pick numbers", () => {
    expect(asPick("2026 round 2")).toMatchObject({ year: 2026, round: 2 });
    const exact = asPick("2028 2nd pick 45");
    expect(exact).toMatchObject({ year: 2028, round: 2, pickInRound: 13, exact: true });
  });

  it("parses an overall pick with no round word", () => {
    const p = asPick("2027 pick 45");
    expect(p).toMatchObject({ round: 2, pickInRound: 13 });
  });

  it("rejects a pick number that contradicts the round", () => {
    expect(typeof parseAssetLine("2027 1st pick 45", CTX)).toBe("string");
  });

  it("rejects gibberish", () => {
    expect(typeof parseAssetLine("complete nonsense", CTX)).toBe("string");
  });
});

describe("multi-line input", () => {
  it("splits on newlines, semicolons, and bullets", () => {
    expect(splitLines("a; b\n- c\n• d")).toEqual(["a", "b", "c", "d"]);
  });

  it("collects assets and errors together", () => {
    const r = parseAssets("Justin Jefferson WR 26 94 xf\n2027 1st early\nnot a thing", CTX);
    expect(r.assets).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
  });

  it("errors on empty input", () => {
    expect(parseAssets("   ", CTX).errors.length).toBeGreaterThan(0);
  });
});
