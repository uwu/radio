import { ref, reactive, computed, watchEffect } from "vue";
import { setupMediaSession } from "./mediaSession";
import type { Song } from "./syncClient";
import { currentTimestamp } from "./util";

const audioCtx = new AudioContext();
const audioGain = audioCtx.createGain();
let audioSource: AudioBufferSourceNode;

let startTime: number;
let startSeek: number;

const songs: Record<string, Promise<AudioBuffer>> = {};

export const history = reactive<Array<Song>>([]);
export const volume = ref<number>(JSON.parse(localStorage.getItem("volume") ?? "1"));

watchEffect(() => {
  audioGain.gain.value = volume.value;
  localStorage.setItem("volume", volume.value.toString());
});

const prettyFormatTime = (time: number) =>
  `${~~(time / 60)}:${(~~(time % 60)).toString().padStart(2, "0")}`;

const seek = ref<number>();
export { seek };
export const prettySeek = computed(() => prettyFormatTime(seek.value!));

setInterval(
  () => (seek.value = Math.min(audioCtx.currentTime - startTime + startSeek, getDuration())),
  100,
);

export const seekTo = (seek: number) => {
  startSeek = seek;
  audioSource?.start(0, seek);
};

export const getDuration = () => audioSource?.buffer?.duration ?? 0;
export const prettyDuration = () => prettyFormatTime(getDuration());

async function loadAudio(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

export async function preload(url: string) {
  return (songs[url] ??= loadAudio(url));
}

export async function play(song: Song, seek: number) {
  const then = currentTimestamp();
  setupMediaSession();
  audioSource?.stop();

  const url = song.dlUrl!;

  audioSource = new AudioBufferSourceNode(audioCtx, {
    buffer: await (songs[url] ?? preload(url)),
  });

  audioSource.connect(audioGain).connect(audioCtx.destination);

  seek = seek + currentTimestamp() - then;
  startTime = audioCtx.currentTime;
  startSeek = seek;
  audioSource.start(0, seek);

  // not having .at(-1) makes me sad
  if (history[history.length - 1] !== song) history.push(song);
  if (history.length > 25) history.shift();
}
