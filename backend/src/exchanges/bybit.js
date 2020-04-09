const { WebsocketClient } = require('@pxtrn/bybit-api');
const EventEmitter = require('events');

class Bybit extends EventEmitter {
  constructor(config) {
    super();

    this.configKey = 'bybit';
    this.config = config;
  }

  startWebsocket() {
    const accounts = this.config.get(this.configKey) || [];
    
    accounts.forEach(acc => {
      const ws = new WebsocketClient({ ...acc, livenet: true }, {
        silly: () => {},
        debug: () => {},
        notice: () => {},
        info: () => {},
        warning: () => {},
        error: () => { console.error(arguments) },
      });

      ws.subscribe([ 'execution' ]);
  
      ws.on('update', order => {
        if (order.topic === 'execution') {
          order.data.forEach(data => {
            this.emit('send', this.buildMsg(data));
          });
        }
      });
    });
  }

  // #### Helpers ####

  isUnfilledOrder(order) {
    return order.leaves_qty === order.exec_qty;
  }

  isClosedMarketOrder(order) {
    return order.is_maker === false && order.leaves_qty === 0;
  }

  buildMsg(data) {
    if (this.isClosedMarketOrder(data)) {
      const { exec_qty, price, symbol, side } = data;

      // If reduce only equals true, we assume it's a stop market. Sadly no other way to differentiate afaik.
      return `Bybit: Filled market ${side.toLowerCase()} order:\n${symbol} ${exec_qty} @ ${price}`;
    }

    if (data.is_maker === true) {
      const { leaves_qty, exec_qty, price, symbol, side } = data;
      const fillStateStr = leaves_qty > 0 ? 'Partially filled' : 'Filled';

      return `Bybit: ${fillStateStr} limit ${side.toLowerCase()} order:\n${symbol} ${exec_qty} of ${exec_qty} @ ${price}`;
    }
  }
}

module.exports = Bybit;
