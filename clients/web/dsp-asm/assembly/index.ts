import { FFT } from "./fft";
import {
  f32x4_load,
  f32x4_store,
  listAbsMax_f32,
  listMax_f32,
  listNeg_f32,
  listSqSum_f32,
  memcpy_f32,
} from "./fastutils";

// copying arrays across thread boundaries is very expensive, so provide a mechanism to reuse it.
let currentBuf1: Float32Array | null; // left
let currentBuf2: Float32Array | null; // right
let currentBuf3: Float32Array | null; // mid
let currentBuf4: Float32Array | null; // side

let lastFft: Float32Array | null;

// common logic for bsel, _buf params
function resolveBuffer(bsel: i32, _b: null | Float32Array): Float32Array {
  switch (bsel) {
    case 0:
      assert(_b, "cannot pass null buffer and use it");
      return _b!;

    case 1:
      assert(currentBuf1, "cannot try to use buffer 1 when its not uploaded");
      return currentBuf1!;

    case 2:
      assert(currentBuf2, "cannot try to use buffer 2 when its not uploaded");
      return currentBuf2!;

    case 3:
      assert(currentBuf3, "cannot try to use buffer 3 when its not set");
      return currentBuf3!;

    case 4:
      assert(currentBuf4, "cannot try to use buffer 4 when its not set");
      return currentBuf4!;

    default:
      assert(false, "cannot try to use a buffer selection value outside than 0-4 inclusive");
      return null!; // for static analysis
  }
}

export function uploadBuf(buf1: Float32Array, buf2: null | Float32Array): void {
  currentBuf1 = buf1;
  if (buf2) currentBuf2 = buf2;
  // reset fft as we have a new buffer
  lastFft = null;
  // fill buffers 3 & 4
  calcMidSide();
}

function calcMidSide(): void {
  assert(currentBuf1, "both buffers must be in place to swap them to M-S");
  assert(currentBuf2, "both buffers must be in place to swap them to M-S");
  assert(
    currentBuf1!.length === currentBuf2!.length,
    "both buffers must be the same size to swap them to M-S",
  );

  currentBuf3 = new Float32Array(currentBuf1!.length);
  currentBuf4 = new Float32Array(currentBuf1!.length);

  // unsafe simd stuff here because this feels way too specific to go in fastutils?
  const simdSafeLen = 4 * (currentBuf1!.length / 4);

  for (let i = 0; i < simdSafeLen; i += 4) {
    const s1 = f32x4_load(currentBuf1!, i);
    const s2 = f32x4_load(currentBuf2!, i);

    f32x4_store(f32x4.div(f32x4.add(s1, s2), f32x4.splat(2)), currentBuf3!, i);
    f32x4_store(f32x4.div(f32x4.sub(s1, s2), f32x4.splat(2)), currentBuf4!, i);
  }

  for (let i = simdSafeLen; i < currentBuf1!.length; i++) {
    const s1 = currentBuf1![i];
    const s2 = currentBuf2![i];
    currentBuf3![i] = (s1 + s2) / 2;
    currentBuf4![i] = (s1 - s2) / 2;
  }
}

export function downscale(bsel: i32, _buf: Float32Array | null, size: i32, ash: i32): Float32Array {
  const buf = resolveBuffer(bsel, _buf);

  // part of the scrolling waveform's anti-shimmer measures
  if (ash < 0) ash = 0;

  // round chunk up to a multiple of 4
  // this increases the # of chunks that are maxed *entirely* with simd
  const fchunkSz = 4 * Math.ceil(<f64>buf.length / <f64>size / 4);
  const nChunks = <i32>Math.floor(<f64>buf.length / fchunkSz);
  const chunkSz = <i32>fchunkSz;

  ash %= chunkSz; // the caller does not know the chunk size, so `ash` is likely to be huge
  ash = -ash; // counteract scrolling motion (i think this is the correct direction?)

  const res = new Float32Array(nChunks);
  for (let ci = 0; ci < nChunks; ci++) {
    const b = buf.subarray(ci * chunkSz + ash, (ci + 1) * chunkSz + ash);
    if (b.length) {
      res[ci] = listMax_f32(b);
    } // TODO: why?
  }

  return res;
}

