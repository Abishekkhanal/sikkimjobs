# STEP 2: IDENTITY CORRECTION - APPLIED ✅

## Status: ✅ CORRECTED TO ADVT-FIRST STRATEGY

**Date:** 2025-12-24  
**Change:** Canonical identity now uses advtNo as primary identifier

---

## WHAT CHANGED

### Before (Composite Key)
```javascript
// Used both advtNo AND postName
const docId = `${normalizedAdvt}_${normalizedPost}`;
// Example: "19_spsc_exam_2025_labour_inspector"
```

**Problem:** Title changes created new documents

---

### After (AdvtNo-First)
```javascript
// Uses advtNo ONLY when available
if (advtNo && advtNo.trim()) {
    return normalizeAdvtNo(advtNo);  // "19_SPSC_EXAM_2025"
}

// Fallback only when missing
return generateFallbackId(postName, issuedDate);  // "SPSC_20251211_JUNIOR_ENGINEER"
```

**Benefits:**
- ✅ Matches SPSC's own identity system
- ✅ Automatically handles title updates
- ✅ Simpler duplicate detection
- ✅ No similarity heuristics needed (in most cases)

---

## IMPLEMENTATION

### 1. normalizeAdvtNo()
```javascript
"19/SPSC/EXAM/2025" → "19_SPSC_EXAM_2025"
"18 / SPSC / EXAM / 2025" → "18_SPSC_EXAM_2025"
```

### 2. generateFallbackId()
```javascript
postName: "Junior Engineer"
issuedDate: "11/12/2025"
→ "SPSC_20251211_JUNIOR_ENGINEER"
```

### 3. generateDocId() - Main Function
```javascript
function generateDocId(advtNo, postName, issuedDate) {
    if (advtNo && advtNo.trim() && !advtNo.startsWith('SPSC_')) {
        return normalizeAdvtNo(advtNo);  // PRIMARY
    }
    return generateFallbackId(postName, issuedDate);  // FALLBACK
}
```

---

## EDGE CASES HANDLED

### ✅ Title Updates
```
Run 1: advtNo="19/SPSC/EXAM/2025", title="Labour Inspector"
       → docId="19_SPSC_EXAM_2025"

Run 2: advtNo="19/SPSC/EXAM/2025", title="Labour Inspector under Sikkim State Labour Service"
       → docId="19_SPSC_EXAM_2025"  (SAME!)

Result: Updates existing document, no duplicate
```

### ✅ Missing AdvtNo
```
advtNo=null, title="Junior Engineer", date="11/12/2025"
→ docId="SPSC_20251211_JUNIOR_ENGINEER"

Rerun with same data:
→ docId="SPSC_20251211_JUNIOR_ENGINEER"  (SAME!)

Result: Deterministic fallback, idempotent
```

### ✅ Same AdvtNo Check
```javascript
// Layer 2 in checkDuplicate()
if (advtNo exists) {
    const existing = await db.where('advtNo', '==', advtNo).get();
    if (!empty) return true;  // Duplicate
}
```

---

## FILES MODIFIED

1. **backend/firestoreService.js**
   - `normalizeAdvtNo()` - NEW
   - `generateFallbackId()` - NEW
   - `generateDocId()` - REWRITTEN (advtNo-first)
   - `checkDuplicate()` - SIMPLIFIED
   - `saveJob()` - Updated to pass issuedDate

2. **backend/scraper.js**
   - `checkDuplicate()` call - Updated to pass issuedDate

---

## WHAT STAYED

✅ Similarity function (kept as safety net)  
✅ Fallback logic (for missing advtNo)  
✅ Retry logic  
✅ Logging  
✅ Firestore upsert with merge  

---

## VERIFICATION NEEDED

**Test:** Run scraper to confirm no regression

```bash
cd backend
node scraper.js
```

**Expected:**
- Jobs with advtNo use advtNo as docId
- Jobs without advtNo use fallback
- No duplicates created
- Title updates don't create new documents

---

## GO/NO-GO STATUS

🟢 **GO** - Correction applied, ready for testing

**Next:** Run scraper once to verify, then proceed to STEP 3
