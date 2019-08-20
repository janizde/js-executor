(function() {
  const parentPort = require('worker_threads');
  const handleMessage = require('./bridge-lib').handleMessage;
  parentPort.on('message', message => handleMessage(message, parentPort));
})();
