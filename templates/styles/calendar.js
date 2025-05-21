/**
 * Returns the CSS styling for the exercise tracking calendar
 * @returns {string} CSS styles as a string
 */
function getCalendarStyles() {
  return `
    /* Calendar Styles */
    .calendar-page {
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    .calendar-title {
      text-align: center;
      margin-bottom: 20px;
    }

    .calendar-container {
      width: 100%;
      margin: 0 auto;
    }

    .calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: center;
    }

    .weekday {
      padding: 10px;
      border: 1px solid #ddd;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0;
    }

    .calendar-day {
      height: 80px;
      border: 1px solid #ddd;
      padding: 5px;
      position: relative;
    }

    .calendar-day.empty {
      background-color: #f9f9f9;
    }

    .calendar-day.highlighted {
      background-color: #fffde7;
    }

    .date-number {
      position: absolute;
      top: 5px;
      left: 5px;
      font-size: 14px;
    }

    .checkbox-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .checkbox {
      width: 30px;
      height: 30px;
      border: 2px solid #999;
      border-radius: 3px;
    }

    .calendar-instructions {
      margin-top: 20px;
      text-align: center;
    }
  `;
}

module.exports = getCalendarStyles;