import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { currentTimestamp } from "../timesync";
import { play, preload, seekTo } from "./audio";
import { ref, computed } from "vue";
import { serverUrl } from "../constants";
import { cacheImage } from "../imgCache";

const loadingSong: Song = {
  name: "loading...",
  artist: "...",
  submitter: "...",
  quote: null,
};

export interface Song {
  name: string;
  artist: string;
  dlUrl?: string | null;
  sourceUrl?: string;
  artUrl?: string | null;
  album?: string | null;
  submitter: string;
  quote: string | null;
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

  // this desperately needs a rewrite (when i do channels i'll redo all the sync and audio logic)
  current = ref<Song | undefined>(loadingSong);
  next = ref<Song>();

  #currentStarted = ref<number>();
  #nextStarts = ref<number>();

  #interval?: number;

  reconnecting = false;

  get currentSong() {
    return this.current.value;
  }
  get nextSong() {
    return this.next.value;
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
    BroadcastNext: (nextSong: Song, startTime: number) => {
      this.next.value = nextSong;
      this.#nextStarts.value = startTime;
      this.#scheduleNext(startTime);
    },
    ReceiveState: (
      currentSong: Song,
      currentStarted: number,
      nextSong: Song,
      nextStart: number,
    ) => {
      this.current.value = currentSong;
      this.#currentStarted.value = currentStarted;
      this.next.value = nextSong;
      this.#nextStarts.value = nextStart;

      play(this.current.value!, this.seekPos.value!);
      if (this.#nextStarts.value! - currentTimestamp() < 30)
        this.#scheduleNext(this.#nextStarts.value!);
    },
    ReceiveSeekPos: (currentStarted: number) => {
      // TODO: i guess emit events, like this should only really be used if we drop connection
      //       but even shouldn't we just call ReceiveState
      this.#currentStarted.value = currentStarted;

      seekTo(this.seekPos.value!);
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
    connection.on("ReceiveSeekPos", this.#handlers.ReceiveSeekPos);

    this.updateState();
  }

  updateState() {
    this.requestState();
  }

  requestState() {
    this.#connection?.invoke("RequestState");
  }

  requestSeekPos() {
    this.#connection?.invoke("RequestSeekPos");
  }

  #scheduleNext(startTime: number) {
    if (this.next.value === undefined) return;
    preload(this.next.value.dlUrl!);
    cacheImage(this.next.value.artUrl!);

    clearInterval(this.#interval);
    this.#interval = setTimeout(
      () => {
        this.current.value = this.next.value;
        this.#currentStarted.value = this.#nextStarts.value;
        this.next.value = undefined;
        this.#nextStarts.value = undefined;

        const correction = Math.min(-(startTime - currentTimestamp()), 0);
        play(this.current.value!, correction);
      },
      1000 * (startTime - currentTimestamp()),
    );
  }
}

let clientInstance: SyncClient;

export const getClient = () => {
  if (!clientInstance) clientInstance = new SyncClient(serverUrl);
  return clientInstance;
};
