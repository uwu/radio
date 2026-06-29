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

const MOODBAR_BANDS = 128;
const MOODBAR_FFT_SIZE = 256;
const MOODBAR_INTERVAL_SECONDS = 0.1;
const MOODBAR_MAX_FFTS_PER_INTERVAL = 16;
const MOODBAR_MID_BUFFER = 3;
const MOODBAR_BARK_BANDS = [
  100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700,
  4400, 5300, 6400, 7700, 9500, 12000, 15500,
];

let moodbarLeft;
let moodbarRight;
let moodbarSampleRate = 44100;
let moodbarGeneration = 0;
let moodbarRequest = 0;
let moodbarWindow;

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

const yieldWorker = () => new Promise((resolve) => setTimeout(resolve, 0));

function readMoodbarSample(index) {
  if (!moodbarLeft || index < 0 || index >= moodbarLeft.length) return 0;

  const left = moodbarLeft[index];
  const right =
    moodbarRight && index < moodbarRight.length ? moodbarRight[index] : moodbarLeft[index];

  return (left + right) * 0.5;
}

function createMoodbarWindow(start) {
  moodbarWindow ??= new Float32Array(MOODBAR_FFT_SIZE);

  for (let i = 0; i < MOODBAR_FFT_SIZE; i++) {
    moodbarWindow[i] = readMoodbarSample(start + i);
  }

  return moodbarWindow;
}

function moodbarFft(start) {
  const end = start + MOODBAR_FFT_SIZE;
  if (start >= 0 && end <= moodbarLeft.length) {
    return wasmFFT(MOODBAR_MID_BUFFER, undefined, start, end, 0, 0);
  }

  return wasmFFT(0, createMoodbarWindow(start), 0, MOODBAR_FFT_SIZE, 0, 0);
}

function addSpectrum(start, magnitudes) {
  const spectrum = moodbarFft(start);

  const scale = MOODBAR_FFT_SIZE * MOODBAR_FFT_SIZE;
  for (let band = 0; band < MOODBAR_BANDS; band++) {
    const offset = band * 2;
    const real = spectrum[offset];
    const imaginary = spectrum[offset + 1];
    magnitudes[band] += (real * real + imaginary * imaginary) / scale;
  }
}

function bandFrequency(band, bands, sampleRate) {
  return Math.trunc((Math.trunc(sampleRate / 2) * band + Math.trunc(sampleRate / 4)) / bands);
}

function createBarkBandTable(bands, sampleRate) {
  const table = new Uint8Array(bands + 1);
  let barkband = 0;

  for (let i = 0; i < bands + 1; i++) {
    if (
      barkband < MOODBAR_BARK_BANDS.length - 1 &&
      bandFrequency(i, bands, sampleRate) >= MOODBAR_BARK_BANDS[barkband]
    ) {
      barkband++;
    }

    table[i] = barkband;
  }

  return table;
}

function writeMoodbarFrame(frames, frameIndex, magnitudes, barkBandTable, barkMagnitudes) {
  barkMagnitudes.fill(0);

  for (let i = 0; i < MOODBAR_BANDS; i++) {
    barkMagnitudes[barkBandTable[i]] += magnitudes[i];
  }

  let red = 0;
  let green = 0;
  let blue = 0;

  for (let i = 0; i < MOODBAR_BARK_BANDS.length; i++) {
    const value = barkMagnitudes[i] * barkMagnitudes[i];
    const channel = Math.floor((i * 3) / MOODBAR_BARK_BANDS.length);

    if (channel === 0) red += value;
    else if (channel === 1) green += value;
    else blue += value;
  }

  const offset = frameIndex * 3;
  frames[offset] = Math.sqrt(red);
  frames[offset + 1] = Math.sqrt(green);
  frames[offset + 2] = Math.sqrt(blue);
}

function normalizeMoodbarChannel(frames, frameCount, channel) {
  let mini = frames[channel];
  let maxi = frames[channel];

  for (let i = 1; i < frameCount; i++) {
    const value = frames[i * 3 + channel];
    if (value > maxi) maxi = value;
    else if (value < mini) mini = value;
  }

  let avg = 0;
  for (let i = 0; i < frameCount; i++) {
    const value = frames[i * 3 + channel];
    if (value !== mini && value !== maxi) avg += value / frameCount;
  }

  let tu = 0;
  let tb = 0;
  let avgu = 0;
  let avgb = 0;

  for (let i = 0; i < frameCount; i++) {
    const value = frames[i * 3 + channel];
    if (value === mini || value === maxi) continue;

    if (value > avg) {
      avgu += value;
      tu++;
    } else {
      avgb += value;
      tb++;
    }
  }

  avgu = tu ? avgu / tu : avg;
  avgb = tb ? avgb / tb : avg;

  tu = 0;
  tb = 0;
  let avguu = 0;
  let avgbb = 0;

  for (let i = 0; i < frameCount; i++) {
    const value = frames[i * 3 + channel];
    if (value === mini || value === maxi) continue;

    if (value > avgu) {
      avguu += value;
      tu++;
    } else if (value < avgb) {
      avgbb += value;
      tb++;
    }
  }

  avguu = tu ? avguu / tu : avgu;
  avgbb = tb ? avgbb / tb : avgb;

  mini = Math.max(avg + (avgb - avg) * 2, avgbb);
  maxi = Math.min(avg + (avgu - avg) * 2, avguu);

  let delta = maxi - mini;
  if (!Number.isFinite(delta) || delta === 0) delta = 1;

  for (let i = 0; i < frameCount; i++) {
    const offset = i * 3 + channel;
    const value = frames[offset];
    frames[offset] = Number.isFinite(value) ? Math.max(0, Math.min((value - mini) / delta, 1)) : 0;
  }
}

