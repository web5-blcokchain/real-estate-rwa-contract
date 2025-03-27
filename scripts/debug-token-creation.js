/**
 * 调试代币创建问题
 * 尝试手动步骤创建代币并识别具体失败原因
 */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const { getContractAddresses } = require('../shared/config/contracts');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');

/**
 * 手动创建一个TransparentUpgradeableProxy来代替TokenFactory的_deployProxy函数
 */
async function manuallyDeployProxy(implementationAddress, adminAddress, initData) {
  // 部署TransparentUpgradeableProxy合约
  const TransparentProxyFactory = await ethers.getContractFactory('TransparentUpgradeableProxy');
  console.log(`使用实现合约: ${implementationAddress}`);
  console.log(`使用管理员地址: ${adminAddress}`);
  console.log(`初始化数据长度: ${initData.length}字节`);
  
  // 部署代理
  try {
    const proxy = await TransparentProxyFactory.deploy(
      implementationAddress,
      adminAddress,
      initData
    );
    
    // 等待部署完成
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    
    console.log(`✅ 代理合约已部署: ${proxyAddress}`);
    return proxyAddress;
  } catch (error) {
    console.error(`❌ 代理部署失败: ${error.message}`);
    throw error;
  }
}

/**
 * 使用_deployProxy创建代币
 */
async function createTokenViaProxyManually() {
  // 获取合约地址
  const contracts = getContractAddresses();
  
  // 获取必要的合约实例
  const [deployer] = await ethers.getSigners();
  const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory, deployer);
  const roleManager = await ethers.getContractAt('RoleManager', contracts.RoleManager, deployer);
  const propertyRegistry = await ethers.getContractAt('PropertyRegistry', contracts.PropertyRegistry, deployer);
  
  // 获取最新的房产ID
  const allPropertyIds = await propertyRegistry.getAllPropertyIds();
  const propertyId = allPropertyIds[allPropertyIds.length - 1];
  
  // 创建代币参数
  const tokenName = `Debug Token ${Date.now()}`;
  const tokenSymbol = `DBG${Date.now().toString().slice(-4)}`;
  
  // 检查代币实现地址
  const tokenImplementation = await tokenFactory.tokenImplementation();
  console.log(`TokenImplementation address: ${tokenImplementation}`);
  
  // 获取RealEstateToken的ABI以编码初始化数据
  const RealEstateToken = await ethers.getContractFactory('RealEstateToken');
  
  // 编码初始化数据
  const initData = RealEstateToken.interface.encodeFunctionData('initialize', [
    propertyId,
    tokenName,
    tokenSymbol,
    deployer.address,
    await propertyRegistry.getAddress()
  ]);
  
  console.log('\n开始手动部署代理...');
  try {
    // 手动部署代理
    const proxyAddress = await manuallyDeployProxy(
      tokenImplementation,
      await roleManager.getAddress(),
      initData
    );
    
    // 测试获取代币名称
    const token = await ethers.getContractAt('RealEstateToken', proxyAddress);
    const actualName = await token.name();
    const actualSymbol = await token.symbol();
    
    console.log(`✅ 代币创建成功!`);
    console.log(`- 名称: ${actualName}`);
    console.log(`- 符号: ${actualSymbol}`);
    console.log(`- 地址: ${proxyAddress}`);
    
    return proxyAddress;
  } catch (error) {
    console.error(`❌ 手动部署失败: ${error.message}`);
    
    // 尝试获取更多错误详情
    if (error.data) {
      console.error(`错误数据: ${JSON.stringify(error.data)}`);
    }
    
    return null;
  }
}

/**
 * 检查PropertyRegistry和代币创建的先决条件
 */
async function checkPrerequisites() {
  console.log('检查代币创建的先决条件...');
  
  // 获取合约地址
  const contracts = getContractAddresses();
  
  // 获取必要的合约实例
  const [deployer] = await ethers.getSigners();
  const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory, deployer);
  const roleManager = await ethers.getContractAt('RoleManager', contracts.RoleManager, deployer);
  const propertyRegistry = await ethers.getContractAt('PropertyRegistry', contracts.PropertyRegistry, deployer);
  
  // 检查代币实现地址
  const tokenImplementation = await tokenFactory.tokenImplementation();
  console.log(`1. 代币实现地址: ${tokenImplementation}`);
  console.log(`   是否为零地址: ${tokenImplementation === ethers.ZeroAddress ? '是 ❌' : '否 ✅'}`);
  
  // 检查角色
  const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
  const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
  console.log(`2. 部署者拥有SUPER_ADMIN角色: ${hasSuperAdmin ? '是 ✅' : '否 ❌'}`);
  
  // 检查最新的房产ID
  const allPropertyIds = await propertyRegistry.getAllPropertyIds();
  
  if (allPropertyIds.length === 0) {
    console.log('3. 未找到已注册的房产 ❌');
    return false;
  }
  
  const propertyId = allPropertyIds[allPropertyIds.length - 1];
  console.log(`3. 最新房产ID: ${propertyId}`);
  
  // 检查房产状态
  const property = await propertyRegistry.properties(propertyId);
  console.log(`4. 房产状态: ${property.status}`);
  console.log(`   是否已批准: ${await propertyRegistry.isPropertyApproved(propertyId) ? '是 ✅' : '否 ❌'}`);
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('====== 开始调试代币创建问题 ======');
    
    // 检查先决条件
    const prerequisitesPass = await checkPrerequisites();
    if (!prerequisitesPass) {
      console.log('先决条件检查未通过，无法继续');
      return false;
    }
    
    console.log('\n尝试手动创建代币...');
    const tokenAddress = await createTokenViaProxyManually();
    
    if (tokenAddress) {
      console.log('\n✅ 成功! 手动方法可以创建代币');
      console.log(`问题可能在TokenFactory合约的内部实现`);
      return true;
    } else {
      console.log('\n❌ 失败! 即使手动方法也无法创建代币');
      console.log(`问题可能是由于RealEstateToken实现合约本身或初始化参数`);
      return false;
    }
  } catch (error) {
    console.error(`调试过程失败: ${error.message}`);
    console.error(error);
    return false;
  } finally {
    closeLoggers();
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(result => {
      console.log(`\n调试完成，结果: ${result ? '成功' : '失败'}`);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 