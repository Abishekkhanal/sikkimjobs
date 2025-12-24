/**
 * Firestore Service – ESM SAFE (PRODUCTION)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from './logger.js';

let db;
let initialized = false;

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initFirestore() {
  if (initialized) return db;

  try {
    let serviceAccount;

    // Prefer ENV (production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // Local JSON (your case)
    else {
      const keyPath = path.join(__dirname, 'serviceAccountKey.json');
      if (!fs.existsSync(keyPath)) {
        throw new Error('serviceAccountKey.json not found');
      }
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });

    initialized = true;
    logInfo('Firestore initialized successfully');
    return db;
  } catch (err) {
    logError('Failed to initialize Firestore', err);
    throw err;
  }
}

export async function saveJob(job) {
  if (!db) await initFirestore();

  const docId = generateDocId(job.advtNo, job.postName, job.issuedDate);

  await db.collection('jobs').doc(docId).set(
    {
      ...job,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return docId;
}

// -------- IDENTITY --------

function normalizeAdvtNo(advtNo) {
  return advtNo
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9\/-]/g, '')
    .replace(/[\/-]/g, '_');
}

function fallbackId(postName, issuedDate) {
  const date = issuedDate ? issuedDate.replace(/\//g, '') : 'NODATE';
  const title = postName
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30);

  return `SPSC_${date}_${title}`;
}

function generateDocId(advtNo, postName, issuedDate) {
  if (advtNo && advtNo.trim()) {
    return normalizeAdvtNo(advtNo);
  }
  return fallbackId(postName, issuedDate);
}
/**
 * Check duplicate job using advtNo (STEP 2 idempotency)
 */
export async function checkDuplicate(advtNo) {
  if (!advtNo) return false;

  if (!db) {
    await initFirestore();
  }

  const docId = advtNo
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9/_-]/g, '')
    .replace(/[\/\-]/g, '_');

  const docRef = db.collection('jobs').doc(docId);
  const snapshot = await docRef.get();

  return snapshot.exists;
}