export function fft(
  bsel: i32,
  _buf: Float32Array | null,
  start: i32,
  end: i32,
  pad: i32,
  persistence: f32,
): Float32Array {
  const buf = resolveBuffer(bsel, _buf);
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
  bsel: i32,
  _buf: Float32Array | null,
  start: i32,
  end: i32,
  n: i32,
): Array<Float32Array> {
  const buf = resolveBuffer(bsel, _buf);
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

function maxBufLength(bufs: Array<Float32Array>): Float32Array {
  // don't just error because this is a common case with an all zeroes input, so fake a value
  //assert(bufs.length, "(maxAbsPeakOf) cannot pick a max of no items");
  if (!bufs.length) return new Float32Array(0);

  let maxBuf = bufs[0];
  let max: i32 = 0;

  for (let bi = 0; bi < bufs.length; bi++) {
    const b = bufs[bi];

    if (b.length < max) continue;
    max = b.length;
    maxBuf = b;
  }

  // attempt to normalize wave phase - take the sample 1/4 of the way in and make it positive
  // this should always give an up-then-down motion
  if (maxBuf[maxBuf.length / 4] < 0) listNeg_f32(maxBuf);

  return maxBuf;
}

// sliceByCrossings -> maxBufLength all in one go as an opt
export function sbcMax(
  bsel: i32,
  _buf: Float32Array | null,
  start: i32,
  end: i32,
  n: i32,
): Float32Array {
  return maxBufLength(sliceByCrossings(bsel, _buf, start, end, n));
}

export function centeredSlice(
  bsel: i32,
  _buf: Float32Array | null,
  pos: i32,
  width: i32,
  downs: i32,
): Float32Array {
  const buf = resolveBuffer(bsel, _buf);

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

  // offset scrolls the chunks used for downscaling with the wave to fix shimmering
  // increasing the downs size enough to remove shimmering while scrolling is too slow
  return downs == -1 ? padded : downscale(0, padded, downs, pos);
}

export function samplePeak(bsel: i32, _buf: Float32Array | null, start: i32, end: i32): f32 {
  const buf = resolveBuffer(bsel, _buf);
  if (start < 1) start = 0;
  if (end < 1) end = buf.length;

  return listAbsMax_f32(buf.subarray(start, end));
}

export function rms(bsel: i32, _buf: Float32Array | null, start: i32, end: i32): f32 {
  const buf = resolveBuffer(bsel, _buf);
  if (start < 1) start = 0;
  if (end < 1) end = buf.length;

  // root-mean-square is [the root of [the mean of [the squares]]]
  return Mathf.sqrt(listSqSum_f32(buf.subarray(start, end)) / <f32>(end - start));
}

export function getGoniometerPoints(start: i32, length: i32/*, points: i32*/): Float32Array {
  /*let start = <i64>_start;
  let length = <i64>_length;*/

  if (start < 0) start = 0;
  assert(length > 0, "length must be > 0");

  assert(currentBuf3, "M channel must be set");
  assert(currentBuf4, "S channel must be set");
  assert(currentBuf3!.length === currentBuf4!.length, "channel sizes must match");

  assert(start >= 0, "start must not underflow");
  assert(start + length < currentBuf3!.length, "end must not overflow");

  const output = new Float32Array(length * 2/*points * 2*/);

  // i had overflow errors before within the math for sampling
  /*const sta64 = <i64>start;
  const len64 = <i64>length;
  const pts64 = <i64>points;*/

  for (let i = 0; i < length; i++) {
    const inputI = start + i; /*sta64 + <i64>((<i64>i * len64) / pts64);*/

    assert(inputI >= 0, "inputI underflowed");
    assert(inputI < currentBuf3!.length, "inputI will overflow");
    assert(inputI <= i32.MAX_VALUE, "inputI is bigger than an i32");

    output[i * 2] = currentBuf3![<i32>inputI];
    output[i * 2 + 1] = currentBuf4![<i32>inputI];
  }

  return output;
}
