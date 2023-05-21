// For more information, see https://crawlee.dev/
import { BasicCrawler, ProxyConfiguration, Dataset } from 'crawlee';
import { router, getDataset } from './routes';
import dotenv from 'dotenv';
dotenv.config();
const startUrls = ['https://www.tujidao06.com/u/'];

const crawler = new BasicCrawler({
  requestHandler: router,
  maxConcurrency: 20,
  // Let the crawler know it can run up to 100 requests concurrently at any time
});

async function main() {
  const dataset = await getDataset();
  await crawler.run(startUrls);
  await dataset.exportToJSON('data', { toKVS: 'output' });
}
main()

