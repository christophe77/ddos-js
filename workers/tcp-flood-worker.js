const net = require('net');
const crypto = require('crypto');
const { workerData, parentPort } = require('worker_threads');

const { host, port } = workerData;

const client = new net.Socket();

client.connect(port, host, () => {
  parentPort.postMessage(`CONNECTED TO: ${host}:${port}`);
  const rawHex = crypto.randomBytes(64);
  client.write(rawHex);
});

client.on('data', (data) => {
  parentPort.postMessage(`DATA: ${data}`);
  client.destroy();
});

client.on('close', () => {
  parentPort.postMessage('Connection closed');
});
