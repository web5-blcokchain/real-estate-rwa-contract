const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');
const Logger = require('../utils/logger');

/**
 * ABI路径常量
 */
const DEFAULT_ABI_DIR = 'config/abi';

/**
 * ABI配置类
 * 专门负责合约ABI文件的加载和解析
 */
class ABIConfig {
  /**
   * 加载ABI配置
   * @param {string} [abiPath] - ABI文件路径
   * @returns {Object} ABI配置
   */
  static load(abiPath) {
    try {
      const resolvedPath = abiPath || DEFAULT_ABI_DIR;
      
      // 验证路径存在
      const absolutePath = path.resolve(process.cwd(), resolvedPath);
      if (!fs.existsSync(absolutePath)) {
        throw new ConfigError(`ABI路径不存在: ${absolutePath}`);
      }
      
      // 如果是目录，加载所有ABI文件
      if (fs.statSync(absolutePath).isDirectory()) {
        return this.loadAllContractAbis(resolvedPath);
      }
      
      // 否则加载单个ABI文件
      const abi = this._loadABI(resolvedPath);
      return {
        path: resolvedPath,
        abi
      };
    } catch (error) {
      throw new ConfigError(`加载ABI配置失败: ${error.message}`);
    }
  }

  /**
   * 加载ABI文件
   * @private
   * @param {string} abiPath - ABI文件路径
   * @returns {Array} ABI数组
   */
  static _loadABI(abiPath) {
    try {
      const absolutePath = path.resolve(process.cwd(), abiPath);
      const abiContent = fs.readFileSync(absolutePath, 'utf8');
      const abi = JSON.parse(abiContent);

      // 验证ABI格式
      Validation.validate(
        Array.isArray(abi),
        '无效的ABI格式'
      );

      return abi;
    } catch (error) {
      throw new ConfigError(`加载ABI文件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约方法ABI
   * @param {string} methodName - 方法名称
   * @param {Array} abi - ABI数组
   * @returns {Object} 方法ABI
   */
  static getMethodAbi(methodName, abi) {
    const method = abi.find(item => 
      item.type === 'function' && 
      item.name === methodName
    );

    if (!method) {
      throw new ConfigError(`未找到方法: ${methodName}`);
    }

    return method;
  }

  /**
   * 获取合约事件ABI
   * @param {string} eventName - 事件名称
   * @param {Array} abi - ABI数组
   * @returns {Object} 事件ABI
   */
  static getEventAbi(eventName, abi) {
    const event = abi.find(item => 
      item.type === 'event' && 
      item.name === eventName
    );

    if (!event) {
      throw new ConfigError(`未找到事件: ${eventName}`);
    }

    return event;
  }

  /**
   * 加载指定目录下的所有ABI文件
   * @param {string} [dirPath=DEFAULT_ABI_DIR] - ABI文件目录路径
   * @returns {Object} 合约ABI映射表 {contractName: {abi, functions, events}}
   */
  static loadAllContractAbis(dirPath = DEFAULT_ABI_DIR) {
    try {
      const abiDir = path.resolve(process.cwd(), dirPath);
      if (!fs.existsSync(abiDir)) {
        Logger.warn(`ABI目录不存在: ${abiDir}`);
        return {};
      }

      const contracts = {};
      const files = fs.readdirSync(abiDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const contractName = path.basename(file, '.json');
        const filePath = path.join(abiDir, file);
        
        try {
          const abiJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const contractInfo = this._parseContractAbi(abiJson, contractName);
          contracts[contractName] = contractInfo;
          
          Logger.info(`已加载合约ABI: ${contractName}`);
        } catch (error) {
          Logger.error(`加载合约ABI失败: ${contractName}`, { error: error.message });
        }
      }
      
      return contracts;
    } catch (error) {
      Logger.error('加载所有合约ABI失败', { error: error.message });
      throw new ConfigError(`加载所有合约ABI失败: ${error.message}`);
    }
  }

  /**
   * 解析合约ABI获取函数和事件信息
   * @private
   * @param {Array} abi - 合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Object} 解析后的合约信息
   */
  static _parseContractAbi(abi, contractName) {
    const functions = {};
    const events = {};
    const readFunctions = {};
    const writeFunctions = {};
    
    for (const item of abi) {
      if (item.type === 'function') {
        functions[item.name] = item;
        
        // 区分读写函数
        const isReadOnly = ['view', 'pure'].includes(item.stateMutability);
        if (isReadOnly) {
          readFunctions[item.name] = {
            ...item,
            isReadOnly: true
          };
        } else {
          writeFunctions[item.name] = {
            ...item,
            isReadOnly: false
          };
        }
      } else if (item.type === 'event') {
        events[item.name] = item;
      }
    }
    
    return {
      name: contractName,
      abi,
      functions,
      readFunctions,
      writeFunctions,
      events
    };
  }

  /**
   * 获取指定合约的ABI信息
   * @param {string} contractName - 合约名称
   * @param {string} [dirPath=DEFAULT_ABI_DIR] - ABI文件目录路径
   * @returns {Object} 合约ABI信息
   */
  static getContractAbi(contractName, dirPath = DEFAULT_ABI_DIR) {
    try {
      const filePath = path.join(path.resolve(process.cwd(), dirPath), `${contractName}.json`);
      
      if (!fs.existsSync(filePath)) {
        throw new ConfigError(`合约ABI文件不存在: ${filePath}`);
      }
      
      const abiJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return this._parseContractAbi(abiJson, contractName);
    } catch (error) {
      throw new ConfigError(`获取合约ABI失败: ${error.message}`);
    }
  }
}

// 导出常量和类
module.exports = ABIConfig;
module.exports.DEFAULT_ABI_DIR = DEFAULT_ABI_DIR; 