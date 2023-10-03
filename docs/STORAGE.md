# uwu radio technical docs: storage

All submitters should provide a JSON file containing their metadata.
It should have the following structure:

- `Name`: string - the name of the submitter
- `PfpUrl`: string - a URL to the submitter's displayed image
- `Quotes`: string[] - a list of quotes you want to show while your tracks play
- `Songs`: object[] - the songs to submit
	* `Name`: string - the name of the song
	* `Artist`: string - the artist
	* `StreamUrl`: string - a URL where the song can be found (youtube, soundcloud, bandcamp, etc.)
	* `ArtUrl`: optional string - a URL to the album art (coverartarchive, etc.)
	* `Album`: optional string - the album the song is off
  * `Channels`: string[] - the names of the channels this song is in
  * `IncludeInGlobal`: boolean - whether or not to include this channel in the global channel, defaults to true when no channel is set and to false if at least one channel is set, cannot be false if no channel is specified.

All channels should provide a JSON file containing their submitted songs.
It should have the following structure:

- `Name`: string - the name of the channel
- `Category`: string - the category of the channel, this may be used by a client to group channels

If a non-optional value is missing or whitespace from the ingest or a song,
or if a channel points to a non existent submitter, the server fails.
