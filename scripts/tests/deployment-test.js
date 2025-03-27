/**
 * 部署测试脚本
 * 验证合约部署和基本功能
 */
const { ethers } = require('hardhat');
const { getContractAddresses } = require('../../shared/config/contracts');
const logger = require('../../shared/utils/logger');

/**
 * 主函数
 */
async function main() {
  try {
    console.log('=== 部署验证开始 ===');
    
    // 检查所有必要合约地址
    const contracts = getContractAddresses();
    const requiredContracts = [
      'RoleManager', 
      'FeeManager', 
      'PropertyRegistry', 
      'RentDistributor',
      'TokenFactory',
      'RedemptionManager',
      'Marketplace',
      'TokenHolderQuery',
      'RealEstateSystem'
    ];
    
    // 验证是否所有必要合约都已部署
    for (const contractName of requiredContracts) {
      if (!contracts[contractName]) {
        throw new Error(`合约 ${contractName} 未部署`);
      }
      
      // 验证合约地址是否有效
      const code = await ethers.provider.getCode(contracts[contractName]);
      if (code === '0x' || code === '0x0') {
        throw new Error(`合约 ${contractName} 地址无效或未部署`);
      }
      
      console.log(`✅ ${contractName}: ${contracts[contractName]}`);
    }
    
    // 验证RoleManager并检查关键角色
    const roleManager = await ethers.getContractAt('RoleManager', contracts.RoleManager);
    const [deployer] = await ethers.getSigners();
    
    // 检查部署者是否拥有SUPER_ADMIN角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
    
    if (!hasSuperAdmin) {
      throw new Error(`部署者 ${deployer.address} 未被授予SUPER_ADMIN角色`);
    }
    
    console.log(`✅ 部署者 ${deployer.address} 具有SUPER_ADMIN角色`);
    
    // 验证RealEstateSystem合约的关键关系
    const realEstateSystem = await ethers.getContractAt('RealEstateSystem', contracts.RealEstateSystem);
    
    // 验证合约间关系
    const registeredRoleManager = await realEstateSystem.roleManager();
    if (registeredRoleManager.toLowerCase() !== contracts.RoleManager.toLowerCase()) {
      throw new Error(`RealEstateSystem的RoleManager地址不正确`);
    }
    
    const registeredFeeManager = await realEstateSystem.feeManager();
    if (registeredFeeManager.toLowerCase() !== contracts.FeeManager.toLowerCase()) {
      throw new Error(`RealEstateSystem的FeeManager地址不正确`);
    }
    
    console.log('✅ 合约间关系正确');
    console.log('=== 部署验证成功 ===');
    console.log('所有合约已正确部署并检验通过');
    return true;
  } catch (error) {
    console.error('部署验证失败:', error.message);
    return false;
  }
}

// 执行主函数
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('执行出错:', error);
    process.exit(1);
  });

module.exports = { main }; 