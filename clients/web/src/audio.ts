import { computed, reactive, ref, watchEffect } from "vue";
import { setupMediaSession } from "./mediaSession";
import type { Song } from "./syncClient";
import { currentTimestamp } from "./util";

export const audioCtx = new AudioContext();
export const audioAnalyser = new AnalyserNode(audioCtx);
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

export const seek = ref<number>();
export const prettySeek = computed(() => prettyFormatTime(seek.value!));

setInterval(
  () => (seek.value = Math.min(audioCtx.currentTime - startTime + startSeek, getDuration())),
  100,
);

export const getDuration = () => audioSource?.buffer?.duration ?? 0;
export const prettyDuration = () => prettyFormatTime(getDuration());

const loadAudio = (url: string) =>
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => audioCtx.decodeAudioData(buf));

export const loadCached = (url: string) => (songs[url] ??= loadAudio(url));

export async function play(song: Song, seek: number) {
  const then = currentTimestamp();
  setupMediaSession();
  audioSource?.stop();

  const url = song.dlUrl!;

  audioSource = new AudioBufferSourceNode(audioCtx, {
    buffer: await loadCached(url),
  });

  audioSource.connect(audioAnalyser).connect(audioGain).connect(audioCtx.destination);

  seek = seek + currentTimestamp() - then;
  startTime = audioCtx.currentTime;
  startSeek = seek;
  audioSource.start(0, seek);

  // not having .at(-1) makes me sad
  if (history[history.length - 1] !== song) history.push(song);
  if (history.length > 25) history.shift();
}
