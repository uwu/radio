import { FFT } from "./fft";

// copying arrays across thread boundaries is very expensive, so provide a mechanism to reuse it.
let currentBuf: Float32Array | null;

export function uploadBuf(buf: Float32Array): void {
  currentBuf = buf;
}

export function downscale(_buf: Float32Array | null, size: i32): Float32Array {
  const buf = _buf ? _buf : currentBuf!;
  // round chunk size up to a multiple of 4
  const fchunkSz = 4 * Math.ceil(<f64>buf.length / <f64>size / 4);
  const nChunks = <i32>Math.ceil(<f64>buf.length / fchunkSz);
  const chunkSz = <i32>fchunkSz;

  const res = new Float32Array(nChunks);
  for (let ci = 0; ci < nChunks; ci++) {
    let max = v128.splat<f32>(0);
    const chunk = buf.subarray(ci * chunkSz, (ci + 1) * chunkSz);
    const ptr = chunk.dataStart;

    // 4 floats per vec
    for (let i = 0; i < chunk.length; i += 4) {
      const vec = v128.load(ptr + i * sizeof<v128>());
      max = f32x4.max(max, vec);
    }

    res[ci] = Mathf.max(
      Mathf.max(f32x4.extract_lane(max, 0), f32x4.extract_lane(max, 1)),
      Mathf.max(f32x4.extract_lane(max, 2), f32x4.extract_lane(max, 3)),
    );
  }

  return res;
}

let lastFft: Float32Array | null;

export function fft(
  _buf: Float32Array | null,
  start: i32,
  end: i32,
  pad: i32,
  persistence: f32,
): Float32Array {
  const buf = _buf ? _buf : currentBuf!;
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

  const result = output.subarray(0, size);
  if (Mathf.abs(persistence) < 0.0001) return result; // no persistence, just return the raw fft
  if (!lastFft || lastFft!.length !== result.length) {
    lastFft = result;
    return result;
  }

  // blend last fft with this fft to reduce jitter
  // round size down to 4 for simd purposes
  const out = new Float32Array(lastFft!.length);

  // TODO: null errors. why?
  /*const simdSafeSize = 4 * (out.length / 4);
  const outPtr = out.dataStart;
  const lastPtr = lastFft!.dataStart;
  const resPtr = result.dataStart;
  
  for (let i = 0; i < 4 * (out.length / 4); i++) {
    // out_i = max(res_i, last_i * persistence)
    v128.store(
      outPtr + i * sizeof<v128>(),
      f32x4.max(
        v128.load(resPtr + i * sizeof<v128>()),
        f32x4.mul(v128.load(lastPtr + i * sizeof<v128>()), f32x4.splat(persistence)),
      ),
    );
  }*/

  // do last few elements
  for (let i = /*simdSafeSize*/ 0; i < out.length; i++) {
    out[i] = result[i] + lastFft![i] * persistence;
  }

  lastFft = out;
  return out.subarray(0, lastFft!.length);
}

function sliceByCrossings(
  _buf: Float32Array | null,
  start: i32,
  end: i32,
  n: i32,
): Array<Float32Array> {
  const buf = _buf ? _buf : currentBuf!;
  const buffers = new Array<Float32Array>();
  if (start === -1) start = 0;
  if (end === -1) end = buf.length;
  if (n === -1) n = 1;

  let startNext = start; // the start of the next buffer to be sliced
  let isPos = buf[start] > 0; // was the last sample positive?

  let cutN = 0; // counter for `n`

  for (let i = start + 1; i < end; i++) {
    const thisSampPos = buf[i] > 0;
    if (isPos !== thisSampPos && ++cutN === n) {
      // flip!
      cutN = 0;
      buffers.push(buf.subarray(startNext, i));
      startNext = i;
    }
    isPos = thisSampPos;
  }

  if (cutN !== 0) {
    // a lil bit left
    buffers.push(buf.subarray(startNext, end - 1));
  }

  return buffers;
}

function maxAbsPeakOf(bufs: Array<Float32Array>): Float32Array {
  let maxBuf = bufs[0];
  let max: f32 = 0;

  for (let bi = 0; bi < bufs.length; bi++) {
    const b = bufs[bi];
    let maxV = f32x4.splat(0);
    const ptr = b.dataStart;

    // max over chunks of 4 floats, very quickly
    const len = 4 * (b.length / 4);
    for (let i = 0; i < len; i += 4) {
      const vec = f32x4.abs(v128.load(ptr + i * sizeof<v128>()));
      maxV = f32x4.max(maxV, vec);
    }

    let finalMax = Mathf.max(
      Mathf.max(f32x4.extract_lane(maxV, 0), f32x4.extract_lane(maxV, 1)),
      Mathf.max(f32x4.extract_lane(maxV, 2), f32x4.extract_lane(maxV, 3)),
    );

    // now just take the values we missed off due to only taking fours
    for (let i = len; i < b.length; i++) {
      finalMax = Mathf.max(finalMax, Mathf.abs(b[i]));
    }

    if (finalMax < max) continue;
    max = finalMax;
    maxBuf = b;
  }

  return maxBuf;
}

// sliceByCrossings -> maxAbsPeakOf all in one go as an opt
export function sbcMax(_buf: Float32Array | null, start: i32, end: i32, n: i32): Float32Array {
  return maxAbsPeakOf(sliceByCrossings(_buf, start, end, n));
}
