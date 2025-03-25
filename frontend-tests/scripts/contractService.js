const { ethers } = require('ethers');
const sharedContractService = require('../../shared/utils/contractService');
const { testAccounts } = require('../config');
const { contractAddresses } = require('../config');

/**
 * 初始化共享合约服务
 */
sharedContractService.initialize(contractAddresses, testAccounts);

/**
 * 为前端测试提供附加功能的合约服务
 */
class FrontendTestContractService {
  constructor() {
    this.sharedService = sharedContractService;
    this.signers = {};
    
    // 从sharedService获取签名者
    Object.keys(testAccounts).forEach(role => {
      Object.defineProperty(this.signers, role, {
        get: () => this.sharedService.signers[role]
      });
    });
  }
  
  /**
   * 代理到共享服务的方法调用
   */
  getContract(contractName, address, role) {
    return this.sharedService.getContract(contractName, address, role);
  }
  
  getRoleManager(role) {
    return this.sharedService.getRoleManager(role);
  }
  
  getPropertyRegistry(role) {
    return this.sharedService.getPropertyRegistry(role);
  }
  
  getTokenFactory(role) {
    return this.sharedService.getTokenFactory(role);
  }
  
  getToken(tokenAddress, role) {
    return this.sharedService.getToken(tokenAddress, role);
  }
  
  getRedemptionManager(role) {
    return this.sharedService.getRedemptionManager(role);
  }
  
  getRentDistributor(role) {
    return this.sharedService.getRentDistributor(role);
  }
  
  getMarketplace(role) {
    return this.sharedService.getMarketplace(role);
  }
  
  getFeeManager(role) {
    return this.sharedService.getFeeManager(role);
  }
  
  getRealEstateSystem(role) {
    return this.sharedService.getRealEstateSystem(role);
  }
}

module.exports = new FrontendTestContractService(); 