/**
 * Returns the default CSS styling for the exercise PDF
 * @returns {string} CSS styles as a string
 */
function getDefaultStyles() {
  return `
    /* Modern Typography & Variables */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
      /* Clean color palette */
      --font-color: #2d3436;
      --highlight-color: #ff6900;
      --light-gray: #f7f9fc;
      --border-color: #dfe4ea;
      --secondary-color: #5D6A7C;
      
      /* Spacing system */
      --space-xs: 0.25rem;  
      --space-sm: 0.5rem;   
      --space-md: 1rem;     
      --space-lg: 1.5rem;   
      --space-xl: 2rem;     
    }
    
    @page {
      size: A4;
      margin: 1cm 2cm 1cm 2cm; /* Keeping margins unchanged */
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      color: var(--font-color);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      letter-spacing: -0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Typography refinements */
    h1 {
      font-size: 20pt; 
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    
    h3 {
      font-size: 11pt;
      font-weight: 500;
      line-height: 1.4;
    }
    
    p {
      margin-bottom: var(--space-md);
    }
    
    p:last-child {
      margin-bottom: 0;
    }
    
    /* Clean document header */
    .document-header {
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }
    
    .document-header::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 70px;
      height: 3px;
      background: var(--highlight-color);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    /* Clean branding */
    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }
    
    .logo {
      width: 1.2cm;
      height: 1.2cm;
      background: var(--highlight-color);
      border-radius: 12px;
      position: relative;
      overflow: hidden;
    }
    
    .title {
      color: var(--highlight-color);
    }
    
    /* Patient information */
    .patient-info {
      text-align: right;
      color: var(--secondary-color);
      font-size: 10pt;
      position: relative;
      padding-right: 1px;
    }
    
    .patient-name {
      color: var(--font-color);
      margin-bottom: 5pt;
      position: relative;
      display: inline-block;
    }
    
    /* Notes Section */
    .notes-section {
      background-color: var(--light-gray);
      padding: 0.8rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      position: relative;
      border-left: 3px solid var(--highlight-color);
    }
    
    .notes-title {
      color: var(--secondary-color);
      margin-bottom: var(--space-sm);
      font-weight: 500;
      display: flex;
      align-items: center;
    }
    
    .notes-title::before {
      content: "";
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ff6900'%3E%3Cpath d='M14 3a1 1 0 011 1v1h5a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h5V4a1 1 0 011-1h4zm0 2H10v1h4V5zM5 8v10h14V8H5z'/%3E%3C/svg%3E");
      background-size: contain;
      margin-right: 6px;
    }
    
    /* Exercise Grid - modified for 3 exercises per page */
    .exercises-grid {
      display: grid;
      grid-template-rows: repeat(3, minmax(5.7cm, 1fr)); /* Changed from 4 to 3, increased height */
      grid-gap: 0.6cm; /* Slightly increased gap for better spacing */
      margin-bottom: 0;
    }
    
    /* Clean Exercise Container */
    .exercise-container {
      page-break-inside: avoid;
      break-inside: avoid;
      display: grid;
      grid-template-rows: auto 1fr;
      row-gap: var(--space-sm);
      background-color: white;
      border-radius: 8px;
      // border: 1px solid var(--border-color);
      overflow: hidden;
      position: relative;
    }
    
    .exercise-container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: var(--highlight-color);
      opacity: 0.7;
    }
    
    .exercise-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.2cm;
      padding: 0.4cm 0.3cm 0 0.3cm; /* Increased top padding to compensate for removed number */
    }
    
    .exercise-title {
      font-weight: 600;
      color: var(--font-color);
    }
    
    .exercise-content {
      display: grid;
      grid-template-columns: 4cm 1fr;
      gap: 0.6cm;
      padding: 0 0.3cm 0.3cm 0.3cm;
    }
    
    /* Image container styling */
    .exercise-image-container {
      width: 4cm;
      height: 4cm;
      border-radius: 6px;
      overflow: hidden;
      background-color: var(--light-gray);
     
    }
    
    .exercise-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* Exercise Description */
    .exercise-description {
      display: flex;
      flex-direction: column;
      // background-color: var(--light-gray);
      border-radius: 6px;
      padding: 0.3cm;
      height: 100%;
      border: 1px solid var(--border-color);
    }
    
    .exercise-description p {
      white-space: pre-line;
      line-height: 1.5;
      font-size: 9.5pt;
      color: #444;
      overflow: hidden;
      margin: 0;
    }
    
    /* Page Breaks */
    .page-break {
      page-break-after: always;
      height: 0;
      margin: 0;
      padding: 0;
    }
  `;
}

module.exports = getDefaultStyles;
