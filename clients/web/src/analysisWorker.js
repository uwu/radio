// avoid uploading the same buffer a ton of times
let currentBuffer = new Float32Array(0);

/** @param {Float32Array} buf */
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
 * @param {number} start The number of samples into the buffer to start looking from
 * @param {number} n The amount of zero crossings to include
 * @returns Float32Array */
/*function getNCrossings(buf, start, n) {
  /!** @param {number} n
   * @returns number*!/
  function nextCrossingIdx(n) {
    let done = false;
    do {
      n++;
      let signChanged = (buf[n - 1] > 0) !== (buf[n] > 0);
      done = signChanged;
    } while (!done);
    return n;
  }

  buf ??= currentBuffer;

  // find first crossing
  let c1 = nextCrossingIdx(start);

  // find end
  let end = c1;
  for (let i = 0; i < n; i++) end = nextCrossingIdx(end);

  return buf.slice(c1, end);
}*/

/** @param {Float32Array} buf
 * @param {number} start
 * @param {number} end
 * @returns Float32Array[] */
function sliceByCrossings(buf, start, end) {
  const buffers = [];
  buf ??= currentBuffer;
  start ??= 0;
  end ??= buf.length;

  let startNext = start; // the start of the next buffer to be sliced
  let isPos = buf[start] > 0; // was the last sample positive?

  for (let i = start + 1; i < end; i++) {
    const thisSampPos = buf[i] > 0;
    if (isPos !== thisSampPos) {
      // flip!
      buffers.push(buf.slice(startNext, i));
      startNext = i;
    }
    isPos = thisSampPos;
  }

  return buffers;
}

/** @param {Float32Array[]} bufs
 * @returns Float32Array */
function maxAbsPeakOf(bufs) {
  let m = 0;
  let mb = bufs[0];
  for (const buf of bufs)
    for (const sample of buf) {
      m = Math.max(m, Math.abs(sample));
      mb = buf;
    }

  return mb;
}

// maxAbsPeakOf(sliceByCrossings(...))
function sbcMax(buf, start, end) {
  return maxAbsPeakOf(sliceByCrossings(buf, start, end));
}

onmessage = (e) => {
  // rip type safety
  const func = [uploadBuffer, downscale, /*getNCrossings*/, /*maxAbsPeakOf*/, /*sliceByCrossings*/, sbcMax][e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  postMessage([e.data[1], func(...e.data.slice(2))]);
};
