import wasmUrl from "../dsp-asm/build/release.wasm?url";
import { instantiate } from "../dsp-asm/build/release.js";

let wasmDS,
  wasmFFT,
  wasmUpload,
  wasmSbcMax,
  wasmCentSlic,
  wasmSamPk,
  wasmRms,
  wasmGonio,
  wasmSpecto,
  init;

function wasmInit() {
  if (init) return init;
  return (init = WebAssembly.compileStreaming(fetch(wasmUrl))
    .then(instantiate)
    .then(
      ({
        downscale,
        fft,
        uploadBuf,
        sbcMax,
        centeredSlice,
        samplePeak,
        rms,
        getGoniometerPoints,
        centeredSpectogram,
      }) => {
        wasmDS = downscale;
        wasmFFT = fft;
        wasmUpload = uploadBuf;
        wasmSbcMax = sbcMax;
        wasmCentSlic = centeredSlice;
        wasmSamPk = samplePeak;
        wasmRms = rms;
        wasmGonio = getGoniometerPoints;
        wasmSpecto = centeredSpectogram;
      },
    ));
}

const bsel = (buf) => (typeof buf === "number" ? buf : 0);
const bval = (buf) => (typeof buf === "number" ? undefined : buf);

const uploadBuffer = (buf1, buf2) => wasmUpload(buf1, buf2);

const downscale = (buf, size) => wasmDS(bsel(buf), bval(buf), size, -1); // -1 to disable antishimmer

const sbcMax = (buf, start, end, n) =>
  wasmSbcMax(bsel(buf), bval(buf), start ?? -1, end ?? -1, n ?? -1);

const fft = (buf, start, end, pad, persistence) =>
  wasmFFT(bsel(buf), bval(buf), start ?? -1, end ?? -1, pad ?? -1, persistence ?? 0);

const centeredSlice = (buf, pos, width, downs) =>
  wasmCentSlic(bsel(buf), bval(buf), pos, width, downs ?? -1);

const samplePeak = (buf, start, end) => wasmSamPk(bsel(buf), bval(buf), start ?? -1, end ?? -1);

const rms = (buf, start, end) => wasmRms(bsel(buf), bval(buf), start ?? -1, end ?? -1);

const getGoniometerPoints = (start, length) => wasmGonio(start, length);

const centeredSpectogram = (buf, pos, width, padFft, ds) =>
  wasmSpecto(bsel(buf), bval(buf), pos, width, padFft, ds);

onmessage = (e) => {
  // rip type safety
  const func = [
    wasmInit,
    uploadBuffer,
    downscale,
    sbcMax,
    fft,
    centeredSlice,
    samplePeak,
    rms,
    getGoniometerPoints,
    centeredSpectogram,
  ][e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  const res = func(...e.data.slice(2));
  if (res instanceof Promise) res.then((r) => postMessage([e.data[1], r]));
  else postMessage([e.data[1], res]);
};
