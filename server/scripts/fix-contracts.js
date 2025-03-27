/**
 * 修复合约状态的脚本
 * 
 * 这个脚本用于检查合约状态并尝试修复问题，如重新初始化合约
 */

// 首先初始化模块别名
require('../../shared/utils/moduleAlias').initializeAliases();

const { ethers } = require('ethers');
const { contractService } = require('../../shared/utils/contractService');
const { configManager } = require('../../shared/config');
const { getContractAddresses } = require('../../shared/config/contracts');
const logger = require('../../server/src/utils/logger');
const { initializeBlockchain, resetBlockchain } = require('../../shared/utils/blockchain');
const fs = require('fs');
const path = require('path');

// 尝试诊断和修复合约
async function diagnoseAndFixContracts() {
  console.log('\n开始诊断和修复合约...\n');

  // 初始化区块链连接
  await initializeBlockchain();
  
  // 初始化合约服务
  if (!contractService.initialized) {
    await contractService.initialize();
  }
  
  // 获取合约地址
  const addresses = getContractAddresses();
  console.log('已部署的合约地址:', addresses);
  
  // 检查合约代码是否存在
  console.log('\n检查合约代码...');
  const provider = contractService.provider;
  
  const contractsToCheck = [
    { name: 'RoleManager', address: addresses.RoleManager },
    { name: 'PropertyRegistry', address: addresses.PropertyRegistry },
    { name: 'TokenFactory', address: addresses.TokenFactory },
    { name: 'RedemptionManager', address: addresses.RedemptionManager },
    { name: 'RentDistributor', address: addresses.RentDistributor }
  ];
  
  const contractStatuses = [];
  
  for (const { name, address } of contractsToCheck) {
    console.log(`检查 ${name} 合约 (${address})...`);
    
    try {
      const code = await provider.getCode(address);
      const hasCode = code !== '0x';
      
      if (!hasCode) {
        console.log(`⛔ ${name} 合约地址上没有代码！`);
        contractStatuses.push({ name, status: 'no_code', address });
        continue;
      }
      
      console.log(`✅ ${name} 合约代码存在`);
      
      // 尝试获取合约实例
      const contract = await contractService.getContractByName(name);
      
      // 尝试检查合约是否已初始化
      let isInitialized = false;
      try {
        // 对于大多数合约，可以检查version
        if (typeof contract.version === 'function') {
          const version = await contract.version();
          console.log(`✅ ${name} 合约已初始化，版本: ${version.toString()}`);
          isInitialized = true;
        } else {
          // 尝试调用其他特定于合约的方法
          if (name === 'PropertyRegistry') {
            try {
              await contract.getAllPropertyIds();
              console.log(`✅ ${name} 可以调用getAllPropertyIds方法`);
              isInitialized = true;
            } catch (e) {
              console.log(`⚠️ ${name} 调用getAllPropertyIds方法失败: ${e.message}`);
            }
          } else if (name === 'TokenFactory') {
            try {
              await contract.getAllTokens();
              console.log(`✅ ${name} 可以调用getAllTokens方法`);
              isInitialized = true;
            } catch (e) {
              console.log(`⚠️ ${name} 调用getAllTokens方法失败: ${e.message}`);
            }
          }
          
          // 如果无法确定，假设已初始化
          if (!isInitialized) {
            console.log(`⚠️ ${name} 无法确定是否已初始化，假设已初始化`);
            isInitialized = true;
          }
        }
      } catch (error) {
        console.log(`⚠️ ${name} 合约可能未初始化: ${error.message}`);
        isInitialized = false;
      }
      
      contractStatuses.push({ 
        name, 
        status: isInitialized ? 'initialized' : 'deployed_not_initialized',
        address 
      });
      
    } catch (error) {
      console.log(`❌ 检查 ${name} 失败: ${error.message}`);
      contractStatuses.push({ name, status: 'error', address, error: error.message });
    }
  }
  
  // 打印状态总结
  console.log('\n合约状态总结:');
  for (const status of contractStatuses) {
    console.log(`${status.name}: ${status.status}`);
  }
  
  // 是否要尝试初始化合约
  const needInitialization = contractStatuses.some(s => s.status === 'deployed_not_initialized');
  
  if (needInitialization) {
    console.log('\n需要初始化的合约:');
    const toInitialize = contractStatuses.filter(s => s.status === 'deployed_not_initialized');
    
    for (const { name, address } of toInitialize) {
      console.log(`尝试初始化 ${name} 合约 (${address})...`);
      
      try {
        const contract = await contractService.getContractByName(name);
        
        // 根据合约类型调用不同的初始化方法
        if (name === 'RoleManager') {
          // 为 RoleManager 添加初始化管理员
          console.log('初始化 RoleManager...');
          await contract.initialize(contractService.signer.address);
          console.log('✅ RoleManager 初始化成功');
        }
        else if (name === 'PropertyRegistry') {
          // 初始化 PropertyRegistry
          console.log('初始化 PropertyRegistry...');
          const roleManager = await contractService.getRoleManager();
          await contract.initialize(roleManager.address);
          console.log('✅ PropertyRegistry 初始化成功');
        }
        else if (name === 'TokenFactory') {
          // 初始化 TokenFactory
          console.log('初始化 TokenFactory...');
          const roleManager = await contractService.getRoleManager();
          const propertyRegistry = await contractService.getPropertyRegistry();
          const rentDistributor = await contractService.getRentDistributor();
          
          // 也需要获取RealEstateToken实现地址
          const tokenImplementation = addresses.RealEstateTokenImplementation || ethers.constants.AddressZero;
          
          await contract.initialize(
            roleManager.address,
            propertyRegistry.address,
            tokenImplementation,
            rentDistributor.address
          );
          console.log('✅ TokenFactory 初始化成功');
        }
        else {
          console.log(`⚠️ 不知道如何初始化 ${name} 合约`);
        }
      } catch (error) {
        console.log(`❌ 初始化 ${name} 失败: ${error.message}`);
      }
    }
  } else {
    console.log('\n✅ 所有合约都已初始化或无法初始化');
  }
  
  // 重置区块链连接
  resetBlockchain();
  console.log('\n诊断和修复完成!\n');
}

// 执行诊断和修复
diagnoseAndFixContracts()
  .then(() => {
    console.log('脚本执行完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }); 