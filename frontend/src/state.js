'use strict';

export default class RemoteSessionState {
  constructor() {
    this.sessionId = null;
    this.instanceId = null;
    this.streamUrl = null;
    this.tokenValue = null;
    this.terminated = true;
    this.expectedIncomingSequenceNumber = 0;
    this.outgoingSequenceNumber = 0;
    this.unacknowledgedMsgList = [];
    this.incomingMsgMap = new Map();
    this.encryptionEnabled = false;
    this.decryptionKey = null;
  }
}