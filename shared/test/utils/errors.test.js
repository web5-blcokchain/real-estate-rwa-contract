const { expect } = require('chai');
const {
  ErrorCodes,
  BlockchainError,
  NetworkError,
  WalletError,
  ContractError,
  TransactionError,
  GasError,
  ConfigError,
  ValidationError,
  LoggerError,
  ErrorHandler
} = require('../../src/utils/errors');

describe('Errors Module', () => {
  describe('ErrorCodes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes).to.have.property('NETWORK_ERROR', 1000);
      expect(ErrorCodes).to.have.property('WALLET_ERROR', 2000);
      expect(ErrorCodes).to.have.property('CONTRACT_ERROR', 3000);
      expect(ErrorCodes).to.have.property('TRANSACTION_ERROR', 4000);
      expect(ErrorCodes).to.have.property('GAS_ERROR', 5000);
      expect(ErrorCodes).to.have.property('CONFIG_ERROR', 6000);
      expect(ErrorCodes).to.have.property('VALIDATION_ERROR', 7000);
      expect(ErrorCodes).to.have.property('LOGGER_ERROR', 8000);
    });
  });

  describe('BlockchainError', () => {
    it('should create base error with default values', () => {
      const message = 'Test error';
      const error = new BlockchainError(message);
      
      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(BlockchainError);
      expect(error.message).to.equal(message);
      expect(error.code).to.equal(ErrorCodes.NETWORK_ERROR);
      expect(error.context).to.deep.equal({});
      expect(error.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should create base error with custom values', () => {
      const message = 'Test error';
      const code = ErrorCodes.WALLET_ERROR;
      const context = { test: 'value' };
      const error = new BlockchainError(message, code, context);
      
      expect(error.message).to.equal(message);
      expect(error.code).to.equal(code);
      expect(error.context).to.deep.equal(context);
    });

    it('should format error message correctly', () => {
      const message = 'Test error';
      const error = new BlockchainError(message);
      
      expect(error.toString()).to.equal(`BlockchainError [${ErrorCodes.NETWORK_ERROR}]: ${message}`);
    });

    it('should serialize to JSON correctly', () => {
      const message = 'Test error';
      const context = { test: 'value' };
      const error = new BlockchainError(message, ErrorCodes.NETWORK_ERROR, context);
      const json = error.toJSON();
      
      expect(json).to.have.property('name', 'BlockchainError');
      expect(json).to.have.property('code', ErrorCodes.NETWORK_ERROR);
      expect(json).to.have.property('message', message);
      expect(json).to.have.property('context').that.deep.equals(context);
      expect(json).to.have.property('stack').that.is.a('string');
      expect(json).to.have.property('timestamp').that.matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Specific Error Classes', () => {
    const testCases = [
      { ErrorClass: NetworkError, code: ErrorCodes.NETWORK_ERROR, name: 'NetworkError' },
      { ErrorClass: WalletError, code: ErrorCodes.WALLET_ERROR, name: 'WalletError' },
      { ErrorClass: ContractError, code: ErrorCodes.CONTRACT_ERROR, name: 'ContractError' },
      { ErrorClass: TransactionError, code: ErrorCodes.TRANSACTION_ERROR, name: 'TransactionError' },
      { ErrorClass: GasError, code: ErrorCodes.GAS_ERROR, name: 'GasError' },
      { ErrorClass: ConfigError, code: ErrorCodes.CONFIG_ERROR, name: 'ConfigError' },
      { ErrorClass: ValidationError, code: ErrorCodes.VALIDATION_ERROR, name: 'ValidationError' },
      { ErrorClass: LoggerError, code: ErrorCodes.LOGGER_ERROR, name: 'LoggerError' }
    ];

    testCases.forEach(({ ErrorClass, code, name }) => {
      describe(name, () => {
        it('should create error with correct properties', () => {
          const message = `Test ${name}`;
          const context = { test: 'value' };
          const error = new ErrorClass(message, context);
          
          expect(error).to.be.instanceOf(BlockchainError);
          expect(error).to.be.instanceOf(ErrorClass);
          expect(error.message).to.equal(message);
          expect(error.code).to.equal(code);
          expect(error.name).to.equal(name);
          expect(error.context).to.deep.equal(context);
        });
      });
    });
  });

  describe('ErrorHandler', () => {
    it('should return original error if it is already a BlockchainError', () => {
      const originalError = new NetworkError('Test error');
      const handledError = ErrorHandler.handle(originalError);
      expect(handledError).to.equal(originalError);
    });

    const testCases = [
      { message: 'network error', ExpectedClass: NetworkError },
      { message: 'wallet error', ExpectedClass: WalletError },
      { message: 'contract error', ExpectedClass: ContractError },
      { message: 'transaction error', ExpectedClass: TransactionError },
      { message: 'gas error', ExpectedClass: GasError },
      { message: 'config error', ExpectedClass: ConfigError },
      { message: 'validation error', ExpectedClass: ValidationError },
      { message: 'logger error', ExpectedClass: LoggerError }
    ];

    testCases.forEach(({ message, ExpectedClass }) => {
      it(`should handle ${ExpectedClass.name} correctly`, () => {
        const error = new Error(message);
        const context = { test: 'value' };
        const handledError = ErrorHandler.handle(error, context);
        
        expect(handledError).to.be.instanceOf(ExpectedClass);
        expect(handledError.message).to.equal(message);
        expect(handledError.context).to.deep.equal(context);
      });
    });

    it('should return BlockchainError for unknown error types', () => {
      const error = new Error('unknown error');
      const context = { test: 'value' };
      const handledError = ErrorHandler.handle(error, context);
      
      expect(handledError).to.be.instanceOf(BlockchainError);
      expect(handledError.code).to.equal(ErrorCodes.NETWORK_ERROR);
      expect(handledError.context).to.deep.equal(context);
    });
  });
}); 