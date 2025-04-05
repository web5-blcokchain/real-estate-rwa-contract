/**
 * 合约交易发送类
 * 负责合约写入方法的调用和交易确认
 */
const { ethers } = require('ethers');
const { ContractError, ErrorHandler } = require('../../utils/errors');
const Logger = require('../../utils/logger');
const Validation = require('../../utils/validation');

/**
 * 合约交易发送类
 */
class ContractSender {
  /**
   * 发送合约交易
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名称
   * @param {Array} args - 参数数组
   * @param {Object} options - 交易选项
   * @param {boolean} [options.autoGasEstimation=true] - 是否自动估算gas
   * @param {boolean} [options.useEIP1559=true] - 是否使用EIP-1559交易类型
   * @param {number} [options.maxFeePerGasMultiplier=1.5] - 最大gas费用倍数
   * @param {number} [options.maxPriorityFeePerGasMultiplier=1.2] - 最大优先费用倍数
   * @returns {Promise<ethers.TransactionResponse>} 交易响应
   */
  static async send(contract, method, args = [], options = {}) {
    try {
      // 检查方法是否存在
      Validation.validate(
        contract && typeof contract[method] === 'function',
        `合约不存在方法: ${method}`
      );

      // 验证合约有签名者
      if (!contract.signer) {
        throw new ContractError('合约实例没有签名者，无法发送交易');
      }

      // 验证参数类型
      this._validateMethodArgs(contract, method, args);

      // 构建交易选项
      const txOptions = { ...options };
      
      // 如果启用自动gas估算
      if (options.autoGasEstimation !== false) {
        const gasEstimate = await contract.estimateGas[method](...args);
        // 添加10%的缓冲
        txOptions.gasLimit = Math.floor(gasEstimate.toString() * 1.1);
      }
      
      // 如果启用EIP-1559交易
      if (options.useEIP1559 !== false && !txOptions.gasPrice) {
        const feeData = await contract.provider.getFeeData();
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          const maxFeeMultiplier = options.maxFeePerGasMultiplier || 1.5;
          const priorityFeeMultiplier = options.maxPriorityFeePerGasMultiplier || 1.2;
          
          txOptions.maxFeePerGas = feeData.maxFeePerGas.mul(Math.floor(maxFeeMultiplier * 100)).div(100);
          txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.mul(Math.floor(priorityFeeMultiplier * 100)).div(100);
          
          // 确保使用type 2交易
          txOptions.type = 2;
        }
      }

      // 发送交易
      const tx = await contract[method](...args, txOptions);
      
      Logger.info(`发送合约交易成功: ${method}`, {
        contract: contract.address,
        method,
        args: this._formatArgs(args),
        txHash: tx.hash,
        gasLimit: txOptions.gasLimit?.toString(),
        maxFeePerGas: txOptions.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas?.toString()
      });
      
      return tx;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'send', 
          contractMethod: method,
          args: this._formatArgs(args)
        }
      });
      Logger.error(`发送合约交易失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 等待交易确认
   * @param {ethers.TransactionResponse} tx - 交易响应
   * @param {number} confirmations - 确认数
   * @returns {Promise<ethers.TransactionReceipt>} 交易收据
   */
  static async waitForTransaction(tx, confirmations = 1) {
    try {
      Validation.validate(
        tx && tx.hash,
        '无效的交易对象'
      );

      const receipt = await tx.wait(confirmations);
      Logger.info(`交易已确认: ${tx.hash}`, {
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      return receipt;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'waitForTransaction' }
      });
      Logger.error(`等待交易确认失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 格式化参数以便记录日志
   * @private
   * @param {Array} args - 参数数组
   * @returns {Array} 格式化后的参数
   */
  static _formatArgs(args) {
    return args.map(arg => {
      if (ethers.BigNumber.isBigNumber(arg)) {
        return arg.toString();
      }
      if (Array.isArray(arg)) {
        return this._formatArgs(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        const formattedObj = {};
        for (const key in arg) {
          formattedObj[key] = this._formatArgs([arg[key]])[0];
        }
        return formattedObj;
      }
      return arg;
    });
  }

  /**
   * 验证方法参数类型
   * @private
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名称
   * @param {Array} args - 参数数组
   */
  static _validateMethodArgs(contract, method, args) {
    try {
      // 尝试通过合约接口验证参数
      if (contract.interface) {
        // 查找方法片段
        const fragment = contract.interface.getFunction(method);
        if (fragment && fragment.inputs) {
          // 检查参数数量
          if (fragment.inputs.length !== args.length) {
            throw new ContractError(`参数数量不匹配: 预期${fragment.inputs.length}个，实际${args.length}个`);
          }

          // 检查参数类型（基础检查）
          fragment.inputs.forEach((input, index) => {
            const arg = args[index];
            const type = input.type;

            // 基本类型检查
            if (type.startsWith('uint') || type.startsWith('int')) {
              if (
                typeof arg !== 'number' && 
                typeof arg !== 'string' && 
                !ethers.BigNumber.isBigNumber(arg)
              ) {
                throw new ContractError(`参数${index}类型错误: 预期数字类型，实际${typeof arg}`);
              }
            } else if (type === 'address') {
              if (typeof arg !== 'string' || !Validation.isValidAddress(arg)) {
                throw new ContractError(`参数${index}类型错误: 预期地址类型`);
              }
            } else if (type === 'bool') {
              if (typeof arg !== 'boolean') {
                throw new ContractError(`参数${index}类型错误: 预期布尔类型，实际${typeof arg}`);
              }
            } else if (type.startsWith('bytes')) {
              if (typeof arg !== 'string' || (!arg.startsWith('0x') && type !== 'bytes')) {
                throw new ContractError(`参数${index}类型错误: 预期字节类型`);
              }
            }
            // 更复杂的类型验证在此添加
          });
        }
      }
    } catch (error) {
      // 如果是我们自己抛出的错误，继续抛出
      if (error instanceof ContractError) {
        throw error;
      }
      // 其他错误则忽略，不要打断主流程
      Logger.warn(`参数类型验证失败（忽略）: ${error.message}`);
    }
  }
}

module.exports = ContractSender; 