const generateDefaultTemplate = require('./default');
// Import other templates as they are created
// const generateCompactTemplate = require('./compact');

/**
 * Factory function to get the appropriate template based on template name
 * @param {string} templateName - Name of the template to use
 * @returns {Function} Template generator function
 */
function getTemplate(templateName = 'default') {
  switch(templateName.toLowerCase()) {
    case 'default':
    default:
      return generateDefaultTemplate;
    // Add other templates as they're created
    // case 'compact':
    //   return generateCompactTemplate;
  }
}

module.exports = {
  getTemplate
};
