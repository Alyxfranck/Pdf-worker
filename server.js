const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { decode } = require('html-entities');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Process text similar to your current implementation
function processText(text) {
  if (!text) return '';
  
  // Step 1: Decode HTML entities
  let processed = decode(text);
  
  // Step 2: Replace XML control codes with newlines
  processed = processed.replace(/_x000D_/g, '\n');
  
  // Step 3: Convert <br/> to newlines
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  
  // Step 4: Remove excessive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Step 5: Trim whitespace
  processed = processed.trim();
  
  return processed;
}

// PDF generation endpoint
app.post('/generate-pdf', async (req, res) => {
  try {
    const pdfData = req.body;
    
    // Process all text fields for proper formatting
    const processedPdfData = {
      ...pdfData,
      patientName: pdfData.patientName,
      patientNotes: processText(pdfData.patientNotes),
      exercises: pdfData.exercises.map((ex) => ({
        ...ex,
        description: processText(ex.description)
      }))
    };
    
    if (!processedPdfData.exercises || !Array.isArray(processedPdfData.exercises) || processedPdfData.exercises.length === 0) {
      return res.status(400).json({ error: 'No exercises provided' });
    }

    // Pre-load images as base64 data from the provided URLs
    const imageBase64Map = new Map();
    
    // Create a simple placeholder for failed images
    const placeholderSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f0f0f0"/>
        <text x="100" y="100" font-family="Arial" font-size="14" fill="#888" text-anchor="middle">Image not available</text>
      </svg>
    `;
    const placeholderBase64 = `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
    
    // Process images if they're included in the request
    for (const exercise of processedPdfData.exercises) {
      // If the client sends base64 images directly, use them
      if (exercise.imageBase64) {
        imageBase64Map.set(exercise.id, exercise.imageBase64);
      } else {
        // Otherwise, set the placeholder
        imageBase64Map.set(exercise.id, placeholderBase64);
      }
    }

    // Format date
    const formattedDate = processedPdfData.date 
      ? new Date(processedPdfData.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }) 
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

    // Generate the HTML content with the same template from your original code
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exercise Plan - ${processedPdfData.patientName || 'Patient'}</title>
        <style>
          /* Base Typography */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          :root {
            --font-color: #1d1d1f;
            --highlight-color: #0071e3;
            --light-gray: #f5f5f7;
            --border-color: #d2d2d7;
            --section-gap: 1.5cm;
          }
          
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            color: var(--font-color);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11pt;
            line-height: 1.47;
            letter-spacing: -0.022em;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Element Styling */
          h1, h2, h3, h4, p {
            margin: 0;
          }
          
          h1 {
            font-size: 28pt;
            font-weight: 600;
            letter-spacing: -0.03em;
          }
          
          h2 {
            font-size: 18pt;
            font-weight: 600;
            letter-spacing: -0.03em;
          }
          
          h3 {
            font-size: 14pt;
            font-weight: 500;
            letter-spacing: -0.02em;
          }
          
          hr {
            border: 0;
            height: 1px;
            background-color: var(--border-color);
            margin: 0.8cm 0;
          }
          
          /* Layout Components */
          .document-header {
            padding-bottom: var(--section-gap);
            border-bottom: 1px solid var(--border-color);
            margin-bottom: var(--section-gap);
          }
          
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .brand {
            display: flex;
            align-items: center;
            gap: 0.8cm;
          }
          
          .logo {
            width: 1.2cm;
            height: 1.2cm;
            background-color: var(--highlight-color);
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          }
          
          .title {
            color: var(--highlight-color);
          }
          
          .patient-info {
            text-align: right;
            color: #515154;
          }
          
          .patient-name {
            color: var(--font-color);
            margin-bottom: 4pt;
          }
          
          .notes-section {
            background-color: var(--light-gray);
            padding: 0.6cm;
            border-radius: 8px;
            margin-bottom: var(--section-gap);
          }
          
          .notes-title {
            color: #86868b;
            margin-bottom: 8pt;
          }
          
          .exercise-container {
            margin-bottom: var(--section-gap);
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .exercise-header {
            display: flex;
            align-items: center;
            margin-bottom: 0.5cm;
          }
          
          .exercise-number {
            font-size: 20pt;
            font-weight: 600;
            color: var(--highlight-color);
            margin-right: 0.5cm;
            min-width: 0.8cm;
          }
          
          .exercise-content {
            display: flex;
            gap: 1cm;
            min-height: 5cm;
          }
          
          .exercise-image-container {
            width: 5cm;
            height: 5cm;
            flex: 0 0 5cm;
            border-radius: 8px;
            overflow: hidden;
            background-color: #f0f0f0;
          }
          
          .exercise-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .exercise-description {
            flex: 1;
          }
          
          .exercise-description p {
            white-space: pre-line;
            margin: 0;
            line-height: 1.5;
            font-size: 10.5pt;
          }
          
          .exercise-description ul {
            margin: 0.3cm 0;
            padding-left: 0.5cm;
          }
          
          .exercise-description li {
            margin-bottom: 0.2cm;
          }
          
          .document-footer {
            margin-top: var(--section-gap);
            padding-top: 0.5cm;
            border-top: 1px solid var(--border-color);
            text-align: center;
            font-size: 9pt;
            color: #86868b;
          }
          
          main::after {
            content: "";
            display: block;
            height: 4cm;
          }
          
          .page-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1cm;
            font-size: 9pt;
            color: #86868b;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.3cm;
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <div class="header-content">
            <div class="brand">
              <div class="logo"></div>
              <h1 class="title">Exercise Plan</h1>
            </div>
            <div class="patient-info">
              ${processedPdfData.patientName ? `<h2 class="patient-name">${processedPdfData.patientName}</h2>` : ''}
              <div>${formattedDate}</div>
            </div>
          </div>
        </div>
        
        ${processedPdfData.patientNotes ? `
        <div class="notes-section">
          <h3 class="notes-title">Notes</h3>
          <p>${processedPdfData.patientNotes}</p>
        </div>
        ` : ''}

        <main>
          ${processedPdfData.exercises.map((exercise, index) => {
            // Get the base64 image data or fallback to placeholder
            const base64Image = imageBase64Map.get(exercise.id) || placeholderBase64;
              
            return `
              <div class="exercise-container">
                <div class="exercise-header">
                  <div class="exercise-number">${index + 1}</div>
                  <h2 class="exercise-title">${exercise.title}</h2>
                </div>
                <div class="exercise-content">
                  <div class="exercise-image-container">
                    <img 
                      class="exercise-image" 
                      src="${base64Image}" 
                      alt="Visual demonstration of ${exercise.title}"
                    />
                  </div>
                  <div class="exercise-description">
                    <p>${exercise.description || 'No specific instructions provided.'}</p>
                  </div>
                </div>
              </div>
              ${index < processedPdfData.exercises.length - 1 ? '<hr>' : ''}
            `;
          }).join('')}
        </main>
        
        <div class="document-footer">
          <p>Generated on ${new Date().toLocaleDateString()} • Exercise Plan</p>
        </div>
      </body>
      </html>
    `;

    // Launch browser
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent);
    
    // Configure viewport for better rendering
    await page.setViewport({ width: 1240, height: 1754 }); // A4 size at 150dpi

    // Generate PDF with proper settings
    const pdf = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '1.5cm',
        right: '1.5cm',
        bottom: '1.5cm',
        left: '1.5cm'
      }
    });
    
    // Close browser to free resources
    await browser.close();

    // Format the filename for download
    const sanitizedDate = formattedDate.replace(/\s/g, '_');
    const sanitizedName = processedPdfData.patientName
      ? processedPdfData.patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'patient';
    const filename = `exercise_plan_${sanitizedName}_${sanitizedDate}.pdf`;

    // Return the PDF with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Provide meaningful error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`PDF Generator service running on port ${PORT}`);
});
