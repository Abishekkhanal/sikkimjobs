# STEP 1: Website Verification - REQUIRED FIRST

## Status: ⚠️ BLOCKED - Manual Verification Required

Before the scraper can be implemented, you MUST run the verification script to inspect the actual SPSC website structure.

## Why This Is Required

The current scraper implementation makes assumptions about:
- Website URL (corrected to spsc.sikkim.gov.in)
- HTML structure (tables vs lists)
- CSS selectors (unverified)
- PDF link format (unknown)
- Date format (unknown)

**None of these have been verified against the real website.**

## How to Verify

### Step 1: Create Screenshots Directory

```bash
cd backend
mkdir screenshots
```

### Step 2: Run Verification Script

```bash
node verify-website.js
```

### Step 3: What the Script Does

The script will:
1. Open spsc.sikkim.gov.in in a browser (visible)
2. Look for notifications/advertisements links
3. Navigate to the notifications page
4. Take screenshots
5. Extract HTML structure
6. Show sample job data
7. List all PDF links found
8. Save full HTML for inspection

### Step 4: Manual Inspection

After running the script, you will have:

```
backend/screenshots/
├── homepage.png          # SPSC homepage
├── notifications.png     # Notifications page
└── page-source.html      # Full HTML for inspection
```

**Review these files to identify:**
- Correct notifications page URL
- HTML structure (table rows, list items, divs)
- CSS classes used
- How job titles are displayed
- How PDF links are structured
- How dates are formatted

### Step 5: Update Scraper

Based on your findings, update `scraper.js`:

```javascript
const SPSC_CONFIG = {
  baseUrl: 'https://spsc.sikkim.gov.in',
  notificationsPath: '/YOUR_VERIFIED_PATH',  // Update this
  timeout: 30000,
  userAgent: 'Mozilla/5.0...'
};

const SELECTORS = {
  jobRows: [
    'YOUR_VERIFIED_SELECTOR',  // Update based on actual structure
  ],
  jobTitle: [
    'YOUR_VERIFIED_SELECTOR',  // Update based on actual structure
  ],
  pdfLink: [
    'YOUR_VERIFIED_SELECTOR',  // Update based on actual structure
  ],
};
```

## Expected Output

After running `verify-website.js`, you should see output like:

```
=== SPSC Website Verification ===

Target: https://spsc.sikkim.gov.in

Launching browser...
✓ Homepage loaded successfully
✓ Screenshot saved: screenshots/homepage.png

Searching for notifications/advertisements links...
Found link: "Notifications" → /notifications
Found link: "Advertisements" → /advertisements

Navigating to notifications page: https://spsc.sikkim.gov.in/notifications
✓ Notifications page loaded
✓ Screenshot saved: screenshots/notifications.png

Analyzing page structure...
Found 1 table(s)
First table has 25 rows

Sample data from first table:
Row 0: 3 cells
  Content: S.No. | Post Name | Advertisement PDF
Row 1: 3 cells
  Content: 1 | Junior Engineer (Civil) | Download
  PDF Link: /uploads/advt-123.pdf
...

Found 15 PDF links:
1. Junior Engineer (Civil) - Advt No. 01/2024
   URL: /uploads/advt-123.pdf
...

=== Verification Complete ===
```

## What If Verification Fails?

### Scenario 1: Website Doesn't Load

**Error:** `Failed to navigate to spsc.sikkim.gov.in`

**Possible Causes:**
- Website is down
- Network connectivity issue
- Website blocks automated browsers

**Solution:**
- Check website manually in regular browser
- Try different network
- May need to add stealth mode to Playwright

### Scenario 2: No Notifications Page Found

**Error:** `Could not automatically find notifications page`

**Solution:**
- Browser will stay open for manual inspection
- Manually navigate to notifications page
- Note the URL
- Update `notificationsPath` in scraper.js

### Scenario 3: No PDF Links Found

**Error:** `Found 0 PDF links`

**Possible Causes:**
- Wrong page
- PDFs are behind authentication
- Different link structure

**Solution:**
- Manually inspect page source
- Look for alternative link patterns
- May need to update PDF link selector

## After Verification

Once you have verified the website structure:

1. ✅ Update `SPSC_CONFIG.notificationsPath`
2. ✅ Update `SELECTORS` with verified CSS selectors
3. ✅ Test scraper with `node scraper.js`
4. ✅ Verify it extracts at least 3 jobs correctly
5. ✅ Proceed to STEP 2 (Idempotency)

## Current Status

- [ ] Verification script run
- [ ] Screenshots captured
- [ ] HTML structure documented
- [ ] Selectors identified
- [ ] Scraper updated
- [ ] Scraper tested with real data

**DO NOT PROCEED TO STEP 2 UNTIL ALL CHECKBOXES ARE COMPLETE**

---

## Quick Start

```bash
# Install dependencies
cd backend
npm install

# Run verification
node verify-website.js

# Review output
ls screenshots/

# Update scraper.js based on findings

# Test scraper
node scraper.js

# If successful, proceed to STEP 2
```
