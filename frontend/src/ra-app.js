/**
@license
Copyright (c) 2019 trading_peter
This program is available under Apache License Version 2.0
*/

import { LitElement, html } from 'lit-element/lit-element.js';
const Config = require('electron').remote.getGlobal('config');
const { shell } = require('electron');
const IPC = require('electron').ipcRenderer;
const version = require('../../package.json').version;

/**
# ra-app
*/

class RaApp extends LitElement {
  render() {
    const tgIsSetup = Boolean(this._tgToken);
    const selAcc = this._selAccount || {};

    return html`
      <style>
        :host {
          --font-color: #fffeff;
          --hl-color1: #4b63c1;
          --hl-color2: #4a7ec1;
          --invalid-color: #791818;
          --invalid-color-light: #e87272;

          display: flex;
          flex-direction: column;
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: #252a3f;
          color: var(--font-color);
          padding: 30px;
          overflow-y: auto;
        }

        div.main {
          flex: 1;
        }

        a {
          color: var(--hl-color2);
        }

        h1 {
          margin: 0;
          font-size: 40px;
          font-weight: normal;
        }

        header,
        .horizontal {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        button {
          background: var(--hl-color1);
          border: none;
          color: var(--font-color);
          cursor: pointer;
          font-size: 16px;
        }

        button:hover {
          background: var(--hl-color2);
        }

        button.icon-like {
          font-size: 12px;
          font-weight: bold;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rounded {
          border-radius: 50px;
          padding: 10px 20px;
          outline: none;
        }

        section {
          margin-top: 30px;
          padding: 20px;
          background: #353c5d;
          border-radius: 10px;
        }

        section h2 {
          margin: 0;
        }

        input[type="text"],
        input[type="password"] {
          padding: 10px 15px;
          border: solid 1px #353c5d;
          border-radius: 50px;
          font-size: 16px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
          box-shadow: 0 0 8px var(--hl-color2);
        }

        input[name="token"] {
          width: 300px;
        }

        input.invalid {
          background: var(--invalid-color);
        }

        dialog input.invalid {
          background: var(--invalid-color-light);
        }

        .center {
          text-align: center;
        }

        .margin-left {
          margin-left: 10px;
        }

        dialog {
          border-radius: 10px;
        }

        dialog h3 {
          margin: 0 0 20px 0;
        }

        label {
          display: block;
          margin-bottom: 5px;
        }

        .control-box {
          margin-bottom: 20px;
        }

        .buttons {
          margin-top: 30px;
        }

        .account {
          margin: 20px 0 0 0;
        }

        .red {
          background: red;
        }

        button.red:hover {
          background: darkred;
        }

        footer {
          padding-top: 20px;
          font-size: 12px;
        }
      </style>

      <div class="main">
        <header>
          <h1>RektAlert</h1>
          ${this._needsRestart ? html`
            <button class="rounded red" @click=${() => IPC.send('restart-app')}>RESTART APP TO APPLY CHANGES</button>
          ` : null}
          ${tgIsSetup && !this._showTgSetup ? html`<button class="rounded" @click=${() => this._showTelegramSetup()}>Telegram Connection</button>` : null }
        </header>
  
        ${tgIsSetup && !this._showTgSetup ? null : html`
          <section>
            <h2>Telegram Connection</h2>
            <p>Start a direct chat with <a href="https://t.me/botfather" @click=${e => this._openLink(e)}>BotFather</a>, send the command <strong>/newbot</strong> and follow the instructions. It will generate a token for your new bot. Enter the token below and click <strong>Save</strong>.</p>
            <div class="center">
              <input type="password" name="token" placeholder="Enter Telegram Bot Token" .value=${this._tgToken || ''}>
              <button class="margin-left rounded" @click=${() => this._saveTgToken()}>Save</button>
            </div>
          </section>
        `}
  
        ${this._hasChatId && tgIsSetup ? null : html`
          <section>
            <div><strong>IMPORTANT:</strong> Please open the direct chat with your bot and send <strong>/start</strong> to activate it!</div>
          </section>
        `}
  
        <section>
          <h2 class="horizontal">
            <div>FTX Accounts</div>
            <button class="rounded" @click=${() => this._addAccount()}>Add</button>
          </h2>
          ${this._accounts.map(acc => html`
            <div class="account horizontal">
              <div>
                Account: ${acc.subaccount ? acc.subaccount : 'Main'}
              </div>
              <div>
                Key: ${this._formatApiKey(acc)}
              </div>
              <button class="rounded icon-like" @click=${() => this._confirmDeleteAccount(acc)}>X</button>
            </div>
          `)}
  
          ${this._accounts.length === 0 ? html`
            <p>No Account Added Yet</p>
          ` : null}
        </section>
  
        <dialog id="editAccountDialog">
          <h3>Edit Account</h3>
          <div class="control-box">
            <label>API Key</label>
            <input type="password" name="key" .value=${selAcc.key || ''} required>
          </div>
          
          <div class="control-box">
            <label>API Secret</label>
            <input type="password" name="secret" .value=${selAcc.secret || ''} required>
          </div>
  
          <div class="control-box">
            <label>Subaccount (leave empty for main account)</label>
            <input type="text" name="subaccount" .value=${selAcc.subaccount || ''}>
          </div>
          
          <div class="buttons horizontal">
            <button class="rounded" @click=${() => this._closeEditDialog()}>Cancel</button>
            <button class="rounded" @click=${() => this._saveAccount()}>Save</button>
          </div>
        </dialog>
  
        <dialog id="confirmDeleteAccountDialog">
          <h3>Please Confirm</h3>
          <p>Do you want to delete this API connection?</p>
  
          <div class="buttons horizontal">
            <button class="rounded" @click=${() => this._closeDialog('confirmDeleteAccountDialog')}>Cancel</button>
            <button class="rounded" @click=${() => this._deleteAccount()}>Yes, Delete!</button>
          </div>
        </dialog>
      </div>

      <footer class="horizontal">
        <div>
          Make with ❤️ by <a href="https://twitter.com/trading_peter" @click=${e => this._openLink(e)}>@trading_peter</a>
        </div>
        <div>
          v${this._version}
        </div>
      </footer>
    `;
  }

