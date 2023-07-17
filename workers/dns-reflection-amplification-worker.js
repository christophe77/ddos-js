const dns = require('dns');
const udp = require('dgram');
const { workerData, parentPort } = require('worker_threads');

const { targetIP, dnsServer, port } = workerData;

// Create a UDP socket
const socket = udp.createSocket('udp4');

// Create a buffer for the DNS request
const requestBuffer = Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x77, 0x77, 0x77,
    0x06, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01, 0x00, 0x01
]);

// Send the request to the DNS server
socket.send(requestBuffer, port, dnsServer, (err, bytes) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`Sent ${bytes} bytes`);
    }
});

// Listen for the response
socket.on('message', (msg, rinfo) => {
    // Parse the response
    const responseBuffer = Buffer.from(msg);
    const responseCode = responseBuffer.readUInt16BE(2);
    const answerCount = responseBuffer.readUInt16BE(6);

    // Check if the response is valid
    if (responseCode === 0 && answerCount > 0) {
        // Get the IP address from the response
        const ipAddress = responseBuffer.slice(responseBuffer.length - 4).join('.');

        // Check if the IP address matches the target
        if (ipAddress === targetIP) {
            // Send the request again
            socket.send(requestBuffer, 0, requestBuffer.length, port, dnsServer, (err, bytes) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(`Sent ${bytes} bytes`);
                }
            });
        }
    }
});
