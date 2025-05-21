  // this is the 
  const express = require('express');
  const cors = require('cors');
  const fs = require('fs-extra');
  const path = require('path');
  const { getTemplate } = require('./templates/templateFactory');
  const { generateExercisesHTML, processExerciseImages } = require('./utils/exerciseUtils');
  const BrowserPool = require('./utils/browserPool');
  const RequestQueue = require('./utils/requestQueue');
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Initialize browser pool and request queue
  const browserPool = new BrowserPool({
    maxPoolSize: process.env.MAX_BROWSER_POOL_SIZE || 3,
    maxPageLifetime: process.env.MAX_PAGE_LIFETIME || 100
  });

  const requestQueue = new RequestQueue({
    concurrency: process.env.REQUEST_CONCURRENCY || 2
  });

  // Configure request processor function
  requestQueue.setProcessingFunction(async (data) => {
    const { pdfData, res } = data;
    let browser = null;
    
    try {
      // Process the request (similar to your existing code)
      const processedPdfData = {
        ...pdfData,
        patientName: pdfData.patientName || 'Patient',
        patientNotes: pdfData.patientNotes,
        exercises: pdfData.exercises?.map((ex) => ({
          ...ex,
          description: ex.description
        })) || []
      };
      
      if (!processedPdfData.exercises || !Array.isArray(processedPdfData.exercises) || processedPdfData.exercises.length === 0) {
        return res.status(400).json({ error: 'No exercises provided' });
      }

      // Process images
      const { imageBase64Map, placeholderBase64 } = processExerciseImages(processedPdfData.exercises);
      
      // Format date
      const formattedDate = processedPdfData.date 
        ? new Date(processedPdfData.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }) 
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          });

      // Generate HTML content
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
      
      const templateName = processedPdfData.template || 'default';
      const templateGenerator = getTemplate(templateName);
      const htmlContent = templateGenerator.generateTemplate(
        { 
          patientName: processedPdfData.patientName,
          therapistNotes: processedPdfData.patientNotes,
          exercisesHTML: exercisesHTML
        },
        { includeCalendar: processedPdfData.includeCalendar }
      );

      // Get browser from pool
      browser = await browserPool.getBrowser();
      const page = await browser.newPage();
      
      try {
        // Set content with timeout
        await page.setContent(htmlContent, { 
          timeout: 60000,  // 60 second timeout
          waitUntil: ['networkidle0', 'load', 'domcontentloaded']
        });
        
        // Configure viewport
        await page.setViewport({ width: 1240, height: 1754 });

        // Generate PDF
        const pdf = await page.pdf({ 
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
        });
        
        // Close page (but keep browser)
        await page.close();
        
        // Format filename
        const sanitizedDate = formattedDate.replace(/\s/g, '_');
        const sanitizedName = processedPdfData.patientName
          ? processedPdfData.patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
          : 'patient';
        const filename = `exercise_plan_${sanitizedName}_${sanitizedDate}.pdf`;
        
        // Send response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.send(pdf);
        
        return { success: true };
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => {});
        }
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      
      // Structured logging for monitoring
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        patient: pdfData.patientName,
        reqId: pdfData.requestId || 'unknown'
      }));
      
      // Only send error response if not already sent
      if (!res.headersSent) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
          error: 'Failed to generate PDF', 
          details: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
      
      return { success: false, error };
    } finally {
      // Always release browser back to pool
      if (browser) {
        await browserPool.releaseBrowser(browser).catch(() => {});
      }
    }
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static('public'));

  // Request tracking middleware
  app.use((req, res, next) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    req.requestId = requestId;
    
    // Log requests
    console.log(`[${requestId}] ${req.method} ${req.path}`);
    
    // Track response time
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${requestId}] ${res.statusCode} ${duration}ms`);
    });
    
    next();
  });

  // Rate limiting
  let requestCount = 0;
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const RATE_LIMIT = 60; // 60 requests per minute
  setInterval(() => { requestCount = 0; }, RATE_LIMIT_WINDOW);

  // PDF generation endpoint
  app.post('/generate-pdf', async (req, res) => {
    // Rate limiting check
    requestCount++;
    if (requestCount > RATE_LIMIT) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: 'Please try again later'
      });
    }

    const pdfData = {
      ...req.body,
      requestId: req.requestId
    };
    
    // Queue the request - this returns a promise that resolves when processing is complete
    await requestQueue.add({ pdfData, res });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      queueLength: requestQueue.length,
      activeRequests: requestQueue.active,
      poolSize: browserPool.browsers.length
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  async function shutdown() {
    console.log('Shutting down gracefully...');
    
    // Close browser pool
    await browserPool.closeAll();
    
    // Allow server to finish processing requests
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`PDF Generator service running at http://localhost:${PORT}`);
  });