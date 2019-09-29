import * as Examples from './mandelbrot';

(() => {
  const el = document.createElement('div');
  el.style.backgroundColor = '#f00';
  el.style.position = 'absolute';
  el.style.width = '50px';
  el.style.height = '50px';
  el.style.border = '1px solid green';
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

const buttonsCont = document.createElement('div');
document.body.appendChild(buttonsCont);
function createButton(label: string) {
  const btn = document.createElement('button');
  btn.innerText = label;
  buttonsCont.appendChild(btn);
  return btn;
}

let n = 0;

(() => {
  const btnBlock = createButton('Block Main Thread');
  btnBlock.addEventListener('click', () => {
    for (let i = 0; i < 10000; ++i) {
      for (let j = 0; j < 1000; ++j) {
        n = Math.pow(i, j);
      }
    }
  });

  const btnSync = createButton('Sync setTimeout');
  btnSync.addEventListener('click', () => Examples.mandelbrotSync());

  const btnIdleCb = createButton('Idle Callback');
  btnIdleCb.addEventListener('click', () => Examples.mandelbrotIdleCallback());

  const btnWorker = createButton('Single Worker');
  btnWorker.addEventListener('click', () => Examples.mandelbrotWorker());

  const btnPool = createButton('Worker Pool');
  btnPool.addEventListener('click', () => Examples.mandelbrotPool());

  const btnPoolAnimFrame = createButton('Pool Animation Frame');
  btnPoolAnimFrame.addEventListener('click', () =>
    Examples.mandelbrotPoolAnimationFrame()
  );
})();
