/**
 * 合约服务工具
 * 该模块为了兼容旧代码，推荐直接使用共享的contractService模块
 */
const { ethers } = require("ethers");
const { contracts, contractService } = require("../../shared/utils");

// 处理合约创建/连接的函数
function createContractService(contractAddresses = null) {
  // 如果提供了合约地址，则初始化共享模块
  if (contractAddresses) {
    contractService.initialize(contractAddresses);
  } else if (!contractService.isInitialized()) {
    // 尝试使用共享配置中的合约地址
    contractService.initialize(contracts.getContractAddresses());
  }
  
  // 返回兼容旧API的接口
  return {
    // 获取指定合约的合约实例
    getContract: (contractName, signerOrProvider = null) => {
      return contractService.getContract(contractName, signerOrProvider);
    },
    
    // 获取一组合约实例
    getContracts: (contractNames, signerOrProvider = null) => {
      const result = {};
      for (const name of contractNames) {
        try {
          result[name] = contractService.getContract(name, signerOrProvider);
        } catch (error) {
          console.error(`获取合约 ${name} 失败: ${error.message}`);
        }
      }
      return result;
    },
    
    // 获取所有系统合约实例
    getAllSystemContracts: (signerOrProvider = null) => {
      return contractService.getAllSystemContracts(signerOrProvider);
    },
    
    // 获取部署地址
    getDeployedContractAddress: (contractName) => {
      return contracts.getContractAddress(contractName);
    },
    
    // 更新合约地址
    updateContractAddress: (contractName, address) => {
      contracts.updateContractAddress(contractName, address);
      return true;
    },
    
    // 使用自定义ABI创建合约实例
    createContractWithAbi: (address, abi, signerOrProvider = null) => {
      return contractService.createContractWithAbi(address, abi, signerOrProvider);
    },
    
    // 创建代币合约实例
    getTokenContract: (tokenAddress, signerOrProvider = null) => {
      return contractService.getTokenContract(tokenAddress, signerOrProvider);
    }
  };
}

module.exports = createContractService; 