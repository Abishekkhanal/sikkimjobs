/**
 * SPSC Website Verification Script
 * 
 * This script must be run FIRST to verify the SPSC website structure
 * before the main scraper can be implemented.
 * 
 * Usage:
 *   node verify-website.js
 * 
 * This will:
 * 1. Open the SPSC website in a browser
 * 2. Navigate to the notifications page
 * 3. Extract and display the HTML structure
 * 4. Show sample job data
 * 5. Output CSS selectors that work
 */

import { chromium } from 'playwright';

const SPSC_BASE_URL = 'https://spsc.sikkim.gov.in';

async function verifyWebsite() {
    console.log('=== SPSC Website Verification ===\n');
    console.log(`Target: ${SPSC_BASE_URL}\n`);

    let browser;

    try {
        // Launch browser in headed mode so we can see what's happening
        console.log('Launching browser...');
        browser = await chromium.launch({
            headless: false,  // Show browser for manual inspection
            slowMo: 1000      // Slow down for visibility
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        // Navigate to homepage
        console.log(`\nNavigating to ${SPSC_BASE_URL}...`);
        await page.goto(SPSC_BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        console.log('✓ Homepage loaded successfully\n');

        // Take screenshot of homepage
        await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
        console.log('✓ Screenshot saved: screenshots/homepage.png\n');

        // Look for notifications/advertisements links
        console.log('Searching for notifications/advertisements links...\n');

        const possibleLinkTexts = [
            'Notifications',
            'Recruitment',
            'Advertisements',
            'Jobs',
            'Vacancies',
            'Latest Notifications',
            'Current Openings'
        ];

        let notificationsUrl = null;

        for (const linkText of possibleLinkTexts) {
            try {
                const link = await page.locator(`a:has-text("${linkText}")`).first();
                if (await link.count() > 0) {
                    const href = await link.getAttribute('href');
                    console.log(`Found link: "${linkText}" → ${href}`);

                    if (!notificationsUrl) {
                        notificationsUrl = href.startsWith('http') ? href : `${SPSC_BASE_URL}${href}`;
                    }
                }
            } catch (e) {
                // Link not found, continue
            }
        }

        if (!notificationsUrl) {
            console.log('\n⚠️  Could not automatically find notifications page');
            console.log('Please manually inspect the page and identify the correct link\n');

            // Wait for manual inspection
            console.log('Browser will stay open for 60 seconds for manual inspection...');
            await page.waitForTimeout(60000);

            await browser.close();
            return;
        }

        // Navigate to notifications page
        console.log(`\nNavigating to notifications page: ${notificationsUrl}`);
        await page.goto(notificationsUrl, { waitUntil: 'networkidle', timeout: 30000 });
        console.log('✓ Notifications page loaded\n');

        // Take screenshot
        await page.screenshot({ path: 'screenshots/notifications.png', fullPage: true });
        console.log('✓ Screenshot saved: screenshots/notifications.png\n');

        // Try to find job listings
        console.log('Analyzing page structure...\n');

        // Check for tables
        const tables = await page.locator('table').count();
        console.log(`Found ${tables} table(s)`);

        if (tables > 0) {
            // Analyze first table
            const firstTable = page.locator('table').first();
            const rows = await firstTable.locator('tr').count();
            console.log(`First table has ${rows} rows`);

            // Get first few rows
            console.log('\nSample data from first table:\n');
            for (let i = 0; i < Math.min(5, rows); i++) {
                const row = firstTable.locator('tr').nth(i);
                const cells = await row.locator('td, th').count();
                const text = await row.innerText();
                console.log(`Row ${i}: ${cells} cells`);
                console.log(`  Content: ${text.substring(0, 100)}...`);

                // Check for PDF links
                const pdfLinks = await row.locator('a[href*=".pdf"]').count();
                if (pdfLinks > 0) {
                    const pdfHref = await row.locator('a[href*=".pdf"]').first().getAttribute('href');
                    console.log(`  PDF Link: ${pdfHref}`);
                }
                console.log('');
            }
        }

        // Check for lists
        const lists = await page.locator('ul, ol').count();
        console.log(`\nFound ${lists} list(s)`);

        // Get page HTML for manual inspection
        const html = await page.content();
        const fs = await import('fs');
        fs.writeFileSync('screenshots/page-source.html', html);
        console.log('✓ Full HTML saved: screenshots/page-source.html\n');

        // Extract all PDF links
        console.log('Extracting all PDF links...\n');
        const pdfLinks = await page.locator('a[href*=".pdf"]').all();
        console.log(`Found ${pdfLinks.length} PDF links:\n`);

        for (let i = 0; i < Math.min(10, pdfLinks.length); i++) {
            const link = pdfLinks[i];
            const href = await link.getAttribute('href');
            const text = await link.innerText();
            console.log(`${i + 1}. ${text.trim()}`);
            console.log(`   URL: ${href}\n`);
        }

        console.log('\n=== Verification Complete ===\n');
        console.log('Next steps:');
        console.log('1. Review screenshots in screenshots/ folder');
        console.log('2. Inspect page-source.html to identify correct selectors');
        console.log('3. Update SELECTORS in scraper.js with verified selectors');
        console.log('4. Test scraper with verify-scraper.js\n');

        // Keep browser open for manual inspection
        console.log('Browser will stay open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('\n❌ Error during verification:', error.message);
        console.error('\nFull error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run verification
verifyWebsite()
    .then(() => {
        console.log('\nVerification script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nVerification script failed:', error);
        process.exit(1);
    });
