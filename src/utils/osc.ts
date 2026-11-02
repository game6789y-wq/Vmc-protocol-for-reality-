/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure TypeScript OSC 1.0 Binary Encoder & Decoder.
 * Fully compatible with Open Sound Control specification (4-byte alignment, Big-Endian).
 */

export interface OSCMessage {
  address: string;
  types?: string;
  args: (string | number | boolean | Uint8Array)[];
}

export interface OSCBundle {
  timetag: [number, number]; // [seconds, fractions]
  elements: (OSCMessage | OSCBundle)[];
}

/**
 * Pad a byte length up to the nearest multiple of 4.
 */
export function pad4(length: number): number {
  return (length + 3) & ~3;
}

/**
 * Write a null-terminated string aligned to 4-byte boundary.
 */
function writePaddedString(str: string, buffer: Uint8Array, offset: number): number {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  buffer.set(bytes, offset);
  let end = offset + bytes.length;
  // Null terminator
  buffer[end++] = 0;
  // Pad with zeroes
  while (end % 4 !== 0) {
    buffer[end++] = 0;
  }
  return end;
}

/**
 * Read a null-terminated 4-byte aligned string from buffer.
 */
function readPaddedString(buffer: Uint8Array, offset: number): { str: string; nextOffset: number } {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end++;
  }
  const decoder = new TextDecoder();
  const str = decoder.decode(buffer.subarray(offset, end));
  // Advance past the null byte and to the next 4-byte boundary
  const nextOffset = pad4(end + 1);
  return { str, nextOffset };
}

/**
 * Encode an OSC Message into binary Uint8Array.
 */
export function encodeOSCMessage(msg: OSCMessage): Uint8Array {
  const encoder = new TextEncoder();
  const addrBytes = encoder.encode(msg.address);
  const addrLen = pad4(addrBytes.length + 1);

  // Build type tags
  let typeTag = ',';
  for (const arg of msg.args) {
    if (typeof arg === 'string') {
      typeTag += 's';
    } else if (typeof arg === 'number') {
      if (Number.isInteger(arg) && !Number.isNaN(arg)) {
        typeTag += 'i';
      } else {
        typeTag += 'f';
      }
    } else if (typeof arg === 'boolean') {
      typeTag += arg ? 'T' : 'F';
    } else if (arg instanceof Uint8Array) {
      typeTag += 'b';
    }
  }

  const typeBytes = encoder.encode(typeTag);
  const typeLen = pad4(typeBytes.length + 1);

  // Compute total size for args
  let argsLen = 0;
  for (let i = 0; i < msg.args.length; i++) {
    const arg = msg.args[i];
    const t = typeTag[i + 1];
    if (t === 's') {
      const b = encoder.encode(arg as string);
      argsLen += pad4(b.length + 1);
    } else if (t === 'i' || t === 'f') {
      argsLen += 4;
    } else if (t === 'b') {
      const b = arg as Uint8Array;
      argsLen += 4 + pad4(b.length);
    }
    // T and F require 0 data bytes in OSC 1.0/1.1
  }

  const totalLen = addrLen + typeLen + argsLen;
  const buffer = new Uint8Array(totalLen);
  const view = new DataView(buffer.buffer);

  let offset = writePaddedString(msg.address, buffer, 0);
  offset = writePaddedString(typeTag, buffer, offset);

  for (let i = 0; i < msg.args.length; i++) {
    const arg = msg.args[i];
    const t = typeTag[i + 1];
    if (t === 's') {
      offset = writePaddedString(arg as string, buffer, offset);
    } else if (t === 'i') {
      view.setInt32(offset, arg as number, false); // Big endian
      offset += 4;
    } else if (t === 'f') {
      view.setFloat32(offset, arg as number, false); // Big endian
      offset += 4;
    } else if (t === 'b') {
      const blob = arg as Uint8Array;
      view.setInt32(offset, blob.length, false);
      offset += 4;
      buffer.set(blob, offset);
      offset += blob.length;
      while (offset % 4 !== 0) {
        buffer[offset++] = 0;
      }
    }
  }

  return buffer;
}

/**
 * Decode binary buffer into OSCMessage.
 */
export function decodeOSCMessage(buffer: Uint8Array): OSCMessage {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Read Address
  const { str: address, nextOffset: afterAddr } = readPaddedString(buffer, 0);

  // Read Type Tag
  let types = '';
  let offset = afterAddr;

  if (offset < buffer.length && buffer[offset] === 44) { // ','
    const { str: tagStr, nextOffset: afterTypes } = readPaddedString(buffer, offset);
    types = tagStr.slice(1);
    offset = afterTypes;
  }

  const args: (string | number | boolean | Uint8Array)[] = [];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (t === 's') {
      const { str, nextOffset } = readPaddedString(buffer, offset);
      args.push(str);
      offset = nextOffset;
    } else if (t === 'i') {
      const val = view.getInt32(offset, false);
      args.push(val);
      offset += 4;
    } else if (t === 'f') {
      const val = view.getFloat32(offset, false);
      args.push(val);
      offset += 4;
    } else if (t === 'T') {
      args.push(true);
    } else if (t === 'F') {
      args.push(false);
    } else if (t === 'b') {
      const len = view.getInt32(offset, false);
      offset += 4;
      const blob = buffer.slice(offset, offset + len);
      args.push(blob);
      offset = pad4(offset + len);
    }
  }

  return { address, types, args };
}
