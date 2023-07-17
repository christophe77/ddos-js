const httpFlood = require('./http-flood');
const tcpFlood = require('./tcp-flood');
const udpFlood = require('./udp-flood');
const dnsFlood = require('./dns-flood');
const dnsReflectionAmplification = require('./dns-reflection-amplification')

const attacks = {
  httpFlood,
  tcpFlood,
  udpFlood,
  dnsFlood,
  dnsReflectionAmplification
};

module.exports = attacks;
