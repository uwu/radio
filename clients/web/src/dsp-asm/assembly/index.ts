import { FFT } from "./fft";

export function downscale(buf: Float32Array, size: i32): Float32Array {
  const fchunkSz = Math.ceil(<f64>buf.length / <f64>size);
  const nChunks = <i32>Math.ceil(<f64>buf.length / fchunkSz);
  const chunkSz = <i32>fchunkSz;

  const res = new Float32Array(nChunks);
  for (let ci = 0; ci < nChunks; ci++) {
    let max: f64 = 0;
    for (let i = 1; i < chunkSz; i++) {
      max = Math.max(buf[i + ci * chunkSz], max);
    }

    res[ci] = <f32>max;
  }

  return res;
}

export function fft(buf: Float32Array, start: i32, end: i32, pad: i32): Float32Array {
  if (start === -1) start = 0;
  if (end === -1) end = buf.length;
  if (pad === -1) pad = 0;

  // min power of 2 that is <= buf.length
  const size = <i32>Math.pow(2, Math.ceil(Math.log2(pad + end - start)));
  
  const fftInput = new Float32Array(size);

  // copy in buffer
  memory.copy(
    fftInput.dataStart,
    buf.dataStart + start * Float32Array.BYTES_PER_ELEMENT,
    (end - start) * Float32Array.BYTES_PER_ELEMENT,
  );

  const fft = new FFT(size);
  const output = fft.createComplexArray();

  fft.realTransform(output, fftInput);

  return output.subarray(0, size);
}
