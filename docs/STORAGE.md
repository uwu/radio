# uwu radio technical docs: storage

All submitters should provide a JSON file containing their metadata.
It should have the following structure:

- `Name`: string - the name of the submitter
- `PfpUrl`: string - a URL to the submitter's displayed image
- `Quotes`: string[] - a list of quotes you want to show while your tracks play

All channels should provide a JSON file containing their submitted songs.
It should have the following structure:

- `Name`: string - the name of the channel
- `Submitter`: string - the `Name` field of a submitter
- `NoGlobal`: optional bool - if true, does not play channel's songs in global
- `Songs`: object[] - the songs to submit
  * `Name`: string - the name of the song
  * `Artist`: string - the artist
  * `StreamUrl`: string - a URL where the song can be found (youtube, soundcloud, bandcamp, etc.)
  * `ArtUrl`: optional string - a URL to the album art (coverartarchive, etc.)
  * `Album`: optional string - the album the song is off

If a non-optional value is missing or whitespace from the ingest or a song,
or if a channel points to a non existent submitter, the server fails.
