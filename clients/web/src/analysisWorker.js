// avoid uploading the same buffer a ton of times
let currentBuffer = new Float32Array(0);

/** @pararm {Float32Array{ buf */
function uploadBuffer(buf) {
  currentBuffer = buf;
}

/** @param {Float32Array} buf
 * @param {number} size
 * @returns Float32Array */
function downscale(buf, size) {
  buf ??= currentBuffer;

  // size of each chunk
  const chunkSz = Math.ceil(buf.length / size);
  const nChunks = Math.ceil(buf.length / chunkSz);

  // this is at LEAST size, rounded up as necessary
  const res = new Float32Array(nChunks);

  for (let ci = 0; ci < nChunks; ci++) {
    const chunk = buf.slice(ci * chunkSz, (ci + 1) * chunkSz);

    let max = chunk[0]; /*, min = chunk[0]*/
    for (let i = 1; i < chunk.length; i++) {
      max = Math.max(chunk[i], max);
      //min = Math.min(chunk[i], min);
    }

    res[ci] = max;
  }

  return res;
}

onmessage = (e) => {
  // rip type safety
  const func = { uploadBuffer, downscale }[e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  postMessage([e.data[1], func(...e.data.slice(2))]);
};
