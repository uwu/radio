import { ref, watch, watchEffect, type WatchStopHandle } from "vue";
import WORKER from "./analysisWorker.js?worker";
import { seek } from "./audio";

// audio analyzers for people who need constant visual stimulation :D

// === DRIVING STATE ===

export const enableAnalysis = ref(false);
const buf = ref<AudioBuffer>();

let cleanup1: WatchStopHandle;
let cleanup2: WatchStopHandle;
export function setAnalysisBuf(b: AudioBuffer) {
  buf.value = b;
  reset();

  cleanup1?.();
  cleanup1 = watchEffect(async () => {
    cleanup2?.();

    // will cause a brief stutter on song change
    // oh well! we're already repainting the ui
    // without interaction so its not toooo noticeable i figure
    await uploadBuffer(b.getChannelData(0), b.getChannelData(1));
    downscaled.value = await downscale(bufMain, 5000);

    cleanup2 = watchEffect(updateVis);
  });
}

// === WORKER HANDLING CODE ===

const worker = new WORKER(); // wrong type
const pendingRequests: Record<string, (...a: unknown[]) => void> = {};

// init the wasm in the worker
const initPromise = callWorker<void>(0, []);

worker.onmessage = (e) => {
  if (e.data[0] === "ERR") throw new Error(`error in analysis worker: ${e.data[1]}`);
  if (!(e.data[0] in pendingRequests))
    return console.warn("unwanted response from analysis worker, dropping", e.data);

  pendingRequests[e.data[0]](...e.data.slice(1));
  delete pendingRequests[e.data[0]];
};

async function callWorker<T = unknown>(cmd: number, args: unknown[]): Promise<T> {
  if (cmd !== 0) await initPromise;

  const id = Math.random().toString(16);

  worker.postMessage([cmd, id, ...args]);
  return new Promise((res) => (pendingRequests[id] = res as any));
}

// === BINDINGS ===

// sets the current worker's default buffer to this one
// this avoids unnecessarily sending the same buffer multiple times
const uploadBuffer = (buf1: Float32Array, buf2?: Float32Array) => callWorker(1, [buf1, buf2]);

// downscales buf to size, using naive sampling
const downscale = (buf: WasmBuf, size: number) => callWorker<Float32Array>(2, [buf, size]);

// slices a buffer every n zero crossings, and returns the slice with the biggest peak amplitude
const sbcMax = (buf: WasmBuf, start?: number, end?: number, n?: number) =>
  callWorker<Float32Array>(3, [buf, start, end, n]);

// computes the FFT of the buffer in the range
const fft = (buf: WasmBuf, start?: number, end?: number, pad?: number, persistence?: number) =>
  callWorker<Float32Array>(4, [buf, start, end, pad, persistence]);

// gets a slice from buf centered at the point with the given width, padding with zeroes if necessary, and optionally downscales
const centeredSlice = (buf: WasmBuf, pos: number, width: number, downs?: number) =>
  callWorker<Float32Array>(5, [buf, pos, width, downs]);

const samplePeak = (buf: WasmBuf, start?: number, end?: number) =>
  callWorker<number>(6, [buf, start, end]);

const rms = (buf: WasmBuf, start?: number, end?: number) =>
  callWorker<number>(7, [buf, start, end]);

const getGoniometerPoints = (start: number, length: number) =>
  callWorker<Float32Array>(8, [start, length]);

const centeredSpectogram = (buf: WasmBuf, pos: number, width: number, padFft: number, ds: number) =>
  callWorker<Float32Array>(9, [buf, pos, width, padFft, ds]);

type WasmBuf = Float32Array | BUF;

enum BUF {
  L = 1,
  R,
  M,
  S,
}

const bufMain = BUF.M; // most metering is done off this channel
// left side peak & rms metering
const bufM1 = () => (volumeMeteringMidSide.value ? BUF.M : BUF.L);
// right side peak & rms metering
const bufM2 = () => (volumeMeteringMidSide.value ? BUF.S : BUF.R);

// === USEFUL REACTIVE STUFF ===

export const downscaled = ref<Float32Array>();

export const singlePeriod = ref<Float32Array>();

export const fftd = ref<Float32Array>();

