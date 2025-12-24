import axios from 'axios';
import https from 'https';
import pdfParse from 'pdf-parse';
import { logInfo, logError, logWarning } from './logger.js';

/**
 * ⚠️ OCR POLICY - HARD CONTRACT BOUNDARY
 * 
 * OCR is NOT enabled in the automated pipeline.
 * Scanned PDFs are marked dataComplete=false and linked only.
 * 
 * DO NOT add OCR libraries (Tesseract, Google Vision, AWS Textract, etc.)
 * See: ../OCR_POLICY.md for full policy details
 */

// PRODUCTION-SAFE: SSL bypass ONLY for PDF downloads
// Required for Indian government websites with broken certificate chains
const httpsAgent = new https.Agent({
    rejectUnauthorized: false  // Allow self-signed/broken certs
});

/**
 * Regex patterns for extracting job data from PDF text
 * Each field has multiple patterns as fallbacks
 */
const PATTERNS = {
    advtNo: [
        /Advertisement\s+No\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
        /Advt\.?\s+No\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
        /Notification\s+No\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
        /No\.?\s*([A-Z0-9\/\-]{5,})/i
    ],

    postName: [
        /(?:Post|Position|Vacancy)\s*[:\-]?\s*([A-Za-z\s,&\(\)]+?)(?:\n|Last\s+Date|Total)/i,
        /Name\s+of\s+Post\s*[:\-]?\s*([A-Za-z\s,&\(\)]+?)(?:\n|Last\s+Date)/i,
        /for\s+the\s+post\s+of\s+([A-Za-z\s,&\(\)]+?)(?:\n|Last\s+Date)/i
    ],

    lastDate: [
        /Last\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(?:on|before)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /Closing\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /up\s+to\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ],

    qualification: [
        /(?:Essential\s+)?Qualification\s*[:\-]?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
        /Educational\s+Qualification\s*[:\-]?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
        /Eligibility\s*[:\-]?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i
    ],

    totalPosts: [
        /(?:Total\s+)?(?:No\.\s+of\s+)?(?:Posts?|Vacancies)\s*[:\-]?\s*(\d+)/i,
        /(\d+)\s+(?:Posts?|Vacancies)/i,
        /Number\s+of\s+Vacancies\s*[:\-]?\s*(\d+)/i
    ],

    department: [
        /Department\s*[:\-]?\s*([A-Za-z\s&,]+?)(?:\n|Post)/i,
        /(?:under|in)\s+([A-Z][A-Za-z\s&,]+?)\s+Department/i
    ]
};

/**
 * Download and parse PDF - PRODUCTION SAFE
 * 
 * SSL bypass is ONLY for PDF downloads, not global
 * Required for Indian government websites with broken certificate chains
 */
export async function downloadAndParsePdf(pdfUrl) {
    logInfo(`Downloading PDF: ${pdfUrl}`);

    try {
        // Download PDF with SSL bypass
        const response = await axios.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            httpsAgent,  // SSL bypass for government sites
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SPSC-Jobs-Bot/1.0)'
            },
            maxContentLength: 20 * 1024 * 1024  // 20MB hard limit
        });

        const buffer = Buffer.from(response.data);

        // Validate PDF size
        if (!buffer || buffer.length < 5000) {
            throw new Error('PDF file too small or empty');
        }

        // Parse PDF
        logInfo('Parsing PDF...');
        const parsed = await pdfParse(buffer);

        // Validate extracted text
        if (!parsed.text || parsed.text.trim().length < 200) {
            throw new Error('PDF text too short or empty (likely scanned)');
        }

        // Extract structured data
        const extracted = extractDataFromText(parsed.text);

        logInfo(`Extracted: ${JSON.stringify(extracted, null, 2)}`);

        return {
            ...extracted,
            dataComplete: true,
            metadata: {
                pdfPages: parsed.numpages,
                extractedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        logError(`PDF parsing failed: ${pdfUrl}`, error);

        // Return minimal data with error flag
        return {
            advtNo: null,
            postName: null,
            qualification: 'See official notification',
            lastDate: null,
            totalPosts: 1,
            department: 'SPSC',
            dataComplete: false,
            metadata: {
                parsingErrors: [error.message],
                extractedAt: new Date().toISOString()
            }
        };
    }
}

/**
 * Extract structured data from PDF text using regex patterns
 */
function extractDataFromText(text) {
    const data = {};

    // Extract each field using pattern matching
    for (const [field, patterns] of Object.entries(PATTERNS)) {
        let extracted = null;

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                extracted = match[1].trim();
                break;
            }
        }

        data[field] = extracted;
    }

    // Log warnings for missing critical fields
    if (!data.advtNo) {
        logWarning('Could not extract advertisement number');
    }
    if (!data.lastDate) {
        logWarning('Could not extract last date');
    }

    return data;
}

/**
 * Test function for manual PDF testing
 */
export async function testPdfParser(pdfUrl) {
    console.log('Testing PDF Parser...');
    const result = await downloadAndParsePdf(pdfUrl);
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
}
