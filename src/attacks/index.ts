import httpFlood from './http-flood';
import slowloris from './slowloris';
import http2RapidReset from './http2-rapid-reset';
import tcpFlood from './tcp-flood';
import udpFlood from './udp-flood';
import dnsFlood from './dns-flood';

const attacks = {
  httpFlood,
  slowloris,
  http2RapidReset,
  tcpFlood,
  udpFlood,
  dnsFlood,
};

export default attacks;
