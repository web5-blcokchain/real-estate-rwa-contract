/**
 * 基础合约部署脚本
 * 用于开发和测试环境的快速部署
 */
require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// 部署记录文件路径
const DEPLOY_STATE_FILE = path.join(__dirname, '../deploy-state.json');

// 等待函数
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 保存部署状态
function saveDeployState(state) {
  // 转换格式以符合contracts.js的加载格式
  // 使用与artifacts文件夹中相同的合约名称格式
  const deployData = {
    contracts: {
      RoleManager: state.addresses.roleManager,
      FeeManager: state.addresses.feeManager, 
      PropertyRegistry: state.addresses.propertyRegistry,
      RentDistributor: state.addresses.rentDistributor,
      TokenFactory: state.addresses.tokenFactory,
      RedemptionManager: state.addresses.redemptionManager,
      Marketplace: state.addresses.marketplace,
      TokenHolderQuery: state.addresses.tokenHolderQuery,
      RealEstateSystem: state.addresses.realEstateSystem
    }
  };

  fs.writeFileSync(
    DEPLOY_STATE_FILE,
    JSON.stringify(deployData, null, 2)
  );
  console.log(`部署状态已保存到 ${DEPLOY_STATE_FILE}`);
}

// 加载部署状态
function loadDeployState() {
  if (fs.existsSync(DEPLOY_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
  }
  return { addresses: {} };
}

// 部署合约并等待确认
async function deploy(contractName, constructorArgs = []) {
  console.log(`部署 ${contractName}...`);
  
  // 创建合约工厂
  const ContractFactory = await ethers.getContractFactory(contractName);
  
  // 部署合约
  const contract = await ContractFactory.deploy(...constructorArgs);
  console.log(`${contractName} 部署交易已提交: ${contract.deploymentTransaction().hash}`);
  
  // 等待部署确认
  await contract.deploymentTransaction().wait();
  const contractAddress = await contract.getAddress();
  console.log(`${contractName} 部署成功，地址: ${contractAddress}`);
  
  return { name: contractName, address: contractAddress };
}

// 主部署函数
async function main() {
  try {
    console.log('开始部署基础合约...');
    
    // 获取部署者信息
    const [deployer] = await ethers.getSigners();
    console.log(`部署者地址: ${deployer.address}`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`部署网络: ${network.name || 'unknown'} (ChainID: ${network.chainId})`);
    
    // 加载现有部署状态
    const deployState = loadDeployState();
    if (!deployState.addresses) {
      deployState.addresses = {};
    }
    
    // 部署角色管理器
    const roleManager = await deploy('RoleManager');
    deployState.addresses.roleManager = roleManager.address;
    
    // 部署费用管理器
    const feeManager = await deploy('FeeManager');
    deployState.addresses.feeManager = feeManager.address;
    
    // 部署房产注册中心
    const propertyRegistry = await deploy('PropertyRegistry');
    deployState.addresses.propertyRegistry = propertyRegistry.address;
    
    // 部署租金分配器
    const rentDistributor = await deploy('RentDistributor');
    deployState.addresses.rentDistributor = rentDistributor.address;
    
    // 部署代币工厂
    const tokenFactory = await deploy('TokenFactory');
    deployState.addresses.tokenFactory = tokenFactory.address;
    
    // 部署赎回管理器
    const redemptionManager = await deploy('RedemptionManager');
    deployState.addresses.redemptionManager = redemptionManager.address;
    
    // 部署市场
    const marketplace = await deploy('Marketplace');
    deployState.addresses.marketplace = marketplace.address;
    
    // 部署代币持有者查询器
    const tokenHolderQuery = await deploy('TokenHolderQuery');
    deployState.addresses.tokenHolderQuery = tokenHolderQuery.address;
    
    // 部署房地产系统
    const realEstateSystem = await deploy('RealEstateSystem');
    deployState.addresses.realEstateSystem = realEstateSystem.address;
    
    // 执行必要的角色授权和初始化
    console.log('开始进行角色授权和合约初始化...');
    
    // 获取合约实例
    const roleManagerContract = await ethers.getContractAt('RoleManager', roleManager.address);
    const propertyRegistryContract = await ethers.getContractAt('PropertyRegistry', propertyRegistry.address);
    const tokenFactoryContract = await ethers.getContractAt('TokenFactory', tokenFactory.address);
    const realEstateSystemContract = await ethers.getContractAt('RealEstateSystem', realEstateSystem.address);
    const rentDistributorContract = await ethers.getContractAt('RentDistributor', rentDistributor.address);
    const redemptionManagerContract = await ethers.getContractAt('RedemptionManager', redemptionManager.address);
    const feeManagerContract = await ethers.getContractAt('FeeManager', feeManager.address);
    const marketplaceContract = await ethers.getContractAt('Marketplace', marketplace.address);
    
    // 初始化各合约
    console.log('初始化各合约...');
    
    try {
      // 初始化RoleManager
      console.log('初始化RoleManager...');
      let tx = await roleManagerContract.initialize();
      await tx.wait();
      console.log('RoleManager初始化成功');
      
      // 初始化PropertyRegistry
      console.log('初始化PropertyRegistry...');
      tx = await propertyRegistryContract.initialize(roleManager.address);
      await tx.wait();
      console.log('PropertyRegistry初始化成功');
      
      // 初始化TokenFactory
      console.log('初始化TokenFactory...');
      tx = await tokenFactoryContract.initialize(roleManager.address);
      await tx.wait();
      console.log('TokenFactory初始化成功');
      
      // 初始化RentDistributor
      console.log('初始化RentDistributor...');
      tx = await rentDistributorContract.initialize(roleManager.address);
      await tx.wait();
      console.log('RentDistributor初始化成功');
      
      // 初始化RedemptionManager
      console.log('初始化RedemptionManager...');
      tx = await redemptionManagerContract.initialize(roleManager.address);
      await tx.wait();
      console.log('RedemptionManager初始化成功');
      
      // 初始化FeeManager
      console.log('初始化FeeManager...');
      tx = await feeManagerContract.initialize(roleManager.address);
      await tx.wait();
      console.log('FeeManager初始化成功');
      
      // 初始化Marketplace
      console.log('初始化Marketplace...');
      tx = await marketplaceContract.initialize(roleManager.address);
      await tx.wait();
      console.log('Marketplace初始化成功');
      
      // 初始化RealEstateSystem
      console.log('初始化RealEstateSystem...');
      tx = await realEstateSystemContract.initialize(
        roleManager.address,
        feeManager.address,
        propertyRegistry.address,
        tokenFactory.address,
        redemptionManager.address,
        rentDistributor.address,
        marketplace.address,
        tokenHolderQuery.address
      );
      await tx.wait();
      console.log('RealEstateSystem初始化成功');
      
    } catch (error) {
      console.error('合约基础初始化失败:', error.message);
      console.log('继续尝试进行角色授权...');
    }
    
    // 设置角色权限
    console.log('设置角色权限...');
    try {
      // 获取DEFAULT_ADMIN_ROLE
      const DEFAULT_ADMIN_ROLE = await roleManagerContract.DEFAULT_ADMIN_ROLE();
      console.log(`找到DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
      
      // 授予部署者管理员角色
      console.log(`授予部署者 ${deployer.address} 管理员角色...`);
      let tx = await roleManagerContract.grantRole(DEFAULT_ADMIN_ROLE, deployer.address);
      await tx.wait();
      console.log('管理员角色授权成功');
      
      // 授予PROPERTY_MANAGER角色给部署者，以便注册房产
      const PROPERTY_MANAGER_ROLE = await propertyRegistryContract.PROPERTY_MANAGER_ROLE();
      console.log(`找到PROPERTY_MANAGER_ROLE: ${PROPERTY_MANAGER_ROLE}`);
      tx = await roleManagerContract.grantRole(PROPERTY_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log('房产管理员角色授权成功');
      
      // 授予TOKEN_MANAGER角色给部署者，以便创建代币
      const TOKEN_MANAGER_ROLE = await tokenFactoryContract.TOKEN_MANAGER_ROLE();
      console.log(`找到TOKEN_MANAGER_ROLE: ${TOKEN_MANAGER_ROLE}`);
      tx = await roleManagerContract.grantRole(TOKEN_MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log('代币管理员角色授权成功');
      
    } catch (error) {
      console.error('角色授权失败:', error.message);
      console.log('继续执行其他初始化步骤...');
    }
    
    // 设置合约间关联关系
    console.log('设置合约关联关系...');
    try {
      // TokenFactory, RentDistributor和RedemptionManager没有找到相关的setter方法
      // 这些关联关系应该在initialize时设置，或者有不同名称的方法
      console.log('注意：合约关联关系需要在初始化时设置或通过其他方法设置');
      console.log('建议查看合约代码确认正确的设置方法');
    } catch (error) {
      console.error('合约关联关系设置失败:', error.message);
    }
    
    // 保存部署状态
    saveDeployState(deployState);
    
    console.log('部署和初始化完成！');
  } catch (error) {
    console.error('部署失败:', error);
    throw error;
  }
}

// 运行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 