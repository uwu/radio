/** @param {Float32Array} buf
 * @param {number} size
 * @returns Float32Array */
function downscale(buf, size) {
  const res = new Float32Array(size);
  const scale = buf.length / size;

  for (let i = 0; i < size; i++) {
    res[i] = buf[~~(i * scale)];
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
  let path = `M${startX} ${startY}`;

  let pY = startY;
  for (const v of buf) {
    let y = startY + v * scaleY;
    path += `l${dx} ${y - pY}`;
    pY = y;
  }

  return path;
}

onmessage = (e) => {
  // rip type safety
  const func = { downscale, waveformToPath }[e.data[0]];
  if (!func) postMessage(["ERR", `${e.data[0]} is not a command`]);

  postMessage([e.data[1], func(...e.data.slice(2))]);
};
