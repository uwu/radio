// uwr fastutils for assemblyscript
// a small and application specific wrapper library for otherwise unsafe ops by hazel

/** UNSAFE CONTRACT: len MUST be a multiple of 4, and within buffer bounds */
export function listAbsMax_f32_UNCHECKED(buf: Float32Array, len: i32): f32 {
  let running = v128.splat<f32>(0);

  for (let i = 0; i < len; i += sizeof<v128>() / sizeof<f32>()) {
    // load up a vec
    const vec = f32x4.abs(v128.load(buf.dataStart + i * sizeof<v128>()));
    // pmax is faster than max due to not treating nulls etc
    // https://source.chromium.org/chromium/chromium/src/+/main:v8/src/compiler/backend/x64/code-generator-x64.cc;drc=8ab75a56a24f34d4f582261c99939ffa1446a3b7;l=2712
    running = f32x4.pmax(running, vec);
  }

  return Mathf.max(
    Mathf.max(f32x4.extract_lane(running, 0), f32x4.extract_lane(running, 1)),
    Mathf.max(f32x4.extract_lane(running, 2), f32x4.extract_lane(running, 3)),
  );
}

/** UNSAFE CONTRACT: len MUST be a multiple of 4, and within buffer bounds */
export function listMax_f32_UNCHECKED(buf: Float32Array, len: i32): f32 {
  let running = v128.splat<f32>(f32.MIN_VALUE);

  for (let i = 0; i < len; i += sizeof<v128>() / sizeof<f32>()) {
    // load up a vec
    const vec = v128.load(buf.dataStart + i * sizeof<v128>());
    // pmax is faster than max due to not treating nulls etc
    // https://source.chromium.org/chromium/chromium/src/+/main:v8/src/compiler/backend/x64/code-generator-x64.cc;drc=8ab75a56a24f34d4f582261c99939ffa1446a3b7;l=2712
    running = f32x4.pmax(running, vec);
  }

  return Mathf.max(
    Mathf.max(f32x4.extract_lane(running, 0), f32x4.extract_lane(running, 1)),
    Mathf.max(f32x4.extract_lane(running, 2), f32x4.extract_lane(running, 3)),
  );
}

/** finds the maximum element of the buffer with SIMD */
export function listMax_f32(buf: Float32Array): f32 {
  assert(buf.length, "cannot get max of an empty buffer");

  const simdSafeLen = 4 * (buf.length / 4);

  // if buffer is smaller than 4, this will return f32.MIN_VALUE
  let running = listMax_f32_UNCHECKED(buf, simdSafeLen);

  for (let i = simdSafeLen; i < buf.length; i++) {
    running = Mathf.max(running, buf[i]);
  }

  return running;
}

/** finds the maximum element of the absolute values of the buffer with SIMD */
export function listAbsMax_f32(buf: Float32Array): f32 {
  assert(buf.length, "cannot get abs max of an empty buffer");

  const simdSafeLen = 4 * (buf.length / 4);

  // if buffer is smaller than 4, this will return 0
  let running = listAbsMax_f32_UNCHECKED(buf, simdSafeLen);

  for (let i = simdSafeLen; i < buf.length; i++) {
    running = Mathf.max(running, Mathf.abs(buf[i]));
  }

  return running;
}

/** checked fast memory copy between two buffers.
 * pass two buffers, the bytes per element, the offsets for where to write to, and the number of elemments.
 * a raw byte copy can be achieved with sz = 1.
 * takes isize not usize for checking reasons. */
export function memcpy(
  src: ArrayBuffer,
  dst: ArrayBuffer,
  srcOset: isize,
  dstOset: isize,
  elSz: isize,
  n: isize,
): void {
  assert((srcOset + n) * elSz <= src.byteLength, "source will overflow");
  assert((dstOset + n) * elSz <= dst.byteLength, "destination will overflow");
  assert(elSz > 0, "element size must be >0");
  assert(srcOset >= 0, "source offset must be >=0");
  assert(dstOset >= 0, "destination offset must be >=0");
  assert(n >= 0, "elems copied must be >=0");

  // https://github.com/AssemblyScript/assemblyscript/issues/743#issuecomment-518022808
  const srcPtr = changetype<usize>(src);
  const dstPtr = changetype<usize>(dst);

  if (n !== 0) {
    memory.copy(dstPtr + elSz * dstOset, srcPtr + elSz * srcOset, elSz * n);
  }
}

/** checked fast memory copy between two float32arrays */
@inline
export function memcpy_f32(
  src: Float32Array,
  dst: Float32Array,
  srcOset: isize,
  dstOset: isize,
  n: isize,
): void {
  return memcpy(src.buffer, dst.buffer, srcOset, dstOset, Float32Array.BYTES_PER_ELEMENT, n);
}

/** checked load f32x4 from Float32Array */
export function f32x4_load(buf: Float32Array, i: isize): v128 {
  assert(i >= 0, "index must be >=0");
  assert(i + 3 < buf.length, "index will overflow");
  
  return v128.load(buf.dataStart + i * Float32Array.BYTES_PER_ELEMENT);
}

/** checked store f32x4 to Float32Array */
export function f32x4_store(v: v128, buf: Float32Array, i: isize): void {
  assert(i >= 0, "index must be >=0");
  assert(i + 3 < buf.length, "index will overflow");

  v128.store(buf.dataStart + i * Float32Array.BYTES_PER_ELEMENT, v);
}
