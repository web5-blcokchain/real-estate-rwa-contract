/**
 * 合约调用类
 * 负责合约只读方法的调用
 */
const { ethers } = require('ethers');
const { ContractError, ErrorHandler } = require('../../utils/errors');
const Logger = require('../../utils/logger');
const Validation = require('../../utils/validation');

/**
 * 合约调用类
 */
class ContractCaller {
  /**
   * 调用合约只读方法
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名称
   * @param {Array} args - 参数数组
   * @returns {Promise<any>} 调用结果
   */
  static async call(contract, method, args = []) {
    try {
      // 检查方法是否存在
      Validation.validate(
        contract && typeof contract[method] === 'function',
        `合约不存在方法: ${method}`
      );

      // 验证参数类型
      this._validateMethodArgs(contract, method, args);

      // 调用合约方法
      const result = await contract[method](...args);
      
      Logger.debug(`调用合约方法成功: ${method}`, {
        contract: contract.address,
        method,
        args: this._formatArgs(args)
      });
      
      return result;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'call', 
          contractMethod: method,
          args: this._formatArgs(args)
        }
      });
      Logger.error(`调用合约方法失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 批量调用合约方法
   * @param {ethers.Contract} contract - 合约实例
   * @param {Array<Object>} calls - 调用配置数组，每个对象包含 method 和 args
   * @returns {Promise<Array>} 调用结果数组
   */
  static async multiCall(contract, calls) {
    try {
      Validation.validate(
        Array.isArray(calls),
        '调用配置必须是数组'
      );

      const results = [];
      for (let i = 0; i < calls.length; i++) {
        const { method, args = [] } = calls[i];
        try {
          const result = await this.call(contract, method, args);
          results.push({
            success: true,
            result,
            index: i
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            index: i
          });
        }
      }

      return results;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'multiCall' }
      });
      Logger.error(`批量调用合约方法失败: ${handledError.message}`, { error: handledError });
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

module.exports = ContractCaller; 