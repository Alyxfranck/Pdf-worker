class RequestQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.concurrency = options.concurrency || 2;
    this.activeRequests = 0;
    this.processingFunction = null;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject
      });
      
      this.processNext();
    });
  }

  setProcessingFunction(fn) {
    this.processingFunction = fn;
  }

  async processNext() {
    // If already at max concurrency or no processor, return
    if (this.activeRequests >= this.concurrency || !this.processingFunction) {
      return;
    }
    
    // Get next item from queue
    const item = this.queue.shift();
    if (!item) {
      return; // Queue is empty
    }

    try {
      this.activeRequests++;
      const result = await this.processingFunction(item.request);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeRequests--;
      // Continue processing queue
      this.processNext();
    }
  }

  get length() {
    return this.queue.length;
  }

  get active() {
    return this.activeRequests;
  }
}

module.exports = RequestQueue;