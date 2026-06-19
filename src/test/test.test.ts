import { describe, expect, it } from "vitest";
import { build_sol_export, } from "../generators/sol/sol_impl";
import { build_super_export } from "../generators/supers/supers_impl";

describe("roll sol character", () => {
  it("Static output", () => {
    let output = build_sol_export("TEST", 3, [], false).flattened
    console.debug(output);
    expect(output[0][0]).toBe("Kunikazu");
    expect(output[1][0]).toBe("Kazuo");
    expect(output[2][0]).toBe("Yuta");
    expect(output[0][1]).toBe("Neptune");
    expect(output[0][2]).toBe("floating");
  });

  it("Rerolled output [same as original except those rerolled]", () => {
    let output = build_sol_export("TEST", 3, [[0,1]], false).flattened
    expect(output[0][0]).toBe("Kunikazu");
    expect(output[1][0]).toBe("Kazuo");
    expect(output[2][0]).toBe("Yuta");
    expect(output[0][1]).toBe("Uranus");
    expect(output[0][2]).toBe("floating");
  });

  it("Filtered output does not contain Neptune (but everything else is the same)", () => {
      let output = build_sol_export("TEST", 3, [], true).flattened
      expect(output[0][0]).toBe("Kunikazu");
      expect(output[1][0]).toBe("Kazuo");
      expect(output[2][0]).toBe("Yuta");
      expect(output[0][1]).toBe("Mars");
      expect(output[0][2]).toBe("grounded");
  });

  it("IATW Powers test", () => {
      let output = build_super_export("TEST", 200);
      //console.debug(output);
      // expect(output[0][0]).toBe("Daichi");
      // expect(output[1][0]).toBe("Hiroshi");
      // expect(output[2][0]).toBe("Satoshi");
      // expect(output[0][1]).toBe("Mars");
      // expect(output[0][2]).toBe("grounded");
  });
});
