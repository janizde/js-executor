const path = require('path');
const { Worker, MessageChannel } = require('worker_threads');

function transferFn(fn) {
  return {
    $$exec_type: 'transfer',
    fn,
  };
}

function loadFn(path, name) {
  return {
    $$exec_type: 'load',
    path,
    name,
  };
}

function refFn(name) {
  return {
    $$exec_type: 'ref',
    name,
  };
}

function* roundRobinSelector(workers) {
  for (let i = 0; true; ++i) {
    yield i % workers.length;
  }
}

class WorkerPoolExecutor {
  constructor(numWorkers) {
    const workers = [];

    for (let i = 0; i < numWorkers; ++i) {
      const worker = new Worker(path.join(__dirname, 'bridge.js'));
      workers.push(worker);
    }

    this.numWorkers = numWorkers;
    this.workers = workers;
    this.workerSelector = roundRobinSelector(workers);
  }
  
  __prepareDescriptor(descriptor) {
    if (descriptor.$$exec_type === 'transfer') {
      return {
        ...descriptor,
        fn: descriptor.fn.toString(),
      };
    }
    
    return descriptor;
  }

  execute(fnDescriptor, data, transferList) {
    const workerIndex = this.workerSelector.next().value;
    const worker = this.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    
    return new Promise((resolve, reject) => {
      execPort.on('error', e => reject(e));
      execPort.on('message', message => {
        switch (message.cmd) {
          case 'result':
            resolve(message.value);
            return;
            
          case 'error':
            const err = new Error(message.message);
            reject(err);
            return;
        }
      });

      worker.postMessage({
        cmd: 'execute',
        port: workerPort,
        fn: this.__prepareDescriptor(fnDescriptor),
        data,
      }, [...(transferList || []), workerPort]);
    });
  }
}

const exec = new WorkerPoolExecutor(2);
async function myFunc(data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const uppercased = Object.keys(data).reduce((accum, key) => ({
        ...accum,
        [key]: data[key].toUppercase(),
      }), {});
      
      resolve(uppercased);
    }, 1000);
  });
}

Promise.all([
  exec.execute(transferFn(myFunc), { foo: 'bar' }),
  exec.execute(transferFn(myFunc), { bar: 'foo' }),
]).then(results => console.log(results));

