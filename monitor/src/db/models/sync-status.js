/**
 * 同步状态模型
 */

const db = require('../index');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('sync-status-model');

/**
 * 获取地址的同步状态
 * @param {string} address 地址
 * @returns {Promise<Object|null>} 同步状态
 */
async function getSyncStatus(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const result = await db.query('SELECT * FROM sync_status WHERE address = $1', [
      normalizedAddress
    ]);
    
    return result.rowCount > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('获取同步状态失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 更新地址的同步状态
 * @param {string} address 地址
 * @param {number} lastBlockNumber 最后同步的区块号
 * @param {boolean} isSyncing 是否正在同步
 * @returns {Promise<Object>} 更新后的同步状态
 */
async function updateSyncStatus(address, lastBlockNumber, isSyncing = false) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    // 检查是否存在
    const existingStatus = await getSyncStatus(normalizedAddress);
    
    if (!existingStatus) {
      // 如果不存在，创建新记录
      const result = await db.query(
        `INSERT INTO sync_status (address, last_block_number, last_sync_time, is_syncing)
         VALUES ($1, $2, NOW(), $3)
         RETURNING *`,
        [normalizedAddress, lastBlockNumber, isSyncing]
      );
      
      logger.info('创建同步状态', { 
        address: normalizedAddress,
        lastBlockNumber,
        isSyncing
      });
      
      return result.rows[0];
    }
    
    // 更新现有记录
    const result = await db.query(
      `UPDATE sync_status
       SET last_block_number = $2, last_sync_time = NOW(), is_syncing = $3
       WHERE address = $1
       RETURNING *`,
      [normalizedAddress, lastBlockNumber, isSyncing]
    );
    
    logger.debug('更新同步状态', { 
      address: normalizedAddress,
      lastBlockNumber,
      isSyncing
    });
    
    return result.rows[0];
  } catch (error) {
    logger.error('更新同步状态失败', { 
      address, 
      lastBlockNumber, 
      isSyncing, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * 获取所有需要同步的地址
 * @returns {Promise<Array>} 地址列表
 */
async function getAddressesToSync() {
  try {
    const result = await db.query(`
      SELECT a.address, a.address_type, s.last_block_number
      FROM monitored_addresses a
      LEFT JOIN sync_status s ON a.address = s.address
      WHERE s.is_syncing = false OR s.is_syncing IS NULL
      ORDER BY s.last_sync_time ASC NULLS FIRST
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('获取待同步地址列表失败', { error: error.message });
    throw error;
  }
}

/**
 * 开始同步地址
 * @param {string} address 地址
 * @returns {Promise<boolean>} 是否成功
 */
async function startSync(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const status = await getSyncStatus(normalizedAddress);
    
    if (!status) {
      // 如果不存在，创建新记录
      await db.query(
        `INSERT INTO sync_status (address, last_block_number, last_sync_time, is_syncing)
         VALUES ($1, 0, NOW(), true)`,
        [normalizedAddress]
      );
    } else {
      // 更新现有记录
      await db.query(
        `UPDATE sync_status
         SET is_syncing = true, last_sync_time = NOW()
         WHERE address = $1`,
        [normalizedAddress]
      );
    }
    
    logger.info('开始同步地址', { address: normalizedAddress });
    return true;
  } catch (error) {
    logger.error('开始同步地址失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 结束同步地址
 * @param {string} address 地址
 * @param {number} lastBlockNumber 最后同步的区块号
 * @returns {Promise<boolean>} 是否成功
 */
async function endSync(address, lastBlockNumber) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    await updateSyncStatus(normalizedAddress, lastBlockNumber, false);
    
    logger.info('结束同步地址', { 
      address: normalizedAddress,
      lastBlockNumber
    });
    
    return true;
  } catch (error) {
    logger.error('结束同步地址失败', { address, lastBlockNumber, error: error.message });
    throw error;
  }
}

/**
 * 获取所有的同步状态
 * @returns {Promise<Array>} 同步状态列表
 */
async function getAllSyncStatus() {
  try {
    const result = await db.query(`
      SELECT s.*, a.address_type, a.label
      FROM sync_status s
      JOIN monitored_addresses a ON s.address = a.address
      ORDER BY s.last_sync_time DESC
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('获取所有同步状态失败', { error: error.message });
    throw error;
  }
}

module.exports = {
  getSyncStatus,
  updateSyncStatus,
  getAddressesToSync,
  startSync,
  endSync,
  getAllSyncStatus
}; 