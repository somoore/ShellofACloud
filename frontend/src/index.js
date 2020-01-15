'use strict';

import './assets/images/logo2.png';
import './assets/images/auth0_logo.png';
import 'xterm/css/xterm.css';
import './assets/css/app.css';
import './assets/css/main.css';
import './assets/css/github-ribbon.css';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';
import { Spinner } from 'spin.js';
import 'spin.js/spin.css';
import * as $ from 'jquery';
import Handlebars from 'handlebars';

import RemoteSession, { Inventory, Utils } from './session.js';
import Authenticator from './auth/auth';

const userMessage   = $('#user-message');
const userPicture   = $('#user-picture');
const loginButtton  = $('.btn-login');
const logoutButtton = $('#btn-logout');
const containerElem = $('#container');
const regionsElem   = $('#regions-list');
const terminalCont  = $('#terminal-container');
const instancesCont = $('#instance-container');
const sessionsList  = [];
let credentials;

$(async () => { 
    try{
        showSpinner();

        const auth = await new Authenticator().init();
        let { user, idToken } = await auth.getUser();
        // console.log(`:: window.onload -> user, idToken`, user, idToken);

        setViewState({ loggedInUser:user });
        loginButtton.off().on('click', async (e) => {
            e.preventDefault();
            await auth.login();
        });
        logoutButtton.off().on('click', async (e) => {
            e.preventDefault();
            await auth.logout(credentials)
        });
        
        if (user && idToken) {
            // await auth.getAccessToken();
            return await bootstrapApp(user, idToken);
        } else {
            userMessage.html(`Sign up or login to get started!`);
        }
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
            ({ user, idToken } = await auth.validateLogin());
            window.history.replaceState({}, document.title, '/');
            return await bootstrapApp(user, idToken);
        } else if (query.includes('error=access_denied')) {
            console.error(`Oops! something went wrong`, query);
            window.history.replaceState({}, document.title, '/');
        }

    } finally {
        hideSpinner();
    }

    // loginButtton.click();
});

const spinner = new Spinner({
    lines : 12,
    length: 100,
    color : ['black', 'indigo', 'midnightblue'],
});

function showSpinner() {
    $('#container').prop('hidden', true).hide();
    $('#spinner').prop('hidden', false).show();
    const target = document.getElementById('spinner');
    spinner.spin(target);
}

function hideSpinner() {
    spinner.stop();
    $('#spinner').prop('hidden', true).hide();
    $('#container').prop('hidden', false).show();
}

// window.onbeforeunload = (e) => {
//     // await new Promise(resolve => setTimeout(resolve(), 3000));
//     // e.preventDefault();
//     const message = "Are you sure you want leave?";
//     e.returnValue = message;
//     const sent = navigator.sendBeacon(`https://${process.env.IdpDomainName}/v2/logout?federated`);
//     console.log(`:: window.onbeforeunload -> sent`, sent);
//     return message;
// }

const loginMsg = $('#user-not-loggedin');
function setViewState({ loggedInUser }) {
    loginMsg.prop('hidden', loggedInUser);
    loginButtton.prop('disabled', loggedInUser);
    logoutButtton.prop('disabled', !loggedInUser);
    instancesCont.prop('hidden', !loggedInUser);
    // regionsElem.prop('hidden', !loggedInUser);
    if (loggedInUser) {
        loginMsg.hide();
        loggedInUser.name && userMessage.html(`Welcome <span><abbr title="" style="cursor:pointer">${loggedInUser.name}</abbr></span>!`).show();
        loggedInUser.picture && userPicture.prop('src', loggedInUser.picture).prop('hidden', false).show();
        loginButtton.hide();
        logoutButtton.show();
    } else {
        loginMsg.show();
        userMessage.html(``).hide();
        userPicture.hide().prop('hidden', true).prop('src', ``);
        loginButtton.show();
        logoutButtton.hide();
    }
}

export async function bootstrapApp(user, idToken) {
    setViewState({ loggedInUser: user });
    credentials = Authenticator.getCognitoIdentity(idToken);
    regionsElem.off().on('change', showInstanceList).trigger('change');
    instancesCont.on('click', `${instanceDivSelector} a`, operateInstance);
}

const instanceDivSelector = 'div.instance';
const instancesMssg = $('#instance-message');
const instancesFetch = $('#instance-template-fetch');
const instancesNone = $('#instance-template-none');
const instancesList = $('#instance-template-list');
const instancesCard = $('#instance-template-card');
const instancesShow = 'card' === 'list' ? 'instance-template-list' : 'instance-template-card';

async function showInstanceList() {
    $(instanceDivSelector).remove();
    const region = regionsElem.val();
    instancesMssg.prop('hidden', false).show().html(instancesFetch.html())
        .fadeOut(300).fadeIn(1000).fadeOut(300).fadeIn(1000);
    const instances = await Inventory.getInstances(region, credentials);
    if (!instances || instances.length === 0) {
        instancesMssg.html(instancesFetch.html());
        return;
    } else {
        instancesMssg.prop('hidden', true).hide();
    }
    instancesCont.html(getCompiledMarkup(instancesShow, { instances, region }));
}

const connectStates = {
    connecting   : 1,
    connected    : 2,
    disconnecting: 3,
    disconnected : 4
}

