
// Beta- Version: 0.3.0-dev
 
// This is a development server for generating PDFs using Puppeteer.

// includes a browser pool to manage multiple browser instances efficiently.


const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

// Import the modular components
const { getTemplate } = require('./templates/templateFactory');
const { generateExercisesHTML, processExerciseImages } = require('./utils/exerciseUtils');

// Browser Pool implementation
class BrowserPool {
  constructor(maxPoolSize = 2) {
    this.browsers = [];
    this.maxPoolSize = maxPoolSize;
    this.initializingBrowser = null;
    console.log('[DEV] Browser pool initialized with max size:', maxPoolSize);
  }

  async getBrowser() {
    // Check if we have any available browsers in the pool
    if (this.browsers.length > 0) {
      console.log('[DEV] Reusing browser from pool, available:', this.browsers.length - 1);
      return this.browsers.pop();
    }

    // If we're already initializing a browser, wait for it
    if (this.initializingBrowser) {
      console.log('[DEV] Waiting for browser initialization to complete');
      return this.initializingBrowser;
    }

    // Otherwise, create a new browser
    console.log('[DEV] Creating new browser instance');
    this.initializingBrowser = puppeteer.launch({
      headless: 'new',
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });

    try {
      const browser = await this.initializingBrowser;
      this.initializingBrowser = null;
      return browser;
    } catch (error) {
      this.initializingBrowser = null;
      throw error;
    }
  }

  async releaseBrowser(browser) {
    // Check if browser is still connected before returning to pool
    if (browser && browser.isConnected()) {
      // Only keep browsers in the pool up to maxPoolSize
      if (this.browsers.length < this.maxPoolSize) {
        this.browsers.push(browser);
        console.log('[DEV] Browser returned to pool, available:', this.browsers.length);
      } else {
        console.log('[DEV] Browser pool full, closing browser');
        await browser.close();
      }
    } else if (browser) {
      console.log('[DEV] Browser disconnected, not returning to pool');
    }
  }

  async closeAll() {
    console.log('[DEV] Closing all browsers in pool');
    for (const browser of this.browsers) {
      if (browser && browser.isConnected()) {
        await browser.close();
      }
    }
    this.browsers = [];
  }
}

// Create browser pool instance
const browserPool = new BrowserPool(2); // Keep up to 2 browsers in the pool

// Process cleanup to ensure browsers are closed
process.on('SIGINT', async () => {
  console.log('[DEV] Received SIGINT, closing all browsers');
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[DEV] Received SIGTERM, closing all browsers');
  await browserPool.closeAll();
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT || 3001; // Using 3002 to avoid conflict with production

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Additional dev middleware for better debugging
app.use((req, res, next) => {
  console.log(`[DEV] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// PDF generation endpoint
app.post('/generate-pdf', async (req, res) => {
  console.log('[DEV] Received request for PDF generation');
  
  let browser = null;
  
  try {
    const pdfData = req.body;
    
    // Log incoming data in development mode
    console.log('[DEV] Request data structure:', JSON.stringify({
      patientName: pdfData.patientName || 'No name provided',
      template: pdfData.template || 'default',
      exerciseCount: pdfData.exercises?.length || 0,
      includeCalendar: !!pdfData.includeCalendar
    }, null, 2));
    
    // Simply use the data as provided without text processing
    const processedPdfData = {
      ...pdfData,
      patientName: pdfData.patientName || 'Patient',
      patientNotes: pdfData.patientNotes,
      exercises: pdfData.exercises.map((ex) => ({
        ...ex,
        description: ex.description
      }))
    };
    
    if (!processedPdfData.exercises || !Array.isArray(processedPdfData.exercises) || processedPdfData.exercises.length === 0) {
      return res.status(400).json({ error: 'No exercises provided' });
    }

    console.log('[DEV] Processing exercise images');
    // Process the images - now using our utility function
    const { imageBase64Map, placeholderBase64 } = processExerciseImages(processedPdfData.exercises);
    
    // Format date
    const formattedDate = processedPdfData.date 
      ? new Date(processedPdfData.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }) 
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

    console.log('[DEV] Generating HTML content');
    // Generate exercises HTML using our utility function
    const exercisesHTML = generateExercisesHTML(
      'default', 
      processedPdfData.exercises, 
      imageBase64Map, 
      placeholderBase64,
      { 
        includeCalendar: processedPdfData.includeCalendar,
        calendarOptions: processedPdfData.calendarOptions 
      }
    );
    
    // Generate the complete HTML using the template
    const templateName = processedPdfData.template || 'default';
    console.log(`[DEV] Using template: ${templateName}`);
    
    const templateGenerator = getTemplate(templateName);
    const htmlContent = templateGenerator.generateTemplate(
      { 
        patientName: processedPdfData.patientName,
        therapistNotes: processedPdfData.patientNotes,
        exercisesHTML: exercisesHTML
      },
      { includeCalendar: processedPdfData.includeCalendar }
    );

    // Development mode - save HTML for inspection if needed
    const debugDir = path.join(__dirname, 'debug');
    await fs.ensureDir(debugDir);
    await fs.writeFile(path.join(debugDir, 'last-generated.html'), htmlContent);
    console.log('[DEV] HTML content saved to debug/last-generated.html for inspection');

    console.log('[DEV] Acquiring browser from pool');
    // Get a browser instance from the pool
    browser = await browserPool.getBrowser();
    
    // Create a new page in the browser
    const page = await browser.newPage();
    
    // Set content with timeout handling
    console.log('[DEV] Setting page content');
    await page.setContent(htmlContent, { timeout: 60000 }); // Increased timeout for dev testing
    
    // Configure viewport for better rendering
    await page.setViewport({ width: 1240, height: 1754 }); // A4 size at 150dpi

    console.log('[DEV] Generating PDF');
    // Generate PDF with proper settings
    const pdf = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    
    // Close page but keep browser in pool
    await page.close();
    
    // Format the filename for download
    const sanitizedDate = formattedDate.replace(/\s/g, '_');
    const sanitizedName = processedPdfData.patientName
      ? processedPdfData.patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'patient';
    const filename = `exercise_plan_${sanitizedName}_${sanitizedDate}.pdf`;

    console.log(`[DEV] Sending PDF response with filename: ${filename}`);
    // Return the PDF with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.send(pdf);
    
    console.log('[DEV] PDF generation completed successfully');
  } catch (error) {
    console.error('[DEV] PDF generation error:', error);
    
    // Save error details to file in development mode
    const debugDir = path.join(__dirname, 'debug');
    await fs.ensureDir(debugDir);
    await fs.writeFile(
      path.join(debugDir, `error-${Date.now()}.log`), 
      JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }, null, 2)
    );
    
    // Provide meaningful error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Always release the browser back to the pool
    if (browser) {
      console.log('[DEV] Releasing browser back to pool');
      await browserPool.releaseBrowser(browser);
    }
  }
});

// Health check endpoint for testing
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    version: '0.1.0-dev',
    browserPoolSize: browserPool.browsers.length,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[DEV] PDF Generator development server running at http://localhost:${PORT}`);
  console.log(`[DEV] Send POST requests to http://localhost:${PORT}/generate-pdf`);
  console.log(`[DEV] Health check available at http://localhost:${PORT}/health`);
});