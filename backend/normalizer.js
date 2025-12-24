/**
 * Data Normalizer - Production Ready
 * 
 * Transforms raw extracted data into clean, validated structured format
 * Features:
 * - Date normalization (multiple formats)
 * - Text cleaning and validation
 * - Fallback values for missing data
 * - Validation rules
 */

import moment from 'moment';
import { logWarning } from './logger.js';

/**
 * Normalize job data
 */
export function normalizeJobData(rawData) {
    const normalized = {
        // Required fields with fallbacks
        advtNo: normalizeAdvtNo(rawData.advtNo),
        postName: normalizePostName(rawData.postName),
        department: normalizeDepartment(rawData.department),
        totalPosts: normalizeTotalPosts(rawData.totalPosts),
        qualification: normalizeQualification(rawData.qualification),
        lastDate: normalizeDate(rawData.lastDate),
        pdfUrl: rawData.pdfUrl,

        // Metadata
        scrapedAt: rawData.scrapedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: determineStatus(rawData.lastDate),
        dataComplete: rawData.dataComplete !== false,

        metadata: {
            sourceUrl: rawData.sourceUrl || 'https://spscskm.gov.in',
            parsingErrors: rawData.metadata?.parsingErrors || [],
            ...rawData.metadata
        }
    };

    // Validate
    validateJobData(normalized);

    return normalized;
}

/**
 * Normalize advertisement number
 */
function normalizeAdvtNo(advtNo) {
    if (!advtNo || advtNo.startsWith('TEMP_')) {
        // Generate fallback from timestamp
        return `SPSC/${new Date().getFullYear()}/${Date.now()}`;
    }

    // Uppercase and clean
    return advtNo.toUpperCase().trim();
}

/**
 * Normalize post name
 */
function normalizePostName(postName) {
    if (!postName || postName === 'Unknown Position') {
        return 'Position Not Specified';
    }

    // Clean and title case
    let cleaned = postName
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ');

    // Truncate if too long
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 197) + '...';
        logWarning(`Post name truncated: ${postName}`);
    }

    return cleaned;
}

/**
 * Normalize department
 */
function normalizeDepartment(department) {
    if (!department) {
        return 'SPSC';
    }

    return department
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 100);
}

/**
 * Normalize total posts
 */
function normalizeTotalPosts(totalPosts) {
    if (!totalPosts) {
        return 1;
    }

    const parsed = parseInt(totalPosts, 10);

    if (isNaN(parsed) || parsed < 1) {
        logWarning(`Invalid totalPosts: ${totalPosts}, defaulting to 1`);
        return 1;
    }

    return parsed;
}

/**
 * Normalize qualification
 */
function normalizeQualification(qualification) {
    if (!qualification) {
        return 'See official notification for qualification details';
    }

    // Clean whitespace but preserve line breaks
    let cleaned = qualification
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n');

    // Truncate if too long
    if (cleaned.length > 1000) {
        cleaned = cleaned.substring(0, 997) + '...';
        logWarning('Qualification text truncated');
    }

    return cleaned;
}

/**
 * Normalize date - handles multiple formats
 */
function normalizeDate(dateStr) {
    if (!dateStr) {
        // Default to 30 days from now if no date found
        logWarning('No last date found, defaulting to +30 days');
        return moment().add(30, 'days').toISOString();
    }

    // Supported formats
    const formats = [
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'DD.MM.YYYY',
        'D/M/YYYY',
        'D-M-YYYY',
        'DD/MM/YY',
        'DD-MM-YY'
    ];

    for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) {
            // Ensure it's a future date
            if (parsed.isBefore(moment())) {
                logWarning(`Last date is in the past: ${dateStr}`);
            }
            return parsed.toISOString();
        }
    }

    // If all parsing fails
    logWarning(`Could not parse date: ${dateStr}, defaulting to +30 days`);
    return moment().add(30, 'days').toISOString();
}

/**
 * Determine job status based on last date
 */
function determineStatus(lastDate) {
    if (!lastDate) {
        return 'active';
    }

    const deadline = moment(lastDate);
    const now = moment();

    if (deadline.isBefore(now)) {
        return 'expired';
    }

    return 'active';
}

/**
 * Validate job data
 */
function validateJobData(data) {
    const errors = [];

    // Required fields
    if (!data.advtNo) {
        errors.push('Missing advertisement number');
    }

    if (!data.postName || data.postName.length < 3) {
        errors.push('Invalid post name');
    }

    if (!data.pdfUrl || !data.pdfUrl.startsWith('http')) {
        errors.push('Invalid PDF URL');
    }

    if (!data.lastDate) {
        errors.push('Missing last date');
    }

    // Log validation errors
    if (errors.length > 0) {
        logWarning(`Validation warnings: ${errors.join(', ')}`);
    }

    return errors.length === 0;
}

/**
 * Test function
 */
export function testNormalizer() {
    const testData = {
        advtNo: 'spsc/2024/123',
        postName: '  junior   engineer  ',
        department: 'Public Works Department',
        totalPosts: '5',
        qualification: 'BE/B.Tech in Civil Engineering',
        lastDate: '31/12/2024',
        pdfUrl: 'https://spscskm.gov.in/test.pdf',
        dataComplete: true
    };

    const normalized = normalizeJobData(testData);
    console.log('Normalized:', JSON.stringify(normalized, null, 2));
    return normalized;
}
