/**
 * 数据查询服务
 */

const { createLogger } = require('../utils/logger');
const models = require('../db/models');

const logger = createLogger('query-service');

/**
 * 获取地址的交易列表
 * @param {string} address 地址
 * @param {Object} options 查询选项
 * @returns {Promise<Object>} 查询结果
 */
async function getAddressTransactions(address, options = {}) {
  try {
    // 检查地址是否存在
    const addressInfo = await models.address.getAddress(address);
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }

    // 获取交易数量
    const count = await models.transaction.getAddressTransactionCount(address);

    // 获取交易列表
    const transactions = await models.transaction.getAddressTransactions(address, options);

    return {
      address,
      count,
      transactions
    };
  } catch (error) {
    logger.error('获取地址交易列表失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取交易详情及其事件
 * @param {string} hash 交易哈希
 * @returns {Promise<Object>} 交易详情及事件
 */
async function getTransactionWithEvents(hash) {
  try {
    // 获取交易详情
    const transaction = await models.transaction.getTransaction(hash);
    if (!transaction) {
      throw new Error(`未找到交易 ${hash}`);
    }

    // 获取交易的事件
    const events = await models.event.getTransactionEvents(hash);

    return {
      transaction,
      events
    };
  } catch (error) {
    logger.error('获取交易详情及事件失败', { hash, error: error.message });
    throw error;
  }
}

/**
 * 获取合约的事件列表
 * @param {string} address 合约地址
 * @param {Object} options 查询选项
 * @returns {Promise<Object>} 查询结果
 */
async function getContractEvents(address, options = {}) {
  try {
    // 检查地址是否存在
    const addressInfo = await models.address.getAddress(address);
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }

    // 检查地址类型
    if (addressInfo.address_type === models.address.ADDRESS_TYPES.EOA) {
      throw new Error(`地址 ${address} 不是合约地址`);
    }

    // 获取合约事件
    const events = await models.event.getContractEvents(address, options);

    return {
      address,
      count: events.length,
      events
    };
  } catch (error) {
    logger.error('获取合约事件列表失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 按事件名称和参数搜索事件
 * @param {string} eventName 事件名称
 * @param {Object} params 事件参数
 * @param {Object} options 查询选项
 * @returns {Promise<Object>} 查询结果
 */
async function searchEvents(eventName, params = {}, options = {}) {
  try {
    // 执行搜索
    const events = await models.event.searchEvents(eventName, params, options);

    return {
      eventName,
      params,
      count: events.length,
      events
    };
  } catch (error) {
    logger.error('搜索事件失败', { eventName, params, error: error.message });
    throw error;
  }
}

/**
 * 获取同步状态
 * @returns {Promise<Array>} 同步状态列表
 */
async function getSyncStatus() {
  try {
    return await models.syncStatus.getAllSyncStatus();
  } catch (error) {
    logger.error('获取同步状态失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取监控的统计信息
 * @returns {Promise<Object>} 统计信息
 */
async function getStatistics() {
  try {
    // 获取地址数量
    const addressQuery = await models.address.getAllAddresses();
    const addressCount = addressQuery.length;
    
    // 按类型统计地址
    const addressTypes = {};
    for (const type of Object.values(models.address.ADDRESS_TYPES)) {
      const addresses = await models.address.getAddressesByType(type);
      addressTypes[type] = addresses.length;
    }

    // 获取交易数量
    const txCountQuery = await models.db.query('SELECT COUNT(*) as count FROM transactions');
    const transactionCount = parseInt(txCountQuery.rows[0].count, 10);

    // 获取事件数量
    const eventCountQuery = await models.db.query('SELECT COUNT(*) as count FROM events');
    const eventCount = parseInt(eventCountQuery.rows[0].count, 10);

    // 获取ABI数量
    const abiCountQuery = await models.db.query('SELECT COUNT(*) as count FROM contract_abis');
    const abiCount = parseInt(abiCountQuery.rows[0].count, 10);

    // 获取最大区块号
    const maxBlockQuery = await models.db.query('SELECT MAX(last_block_number) as max_block FROM sync_status');
    const maxBlock = parseInt(maxBlockQuery.rows[0].max_block || '0', 10);

    return {
      addresses: {
        total: addressCount,
        byType: addressTypes
      },
      transactions: transactionCount,
      events: eventCount,
      abis: abiCount,
      maxBlock
    };
  } catch (error) {
    logger.error('获取统计信息失败', { error: error.message });
    throw error;
  }
}

module.exports = {
  getAddressTransactions,
  getTransactionWithEvents,
  getContractEvents,
  searchEvents,
  getSyncStatus,
  getStatistics
}; 