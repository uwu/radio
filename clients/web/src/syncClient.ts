import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { computed, ref } from "vue";
import { play, loadCached } from "./audio";
import { serverUrl } from "./constants";
import { currentTimestamp } from "./util";
import { cacheImage } from "./imgCache";

export interface Song {
  name: string;
  artist: string;
  dlUrl: string;
  sourceUrl: string;
  artUrl?: string;
  album?: string;
  submitter: string;
}

export interface Submitter {
  name: string;
  pfpUrl: string;
  quotes: string[];
}

export interface Channel {
  name: string;
  category?: string;
  submitter: string;
  noGlobal: boolean;
  songs: [];
}

const defaultSong: Song = {
  name: "loading...",
  artist: "loading...",
  dlUrl: "",
  sourceUrl: "",
  submitter: "loading...",
};

const api = (route: string) => new URL(route, serverUrl).href;

let hub: HubConnection;

export const submitters = new Map<string, Submitter>();
// Channels may change between reconnects, we want the UI to reflect that.
export const channels = ref<Array<Channel>>([]);

export const currentSong = ref<Song>(defaultSong);
export const nextSong = ref<Song>();
export const currentStartedAt = ref<number>();
export const nextStartsAt = ref<number>();

export const currentChannel = ref<string | null>(null);
export const reconnecting = ref(false);

const seekPos = computed(() => {
  const startTime = currentStartedAt.value;
  return startTime ? currentTimestamp() - startTime : 0;
});

export async function startSyncClient() {
  if (hub) return hub;

  hub = new HubConnectionBuilder()
    .withUrl(api("/sync"))
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: () => 10000,
    })
    .build();

  function scheduleNext(startTime: number) {
    if (nextSong.value === undefined) return;

    loadCached(nextSong.value.dlUrl);

    if (nextSong.value?.artUrl) cacheImage(nextSong.value.artUrl);

    setTimeout(() => {
      currentSong.value = nextSong.value!;
      currentStartedAt.value = nextStartsAt.value;
      nextSong.value = undefined;
      nextStartsAt.value = undefined;

      const correction = Math.min(-(startTime - currentTimestamp()), 0);
      play(currentSong.value!, correction);
    }, 1000 * (startTime - currentTimestamp()));
  }

  hub.on("BroadcastNext", (next: Song, startTime: number, channel: string | null) => {
    if (currentChannel.value != channel) return;

    nextSong.value = next;
    nextStartsAt.value = startTime;

    scheduleNext(startTime);
  });

  hub.on(
    "ReceiveState",
    (
      current: Song,
      currentStarted: number,
      next: Song,
      nextStarts: number,
      channel: string | null,
    ) => {
      if (currentChannel.value != channel) return;

      currentSong.value = current;
      currentStartedAt.value = currentStarted;
      nextSong.value = next;
      nextStartsAt.value = nextStarts;

      play(current, seekPos.value);
      if (nextStarts - currentTimestamp() < 30) scheduleNext(nextStarts);
    },
  );

  async function handler() {
    await fetch(api("/api/data"))
      .then((r) => r.json())
      .then((r) => {
        for (const submitter of r.submitters) submitters.set(submitter.name, submitter);
        channels.value = r.channels;
      });

    await hub.invoke("RequestState", null);
  }

  hub.onreconnecting(() => (reconnecting.value = true));
  hub.onreconnected(() => {
    handler();
    reconnecting.value = false;
  });

  await hub.start();
  await handler();

  return hub;
}
