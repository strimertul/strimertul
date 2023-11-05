/* eslint-disable no-bitwise */

/*
Copyright (c) 2017-2021 [these people](https://github.com/Rich-Harris/vlq/graphs/contributors)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const chatToInt: Record<string, number> = {};

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('')
  .forEach((char, i) => {
    chatToInt[char] = i;
  });

export default function decode(
  string: string,
): [number, number, number, number] {
  const result: number[] = [];

  let shift = 0;
  let value = 0;

  for (let i = 0; i < string.length; i += 1) {
    let integer = chatToInt[string[i]];

    if (integer === undefined) {
      throw new Error(`Invalid character (${string[i]})`);
    }

    const hasContinuationBit = integer & 32;

    integer &= 31;
    value += integer << shift;

    if (hasContinuationBit) {
      shift += 5;
    } else {
      const shouldNegate = value & 1;
      value >>>= 1;

      if (shouldNegate) {
        result.push(value === 0 ? -0x80000000 : -value);
      } else {
        result.push(value);
      }

      // reset
      value = 0;
      shift = 0;
    }
  }

  return result as [number, number, number, number];
}
