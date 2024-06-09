import { watchEffect, ref, type WatchStopHandle } from "vue";
import WORKER from "./analysisWorker.js?worker";
import { seek } from "./audio";

// audio analyzers for people who need constant visual stimulation :D

// === DRIVING STATE ===

export const enableAnalysis = ref(false);
const buf = ref<AudioBuffer>();

export function setAnalysisBuf(b: AudioBuffer) {
  buf.value = b;
}

// === WORKER HANDLING CODE ===

const worker = new WORKER(); // wrong type
const pendingRequests: Record<string, (...a: unknown[]) => void> = {};

worker.onmessage = (e) => {
  if (e.data[0] === "ERR") throw new Error(`error in analysis worker: ${e.data[1]}`);
  if (!(e.data[0] in pendingRequests))
    return console.warn("unwanted response from analysis worker, dropping", e.data);

  pendingRequests[e.data[0]](...e.data.slice(1));
  delete pendingRequests[e.data[0]];
};

function callWorker<T = unknown>(cmd: number, args: unknown[]): Promise<T> {
  const id = Math.random().toString(16);

  worker.postMessage([cmd, id, ...args]);
  return new Promise((res) => (pendingRequests[id] = res as any));
}

// init the wasm in the worker
const initPromise = callWorker<void>(7, []);

// === BINDINGS ===

// sets the current worker's default buffer to this one
// this avoids unnecessarily sending the same buffer multiple times
const uploadBuffer = (buf: Float32Array) => callWorker(0, [buf]);

// downscales buf to size, using naive sampling
const downscale = (buf: undefined | Float32Array, size: number) =>
  callWorker<Float32Array>(1, [buf, size]);

/*// trims a buffer down to get only the next n zero-crossings
const getNCrossings = (buf: undefined | Float32Array, start: number, n: number) =>
  callWorker<Float32Array>(2, [buf, start, n]);*/

/*// slice a buffer at the zero crossings
const sliceByCrossings = (buf: undefined | Float32Array, start?: number, end?: number) =>
  callWorker<Float32Array[]>(4, [buf, start, end]);*/

/*// gets the buffer from the array with the maximum peak
const maxAbsPeakOf = (bufs: Float32Array[]) => callWorker<Float32Array>(3, [bufs]);*/

// sliceByCrossings >> maxAbsPeakOf, saves copying unnecessary bufs
const sbcMax = (buf: undefined | Float32Array, start?: number, end?: number) =>
  callWorker<Float32Array>(5, [buf, start, end]);

// computes the FFT of the buffer in the range
const fft = (buf: undefined | Float32Array, start?: number, end?: number, pad?: number) =>
  callWorker<Float32Array>(6, [buf, start, end, pad]);

// === USEFUL REACTIVE STUFF ===

export const downscaled = ref<Float32Array>();

export const singlePeriod = ref<Float32Array>();

export const fftd = ref<Float32Array>();

const innerCleanups: WatchStopHandle[] = [];
watchEffect(async () => {
  if (enableAnalysis.value && buf.value) {
    await initPromise;

    innerCleanups.forEach((c) => c());

    downscaled.value = undefined;
    await uploadBuffer(buf.value.getChannelData(0));
    downscaled.value = await downscale(undefined, 1000);

    innerCleanups.push(
      watchEffect(async () => {
        // 2 crossings for a full waveform
        if (seek.value === undefined) return;
        const seekSamples = seek.value * buf.value!.sampleRate;
        // more samples = more accuracy, more padding = smoother plot
        const seekEndSamples = seekSamples + 5000;
        const pad = 0;

        fftd.value = (await fft(undefined, seekSamples, seekEndSamples, pad)).map(Math.abs);
        singlePeriod.value = await sbcMax(undefined, seekSamples, seekEndSamples);
      }),
    );
  } else {
    downscaled.value = undefined;
  }
});
