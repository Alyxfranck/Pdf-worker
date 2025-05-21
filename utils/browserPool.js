const puppeteer = require('puppeteer');

class BrowserPool {
  constructor(options = {}) {
    this.options = {
      maxPoolSize: options.maxPoolSize || 3,
      maxPageLifetime: options.maxPageLifetime || 100, // Max PDFs per browser
      launchOptions: options.launchOptions || {
        headless: 'new',
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--js-flags=--max-old-space-size=1024'
        ]
      }
    };
    
    this.browsers = [];
    this.browserUsageCounts = new WeakMap(); // Track usage of each browser
    this.initializingBrowser = null;
  }

  async getBrowser() {
    // Try to get an existing browser from the pool
    if (this.browsers.length > 0) {
      return this.browsers.pop();
    }

    // If already initializing a browser, wait for it
    if (this.initializingBrowser) {
      return this.initializingBrowser;
    }

    // Create a new browser
    this.initializingBrowser = puppeteer.launch(this.options.launchOptions);
    
    try {
      const browser = await this.initializingBrowser;
      this.browserUsageCounts.set(browser, 0);
      this.initializingBrowser = null;
      return browser;
    } catch (error) {
      this.initializingBrowser = null;
      throw error;
    }
  }

  async releaseBrowser(browser) {
    if (!browser || !browser.isConnected()) {
      return; // Browser already closed or disconnected
    }
    
    // Track browser usage count
    const usageCount = (this.browserUsageCounts.get(browser) || 0) + 1;
    this.browserUsageCounts.set(browser, usageCount);
    
    // If browser has been used too many times, close it to prevent memory issues
    if (usageCount >= this.options.maxPageLifetime) {
      await browser.close();
      return;
    }
    
    // Otherwise return to pool if there's space
    if (this.browsers.length < this.options.maxPoolSize) {
      this.browsers.push(browser);
    } else {
      await browser.close();
    }
  }

  async closeAll() {
    const closingPromises = this.browsers.map(browser => {
      if (browser && browser.isConnected()) {
        return browser.close().catch(() => {});
      }
      return Promise.resolve();
    });
    
    await Promise.all(closingPromises);
    this.browsers = [];
  }
}

module.exports = BrowserPool;