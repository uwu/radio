import wasmUrl from "../dsp-asm/build/release.wasm?url";
import { instantiate } from "../dsp-asm/build/release.js";

let wasmDS, wasmFFT, wasmUpload, wasmSbcMax, init;

function wasmInit() {
  if (init) return init;
  return (init = WebAssembly.compileStreaming(fetch(wasmUrl))
    .then(instantiate)
    .then(({ downscale, fft, uploadBuf, sbcMax }) => {
      wasmDS = downscale;
      wasmFFT = fft;
      wasmUpload = uploadBuf;
      wasmSbcMax = sbcMax;
    }));
}

/** @param {Float32Array} buf */
function uploadBuffer(buf) {
  wasmUpload(buf);
}

/** @param {Float32Array} buf
 * @param {number} size
 * @returns Float32Array */
function downscale(buf, size) {
  return wasmDS(buf, size);
}

// maxAbsPeakOf(sliceByCrossings(...))
function sbcMax(buf, start, end, n) {
  return wasmSbcMax(buf, start ?? -1, end ?? -1, n ?? -1);
}

/** @param {Float32Array} buf
 * @param {number} start
 * @param {number} end
 * @param {number} pad
 * @param {number} n
 * @returns {Float32Array} */
function fft(buf, start, end, pad) {
  return wasmFFT(buf, start ?? -1, end ?? -1, pad ?? -1);
}

onmessage = (e) => {
  // rip type safety
  const func = [
    wasmInit,
    uploadBuffer,
    downscale,
    sbcMax,
    fft,
  ][e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  const res = func(...e.data.slice(2));
  if (res instanceof Promise) res.then((r) => postMessage([e.data[1], r]))
  else postMessage([e.data[1], res]);
};
