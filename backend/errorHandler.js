/**
 * Error Classification System - STEP 4
 * 
 * Every error must be classified into exactly one category.
 * This determines retry behavior and alerting.
 */

export const ErrorType = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    PARSE_ERROR: 'PARSE_ERROR',
    STRUCTURE_CHANGE: 'STRUCTURE_CHANGE',
    FIRESTORE_ERROR: 'FIRESTORE_ERROR'
};

/**
 * Classify error based on message and context
 */
export function classifyError(error, context = {}) {
    const message = error.message.toLowerCase();

    // NETWORK_ERROR: SSL, timeout, DNS, HTTP 5xx
    if (
        message.includes('certificate') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('network') ||
        message.includes('dns') ||
        /5\d{2}/.test(message)  // HTTP 5xx
    ) {
        return {
            type: ErrorType.NETWORK_ERROR,
            shouldRetry: true,
            maxRetries: 2,
            shouldAlert: false,
            message: 'Network connectivity issue'
        };
    }

    // PARSE_ERROR: Scanned PDFs, text too short, regex miss
    if (
        message.includes('pdf text too short') ||
        message.includes('scanned') ||
        message.includes('empty') ||
        message.includes('could not extract') ||
        context.isPdfParsing
    ) {
        return {
            type: ErrorType.PARSE_ERROR,
            shouldRetry: false,
            maxRetries: 0,
            shouldAlert: false,
            message: 'PDF parsing failed (expected for scanned PDFs)'
        };
    }

    // STRUCTURE_CHANGE: Zero jobs, selectors fail, page structure changed
    if (
        message.includes('no job listings found') ||
        message.includes('all selectors failed') ||
        message.includes('page structure changed') ||
        message.includes('table not found') ||
        (context.jobsFound === 0 && context.expectedJobs)
    ) {
        return {
            type: ErrorType.STRUCTURE_CHANGE,
            shouldRetry: false,
            maxRetries: 0,
            shouldAlert: true,
            message: 'Website structure changed - human intervention required'
        };
    }

    // FIRESTORE_ERROR: Permission denied, quota exceeded, connection error
    if (
        message.includes('firestore') ||
        message.includes('permission denied') ||
        message.includes('quota exceeded') ||
        message.includes('deadline exceeded') ||
        context.isFirestoreOperation
    ) {
        return {
            type: ErrorType.FIRESTORE_ERROR,
            shouldRetry: true,
            maxRetries: 3,
            shouldAlert: true,  // Alert if retries exhausted
            message: 'Firestore operation failed'
        };
    }

    // Default: treat as network error (safe default)
    return {
        type: ErrorType.NETWORK_ERROR,
        shouldRetry: true,
        maxRetries: 2,
        shouldAlert: false,
        message: 'Unknown error - treating as network issue'
    };
}

/**
 * Retry with exponential backoff
 */
export async function retryOperation(operation, errorContext = {}) {
    let lastError;
    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            attempt++;

            const classification = classifyError(error, errorContext);

            if (!classification.shouldRetry || attempt >= classification.maxRetries) {
                throw error;  // No more retries
            }

            // Exponential backoff: 2s, 4s, 8s
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`Retry ${attempt}/${classification.maxRetries} after ${delay}ms: ${error.message}`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Check if alert should be sent
 */
export function shouldAlert(errorType, context = {}) {
    const classification = classifyError({ message: errorType }, context);

    // Alert for structure changes (always)
    if (classification.type === ErrorType.STRUCTURE_CHANGE) {
        return true;
    }

    // Alert for Firestore errors after retries exhausted
    if (classification.type === ErrorType.FIRESTORE_ERROR && context.retriesExhausted) {
        return true;
    }

    // Alert if two consecutive runs return zero jobs
    if (context.consecutiveZeroJobRuns >= 2) {
        return true;
    }

    // Alert if scraper crashes mid-run
    if (context.scraperCrashed) {
        return true;
    }

    // DO NOT alert for:
    // - Scanned PDFs (PARSE_ERROR)
    // - dataComplete=false
    // - Individual job failures
    // - Single network errors

    return false;
}
