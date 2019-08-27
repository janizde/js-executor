(function() {
  const parentPort = require('worker_threads').parentPort;
  const handleMessage = require('./bridge-lib').handleMessage;
  parentPort.on('message', (message: any) =>
    handleMessage(message, parentPort)
  );
})();
