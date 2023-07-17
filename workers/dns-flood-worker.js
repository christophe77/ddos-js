const dns = require('dns');
const { workerData } = require('worker_threads');
const { host } = workerData;

const options = {
    family: 6,
    hints: dns.ADDRCONFIG | dns.V4MAPPED,
};

dns.lookup(host, options, (err, address, family) =>
    console.log('address: %j family: IPv%s', address, family));