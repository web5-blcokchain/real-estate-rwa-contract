const { getNetworkConfigPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 获取网络常量
 * @param {string} network 网络名称
 * @returns {Object} 网络常量
 */
function getNetworkConstants(network) {
  try {
    const configPath = getNetworkConfigPath(network);
    if (!validatePath(configPath)) {
      throw new Error(`Network configuration not found for network: ${network}`);
    }

    const config = require(configPath);
    return {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      explorerUrl: config.explorerUrl,
      nativeCurrency: config.nativeCurrency
    };
  } catch (error) {
    logger.error(`Failed to get network constants for network ${network}:`, error);
    throw error;
  }
}

/**
 * 获取合约常量
 * @param {string} contractName 合约名称
 * @returns {Object} 合约常量
 */
function getContractConstants(contractName) {
  try {
    const configPath = getNetworkConfigPath(contractName);
    if (!validatePath(configPath)) {
      throw new Error(`Contract configuration not found for contract: ${contractName}`);
    }

    const config = require(configPath);
    return {
      address: config.address,
      abi: config.abi,
      bytecode: config.bytecode
    };
  } catch (error) {
    logger.error(`Failed to get contract constants for contract ${contractName}:`, error);
    throw error;
  }
}

/**
 * 获取角色常量
 * @returns {Object} 角色常量
 */
function getRoleConstants() {
  return {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    USER: 'user'
  };
}

/**
 * 获取状态常量
 * @returns {Object} 状态常量
 */
function getStatusConstants() {
  return {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ACTIVE: 'active',
    INACTIVE: 'inactive'
  };
}

/**
 * 获取事件常量
 * @returns {Object} 事件常量
 */
function getEventConstants() {
  return {
    PROPERTY_REGISTERED: 'PropertyRegistered',
    PROPERTY_APPROVED: 'PropertyApproved',
    PROPERTY_REJECTED: 'PropertyRejected',
    TOKEN_CREATED: 'TokenCreated',
    TOKEN_TRANSFERRED: 'TokenTransferred',
    WHITELIST_ADDED: 'WhitelistAdded',
    WHITELIST_REMOVED: 'WhitelistRemoved'
  };
}

/**
 * 角色常量
 */
const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  USER: 'user'
};

/**
 * 合约名称常量
 */
const CONTRACTS = {
  PROPERTY_REGISTRY: 'PropertyRegistry',
  TOKEN_FACTORY: 'TokenFactory',
  REAL_ESTATE_TOKEN: 'RealEstateToken'
};

/**
 * 事件名称常量
 */
const EVENTS = {
  TEST_COMPLETED: 'test_completed',
  TEST_FAILED: 'test_failed',
  PROPERTY_REGISTERED: 'property_registered',
  PROPERTY_APPROVED: 'property_approved',
  TOKEN_CREATED: 'token_created',
  TOKEN_TRANSFERRED: 'token_transferred',
  USER_WHITELISTED: 'user_whitelisted'
};

/**
 * 指标名称常量
 */
const METRICS = {
  PROPERTY_FLOW_DURATION: 'property_flow_duration',
  PROPERTY_FLOW_SUCCESS: 'property_flow_success',
  TOKEN_FLOW_DURATION: 'token_flow_duration',
  TOKEN_FLOW_SUCCESS: 'token_flow_success',
  USER_FLOW_DURATION: 'user_flow_duration',
  USER_FLOW_SUCCESS: 'user_flow_success'
};

/**
 * 测试数据默认值
 */
const TEST_DATA = {
  PROPERTY: {
    LOCATION: 'Tokyo, Japan',
    PRICE: 1000000,
    SIZE: 100,
    DESCRIPTION: 'Test property description',
    FEATURES: ['parking', 'elevator'],
    IMAGES: ['test-image-1.jpg', 'test-image-2.jpg'],
    DOCUMENTS: ['test-document-1.pdf'],
    STATUS: 'active'
  },
  TOKEN: {
    SYMBOL: 'TEST',
    DECIMALS: 18,
    TOTAL_SUPPLY: 1000000,
    PRICE: 1,
    STATUS: 'active'
  },
  USER: {
    ROLE: 'user',
    STATUS: 'active'
  }
};

/**
 * 转账金额常量
 */
const TRANSFER_AMOUNTS = {
  INITIAL: 100,
  USER_TRANSFER: 50
};

/**
 * 错误代码常量
 */
const ERROR_CODES = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DEPLOYMENT_ERROR: 'DEPLOYMENT_ERROR',
  TEST_ERROR: 'TEST_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

module.exports = {
  getNetworkConstants,
  getContractConstants,
  getRoleConstants,
  getStatusConstants,
  getEventConstants,
  ROLES,
  CONTRACTS,
  EVENTS,
  METRICS,
  TEST_DATA,
  TRANSFER_AMOUNTS,
  ERROR_CODES
}; 