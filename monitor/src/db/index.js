/**
 * 数据库连接和初始化
 */

const { Client } = require('pg');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const logger = createLogger('database');

// 创建数据库客户端
let client = null;

/**
 * 初始化数据库连接
 */
async function initDatabase() {
  try {
    client = new Client(config.database);
    await client.connect();
    logger.info('数据库连接成功');
    
    // 初始化数据库结构
    await createTablesIfNotExist();
    
    return client;
  } catch (error) {
    logger.error('数据库连接失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
async function closeDatabase() {
  if (client) {
    await client.end();
    logger.info('数据库连接已关闭');
    client = null;
  }
}

/**
 * 创建所需的数据表
 */
async function createTablesIfNotExist() {
  try {
    // 创建监控地址表
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitored_addresses (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL,
        address_type VARCHAR(20) NOT NULL,
        label TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(address)
      );
    `);

    // 创建合约ABI表
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_abis (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL,
        abi JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(address)
      );
    `);

    // 创建交易表
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        block_hash VARCHAR(66) NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42),
        value TEXT NOT NULL,
        gas BIGINT NOT NULL,
        gas_price BIGINT NOT NULL,
        nonce INTEGER NOT NULL,
        data TEXT,
        timestamp TIMESTAMP,
        transaction_index INTEGER NOT NULL,
        status BOOLEAN,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(hash)
      );
    `);

    // 创建事件表
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        event_signature VARCHAR(66) NOT NULL,
        log_index INTEGER NOT NULL,
        parameters JSONB,
        timestamp TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(transaction_hash, log_index)
      );
    `);

    // 创建同步状态表
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL,
        last_block_number BIGINT NOT NULL DEFAULT 0,
        last_sync_time TIMESTAMP NOT NULL DEFAULT NOW(),
        is_syncing BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE(address)
      );
    `);

    logger.info('所有数据表创建完成');
  } catch (error) {
    logger.error('创建数据表失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 执行SQL查询
 * @param {string} text SQL语句
 * @param {Array} params 参数
 * @returns {Promise<Object>} 查询结果
 */
async function query(text, params) {
  if (!client) {
    throw new Error('数据库未初始化');
  }
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    logger.debug('执行查询', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('查询执行失败', { text, error: error.message });
    throw error;
  }
}

module.exports = {
  initDatabase,
  closeDatabase,
  query
}; 