import { ref, watchEffect, type WatchStopHandle } from "vue";
import WORKER from "./analysisWorker.js?worker";
import { seek } from "./audio";

// audio analyzers for people who need constant visual stimulation :D

// === DRIVING STATE ===

export const enableAnalysis = ref(false);
const buf = ref<AudioBuffer>();

export function setAnalysisBuf(b: AudioBuffer) {
  buf.value = b;
  reset();
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
const uploadBuffer = (buf: Float32Array) => callWorker(1, [buf]);

// downscales buf to size, using naive sampling
const downscale = (buf: undefined | Float32Array, size: number) =>
  callWorker<Float32Array>(2, [buf, size]);

// slices a buffer every n zero crossings, and returns the slice with the biggest peak amplitude
const sbcMax = (buf: undefined | Float32Array, start?: number, end?: number, n?: number) =>
  callWorker<Float32Array>(3, [buf, start, end, n]);

// computes the FFT of the buffer in the range
const fft = (
  buf: undefined | Float32Array,
  start?: number,
  end?: number,
  pad?: number,
  persistence?: number,
) => callWorker<Float32Array>(4, [buf, start, end, pad, persistence]);

// gets a slice from buf centered at the point with the given width, padding with zeroes if necessary, and optionally downscales
const centeredSlice = (buf: undefined | Float32Array, pos: number, width: number, downs?: number) =>
  callWorker<Float32Array>(5, [buf, pos, width, downs]);

const samplePeak = (buf: undefined | Float32Array, start?: number, end?: number) =>
  callWorker<number>(6, [buf, start, end]);

const rms = (buf: undefined | Float32Array, start?: number, end?: number) =>
  callWorker<number>(7, [buf, start, end]);

// === USEFUL REACTIVE STUFF ===

export const downscaled = ref<Float32Array>();

export const singlePeriod = ref<Float32Array>();

export const fftd = ref<Float32Array>();

export const slice = ref<Float32Array>();

export const currentPeak = ref(0);
export const currentRms = ref(0);

export const peakDbfs = () => 20 * Math.log10(currentPeak.value);
export const rmsDbfs = () => 20 * Math.log10(currentRms.value);

function reset() {
  downscaled.value = undefined;
  singlePeriod.value = undefined;
  fftd.value = undefined;
  slice.value = undefined;
  currentPeak.value = 0;
  currentRms.value = 0;
}

const innerCleanups: WatchStopHandle[] = [];
watchEffect(async () => {
  innerCleanups.forEach((c) => c());
  if (enableAnalysis.value && buf.value) {
    downscaled.value = undefined;
    await uploadBuffer(buf.value.getChannelData(0));
    downscaled.value = await downscale(undefined, 5000);

    innerCleanups.push(
      watchEffect(async () => {
        if (seek.value === undefined) return;

        const seekSamples = seek.value * buf.value!.sampleRate;

        // ignore if we're gonna overflow
        if (seekSamples + 10_000 < buf.value!.length) {
          // more samples = more accuracy, more padding = smoother plot
          fftd.value = (await fft(undefined, seekSamples, seekSamples + 10_000, 0, 0.8)).map(
            Math.abs,
          );
          singlePeriod.value = await sbcMax(undefined, seekSamples, seekSamples + 5000, 2);
        } else {
          singlePeriod.value = undefined;
          fftd.value = undefined;
        }

        const s16m = ~~(buf.value!.sampleRate / 60);
        const s300m = ~~(buf.value!.sampleRate * 0.3);
        if (seekSamples - s16m >= 0) {
          const pk = await samplePeak(undefined, seekSamples - s16m, seekSamples);
          currentPeak.value = Math.max(currentPeak.value * 0.9, pk);
        }
        if (seekSamples - s300m >= 0) {
          currentRms.value = await rms(undefined, seekSamples - s300m, seekSamples);
        }

        const sliceLen = 7.5 * buf.value!.sampleRate;
        slice.value = await centeredSlice(undefined, seekSamples, sliceLen, 5_000);
      }),
    );
  } else reset();
});
