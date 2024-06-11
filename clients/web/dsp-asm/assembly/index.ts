import { FFT } from "./fft";
import {
  f32x4_load,
  f32x4_store,
  listAbsMax_f32,
  listMax_f32_UNCHECKED,
  memcpy_f32,
} from "./fastutils";

// copying arrays across thread boundaries is very expensive, so provide a mechanism to reuse it.
let currentBuf: Float32Array | null;

export function uploadBuf(buf: Float32Array): void {
  currentBuf = buf;
  // reset fft as we have a new buffer
  lastFft = null;
}

export function downscale(_buf: Float32Array | null, size: i32): Float32Array {
  const buf = _buf ? _buf : currentBuf!;
  assert(buf, "cannot pass a null buffer without first uploading a buffer");
  // round chunk up to a multiple of 4
  const fchunkSz = 4 * Math.ceil(<f64>buf.length / <f64>size / 4);
  const nChunks = <i32>Math.floor(<f64>buf.length / fchunkSz);
  const chunkSz = <i32>fchunkSz;

  const res = new Float32Array(nChunks);
  for (let ci = 0; ci < nChunks; ci++) {
    const b = buf.subarray(ci * chunkSz, (ci + 1) * chunkSz);
    // UNSAFE: the length of a chunk is always % 4
    res[ci] = listMax_f32_UNCHECKED(b, b.length);
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
  assert(buf, "cannot pass a null buffer without first uploading a buffer");
  if (start === -1) start = 0;
  if (end === -1) end = buf.length;
  if (pad === -1) pad = 0;

  assert(end < buf.length, "(fft) end must not overflow the buf");

  // min power of 2 that is <= buf.length
  const size = <i32>Math.pow(2, Math.ceil(Math.log2(pad + end - start)));

  const fftInput = new Float32Array(size);

  // copy in buffer
  memcpy_f32(buf, fftInput, start, 0, end - start);

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

  const simdSafeSize = 4 * (out.length / 4);

  for (let i = 0; i < simdSafeSize; i += 4) {
    // out_i = max(res_i, last_i * persistence)
    const persisted = f32x4.mul(f32x4_load(lastFft!, i), f32x4.splat(persistence));
  
    f32x4_store(f32x4.max(f32x4_load(result, i), persisted), out, i);
  }

  // do last few elements
  for (let i = simdSafeSize; i < out.length; i++) {
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
  assert(buf, "cannot pass a null buffer without first uploading a buffer");
  const buffers = new Array<Float32Array>();
  if (start === -1) start = 0;
  if (end === -1) end = buf.length;
  if (n === -1) n = 1;

  assert(end < buf.length, "(slicebycrossings) end must not overflow the buf");

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
  // don't just error because this is a common case with an all zeroes input, so fake a value
  //assert(bufs.length, "(maxAbsPeakOf) cannot pick a max of no items");
  if (!bufs.length) return new Float32Array(0);

  let maxBuf = bufs[0];
  let max: f32 = 0;

  for (let bi = 0; bi < bufs.length; bi++) {
    const b = bufs[bi];

    const chunkMax = listAbsMax_f32(b);

    if (chunkMax < max) continue;
    max = chunkMax;
    maxBuf = b;
  }

  return maxBuf;
}

// sliceByCrossings -> maxAbsPeakOf all in one go as an opt
export function sbcMax(_buf: Float32Array | null, start: i32, end: i32, n: i32): Float32Array {
  return maxAbsPeakOf(sliceByCrossings(_buf, start, end, n));
}

export function centeredSlice(
  _buf: Float32Array | null,
  pos: i32,
  width: i32,
  downs: i32,
): Float32Array {
  const buf = _buf ? _buf : currentBuf!;
  assert(buf, "cannot pass a null buffer without first uploading a buffer");

  const start = pos - width / 2;
  const end = pos + width / 2;

  const padS = start < 0 ? -start : 0;
  const padE = end >= buf.length ? end - buf.length /*+ 1*/ : 0;

  let padded: Float32Array | null;

  // happy path just returns this
  if (padS === 0 && padE === 0) {
    padded = buf.subarray(start, end);
  } else {
    // unhappy path - we need to pad it!
    padded = new Float32Array(width);
    memcpy_f32(buf, padded, start < 0 ? 0 : start, padS, width - padE - padS);
  }

  // TODO: fix shimmering due to downscaling
  // increasing the downs size enough to remove shimmering while scrolling is too slow
  return downs == -1 ? padded : downscale(padded, downs);
}
