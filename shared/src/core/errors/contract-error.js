class ContractError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
  }
}

module.exports = ContractError; 