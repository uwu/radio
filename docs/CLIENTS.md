# uwu-radio technical documentation: client behaviour

This document lists useful information for client implementations to use as a guide
for how a client should behave given the data provided by the server.

The specifics of data transferred between the server and client,
and a comprehensive reference of APIs is located in TRANSPORT.md

This document will be more of a guide about how to use that data,
and a suggested model for your client's operation.

## Time synchronization

While not necessary, it is recommended to align your clock to that of the server
so that you can use timestamps given to you by the server accurately.

If you do not do this, as long as your clock is "close enough",
it will probably be okay, but you risk shrinking the preload grace period
below a comfortable threshold or leaving gaps between tracks.

The server's clock is guaranteed to be aligned to UTC,
but for technical reasons cannot be guaranteed to be accurate.

For these reasons it is recommended to sync your clock to that of the server.

Essentially, request the `/api/time` endpoint and offset your clock so that
it matches the UNIX timestamp given by the server.

Your connection is *probably* good enough that the transfer time is negligible,
but if you want to be extra sure, you can ping either this endpoint or `/api/ping`
a few times and add half of the mean transfer time to the returned timestamp.

## Syncing

To sync, you need to connect to the
[SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
endpoint provided on the `/sync` route.

This will allow you to request realtime state from the server,
and to be sent state updates asynchronously when required.

The server will send you two types of update:
song preloads (`BroadcastNext`) and state responses (`ReceiveState`).

State responses will be only sent if you ask for it first (`RequestState`).

You should ask for them when you first come online,
and whenever you lose connection and have to reconnect.

When you get a state response, you should drop everything you are doing
and play the song given at the seek position given.

Song preloads will be sent with adequate time before the start of a song.
When you receive one of these, if it is relevant to you (see Channel Handling),
you should start downloading the song from the provided URL,
and start downloading the album artwork from the provided URL.

Each preload will give you a timestamp of when to start playing that song.
Your client should start playing that song if it is on your channel at that
timestamp, regardless of if the current song has finished or not.

## Playback

File download URLs are sent in song preloads and state responses.

They are all under the `/api/file/:id` route.

They will all be given in MP3 in a single response.

## Channel handling

The server will give you a list of channels on the `/api/data` endpoint.

You should keep track of which channel you are playing right now,
and respond only to relevant requests.

You may use preloads for other channels to keep up to date and
facilitate a better channel switching experience, but be mindful of the increased
network usage this will incur on users of your client.
