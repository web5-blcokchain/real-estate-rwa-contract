const { Validation } = require('./validation');
const Logger = require('./logger');

/**
 * 安全审计类
 */
class SecurityAuditor {
  /**
   * 审计交易
   * @param {Object} transaction - 交易对象
   * @returns {Object} 审计结果
   */
  static auditTransaction(transaction) {
    const audit = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 验证交易格式
    if (!Validation.isValidTransaction(transaction)) {
      audit.isValid = false;
      audit.errors.push('无效的交易格式');
      return audit;
    }

    // 检查gas设置
    if (transaction.gasLimit) {
      const gasLimit = BigInt(transaction.gasLimit);
      if (gasLimit > 10000000n) {
        audit.warnings.push('Gas限制过高');
      }
    }

    // 检查gas价格
    if (transaction.gasPrice) {
      const gasPrice = BigInt(transaction.gasPrice);
      if (gasPrice > 100000000000n) { // 100 Gwei
        audit.warnings.push('Gas价格过高');
      }
    }

    // 检查EIP-1559交易
    if (transaction.maxFeePerGas && transaction.maxPriorityFeePerGas) {
      const maxFee = BigInt(transaction.maxFeePerGas);
      const maxPriorityFee = BigInt(transaction.maxPriorityFeePerGas);
      
      if (maxPriorityFee > maxFee) {
        audit.isValid = false;
        audit.errors.push('最大优先费用不能大于最大费用');
      }

      if (maxFee > 100000000000n) { // 100 Gwei
        audit.warnings.push('最大费用过高');
      }
    }

    // 检查合约调用
    if (transaction.data && transaction.data.length > 0) {
      // 检查数据长度
      if (transaction.data.length > 10000) {
        audit.warnings.push('合约调用数据过长');
      }

      // 检查是否为合约调用
      if (transaction.to && transaction.data.startsWith('0x')) {
        audit.warnings.push('检测到合约调用');
      }
    }

    // 记录审计结果
    if (audit.warnings.length > 0 || audit.errors.length > 0) {
      Logger.warn('Security Audit', {
        transaction: {
          to: transaction.to,
          value: transaction.value,
          gasLimit: transaction.gasLimit,
          gasPrice: transaction.gasPrice,
          maxFeePerGas: transaction.maxFeePerGas,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
        },
        audit
      });
    }

    return audit;
  }

  /**
   * 审计合约调用
   * @param {Object} contract - 合约对象
   * @param {string} method - 方法名称
   * @param {Array} args - 参数数组
   * @returns {Object} 审计结果
   */
  static auditContractCall(contract, method, args) {
    const audit = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 检查合约地址
    if (!Validation.isValidAddress(contract.address)) {
      audit.isValid = false;
      audit.errors.push('无效的合约地址');
    }

    // 检查方法名称
    if (!Validation.isValidContractName(method)) {
      audit.isValid = false;
      audit.errors.push('无效的方法名称');
    }

    // 检查参数
    if (!Array.isArray(args)) {
      audit.isValid = false;
      audit.errors.push('参数必须是数组');
    } else if (args.length > 10) {
      audit.warnings.push('参数数量过多');
    }

    // 记录审计结果
    if (audit.warnings.length > 0 || audit.errors.length > 0) {
      Logger.warn('Contract Call Audit', {
        contract: contract.address,
        method,
        args,
        audit
      });
    }

    return audit;
  }

  /**
   * 审计事件监听
   * @param {Object} filter - 事件过滤器
   * @returns {Object} 审计结果
   */
  static auditEventFilter(filter) {
    const audit = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 验证过滤器格式
    if (!Validation.isValidEventFilter(filter)) {
      audit.isValid = false;
      audit.errors.push('无效的事件过滤器格式');
      return audit;
    }

    // 检查区块范围
    if (filter.fromBlock && filter.toBlock) {
      const fromBlock = BigInt(filter.fromBlock);
      const toBlock = BigInt(filter.toBlock);
      
      if (toBlock - fromBlock > 10000n) {
        audit.warnings.push('区块范围过大');
      }
    }

    // 检查主题数量
    if (filter.topics && filter.topics.length > 4) {
      audit.warnings.push('主题数量过多');
    }

    // 记录审计结果
    if (audit.warnings.length > 0 || audit.errors.length > 0) {
      Logger.warn('Event Filter Audit', {
        filter,
        audit
      });
    }

    return audit;
  }
}

module.exports = SecurityAuditor; 