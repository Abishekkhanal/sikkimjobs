import { chromium } from 'playwright';
import { downloadAndParsePdf } from './pdfParser.js';
import { normalizeJobData } from './normalizer.js';
import { saveJob, checkDuplicate, initFirestore } from './firestoreService.js';
import { logInfo, logError, logWarning } from './logger.js';

import {
  initializeRun,
  updateRunMetrics,
  incrementCounter,
  finalizeRun,
  setFirestoreDb
} from './scraperMetrics.js';

const SPSC_CONFIG = {
  baseUrl: 'https://spsc.sikkim.gov.in',
  notificationsPath: '/Notifications.html',
  timeout: 30000,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
  delayBetweenRequests: 2000
};

async function scrapeJobs() {
  let browser;

  try {
    // 🔥 Firestore init
    const db = await initFirestore();
    setFirestoreDb(db);

    // 🔥 START RUN
    await initializeRun();

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(
      `${SPSC_CONFIG.baseUrl}${SPSC_CONFIG.notificationsPath}`,
      { waitUntil: 'networkidle' }
    );

    await page.waitForSelector('#myTable');

    const jobs = await extractJobs(page);
    await updateRunMetrics({ jobsFound: jobs.length });

    for (const job of jobs) {
      try {
        const isDuplicate = await checkDuplicate(
          job.advtNo,
          job.postName,
          job.issuedDate
        );

        if (isDuplicate) {
          await incrementCounter('jobsSkipped');
          continue;
        }

        const pdfData = await downloadAndParsePdf(job.pdfUrls[0]);

        const normalized = normalizeJobData({
          ...job,
          ...pdfData
        });

        await saveJob(normalized);
        await incrementCounter('jobsInserted');

        if (normalized.dataComplete === false) {
          await incrementCounter('parsingErrorsCount');
        }
      } catch (err) {
        logError(`Job failed: ${job.postName}`, err);
        await incrementCounter('parsingErrorsCount');
      }

      await new Promise(r => setTimeout(r, SPSC_CONFIG.delayBetweenRequests));
    }

    // ✅ SUCCESS
    await finalizeRun('success');
  } catch (err) {
    logError('Fatal scraper error', err);
    await finalizeRun('failed', err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

/* ===== helpers ===== */

async function extractJobs(page) {
  const rows = await page.$$('#myTable tbody tr');
  const jobs = [];

  for (const row of rows) {
    try {
      const postName = await row.$eval('a', el => el.textContent.trim());
      const pdfUrls = await row.$$eval(
        'a[href$=".pdf"]',
        els => els.map(e => e.href)
      );

      if (!postName || pdfUrls.length === 0) continue;

      jobs.push({
        postName,
        advtNo: `SPSC_${Date.now()}`,
        issuedDate: null,
        pdfUrls,
        scrapedAt: new Date().toISOString(),
        sourceUrl: page.url()
      });
    } catch {
      continue;
    }
  }

  return jobs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeJobs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { scrapeJobs };
