/**
 * 合约控制器
 * 处理智能合约API请求
 */

const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const abiService = require('../services/abiService');
const contractService = require('../services/contractService');

/**
 * 合约控制器类
 */
class ContractController {
  /**
   * 获取所有合约
   */
  static async getAllContracts(req, res, next) {
    try {
      logger.debug('获取所有合约信息...');
      const contracts = abiService.getAllContracts();
      
      if (contracts.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: '未找到合约或ABI服务未完全初始化'
        });
      }
      
      // 简化返回数据，只包含合约名称、地址和函数/事件数量
      const simplifiedContracts = contracts.map(contract => ({
        name: contract.name,
        address: contract.address,
        functionCount: contract.functions.length,
        readFunctionCount: contract.readFunctions.length,
        writeFunctionCount: contract.writeFunctions.length,
        eventCount: contract.events.length
      }));
      
      res.json({
        success: true,
        data: simplifiedContracts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取合约信息
   */
  static async getContractInfo(req, res, next) {
    try {
      const { contractName } = req.params;
      logger.debug(`获取合约 ${contractName} 的信息`);
      
      const contract = abiService.getContract(contractName);
      if (!contract) {
        throw ApiError.notFound(`找不到合约: ${contractName}`);
      }
      
      // 简化返回数据，不包含完整ABI
      const simplifiedContract = {
        name: contract.name,
        address: contract.address,
        functions: contract.functions.map(func => ({
          name: func.name,
          inputs: func.inputs,
          outputs: func.outputs,
          stateMutability: func.stateMutability,
          isRead: func.isRead,
          signature: func.signature
        })),
        events: contract.events
      };
      
      res.json({
        success: true,
        data: simplifiedContract
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取合约函数列表
   */
  static async getContractFunctions(req, res, next) {
    try {
      const { contractName } = req.params;
      logger.debug(`获取合约 ${contractName} 的函数列表`);
      
      const contract = abiService.getContract(contractName);
      if (!contract) {
        throw ApiError.notFound(`找不到合约: ${contractName}`);
      }
      
      // 根据查询参数筛选函数
      const { type } = req.query;
      let functions = [];
      
      if (type === 'read') {
        functions = contract.readFunctions;
      } else if (type === 'write') {
        functions = contract.writeFunctions;
      } else {
        functions = contract.functions;
      }
      
      res.json({
        success: true,
        data: functions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 执行合约的只读函数
   */
  static async executeReadFunction(req, res, next) {
    try {
      const { contractName, functionName } = req.params;
      logger.debug(`执行合约 ${contractName} 的只读函数 ${functionName}`);
      
      // 检查ABI服务状态
      if (!abiService.initialized && !abiService.initializationAttempted) {
        throw ApiError.internal('ABI服务尚未初始化，请稍后再试');
      }
      
      // 获取函数定义
      const functionDef = abiService.getContractFunction(contractName, functionName);
      if (!functionDef) {
        throw ApiError.badRequest(`合约 ${contractName} 中不存在函数 ${functionName}，或ABI未初始化`);
      }
      
      // 确认函数是只读函数
      if (!functionDef.isRead) {
        throw ApiError.badRequest(`函数 ${functionName} 不是只读函数，请使用POST方法调用`);
      }
      
      // 解析参数
      const args = ContractController.parseArguments(req.query, functionDef.inputs);
      
      // 模拟结果（如果无法连接区块链）
      if (!contractService.isBlockchainConnected()) {
        logger.warn('区块链连接不可用，返回模拟结果');
        return res.json({
          success: true,
          data: null,
          message: '区块链连接不可用，无法获取真实数据'
        });
      }
      
      // 执行函数
      const result = await contractService.executeReadFunction(contractName, functionName, args);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 执行合约的写入函数
   */
  static async executeWriteFunction(req, res, next) {
    try {
      const { contractName, functionName } = req.params;
      logger.debug(`执行合约 ${contractName} 的写入函数 ${functionName}`);
      
      // 检查ABI服务状态
      if (!abiService.initialized && !abiService.initializationAttempted) {
        throw ApiError.internal('ABI服务尚未初始化，请稍后再试');
      }
      
      // 检查区块链连接
      if (!contractService.isBlockchainConnected()) {
        throw ApiError.internal('区块链连接不可用，无法执行写入操作');
      }
      
      // 获取函数定义
      const functionDef = abiService.getContractFunction(contractName, functionName);
      if (!functionDef) {
        throw ApiError.badRequest(`合约 ${contractName} 中不存在函数 ${functionName}，或ABI未初始化`);
      }
      
      // 确认函数是写入函数
      if (functionDef.isRead) {
        throw ApiError.badRequest(`函数 ${functionName} 是只读函数，请使用GET方法调用`);
      }
      
      // 解析参数
      const args = ContractController.parseArguments(req.body, functionDef.inputs);
      
      // 执行函数
      const receipt = await contractService.executeWriteFunction(contractName, functionName, args);
      
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解析函数参数
   * @param {Object} source 参数来源 (query 或 body)
   * @param {Array} inputs 函数输入参数定义
   * @returns {Array} 解析后的参数数组
   */
  static parseArguments(source, inputs) {
    // 检查参数
    const args = [];
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const paramName = input.name || `arg${i}`;
      const paramValue = source[paramName];
      
      // 检查参数是否存在
      if (paramValue === undefined) {
        throw ApiError.badRequest(`缺少参数: ${paramName}`);
      }
      
      // 尝试转换参数类型
      try {
        const convertedValue = ContractController.convertParamType(paramValue, input.type);
        args.push(convertedValue);
      } catch (error) {
        throw ApiError.badRequest(`参数 ${paramName} 类型转换失败: ${error.message}`);
      }
    }
    
    return args;
  }

  /**
   * 转换参数类型
   * @param {any} value 原始值
   * @param {string} type 以太坊类型
   * @returns {any} 转换后的值
   */
  static convertParamType(value, type) {
    // 处理数组类型
    if (type.endsWith('[]')) {
      if (!Array.isArray(value)) {
        throw new Error(`类型应为数组: ${type}`);
      }
      
      const baseType = type.slice(0, -2);
      return value.map(item => ContractController.convertParamType(item, baseType));
    }
    
    // 根据类型转换
    if (type.startsWith('uint') || type.startsWith('int')) {
      // 整数类型
      return value.toString();
    } else if (type === 'bool') {
      // 布尔类型
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    } else if (type === 'address') {
      // 地址类型
      if (typeof value !== 'string' || !value.startsWith('0x')) {
        throw new Error('无效的以太坊地址');
      }
      return value;
    } else if (type.startsWith('bytes')) {
      // 字节类型
      if (typeof value !== 'string') {
        throw new Error('字节类型参数应为字符串');
      }
      return value;
    } else if (type === 'string') {
      // 字符串类型
      return String(value);
    } else {
      // 其他类型，尝试直接使用
      return value;
    }
  }
}

module.exports = ContractController; 