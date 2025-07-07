# uwu radio technical documentation: services

Services are classes of which an instance is created at server start,
and they are dependency injected to any other services, hubs, controllers, etc where they are needed.

They are the beating heart of the backend and:
 - Keep track of state
 - Do actual work
 - Make scheduled events happen

## DataService

- Load all data off of the disk and be the central source of it
  * songs
  * submitters
  * quotes

## PickerService

The picker service has two jobs:
 - Keep track of some historical data required for its algorithm
 - Select songs (fake!) randomly when requested

## DownloadService

The download service is in charge of:
 - Downloading songs to the cache when asked - usually when they will be imminently useful
 - Being the central source of data only knowable about a song once we have the file
   (e.g. MD5 hash, length)

## CoordinatorService

This is the big one - it, well, coordinates the entire server.

Its jobs:
 - Keep track of the current and upcoming song
 - Keep track of the start and end times of the current song
 - Make sure songs are downloaded early enough to be available when needed
 - Advance the queue when its time
 - Broadcast the next song over SignalR to all clients when its time

To do its job, it fires off a background thread that loops in a CPU-efficient manner.

This is the only service that does this as everything it does is in response
to certain points in time being hit.

## SongStreamingService

This handles generating the audio livestreams that are used by the client.
 - Starts reading songs from disk and creates decoder streams
 - Ties together decoded audio for songs seamlessly
 - Connects streams to the encoder
 - Connects http responses to the encoded stream
