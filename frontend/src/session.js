'use strict';

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import SSM from 'aws-sdk/clients/ssm';
import RemoteSessionState from './state.js';
import Parser from './parser.js';
import { v4 as uuidv4 } from 'uuid';

export default class RemoteSession {
  
  state;
  region;
  instanceId;
  terminal;
  messenger;
  credentials;
  sessionId;
  
  constructor(region, instanceId, terminalElem, credentials) {
    this.region      = region;
    this.instanceId  = instanceId;
    this.state       = new RemoteSessionState();
    this.terminalMgr = new TerminalManager(terminalElem, this.state);
    this.terminal    = this.terminalMgr.terminal;
    this.credentials = credentials;
  }

  async start() {
    try {
      const ssm = new SSM({
        region     : this.region,
        credentials: this.credentials
      });
      const { SessionId, TokenValue, StreamUrl } = await ssm.startSession({
        Target: this.instanceId,
      }).promise();

      this.sessionId = SessionId;
      this.messenger = new Messenger(StreamUrl, this.terminalMgr, TokenValue, this.state);
      this.terminalMgr.associateMessenger(this.messenger);

      return { sessionStarted: true, SessionId };

    } catch (e) {
      console.error(e);
      this.terminal.setOption('theme', { background: 'red' });
      this.terminal.writeln(`Oops, something went wrong! please report this and restart your session.`);
      this.terminal.writeln(e.message);
      return { sessionStarted: false, SessionId: null };
    };
  }

  async stop() {
    const ssm = new SSM({ 
      region: this.region, 
      credentials: this.credentials 
    });
    this.terminal.clear();
    this.terminal.writeln(`disconnecting session, please wait...`);
    const terminated = await ssm.terminateSession({
      SessionId: this.sessionId
    }).promise();
    this.messenger.dispose();
    this.credentials.clearCachedId();
    return terminated;
  }

  validateMessage(message) {
    const { Payload, PayloadDigest } = message;
    const hashedPayload = shajs('sha256').update(Payload).digest('hex');
    console.warn(`:: validateMessage -> PayloadDigest === hashedPayload`, PayloadDigest, hashedPayload, PayloadDigest === hashedPayload);
    // console.assert(PayloadDigest === hashedPayload, 'Invalid Payload Digest', );
  }

}

class Messenger {

  state;
  socket;
  terminalMgr;

  constructor(StreamUrl, terminalMgr, TokenValue, state) {
    this.state = state;
    this.socket = new WebSocket(StreamUrl);
    this.socket.binaryType = 'arraybuffer';
    
    this.terminalMgr = terminalMgr;
    const term = terminalMgr.terminal;

    this.socket.onopen = () => {
      term.writeln(`starting handshake...`);
      const handshakePayLoad = {
        MessageSchemaVersion: '1.0',
        RequestId: uuidv4(),
        TokenValue: TokenValue,
      };
      const handshakePayLoadJson = JSON.stringify(handshakePayLoad);
      this.socket.send(handshakePayLoadJson);

      term.writeln(`connected!`, () => {
        terminalMgr.resizeTerminal(term);
        term.clear();
      });
      term.focus();
    };
    this.socket.onmessage = async (event) => {
      const rawMessage = event.data;
      const { ackMessage, terminated, errorMessage } = Parser.processMessage(rawMessage, term, this.state);
      if (terminated) {
        console.warn(`Session has been terminated!`, ackMessage, errorMessage);
        this.dispose();
        return;
      }
      ackMessage && this.socket.send(ackMessage);
      return;
    };
    this.socket.onclose = async (e) => {
      console.warn(`closing session socket!`, e);
      // await this.stop();
    };
  }

  onTerminalDataReceived(data, websocketConnection, state) {
    // console.log(`:: Messenger -> onTerminalDataReceived -> data, websocketConnection, state`, data, websocketConnection, state);
    console.log(data, data.charCodeAt(0));
    const inputMessage = Parser.processInput(data, state);
    // terminal.write(data);
    websocketConnection.send(inputMessage);
  }

  dispose(mustCloseSocket = true) {
    this.state = null;
    this.terminalMgr.dispose();
    mustCloseSocket && this.socket.close();
  }
}

class TerminalManager {
  static terminalOptions = {
    allowTransparency: false,
    convertEol       : false,
    cursorBlink      : true,
    cursorStyle      : 'block',
    fontFamily       : 'Cascadia Code, Consolas, Monaco, monospace',
    fontSize         : 18,
    scrollback       : 10000,
    rendererType     : 'canvas',
    theme            : { background: '#151E27', foreground: 'white' },
  };

