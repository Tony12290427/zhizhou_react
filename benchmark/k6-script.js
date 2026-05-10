import http from 'k6/http';
import { check, sleep, trend } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m',  target: 100 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const feedLatency = new Trend('feed_latency');
const detailLatency = new Trend('detail_latency');
const searchLatency = new Trend('search_latency');

export default function() {
  // Feed (70% of traffic)
  const feed = http.get(`${BASE_URL}/api/v1/knowposts/feed?page=1&size=20`);
  check(feed, { 'feed 200': (r) => r.status === 200 });
  feedLatency.add(feed.timings.duration);
  sleep(1);

  // Post detail (20% of traffic)
  if (Math.random() < 0.3) {
    const detail = http.get(`${BASE_URL}/api/v1/knowposts/detail/310746918873600000`);
    check(detail, { 'detail 200': (r) => r.status === 200 });
    detailLatency.add(detail.timings.duration);
    sleep(2);
  }

  // Search (10% of traffic)
  if (Math.random() < 0.15) {
    const search = http.get(`${BASE_URL}/api/v1/search?keyword=技术&page=1&size=10`);
    check(search, { 'search 200': (r) => r.status === 200 });
    searchLatency.add(search.timings.duration);
    sleep(3);
  }
}

export function handleSummary(data) {
  return {
    'benchmark/report.json': JSON.stringify(data, null, 2),
    stdout: `
============================================================
  K6 Performance Benchmark Report
============================================================
Total Requests:     ${data.metrics.http_reqs.values.count}
Request Rate:       ${data.metrics.http_reqs.values.rate.toFixed(1)}/s
Failed Rate:        ${(data.metrics.http_req_failed.values.rate * 100).toFixed(1)}%

Latency (ms):
  P50:              ${data.metrics.http_req_duration.values.med.toFixed(1)}
  P95:              ${data.metrics.http_req_duration.values['p(95)'].toFixed(1)}
  P99:              ${data.metrics.http_req_duration.values['p(99)'].toFixed(1)}
  Max:              ${data.metrics.http_req_duration.values.max.toFixed(1)}

Feed Latency (ms):
  P50:              ${data.metrics.feed_latency?.values?.med?.toFixed(1) || 'N/A'}
  P95:              ${data.metrics.feed_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}

Post Detail Latency (ms):
  P50:              ${data.metrics.detail_latency?.values?.med?.toFixed(1) || 'N/A'}
  P95:              ${data.metrics.detail_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}

Search Latency (ms):
  P50:              ${data.metrics.search_latency?.values?.med?.toFixed(1) || 'N/A'}
  P95:              ${data.metrics.search_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}

Virtual Users:      ${data.metrics.vus.values.max}
Test Duration:      ${(data.state.testRunDurationMs / 1000).toFixed(0)}s
============================================================
`,
  };
}
