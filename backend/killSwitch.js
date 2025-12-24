/**
 * Remote Kill Switch - STEP 5 NON-NEGOTIABLE
 * 
 * MANDATORY: Ability to stop system without redeploying
 * 
 * Document: system_controls/scraper
 * { "enabled": true }
 * 
 * Behavior:
 * - Checked at startup
 * - Checked before page navigation
 * - Checked before Firestore writes
 * - If enabled === false → log ERROR → abort → send ONE alert (PRODUCTION only)
 */

import { logInfo, logError } from './logger.js';
import { isProduction } from './runtimeConfig.js';
import { sendAlert } from './alerting.js';

const CONTROL_COLLECTION = 'system_controls';
const CONTROL_DOC_ID = 'scraper';

let db;
let killSwitchChecked = false;

/**
 * Set Firestore instance
 */
export function setFirestoreDb(firestoreDb) {
    db = firestoreDb;
}

/**
 * Check if scraper is enabled
 * 
 * Returns: true if enabled, false if disabled
 * Throws: if Firestore error
 */
export async function checkKillSwitch(context = 'startup') {
    if (!db) {
        throw new Error('Firestore not initialized - call setFirestoreDb() first');
    }

    try {
        const controlRef = db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC_ID);
        const controlDoc = await controlRef.get();

        // Default to enabled if document doesn't exist
        if (!controlDoc.exists) {
            logInfo('Kill switch document not found - creating with enabled=true');
            await controlRef.set({
                enabled: true,
                lastChecked: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return true;
        }

        const controlData = controlDoc.data();
        const enabled = controlData.enabled !== false;  // Default to true

        if (!enabled) {
            logError(`🛑 KILL SWITCH ACTIVATED - Scraper disabled remotely`);
            logError(`Context: ${context}`);
            logError(`Disabled at: ${controlData.updatedAt || 'unknown'}`);
            logError(`Reason: ${controlData.reason || 'not specified'}`);

            // Send alert ONCE in production
            if (isProduction && !killSwitchChecked) {
                await sendAlert({
                    severity: 'HIGH',
                    title: 'Scraper Disabled via Kill Switch',
                    message: `Scraper was stopped remotely. Context: ${context}`,
                    context: {
                        disabledAt: controlData.updatedAt,
                        reason: controlData.reason,
                        checkContext: context
                    }
                });
            }

            killSwitchChecked = true;
            return false;  // Disabled
        }

        // Update last checked timestamp
        await controlRef.update({
            lastChecked: new Date().toISOString()
        });

        logInfo(`✓ Kill switch check passed (${context})`);
        return true;  // Enabled

    } catch (error) {
        logError('Failed to check kill switch', error);
        throw error;
    }
}

/**
 * Enable scraper remotely
 * (For manual recovery)
 */
export async function enableScraper(reason = 'Manual enable') {
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    const controlRef = db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC_ID);
    await controlRef.set({
        enabled: true,
        updatedAt: new Date().toISOString(),
        reason: reason
    }, { merge: true });

    logInfo('✓ Scraper enabled remotely');
}

/**
 * Disable scraper remotely
 * (Emergency stop)
 */
export async function disableScraper(reason = 'Manual disable') {
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    const controlRef = db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC_ID);
    await controlRef.set({
        enabled: false,
        updatedAt: new Date().toISOString(),
        reason: reason
    }, { merge: true });

    logError(`🛑 Scraper disabled remotely: ${reason}`);
}

/**
 * Get current kill switch status
 */
export async function getKillSwitchStatus() {
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    const controlRef = db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC_ID);
    const controlDoc = await controlRef.get();

    if (!controlDoc.exists) {
        return { enabled: true, reason: 'Default (no control document)' };
    }

    return controlDoc.data();
}
