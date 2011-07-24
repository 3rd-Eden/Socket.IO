/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Version of Opera older than 10.70 ships with an EventSource implementation
   * that is still based on older draft, it works fine but it requires
   * different server side encoding. The difference can only be detected on the
   * client side.
   *
   * @api private
   */

  var legacy = 'addEventStream' in window 
        && typeof window.addEventStream == 'function';

  /**
   * Each EventSource element needs a unique id.
   *
   * @api private
   */

  var id = 0;

  /**
   * Expose the constructor.
   */

  exports['event-source'] = ES;

  /**
   * The EventSource transport creates a streaming read only connection with
   * the server. This technique is also known as Server Send Events (SSE).
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function ES (socket) {
    io.Transport.XHR.apply(this, arguments);
    this.index = 'EventSource_' + id++;
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(ES, io.Transport.XHR);

  /**
   * Transport name.
   *
   * @api private
   */

  ES.prototype.name = 'event-source';

  /**
   * Initializes a new EventSource connection.
   *
   * @returns {Transport}
   * @api public
   */

  ES.prototype.open = function () {
    var self = this
      , url = this.prepareUrl()
      , wrapper;

    if (!legacy) {
      this.eventsource = new EventSource(url);
      this.eventsource.onmessage = function (ev) {
        self.onData(ev.data);
      };
    } else {
      // we need create a wrapper element as JavaScript based injection doesn't
      // work.
      wrapper = document.createElement('div');
      (document.body || document.documentElement).appendChild(wrapper);
      wrapper.innerHTML = '<event-source src="'+ url +'" id="'+ this.index +'">';

      this.eventsource = document.getElementById(this.index);
      this.eventsource.addEventListener('io', function (ev) {
        self.onData(ev.data);
      }, false);
    }

    this.eventsource.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Handle errors that `EventSource` might be giving when we are attempting to
   * connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  ES.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Close the established connection and clean up the code if needed.
   *
   * @api public
   */

  ES.prototype.close = function () {
    if (this.eventsource) {
      var wrapper = this.eventsource.parentNode;
      this.eventsource.close();

      // remove the added wrapper
      if (wrapper) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }

    io.Transport.XHR.prototype.close.call(this);
    return this;
  }

  /**
   * Prepare a URL where the server detect if it should respond with legacy
   * encoding.
   *
   * @api private
   */

  ES.prototype.prepareUrl = function () {
    return io.Transport.prototype.prepareUrl.call(this) + (legacy ? '?l=1' : '');
  };

  /**
   * We need to defer the initialization for WebKit or they will keep showing
   * the loading indicator.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  ES.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if the browser supports the EventSource transport
   *
   * @returns {Boolean}
   * @api public
   */

  ES.check = function () {
    return ('EventSource' in window && EventSource.prototype) || legacy;
  };

  /**
   * Checks if the cross domain requests are supported, according to the
   * specification: <http://dev.w3.org/html5/eventsource/> .. NOPE
   *
   * @returns {boolean}
   * @api public
   */

  ES.xdomainCheck = function () {
    return false;
  };

  /**
   * Add the transport to the public io.transports array.
   *
   * @api private
   */

  io.transports.push('event-source');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
