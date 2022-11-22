import { createSignal, createMemo, createEffect } from "solid-js";

const audioCtx = new AudioContext();
const audioGain = audioCtx.createGain();
audioGain.gain.value = 0.01;
let audioSource: AudioBufferSourceNode;

let startTime: number;
let startSeek: number;

const songs: Record<string, Promise<AudioBuffer>> = {};

export const [volume, setVolume] = createSignal(1);

createEffect(() => {
  audioGain.gain.value = volume();
});

const prettyFormatTime = (time: number) =>
  `${~~(time / 60)}:${(~~(time % 60)).toString().padStart(2, "0")}`;

const [seek, setSeek] = createSignal<number>();
export { seek };
export const prettySeek = createMemo(() => prettyFormatTime(seek()!));

setInterval(() => setSeek(Math.min(audioCtx.currentTime - startTime + startSeek, getDuration())), 100);

export const seekTo = (seek: number) => {
  startSeek = seek;
  audioSource?.start(0, seek);
}

export const getDuration = () => audioSource?.buffer?.duration ?? 0;
export const prettyDuration = () => prettyFormatTime(getDuration());

async function loadAudio(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

export async function preload(url: string) {
  songs[url] = loadAudio(url);
}

export async function play(url: string, seek: number) {
  const then = new Date();
  audioSource?.stop();

  audioSource = new AudioBufferSourceNode(audioCtx, {
    buffer: await (songs[url] ?? loadAudio(url)),
  });

  audioSource.connect(audioGain).connect(audioCtx.destination);

  seek = seek + (new Date().getTime() - then.getTime()) / 1000;
  startTime = audioCtx.currentTime;
  startSeek = seek;
  audioSource.start(0, seek);
}
