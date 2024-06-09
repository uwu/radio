// @ts-ignore lol IDE doesnt like deno

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromComplexArray, toComplexArray } from "../build/release.js";

Deno.test("SIMD FFT", async (t) => {
  await t.step("#fromComplexArray", async (t) => {
    await t.step("should work for %4 length arrays", () => {
      const input = new Float32Array([1, 6, 7, 4, 8, 5, 8, 4, 2, 8, 5, 8]);
      const expectedOut = [1, 7, 8, 8, 2, 5];
      assertEquals([...fromComplexArray(input)], expectedOut);
    });

    await t.step("should work for %2 but not %4 length arrays", () => {
      const input = new Float32Array([1, 6, 7, 4, 8, 5, 8, 4, 2, 8]);
      const expectedOut = [1, 7, 8, 8, 2];
      assertEquals([...fromComplexArray(input)], expectedOut);
    });

    await t.step("should throw on odd input size", () => {
      assertThrows(() => fromComplexArray(new Float32Array([1, 2, 3])));
    });
    
    await t.step("should throw on empty array", () => {
      assertThrows(() => fromComplexArray(new Float32Array([])));
    })
  });
  
  await t.step("#toComplexArray", async (t) => {
    await t.step("should work for %2 arrays", () => {
      const input = new Float32Array([1, 2, 3, 4]);
      const expectedOut = [1, 0, 2, 0, 3, 0, 4, 0];
      assertEquals([...toComplexArray(input)], expectedOut);
    })

    await t.step("should work for not-%2 arrays", () => {
      const input = new Float32Array([1, 2, 3, 4, 5]);
      const expectedOut = [1, 0, 2, 0, 3, 0, 4, 0, 5, 0];
      assertEquals([...toComplexArray(input)], expectedOut);
    })
  })
});
