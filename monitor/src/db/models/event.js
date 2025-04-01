/**
 * 事件模型
 */

const db = require('../index');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('event-model');

/**
 * 保存事件信息
 * @param {Object} event 事件信息
 * @returns {Promise<Object>} 保存结果
 */
async function saveEvent(event) {
  try {
    // 验证必要字段
    const requiredFields = ['blockNumber', 'transactionHash', 'address', 'logIndex'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
    }

    // 检查事件是否已存在
    const existingEvent = await db.query(
      'SELECT * FROM events WHERE transaction_hash = $1 AND log_index = $2',
      [event.transactionHash, event.logIndex]
    );
    
    if (existingEvent.rowCount > 0) {
      logger.debug('事件已存在', { 
        transactionHash: event.transactionHash,
        logIndex: event.logIndex 
      });
      return existingEvent.rows[0];
    }

    // 准备事件数据
    const eventData = {
      block_number: BigInt(event.blockNumber),
      transaction_hash: event.transactionHash,
      contract_address: event.address.toLowerCase(),
      event_name: event.name || 'Unknown',
      event_signature: event.signature || event.topics?.[0] || '0x',
      log_index: event.logIndex,
      parameters: event.args || {},
      timestamp: event.timestamp ? new Date(event.timestamp * 1000) : null
    };

    // 插入数据
    const result = await db.query(
      `INSERT INTO events (
        block_number, transaction_hash, contract_address,
        event_name, event_signature, log_index, 
        parameters, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        eventData.block_number,
        eventData.transaction_hash,
        eventData.contract_address,
        eventData.event_name,
        eventData.event_signature,
        eventData.log_index,
        JSON.stringify(eventData.parameters),
        eventData.timestamp
      ]
    );

    logger.debug('保存事件信息', { 
      transactionHash: event.transactionHash,
      name: eventData.event_name,
      logIndex: event.logIndex 
    });
    return result.rows[0];
  } catch (error) {
    logger.error('保存事件信息失败', { 
      transactionHash: event?.transactionHash,
      logIndex: event?.logIndex,
      error: error.message 
    });
    throw error;
  }
}

/**
 * 批量保存事件信息
 * @param {Array<Object>} events 事件信息数组
 * @returns {Promise<Array>} 保存结果
 */
async function bulkSaveEvents(events) {
  try {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const results = [];
    
    // 使用事务进行批量插入
    await db.query('BEGIN');

    try {
      for (const event of events) {
        const result = await saveEvent(event);
        results.push(result);
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    logger.info('批量保存事件信息', { count: results.length });
    return results;
  } catch (error) {
    logger.error('批量保存事件信息失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取合约的事件列表
 * @param {string} contractAddress 合约地址
 * @param {Object} options 选项
 * @param {number} options.limit 限制数量
 * @param {number} options.offset 偏移量
 * @param {string} options.eventName 事件名称
 * @returns {Promise<Array>} 事件列表
 */
async function getContractEvents(contractAddress, options = {}) {
  try {
    const normalizedAddress = contractAddress.toLowerCase();
    const {
      limit = 100,
      offset = 0,
      eventName = null
    } = options;

    let query = 'SELECT * FROM events WHERE contract_address = $1';
    let params = [normalizedAddress];

    if (eventName) {
      query += ' AND event_name = $2';
      params.push(eventName);
    }

    query += ' ORDER BY block_number DESC, log_index ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('获取合约事件列表失败', { contractAddress, error: error.message });
    throw error;
  }
}

/**
 * 获取交易的事件列表
 * @param {string} transactionHash 交易哈希
 * @returns {Promise<Array>} 事件列表
 */
async function getTransactionEvents(transactionHash) {
  try {
    const result = await db.query(
      'SELECT * FROM events WHERE transaction_hash = $1 ORDER BY log_index ASC',
      [transactionHash]
    );
    return result.rows;
  } catch (error) {
    logger.error('获取交易事件列表失败', { transactionHash, error: error.message });
    throw error;
  }
}

/**
 * 获取区块的事件列表
 * @param {number} blockNumber 区块号
 * @returns {Promise<Array>} 事件列表
 */
async function getBlockEvents(blockNumber) {
  try {
    const result = await db.query(
      'SELECT * FROM events WHERE block_number = $1 ORDER BY log_index ASC',
      [blockNumber]
    );
    return result.rows;
  } catch (error) {
    logger.error('获取区块事件列表失败', { blockNumber, error: error.message });
    throw error;
  }
}

/**
 * 根据事件名称和参数查询事件
 * @param {string} eventName 事件名称
 * @param {Object} params 查询参数
 * @param {Object} options 选项
 * @returns {Promise<Array>} 事件列表
 */
async function searchEvents(eventName, params = {}, options = {}) {
  try {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'block_number',
      order = 'DESC'
    } = options;

    // 构建查询条件
    const conditions = ['event_name = $1'];
    const queryParams = [eventName];
    let paramIndex = 2;

    // 添加参数过滤条件
    for (const [key, value] of Object.entries(params)) {
      conditions.push(`parameters->>'${key}' = $${paramIndex}`);
      queryParams.push(value.toString());
      paramIndex++;
    }

    // 验证排序参数
    const validOrderByFields = ['block_number', 'timestamp', 'log_index'];
    const validOrderDirections = ['ASC', 'DESC'];
    
    const safeOrderBy = validOrderByFields.includes(orderBy) ? orderBy : 'block_number';
    const safeOrder = validOrderDirections.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    // 构建最终查询
    const query = `
      SELECT * FROM events
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${safeOrderBy} ${safeOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);
    return result.rows;
  } catch (error) {
    logger.error('搜索事件失败', { eventName, params, error: error.message });
    throw error;
  }
}

module.exports = {
  saveEvent,
  bulkSaveEvents,
  getContractEvents,
  getTransactionEvents,
  getBlockEvents,
  searchEvents
}; 