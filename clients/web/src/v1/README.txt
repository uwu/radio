The radio client code for API v1 (downloading chunks of MP3) is kept here as a fallback for browsers that are
not able to work with API v2 (live-streaming). This is currently Safari on iOS < 18.4, macOS < Sequoia 15.4.

In future the goal is to instead deploy a client side ogg decoder like ogv.js or even replicate our live-streaming
with another codec such as MP3.

For now, this will do.
