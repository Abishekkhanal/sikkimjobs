/**
 * Runtime Configuration - STEP 5
 * 
 * MANDATORY: Controls runtime mode (DEV, STAGING, PRODUCTION)
 * 
 * Rules:
 * - Default mode is DEV
 * - PRODUCTION must NEVER run implicitly
 * - Missing config in PROD must CRASH immediately
 */

import { logInfo, logError, logWarning } from './logger.js';

const RUNTIME_MODES = {
    DEV: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

/**
 * Get current runtime mode
 */
function getRuntimeMode() {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'development';

    if (nodeEnv === 'production' || nodeEnv === 'prod') {
        return RUNTIME_MODES.PRODUCTION;
    }

    if (nodeEnv === 'staging') {
        return RUNTIME_MODES.STAGING;
    }

    return RUNTIME_MODES.DEV;
}

const RUNTIME_MODE = getRuntimeMode();

/**
 * Validate production configuration
 * FATAL if required env vars missing in PRODUCTION
 */
function validateProductionConfig() {
    if (RUNTIME_MODE !== RUNTIME_MODES.PRODUCTION) {
        return;  // Only validate in production
    }

    const required = [
        'FIREBASE_SERVICE_ACCOUNT',
        'ALERT_EMAIL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logError('FATAL: Missing required environment variables in PRODUCTION');
        logError(`Missing: ${missing.join(', ')}`);
        console.error('\n' + '='.repeat(80));
        console.error('🚨 PRODUCTION CONFIGURATION ERROR');
        console.error('='.repeat(80));
        console.error('Missing required environment variables:');
        missing.forEach(key => console.error(`  - ${key}`));
        console.error('\nProduction mode requires all environment variables.');
        console.error('Set NODE_ENV=development for local testing.');
        console.error('='.repeat(80) + '\n');
        process.exit(1);
    }

    logInfo('✓ Production configuration validated');
}

/**
 * Runtime mode flags
 */
export const isDev = RUNTIME_MODE === RUNTIME_MODES.DEV;
export const isStaging = RUNTIME_MODE === RUNTIME_MODES.STAGING;
export const isProduction = RUNTIME_MODE === RUNTIME_MODES.PRODUCTION;

/**
 * Alert configuration
 */
export const alertsEnabled = isProduction;

/**
 * Initialize runtime config
 * MUST be called at startup
 */
export function initRuntimeConfig() {
    logInfo(`Runtime mode: ${RUNTIME_MODE}`);
    logInfo(`Alerts enabled: ${alertsEnabled}`);

    if (isDev) {
        logWarning('Running in DEVELOPMENT mode - alerts disabled');
    }

    if (isStaging) {
        logWarning('Running in STAGING mode - alerts disabled');
    }

    if (isProduction) {
        logInfo('Running in PRODUCTION mode - alerts enabled');
        validateProductionConfig();
    }
}

/**
 * Get runtime mode (for logging)
 */
export function getRuntimeModeString() {
    return RUNTIME_MODE;
}