async function operateInstance(e) {
    e.preventDefault();
    const connectElem    = $(e.target);
    const instanceDiv    = connectElem.parents(instanceDivSelector);
    const instanceId     = instanceDiv.data('instance-id');
    const instanceRegion = instanceDiv.data('instance-region');
    
    if (connectElem.text() === 'Connect') {
        setConnectState(connectElem, connectStates.connecting);

        const newTerminal = $(getCompiledMarkup('terminal-template', { instanceId }));
        terminalCont.append(newTerminal);
        const terminalElem = newTerminal.find('div.terminal');
        const {remoteSession, SessionId} = await startSession(instanceRegion, instanceId, terminalElem.get(0), credentials);

        newTerminal.find('span.session-id').html(getCompiledMarkup('terminal-template-session', { instanceId, SessionId }));
        const timer = countdown(newTerminal.find('span.countdown'), connectElem, SessionId, instanceRegion, instanceId );

        sessionsList.push({ 
            region: instanceRegion, instanceId, terminalElem, 
            sessionStartedAt: new Date().toISOString(), 
            SessionId, 
            remoteSession,
            timer
        });

        setConnectState(connectElem, connectStates.connected);
        
    } else if (connectElem.text() === 'Disconnect') {
        await stopSession(instanceRegion, instanceId, connectElem);
    }
}

function setConnectState(connectElem, cs) {
    switch (cs)  {
        case connectStates.connecting:
            return connectElem.text('Connecting...').removeClass('btn-primary').addClass('btn-info').prop('disabled', true);
        case connectStates.connected:
            return connectElem.text('Disconnect').removeClass('btn-info').addClass('btn-warning').prop('disabled', false);
        case connectStates.disconnecting:
            return connectElem.text('Disconnecting...').removeClass('btn-warning').addClass('btn-info').prop('disabled', true);
        case connectStates.disconnected:
            return connectElem.text('Connect').removeClass('btn-info').addClass('btn-primary').prop('disabled', false);
        default: break;
    } 
}


async function startSession(region, instanceId, terminalElem, credentials) {
    console.log(`starting new session for instance: ${instanceId} in region ${region}...`);
    const remoteSession = new RemoteSession(region, instanceId, terminalElem, credentials);
    const { sessionStarted, SessionId } = await remoteSession.start();
    console.log(`:: startApp -> sessionStarted, SessionId`, sessionStarted, SessionId);
    return { remoteSession, SessionId };
}

async function stopSession(region, instanceId, connectElem) {
    console.log(`:: stopSession -> connectElem`, connectElem);
    setConnectState(connectElem, connectStates.disconnecting);
    const { SessionId, remoteSession, sessionIndex, timer } = lookupSession(region, instanceId);
    console.log(`terminating Session ${SessionId} for ${instanceId} in region ${region}...`);
    if (!remoteSession || !SessionId) {
        console.warn(`No existing session found for ${instanceId} in region ${region}`);
        return false;
    }
    const stopped = await remoteSession.stop();
    if (stopped) {
        console.assert(stopped.SessionId === SessionId, `Incorrect sessionId`);
        console.log(`terminated Session ${SessionId} for ${instanceId} in region ${region}`);
        clearInterval(timer);
        sessionsList.splice(sessionIndex, 1);
        $(`div[data-terminal-instance-id="${instanceId}"]`).remove();
        setConnectState(connectElem, connectStates.disconnected);
        return true;
    }
    return false;
}

function lookupSession(region, instanceId) {
    const sessionIndex = sessionsList.findIndex(s => s.region === region && s.instanceId === instanceId);
    if (sessionIndex === -1) {
        console.warn(`No existing session found for ${instanceId} in region ${region}`);
        return { SessionId: null, remoteSession: null };
    }
    const { SessionId, remoteSession, timer } = sessionsList[sessionIndex];
    return { SessionId, remoteSession, sessionIndex, timer };
}

function getCompiledMarkup(templateId, contextObject) {
    const templateSource = $(templateId.startsWith('#') ? templateId : `#${templateId}`).html();
    const template = Handlebars.compile(templateSource);
    return template(contextObject);
}

function countdown(countdownElem, connectElem, sessionId, region, instanceId) {
    console.log(`:: countdown -> countdownElem, connectElem`, countdownElem, connectElem);
    const totalSeconds = 20;
    countdownElem.html(`${totalSeconds} seconds remaining.`);
    const endDate = new Date().setSeconds(new Date().getSeconds() + totalSeconds);
    const timer = setInterval( async() => {
        const startDate = Date.now();
        const seconds = 1 + parseInt((endDate - startDate) / 1000);

        if (seconds > 1) {
            console.log(`:: timer -> seconds`, seconds);
            countdownElem.html(`${seconds} seconds remaining.`);
            seconds <= 15 && countdownElem.removeClass('badge-info').addClass('badge-warning');
            seconds <= 5 && countdownElem.removeClass('badge-warning').addClass('badge-danger');
        } else {
            clearInterval(timer);
            countdownElem.html(`Session timeout!`);
            await stopSession(region, instanceId, connectElem);
            return;
        }
    }, 5000);
    console.log(`:: countdown -> timer HANDLE`, timer);
    return timer;
}