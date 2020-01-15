'use strict';

import * as conv from './builder.js';
import { lookups } from './lookups.js';

export default class Parser {

  static processMessage(rawMessage, terminal, state) {
    const msgArray = new Uint8Array(rawMessage);
    const message = conv.parseMessage(msgArray);
    // console.log(`:: incoming message`, message.MessageId, message.SequenceNumber);
    const messageType = message.MessageType.trim();

    if (messageType === lookups.MessageTypes.OutputStreamData) {
      // console.log(`:: processing OutputStreamData...`, messageType);
      if (message.SequenceNumber === state.expectedIncomingSequenceNumber) {
        // console.log(`:: state : out, in => `, state.outgoingSequenceNumber, state.expectedIncomingSequenceNumber);
        state.expectedIncomingSequenceNumber += 1;
        if (message.PayloadType === lookups.PayloadTypes.HandshakeRequest) { //TODO
        } else if (message.PayloadType === lookups.PayloadTypes.HandshakeComplete) { //TODO
        } else if (message.PayloadType === lookups.PayloadTypes.EncChallengeRequest) { //TODO
        } else {
          terminal.write(conv.decodeData(message.Payload, 0));
          while (state.incomingMsgMap.size > 0) {
            // debugger; //untested
            const msg = state.incomingMsgMap.get(state.expectedIncomingSequenceNumber);
            if (!msg) {
              break;
            }
            terminal.write(conv.decodeData(msg, 0));
            state.incomingMsgMap.delete(msg);
            state.expectedIncomingSequenceNumber += 1
          }
        }
      } else {
        if (message.SequenceNumber > state.expectedIncomingSequenceNumber && state.incomingMsgMap.size < lookups.maxDeferredMsgListSize) {
          console.warn(`deferring message >>> SequenceNumber = `, message.SequenceNumber);
          // debugger; //untested
          state.incomingMsgMap.set(message.SequenceNumber, message.Payload);
        }
      }
      if (message.MessageId) {
        console.log(`:: acknowledging MessageId`, message.MessageId);
        const ackMessage = conv.getAckMessage(messageType, message.MessageId, message.SequenceNumber);
        return { ackMessage };
      }
    }
    else if (messageType === lookups.MessageTypes.AcknowledgeMessage) {
      // console.log(`:: processing AcknowledgeMessage...`);
      const { AcknowledgedMessageSequenceNumber } = conv.parsePayload(message, 0);
      const unackMsgs = state.unacknowledgedMsgList;
      for (let index = 0; index < unackMsgs.length; index++) {
        if (unackMsgs[index].sequenceNumber === AcknowledgedMessageSequenceNumber) {
          // TODO: retrans
          // debugger;
          state.unacknowledgedMsgList = unackMsgs.splice(index, 1);
        }
        else if (unackMsgs[index].sequenceNumber > AcknowledgedMessageSequenceNumber) {
          break;
        }
      }
      return { terminated: false };
    }
    else if (messageType === lookups.MessageTypes.ChannelClosedMessage) {
      // console.log(`:: processing ChannelClosedMessage...`);
      const { Output } = conv.parsePayload(message, 0);
      state.terminated = true;
      // console.log(`:: T.Output`, Output);
      return { terminated: true, errorMessage: Output };
    }
  }

  static processInput(inputChar, state) {
    const payload = conv.encodeText(inputChar);
    const seqNumber = state.outgoingSequenceNumber;
    const message = conv.createMessage(seqNumber, lookups.MessageTypes.InputStreamData, payload, lookups.PayloadTypes.Output);
    state.unacknowledgedMsgList.push({
      sequenceNumber: seqNumber,
      serializedClientMessage: message,
      lastSentTime: (new Date).getTime()
    });
    state.outgoingSequenceNumber += 1;
    return message;
  }

  static createResizeMessage(cols, rows, state) {
    const seqNumber = state.outgoingSequenceNumber;
    const rowsCols = {
      rows: rows,
      cols: cols
    };
    const payloadResize = conv.encodeText(JSON.stringify(rowsCols));
    const message = conv.createMessage(seqNumber, lookups.MessageTypes.InputStreamData, payloadResize, lookups.PayloadTypes.Size);
    state.unacknowledgedMsgList.push({
      sequenceNumber: seqNumber,
      serializedClientMessage: message,
      lastSentTime: (new Date).getTime()
    });
    state.outgoingSequenceNumber += 1;
    return message;
  }
}