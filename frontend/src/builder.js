'use strict';

import { lookups } from './lookups.js';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from 'sha.js';

// REFERENCE: https://github.com/aws/amazon-ssm-agent/blob/master/agent/session/contracts/agentmessage.go
const HLLength             = 4;
const MessageTypeLength    = 32;
const SchemaVersionLength  = 4;
const CreatedDateLength    = 8;
const SequenceNumberLength = 8;
const FlagsLength          = 8;
const MessageIdLength      = 16;
const PayloadDigestLength  = 32;
const PayloadTypeLength    = 4;
const PayloadLengthLength  = 4;
const HLOffset             = 0;
const MessageTypeOffset    = HLOffset + HLLength;
const SchemaVersionOffset  = MessageTypeOffset + MessageTypeLength;
const CreatedDateOffset    = SchemaVersionOffset + SchemaVersionLength;
const SequenceNumberOffset = CreatedDateOffset + CreatedDateLength;
const FlagsOffset          = SequenceNumberOffset + SequenceNumberLength;
const MessageIdOffset      = FlagsOffset + FlagsLength;
const PayloadDigestOffset  = MessageIdOffset + MessageIdLength;
const PayloadTypeOffset    = PayloadDigestOffset + PayloadDigestLength;
const PayloadLengthOffset  = PayloadTypeOffset + PayloadTypeLength;
const PayloadOffset        = PayloadLengthOffset + PayloadLengthLength;

export function parseMessage(msg) {
  const headerLength = getHeaderLength(msg);
  return {
    MessageType   : decodeData(msg, MessageTypeOffset, MessageTypeOffset + MessageTypeLength),
    SequenceNumber: bytesToLong(msg, SequenceNumberOffset, SequenceNumberOffset + SequenceNumberLength),
    MessageId     : parseGuid(msg, MessageIdOffset),
    PayloadType   : getUInt32(msg, PayloadTypeOffset),
    Payload       : msg.slice(headerLength + PayloadLengthLength)
  };
}

export function getHeaderLength(msg) {
  return bytesToLong(msg, HLOffset, HLOffset + HLLength);
}

export function createMessage(seqNumber, messageType, payloadBytes, payloadType) {

  const payloadLength = payloadBytes.byteLength;
  const messageLength = PayloadLengthOffset + PayloadLengthLength + payloadLength;
  const message = new Uint8Array(messageLength);

  buildMessagePart(message, intToBytes(PayloadLengthOffset), HLOffset, HLOffset + HLLength);
  buildMessagePart(message, encodeText(messageType), MessageTypeOffset, MessageTypeOffset + MessageTypeLength);
  buildMessagePart(message, intToBytes(1), SchemaVersionOffset, SchemaVersionOffset + SchemaVersionLength);
  buildMessagePart(message, intToBytes((new Date).getTime()), CreatedDateOffset, CreatedDateOffset + CreatedDateLength);
  buildMessagePart(message, intToBytes(seqNumber), SequenceNumberOffset, SequenceNumberOffset + SequenceNumberLength);
  buildMessagePart(message, intToBytes(0 === seqNumber ? 1 : 0), FlagsOffset, FlagsOffset + FlagsLength);
  buildMessagePart(message, guidToArray(uuidv4()), MessageIdOffset, MessageIdOffset + MessageIdLength);
  buildMessagePart(message, encodeText(new sha256().update(payloadBytes).digest('hex')), PayloadDigestOffset, PayloadDigestOffset + PayloadDigestLength);
  buildMessagePart(message, intToBytes(payloadType), PayloadTypeOffset, PayloadTypeOffset + PayloadTypeLength);
  buildMessagePart(message, intToBytes(payloadLength), PayloadLengthOffset, PayloadLengthOffset + PayloadLengthLength);
  buildMessagePart(message, payloadBytes, PayloadOffset, PayloadOffset + payloadLength);

  return message;
}

export function getAckMessage(messageType, messageId, seqNumber) {
  const ackMessage = {
    AcknowledgedMessageType: messageType,
    AcknowledgedMessageId: messageId,
    AcknowledgedMessageSequenceNumber: seqNumber,
    IsSequentialMessage: true
  };

  const ackPayload = encodeText(JSON.stringify(ackMessage));
  return createMessage(seqNumber, lookups.MessageTypes.AcknowledgeMessage, ackPayload, lookups.PayloadTypes.Output);
}

export function parseJson(jsonString) {
  return JSON.parse(jsonString);
}

export function parsePayload(msg) {
  return JSON.parse(decodeData(msg.Payload, 0));
}

const EncodingType = 'utf8';

export function decodeData(data, startIndex, endIndex) {
  return new TextDecoder(EncodingType).decode(data.slice(startIndex, endIndex)).replace(/\0/g, '');
}

export function encodeText(e) {
  return new TextEncoder(EncodingType).encode(e)
}

export function intToBytes(intVal) {
  return new Uint8Array([(0xff000000 & intVal) >> 24, (0xff0000 & intVal) >> 16, (0xff00 & intVal) >> 8, 0xff & intVal]);
}

export function getUInt32(message, offset) {
  let num = 0;
  for (let index = 0; index < 4; index++) {
    let mask = 8 * (3 - index);
    num += (255 & message[index + offset]) << mask;
  }
  return num;
}

export function bytesToLong(byteArray, beginIndex, endIndex) {
  let result = 0;
  for (let index = 0; index < endIndex - beginIndex; index++) {
    result += byteArray[endIndex - 1 - index] * Math.pow(256, index);
  }
  return result;
}

export function parseGuid(msg, offset) {
  const part1 = msg.subarray(offset, offset + 8);
  const part2 = msg.subarray(offset + 8, offset + 16);
  const result = new Uint8Array(16);
  buildMessagePart(result, part2, 0, 8);
  buildMessagePart(result, part1, 8, 16);
  return guidToString(result);
}

export function guidToString(guid) {
  let ctr, res = [];
  for (ctr = 0; ctr < 256; ++ctr) {
    res[ctr] = (ctr + 256).toString(16).substr(1);
  }
  
  ctr = 0;
  return res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]] 
    + '-' + res[guid[ctr++]] + res[guid[ctr++]] 
    + '-' + res[guid[ctr++]] + res[guid[ctr++]] 
    + '-' + res[guid[ctr++]] + res[guid[ctr++]] 
    + '-' + res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]] + res[guid[ctr++]];
}

export function guidToArray(guidString) {
  const pairs = guidString.match(/[\da-f]{2}/gi);
  return pairs ? new Uint8Array(pairs.map(p => parseInt(p, 16))) : encodeText(guidString);
}

export function buildMessagePart(result, source, beginIndex, endIndex) {
  const resultLength = result.byteLength;
  const sourceLength = source.byteLength;
  const targetLength = endIndex - beginIndex;
  if (beginIndex >= 0 && endIndex <= resultLength) {
    if (targetLength > sourceLength) {
      const diff = targetLength - sourceLength;
      for (let index = 0; index < sourceLength; index++) {
        result[beginIndex + diff + index] = source[index];
      }
    } else {
      for (let len = 0; len < Math.min(sourceLength, targetLength); len++) {
        result[beginIndex + len] = source[len];
      }
    }
  }
}
