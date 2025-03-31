/**
 * TOKEN_MANAGER角色设置脚本
 * 为部署者账户授予TOKEN_MANAGER角色
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('开始设置TOKEN_MANAGER角色...');

  // 加载部署状态
  const deployState = require('./deploy-state.json');
  console.log('成功加载部署状态');

  // 获取合约地址
  const roleManagerAddress = deployState.roleManager;
  const tokenFactoryAddress = deployState.tokenFactory;
  console.log(`RoleManager合约地址: ${roleManagerAddress}`);
  console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);

  // 连接到合约
  const [deployer] = await ethers.getSigners();
  console.log(`使用账户: ${deployer.address}`);

  const RoleManager = await ethers.getContractFactory('RoleManager');
  const roleManager = await RoleManager.attach(roleManagerAddress);
  console.log('已连接到RoleManager合约');

  // 获取TOKEN_MANAGER角色哈希
  const TOKEN_MANAGER_ROLE = await roleManager.TOKEN_MANAGER();
  console.log(`TOKEN_MANAGER角色哈希: ${TOKEN_MANAGER_ROLE}`);

  // 检查部署者是否已有SUPER_ADMIN角色
  const SUPER_ADMIN_ROLE = await roleManager.SUPER_ADMIN();
  const isSuperAdmin = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
  console.log(`部署者是否有SUPER_ADMIN角色: ${isSuperAdmin}`);

  if (!isSuperAdmin) {
    console.error('部署者没有SUPER_ADMIN角色，无法授予TOKEN_MANAGER角色');
    return;
  }

  // 检查部署者是否已有TOKEN_MANAGER角色
  const hasTokenManagerRole = await roleManager.hasRole(TOKEN_MANAGER_ROLE, deployer.address);
  
  if (hasTokenManagerRole) {
    console.log(`✅ 部署者已有TOKEN_MANAGER角色`);
  } else {
    console.log(`正在为部署者授予TOKEN_MANAGER角色...`);
    const tx = await roleManager.grantRole(TOKEN_MANAGER_ROLE, deployer.address);
    await tx.wait();
    
    // 验证角色是否成功授予
    const hasRoleNow = await roleManager.hasRole(TOKEN_MANAGER_ROLE, deployer.address);
    if (hasRoleNow) {
      console.log(`✅ 成功授予部署者TOKEN_MANAGER角色`);
    } else {
      console.error(`❌ 授予TOKEN_MANAGER角色失败`);
    }
  }

  // 测试TokenFactory权限
  const TokenFactory = await ethers.getContractFactory('TokenFactory');
  const tokenFactory = await TokenFactory.attach(tokenFactoryAddress);
  console.log('已连接到TokenFactory合约，测试权限...');

  // 检查PROPERTY_MANAGER角色
  const PROPERTY_MANAGER_ROLE = await roleManager.PROPERTY_MANAGER();
  const hasPropertyManagerRole = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, deployer.address);
  console.log(`部署者是否有PROPERTY_MANAGER角色: ${hasPropertyManagerRole}`);

  // 如果部署者没有PROPERTY_MANAGER角色，也授予这个角色
  if (!hasPropertyManagerRole) {
    console.log(`正在为部署者授予PROPERTY_MANAGER角色...`);
    const tx = await roleManager.grantRole(PROPERTY_MANAGER_ROLE, deployer.address);
    await tx.wait();
    
    const hasRoleNow = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, deployer.address);
    if (hasRoleNow) {
      console.log(`✅ 成功授予部署者PROPERTY_MANAGER角色`);
    } else {
      console.error(`❌ 授予PROPERTY_MANAGER角色失败`);
    }
  }

  console.log('TOKEN_MANAGER角色设置完成');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 