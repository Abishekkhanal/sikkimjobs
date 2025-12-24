# STEP 7: Monitoring & Observability - Firestore Queries

## Query 1: Latest Scraper Run

```javascript
const latestRun = await db
  .collection('scraper_runs')
  .orderBy('startedAt', 'desc')
  .limit(1)
  .get();

const run = latestRun.docs[0].data();
```

## Query 2: Last 7 Runs

```javascript
const last7Runs = await db
  .collection('scraper_runs')
  .orderBy('startedAt', 'desc')
  .limit(7)
  .get();

const runs = last7Runs.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

## Query 3: Runs with Parsing Errors

```javascript
const runsWithErrors = await db
  .collection('scraper_runs')
  .where('parsingErrorsCount', '>', 0)
  .orderBy('parsingErrorsCount', 'desc')
  .orderBy('startedAt', 'desc')
  .limit(20)
  .get();

const errorRuns = runsWithErrors.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

## Required Firestore Index

For Query 3, create composite index:
- Collection: `scraper_runs`
- Fields:
  - `parsingErrorsCount` (Descending)
  - `startedAt` (Descending)

Create via Firebase Console or `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "scraper_runs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "parsingErrorsCount",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "startedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```
