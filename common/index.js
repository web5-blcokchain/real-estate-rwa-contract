/**
 * 通用工具模块入口
 * 聚合导出所有通用工具
 */

// 区块链相关工具
const Blockchain = require('./blockchain');

// 日志工具
const Logger = require('./logger');

// 路径工具
const Paths = require('./paths');

// 环境工具
const EnvUtils = require('./env');

// 响应工具
const ResponseUtils = require('./response');

// 为向后兼容保留原始导出结构
module.exports = {
  // 区块链工具
  AddressUtils: Blockchain.AddressUtils,
  AbiUtils: Blockchain.AbiUtils,
  ContractUtils: Blockchain.ContractUtils,
  BlockchainManager: Blockchain.BlockchainManager,
  
  // 完整的区块链模块
  Blockchain,
  
  // 其他工具
  Logger,
  Paths,
  EnvUtils,
  ResponseUtils
}; 