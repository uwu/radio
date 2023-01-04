# uwu radio technical documentation: services

Services are classes of which an instance is created at server start,
and they are dependency injected to any other services, hubs, controllers, etc where they are needed.

They are the beating heart of the backend and:
 - Keep track of state
 - Do actual work
 - Make scheduled events happen

## DataService

- Load all data off of the disk and be the central source of it
  * global songs
  * submitters
  * channels

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

This is the big one - it, well, coordinates everything for one channel.

Its jobs:
 - Keep track of the current and upcoming song
 - Keep track of the start and end times of the current song
 - Make sure songs are downloaded early enough to be available when needed
 - Advance the queue when its time
 - Broadcast the next song over SignalR to all clients when its time

To do its job, it fires off a background thread that loops in a CPU-efficient manner.

Do not request a CoordinatorService via DI, see the next service ;)

## CoordServOwnerService

In order to deal with requiring a coordinator service per channel,
this service is setup once from Program.cs.

It does a weird init dance of sorts with coordinatorservice to set them up.

If you need a coordinatorservice, DI this service and ask it for the channel you want.
