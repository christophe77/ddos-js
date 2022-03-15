const httpFlood = require('./http-flood');
const tcpFlood = require('./tcp-flood');
const udpFlood = require('./udp-flood');

const attacks = {
  httpFlood,
  tcpFlood,
  udpFlood,
};

module.exports = attacks;