  state;
  terminal;
  fitAddon;
  dataListener;
  resizeListener;
  // windowresizeListener = () => this.resizeTerminal();

  constructor(terminalElem, state) {
    this.state = state;
    this.terminal = new Terminal(TerminalManager.terminalOptions);
    this.fitAddon = new FitAddon();
    this.fitAddon.activate(this.terminal);
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(terminalElem);
    this.writeArt();
    this.terminal.writeln(`connecting...`);

    // window.onresize = e => this.resizeTerminal(this.terminal); //TODO: make global
    // window.addEventListener('resize', windowresizeListener);
    window.addEventListener('resize', this.resizeTerminal);
  }

  associateMessenger(messenger) {
    this.socket = messenger.socket;
    this.dataListener = this.terminal.onData(data => messenger.onTerminalDataReceived(data, this.socket, this.state));
    this.resizeListener = this.terminal.onResize(resizeEvent => this.onTerminalResized(resizeEvent, this.socket));
  }

  onTerminalResized(resizeEvent, websocketConnection) {
    const { cols, rows } = resizeEvent;
    console.log(`:: onTerminalResized -> cols, rows`, cols, rows);
    const resizeMessage = Parser.createResizeMessage(cols, rows, this.state);
    // console.log(`:: onTerminalResized -> resizeMessage`, resizeMessage);
    this.socket.send(resizeMessage);
  }

  resizeTerminal() {
    // const fitAddon = this.terminal._addonManager._addons[0].instance;
    // console.log(`:: resizeTerminal -> fitAddOn`, fitAddon);
    // console.log(`:: TerminalManager -> resizeTerminal -> this`, this);
    // this.fitAddon.fit();
    const { cols, rows } = this.proposeGeometry(this.terminal);
    console.log(`:: resizeTerminal -> cols, rows`, cols, rows);
    this.terminal.resize(cols, rows);
  }

  proposeGeometry(terminal) {
    console.log(`:: proposeGeometry -> terminal`, terminal);
    if (!terminal.element.parentElement)
      return null;
    const t = window.getComputedStyle(terminal.element.parentElement)
      , i = window.getComputedStyle(terminal.element)
      , n = parseInt(t.getPropertyValue('height'))
      , r = Math.max(0, parseInt(t.getPropertyValue('width')))
      , a = {
        top   : parseInt(i.getPropertyValue('padding-top')),
        bottom: parseInt(i.getPropertyValue('padding-bottom')),
        right : parseInt(i.getPropertyValue('padding-right')),
        left  : parseInt(i.getPropertyValue('padding-left'))
      }
      , o = a.top + a.bottom
      , s = a.right + a.left
      , u = n - o
      , l = r - s - terminal._core.viewport.scrollBarWidth;
    return {
      cols: Math.floor(l / terminal._core._renderService.dimensions.actualCellWidth),
      rows: Math.floor(u / terminal._core._renderService.dimensions.actualCellHeight)
    }
  }
  
  writeArt() {
    this.terminal.writeln('');
    this.terminal.writeln(String.raw`                     __            __    `);
    this.terminal.writeln(String.raw`   _____  _____  ___| |_ __ _  ___| | __ `);
    this.terminal.writeln(String.raw`  / _ \ \/ / _ \/ __| __/ _' |/ __| |/ / `);
    this.terminal.writeln(String.raw` |  __/>  < (_) \__ \ || (_| | (__|   <  `);
    this.terminal.writeln(String.raw`  \___/_/\_\___/|___/\__\__,_|\___|_|\_\ `);
    this.terminal.writeln('');
    Utils.sleep(5000);
  }

  dispose() {
    // window.onresize = null;
    window.removeEventListener('resize', this.resizeTerminal);
    this.state = null;
    this.dataListener.dispose();
    this.resizeListener.dispose();
    this.terminal.dispose();
  }
}

export class Utils {
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
}

export class Inventory {
  static async getInstances(region, credentials) {
    const ssm = new SSM({
      region: region,
      credentials: credentials
    });
    const instances = await ssm.getInventory({
      Filters: [
        {
          Key   : 'AWS:InstanceInformation.InstanceStatus',
          Values: [ 'Terminated' ],
          Type  : 'NotEqual'
        }
      ]
    }).promise();
    return instances.Entities.map(i => {
      return i.Data['AWS:InstanceInformation'].Content.map(c => {
        return {
          ComputerName: c.ComputerName,
          InstanceId  : c.InstanceId,
          IpAddress   : c.IpAddress,
          PlatformType: c.PlatformType,
          PlatformName: c.PlatformName,
        };
      })[0];
    });
  }
}