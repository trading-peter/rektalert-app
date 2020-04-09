const FTXWS = require('ftx-api-ws');
const EventEmitter = require('events');

class FTX extends EventEmitter {
  constructor(config) {
    super();

    this.configKey = 'ftx';
    this.config = config;
  }

  startWebsocket() {
    const accounts = this.config.get(this.configKey) || [];
    
    accounts.forEach(async acc => {
      if (typeof acc.subaccount === 'string' && acc.subaccount.trim() === '') {
        delete acc.subaccount;
      }
      
      const ftx = new FTXWS(acc);
  
      await ftx.connect();
  
      ftx.subscribe('orders');

      ftx.on('orders', order => {
        if (this.isUnfilledOrder(order)) return;
        this.emit('send', this.buildMsg(acc, order));
      });
    });
  }

  // #### Helpers ####

  isUnfilledOrder(order) {
    return order.filledSize === 0;
  }

  isClosedMarketOrder(order) {
    return order.type === 'market' && order.status === 'closed';
  }

  buildMsg(acc, data) {
    const accountName = acc.subaccount ? `Subaccount ${acc.subaccount}` : 'Main Account';

    if (this.isClosedMarketOrder(data)) {
      const { filledSize, avgFillPrice, reduceOnly, market } = data;

      // If reduce only equals true, we assume it's a stop market. Sadly no other way to differentiate afaik.
      if (reduceOnly === true) {
        return `FTX: Filled stop market order:\n${market} ${filledSize} @ ${avgFillPrice}\n(${accountName})`;
      } else {
        return `FTX: Filled market order:\n${market} ${filledSize} @ ${avgFillPrice}\n(${accountName})`;
      }
    }

    if (data.type === 'limit') {
      const { remainingSize, filledSize, size, reduceOnly, price, market } = data;
      const fillStateStr = remainingSize > 0 ? 'Partially filled' : 'Filled';

      // If reduce only equals true, we assume it's a stop limit. Sadly no other way to differentiate afaik.
      if (reduceOnly === true) {
        return `FTX: ${fillStateStr} stop limit order:\n${market} ${filledSize} of ${size} @ ${price}\n(${accountName})`;
      } else {
        return `FTX: ${fillStateStr} limit order:\n${market} ${filledSize} of ${size} @ ${price}\n(${accountName})`;
      }
    }
  }
}

module.exports = FTX;
