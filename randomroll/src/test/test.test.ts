import { describe, expect, it } from "vitest";
import { build } from "../sol_people";

describe("add", () => {
  it("adds two numbers", () => {
    expect(2+3).toBe(5);
  });
});

describe("roll sol character", () => {
  it("Static output", () => {
    let output = build("TEST", 3, [])
    expect(output[0][0]).toBe("Daichi");
    expect(output[1][0]).toBe("Hiroshi");
    expect(output[2][0]).toBe("Satoshi");
    expect(output[0][1]).toBe("Neptune");
    expect(output[0][2]).toBe("floating");
  });

  it("Rerolled output", () => {
    let output = build("TEST", 3, [[0,1]])
    expect(output[0][0]).toBe("Daichi");
    expect(output[1][0]).toBe("Hiroshi");
    expect(output[2][0]).toBe("Satoshi");
    expect(output[0][1]).toBe("Earth");
    expect(output[0][2]).toBe("grounded");
  });
});
