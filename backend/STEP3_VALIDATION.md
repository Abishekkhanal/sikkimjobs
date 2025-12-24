# STEP 3: PDF PARSING VALIDATION

## Requirement

Before proceeding to STEP 4, you must prove:
1. ✅ At least 1 PDF parses successfully
2. ✅ At least 1 PDF fails gracefully
3. ✅ Firestore stores both cases correctly

---

## How to Run Validation

```bash
cd backend
node test-pdf-parsing.js
```

---

## What the Test Does

1. **Downloads 3 real SPSC PDFs:**
   - Labour Inspector (19/SPSC/EXAM/2025)
   - Sub Inspector Excise (18/SPSC/EXAM/2025)
   - Under Secretary (17/SPSC/EXAM/2025)

2. **Tests PDF parsing:**
   - Attempts to extract text with `pdf-parse`
   - Applies regex patterns for job details
   - Normalizes extracted data

3. **Tests graceful failure:**
   - If parsing fails, saves partial data
   - Sets `dataComplete: false`
   - Stores error message in metadata

4. **Saves to Firestore:**
   - Successful parses: Full data with `dataComplete: true`
   - Failed parses: Partial data with `dataComplete: false`

---

## Expected Output

### Successful Parse
```json
{
  "advtNo": "19/SPSC/EXAM/2025",
  "postName": "Labour Inspector",
  "issuedDate": "11/12/2025",
  "pdfUrl": "https://spsc.sikkim.gov.in/Advertisements/Labour_Inspector_Adv_11_12_2025.pdf",
  "qualification": "Bachelor's Degree in relevant field",
  "totalPosts": 24,
  "lastDate": "2025-01-15T00:00:00.000Z",
  "dataComplete": true,
  "status": "active"
}
```

### Graceful Failure
```json
{
  "advtNo": "18/SPSC/EXAM/2025",
  "postName": "Sub Inspector Excise",
  "issuedDate": "05/12/2025",
  "pdfUrl": "https://spsc.sikkim.gov.in/Advertisements/Sub_Inspector_Excise_Notification_05_12_2025.pdf",
  "dataComplete": false,
  "status": "active",
  "metadata": {
    "parsingErrors": ["Failed to extract text from PDF: Scanned image"]
  }
}
```

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| At least 1 successful parse | ⏳ Pending |
| At least 1 graceful failure | ⏳ Pending |
| Both saved to Firestore | ⏳ Pending |
| No crashes or silent failures | ⏳ Pending |

---

## After Running Test

1. **Review console output** - Check which PDFs succeeded/failed
2. **Verify Firestore** - Confirm documents were created
3. **Check data completeness** - Ensure `dataComplete` flag is correct
4. **Confirm error handling** - Verify partial data was saved for failures

---

## If Test Passes

✅ STEP 3 VALIDATED  
🟢 Proceed to STEP 4: Error Handling & Logging

---

## If Test Fails

❌ STEP 3 NOT VALIDATED  
🔴 Fix issues before proceeding:
- Check PDF download logic
- Verify regex patterns
- Test with different PDF types
- Ensure Firestore connection works