export const slice = ref<Float32Array>();

export const currentSpecto = ref<Float32Array>();

export const currentPeakL = ref(0);
export const currentPeakR = ref(0);
export const currentRmsL = ref(0);
export const currentRmsR = ref(0);
export const currentPeakHoldL = ref(0);
export const currentPeakHoldR = ref(0);

export const gonioPoints = ref<Float32Array>();

export const peakDbfsL = () => 20 * Math.log10(currentPeakL.value);
export const peakDbfsR = () => 20 * Math.log10(currentPeakR.value);
export const rmsDbfsL = () => 20 * Math.log10(currentRmsL.value);
export const rmsDbfsR = () => 20 * Math.log10(currentRmsR.value);
export const peakHoldDbfsL = () => 20 * Math.log10(currentPeakHoldL.value);
export const peakHoldDbfsR = () => 20 * Math.log10(currentPeakHoldR.value);

let peakHoldSetTimeL: number;
let peakHoldSetTimeR: number;
let lastGonioIndex = 0;

function reset() {
  downscaled.value = undefined;
  singlePeriod.value = undefined;
  fftd.value = undefined;
  slice.value = undefined;
  currentPeakL.value = 0;
  currentPeakR.value = 0;
  currentPeakHoldL.value = 0;
  currentPeakHoldR.value = 0;
  currentRmsL.value = 0;
  currentRmsR.value = 0;
  gonioPoints.value = undefined;
  lastGonioIndex = 0;
}

// for ui purposes
export const volumeMeteringMidSide = ref(false);

// this is usable directly as a watchEffect() arg.
async function updateVis() {
  if (seek.value === undefined || !enableAnalysis.value) return;

  const seekSamples = seek.value * buf.value!.sampleRate;

  // ignore if we're gonna overflow
  if (seekSamples + 10_000 < buf.value!.length) {
    // more samples = more accuracy, more padding = smoother plot
    fftd.value = (await fft(bufMain, seekSamples, seekSamples + 10_000, 0, 0.8)).map(
      Math.abs,
    );
    singlePeriod.value = await sbcMax(bufMain, seekSamples, seekSamples + 5000, 2);
  } else {
    singlePeriod.value = undefined;
    fftd.value = undefined;
  }

  const s16m = ~~(buf.value!.sampleRate / 30);
  const s300m = ~~(buf.value!.sampleRate * 0.3);
  if (seekSamples - s16m >= 0) {
    const pkl = await samplePeak(bufM1(), seekSamples - s16m, seekSamples);
    const pkr = await samplePeak(bufM2(), seekSamples - s16m, seekSamples);
    currentPeakL.value = Math.max(currentPeakL.value * 0.97, pkl);
    currentPeakR.value = Math.max(currentPeakR.value * 0.97, pkr);

    if (pkl > currentPeakHoldL.value) {
      currentPeakHoldL.value = pkl;
      peakHoldSetTimeL = performance.now();
    }
    if (pkr > currentPeakHoldR.value) {
      currentPeakHoldR.value = pkr;
      peakHoldSetTimeR = performance.now();
    }

    if (performance.now() - peakHoldSetTimeL > 500) {
      currentPeakHoldL.value *= 0.985;
    }
    if (performance.now() - peakHoldSetTimeR > 500) {
      currentPeakHoldR.value *= 0.985;
    }
  }
  if (seekSamples - s300m >= 0) {
    currentRmsL.value = await rms(bufM1(), seekSamples - s300m, seekSamples);
    currentRmsR.value = await rms(bufM2(), seekSamples - s300m, seekSamples);
  }

  const sliceLen = 7.5 * buf.value!.sampleRate;
  slice.value = await centeredSlice(1, seekSamples, sliceLen, 5000);
  //currentSpecto.value = await centeredSpectogram(1, seekSamples, sliceLen, 0, 500);

  if (seekSamples) {
    // max length of 1/30th of a second at 44.1khz, to prevent stutters on copying like half a song back from wasm
    const len = Math.min(seekSamples - lastGonioIndex, 1470);

    gonioPoints.value = await getGoniometerPoints(lastGonioIndex, len);
    lastGonioIndex = seekSamples;
  }
}
