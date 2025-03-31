/**
 * Debug Token Manager 角色和TokenFactory合约的脚本
 * 检查为什么代币创建功能失败
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('====== 开始调试TokenFactory合约和Token Manager角色 ======');

  // 加载部署状态
  const deployState = require('./deploy-state.json');
  console.log('成功加载部署状态');

  // 获取合约地址
  const tokenFactoryAddress = deployState.tokenFactory;
  const propertyRegistryAddress = deployState.propertyRegistry;
  const roleManagerAddress = deployState.roleManager;

  console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
  console.log(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);
  console.log(`RoleManager合约地址: ${roleManagerAddress}`);

  // 检查合约存在
  const provider = ethers.provider;
  const tokenFactoryCode = await provider.getCode(tokenFactoryAddress);
  console.log(`TokenFactory合约代码大小: ${tokenFactoryCode.length} 字节`);
  if (tokenFactoryCode.length <= 2) {
    console.error('错误: TokenFactory合约代码不存在!');
  }

  // 连接到合约
  const [deployer] = await ethers.getSigners();
  console.log(`\n使用账户: ${deployer.address}`);

  // 检查RoleManager合约
  const RoleManager = await ethers.getContractFactory('RoleManager');
  const roleManager = await RoleManager.attach(roleManagerAddress);
  
  // 获取角色哈希
  const SUPER_ADMIN_ROLE = await roleManager.SUPER_ADMIN();
  const TOKEN_MANAGER_ROLE = await roleManager.TOKEN_MANAGER();
  const PROPERTY_MANAGER_ROLE = await roleManager.PROPERTY_MANAGER();

  console.log(`\n=== 角色哈希 ===`);
  console.log(`SUPER_ADMIN_ROLE: ${SUPER_ADMIN_ROLE}`);
  console.log(`TOKEN_MANAGER_ROLE: ${TOKEN_MANAGER_ROLE}`);
  console.log(`PROPERTY_MANAGER_ROLE: ${PROPERTY_MANAGER_ROLE}`);

  // 检查角色分配
  const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
  const hasTokenManager = await roleManager.hasRole(TOKEN_MANAGER_ROLE, deployer.address);
  const hasPropertyManager = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, deployer.address);

  console.log(`\n=== 部署者角色 ===`);
  console.log(`是否有SUPER_ADMIN角色: ${hasSuperAdmin}`);
  console.log(`是否有TOKEN_MANAGER角色: ${hasTokenManager}`);
  console.log(`是否有PROPERTY_MANAGER角色: ${hasPropertyManager}`);

  // 获取TokenFactory合约
  const TokenFactory = await ethers.getContractFactory('TokenFactory');
  const tokenFactory = await TokenFactory.attach(tokenFactoryAddress);

  console.log(`\n=== TokenFactory合约功能 ===`);
  console.log('检查可用函数...');

  // 获取合约ABI中的函数
  const tokenFactoryFuncs = TokenFactory.interface.fragments
    .filter(fragment => fragment.type === 'function')
    .map(fragment => `${fragment.name}(${fragment.inputs.map(input => input.type).join(',')})`);

  console.log('可用函数:');
  tokenFactoryFuncs.forEach(func => console.log(`- ${func}`));

  // 检查RoleManager地址
  try {
    const tokenFactoryRoleManager = await tokenFactory.roleManager();
    console.log(`\nTokenFactory的RoleManager地址: ${tokenFactoryRoleManager}`);
    console.log(`是否匹配已知的RoleManager地址: ${tokenFactoryRoleManager === roleManagerAddress}`);
  } catch (error) {
    console.error(`无法获取TokenFactory的RoleManager地址: ${error.message}`);
  }

  // 检查TokenFactory的Token模板地址
  try {
    const tokenImplementation = await tokenFactory.tokenImplementation();
    console.log(`\nToken实现合约地址: ${tokenImplementation}`);
    
    // 检查Token实现合约
    const tokenImplCode = await provider.getCode(tokenImplementation);
    console.log(`Token实现合约代码大小: ${tokenImplCode.length} 字节`);
    if (tokenImplCode.length <= 2) {
      console.error('错误: Token实现合约代码不存在!');
    }
  } catch (error) {
    console.error(`无法获取Token实现合约地址: ${error.message}`);
  }

  // 检查PropertyRegistry
  const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');
  const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);

  console.log(`\n=== PropertyRegistry合约检查 ===`);

  // 获取一个测试属性ID
  const testPropertyId = 'TEST-8729';
  
  try {
    const property = await propertyRegistry.getProperty(testPropertyId);
    console.log(`属性 ${testPropertyId} 状态:`, {
      exists: property.exists,
      status: Number(property.status),
      country: property.country,
      registrationTime: new Date(Number(property.registrationTime) * 1000).toISOString()
    });

    // 检查属性是否已批准
    const isApproved = await propertyRegistry.isPropertyApproved(testPropertyId);
    console.log(`属性 ${testPropertyId} 是否已批准: ${isApproved}`);
  } catch (error) {
    console.error(`检查属性时出错: ${error.message}`);
  }

  console.log('\n====== 调试完成 ======');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 