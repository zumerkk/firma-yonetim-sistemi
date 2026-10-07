const { saglikYaniti, bellekIzlemeyiBaslat } = require('../services/sistemSagligi');

test('sağlık kontrolü veritabanı bağlıyken hazır, diğer durumlarda 503 döner', () => {
  const memory = { rss: 100, heapUsed: 50 };
  const healthy = saglikYaniti({ connectionState: 1, memory, uptime: 42, release: 'test-release' });
  expect(healthy.statusCode).toBe(200);
  expect(healthy.body).toMatchObject({ status: 'healthy', database: 'connected', memory, uptime: 42, release: 'test-release' });
  for (const state of [0, 2, 3]) {
    const result = saglikYaniti({ connectionState: state, memory });
    expect(result.statusCode).toBe(503);
    expect(result.body.status).toBe('unavailable');
  }
});

test('bellek izleme yalnız eşik aşımını kaydeder ve gizli yapılandırma yazmaz', () => {
  jest.useFakeTimers();
  const memory = jest.spyOn(process, 'memoryUsage').mockReturnValue({ rss: 200 * 1048576, heapUsed: 100 * 1048576 });
  const log = jest.fn();
  const timer = bellekIzlemeyiBaslat({ log, thresholdMb: 400 });
  jest.advanceTimersByTime(60000);
  expect(log).not.toHaveBeenCalled();
  memory.mockReturnValue({ rss: 450 * 1048576, heapUsed: 200 * 1048576 });
  jest.advanceTimersByTime(60000);
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ event: 'memory_pressure', rssMb: 450, heapMb: 200 });
  clearInterval(timer);
  memory.mockRestore();
  jest.useRealTimers();
});
