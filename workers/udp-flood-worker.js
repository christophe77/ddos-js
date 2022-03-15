const dgram = require('dgram');
const crypto = require('crypto');
const { workerData, parentPort } = require('worker_threads');

const { host, port } = workerData;

const client = dgram.createSocket('udp4');
const rawHex = crypto.randomBytes(64);

client.send(rawHex, port, host, (error) => {
  if (error) {
    client.close();
  } else {
    parentPort.postMessage('Data sent');
  }
});
