import { watchEffect, ref } from "vue";
import WORKER from "./analysisWorker.js?worker";

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

function callWorker<T = unknown>(cmd: string, args: unknown[]): Promise<T> {
  const id = Math.random().toString(16);

  worker.postMessage([cmd, id, ...args]);
  return new Promise((res) => (pendingRequests[id] = res as any));
}

// === BINDINGS ===

// sets the current worker's default buffer to this one
// this avoids unnecessarily sending the same buffer multiple times
const uploadBuffer = (buf: Float32Array) => callWorker("uploadBuffer", [buf]);

// downscales buf to size, using naive sampling
const downscale = (buf: undefined | Float32Array, size: number) =>
  callWorker<Float32Array>("downscale", [buf, size]);

// assumes input is in the range [-1 ; 1]
const waveformToPath = (buf: undefined | Float32Array, startX = 0, startY = 1000, dx = 1, scaleY = 1000) =>
  callWorker<string>("waveformToPath", [buf, startX, startY, dx, scaleY]);

// === USEFUL REACTIVE STUFF ===

export const wavePath = ref<string>();

watchEffect(async () => {
  if (enableAnalysis.value && buf.value) {
    wavePath.value = undefined;
    await uploadBuffer(buf.value.getChannelData(0));
    wavePath.value = await downscale(undefined, 10000).then(waveformToPath);
  } else {
    wavePath.value = undefined;
  }
});
