/**
 * 交易模型
 */

const db = require('../index');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('transaction-model');

/**
 * 保存交易信息
 * @param {Object} transaction 交易信息
 * @returns {Promise<Object>} 保存结果
 */
async function saveTransaction(transaction) {
  try {
    // 验证必要字段
    const requiredFields = ['hash', 'blockNumber', 'blockHash', 'from'];
    const missingFields = requiredFields.filter(field => !transaction[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
    }

    // 检查交易是否已存在
    const existingTx = await db.query('SELECT * FROM transactions WHERE hash = $1', [
      transaction.hash
    ]);
    
    if (existingTx.rowCount > 0) {
      logger.debug('交易已存在', { hash: transaction.hash });
      return existingTx.rows[0];
    }

    // 准备交易数据
    const txData = {
      hash: transaction.hash,
      block_number: BigInt(transaction.blockNumber),
      block_hash: transaction.blockHash,
      from_address: transaction.from.toLowerCase(),
      to_address: transaction.to ? transaction.to.toLowerCase() : null,
      value: transaction.value?.toString() || '0',
      gas: BigInt(transaction.gasLimit || transaction.gas || 0),
      gas_price: BigInt(transaction.gasPrice || 0),
      nonce: transaction.nonce || 0,
      data: transaction.data || '0x',
      timestamp: transaction.timestamp ? new Date(transaction.timestamp * 1000) : null,
      transaction_index: transaction.transactionIndex || 0,
      status: transaction.status !== undefined ? (transaction.status === 1 || transaction.status === true) : null
    };

    // 插入数据
    const result = await db.query(
      `INSERT INTO transactions (
        hash, block_number, block_hash, from_address, to_address,
        value, gas, gas_price, nonce, data, timestamp,
        transaction_index, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        txData.hash,
        txData.block_number,
        txData.block_hash,
        txData.from_address,
        txData.to_address,
        txData.value,
        txData.gas,
        txData.gas_price,
        txData.nonce,
        txData.data,
        txData.timestamp,
        txData.transaction_index,
        txData.status
      ]
    );

    logger.debug('保存交易信息', { hash: transaction.hash });
    return result.rows[0];
  } catch (error) {
    logger.error('保存交易信息失败', { hash: transaction?.hash, error: error.message });
    throw error;
  }
}

/**
 * 批量保存交易信息
 * @param {Array<Object>} transactions 交易信息数组
 * @returns {Promise<Array>} 保存结果
 */
async function bulkSaveTransactions(transactions) {
  try {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }

    const results = [];
    // 使用事务进行批量插入
    await db.query('BEGIN');

    try {
      for (const tx of transactions) {
        const result = await saveTransaction(tx);
        results.push(result);
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    logger.info('批量保存交易信息', { count: results.length });
    return results;
  } catch (error) {
    logger.error('批量保存交易信息失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取交易信息
 * @param {string} hash 交易哈希
 * @returns {Promise<Object|null>} 交易信息
 */
async function getTransaction(hash) {
  try {
    const result = await db.query('SELECT * FROM transactions WHERE hash = $1', [hash]);
    return result.rowCount > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('获取交易信息失败', { hash, error: error.message });
    throw error;
  }
}

/**
 * 获取地址的交易列表
 * @param {string} address 地址
 * @param {Object} options 选项
 * @param {number} options.limit 限制数量
 * @param {number} options.offset 偏移量
 * @param {string} options.orderBy 排序字段
 * @param {string} options.order 排序方式
 * @returns {Promise<Array>} 交易列表
 */
async function getAddressTransactions(address, options = {}) {
  try {
    const normalizedAddress = address.toLowerCase();
    const {
      limit = 100,
      offset = 0,
      orderBy = 'block_number',
      order = 'DESC'
    } = options;

    // 验证排序参数
    const validOrderByFields = ['block_number', 'timestamp', 'value'];
    const validOrderDirections = ['ASC', 'DESC'];
    
    const safeOrderBy = validOrderByFields.includes(orderBy) ? orderBy : 'block_number';
    const safeOrder = validOrderDirections.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const result = await db.query(
      `SELECT * FROM transactions
       WHERE from_address = $1 OR to_address = $1
       ORDER BY ${safeOrderBy} ${safeOrder}
       LIMIT $2 OFFSET $3`,
      [normalizedAddress, limit, offset]
    );

    return result.rows;
  } catch (error) {
    logger.error('获取地址交易列表失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取地址的交易数量
 * @param {string} address 地址
 * @returns {Promise<number>} 交易数量
 */
async function getAddressTransactionCount(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const result = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE from_address = $1 OR to_address = $1',
      [normalizedAddress]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('获取地址交易数量失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取区块中的交易列表
 * @param {number} blockNumber 区块号
 * @returns {Promise<Array>} 交易列表
 */
async function getBlockTransactions(blockNumber) {
  try {
    const result = await db.query(
      'SELECT * FROM transactions WHERE block_number = $1 ORDER BY transaction_index ASC',
      [blockNumber]
    );
    return result.rows;
  } catch (error) {
    logger.error('获取区块交易列表失败', { blockNumber, error: error.message });
    throw error;
  }
}

module.exports = {
  saveTransaction,
  bulkSaveTransactions,
  getTransaction,
  getAddressTransactions,
  getAddressTransactionCount,
  getBlockTransactions
}; 