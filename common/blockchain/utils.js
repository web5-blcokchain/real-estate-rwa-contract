/**
 * 区块链辅助工具
 * 提供一些通用的区块链相关工具方法
 */
const { ethers } = require('ethers');
const Logger = require('../logger');

/**
 * 区块链辅助工具类
 */
class BlockchainUtils {
  /**
   * 将16进制转换为10进制字符串
   * @param {string|number|bigint} hex - 16进制值
   * @returns {string} 10进制字符串
   */
  static hexToDecimal(hex) {
    try {
      if (typeof hex === 'bigint') {
        return hex.toString();
      }
      
      // 确保hex是字符串
      hex = hex.toString();
      
      // 如果不是0x开头，添加0x前缀
      if (!hex.startsWith('0x')) {
        hex = '0x' + hex;
      }
      
      return BigInt(hex).toString();
    } catch (error) {
      Logger.error('16进制转10进制失败', { hex, error: error.message });
      throw new Error(`16进制转10进制失败: ${error.message}`);
    }
  }

  /**
   * 将数值转换为16进制
   * @param {string|number|bigint} value - 数值
   * @returns {string} 16进制字符串
   */
  static toHex(value) {
    try {
      if (typeof value === 'bigint') {
        return '0x' + value.toString(16);
      }
      
      const bigintValue = BigInt(value);
      return '0x' + bigintValue.toString(16);
    } catch (error) {
      Logger.error('数值转16进制失败', { value, error: error.message });
      throw new Error(`数值转16进制失败: ${error.message}`);
    }
  }

  /**
   * 计算keccak256哈希
   * @param {string|Uint8Array} value - 要哈希的值
   * @returns {string} 哈希值
   */
  static keccak256(value) {
    try {
      return ethers.keccak256(
        typeof value === 'string' && !value.startsWith('0x') 
          ? ethers.toUtf8Bytes(value) 
          : value
      );
    } catch (error) {
      Logger.error('计算keccak256哈希失败', { error: error.message });
      throw new Error(`计算keccak256哈希失败: ${error.message}`);
    }
  }

  /**
   * 获取函数选择器
   * @param {string} signature - 函数签名，如 "transfer(address,uint256)"
   * @returns {string} 函数选择器（4字节）
   */
  static getFunctionSelector(signature) {
    try {
      const hash = this.keccak256(signature);
      return hash.slice(0, 10); // 取前4字节（包括0x）
    } catch (error) {
      Logger.error('获取函数选择器失败', { signature, error: error.message });
      throw new Error(`获取函数选择器失败: ${error.message}`);
    }
  }

  /**
   * 计算合约地址
   * @param {string} deployerAddress - 部署者地址
   * @param {number|string} nonce - 部署者nonce
   * @returns {string} 合约地址
   */
  static getContractAddress(deployerAddress, nonce) {
    try {
      return ethers.getContractAddress({
        from: deployerAddress,
        nonce: BigInt(nonce)
      });
    } catch (error) {
      Logger.error('计算合约地址失败', { 
        deployerAddress, 
        nonce, 
        error: error.message 
      });
      throw new Error(`计算合约地址失败: ${error.message}`);
    }
  }

  /**
   * 处理合约错误
   * @param {Error} error - 错误对象
   * @returns {Object} 格式化后的错误信息
   */
  static handleContractError(error) {
    try {
      // 默认错误信息
      const result = {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        description: '未知合约错误'
      };

      // 尝试解析合约错误
      if (error.data) {
        result.data = error.data;
      }

      if (error.code) {
        result.code = error.code;
      }

      // 处理常见错误
      if (error.message.includes('insufficient funds')) {
        result.code = 'INSUFFICIENT_FUNDS';
        result.description = '账户余额不足';
      } else if (error.message.includes('execution reverted')) {
        result.code = 'EXECUTION_REVERTED';
        result.description = '合约执行失败';

        // 尝试提取revert原因
        const revertReasonMatch = error.message.match(/reverted with reason string '([^']+)'/);
        if (revertReasonMatch && revertReasonMatch[1]) {
          result.description = `合约执行失败: ${revertReasonMatch[1]}`;
        }
      } else if (error.message.includes('account is locked')) {
        result.code = 'ACCOUNT_LOCKED';
        result.description = '账户被锁定';
      } else if (error.message.includes('nonce too low')) {
        result.code = 'NONCE_TOO_LOW';
        result.description = 'nonce值过低，交易可能已经被处理';
      } else if (error.message.includes('gas required exceeds allowance')) {
        result.code = 'GAS_LIMIT_EXCEEDED';
        result.description = 'Gas不足，操作无法完成';
      } else if (error.message.includes('network does not support EIP-1559')) {
        result.code = 'EIP1559_NOT_SUPPORTED';
        result.description = '网络不支持EIP-1559';
      }

      Logger.debug('处理合约错误', result);
      return result;
    } catch (innerError) {
      Logger.error('处理合约错误失败', { 
        originalError: error.message,
        error: innerError.message
      });
      return {
        message: error.message,
        code: 'ERROR_HANDLING_FAILED',
        description: '处理错误失败'
      };
    }
  }

  /**
   * 校验交易数据
   * @param {Object} tx - 交易数据
   * @returns {string|null} 错误消息，如果没有错误则返回null
   */
  static validateTransaction(tx) {
    try {
      if (!tx) {
        return '交易数据不能为空';
      }

      if (tx.to && !ethers.isAddress(tx.to)) {
        return '无效的接收地址';
      }

      if (tx.value && BigInt(tx.value) < 0) {
        return '无效的交易金额';
      }

      if (tx.gasLimit && BigInt(tx.gasLimit) <= 0) {
        return '无效的Gas限制';
      }

      return null; // 没有错误
    } catch (error) {
      Logger.error('交易数据校验失败', { tx, error: error.message });
      return `交易数据校验失败: ${error.message}`;
    }
  }
}

module.exports = BlockchainUtils; 