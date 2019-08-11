const { parentPort } = require('worker_threads');

parentPort.on('message', message => {
  if (message.cmd === 'execute') {
    const port = message.port;
    
    if (message.fn.$$exec_type !== 'transfer') {
      return;
    }
    
    const func = new Function('data', `
      return (${message.fn.fn})(data);
    `);
    
    Promise.resolve()
    .then(() => func(message.data))
    .then(result => {
      port.postMessage({
        cmd: 'result',
        value: result,
      });
    })
    .catch(err => {
      postMessage({
        cmd: 'error',
        message: err.message,
      })
    });
  }
});
