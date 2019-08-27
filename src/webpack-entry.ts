/*import IdlePeriodExecutor from './idle-period/idle-period-executor';

const exec = new IdlePeriodExecutor(0, 0);*/

import testMandelbrot from './examples/mandelbrot';

const btn = document.createElement('button');
btn.innerText = 'Start';
document.body.appendChild(btn);

(() => {
  const el = document.createElement('div');
  el.style.backgroundColor = '#f00';
  el.style.position = 'absolute';
  el.style.width = '50px';
  el.style.height = '50px';
  document.body.appendChild(el);

  let top = 0;
  let left = 0;

  const cb = () => {
    top += 5;
    left += 5;
    el.style.top = `${top % window.innerHeight}px`;
    el.style.left = `${left % window.innerWidth}px`;
    window.requestAnimationFrame(cb);
  };

  window.requestAnimationFrame(cb);
})();
/*
btn.addEventListener(
  'click',
  async function() {
    const elements: Array<number> = [];

    for (let i = 0; i < 500; ++i) {
      elements.push(Math.random() * 100);
    }

    const p1 = exec
      .map(
        transferFn(function(data: number) {
          for (let i = 0; i < 50000000; ++i) {}
          return data * 2;
        }),
        elements
      )
      .then(results => {
        (window as any).afterFirst = true;
        console.log('first', results);
      })
      .catch(e => console.log('error', e));

    Promise.all([p1]).then(() => document.writeln('finished'));
  },
  { once: true }
);
*/

btn.addEventListener('click', () => {
  testMandelbrot();
});
