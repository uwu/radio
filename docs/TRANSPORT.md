# uwu-radio technical documentation: transport

## SignalR method naming conventions

- When a client requests something from the server, it does so on the method `Request*`
- When the server responds to this request, it does so on the method `Receive*`
- When the server sends data intended for use by all connected clients, it does so on the method `Broadcast*`

## Transport datatypes
### `Song`
Object:

- string name
- string artist
- string? sortArtist
- string? dlUrl
- string? sourceUrl
- string? artUrl
- string? album
- string submitter

### `Timestamp`
Integer, UNIX timestamp in seconds.

THIS IS IN UTC.

## HTTP server endpoints

| Method | Endpoint        | Purpose                   | Resp (success)      | Resp (err)              |
|--------|-----------------|---------------------------|---------------------|-------------------------|
| GET    | `/api/ping`     | Debugging                 | `200`: "Pong!"      | N/A                     |
| GET    | `/api/time`     | Syncing time              | `200`: Timestamp    | N/A                     |
| GET    | `/api/data`     | Sending ingest to client  | `200`: JSON         | N/A                     |
| GET    | `/api/file/:id` | Clients downloading songs | `200`: [audio/mpeg] | 503 service unavailable |

The data returned looks like
```ts
{
	//Songs: {  }[] might include if needed in future
    Submitters: { Name: string; PfpUrl: string; Quotes: string[] }[]
}
```

## SignalR Hub (`SyncHub.cs`, `syncClient.ts`, `/sync`) endpoints

Server Methods:

| Method         | Purpose                                                       | Payload |
|----------------|---------------------------------------------------------------|---------|
| RequestState   | Used by clients to request the current, next, and seekpos     | void    |
| RequestSeekPos | Used by clients to request the current position for resyncing | void    |

Client Methods:

| Method         | Purpose                                                                                 | Payload                            |
|----------------|-----------------------------------------------------------------------------------------|------------------------------------|
| BroadcastNext  | Receive the data of the next song for pre-loading. Enables seamless playback            | [Song, Timestamp]                  |
| ReceiveState   | Receive the data of the current current state. Used for joining part-way through a song | [Song, Timestamp, Song, Timestamp] |
| ReceiveSeekPos | Receive the time the current song started. Used for resyncing                           | Timestamp                          |
