/**
 * Logger - Production Ready
 * 
 * Structured logging for scraper operations
 */

const LOG_LEVELS = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
};

/**
 * Format log message
 */
function formatLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message
    };

    if (data) {
        if (data instanceof Error) {
            logEntry.error = {
                message: data.message,
                stack: data.stack
            };
        } else {
            logEntry.data = data;
        }
    }

    return logEntry;
}

/**
 * Log info message
 */
export function logInfo(message, data = null) {
    const log = formatLog(LOG_LEVELS.INFO, message, data);
    console.log(JSON.stringify(log));
}

/**
 * Log warning message
 */
export function logWarning(message, data = null) {
    const log = formatLog(LOG_LEVELS.WARNING, message, data);
    console.warn(JSON.stringify(log));
}

/**
 * Log error message
 */
export function logError(message, error = null) {
    const log = formatLog(LOG_LEVELS.ERROR, message, error);
    console.error(JSON.stringify(log));
}
