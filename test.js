/* eslint-disable no-unused-vars */

const attacks = require('.');

const httpFloodPayload = {
  url: 'http://localhost:3000', threads: 10, timeout: 1000, duration: 5000,
};
// attacks.httpFlood(httpFloodPayload);

const tcpFloodPayload = {
  host: '127.0.0.1', port: 1337, threads: 10, timeout: 1000, duration: 5000,
};

// attacks.tcpFlood(tcpFloodPayload);

const udpFloodPayload = {
  host: '127.0.0.1', port: 31091, threads: 10, timeout: 1000, duration: 5000,
};

attacks.udpFlood(tcpFloodPayload);
