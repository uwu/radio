//import { downscale as wasmDS, fft as wasmFFT } from "../dsp-asm/build/release.js";
// init wasm
import wasmUrl from "../dsp-asm/build/release.wasm?url";
import { instantiate } from "../dsp-asm/build/release.js";

let wasmDS, wasmFFT, init;

function wasmInit() {
  if (init) return init;
  return (init = WebAssembly.compileStreaming(fetch(wasmUrl))
    .then(instantiate)
    .then(({ downscale, fft }) => {
      wasmDS = downscale;
      wasmFFT = fft;
    }));
}

// avoid uploading the same buffer a ton of times
let currentBuffer = new Float32Array(0);

/** @param {Float32Array} buf */
function uploadBuffer(buf) {
  currentBuffer = buf;
}

/** @param {Float32Array} buf
 * @param {number} size
 * @returns Float32Array */
function downscale(buf, size) {
  buf ??= currentBuffer;

  return wasmDS(buf, size);
}

/** @param {Float32Array} buf
 * @param {number} start The number of samples into the buffer to start looking from
 * @param {number} n The amount of zero crossings to include
 * @returns Float32Array */
/*function getNCrossings(buf, start, n) {
  /!** @param {number} n
   * @returns number*!/
  function nextCrossingIdx(n) {
    let done = false;
    do {
      n++;
      let signChanged = (buf[n - 1] > 0) !== (buf[n] > 0);
      done = signChanged;
    } while (!done);
    return n;
  }

  buf ??= currentBuffer;

  // find first crossing
  let c1 = nextCrossingIdx(start);

  // find end
  let end = c1;
  for (let i = 0; i < n; i++) end = nextCrossingIdx(end);

  return buf.slice(c1, end);
}*/

/** @param {Float32Array} buf
 * @param {number} start
 * @param {number} end
 * @returns Float32Array[] */
function sliceByCrossings(buf, start, end) {
  const buffers = [];
  buf ??= currentBuffer;
  start ??= 0;
  end ??= buf.length;

  let startNext = start; // the start of the next buffer to be sliced
  let isPos = buf[start] > 0; // was the last sample positive?

  for (let i = start + 1; i < end; i++) {
    const thisSampPos = buf[i] > 0;
    if (isPos !== thisSampPos) {
      // flip!
      buffers.push(buf.slice(startNext, i));
      startNext = i;
    }
    isPos = thisSampPos;
  }

  return buffers;
}

/** @param {Float32Array[]} bufs
 * @returns Float32Array */
function maxAbsPeakOf(bufs) {
  let m = 0;
  let mb = bufs[0];
  for (const buf of bufs)
    for (const sample of buf) {
      m = Math.max(m, Math.abs(sample));
      mb = buf;
    }

  return mb;
}

// maxAbsPeakOf(sliceByCrossings(...))
function sbcMax(buf, start, end) {
  return maxAbsPeakOf(sliceByCrossings(buf, start, end));
}

/** @param {Float32Array} buf
 * @param {number} start
 * @param {number} end
 * @param {number} pad
 * @returns {Float32Array} */
function fft(buf, start, end, pad) {
  buf ??= currentBuffer;
  start ??= -1;
  end ??= -1;
  pad ??= -1;

  return wasmFFT(buf, start, end, pad);
}

onmessage = (e) => {
  // rip type safety
  const func = [
    uploadBuffer,
    downscale,
    /*getNCrossings*/ undefined,
    /*maxAbsPeakOf*/ undefined,
    /*sliceByCrossings*/ undefined,
    sbcMax,
    fft,
    wasmInit,
  ][e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  const res = func(...e.data.slice(2));
  if (res instanceof Promise) res.then((r) => postMessage([e.data[1], r]))
  else postMessage([e.data[1], res]);
};
