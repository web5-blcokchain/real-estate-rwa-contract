/**
 * 合约ABI模型
 */

const db = require('../index');
const { createLogger } = require('../../utils/logger');
const { isContract } = require('../../utils/blockchain');

const logger = createLogger('contract-abi-model');

/**
 * 保存合约ABI
 * @param {string} address 合约地址
 * @param {Array|Object} abi 合约ABI
 * @returns {Promise<Object>} 保存结果
 */
async function saveContractAbi(address, abi) {
  try {
    // 检查地址是否为合约
    if (!(await isContract(address))) {
      throw new Error(`地址 ${address} 不是合约地址`);
    }

    // 检查ABI格式
    if (!abi || (typeof abi !== 'object' && !Array.isArray(abi))) {
      throw new Error('无效的ABI格式');
    }

    // 统一将地址转为小写
    const normalizedAddress = address.toLowerCase();

    // 检查是否已存在
    const checkResult = await db.query('SELECT * FROM contract_abis WHERE address = $1', [
      normalizedAddress
    ]);

    // 如果已存在，更新记录
    if (checkResult.rowCount > 0) {
      const result = await db.query(
        `UPDATE contract_abis
         SET abi = $2, updated_at = NOW()
         WHERE address = $1
         RETURNING *`,
        [normalizedAddress, JSON.stringify(abi)]
      );
      logger.info('更新合约ABI', { address: normalizedAddress });
      return result.rows[0];
    }

    // 添加新记录
    const result = await db.query(
      `INSERT INTO contract_abis (address, abi)
       VALUES ($1, $2)
       RETURNING *`,
      [normalizedAddress, JSON.stringify(abi)]
    );

    logger.info('保存合约ABI', { address: normalizedAddress });
    return result.rows[0];
  } catch (error) {
    logger.error('保存合约ABI失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取合约ABI
 * @param {string} address 合约地址
 * @returns {Promise<Array|null>} 合约ABI或null
 */
async function getContractAbi(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const result = await db.query('SELECT * FROM contract_abis WHERE address = $1', [
      normalizedAddress
    ]);
    
    if (result.rowCount === 0) {
      logger.warn('未找到合约ABI', { address: normalizedAddress });
      return null;
    }
    
    return result.rows[0].abi;
  } catch (error) {
    logger.error('获取合约ABI失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 删除合约ABI
 * @param {string} address 合约地址
 * @returns {Promise<boolean>} 是否成功
 */
async function deleteContractAbi(address) {
  try {
    const normalizedAddress = address.toLowerCase();
    const result = await db.query('DELETE FROM contract_abis WHERE address = $1', [
      normalizedAddress
    ]);
    
    logger.info('删除合约ABI', { address: normalizedAddress, deleted: result.rowCount > 0 });
    return result.rowCount > 0;
  } catch (error) {
    logger.error('删除合约ABI失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取所有合约ABI
 * @returns {Promise<Array>} 合约ABI列表
 */
async function getAllContractAbis() {
  try {
    const result = await db.query('SELECT * FROM contract_abis ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    logger.error('获取所有合约ABI失败', { error: error.message });
    throw error;
  }
}

module.exports = {
  saveContractAbi,
  getContractAbi,
  deleteContractAbi,
  getAllContractAbis
}; 