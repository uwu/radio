# uwu-radio technical documentation: transport

## SignalR method naming conventions

- When a client requests something from the server, it does so on the method `Request*`
- When the server responds to this request, it does so on the method `Receive*`
- When the server sends data intended for use by all connected clients, it does so on the method `Broadcast*`

## Transport datatypes
### `Song`
Object:

- string Name
- string Artist
- string DlUrl
- string? ArtUrl
- string? Album

### `Timestamp`
Integer, UNIX timestamp in seconds.

THIS IS IN UTC.

### `SeekTime`
Integer, seconds.

## HTTP server endpoints
None yet.

## SignalR Hub (`SyncHub.cs`, `syncClient.ts`, `/sync`) endpoints

Server Methods:

| Method         | Purpose                                                     | Payload |
|----------------|-------------------------------------------------------------|---------|
| RequestCurrent | Used by clients to request the currently playing song       | void    |
| RequestSeekPos | Used by clients to request the current position in the song | void    |

Client Methods:

| Method         | Purpose                                                                      | Payload           |
|----------------|------------------------------------------------------------------------------|-------------------|
| BroadcastNext  | Receive the data of the next song for pre-loading. Enables seamless playback | [Song, Timestamp] |
| ReceiveCurrent | Receive the data of the current song. Used to reply to imperative requests   | Song              |
| ReceiveSeekPos | Receive the current song position. Used for joining part-way through a song  | Seektime          |