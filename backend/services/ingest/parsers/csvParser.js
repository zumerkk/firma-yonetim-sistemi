const csv = require('csv-parser');
const { Readable } = require('stream');

function parseCsv(buffer, opts = {}) {
  const rows = [];
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer.toString('utf-8'));
    stream
      .pipe(csv({ separator: opts.delimiter || ',' }))
      .on('data', (data) => rows.push(data))
      .on('end', () => {
        const headers = rows.length ? Object.keys(rows[0]) : [];
        resolve({ headers, rows, meta: { delimiter: opts.delimiter || ',' } });
      })
      .on('error', reject);
  });
}

module.exports = { parseCsv };

