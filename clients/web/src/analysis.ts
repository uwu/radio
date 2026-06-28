import { ref, watch, watchEffect, type WatchStopHandle } from "vue";
import WORKER from "./analysisWorker.js?worker";
import { seek } from "./audio";

// audio analyzers for people who need constant visual stimulation :D

// === DRIVING STATE ===

export const enableAnalysis = ref(false);
const buf = ref<AudioBuffer>();
let moodbarBuildToken = 0;

let cleanup1: WatchStopHandle;
let cleanup2: WatchStopHandle;
export function setAnalysisBuf(b: AudioBuffer) {
  const buildToken = ++moodbarBuildToken;
  buf.value = b;
  reset();

  cleanup1?.();
  cleanup1 = watchEffect(async () => {
    cleanup2?.();
    const left = b.getChannelData(0);
    const right = b.numberOfChannels > 1 ? b.getChannelData(1) : left;

    // will cause a brief stutter on song change
    // oh well! we're already repainting the ui
    // without interaction so its not toooo noticeable i figure
    await uploadBuffer(left, right, b.sampleRate);
    if (buildToken !== moodbarBuildToken) return;

    const scaled = await downscale(bufMain, 5000);
    if (buildToken !== moodbarBuildToken) return;

    downscaled.value = scaled;
    void buildMoodbar(1000).then((data) => {
      if (buildToken === moodbarBuildToken && data.length) {
        moodbar.value = data;
      }
    });

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
const uploadBuffer = (buf1: Float32Array, buf2?: Float32Array, sampleRate?: number) =>
  callWorker(1, [buf1, buf2, sampleRate]);

// downscales buf to size, using naive sampling
const downscale = (buf: WasmBuf, size: number) => callWorker<Float32Array>(2, [buf, size]);

const buildMoodbar = (width: number) => callWorker<Uint8ClampedArray>(10, [width]);

const samplePeak = (buf: WasmBuf, start?: number, end?: number) =>
  callWorker<number>(6, [buf, start, end]);

const rms = (buf: WasmBuf, start?: number, end?: number) =>
  callWorker<number>(7, [buf, start, end]);

const getGoniometerPoints = (start: number, length: number) =>
  callWorker<Float32Array>(8, [start, length]);

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
export const moodbar = ref<Uint8ClampedArray>();

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
let updateRunning = false;
let updateQueued = false;
let lastPeakUpdateAt = 0;
let lastRmsUpdateAt = 0;
let lastGonioUpdateAt = 0;

const PEAK_UPDATE_MS = 33;
const RMS_UPDATE_MS = 100;
const GONIO_UPDATE_MS = 33;

function reset() {
  downscaled.value = undefined;
  moodbar.value = undefined;
  currentPeakL.value = 0;
  currentPeakR.value = 0;
  currentPeakHoldL.value = 0;
  currentPeakHoldR.value = 0;
  currentRmsL.value = 0;
  currentRmsR.value = 0;
  gonioPoints.value = undefined;
  lastGonioIndex = 0;
  updateQueued = false;
  lastPeakUpdateAt = 0;
  lastRmsUpdateAt = 0;
  lastGonioUpdateAt = 0;
}

// for ui purposes
export const volumeMeteringMidSide = ref(false);

async function updateVisFrame() {
  if (seek.value === undefined || !enableAnalysis.value) return;

  const now = performance.now();
  const seekSamples = Math.floor(seek.value * buf.value!.sampleRate);

  const s16m = ~~(buf.value!.sampleRate / 30);
  const s300m = ~~(buf.value!.sampleRate * 0.3);
  if (now - lastPeakUpdateAt >= PEAK_UPDATE_MS && seekSamples - s16m >= 0) {
    lastPeakUpdateAt = now;
    const [pkl, pkr] = await Promise.all([
      samplePeak(bufM1(), seekSamples - s16m, seekSamples),
      samplePeak(bufM2(), seekSamples - s16m, seekSamples),
    ]);
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

  if (now - lastRmsUpdateAt >= RMS_UPDATE_MS && seekSamples - s300m >= 0) {
    lastRmsUpdateAt = now;
    const [rmsL, rmsR] = await Promise.all([
      rms(bufM1(), seekSamples - s300m, seekSamples),
      rms(bufM2(), seekSamples - s300m, seekSamples),
    ]);
    currentRmsL.value = rmsL;
    currentRmsR.value = rmsR;
  }

  if (now - lastGonioUpdateAt >= GONIO_UPDATE_MS && seekSamples) {
    lastGonioUpdateAt = now;
    if (seekSamples < lastGonioIndex || seekSamples - lastGonioIndex > buf.value!.sampleRate) {
      lastGonioIndex = Math.max(0, seekSamples - 1470);
    }

    // max length of 1/30th of a second at 44.1khz, to prevent stutters on copying like half a song back from wasm
    const available = Math.max(0, buf.value!.length - 1 - lastGonioIndex);
    const len = Math.min(seekSamples - lastGonioIndex, 1470, available);

    if (len > 0) {
      gonioPoints.value = await getGoniometerPoints(lastGonioIndex, len);
      lastGonioIndex = seekSamples;
    }
  }
}

// this is usable directly as a watchEffect() arg.
async function updateVis() {
  const enabled = enableAnalysis.value;
  const currentSeek = seek.value;
  const currentBuf = buf.value;
  volumeMeteringMidSide.value;

  if (!enabled || currentSeek === undefined || !currentBuf) return;

  if (updateRunning) {
    updateQueued = true;
    return;
  }

  updateRunning = true;
  try {
    do {
      updateQueued = false;
      await updateVisFrame();
    } while (updateQueued && enableAnalysis.value);
  } finally {
    updateRunning = false;
  }
}
