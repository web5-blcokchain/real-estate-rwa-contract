/**
 * 地址模型
 */

const db = require('../index');
const { createLogger } = require('../../utils/logger');
const { isContract } = require('../../utils/blockchain');

const logger = createLogger('address-model');

// 地址类型枚举
const ADDRESS_TYPES = {
  CONTRACT: 'CONTRACT',
  EOA: 'EOA',
  TOKEN_CONTRACT: 'TOKEN_CONTRACT'
};

/**
 * 添加监控地址
 * @param {string} address 地址
 * @param {string} addressType 地址类型 (CONTRACT, EOA, TOKEN_CONTRACT)
 * @param {string} label 地址标签
 * @returns {Promise<Object>} 新增的地址记录
 */
async function addAddress(address, addressType, label = '') {
  try {
    // 验证地址类型
    if (!Object.values(ADDRESS_TYPES).includes(addressType)) {
      throw new Error(`无效的地址类型：${addressType}`);
    }

    // 检查地址格式
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`无效的以太坊地址：${address}`);
    }

    // 如果地址类型是CONTRACT或TOKEN_CONTRACT，验证它确实是合约
    if (
      (addressType === ADDRESS_TYPES.CONTRACT || addressType === ADDRESS_TYPES.TOKEN_CONTRACT) &&
      !(await isContract(address))
    ) {
      throw new Error(`地址 ${address} 不是合约地址`);
    }

    // 如果地址类型是EOA，验证它不是合约
    if (addressType === ADDRESS_TYPES.EOA && (await isContract(address))) {
      throw new Error(`地址 ${address} 不是EOA地址`);
    }

    // 将地址转为小写
    const normalizedAddress = address.toLowerCase();

    // 检查地址是否已存在
    const checkResult = await db.query(
      'SELECT * FROM monitored_addresses WHERE address = $1',
      [normalizedAddress]
    );

    // 如果已存在，返回现有记录
    if (checkResult.rowCount > 0) {
      logger.info('地址已存在于监控列表中', { address: normalizedAddress });
      return checkResult.rows[0];
    }

    // 添加新地址
    const result = await db.query(
      `INSERT INTO monitored_addresses (address, address_type, label)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [normalizedAddress, addressType, label]
    );

    // 初始化同步状态
    await db.query(
      `INSERT INTO sync_status (address, last_block_number, last_sync_time)
       VALUES ($1, 0, NOW())`,
      [normalizedAddress]
    );

    logger.info('成功添加监控地址', { address: normalizedAddress, type: addressType });
    return result.rows[0];
  } catch (error) {
    logger.error('添加监控地址失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取所有监控地址
 * @returns {Promise<Array>} 地址列表
 */
async function getAllAddresses() {
  try {
    const result = await db.query('SELECT * FROM monitored_addresses ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    logger.error('获取监控地址列表失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取指定类型的监控地址
 * @param {string} addressType 地址类型
 * @returns {Promise<Array>} 地址列表
 */
async function getAddressesByType(addressType) {
  try {
    const result = await db.query(
      'SELECT * FROM monitored_addresses WHERE address_type = $1 ORDER BY created_at DESC',
      [addressType]
    );
    return result.rows;
  } catch (error) {
    logger.error('获取监控地址列表失败', { addressType, error: error.message });
    throw error;
  }
}

/**
 * 获取单个监控地址
 * @param {string} address 地址
 * @returns {Promise<Object>} 地址记录
 */
async function getAddress(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const result = await db.query('SELECT * FROM monitored_addresses WHERE address = $1', [
      normalizedAddress
    ]);
    return result.rowCount > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('获取监控地址失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 更新地址信息
 * @param {string} address 地址
 * @param {Object} data 更新数据
 * @returns {Promise<Object>} 更新后的地址记录
 */
async function updateAddress(address, data) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    // 构建更新SQL
    let updates = [];
    let params = [normalizedAddress];
    let counter = 2;
    
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'address' && key !== 'id') {
        updates.push(`${key} = $${counter}`);
        params.push(value);
        counter++;
      }
    }
    
    // 添加updated_at字段
    updates.push('updated_at = NOW()');
    
    if (updates.length === 0) {
      throw new Error('没有提供要更新的字段');
    }
    
    const sql = `
      UPDATE monitored_addresses 
      SET ${updates.join(', ')} 
      WHERE address = $1 
      RETURNING *
    `;
    
    const result = await db.query(sql, params);
    
    if (result.rowCount === 0) {
      throw new Error(`地址 ${address} 不存在`);
    }
    
    logger.info('更新地址信息成功', { address: normalizedAddress });
    return result.rows[0];
  } catch (error) {
    logger.error('更新地址信息失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 删除监控地址
 * @param {string} address 地址
 * @returns {Promise<boolean>} 是否成功
 */
async function removeAddress(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    
    // 删除同步状态
    await db.query('DELETE FROM sync_status WHERE address = $1', [normalizedAddress]);
    
    // 删除地址
    const result = await db.query('DELETE FROM monitored_addresses WHERE address = $1', [
      normalizedAddress
    ]);
    
    logger.info('删除监控地址成功', { address: normalizedAddress, deleted: result.rowCount > 0 });
    return result.rowCount > 0;
  } catch (error) {
    logger.error('删除监控地址失败', { address, error: error.message });
    throw error;
  }
}

module.exports = {
  ADDRESS_TYPES,
  addAddress,
  getAllAddresses,
  getAddressesByType,
  getAddress,
  updateAddress,
  removeAddress
}; 