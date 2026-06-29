// a PARTIAL assemblyscript port of fft.js by Fedor Indutny
// which is licensed under the MIT license
// ported by Hazel Atkinson 2024
// only implements realTransform.

/*
Copyright (c) 2021 Fedor Indutny

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

export class FFT {
  size: i32;
  private _csize: i32;
  table: Float32Array;
  private _width: i32;
  private _bitrev: Int32Array;
  private _out: Float32Array | null;
  private _data: Float32Array | null;
  private _inv: i32;

  constructor(size: i32) {
    this._out = null;
    this._data = null;
    this._inv = 0;

    this.size = size;
    if (size <= 1 || (size & (size - 1)) !== 0) {
      throw new Error("FFT size must be a power of 2 and bigger than 1");
    }

    this._csize = size << 1;

    const table = new Float32Array(size * 2);
    for (let i = 0; i < table.length; i += 2) {
      const angle = (Mathf.PI * <f32>i) / <f32>size;
      table[i] = Mathf.cos(angle);
      table[i + 1] = -Mathf.sin(angle);
    }
    this.table = table;
    
    let power = 0;
    for (let t = 1; t < size; t <<= 1) power++;

    // Calculate initial step's width:
    //   * If we are full radix-4 - it is 2x smaller to give inital len=8
    //   * Otherwise it is the same as `power` to give len=4
    const width = power % 2 === 0 ? power - 1 : power;
    this._width = width;

    this._bitrev = new Int32Array(1 << width);
    for (let j = 0; j < this._bitrev.length; j++) {
      for (let shift = 0; shift < this._width; shift += 2) {
        const revShift = this._width - shift - 2;
        this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
      }
    }
  }

  createComplexArray(): Float32Array {
    return new Float32Array(this._csize);
  }

  realTransform(out: Float32Array, data: Float32Array): void {
    if (out === data) {
      throw new Error("Input and output buffers must be different");
    }

    this._out = out;
    this._data = data;
    this._inv = 0;
    this._realTransform4();
    this._out = null;
    this._data = null;
  }

  // Real input radix-4 implementation
  private _realTransform4(): void {
    const out = this._out!;
    const size = this._csize;

    // Initial step (permute and transform)
    const width = this._width;
    let step = 1 << width;
    let len = (size / step) << 1;

    let outOff: i32;
    let t: i32;
    const bitrev = this._bitrev;
    if (len === 4) {
      for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
        const off = bitrev[t];
        this._singleRealTransform2(outOff, off >>> 1, step >>> 1);
      }
    } else {
      // len === 8
      for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
        const off = bitrev[t];
        this._singleRealTransform4(outOff, off >>> 1, step >>> 1);
      }
    }

    // Loop through steps in decreasing order
    const inv: f32 = this._inv ? -1 : 1;
    const table = this.table;
    for (step >>= 2; step >= 2; step >>= 2) {
      len = (size / step) << 1;
      const halfLen = len >>> 1;
      const quarterLen = halfLen >>> 1;
      const hquarterLen = quarterLen >>> 1;

      // Loop through offsets in the data
      for (outOff = 0; outOff < size; outOff += len) {
        for (let i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
          const A = outOff + i;
          const B = A + quarterLen;
          const C = B + quarterLen;
          const D = C + quarterLen;

          // Original values
          const Ar = out[A];
          const Ai = out[A + 1];
          const Br = out[B];
          const Bi = out[B + 1];
          const Cr = out[C];
          const Ci = out[C + 1];
          const Dr = out[D];
          const Di = out[D + 1];

          // Middle values
          const MAr = Ar;
          const MAi = Ai;

          const tableBr = table[k];
          const tableBi = inv * table[k + 1];
          const MBr = Br * tableBr - Bi * tableBi;
          const MBi = Br * tableBi + Bi * tableBr;

          const tableCr = table[2 * k];
          const tableCi = inv * table[2 * k + 1];
          const MCr = Cr * tableCr - Ci * tableCi;
          const MCi = Cr * tableCi + Ci * tableCr;

          const tableDr = table[3 * k];
          const tableDi = inv * table[3 * k + 1];
          const MDr = Dr * tableDr - Di * tableDi;
          const MDi = Dr * tableDi + Di * tableDr;

          // Pre-Final values
          const T0r = MAr + MCr;
          const T0i = MAi + MCi;
          const T1r = MAr - MCr;
          const T1i = MAi - MCi;
          const T2r = MBr + MDr;
          const T2i = MBi + MDi;
          const T3r = inv * (MBr - MDr);
          const T3i = inv * (MBi - MDi);

          // Final values
          const FAr = T0r + T2r;
          const FAi = T0i + T2i;

          const FBr = T1r + T3i;
          const FBi = T1i - T3r;

          out[A] = FAr;
          out[A + 1] = FAi;
          out[B] = FBr;
          out[B + 1] = FBi;

          // Output final middle point
          if (i === 0) {
            const FCr = T0r - T2r;
            const FCi = T0i - T2i;
            out[C] = FCr;
            out[C + 1] = FCi;
            continue;
          }

          // Do not overwrite ourselves
          if (i === hquarterLen) {
            continue;
          }

          // In the flipped case:
          // MAi = -MAi
          // MBr=-MBi, MBi=-MBr
          // MCr=-MCr
          // MDr=MDi, MDi=MDr
          const ST0r = T1r;
          const ST0i = -T1i;
          const ST1r = T0r;
          const ST1i = -T0i;
          const ST2r = -inv * T3i;
          const ST2i = -inv * T3r;
          const ST3r = -inv * T2i;
          const ST3i = -inv * T2r;

          const SFAr = ST0r + ST2r;
          const SFAi = ST0i + ST2i;

          const SFBr = ST1r + ST3i;
          const SFBi = ST1i - ST3r;

          const SA = outOff + quarterLen - i;
          const SB = outOff + halfLen - i;

          out[SA] = SFAr;
          out[SA + 1] = SFAi;
          out[SB] = SFBr;
          out[SB + 1] = SFBi;
        }
      }
    }
  }

  // radix-2 implementation
  // NOTE: Only called for len=4
  private _singleRealTransform2(outOff: i32, off: i32, step: i32): void {
    const out = this._out!;
    const data = this._data!;

    const evenR = data[off];
    const oddR = data[off + step];

    const leftR = evenR + oddR;
    const rightR = evenR - oddR;

    out[outOff] = leftR;
    out[outOff + 1] = 0;
    out[outOff + 2] = rightR;
    out[outOff + 3] = 0;
  }

  // radix-4
  // NOTE: Only called for len=8
  private _singleRealTransform4(outOff: i32, off: i32, step: i32): void {
    const out = this._out!;
    const data = this._data!;
    const inv: f32 = this._inv ? -1 : 1;
    const step2 = step * 2;
    const step3 = step * 3;

    // Original values
    const Ar = data[off];
    const Br = data[off + step];
    const Cr = data[off + step2];
    const Dr = data[off + step3];

    // Pre-Final values
    const T0r = Ar + Cr;
    const T1r = Ar - Cr;
    const T2r = Br + Dr;
    const T3r = inv * (Br - Dr);

    // Final values
    const FAr = T0r + T2r;

    const FBr = T1r;
    const FBi = -T3r;

    const FCr = T0r - T2r;

    const FDr = T1r;
    const FDi = T3r;

    out[outOff] = FAr;
    out[outOff + 1] = 0;
    out[outOff + 2] = FBr;
    out[outOff + 3] = FBi;
    out[outOff + 4] = FCr;
    out[outOff + 5] = 0;
    out[outOff + 6] = FDr;
    out[outOff + 7] = FDi;
  }
}
