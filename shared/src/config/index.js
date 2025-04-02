const config = {
  network: {
    get: (key) => {
      const values = {
        type: 'testnet',
        rpcUrl: 'http://localhost:8545',
        chainId: 31337
      };
      return values[key];
    }
  },
  gas: {
    get: (key) => {
      const values = {
        maxPriorityFeePerGas: '1000000000',
        maxFeePerGas: '20000000000',
        gasLimitBuffer: 1.1
      };
      return values[key];
    }
  },
  transaction: {
    get: (key) => {
      const values = {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
      };
      return values[key];
    }
  },
  event: {
    get: (key) => {
      const values = {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 100
      };
      return values[key];
    }
  },
  contract: {
    get: (key) => {
      const values = {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
      };
      return values[key];
    }
  },
  wallet: {
    get: (key) => {
      const values = {
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        password: 'testpassword'
      };
      return values[key];
    }
  },
  get: (key) => {
    const [section, property] = key.split('.');
    return config[section].get(property);
  }
};

// 直接导出config对象
module.exports = config; 