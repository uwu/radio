// @ts-ignore lol IDE doesnt like deno

import { assertAlmostEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import FFT from "npm:fft.js";
import { fft } from "../build/release.js";

function jsfft(buf: Float32Array) {
  const end = buf.length;
  const start = 0;

  const size = Math.pow(2, Math.ceil(Math.log2(end - start)));

  const input = [...buf.slice(start, end), ...Array(size - (end - start)).fill(0)];
  const fft = new FFT(size);
  const output = fft.createComplexArray();
  fft.realTransform(output, input);

  return new Float32Array(output.slice(0, size));
}

Deno.test("FFT", () => {
  const input = new Float32Array(100);
  for (let i = 0; i < input.length; i++) input[i] = Math.random();

  const expected = jsfft(input);
  const actual = fft(input, -1, -1, -1);

  // wasm is using f32 for memory usage reasons
  for (let i = 0; i < actual.length; i++) 
    assertAlmostEquals(actual[i], expected[i], 5e-6);
});
