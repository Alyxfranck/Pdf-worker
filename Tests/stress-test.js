const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const TEST_CONFIG = {
  serverUrl: 'http://localhost:3001/generate-pdf',
  requestsPerBatch: 5,     // How many concurrent requests per batch
  batchCount: 30,           // How many batches to run
  delayBetweenBatches: 2000, // Milliseconds between batches
  saveResponses: true      // Whether to save the PDFs
};

// Sample exercise data
const sampleData = {
  patientName: "Stress Test Patient",
  patientNotes: "This is a stress test of the PDF generation service.",
  template: "default",
  includeCalendar: true,
  exercises: [
    {
      name: "Exercise 1",
      description: "Description for exercise 1",
      sets: "3",
      reps: "10",
      frequency: "Daily",
      image: null // No image for faster testing
    },
    {
      name: "Exercise 2",
      description: "Description for exercise 2",
      sets: "2",
      reps: "15",
      frequency: "Every other day",
      image: null // No image for faster testing
    }
  ]
};

// Function to make a single request
async function makeRequest(id) {
  console.log(`[${id}] Starting request`);
  const startTime = Date.now();
  
  try {
    // Add a unique ID to each request for tracking
    const requestData = {
      ...sampleData,
      patientName: `Stress Test Patient ${id}`,
    };
    
    // Make the request
    const response = await axios.post(TEST_CONFIG.serverUrl, requestData, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-ID': `stress-test-${id}`
      },
      timeout: 30000 // 30 second timeout
    });
    
    const duration = Date.now() - startTime;
    console.log(`[${id}] Request completed in ${duration}ms`);
    
    // Save the PDF if configured
    if (TEST_CONFIG.saveResponses) {
      const outputDir = path.join(__dirname, 'stress-test-output');
      await fs.ensureDir(outputDir);
      
      const filename = path.join(outputDir, `stress-test-${id}.pdf`);
      await fs.writeFile(filename, response.data);
      console.log(`[${id}] PDF saved to ${filename}`);
    }
    
    return { id, success: true, duration, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${id}] Request failed after ${duration}ms:`, error.message);
    return { id, success: false, duration, error: error.message };
  }
}

// Function to run a batch of requests
async function runBatch(batchNum) {
  console.log(`\n--- Starting batch ${batchNum + 1}/${TEST_CONFIG.batchCount} ---`);
  const batchStartTime = Date.now();
  
  const requests = [];
  for (let i = 0; i < TEST_CONFIG.requestsPerBatch; i++) {
    const requestId = `batch${batchNum + 1}-req${i + 1}`;
    requests.push(makeRequest(requestId));
  }
  
  const results = await Promise.all(requests);
  
  const batchDuration = Date.now() - batchStartTime;
  const successCount = results.filter(r => r.success).length;
  
  console.log(`\n--- Batch ${batchNum + 1} completed ---`);
  console.log(`Total time: ${batchDuration}ms`);
  console.log(`Success rate: ${successCount}/${TEST_CONFIG.requestsPerBatch}`);
  console.log(`Average response time: ${results.reduce((sum, r) => sum + r.duration, 0) / results.length}ms`);
  
  return results;
}

// Main function to run the stress test
async function runStressTest() {
  console.log(`Starting stress test against ${TEST_CONFIG.serverUrl}`);
  console.log(`Will send ${TEST_CONFIG.requestsPerBatch} concurrent requests in ${TEST_CONFIG.batchCount} batches`);
  console.log(`Total requests: ${TEST_CONFIG.requestsPerBatch * TEST_CONFIG.batchCount}`);
  
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < TEST_CONFIG.batchCount; i++) {
    const batchResults = await runBatch(i);
    results.push(...batchResults);
    
    // Wait before starting the next batch (unless it's the last batch)
    if (i < TEST_CONFIG.batchCount - 1) {
      console.log(`Waiting ${TEST_CONFIG.delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenBatches));
    }
  }
  
  // Calculate overall stats
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const totalRequests = TEST_CONFIG.requestsPerBatch * TEST_CONFIG.batchCount;
  const successRate = (successCount / totalRequests) * 100;
  const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('\n===== STRESS TEST SUMMARY =====');
  console.log(`Total time: ${totalDuration}ms`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Successful requests: ${successCount}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
  
  // Save test results
  const resultDir = path.join(__dirname, 'stress-test-output');
  await fs.ensureDir(resultDir);
  await fs.writeFile(
    path.join(resultDir, `results-${new Date().toISOString().replace(/:/g, '-')}.json`),
    JSON.stringify({
      config: TEST_CONFIG,
      summary: {
        totalDuration,
        totalRequests,
        successCount,
        successRate,
        avgResponseTime
      },
      detailedResults: results
    }, null, 2)
  );
  
  console.log('Test results have been saved to the stress-test-output directory');
}

// Run the test
runStressTest().catch(console.error);