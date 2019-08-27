const handleMessage = require('./bridge-lib').handleMessage;

(function() {
  onmessage = (event: MessageEvent) => {
    const message = event.data;
    handleMessage(message, { postMessage });
  };
})();
