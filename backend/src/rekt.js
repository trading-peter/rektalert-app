// Get rid of deprecation message of the telegram lib.
process.env["NTBA_FIX_319"] = 1;

const TelegramBot = require('node-telegram-bot-api');
const Helpers = require('./helpers');
const FTX = require('./exchanges/ftx');
const Bybit = require('./exchanges/bybit');

class RektAlert {
  constructor(config) {
    this.config = config;
    this.chatId = this.config.get('telegram.chatId');

    this.exchanges = {
      ftx: new FTX(config),
      bybit: new Bybit(config)
    };
  }
  
  async start() {
    this.startTelegramBot();
    this.startWebsockets();
  }

  // #### Websocket setup ####
  startWebsockets() {
    Object.keys(this.exchanges).forEach(ex => {
      const instance = this.exchanges[ex];
      instance.startWebsocket();

      instance.on('send', msg => this.send(msg));
    });
  }

  // #### Telegram setup ####

  startTelegramBot() {
    const token = this.config.get('telegram.token');

    if (!token) {
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });

    // Return chat id.
    this.bot.onText(/\/start/, msg => {
      if (!this.chatId) {
        this.chatId = msg.chat.id;
        this.config.set('telegram.chatId', this.chatId);
        this.send(`Hello! You're now my master and I shall only report to you.`);
      }
    });
  }

  async send(msg) {
    if (this.config.get('telegram.enabled') === false) return;

    const result = await Helpers.retry(
      () => this.bot.sendMessage(this.chatId, msg),
      {
        maxTries: 12,
        timeout: 10000,
      }
    );

    if (!result) {
      console.error(`Failed to send telegram message.`);
    }
  }
}

module.exports = RektAlert;
