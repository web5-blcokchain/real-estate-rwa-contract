// 部署验证脚本
// 用于验证合约部署是否正确，并检查所有合约的基本功能

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('../shared/utils/logger');

// 确保连接到正确的节点
async function setupProvider() {
  console.log('正在连接到本地Hardhat节点...');
  // 创建一个自定义的提供器，连接到运行中的Hardhat节点
  const customProvider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  try {
    // 检查连接是否成功
    const blockNumber = await customProvider.getBlockNumber();
    console.log(`成功连接到节点，当前区块号: ${blockNumber}`);
    return customProvider;
  } catch (error) {
    console.error('连接到节点失败:', error.message);
    throw new Error('无法连接到Hardhat节点，请确保节点正在运行');
  }
}

// 加载部署地址
function loadDeployedContracts() {
  try {
    const deployStateFile = path.join(__dirname, 'deploy-state.json');
    if (!fs.existsSync(deployStateFile)) {
      throw new Error(`部署状态文件不存在: ${deployStateFile}`);
    }
    
    const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
    return deployState;
  } catch (error) {
    console.error('加载部署状态失败:', error);
    throw error;
  }
}

// 验证合约的存在性
async function verifyContractsExistence(provider, contracts) {
  console.log('\n=== 验证合约存在性 ===');
  
  let allValid = true;
  
  for (const [name, address] of Object.entries(contracts)) {
    if (name === 'SystemDeployerLib1' || name === 'SystemDeployerLib2') {
      continue; // 跳过库合约
    }
    
    try {
      const code = await provider.getCode(address);
      const isContract = code.length > 2; // "0x" 表示非合约地址
      
      if (isContract) {
        console.log(`✅ ${name}: ${address} - 合约存在`);
      } else {
        console.log(`❌ ${name}: ${address} - 不是合约地址!`);
        allValid = false;
      }
    } catch (error) {
      console.log(`❌ ${name}: ${address} - 验证失败: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

// 验证RealEstateSystem合约中的合约引用是否正确
async function verifySystemReferences(provider, contracts) {
  console.log('\n=== 验证系统合约引用 ===');
  
  try {
    // 使用自定义提供器创建合约实例
    const RealEstateSystem = await ethers.getContractFactory('RealEstateSystem');
    const realEstateSystem = RealEstateSystem.attach(contracts.realEstateSystem).connect(provider);
    
    const systemContracts = await realEstateSystem.getSystemContracts();
    
    const expectedAddresses = [
      contracts.roleManager,
      contracts.feeManager,
      contracts.propertyRegistry,
      contracts.tokenFactory,
      contracts.redemptionManager,
      contracts.rentDistributor,
      contracts.marketplace,
      contracts.tokenHolderQuery
    ];
    
    let allReferencesValid = true;
    
    for (let i = 0; i < expectedAddresses.length; i++) {
      const expected = expectedAddresses[i].toLowerCase();
      const actual = systemContracts[i].toLowerCase();
      
      if (expected === actual) {
        console.log(`✅ 系统合约引用 #${i+1}: ${actual} - 匹配`);
      } else {
        console.log(`❌ 系统合约引用 #${i+1}: ${actual} - 不匹配! 期望: ${expected}`);
        allReferencesValid = false;
      }
    }
    
    return allReferencesValid;
  } catch (error) {
    console.error('验证系统合约引用失败:', error);
    return false;
  }
}

// 验证RoleManager的基本功能
async function verifyRoleManager(provider, contracts) {
  console.log('\n=== 验证角色管理器 ===');
  
  try {
    // 使用自定义提供器创建合约实例
    const RoleManager = await ethers.getContractFactory('RoleManager');
    const roleManager = RoleManager.attach(contracts.roleManager).connect(provider);
    
    const [deployer] = await ethers.getSigners();
    
    // 检查角色常量
    const superAdminRole = await roleManager.SUPER_ADMIN();
    const propertyManagerRole = await roleManager.PROPERTY_MANAGER();
    
    console.log(`✅ SuperAdmin角色: ${superAdminRole}`);
    console.log(`✅ PropertyManager角色: ${propertyManagerRole}`);
    
    // 检查部署账户的角色
    const hasSuperAdmin = await roleManager.hasRole(superAdminRole, deployer.address);
    
    if (hasSuperAdmin) {
      console.log(`✅ 部署账户 ${deployer.address} 已分配SuperAdmin角色`);
    } else {
      console.log(`❌ 部署账户 ${deployer.address} 未分配SuperAdmin角色!`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('验证角色管理器失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('=== 开始验证合约部署 ===');
    
    // 设置提供器
    const provider = await setupProvider();
    
    // 加载部署的合约地址
    const contracts = loadDeployedContracts();
    console.log('加载的合约地址:');
    Object.entries(contracts).forEach(([name, address]) => {
      console.log(`  ${name}: ${address}`);
    });
    
    // 验证合约存在性
    const contractsExist = await verifyContractsExistence(provider, contracts);
    if (!contractsExist) {
      console.log('\n❌ 合约存在性验证失败!');
      return;
    }
    
    // 验证系统合约引用
    const referencesValid = await verifySystemReferences(provider, contracts);
    if (!referencesValid) {
      console.log('\n❌ 系统合约引用验证失败!');
      return;
    }
    
    // 验证角色管理器
    const roleManagerValid = await verifyRoleManager(provider, contracts);
    if (!roleManagerValid) {
      console.log('\n❌ 角色管理器验证失败!');
      return;
    }
    
    console.log('\n✅ 所有验证通过! 合约部署成功.');
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 