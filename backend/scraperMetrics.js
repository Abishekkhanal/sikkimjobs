/**
 * Scraper Run Metrics – STEP 7 Production Monitoring
 *
 * ONE document per run in `scraper_runs`
 * Same document updated throughout execution
 * Safe on crashes, retries, and GitHub Actions
 */

import admin from 'firebase-admin';
import { logInfo, logError } from './logger.js';

let db = null;
let currentRunId = null;

export function setFirestoreDb(firestoreDb) {
  db = firestoreDb;
}

/**
 * Initialize scraper run
 */
export async function initializeRun() {
  if (!db) throw new Error('Firestore not initialized');

  currentRunId = new Date().toISOString();

  const runDoc = {
    runId: currentRunId,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    finishedAt: null,
    status: 'running',
    jobsFound: 0,
    jobsInserted: 0,
    jobsSkipped: 0,
    parsingErrorsCount: 0,
    fatalError: null,
    environment: process.env.NODE_ENV || 'development'
  };

  await db.collection('scraper_runs').doc(currentRunId).set(runDoc);
  logInfo(`Scraper run initialized: ${currentRunId}`);

  return currentRunId;
}

/**
 * Update metrics (non-atomic batch update)
 */
export async function updateRunMetrics(updates) {
  if (!db || !currentRunId) return;

  try {
    await db.collection('scraper_runs').doc(currentRunId).update(updates);
  } catch (err) {
    logError('Failed to update run metrics', err);
  }
}

/**
 * Atomic counter increment
 */
export async function incrementCounter(field) {
  if (!db || !currentRunId) return;

  try {
    await db.collection('scraper_runs').doc(currentRunId).update({
      [field]: admin.firestore.FieldValue.increment(1)
    });
  } catch (err) {
    logError(`Failed to increment ${field}`, err);
  }
}

/**
 * Finalize run
 */
export async function finalizeRun(status, fatalError = null) {
  if (!db || !currentRunId) return;

  try {
    await db.collection('scraper_runs').doc(currentRunId).update({
      status,
      fatalError,
      finishedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logInfo(`Scraper run finalized: ${currentRunId} (${status})`);
  } catch (err) {
    logError('Failed to finalize run', err);
  } finally {
    currentRunId = null;
  }
}

/**
 * Dashboard helpers
 */
export async function getLatestRun() {
  const snap = await db
    .collection('scraper_runs')
    .orderBy('startedAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getRecentRuns(limit = 7) {
  const snap = await db
    .collection('scraper_runs')
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRunsWithErrors() {
  const snap = await db
    .collection('scraper_runs')
    .where('parsingErrorsCount', '>', 0)
    .orderBy('parsingErrorsCount', 'desc')
    .orderBy('startedAt', 'desc')
    .limit(20)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
