/**
 * SPSC Job Scraper - VERIFIED IMPLEMENTATION
 * 
 * ✅ VERIFIED AGAINST: https://spsc.sikkim.gov.in/Notifications.html
 * ✅ DATE VERIFIED: 2025-12-23
 * ✅ INSPECTOR: Abishek Khanal
 * 
 * VERIFIED STRUCTURE:
 * - Page uses table#myTable with div-based job entries
 * - Each job is in <tr class="job-row"> containing nested divs
 * - Job title in <a href="/Advertisement.html" class="job-title-link">
 * - Date format: DD/MM/YYYY (e.g., 11/12/2025)
 * - PDF links: <a href="/Advertisements/*.pdf">
 * - Multiple PDFs per job (Advertisement, Notification, Syllabus)
 */

import { chromium } from 'playwright';
import { downloadAndParsePdf } from './pdfParser.js';
import { normalizeJobData } from './normalizer.js';
import { saveJob, checkDuplicate, initFirestore } from './firestoreService.js';
import { logInfo, logError, logWarning } from './logger.js';

// VERIFIED SPSC website configuration
const SPSC_CONFIG = {
  baseUrl: 'https://spsc.sikkim.gov.in',
  notificationsPath: '/Notifications.html',  // VERIFIED: Exact path
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Polite crawling
  delayBetweenRequests: 2000,  // 2 seconds between jobs
  delayBetweenPages: 5000      // 5 seconds between page loads
};

/**
 * VERIFIED SELECTORS - Based on actual website HTML
 * 
 * Robustness strategy:
 * 1. Primary selector: Most specific, uses semantic classes
 * 2. Fallback selectors: More generic, survive minor changes
 * 3. Multiple attempts: Try each selector in order
 */
const SELECTORS = {
  // Job rows - VERIFIED: table#myTable tbody tr.job-row
  jobRows: [
    '#myTable tbody tr.job-row',           // Most specific - uses ID and class
    'table#myTable tr',                     // Fallback - just table rows
    'tr.job-row',                           // Fallback - any row with class
    'table tbody tr'                        // Last resort - any table row
  ],

  // Job title - VERIFIED: a.job-title-link or first <a> in cell
  jobTitle: [
    'a.job-title-link',                     // Primary - semantic class
    'td a[href="/Advertisement.html"]',     // Fallback - specific href
    'td > div > a:first-of-type',          // Fallback - structure-based
    'td a:first-of-type'                    // Last resort - first link
  ],

  // Advertisement number - VERIFIED: div.ad-number a
  advtNumber: [
    'div.ad-number a',                      // Primary - semantic class
    'a.ad-number-link',                     // Fallback - link class
  ],

  // Date - VERIFIED: div.issued-date span.date-value
  date: [
    'div.issued-date span.date-value',      // Primary - most specific
    'span.date-value',                      // Fallback - just the span
  ],

  // PDF links - VERIFIED: a[href$=".pdf"] in ol.pdf-links-list
  pdfLinks: [
    'ol.pdf-links-list a[href$=".pdf"]',    // Primary - in list
    'a[href*="/Advertisements/"][href$=".pdf"]', // Fallback - path pattern
    'a[href$=".pdf"]',                      // Last resort - any PDF
  ]
};

/**
 * Main scraper function
 */
