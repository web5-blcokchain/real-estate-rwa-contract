/**
 * 地址管理服务
 */

const { ethers } = require('ethers');
const { createLogger } = require('../utils/logger');
const blockchain = require('../utils/blockchain');
const models = require('../db/models');

const logger = createLogger('address-service');

/**
 * 添加监控地址
 * @param {string} address 地址
 * @param {string} type 地址类型，可选值：EOA, CONTRACT, TOKEN_CONTRACT
 * @param {string} label 地址标签
 * @returns {Promise<Object>} 添加结果
 */
async function addAddress(address, type, label) {
  try {
    // 验证地址格式
    if (!ethers.isAddress(address)) {
      throw new Error(`无效的以太坊地址：${address}`);
    }

    // 验证地址类型
    if (!Object.values(models.address.ADDRESS_TYPES).includes(type)) {
      throw new Error(`无效的地址类型：${type}，可选值：${Object.values(models.address.ADDRESS_TYPES).join(', ')}`);
    }

    // 检查是否是合约
    const isContract = await blockchain.isContract(address);

    // 类型验证
    if ((type === models.address.ADDRESS_TYPES.CONTRACT || type === models.address.ADDRESS_TYPES.TOKEN_CONTRACT) && !isContract) {
      throw new Error(`地址 ${address} 不是合约地址`);
    }

    if (type === models.address.ADDRESS_TYPES.EOA && isContract) {
      throw new Error(`地址 ${address} 不是EOA地址`);
    }

    // 添加到监控列表
    const result = await models.address.addAddress(address, type, label);

    logger.info('成功添加监控地址', { 
      address,
      type,
      label
    });

    return {
      success: true,
      address: result.address,
      type: result.address_type,
      label: result.label
    };
  } catch (error) {
    logger.error('添加监控地址失败', { address, type, error: error.message });
    throw error;
  }
}

/**
 * 删除监控地址
 * @param {string} address 地址
 * @returns {Promise<Object>} 删除结果
 */
async function removeAddress(address) {
  try {
    // 验证地址格式
    if (!ethers.isAddress(address)) {
      throw new Error(`无效的以太坊地址：${address}`);
    }

    // 检查地址是否存在
    const addressInfo = await models.address.getAddress(address);
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }

    // 删除地址
    const result = await models.address.removeAddress(address);

    logger.info('成功删除监控地址', { address });

    return {
      success: result,
      address
    };
  } catch (error) {
    logger.error('删除监控地址失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取监控地址列表
 * @param {string} type 地址类型，可选，筛选特定类型的地址
 * @returns {Promise<Array>} 地址列表
 */
async function getAddresses(type) {
  try {
    let addresses;

    if (type) {
      // 验证地址类型
      if (!Object.values(models.address.ADDRESS_TYPES).includes(type)) {
        throw new Error(`无效的地址类型：${type}，可选值：${Object.values(models.address.ADDRESS_TYPES).join(', ')}`);
      }
      addresses = await models.address.getAddressesByType(type);
    } else {
      addresses = await models.address.getAllAddresses();
    }

    // 获取同步状态信息
    const addressesWithStatus = await Promise.all(
      addresses.map(async (address) => {
        const status = await models.syncStatus.getSyncStatus(address.address);
        return {
          ...address,
          last_block_number: status?.last_block_number || 0,
          last_sync_time: status?.last_sync_time || null,
          is_syncing: status?.is_syncing || false
        };
      })
    );

    return addressesWithStatus;
  } catch (error) {
    logger.error('获取监控地址列表失败', { type, error: error.message });
    throw error;
  }
}

/**
 * 更新地址ABI
 * @param {string} address 合约地址
 * @param {Object|Array} abi 合约ABI
 * @returns {Promise<Object>} 更新结果
 */
async function updateContractAbi(address, abi) {
  try {
    // 验证地址格式
    if (!ethers.isAddress(address)) {
      throw new Error(`无效的以太坊地址：${address}`);
    }

    // 检查是否是合约
    if (!(await blockchain.isContract(address))) {
      throw new Error(`地址 ${address} 不是合约地址`);
    }

    // 检查地址是否在监控列表中
    const addressInfo = await models.address.getAddress(address);
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }

    // 验证ABI格式
    if (!abi || (typeof abi !== 'object' && !Array.isArray(abi))) {
      throw new Error('无效的ABI格式');
    }

    // 保存ABI
    await models.contractAbi.saveContractAbi(address, abi);

    logger.info('成功更新合约ABI', { address });

    return {
      success: true,
      address
    };
  } catch (error) {
    logger.error('更新合约ABI失败', { address, error: error.message });
    throw error;
  }
}

/**
 * 获取合约ABI
 * @param {string} address 合约地址
 * @returns {Promise<Object>} 合约ABI
 */
async function getContractAbi(address) {
  try {
    // 验证地址格式
    if (!ethers.isAddress(address)) {
      throw new Error(`无效的以太坊地址：${address}`);
    }

    // 检查地址是否在监控列表中
    const addressInfo = await models.address.getAddress(address);
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }

    // 获取ABI
    const abi = await models.contractAbi.getContractAbi(address);
    
    if (!abi) {
      throw new Error(`未找到地址 ${address} 的ABI`);
    }

    return {
      address,
      abi
    };
  } catch (error) {
    logger.error('获取合约ABI失败', { address, error: error.message });
    throw error;
  }
}

module.exports = {
  addAddress,
  removeAddress,
  getAddresses,
  updateContractAbi,
  getContractAbi
}; 