import {HubConnection, HubConnectionBuilder} from "@microsoft/signalr"

export interface Song {
	Name: string;
	Artist: string;
	DlUrl?: string;
	ArtUrl?: string;
	Album?: string;
}

export default class SyncClient {
	constructor(host: string) {
		const connection = new HubConnectionBuilder()
			.withUrl(new URL("/sync", host).href)
			.build();

		this.#connect(connection);
	}

	#connection: HubConnection;

	current: undefined | Song;
	next: undefined | Song;

	currentStarted: undefined | number;
	nextStarts: undefined | number;

	/** The seek into the current song in seconds */
	get seekPos() {
		return this.currentStarted
			? Date.now() - this.currentStarted
			: undefined;
	}

	#handlers = {
		BroadcastNext: (nextSong: Song, startTime: number) => {
			this.next = nextSong;
			this.nextStarts = startTime;
		},
		ReceiveState: (currentSong: Song, currentStarted: number, nextSong: Song, nextStart: number) => {
			// TODO: emit events and stuff and tie this to audio playing and when it joins etc etc
			this.current = currentSong;
			this.currentStarted = currentStarted;
			this.next = nextSong;
			this.nextStarts = nextStart;
		},
		ReceiveSeekPos: (currentStarted: number) => {
			// TODO: i guess emit events, like this should only really be used if we drop connection
			//  but even shouldn't we just call ReceiveState
			this.currentStarted = currentStarted;
		},
	};

	#connect(connection: HubConnection) {
		if (this.#connection) throw new Error("This client is already connected");
		this.#connection = connection;
		connection.onclose(() => this.#connection = undefined);

		connection.on("BroadcastNext", this.#handlers.BroadcastNext);
		connection.on("ReceiveState", this.#handlers.ReceiveState);
		connection.on("ReceiveSeekPos", this.#handlers.ReceiveSeekPos);
	}

	requestState() {
		this.#connection.invoke("RequestState");
	}

	requestSeekPos() {
		this.#connection.invoke("RequestSeekPos");
	}
}