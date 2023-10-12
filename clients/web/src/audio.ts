import { ref, reactive, computed, watchEffect } from "vue";
import { setupMediaSession } from "./mediaSession";
import type { Song } from "./syncClient";
import { currentTimestamp } from "./util";

export const audioCtx = new AudioContext();
export const audioAnalyser = new AnalyserNode(audioCtx);
const audioGain = audioCtx.createGain();
let audioSource: MediaElementAudioSourceNode;

let startTime: number;
let startSeek: number;

const songs: Record<string, HTMLAudioElement> = {};

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
  if (audioSource) audioSource.mediaElement.currentTime = seek;
};

export const getDuration = () => audioSource?.mediaElement?.duration ?? 0;
export const prettyDuration = () => prettyFormatTime(getDuration());

async function loadAudio(url: string) {
  const audio = new Audio(url);
  audio.crossOrigin = "anonymous";

  await new Promise((res, rej) => {
    audio.onloadedmetadata = res; // full load
    audio.onerror = rej; // error handling :)
  });

  // prevent a potential memory leak from keeping all the audio in ram
  audio.onended = () => {
    delete songs[url];
  };

  return audio;
}

export async function preload(url: string) {
  return (songs[url] ??= await loadAudio(url));
}

export async function play(song: Song, seek: number) {
  const then = currentTimestamp();
  setupMediaSession();
  audioSource?.mediaElement.pause();

  const url = song.dlUrl!;

  audioSource = new MediaElementAudioSourceNode(audioCtx, {
    mediaElement: await preload(url),
  });

  audioSource.connect(audioAnalyser).connect(audioGain).connect(audioCtx.destination);

  seek = seek + currentTimestamp() - then;
  startTime = audioCtx.currentTime;
  startSeek = seek;

  audioSource.mediaElement.currentTime = seek;

  // HTML5 audio has this problem where we seek before the audio is actually loaded and it just seeks to 0
  // to force our way around it, we say that, if the difference between the starting seek and the current time > 2,
  // and the audio is not yet fully loaded, then we should re-set the seek, and wait for network progress, then retry
  // eventually, the seek will successfully set within range, and we can exit this loop and play()
  while (
    Math.abs(seek - audioSource.mediaElement.currentTime) > 2 &&
    audioSource.mediaElement.networkState !== 1
  ) {
    await new Promise((res, rej) => {
      audioSource.mediaElement.onprogress = res;
      audioSource.mediaElement.onerror = rej;
    });

    audioSource.mediaElement.currentTime = seek;
  }

  audioSource.mediaElement.play();

  // not having .at(-1) makes me sad
  if (history[history.length - 1] !== song) history.push(song);
  if (history.length > 25) history.shift();
}
