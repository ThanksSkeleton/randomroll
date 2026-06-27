import { describe, it } from "vitest";
import { build_super_export } from "../generators/supers/supers_impl";

describe("All UTs", () => {

  it("IATW Powers test", () => {
      let output = build_super_export("TEST", 200);
      console.debug(output);
      // expect(output[0][0]).toBe("Daichi");
      // expect(output[1][0]).toBe("Hiroshi");
      // expect(output[2][0]).toBe("Satoshi");
      // expect(output[0][1]).toBe("Mars");
      // expect(output[0][2]).toBe("grounded");
  });
});
