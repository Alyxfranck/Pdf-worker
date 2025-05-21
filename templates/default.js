// Import the calendar styles (adjust path if needed)
const getDefaultStyles = require('./styles/default');
const getCalendarStyles = require('./styles/calendar');

/**
 * Generates the complete HTML template for the PDF
 * @param {Object} data - Data for the template
 * @param {string} data.patientName - Patient name
 * @param {string} data.therapistNotes - Therapist notes
 * @param {string} data.exercisesHTML - HTML string for exercise sections
 * @param {Object} options - Additional options
 * @param {boolean} options.includeCalendar - Whether to include calendar styles
 * @returns {string} Complete HTML for the PDF
 */
function generateTemplate(data, options = {}) {
  // Get the default styles
  let styles = getDefaultStyles();
  
  // Add calendar styles if including a calendar
  if (options.includeCalendar) {
    styles += getCalendarStyles();
  }
  
  // Create the HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Exercise Program</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <!-- Header Section -->
      <div class="document-header">
        <div class="header-content">
          <div class="brand">
            <div class="logo"></div>
            <h1 class="title">Exercise Program</h1>
          </div>
          <div class="patient-info">
            <h3 class="patient-name">${data.patientName || ''}</h3>
            <div>${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      
      <!-- Notes Section -->
      ${data.therapistNotes ? `
      <div class="notes-section">
        <div class="notes-title">Therapist Notes</div>
        <p>${data.therapistNotes}</p>
      </div>
      ` : ''}
      
      <!-- Exercises Section -->
      ${data.exercisesHTML}
    </body>
    </html>
  `;
}

module.exports = {
  generateTemplate
};
