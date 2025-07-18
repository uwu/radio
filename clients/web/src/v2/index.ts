import { serverUrl } from "@/constants";
import { currentTimestamp } from "@/timesync";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { computed, reactive, ref, watchEffect } from "vue";
import { setupMediaSession } from "./mediaSession";
import { cacheImage } from "@/imgCache";

export interface Song {
  name: string;
  artist: string;
  dlUrl?: string | null;
  sourceUrl?: string;
  artUrl?: string | null;
  album?: string | null;
  submitter: string;
  quote: string | null;
  length?: number | null;
}

export interface Submitter {
  name: string;
  pfpUrl: string;
  quotes: string[];
}

// audio state
export const audioCtx = new AudioContext();
export const audioAnalyser = new AnalyserNode(audioCtx);
const audioGain = audioCtx.createGain();

let audioSource: MediaElementAudioSourceNode;

// user interactable state
export const history = reactive<Array<Song>>([]);
export const volume = ref<number>(JSON.parse(localStorage.getItem("volume") ?? (10 ** (-10/20) + "")));
// default volume of -10dBFS is approximately 0.31 linearly (or exactly 1/sqrt(10)!)

export const volumeDbfs = computed({
  get: () => 20 * Math.log10(volume.value),
  set: (dbfs) => {
    volume.value = 10 ** (dbfs / 20);
  },
});

watchEffect(() => {
  audioGain.gain.value = volume.value;
  localStorage.setItem("volume", volume.value.toString());
});

// sync state
export let initalized = false;
let connection: HubConnection | undefined;
export let reconnecting = ref(false);

export let currentSong = ref<Song>();
export let nextSong = ref<Song>();
export let currentSongStarted = ref<number>();
export let nextSongStarts = ref<number>();
export let streamStarted = ref<number>();

// correct reference for the flow of time, use instead of currentTimestamp().
export const streamTimestamp = () => {
  if (!audioSource?.mediaElement || !streamStarted?.value) return currentTimestamp();

  return streamStarted.value + audioSource.mediaElement.currentTime;
};

// seek state for use by the UI
export const seek = ref<number>(0);
export const duration = computed(() => {
  if (currentSong.value?.length)
    return currentSong.value.length;

  if (nextSongStarts.value && currentSongStarted.value)
      return currentSongStarted.value - nextSongStarts.value;

  return 0;
});

const prettyFormatTime = (time: number) =>
  `${~~(time / 60)}:${(~~(time % 60)).toString().padStart(2, "0")}`;

export const prettySeek = computed(() => prettyFormatTime(seek.value!));
export const prettyDuration = computed(() => prettyFormatTime(duration.value));

// sadly the passing of time is not reactive.
setInterval(() => {
  seek.value = Math.min(duration.value, streamTimestamp() - (currentSongStarted.value ?? 0));
}, 100);

// audio stream code
function startStream() {
  audioCtx.resume();
  audioSource?.disconnect();
  audioSource?.mediaElement.pause();

  audioSource = audioCtx.createMediaElementSource(
    new Audio(new URL(`/api/v2/stream/${connection?.connectionId ?? ""}`, serverUrl).href)
  );
  audioSource.mediaElement.crossOrigin = "anonymous";
  audioSource.mediaElement.play();

  audioSource.connect(audioAnalyser).connect(audioGain).connect(audioCtx.destination);
}

// handles passing of songs
let songChangeTimeout: number | undefined;
watchEffect(() => {
  if (songChangeTimeout) {
    clearTimeout(songChangeTimeout);
    songChangeTimeout = undefined;
  }

  if (nextSongStarts.value && streamStarted.value) {

    if (nextSong.value?.artUrl)
      cacheImage(nextSong.value.artUrl);

    songChangeTimeout = setTimeout(() => {

      // advance the song
      currentSong.value = nextSong.value;
      currentSongStarted.value = nextSongStarts.value;

      nextSong.value = undefined;
      nextSongStarts.value = undefined;

      // history
      if (history[history.length - 1] !== currentSong.value && currentSong.value)
        history.push(currentSong.value);

      if (history.length > 25) history.shift();

    }, 1000 * (nextSongStarts.value! - streamTimestamp()));
  }
});

// init code
export async function init()
{
  if (initalized) return;
  initalized = true;

  setupMediaSession();

  connection = new HubConnectionBuilder()
    .withUrl(new URL("/sync", serverUrl).href)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: () => 15_000
    })
    .build();

  connection.onclose = () => (connection = undefined);
  connection.onreconnecting(() => (reconnecting.value = true));
  connection.onreconnected(() => {
    connection?.invoke("RequestState");
    reconnecting.value = false;
    startStream();
  });

  await connection.start();

  connection.on("BroadcastNext", BroadcastNext);
  connection.on("ReceiveState", ReceiveState);
  connection.on("ReceiveStreamStartedAt", ReceiveStreamStartedAt);

  connection?.invoke("RequestState");

  startStream();
}

// sync action handlers

function BroadcastNext(nextSong_: Song, startTime_: number) {
  nextSong.value = nextSong_;
  nextSongStarts.value = startTime_;

  // todo: pre-cache images, misc bugfixes
}

function ReceiveState(currentSong_: Song, currentStarted: number, nextSong_: Song, nextStart: number) {
  currentSong.value = currentSong_;
  nextSong.value = nextSong_;
  currentSongStarted.value = currentStarted;
  nextSongStarts.value = nextStart;
}

function ReceiveStreamStartedAt(startedAt: number) {
  streamStarted.value = startedAt;
}
