import createAuth0Client from '@auth0/auth0-spa-js';
import { domain, clientId } from './auth_config.json';
import { CognitoIdentityCredentials } from 'aws-sdk/lib/core';

export default class Authenticator {

  #auth0Client;

  async init() {
    this.#auth0Client = await createAuth0Client({
      domain: domain,
      client_id: clientId
    });
    // console.log(`:: Authenticator -> init -> this.auth0Client`, this.#auth0Client);
    return this;
  }

  async logout(credentials) {
    credentials && credentials.clearCachedId();
    sessionStorage.removeItem('id_token');
    await this.#auth0Client.logout({
      returnTo: window.location.origin
    });
    // window.location.href = `https://${process.env.IdpDomainName}/v2/logout?federated`;
  }

  async isAuthenticated() {
    console.log(`:: Authenticator -> isAuthenticated -> this.auth0Client`, this.#auth0Client);
    const isAuthenticated = await this.#auth0Client.isAuthenticated();
    // console.log(`:: Authenticator -> isAuthenticated`, isAuthenticated);
    return isAuthenticated;
  }

  async login() {
    console.log(`:: Authenticator -> login -> this.auth0Client`, this.#auth0Client);
    await this.#auth0Client.loginWithRedirect({
      redirect_uri: window.location.origin
    });
  }

  async getUser() {
    const user = await this.#auth0Client.getUser();
    // console.log(`:: Authenticator -> getUser -> user`, user);
    return { user, idToken:sessionStorage.getItem('id_token') };
  }
  
  async getAccessToken() {
    const hook = this.#hookupXHR(res => {
      console.log(res);
    });
    const token = await this.#auth0Client.getTokenSilently();
    this.#unhookXHR(hook);
    console.log(`:: Authenticator -> getUser -> token`, token);
    return token;
  }

  async validateLogin() {
    let id_token;
    const onResponseLoaded = (responseText) => {
      ({ id_token } = JSON.parse(responseText));
    }
    const hook = this.#hookupXHR(onResponseLoaded);
    await this.#auth0Client.handleRedirectCallback();
    this.#unhookXHR(hook);
    sessionStorage.setItem('id_token', id_token);
    
    return this.getUser();
  }

  #hookupXHR(onResponseLoaded) {
    const originalOpenFunc = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      // console.log('request started!');
      this.addEventListener('load', (e) => onResponseLoaded(this.responseText));
      originalOpenFunc.apply(this, arguments);
    };
    return originalOpenFunc;
  }

  #unhookXHR(originalOpenFunc) {
    XMLHttpRequest.prototype.open = originalOpenFunc;
  }

  static getCognitoIdentity(idToken) {
    // console.log(`:: getCognitoIdentity -> idToken`, idToken);
    const credentials = new CognitoIdentityCredentials({
      IdentityPoolId: process.env.CognitoIdentityPoolId,
      Logins: {
        [process.env.IdpDomainName]: idToken
      }
      // RoleArn: process.env.RoleArn
    }, { region: process.env.CognitoIdentityPoolRegion });
    // console.log(`:: getCognitoIdentity -> credentials`, credentials);
    return credentials;
  }
}