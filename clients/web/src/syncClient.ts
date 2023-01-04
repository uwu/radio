import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { currentTimestamp } from "./util";
import { play, preload, seekTo } from "./audio";
import { ref, reactive, computed } from "vue";
import { serverUrl } from "./constants";
import { cacheImage } from "./imgCache";

const loadingSong: Song = {
  name: "loading...",
  artist: "...",
  submitter: "...",
};

export interface Song {
  name: string;
  artist: string;
  dlUrl?: string;
  sourceUrl?: string;
  artUrl?: string;
  album?: string;
  submitter: string;
}

export interface Submitter {
  name: string;
  pfpUrl: string;
  quotes: string[];
}

export default class SyncClient {
  #apiRes: (route: string) => string;

  constructor(host: string) {
    this.#apiRes = (route) => new URL(route, host).href;

    const connection = new HubConnectionBuilder()
      .withUrl(this.#apiRes("/sync"))
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: () => 15000,
      })
      .build();

    this.#connect(connection);
  }

  #connection: undefined | HubConnection;

  #channel = ref<string | undefined>();

  #current = ref<Song | undefined>(loadingSong);
  #next = ref<Song>();

  submitters = reactive(new Map<string, Submitter>());

  #currentStarted = ref<number>();
  #nextStarts = ref<number>();

  #interval?: number;

  reconnecting = false;

  get channel() {
    return this.#channel.value;
  }

  get currentSong() {
    return this.#current.value;
  }
  get nextSong() {
    return this.#next.value;
  }

  get currentStartedTime() {
    return this.#currentStarted.value;
  }

  get nextStartsTime() {
    return this.#nextStarts.value;
  }

  /** The seek into the current song in seconds */
  seekPos = computed(() => {
    const startTime = this.#currentStarted.value;
    return startTime ? currentTimestamp() - startTime : undefined;
  });

  #handlers = {
    BroadcastNext: (nextSong: Song, startTime: number, channel: string | undefined) => {
      // TODO: we really should handle this better
      if (this.channel != channel) return;

      this.#next.value = nextSong;
      this.#nextStarts.value = startTime;
      this.#scheduleNext(startTime);
    },
    ReceiveState: (
      currentSong: Song,
      currentStarted: number,
      nextSong: Song,
      nextStart: number,
      channel: string | undefined,
    ) => {
      // TODO: we really should handle this better
      if (this.channel != channel) return;

      this.#current.value = currentSong;
      this.#currentStarted.value = currentStarted;
      this.#next.value = nextSong;
      this.#nextStarts.value = nextStart;

      play(this.#current.value!, this.seekPos.value!);
      if (this.#nextStarts.value! - currentTimestamp() < 30)
        this.#scheduleNext(this.#nextStarts.value!);
    },
  };

  async #connect(connection: HubConnection) {
    if (this.#connection) throw new Error("This client is already connected");
    this.#connection = connection;

    connection.onclose(() => (this.#connection = undefined));

    connection.onreconnecting(() => (this.reconnecting = true));
    connection.onreconnected(() => {
      this.updateState();
      this.reconnecting = false;
    });

    await connection.start();

    connection.on("BroadcastNext", this.#handlers.BroadcastNext);
    connection.on("ReceiveState", this.#handlers.ReceiveState);

    this.updateState();
  }

  updateState() {
    fetch(this.#apiRes("/api/data"))
      .then((r) => r.json())
      .then((r) => {
        for (const submitter of r.submitters) this.submitters.set(submitter.name, submitter);
      });

    this.requestState();
  }

  requestState() {
    this.#connection?.invoke("RequestState", this.channel);
  }

  #scheduleNext(startTime: number) {
    if (this.#next.value === undefined) return;
    preload(this.#next.value.dlUrl!);
    cacheImage(this.#next.value.artUrl!);

    clearInterval(this.#interval);
    this.#interval = setTimeout(() => {
      this.#current.value = this.#next.value;
      this.#currentStarted.value = this.#nextStarts.value;
      this.#next.value = undefined;
      this.#nextStarts.value = undefined;

      const correction = Math.min(-(startTime - currentTimestamp()), 0);
      play(this.#current.value!, correction);
    }, 1000 * (startTime - currentTimestamp()));
  }
}

let clientInstance: SyncClient;

export const getClient = () => {
  if (!clientInstance) clientInstance = new SyncClient(serverUrl);
  return clientInstance;
};
