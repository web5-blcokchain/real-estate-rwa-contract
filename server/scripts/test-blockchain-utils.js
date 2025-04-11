/**
 * 测试 blockchain 工具类
 * 检查和修复钱包管理和合约获取的问题
 */
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { Logger, EnvUtils, Blockchain } = require('../../common');
const { 
  WalletManager, 
  ContractUtils, 
  AbiUtils, 
  ProviderManager 
} = Blockchain;

// 设置日志级别为 debug
process.env.LOG_LEVEL = 'debug';

/**
 * 测试 Provider 管理器
 */
async function testProviderManager() {
  console.log('\n===== 测试 ProviderManager =====');
  try {
    // 测试获取默认 Provider
    console.log('1. 获取默认 Provider...');
    const defaultProvider = ProviderManager.getDefaultProvider();
    console.log(`默认 Provider 类型: ${defaultProvider ? defaultProvider.constructor.name : 'undefined'}`);
    
    // 检查 Provider 是否可用
    console.log('2. 检查 Provider 可用性...');
    const blockNumber = await defaultProvider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);
    
    // 测试获取网络 Provider
    console.log('3. 获取网络 Provider (localhost)...');
    const networkProvider = ProviderManager.getNetworkProvider('localhost');
    console.log(`网络 Provider 类型: ${networkProvider ? networkProvider.constructor.name : 'undefined'}`);
    
    console.log('✓ ProviderManager 测试通过\n');
    return true;
  } catch (error) {
    console.error('✗ ProviderManager 测试失败:', error);
    console.error('详细错误:', error);
    return false;
  }
}

/**
 * 测试钱包管理器
 */
async function testWalletManager() {
  console.log('\n===== 测试 WalletManager =====');
  try {
    // 测试获取默认钱包
    console.log('1. 获取默认钱包...');
    const defaultWallet = WalletManager.getDefaultWallet();
    console.log(`默认钱包地址: ${defaultWallet?.address || 'undefined'}`);
    
    // 测试 ethers v6 创建钱包
    console.log('2. 使用 ethers v6 直接创建钱包...');
    const privateKey = EnvUtils.getString('ADMIN_PRIVATE_KEY');
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const directWallet = new ethers.Wallet(privateKey, provider);
    console.log(`直接创建的钱包地址: ${directWallet.address}`);
    
    // 测试获取角色钱包
    console.log('3. 获取角色钱包 (admin)...');
    try {
      const adminWallet = WalletManager.getRoleWallet('admin');
      console.log(`管理员钱包地址: ${adminWallet?.address || 'undefined'}`);
    } catch (error) {
      console.error('获取管理员钱包失败:', error.message);
      console.log('尝试检查和修复问题...');
      
      // 检查环境变量
      const networkConfig = EnvUtils.getNetworkConfig();
      console.log('网络配置:', {
        network: networkConfig.name,
        adminKey: privateKey ? `${privateKey.slice(0, 6)}...` : 'undefined',
        privateKeys: networkConfig.privateKeys
      });
      
      // 这里可以添加问题修复的代码
    }
    
    // 测试其他角色钱包
    console.log('4. 获取角色钱包 (manager, operator)...');
    try {
      const managerWallet = WalletManager.getRoleWallet('manager');
      console.log(`经理钱包地址: ${managerWallet?.address || 'undefined'}`);
      
      const operatorWallet = WalletManager.getRoleWallet('operator');
      console.log(`操作员钱包地址: ${operatorWallet?.address || 'undefined'}`);
    } catch (error) {
      console.error('获取角色钱包失败:', error.message);
    }
    
    console.log('✓ WalletManager 测试完成\n');
    return true;
  } catch (error) {
    console.error('✗ WalletManager 测试失败:', error);
    console.error('详细错误:', error);
    return false;
  }
}

/**
 * 测试 ABI 工具类
 */
