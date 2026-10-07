const DB_DURUMLARI = ['disconnected', 'connected', 'connecting', 'disconnecting'];

function saglikYaniti({ connectionState, memory = process.memoryUsage(), uptime = process.uptime(), release = process.env.RENDER_GIT_COMMIT || null }) {
  const healthy = connectionState === 1;
  return {
    statusCode: healthy ? 200 : 503,
    body: {
      status: healthy ? 'healthy' : 'unavailable',
      database: DB_DURUMLARI[connectionState] || 'unknown',
      timestamp: new Date().toISOString(), uptime, memory, release
    }
  };
}

function bellekIzlemeyiBaslat({ log = console.warn, thresholdMb = Number(process.env.SAGLIK_BELLEK_UYARI_MB) || 400 } = {}) {
  const timer = setInterval(() => {
    const memory = process.memoryUsage();
    const rssMb = Math.round(memory.rss / 1048576);
    if (rssMb >= thresholdMb) {
      log(JSON.stringify({ event: 'memory_pressure', rssMb, heapMb: Math.round(memory.heapUsed / 1048576), uptime: Math.round(process.uptime()) }));
    }
  }, 60000);
  timer.unref();
  return timer;
}

module.exports = { saglikYaniti, bellekIzlemeyiBaslat };
