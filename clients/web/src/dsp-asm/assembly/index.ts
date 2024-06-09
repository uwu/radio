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

export * from "./fft";

function fft(buf: Float32Array, start: i32, end: i32, pad: i32): void {
  if (start === -1) start = 0;
  if (end === -1) end = buf.length;
  if (pad === -1) pad = 0;
  
  const size = <i32>Math.pow(2, Math.ceil(Math.log2(pad + end - start)));
}