  static get properties() {
    return {
      _config: { type: Object },
      _selAccount: { type: Object },
      _tgToken: { type: String },
      _showTgSetup: { type: Boolean },
      _hasChatId: { type: Boolean },
      _accounts: { type: Array },
      _selAccIdx: { type: Number },
      _needsRestart: { type: Boolean },
      _version: { type: String }
    };
  }

  constructor() {
    super();

    this._config = Config;
    this._tgToken = this._config.get('telegram.token');
    this._hasChatId = Boolean(this._config.get('telegram.chatId'));
    this._accounts = Config.get('ftx') || [];
    this._version = version;
  }

  _openLink(e) {
    e.preventDefault();
    shell.openExternal(e.target.href);
  }

  _saveTgToken() {
    const ctl = this.shadowRoot.querySelector('input[name="token"]');
    const token = ctl.value.trim();
    
    if (!token) {
      ctl.classList.add('invalid');
      return;
    } else {
      ctl.classList.remove('invalid');
    }

    this._config.set('telegram.token', token);
    this._needsRestart = true;
    this._tgToken = token;
    this._showTgSetup = false;
  }

  _showTelegramSetup() {
    this._showTgSetup = true;
  }

  _addAccount() {
    this._selAccount = {};
    this.shadowRoot.querySelector('#editAccountDialog').showModal();
  }

  _saveAccount() {
    const values = {};
    let failed = false;
    this._getEditDialogControls().forEach(el => {
      if (!el.value.trim() && el.hasAttribute('required')) {
        el.classList.add('invalid');
        failed = true;
      } else {
        el.classList.remove('invalid');
      }

      values[el.name] = el.value.trim();
    });

    if (failed) return;
    
    if (typeof this._selAccIdx === 'number') {
      this._accounts[this._selAccIdx] = values;
    } else {
      this._accounts.push(values);
    }

    this._closeEditDialog();
    this._config.set('ftx', this._accounts);
    this._needsRestart = true;
    this.requestUpdate('_accounts');
  }
  
  _deleteAccount() {
    this._accounts = this._accounts.filter(acc => acc.key !== this._selAccount.key);
    this._config.set('ftx', this._accounts);
    this._needsRestart = true;
    this._closeDialog('confirmDeleteAccountDialog')
  }

  _closeEditDialog() {
    this.shadowRoot.querySelector('#editAccountDialog').close();
    this._getEditDialogControls().forEach(el => {
      el.value = '';
      el.classList.remove('invalid');
    });
  }

  _getEditDialogControls() {
    return this.shadowRoot.querySelector('#editAccountDialog').querySelectorAll('input');
  }

  _confirmDeleteAccount(acc) {
    this._selAccount = acc;
    this.shadowRoot.querySelector('#confirmDeleteAccountDialog').showModal();
  }

  _closeDialog(id) {
    this.shadowRoot.querySelector(`#${id}`).close();
  }

  _formatApiKey(acc) {
    return `${acc.key.substring(0, 6)}...${acc.key.slice(-6)}`;
  }
}

window.customElements.define('ra-app', RaApp);