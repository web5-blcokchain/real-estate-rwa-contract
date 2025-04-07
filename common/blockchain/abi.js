/**
 * ABI工具类
 * 提供智能合约ABI相关的工具方法
 */
const fs = require('fs');
const path = require('path');
const Logger = require('../logger');
const Paths = require('../paths');

/**
 * ABI处理工具类
 */
class AbiUtils {
  static #cache = new Map();

  /**
   * 获取合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Array} 合约ABI
   * @throws {Error} 当ABI文件不存在或格式错误时抛出错误
   */
  static getAbi(contractName) {
    // 检查缓存
    if (this.#cache.has(contractName)) {
      return this.#cache.get(contractName);
    }

    // 尝试从不同路径加载
    const abiPaths = [
      // Hardhat artifacts路径
      path.join(Paths.ROOT, 'artifacts/contracts', `${contractName}.sol/${contractName}.json`),
      // 直接ABI文件路径
      path.join(Paths.ROOT, 'contracts/abi', `${contractName}.json`),
      // 备选路径
      path.join(Paths.ROOT, 'abi', `${contractName}.json`)
    ];

    try {
      let abi = null;
      let loadPath = null;

      // 尝试从所有可能的路径加载ABI
      for (const abiPath of abiPaths) {
        if (fs.existsSync(abiPath)) {
          loadPath = abiPath;
          const content = fs.readFileSync(abiPath, 'utf8');
          const parsedContent = JSON.parse(content);
          
          // 如果是Hardhat artifacts格式
          if (parsedContent.abi) {
            abi = parsedContent.abi;
          } 
          // 如果直接是ABI数组
          else if (Array.isArray(parsedContent)) {
            abi = parsedContent;
          }
          
          if (abi) break;
        }
      }

      if (!abi) {
        throw new Error(`无法找到合约ABI: ${contractName}`);
      }

      Logger.info(`成功加载ABI: ${contractName}`, { path: loadPath });
      
      // 缓存ABI
      this.#cache.set(contractName, abi);
      return abi;
    } catch (error) {
      Logger.error(`无法加载合约ABI: ${contractName}`, {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`无法加载合约ABI: ${contractName}, ${error.message}`);
    }
  }

  /**
   * 获取ERC20合约ABI
   * @returns {Array} ERC20合约ABI
   */
  static getErc20Abi() {
    return this.getAbi('ERC20');
  }

  /**
   * 获取ERC721合约ABI
   * @returns {Array} ERC721合约ABI
   */
  static getErc721Abi() {
    return this.getAbi('ERC721');
  }

  /**
   * 清除ABI缓存
   * @param {string} [contractName] - 合约名称，不传则清除所有缓存
   */
  static clearCache(contractName) {
    if (contractName) {
      this.#cache.delete(contractName);
      Logger.debug(`已清除合约ABI缓存: ${contractName}`);
    } else {
      this.#cache.clear();
      Logger.debug('已清除所有合约ABI缓存');
    }
  }
}

module.exports = AbiUtils; 