async function scrapeJobs() {
  const startTime = Date.now();
  logInfo('=== SPSC Scraper Started (VERIFIED IMPLEMENTATION) ===');
  logInfo(`Target: ${SPSC_CONFIG.baseUrl}${SPSC_CONFIG.notificationsPath}`);

  let browser;
  let jobsProcessed = 0;
  let jobsAdded = 0;
  let errors = [];

  try {
    // Initialize Firestore
    await initFirestore();

    // Launch browser
    logInfo('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: SPSC_CONFIG.userAgent,
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    page.setDefaultTimeout(SPSC_CONFIG.timeout);

    // Navigate to notifications page
    const targetUrl = `${SPSC_CONFIG.baseUrl}${SPSC_CONFIG.notificationsPath}`;
    logInfo(`Navigating to ${targetUrl}`);

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      logInfo('✓ Page loaded successfully');
    } catch (navError) {
      logError('Navigation failed', navError);
      throw new Error('SPSC website is down or unreachable');
    }

    // Wait for table to load (verified element)
    try {
      await page.waitForSelector('#myTable', { timeout: 10000 });
      logInfo('✓ Job table found');
    } catch (e) {
      logError('Job table not found - page structure may have changed', e);
      throw new Error('Page structure changed - verification required');
    }

    // Extract job listings using verified selectors
    const jobs = await extractJobs(page);
    logInfo(`Found ${jobs.length} job listings on page`);

    if (jobs.length === 0) {
      logWarning('No jobs found - this may indicate a problem');
    }

    // Process each job
    for (const job of jobs) {
      jobsProcessed++;

      try {
        logInfo(`\n--- Processing Job ${jobsProcessed}/${jobs.length} ---`);
        logInfo(`Title: ${job.postName}`);
        logInfo(`Advt No: ${job.advtNo}`);
        logInfo(`Date: ${job.issuedDate}`);
        logInfo(`PDF URLs: ${job.pdfUrls.length} found`);

        // Check for duplicates
        const isDuplicate = await checkDuplicate(job.advtNo, job.postName, job.issuedDate);
        if (isDuplicate) {
          logInfo(`⊘ Skipping duplicate: ${job.advtNo}`);
          continue;
        }

        // Use first PDF (Advertisement) for parsing
        const primaryPdfUrl = job.pdfUrls[0];
        logInfo(`Downloading PDF: ${primaryPdfUrl}`);

        const pdfData = await downloadAndParsePdf(primaryPdfUrl);

        // Normalize data
        const normalizedJob = normalizeJobData({
          ...job,
          ...pdfData,
          pdfUrl: primaryPdfUrl,  // Store primary PDF
          allPdfUrls: job.pdfUrls  // Store all PDFs
        });

        // Save to Firestore
        await saveJob(normalizedJob);
        jobsAdded++;
        logInfo(`✓ Saved: ${normalizedJob.postName}`);

      } catch (jobError) {
        logError(`Failed to process job: ${job.postName}`, jobError);
        errors.push({
          job: job.postName,
          error: jobError.message
        });

        // Save partial data even if PDF parsing fails
        try {
          const partialJob = normalizeJobData({
            ...job,
            pdfUrl: job.pdfUrls[0] || '',
            dataComplete: false,
            metadata: {
              parsingErrors: [jobError.message],
              allPdfUrls: job.pdfUrls
            }
          });
          await saveJob(partialJob);
          logWarning(`⚠ Saved partial data for: ${job.postName}`);
        } catch (saveError) {
          logError(`Failed to save partial data: ${job.postName}`, saveError);
        }
      }

      // Polite delay between jobs
      if (jobsProcessed < jobs.length) {
        await delay(SPSC_CONFIG.delayBetweenRequests);
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logInfo('\n=== Scraper Completed ===');
    logInfo(`Duration: ${duration}s`);
    logInfo(`Jobs found: ${jobs.length}`);
    logInfo(`Jobs processed: ${jobsProcessed}`);
    logInfo(`Jobs added: ${jobsAdded}`);
    logInfo(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      logWarning('\nErrors encountered:');
      errors.forEach(e => logWarning(`  - ${e.job}: ${e.error}`));
    }

    return {
      success: true,
      jobsFound: jobs.length,
      jobsAdded: jobsAdded,
      errors: errors.length
    };

  } catch (error) {
    logError('Fatal scraper error', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract job listings from page using VERIFIED selectors
 * 
 * Robustness: Tries multiple selectors in order of specificity
 */
async function extractJobs(page) {
  const jobs = [];

  // Try each job row selector until one works
  let jobElements = [];
  let usedSelector = null;

  for (const selector of SELECTORS.jobRows) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        jobElements = elements;
        usedSelector = selector;
        logInfo(`✓ Using job row selector: ${selector}`);
        logInfo(`  Found ${elements.length} job rows`);
        break;
      }
    } catch (e) {
      logWarning(`Selector failed: ${selector} - ${e.message}`);
      continue;
    }
  }

  if (jobElements.length === 0) {
    throw new Error('No job listings found - all selectors failed');
  }

  // Extract data from each row
  for (let i = 0; i < jobElements.length; i++) {
    try {
      const job = await extractJobFromElement(jobElements[i], page, i + 1);
      if (job && job.postName && job.pdfUrls.length > 0) {
        jobs.push(job);
      } else {
        logWarning(`Row ${i + 1}: Incomplete data, skipping`);
      }
    } catch (e) {
      logWarning(`Failed to extract job from row ${i + 1}: ${e.message}`);
    }
  }

  return jobs;
}

/**
 * Extract job data from a single element using VERIFIED selectors
 * 
 * Returns: {postName, advtNo, issuedDate, pdfUrls, sourceUrl}
 */
async function extractJobFromElement(element, page, rowNumber) {
  logInfo(`\nExtracting row ${rowNumber}...`);

  // Extract job title using fallback selectors
  let postName = null;
  for (const selector of SELECTORS.jobTitle) {
    try {
      const titleEl = await element.$(selector);
      if (titleEl) {
        postName = (await titleEl.textContent()).trim();
        if (postName) {
          logInfo(`  ✓ Title found with: ${selector}`);
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (!postName) {
    logWarning(`  ✗ No title found in row ${rowNumber}`);
    return null;
  }

  // Extract advertisement number
  let advtNo = null;
  for (const selector of SELECTORS.advtNumber) {
    try {
      const advtEl = await element.$(selector);
      if (advtEl) {
        const text = (await advtEl.textContent()).trim();
        // Extract just the number part (e.g., "19/SPSC/EXAM/2025")
        const match = text.match(/Advertisement No\.?\s*([A-Z0-9\/\-]+)/i);
        if (match) {
          advtNo = match[1];
          logInfo(`  ✓ Advt No found: ${advtNo}`);
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (!advtNo) {
    // Generate fallback advt number from title
    advtNo = `SPSC_${Date.now()}_${rowNumber}`;
    logWarning(`  ⚠ No advt number found, using fallback: ${advtNo}`);
  }

  // Extract date
  let issuedDate = null;
  for (const selector of SELECTORS.date) {
    try {
      const dateEl = await element.$(selector);
      if (dateEl) {
        const text = (await dateEl.textContent()).trim();
        // Extract DD/MM/YYYY pattern
        const match = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (match) {
          issuedDate = match[1];
          logInfo(`  ✓ Date found: ${issuedDate}`);
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (!issuedDate) {
    logWarning(`  ⚠ No date found in row ${rowNumber}`);
  }

  // Extract PDF links
  let pdfUrls = [];
  for (const selector of SELECTORS.pdfLinks) {
    try {
      const pdfElements = await element.$$(selector);
      if (pdfElements.length > 0) {
        for (const pdfEl of pdfElements) {
          const href = await pdfEl.getAttribute('href');
          if (href) {
            const fullUrl = href.startsWith('http')
              ? href
              : `${SPSC_CONFIG.baseUrl}${href}`;
            pdfUrls.push(fullUrl);
          }
        }
        if (pdfUrls.length > 0) {
          logInfo(`  ✓ Found ${pdfUrls.length} PDF(s) with: ${selector}`);
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (pdfUrls.length === 0) {
    logWarning(`  ✗ No PDF links found in row ${rowNumber}`);
    return null;
  }

  return {
    postName,
    advtNo,
    issuedDate,
    pdfUrls,
    sourceUrl: page.url(),
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run scraper
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeJobs()
    .then((result) => {
      logInfo('\n✓ Scraper finished successfully');
      logInfo(`Summary: ${result.jobsAdded}/${result.jobsFound} jobs added, ${result.errors} errors`);
      process.exit(0);
    })
    .catch((error) => {
      logError('\n✗ Scraper failed', error);
      process.exit(1);
    });
}

export { scrapeJobs };