function finishMoodbar(frames, frameCount, width) {
  const data = new Uint8ClampedArray(width * 3);
  if (!frameCount) return data;

  normalizeMoodbarChannel(frames, frameCount, 0);
  normalizeMoodbarChannel(frames, frameCount, 1);
  normalizeMoodbarChannel(frames, frameCount, 2);

  for (let i = 0; i < width; i++) {
    let start = Math.floor((i * frameCount) / width);
    let end = Math.floor(((i + 1) * frameCount) / width);
    if (start === end) end = start + 1;
    end = Math.min(end, frameCount);

    let red = 0;
    let green = 0;
    let blue = 0;

    for (let frame = start; frame < end; frame++) {
      const offset = frame * 3;
      red += frames[offset] * 255;
      green += frames[offset + 1] * 255;
      blue += frames[offset + 2] * 255;
    }

    const n = end - start;
    const offset = i * 3;
    data[offset] = Math.floor(red / n);
    data[offset + 1] = Math.floor(green / n);
    data[offset + 2] = Math.floor(blue / n);
  }

  return data;
}

async function buildMoodbar(width = 1000) {
  const left = moodbarLeft;
  if (!left?.length) return new Uint8ClampedArray(0);

  const generation = moodbarGeneration;
  const request = ++moodbarRequest;
  const sampleRate = moodbarSampleRate || 44100;
  const framesPerInterval = Math.max(1, Math.floor(sampleRate * MOODBAR_INTERVAL_SECONDS));
  const frameCount = Math.max(1, Math.ceil(left.length / framesPerInterval));
  const frames = new Float64Array(frameCount * 3);
  const magnitudes = new Float64Array(MOODBAR_BANDS);
  const barkMagnitudes = new Float64Array(MOODBAR_BARK_BANDS.length);
  const barkBandTable = createBarkBandTable(MOODBAR_BANDS, sampleRate);

  for (let frame = 0; frame < frameCount; frame++) {
    if (generation !== moodbarGeneration || request !== moodbarRequest) {
      return new Uint8ClampedArray(0);
    }

    magnitudes.fill(0);

    const intervalStart = frame * framesPerInterval;
    const intervalEnd = Math.min(left.length, intervalStart + framesPerInterval);
    const possibleFfts = Math.floor((intervalEnd - intervalStart) / MOODBAR_FFT_SIZE);
    const fftCount = Math.min(possibleFfts, MOODBAR_MAX_FFTS_PER_INTERVAL);

    if (fftCount > 0) {
      for (let i = 0; i < fftCount; i++) {
        const segment =
          fftCount === 1 ? 0 : Math.floor((i * (possibleFfts - 1)) / Math.max(1, fftCount - 1));
        addSpectrum(intervalStart + segment * MOODBAR_FFT_SIZE, magnitudes);
      }

      const inverse = 1 / fftCount;
      for (let band = 0; band < MOODBAR_BANDS; band++) {
        magnitudes[band] *= inverse;
      }
    } else {
      const center = Math.floor((intervalStart + intervalEnd) / 2);
      addSpectrum(center - (MOODBAR_FFT_SIZE >> 1), magnitudes);
    }

    writeMoodbarFrame(frames, frame, magnitudes, barkBandTable, barkMagnitudes);

    if ((frame & 7) === 7) await yieldWorker();
  }

  return finishMoodbar(frames, frameCount, width);
}

const bsel = (buf) => (typeof buf === "number" ? buf : 0);
const bval = (buf) => (typeof buf === "number" ? undefined : buf);

const uploadBuffer = (buf1, buf2, sampleRate) => {
  moodbarLeft = buf1;
  moodbarRight = buf2;
  moodbarSampleRate = sampleRate || moodbarSampleRate;
  moodbarGeneration++;
  moodbarRequest++;

  return wasmUpload(buf1, buf2);
};

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
    buildMoodbar,
  ][e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  const res = func(...e.data.slice(2));
  if (res instanceof Promise) res.then((r) => postMessage([e.data[1], r]));
  else postMessage([e.data[1], res]);
};
