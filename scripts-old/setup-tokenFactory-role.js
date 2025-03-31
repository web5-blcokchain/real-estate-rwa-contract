const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const { ROLES, grantRole, hasRole } = require('./utils/roles');

// 辅助函数
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
const logSuccess = (message) => console.log(`✅ ${message}`);
const logError = (message, error) => {
  console.error(`❌ ${message}`);
  if (error) console.error(error.message || error);
};

async function main() {
  try {
    log('开始设置TokenFactory角色权限...');
    
    // 加载部署状态
    const deployStatePath = path.join(__dirname, 'deploy-state.json');
    if (!fs.existsSync(deployStatePath)) {
      throw new Error(`部署状态文件不存在: ${deployStatePath}`);
    }
    
    const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
    log('成功加载部署状态');
    
    // 获取合约地址
    const roleManagerAddress = deployState.roleManager;
    const tokenFactoryAddress = deployState.tokenFactory;
    
    if (!roleManagerAddress) throw new Error('RoleManager地址未找到');
    if (!tokenFactoryAddress) throw new Error('TokenFactory地址未找到');
    
    log(`RoleManager合约地址: ${roleManagerAddress}`);
    log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
    
    // 连接到合约
    const [deployer] = await ethers.getSigners();
    log(`使用部署者账户: ${deployer.address}`);
    
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
    
    log('成功连接到合约');
    
    // 为TokenFactory合约授予所需角色
    log('开始为TokenFactory授予关键角色...');
    
    // 授予PROPERTY_MANAGER角色
    await grantRole(roleManager, ROLES.PROPERTY_MANAGER, tokenFactoryAddress);
    
    // 授予TOKEN_MANAGER角色
    await grantRole(roleManager, ROLES.TOKEN_MANAGER, tokenFactoryAddress);
    
    // 授予SNAPSHOT_ROLE角色
    await grantRole(roleManager, ROLES.SNAPSHOT, tokenFactoryAddress);
    
    // 授予MINTER_ROLE角色
    await grantRole(roleManager, ROLES.MINTER, tokenFactoryAddress);
    
    // 为部署者账户也授予关键角色
    log('开始为部署者授予关键角色...');
    
    // 部署者获得MINTER_ROLE
    await grantRole(roleManager, ROLES.MINTER, deployer.address);
    
    // 检查token implementation合约地址
    try {
      const tokenImplAddress = await tokenFactory.tokenImplementation();
      log(`Token实现合约地址: ${tokenImplAddress}`);
      
      // 为token implementation合约也授予MINTER_ROLE
      await grantRole(roleManager, ROLES.MINTER, tokenImplAddress);
    } catch (error) {
      logError('获取或授权Token实现合约失败', error);
    }
    
    logSuccess('TokenFactory权限设置完成');
    
  } catch (error) {
    logError('设置TokenFactory角色权限时出错', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 