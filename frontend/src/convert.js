// import { v4 as uuidv4 } from 'uuid';

export function bytesToInt32(byteArray) {
    // console.log(`:: byteArray`, byteArray);
    // console.log(`:: rawBytes`, byteArray);
    // return view.getInt32(0);
    const arr = new Uint8Array(byteArray);
    const view = new DataView(arr.buffer);
    return view.getInt32(0);
}

export function int32ToBytes(inputInt32) {
    const view = new DataView(new ArrayBuffer(4));
    view.setInt32(0, inputInt32);
    return new Uint8Array(view.buffer);
}

export function uint32ToBytes(inputUint32) {
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, inputUint32);
    return new Uint8Array(view.buffer);
}

export function int64ToBytes(inputInt64) {
    var big = Int64BE(inputInt64);
    var buf = new Uint8Array(big.toArrayBuffer());
    return buf;
    // const view = new DataView(new ArrayBuffer(8));
    // view.setBigInt64(0, inputInt64);
    // return new Uint8Array(view.buffer);
}

export function uint64ToBytes(inputUint64) {
    var big = Uint64BE(inputUint64);
    var buf = new Uint8Array(big.toArrayBuffer());
    return buf;
    // const view = new DataView(new ArrayBuffer(8));
    // view.setBigUint64(0, inputUint64);
    // return new Uint8Array(view.buffer);
}

export function guidToBytes() {
    const buffer = new Array();
    uuidv4(null, buffer, 0);
    // console.log(`:: guidToBytes -> buffer`, buffer);
    return new Uint8Array(buffer);
}

// // https://gist.github.com/daboxu/4f1dd0a254326ac2361f8e78f89e97ae
// export function guidToBytes(guid) {
//     var bytes = [];
//     guid.split('-').map((number, index) => {
//         var bytesInChar = index < 3 ? number.match(/.{1,2}/g).reverse() : number.match(/.{1,2}/g);
//         bytesInChar.map((byte) => { bytes.push(parseInt(byte, 16)); })
//     });
//     return bytes;
// }

export function bytesToGuid(rawBytes) {
    console.log(`:: bytesToGuid -> rawBytes`, rawBytes);
    const uuidParse = require('uuid-parse');
    return uuidParse.unparse(new Uint8Array(rawBytes));
    // return uuidv4({ random: new Uint8Array(rawBytes) });
}

export function bytesToLong(byteArray, beginIndex, endIndex) {
    return new Uint64BE(byteArray).toNumber();
    // let result = 0;
    // for (let index = 0; index < endIndex - beginIndex; index++) {
    //     result = result + (byteArray[endIndex - 1 - index] * Math.pow(256, index));
    // }
    // return result;
}

export function bytesToString(byteArray, EncodingType = 'utf-8') {
    // console.log(`:: bytesToString -> byteArray`, byteArray);
    // replace is used to trim null characters
    return new TextDecoder(EncodingType).decode(byteArray).replace(/\0/g, '').trim();
}

export function stringToBytes(inputString) {
    return new TextEncoder().encode(inputString);
}

export function bytesToHex(rawBytes) {
    const bytes = new Uint8Array(rawBytes);
    for (var hex = [], i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("");
}

export function buf2hex(arrayBuffer) { // buffer is an ArrayBuffer
    console.log(`:: functionbuf2hex -> arrayBuffer`, arrayBuffer);
    // return Array.prototype.map.call(new Uint8Array(arrayBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    if (typeof arrayBuffer !== 'object' || arrayBuffer === null || typeof arrayBuffer.byteLength !== 'number') {
        throw new TypeError('Expected input to be an ArrayBuffer')
    }

    var view = new Uint8Array(arrayBuffer)
    var result = ''
    var value

    for (var i = 0; i < view.length; i++) {
        value = view[i].toString(16)
        result += (value.length === 1 ? '0' + value : value)
    }

    return result
}

export function hexToArrayBuffer(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('Expected input to be a string')
    }

    if ((hex.length % 2) !== 0) {
        throw new RangeError('Expected string to be an even number of characters')
    }

    var view = new Uint8Array(hex.length / 2)

    for (var i = 0; i < hex.length; i += 2) {
        view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }

    return view.buffer
}

export function toHexString(rawBytes) {
    const byteArray = new Uint8Array(rawBytes);
    // return Array.from(byteArray, function (byte) {
    //     return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    // }).join('');
    // let s = '0x';
    // byteArray.forEach(function (byte) {
    //     s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    // });
    // return s;
    return Array.from(byteArray)
        .map(byte => byteToHex(byte))
        .join('');

    function byteToHex(byte) {
        // convert the possibly signed byte (-128 to 127) to an unsigned byte (0 to 255).
        // if you know, that you only deal with unsigned bytes (Uint8Array), you can omit this line
        const unsignedByte = byte & 0xff;

        // If the number can be represented with only 4 bits (0-15), 
        // the hexadecimal representation of this number is only one char (0-9, a-f). 
        if (unsignedByte < 16) {
            return '0' + unsignedByte.toString(16);
        } else {
            return unsignedByte.toString(16);
        }
    }
}
export function getUint64(dataview, byteOffset, littleEndian) {
    // split 64-bit number into two 32-bit (4-byte) parts
    const left = dataview.getUint32(byteOffset, littleEndian);
    const right = dataview.getUint32(byteOffset + 4, littleEndian);
    // combine the two 32-bit values
    const combined = littleEndian ? left + 2 ** 32 * right : 2 ** 32 * left + right;
    if (!Number.isSafeInteger(combined))
        console.warn(combined, 'exceeds MAX_SAFE_INTEGER. Precision may be lost');
    return combined;
}
