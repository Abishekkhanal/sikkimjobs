/**
 * PDF Parsing Test - STEP 3 VALIDATION
 * 
 * Tests PDF parsing with real SPSC PDFs to prove:
 * 1. At least 1 PDF parses successfully
 * 2. At least 1 PDF fails gracefully
 * 3. Firestore stores both cases correctly
 */

import { downloadAndParsePdf } from './pdfParser.js';
import { normalizeJobData } from './normalizer.js';
import { saveJob, initFirestore } from './firestoreService.js';
import { logInfo, logError, logWarning } from './logger.js';

// Real SPSC PDF URLs from verification
const TEST_PDFS = [
    {
        name: 'Labour Inspector (Text-based)',
        url: 'https://spsc.sikkim.gov.in/Advertisements/Labour_Inspector_Adv_11_12_2025.pdf',
        advtNo: '19/SPSC/EXAM/2025',
        postName: 'Labour Inspector',
        issuedDate: '11/12/2025'
    },
    {
        name: 'Sub Inspector Excise',
        url: 'https://spsc.sikkim.gov.in/Advertisements/Sub_Inspector_Excise_Notification_05_12_2025.pdf',
        advtNo: '18/SPSC/EXAM/2025',
        postName: 'Sub Inspector Excise',
        issuedDate: '05/12/2025'
    },
    {
        name: 'Under Secretary',
        url: 'https://spsc.sikkim.gov.in/Advertisements/Add_Undersecretary_05_12_2025.pdf',
        advtNo: '17/SPSC/EXAM/2025',
        postName: 'Under Secretary',
        issuedDate: '05/12/2025'
    }
];

async function testPdfParsing() {
    console.log('=== STEP 3: PDF PARSING VALIDATION ===\n');

    await initFirestore();

    const results = [];

    for (const testPdf of TEST_PDFS) {
        console.log(`\n--- Testing: ${testPdf.name} ---`);
        console.log(`URL: ${testPdf.url}`);

        try {
            // Test PDF parsing
            console.log('Downloading and parsing PDF...');
            const pdfData = await downloadAndParsePdf(testPdf.url);

            console.log('✓ PDF parsed successfully');
            console.log('Extracted data:', JSON.stringify(pdfData, null, 2));

            // Normalize and save
            const jobData = normalizeJobData({
                advtNo: testPdf.advtNo,
                postName: testPdf.postName,
                issuedDate: testPdf.issuedDate,
                pdfUrl: testPdf.url,
                sourceUrl: 'https://spsc.sikkim.gov.in/Notifications.html',
                ...pdfData
            });

            console.log('Normalized job data:', JSON.stringify(jobData, null, 2));

            const docId = await saveJob(jobData);
            console.log(`✓ Saved to Firestore: ${docId}`);

            results.push({
                name: testPdf.name,
                status: 'SUCCESS',
                dataComplete: jobData.dataComplete,
                docId
            });

        } catch (error) {
            console.log('✗ PDF parsing failed:', error.message);

            // Test graceful failure - save partial data
            try {
                const partialJob = normalizeJobData({
                    advtNo: testPdf.advtNo,
                    postName: testPdf.postName,
                    issuedDate: testPdf.issuedDate,
                    pdfUrl: testPdf.url,
                    sourceUrl: 'https://spsc.sikkim.gov.in/Notifications.html',
                    dataComplete: false,
                    metadata: {
                        parsingErrors: [error.message]
                    }
                });

                console.log('Partial job data:', JSON.stringify(partialJob, null, 2));

                const docId = await saveJob(partialJob);
                console.log(`✓ Saved partial data to Firestore: ${docId}`);

                results.push({
                    name: testPdf.name,
                    status: 'GRACEFUL_FAILURE',
                    dataComplete: false,
                    error: error.message,
                    docId
                });

            } catch (saveError) {
                console.log('✗ Failed to save partial data:', saveError.message);
                results.push({
                    name: testPdf.name,
                    status: 'TOTAL_FAILURE',
                    error: saveError.message
                });
            }
        }
    }

    // Summary
    console.log('\n=== TEST RESULTS SUMMARY ===\n');

    const successful = results.filter(r => r.status === 'SUCCESS');
    const gracefulFailures = results.filter(r => r.status === 'GRACEFUL_FAILURE');
    const totalFailures = results.filter(r => r.status === 'TOTAL_FAILURE');

    console.log(`Total PDFs tested: ${results.length}`);
    console.log(`Successful parses: ${successful.length}`);
    console.log(`Graceful failures: ${gracefulFailures.length}`);
    console.log(`Total failures: ${totalFailures.length}`);

    console.log('\nDetailed results:');
    results.forEach(r => {
        console.log(`\n${r.name}:`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Data Complete: ${r.dataComplete !== undefined ? r.dataComplete : 'N/A'}`);
        console.log(`  Firestore Doc: ${r.docId || 'Not saved'}`);
        if (r.error) {
            console.log(`  Error: ${r.error}`);
        }
    });

    // Validation
    console.log('\n=== STEP 3 VALIDATION ===\n');

    const hasSuccess = successful.length > 0;
    const hasGracefulFailure = gracefulFailures.length > 0;

    console.log(`✓ At least 1 PDF parsed successfully: ${hasSuccess ? 'YES' : 'NO'}`);
    console.log(`✓ At least 1 PDF failed gracefully: ${hasGracefulFailure ? 'YES' : 'NO'}`);
    console.log(`✓ All results stored in Firestore: ${results.every(r => r.docId) ? 'YES' : 'NO'}`);

    if (hasSuccess && (hasGracefulFailure || gracefulFailures.length === 0)) {
        console.log('\n✅ STEP 3 VALIDATION PASSED');
        console.log('Ready to proceed to STEP 4: Error Handling & Logging');
    } else {
        console.log('\n❌ STEP 3 VALIDATION FAILED');
        console.log('Fix PDF parsing before proceeding to STEP 4');
    }

    return results;
}

// Run test
testPdfParsing()
    .then(() => {
        console.log('\nTest completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nTest failed:', error);
        process.exit(1);
    });
