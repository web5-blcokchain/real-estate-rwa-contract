class EventError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'EventError';
    this.code = code;
  }
}

module.exports = EventError; 