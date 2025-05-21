const getCalendarStyles = require('../templates/styles/calendar');

/**
 * Generates HTML for exercise sections with pagination for the default template
 * @param {Array} exercises - Array of exercise objects
 * @param {Map} imageBase64Map - Map of exercise IDs to base64 image data
 * @param {string} placeholderBase64 - Base64 string for placeholder image
 * @returns {string} HTML for the exercises section
 */
function generateDefaultExercisesHTML(exercises, imageBase64Map, placeholderBase64) {
  // Group exercises into sets of 3 for pagination
  const pages = [];
  const exercisesArray = [...exercises];
  
  while (exercisesArray.length > 0) {
    pages.push(exercisesArray.splice(0, 3));
  }
  
  return pages.map((page, pageIndex) => `
    <div class="exercises-grid">
      ${page.map((exercise) => {
        const base64Image = imageBase64Map.get(exercise.id) || placeholderBase64;
          
        return `
          <div class="exercise-container">
            <div class="exercise-header">
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
        `;
      }).join('')}
    </div>
    ${pageIndex < pages.length - 1 ? '<div class="page-break"></div>' : ''}
  `).join('');
}

/**
 * Generates HTML for exercise sections based on specified template
 * @param {String} template - The template identifier 
 * @param {Array} exercises - Array of exercise objects
 * @param {Map} imageBase64Map - Map of exercise IDs to base64 image data
 * @param {string} placeholderBase64 - Base64 string for placeholder image
 * @param {Object} options - Additional options
 * @param {boolean} options.includeCalendar - Whether to include a tracking calendar
 * @param {Object} options.calendarOptions - Options for the calendar
 * @returns {string} HTML for the exercises section
 */
function generateExercisesHTML(template = 'default', exercises, imageBase64Map, placeholderBase64, options = {}) {
  let html = '';
  
  // Generate exercises HTML based on template
  switch(template) {
    case 'default':
    default:
      html = generateDefaultExercisesHTML(exercises, imageBase64Map, placeholderBase64);
  }
  
  // Optionally add calendar page
  if (options && options.includeCalendar) {
    html += `
      <div class="page-break"></div>
      ${generateExerciseCalendarHTML(options.calendarOptions)}
    `;
  }
  
  return html;
}

/**
 * Generates HTML for an exercise tracking calendar
 * @param {Object} calendarOptions - Options for configuring the calendar
 * @param {Date} calendarOptions.startDate - Start date for the calendar (optional)
 * @param {number} calendarOptions.days - Number of days to show (default: 30)
 * @param {Array} calendarOptions.highlightDates - Dates to highlight (optional)
 * @returns {string} HTML for the exercise tracking calendar
 */
function generateExerciseCalendarHTML(calendarOptions = {}) {
  const startDate = calendarOptions.startDate ? new Date(calendarOptions.startDate) : new Date();
  const days = calendarOptions.days || 30;
  const highlightDates = calendarOptions.highlightDates || [];
  
  // Format dates as YYYY-MM-DD for comparison
  const highlightDatesFormatted = highlightDates.map(d => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });

  let calendarHTML = `
    <div class="calendar-page">
      <h1 class="calendar-title">Exercise Tracking Calendar</h1>
      <div class="calendar-container">
        <div class="calendar-header">
          <div class="weekday">Sun</div>
          <div class="weekday">Mon</div>
          <div class="weekday">Tue</div>
          <div class="weekday">Wed</div>
          <div class="weekday">Thu</div>
          <div class="weekday">Fri</div>
          <div class="weekday">Sat</div>
        </div>
        <div class="calendar-grid">
  `;

  // Adjust first day of the month to appear on the correct weekday
  const firstDay = new Date(startDate);
  firstDay.setDate(1);
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Add empty cells for days before the start date
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  // Add calendar days
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    
    const dateFormatted = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const isHighlighted = highlightDatesFormatted.includes(dateFormatted);
    const dayClass = isHighlighted ? 'calendar-day highlighted' : 'calendar-day';
    
    calendarHTML += `
      <div class="${dayClass}">
        <div class="date-number">${currentDate.getDate()}</div>
        <div class="checkbox-container">
          <div class="checkbox"></div>
        </div>
      </div>
    `;
    
    // Add a new row after Saturday
    if ((firstDayOfWeek + i + 1) % 7 === 0 && i < days - 1) {
      calendarHTML += '</div><div class="calendar-grid">';
    }
  }

  calendarHTML += `
        </div>
      </div>
      <div class="calendar-instructions">
        <p>Track your progress by checking off each day you complete your exercises.</p>
      </div>
    </div>
  `;

  return calendarHTML;
}

/**
 * Create a placeholder SVG image as base64 for missing images
 * @returns {string} Base64 encoded placeholder image
 */
function createPlaceholderImage() {
  const placeholderSvg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f0f0f0"/>
      <text x="100" y="100" font-family="Arial" font-size="14" fill="#888" text-anchor="middle">Image not available</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
}

/**
 * Process images from exercises data
 * @param {Array} exercises - Array of exercise objects
 * @returns {Map} Map of exercise IDs to base64 images
 */
function processExerciseImages(exercises) {
  const imageBase64Map = new Map();
  const placeholderBase64 = createPlaceholderImage();
  
  // Process images if they're included in the request
  for (const exercise of exercises) {
    // If the client sends base64 images directly, use them
    if (exercise.imageBase64) {
      imageBase64Map.set(exercise.id, exercise.imageBase64);
    } else {
      // Otherwise, set the placeholder
      imageBase64Map.set(exercise.id, placeholderBase64);
    }
  }
  
  return { imageBase64Map, placeholderBase64 };
}

module.exports = {
  generateExercisesHTML,
  generateDefaultExercisesHTML, 
  createPlaceholderImage,
  processExerciseImages,
  generateExerciseCalendarHTML
};
