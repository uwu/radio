import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr"

class SyncClient {
	#connection: HubConnection;
	
	listeners = {
		BroadcastNext: [],
		ReceiveCurrent: [],
		ReceiveSeekPos: [],
	};
	
	connect(connection: HubConnection) {
		if (this.#connection) throw new Error("This client is already connected");
		this.#connection = connection;
		connection.onclose(() => this.#connection = undefined);
		
		return this;
	}
	
	listen(event: "BroadcastNext", cb: () => void): () => void;
	listen(event: "ReceiveCurrent", cb: () => void): () => void;
	listen(event: "ReceiveSeekPos", cb: () => void): () => void;
	
	listen(event: keyof typeof this.listeners, cb) {
		this.listeners[event].push(cb);
		return () => this.listeners[event] = this.listeners[event].filter(v => v !== cb);
	}
}

export function connectClient(host: string) {
	const connection = new HubConnectionBuilder()
		.withUrl(new URL("/sync", host).href)
		.build();
	
	return new SyncClient().connect(connection);
}