const { expect } = require('chai');
const Validation = require('../../src/utils/validation');
const { ValidationError } = require('../../src/utils/errors');

describe('Validation', () => {
  describe('isValidAddress', () => {
    it('should validate correct Ethereum address', () => {
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000000'
      ];

      validAddresses.forEach(address => {
        expect(Validation.isValidAddress(address)).to.be.true;
      });
    });

    it('should reject invalid Ethereum address', () => {
      const invalidAddresses = [
        '0x123', // too short
        '0x1234567890123456789012345678901234567890123456789012345678901234', // too long
        '0x123456789012345678901234567890123456789g', // invalid character
        '1234567890123456789012345678901234567890', // missing 0x prefix
        '' // empty string
      ];

      invalidAddresses.forEach(address => {
        expect(Validation.isValidAddress(address)).to.be.false;
      });
    });
  });

  describe('isValidPrivateKey', () => {
    it('should validate correct private key', () => {
      const validPrivateKeys = [
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ];

      validPrivateKeys.forEach(privateKey => {
        expect(Validation.isValidPrivateKey(privateKey)).to.be.true;
      });
    });

    it('should reject invalid private key', () => {
      const invalidPrivateKeys = [
        '0x123', // too short
        '0x12345678901234567890123456789012345678901234567890123456789012345', // too long
        '0x123456789012345678901234567890123456789012345678901234567890123g', // invalid character
        '1234567890123456789012345678901234567890123456789012345678901234', // missing 0x prefix
        '' // empty string
      ];

      invalidPrivateKeys.forEach(privateKey => {
        expect(Validation.isValidPrivateKey(privateKey)).to.be.false;
      });
    });
  });

  describe('isValidTransactionHash', () => {
    it('should validate correct transaction hash', () => {
      const validHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      expect(Validation.isValidTransactionHash(validHash)).to.be.true;
    });

    it('should reject invalid transaction hash', () => {
      const invalidHashes = [
        '1234567890123456789012345678901234567890123456789012345678901234', // missing 0x
        '0x12345678901234567890123456789012345678901234567890123456789012', // too short
        '0x123456789012345678901234567890123456789012345678901234567890123g', // invalid character
        '', // empty string
        null, // null
        undefined, // undefined
        123 // number
      ];

      invalidHashes.forEach(hash => {
        expect(Validation.isValidTransactionHash(hash)).to.be.false;
      });
    });
  });

  describe('isValidBlockNumber', () => {
    it('should validate correct block numbers', () => {
      const validNumbers = [
        0,
        1,
        1000000,
        '0',
        '1',
        '1000000'
      ];

      validNumbers.forEach(number => {
        expect(Validation.isValidBlockNumber(number)).to.be.true;
      });
    });

    it('should reject invalid block numbers', () => {
      const invalidNumbers = [
        -1, // negative
        'abc', // non-numeric string
        '1.5', // decimal string
        null, // null
        undefined, // undefined
        {}, // object
        [], // array
        1.5 // decimal
      ];

      invalidNumbers.forEach(number => {
        expect(Validation.isValidBlockNumber(number)).to.be.false;
      });
    });
  });

  describe('isValidAmount', () => {
    it('should validate correct amounts', () => {
      const validAmounts = [
        '0.1',
        '1.0',
        '100.0',
        '0.000000000000000001',
        '1000000000000000000'
      ];

      validAmounts.forEach(amount => {
        expect(Validation.isValidAmount(amount)).to.be.true;
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = [
        '-1.0', // negative
        'abc', // non-numeric
        '1.0.0', // multiple decimal points
        '0.0000000000000000001', // too many decimal places
        '' // empty string
      ];

      invalidAmounts.forEach(amount => {
        expect(Validation.isValidAmount(amount)).to.be.false;
      });
    });
  });

  describe('isValidGasPrice', () => {
    it('should validate correct gas prices', () => {
      const validPrices = [
        1,
        1000000,
        '1',
        '1000000',
        '0.1',
        '1.23'
      ];

      validPrices.forEach(price => {
        expect(Validation.isValidGasPrice(price)).to.be.true;
      });
    });

    it('should reject invalid gas prices', () => {
      const invalidPrices = [
        0, // zero
        -1, // negative number
        '0', // zero string
        '-1', // negative string
        'abc', // non-numeric string
        '1.2.3', // multiple decimals
        '', // empty string
        null, // null
        undefined, // undefined
        {}, // object
        [] // array
      ];

      invalidPrices.forEach(price => {
        expect(Validation.isValidGasPrice(price)).to.be.false;
      });
    });
  });

  describe('isValidGasLimit', () => {
    it('should validate correct gas limits', () => {
      const validLimits = [
        1,
        1000000,
        '1',
        '1000000'
      ];

      validLimits.forEach(limit => {
        expect(Validation.isValidGasLimit(limit)).to.be.true;
      });
    });

    it('should reject invalid gas limits', () => {
      const invalidLimits = [
        0, // zero
        -1, // negative number
        '0', // zero string
        '-1', // negative string
        'abc', // non-numeric string
        '1.2', // decimal
        '', // empty string
        null, // null
        undefined, // undefined
        {}, // object
        [] // array
      ];

      invalidLimits.forEach(limit => {
        expect(Validation.isValidGasLimit(limit)).to.be.false;
      });
    });
  });

  describe('isValidNetworkType', () => {
    it('should validate correct network types', () => {
      const validTypes = ['mainnet', 'testnet', 'local'];
      validTypes.forEach(type => {
        expect(Validation.isValidNetworkType(type)).to.be.true;
      });
    });

    it('should reject invalid network types', () => {
      const invalidTypes = [
        'invalid',
        '',
        null,
        undefined,
        123,
        {},
        []
      ];

      invalidTypes.forEach(type => {
        expect(Validation.isValidNetworkType(type)).to.be.false;
      });
    });
  });

  describe('isValidContractName', () => {
    it('should validate correct contract names', () => {
      const validNames = [
        'Contract',
        'MyContract',
        'Contract_1',
        'Contract_Test'
      ];

      validNames.forEach(name => {
        expect(Validation.isValidContractName(name)).to.be.true;
      });
    });

    it('should reject invalid contract names', () => {
      const invalidNames = [
        '',
        null,
        undefined,
        123,
        {},
        []
      ];

      invalidNames.forEach(name => {
        expect(Validation.isValidContractName(name)).to.be.false;
      });
    });
  });

  describe('isValidEventName', () => {
    it('should validate correct event names', () => {
      const validNames = [
        'Transfer',
        'Approval',
        'CustomEvent',
        'Event_1'
      ];

      validNames.forEach(name => {
        expect(Validation.isValidEventName(name)).to.be.true;
      });
    });

    it('should reject invalid event names', () => {
      const invalidNames = [
        '',
        null,
        undefined,
        123,
        {},
        []
      ];

      invalidNames.forEach(name => {
        expect(Validation.isValidEventName(name)).to.be.false;
      });
    });
  });

  describe('isValidTransaction', () => {
    it('should validate correct transaction objects', () => {
      const validTransactions = [
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x1234567890123456789012345678901234567890',
          value: '0.1',
          data: '0x'
        },
        {
          from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          value: '1.0',
          data: '0x1234'
        }
      ];

      validTransactions.forEach(tx => {
        expect(Validation.isValidTransaction(tx)).to.be.true;
      });
    });

    it('should reject invalid transaction objects', () => {
      const invalidTransactions = [
        {
          from: '0x123', // invalid from address
          to: '0x1234567890123456789012345678901234567890',
          value: '0.1',
          data: '0x'
        },
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x123', // invalid to address
          value: '0.1',
          data: '0x'
        },
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x1234567890123456789012345678901234567890',
          value: '-1.0', // invalid amount
          data: '0x'
        },
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x1234567890123456789012345678901234567890',
          value: '0.1',
          data: 'invalid' // invalid data
        },
        {} // empty object
      ];

      invalidTransactions.forEach(tx => {
        expect(Validation.isValidTransaction(tx)).to.be.false;
      });
    });
  });

  describe('validate', () => {
    it('should not throw error for true condition', () => {
      expect(() => Validation.validate(true, 'test')).to.not.throw();
    });

    it('should throw ValidationError for false condition', () => {
      expect(() => Validation.validate(false, 'test')).to.throw(ValidationError);
    });

    it('should include error message in thrown error', () => {
      try {
        Validation.validate(false, 'test message');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('test message');
      }
    });
  });
}); 