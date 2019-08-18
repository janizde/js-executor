const https = require('https');
const fs = require('fs');
const Stream = require('stream').Transform;
const path = require('path');

import { Transform } from 'stream';

interface ImageDescriptor {
  id: number;
  width: number;
  height?: number;
}

async function fetchImage(data: ImageDescriptor) {
  const url = `https://via.placeholder.com/${data.width}${
    data.height ? `x${data.height}` : ''
  }`;

  try {
    const imageStream: Transform = await new Promise((resolve, reject) => {
      https
        .get(url, res => {
          const str = new Stream();
          res.on('data', chunk => {
            str.push(chunk);
          });
          res.on('end', () => resolve(str));
        })
        .on('error', e => reject(e));
    });

    return await new Promise((resolve, reject) => {
      const imgData = imageStream.read();
      fs.writeFile(
        path.join(__dirname, 'assets', `${data.id}.png`),
        imgData,
        err => {
          if (err) {
            reject(err);
          }

          resolve(imgData);
        }
      );
    });
  } catch (e) {
    console.error(e);
  }
}

const registerTaskFunction = (global as any).registerTaskFunction as Function;

registerTaskFunction('fetchImage', fetchImage);
