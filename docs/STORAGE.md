# uwu radio technical docs: storage

All submitters should provide a JSON file containing their song submissions.
It should have the following structure:

- `Name`: string - the name of the submitter
- `PfpUrl`: string - a URL to the submitter's displayed image
- `Quotes`: string[] - a list of quotes you want to show while your tracks play
- `Songs`: object[] - the songs to submit
  * `Name`: string - the name of the song
  * `Artist`: string - the artist displayed to the user
  * `SortArtist`: optional string - an alternate artist field not displayed but used for shuffling and sorting purposes
  * `StreamUrl`: string - a URL where the song can be found (youtube, soundcloud, bandcamp, etc.)
  * `ArtUrl`: optional string - a URL to the album art (coverartarchive, etc.)
  * `Album`: optional string - the album the song is off

If a non-optional value is missing or whitespace from the ingest or a song, the server fails.