async function testAbiUtils() {
  console.log('\n===== 测试 AbiUtils =====');
  try {
    // 测试获取合约 ABI
    console.log('1. 获取 RealEstateFacade 合约 ABI...');
    const abi = AbiUtils.getAbi('RealEstateFacade');
    console.log(`ABI 获取成功, 函数数量: ${abi ? Object.keys(abi.filter(item => item.type === 'function')).length : 0}`);
    
    // 测试 ethers v6 直接加载 ABI
    console.log('2. 使用 ethers v6 直接加载 ABI...');
    const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
    if (fs.existsSync(abiPath)) {
      const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      console.log(`直接加载 ABI 成功, 函数数量: ${artifact.abi ? Object.keys(artifact.abi.filter(item => item.type === 'function')).length : 0}`);
    } else {
      console.error(`ABI 文件不存在: ${abiPath}`);
    }
    
    console.log('✓ AbiUtils 测试完成\n');
    return true;
  } catch (error) {
    console.error('✗ AbiUtils 测试失败:', error);
    console.error('详细错误:', error);
    return false;
  }
}

/**
 * 测试合约工具类
 */
async function testContractUtils() {
  console.log('\n===== 测试 ContractUtils =====');
  try {
    // 获取合约地址
    const facadeAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log(`RealEstateFacade 合约地址: ${facadeAddress}`);
    
    if (!facadeAddress) {
      console.error('合约地址为空，请检查环境变量配置');
      return false;
    }
    
    // 测试获取合约实例
    console.log('1. 使用 ContractUtils.getContract 获取合约实例...');
    try {
      const contract = await ContractUtils.getContract('RealEstateFacade', facadeAddress);
      console.log(`合约实例创建${contract ? '成功' : '失败'}`);
      if (contract) {
        console.log(`合约地址: ${contract.target}`);
        console.log(`合约函数: ${Object.keys(contract.interface?.functions || {}).join(', ').slice(0, 100)}...`);
      }
    } catch (error) {
      console.error('获取合约实例失败:', error.message);
      console.log('尝试检查和修复问题...');
      
      // 这里可以添加问题修复的代码
    }
    
    // 测试使用角色获取合约实例
    console.log('2. 使用 ContractUtils.getContractWithRole 获取合约实例...');
    try {
      const contract = await ContractUtils.getContractWithRole('RealEstateFacade', facadeAddress, 'admin');
      console.log(`角色合约实例创建${contract ? '成功' : '失败'}`);
    } catch (error) {
      console.error('使用角色获取合约实例失败:', error.message);
    }
    
    // 测试获取只读合约实例
    console.log('3. 使用 ContractUtils.getReadonlyContract 获取只读合约实例...');
    try {
      const contract = await ContractUtils.getReadonlyContract('RealEstateFacade', facadeAddress);
      console.log(`只读合约实例创建${contract ? '成功' : '失败'}`);
    } catch (error) {
      console.error('获取只读合约实例失败:', error.message);
    }
    
    // 测试使用 ethers v6 直接创建合约实例
    console.log('4. 使用 ethers v6 直接创建合约实例...');
    try {
      const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
      const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const privateKey = EnvUtils.getString('ADMIN_PRIVATE_KEY');
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(facadeAddress, artifact.abi, wallet);
      console.log(`ethers v6 直接创建合约实例成功, 地址: ${contract.target}`);
      
      // 调用合约方法
      const version = await contract.getVersion();
      console.log(`合约版本: ${version.toString()}`);
    } catch (error) {
      console.error('直接创建合约实例失败:', error);
    }
    
    console.log('✓ ContractUtils 测试完成\n');
    return true;
  } catch (error) {
    console.error('✗ ContractUtils 测试失败:', error);
    console.error('详细错误:', error);
    return false;
  }
}

/**
 * 主要测试函数
 */
async function main() {
  console.log('===== 开始测试 blockchain 工具类 =====');
  console.log('Node.js 版本:', process.version);
  console.log('ethers.js 版本:', ethers.version);
  
  try {
    // 依次测试各个工具类
    await testProviderManager();
    await testWalletManager();
    await testAbiUtils();
    await testContractUtils();
    
    console.log('\n✅ 所有测试完成');
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
main().catch(error => {
  console.error('运行测试脚本失败:', error);
  process.exit(1);
}); 