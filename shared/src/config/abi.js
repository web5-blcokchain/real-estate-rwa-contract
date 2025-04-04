const path = require('path');
const fs = require('fs');
const { AbiConfigError } = require('./errors');
const validation = require('./validation');
const EnvConfig = require('./env');

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
   * 缓存的合约ABI信息
   * @private
   */
  static _cachedAbis = {};
  
  /**
   * 是否已初始化标志
   * @private
   */
  static _initialized = false;
  
  /**
   * 检查是否已初始化
   * @returns {boolean} 是否已初始化
   */
  static isInitialized() {
    return this._initialized;
  }

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
        throw new AbiConfigError(`ABI路径不存在: ${absolutePath}`);
      }
      
      // 如果是目录，加载所有ABI文件
      if (fs.statSync(absolutePath).isDirectory()) {
        const result = this.loadAllContractAbis(resolvedPath);
        this._initialized = true;
        return result;
      }
      
      // 否则加载单个ABI文件
      const abi = this._loadABI(resolvedPath);
      this._initialized = true;
      return {
        path: resolvedPath,
        abi
      };
    } catch (error) {
      throw new AbiConfigError(`加载ABI配置失败: ${error.message}`);
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
      validation.validate(
        Array.isArray(abi),
        '无效的ABI格式'
      );

      return abi;
    } catch (error) {
      throw new AbiConfigError(`加载ABI文件失败: ${error.message}`);
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
      throw new AbiConfigError(`未找到方法: ${methodName}`);
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
      throw new AbiConfigError(`未找到事件: ${eventName}`);
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
        console.warn(`ABI目录不存在: ${abiDir}`);
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
          
          console.info(`已加载合约ABI: ${contractName}`);
        } catch (error) {
          console.error(`加载合约ABI失败: ${contractName}`, error.message);
        }
      }
      
      // 设置初始化标志
      this._initialized = true;
      
      return contracts;
    } catch (error) {
      console.error('加载所有合约ABI失败', error.message);
      throw new AbiConfigError(`加载所有合约ABI失败: ${error.message}`);
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
   * 获取特定合约的ABI
   * @param {string} contractName - 合约名称
   * @returns {object} 合约ABI对象
   * @throws {ConfigError} 如果找不到ABI
   */
  static getContractAbi(contractName) {
    console.log(`正在获取合约${contractName}的ABI...`);
    
    try {
      // 检查缓存中是否有ABI
      if (this._cachedAbis[contractName]) {
        console.log(`从缓存中获取${contractName}的ABI`);
        return this._cachedAbis[contractName];
      }
      
      // 标准化ABI名称，尝试Camel和Pascal大小写以提高兼容性
      const normalizedName = contractName;
      const pascalName = contractName.charAt(0).toUpperCase() + contractName.slice(1);
      const camelName = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      
      console.log(`尝试使用以下名称查找ABI: ${normalizedName}, ${pascalName}, ${camelName}`);
      
      // 构建多个可能的文件路径，优先使用PROJECT_PATH环境变量
      let possiblePaths = [];
      
      if (process.env.PROJECT_PATH) {
        const projectPath = process.env.PROJECT_PATH;
        console.log(`使用PROJECT_PATH查找ABI: ${projectPath}`);
        
        // 检查项目根目录下的config/abi目录
        possiblePaths.push(
          path.join(projectPath, 'config/abi', `${normalizedName}.json`),
          path.join(projectPath, 'config/abi', `${pascalName}.json`),
          path.join(projectPath, 'config/abi', `${camelName}.json`)
        );
        
        // 检查artifacts目录
        possiblePaths.push(
          path.join(projectPath, 'artifacts/contracts', `${normalizedName}.sol/${pascalName}.json`),
          path.join(projectPath, 'artifacts/contracts', `${camelName}.sol/${pascalName}.json`),
          path.join(projectPath, 'artifacts/contracts', `${normalizedName}.sol/${normalizedName}.json`)
        );
      }
      
      // 添加相对路径的备选项
      const defaultAbiPath = path.join(process.cwd(), 'config/abi');
      possiblePaths.push(
        path.join(defaultAbiPath, `${normalizedName}.json`),
        path.join(defaultAbiPath, `${pascalName}.json`),
        path.join(defaultAbiPath, `${camelName}.json`),
        path.join(process.cwd(), '../config/abi', `${normalizedName}.json`),
        path.join(process.cwd(), '../config/abi', `${pascalName}.json`),
        path.join(process.cwd(), '../config/abi', `${camelName}.json`)
      );
      
      // 尝试所有可能的路径
      console.log(`正在尝试${possiblePaths.length}个可能的ABI文件路径...`);
      
      for (const abiPath of possiblePaths) {
        if (fs.existsSync(abiPath)) {
          console.log(`找到ABI文件: ${abiPath}`);
          const abiContent = fs.readFileSync(abiPath, 'utf8');
          const abiData = JSON.parse(abiContent);
          
          // 处理不同格式的ABI文件
          let abi;
          if (abiData.abi) {
            // Hardhat/Truffle 格式
            abi = abiData.abi;
          } else if (Array.isArray(abiData)) {
            // 纯ABI数组格式
            abi = abiData;
          } else {
            // 尝试解析其他格式
            console.log(`警告: ABI文件格式不标准，将尝试直接使用`);
            abi = abiData;
          }
          
          // 缓存并返回ABI
          this._cachedAbis[contractName] = { abi, source: abiPath };
          return this._cachedAbis[contractName];
        }
      }
      
      // 如果所有路径都失败，抛出错误
      throw new Error(`未找到${contractName}的ABI文件，尝试了${possiblePaths.length}个路径`);
    } catch (error) {
      throw new AbiConfigError(`获取合约ABI失败: ${error.message}`);
    }
  }
  
  /**
   * 清除ABI缓存
   */
  static clearCache() {
    this._cachedAbis = {};
  }
}

// 导出常量和类
module.exports = ABIConfig;
module.exports.DEFAULT_ABI_DIR = DEFAULT_ABI_DIR; 