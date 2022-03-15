const https = require('https');
const http = require('http');
const { workerData, parentPort } = require('worker_threads');
const utils = require('../utils');

const { url, timeout } = workerData;

const isHttps = () => url.indexOf('https://') === 0;

function req() {
  const options = {
    timeout,
    headers: { 'User-Agent': utils.randomUserAgent },
  };
  const protocol = isHttps() ? https : http;

  protocol
    .get(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        parentPort.postMessage(JSON.parse(data).explanation);
      });
    })
    .on('error', (err) => {
      parentPort.postMessage(`Error: ${err.message}`);
    });
}

req();
