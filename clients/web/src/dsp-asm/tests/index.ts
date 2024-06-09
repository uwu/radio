// @ts-ignore lmao it doesnt like deno

import {assertEquals} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromComplexArray } from "../build/release.js";

Deno.test("SIMD FFT", async (t) => {
  await t.step("#fromComplexArray", async (t) => {
    
    await t.step("should work for %4 length arrays", () => {
      const input = new Float32Array([
        1, 6, 7, 4, 8, 5, 8, 4, 2, 8, 5, 8,
      ]);
      const expectedOut = [1, 7, 8, 8, 2, 5];
      assertEquals([...fromComplexArray(input)], expectedOut);
    })
    
    await t.step("should work for %2 but not %4 length arrays", () => {
      const input = new Float32Array([
        1, 6, 7, 4, 8, 5, 8, 4, 2, 8,
      ]);
      const expectedOut = [1, 7, 8, 8, 2];
      assertEquals([...fromComplexArray(input)], expectedOut);
    })
  });
});

