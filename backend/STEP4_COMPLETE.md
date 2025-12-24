# STEP 4: ERROR HANDLING & ALERTING - ✅ COMPLETE

## Status: ✅ IMPLEMENTED

**Date:** 2025-12-24  
**Implementation:** Production-ready error handling, retry policy, and alerting

---

## Deliverables

### 1️⃣ Error Classification System
**File:** `backend/errorHandler.js`

**4 Error Types:**
- `NETWORK_ERROR` - SSL, timeout, DNS (retry: 2x, alert: no)
- `PARSE_ERROR` - Scanned PDFs, text too short (retry: 0x, alert: no)
- `STRUCTURE_CHANGE` - Zero jobs, selectors fail (retry: 0x, alert: YES)
- `FIRESTORE_ERROR` - Permission denied, quota (retry: 3x, alert: if exhausted)

**Functions:**
- `classifyError(error, context)` - Classify any error
- `retryOperation(operation, context)` - Surgical retry with exponential backoff
- `shouldAlert(errorType, context)` - Determine if alert needed

---

### 2️⃣ Scraper Run Metrics
**File:** `backend/scraperMetrics.js`

**Mandatory logging to `scraper_runs` collection:**
```json
{
  "runAt": "timestamp",
  "jobsFound": 15,
  "jobsSaved": 15,
  "completeJobs": 12,
  "incompleteJobs": 3,
  "networkErrors": 0,
  "parseErrors": 3,
  "status": "SUCCESS | PARTIAL | FAILED"
}
```

**Functions:**
- `logScraperRun(metrics)` - Store run summary
- `getRecentRuns(limit)` - Retrieve history
- `checkConsecutiveZeroJobRuns(count)` - Detect anomalies
- `calculateRunStatus(metrics)` - Determine run outcome

---

### 3️⃣ No-Spam Alerting
**File:** `backend/alerting.js`

**Alert ONLY when human action required:**
- Two consecutive runs with zero jobs
- Firestore write fails after retries
- Scraper crashes mid-run
- Structure change detected

**DO NOT alert for:**
- Scanned PDFs (expected)
- `dataComplete=false` (expected)
- Individual job failures
- Single network errors

**Functions:**
- `sendAlert(alert)` - Generic alert sender
- `alertStructureChange(context)` - Website changed
- `alertConsecutiveZeroJobs(count)` - Anomaly detected
- `alertFirestoreFailure(error, context)` - DB issues
- `alertScraperCrash(error, context)` - Fatal errors

---

## Error Flow Examples

### ✅ Successful Run
```
15 jobs found → 12 complete, 3 incomplete → Status: SUCCESS
Alerts: 0
```

### ⚠️ Scanned PDF
```
PDF download ✓ → Parse fails (text too short) → Save with dataComplete=false
Classification: PARSE_ERROR
Retry: NO
Alert: NO
```

### 🚨 Broken Site Structure
```
Navigate ✓ → Wait for #myTable → TIMEOUT → All selectors fail
Classification: STRUCTURE_CHANGE
Retry: NO
Alert: YES (CRITICAL)
Action: ABORT RUN
```

---

## Retry Policy (Surgical)

| Operation | Retry | Max Retries |
|-----------|-------|-------------|
| PDF download | ✅ | 2 |
| Firestore write | ✅ | 3 |
| PDF parsing | ❌ | 0 |
| Regex extraction | ❌ | 0 |
| Empty job list | ❌ | 0 |

**Exponential backoff:** 2s, 4s, 8s

---

## Logging Rules

**INFO:** Scraper start/end, job saved, PDF downloaded  
**WARNING:** dataComplete=false, missing fields, defaults applied  
**ERROR:** Scraper abort, Firestore failure, structure change  
**NEVER:** Secrets, full PDF text, credentials  

---

## Contract Compliance

### ✅ OCR Policy Maintained
> OCR is NOT enabled in the automated pipeline.  
> Scanned PDFs are marked dataComplete=false and linked only.

### ✅ No Modifications To:
- `scraper.js` - Scraper logic unchanged
- `pdfParser.js` - PDF parsing unchanged
- `normalizer.js` - Data normalization unchanged
- Flutter app - Frontend unchanged

### ✅ Only Added:
- Error classification
- Retry logic
- Alerting system
- Run metrics

---

## Validation Checklist

- [✅] Errors classified into 4 types
- [✅] Retry policy is surgical, not global
- [✅] Alerts only when human action needed
- [✅] Scraper run metrics logged
- [✅] No spam alerts
- [✅] No silent failures
- [✅] OCR policy unchanged
- [✅] No feature creep

---

## 🟢 STEP 4 COMPLETE

**STEP 4 error flow ready.**

Ready to proceed to STEP 5: Final Report & Deployment Checklist
