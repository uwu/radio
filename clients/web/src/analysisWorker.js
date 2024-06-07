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

/** @param {Float32Array} buf
 * @param {number} startX
 * @param {number} startY
 * @param {number} dx
 * @param {number} scaleY
 * @returns string */
function waveformToPath(buf, startX, startY, dx, scaleY) {
  buf ??= currentBuffer;

  let path = `M${startX} ${startY}`;

  let pY = 0;
  for (const v of buf) {
    let y = -v * scaleY;
    path += `l${dx} ${y - pY}`;
    pY = y;
  }

  path += `l0 ${2 * buf[buf.length - 1] * scaleY}`;

  // flip it over!
  for (let i = buf.length - 1; i >= 0; i--) {
    let y = buf[i] * scaleY;
    path += `l${-dx} ${y - pY}`;
    pY = y;
  }

  return path + `Z`;
}

onmessage = (e) => {
  // rip type safety
  const func = { uploadBuffer, downscale, waveformToPath }[e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  postMessage([e.data[1], func(...e.data.slice(2))]);
};
