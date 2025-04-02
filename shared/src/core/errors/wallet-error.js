class WalletError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }
}

module.exports = WalletError; 