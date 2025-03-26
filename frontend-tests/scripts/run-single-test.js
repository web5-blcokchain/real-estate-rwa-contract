/**
 * 单个测试执行脚本
 * 用于执行特定的测试用例
 */
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '../../.env' });
const path = require('path');
const fs = require('fs');
const { initializeAbis } = require('../../shared/utils/getAbis');
const contractService = require('./contractService');
const { loadConfig } = require('../config');
const testFiles = require('./testFiles');
const { ethers } = require('ethers');

/**
 * 获取测试名称
 * @returns {string} 测试名称
 */
const testName = process.argv[2];

/**
 * 获取测试网络
 * @returns {string} 测试网络
 */
const network = process.env.DEPLOY_NETWORK || 'testnet';
console.log(`使用网络: ${network}`);

/**
 * 获取测试文件列表
 * @returns {string[]} 测试文件列表
 */
const getTestFiles = () => {
  const testDir = path.join(__dirname, '../tests');
  return fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .map(file => file.replace('.test.js', ''));
};

/**
 * 给测试账户转入 ETH
 * @param {Object} provider 以太坊提供者
 * @param {Object} accounts 测试账户
 * @returns {Promise<void>}
 */
async function fundTestAccounts(provider, accounts) {
  try {
    console.log('开始给测试账户转入 ETH...');
    
    // 使用 deployer 账户进行转账
    const deployer = accounts.deployer;
    const deployerAddress = await deployer.getAddress();
    console.log(`部署者地址: ${deployerAddress}`);
    
    // 获取部署者余额
    const deployerBalance = await provider.getBalance(deployerAddress);
    console.log(`部署者余额: ${ethers.formatEther(deployerBalance)} ETH`);
    
    // 给每个测试账户转入 1 ETH
    for (const [role, account] of Object.entries(accounts)) {
      if (role === 'deployer') continue; // 跳过 deployer 账户
      
      const address = await account.getAddress();
      const balance = await provider.getBalance(address);
      
      if (balance === 0n) {
        console.log(`给 ${role} 账户转入 1 ETH...`);
        const tx = await deployer.sendTransaction({
          to: address,
          value: ethers.parseEther('1.0')
        });
        await tx.wait();
        console.log(`${role} 账户已收到 1 ETH`);
      } else {
        console.log(`${role} 账户已有 ${ethers.formatEther(balance)} ETH`);
      }
    }
    
    console.log('测试账户资金准备完成');
  } catch (error) {
    console.error('给测试账户转入 ETH 失败:', error);
    throw error;
  }
}

/**
 * 运行单个测试
 * @param {string} testName 测试名称
 * @returns {Promise<boolean>} 测试是否成功
 */
async function runSingleTest(testName) {
  try {
    console.log(`开始运行测试: ${testName}`);
    
    // 加载配置
    console.log('加载配置...');
    const config = await loadConfig();
    console.log('配置加载完成:', {
      networkConfig: config.networkConfig,
      testAccounts: Object.keys(config.testAccounts),
      testConfig: config.testConfig
    });

    // 初始化ABI
    console.log('初始化ABI...');
    await initializeAbis();
    console.log('ABI初始化完成');

    // 初始化合约服务
    console.log('初始化合约服务...');
    await contractService.initialize();
    console.log('合约服务初始化完成');

    // 获取RPC URL
    console.log(`使用RPC URL: ${config.networkConfig.rpcUrl}`);

    // 给测试账户转入 ETH
    if (config.networkConfig.name === 'hardhat') {
      // 等待合约服务完全初始化
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!contractService.accounts || !contractService.accounts.deployer) {
        throw new Error('合约服务未正确初始化，无法访问账户');
      }
      
      await fundTestAccounts(contractService.provider, contractService.accounts);
    }

    // 获取测试文件
    console.log('获取测试文件...');
    const testFile = require(`../tests/${testName}.test`);
    console.log('测试文件加载成功');

    // 执行测试
    console.log('开始执行测试...');
    const result = await testFile();
    console.log('测试执行完成，结果:', result);

    if (result) {
      console.log(`测试 ${testName} 成功!`);
    } else {
      console.error(`测试 ${testName} 失败!`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`运行测试 ${testName} 时出错:`, error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 主函数
async function main() {
  if (!testName) {
    console.error('请指定要运行的测试名称');
    console.log('可用的测试:');
    getTestFiles().forEach(file => console.log(`- ${file}`));
    process.exit(1);
  }

  const testFiles = getTestFiles();
  if (!testFiles.includes(testName)) {
    console.error(`找不到测试: ${testName}`);
    console.log('可用的测试:');
    testFiles.forEach(file => console.log(`- ${file}`));
    process.exit(1);
  }

  await runSingleTest(testName);
}

// 运行主函数
console.log('程序启动...');
main().catch(error => {
  console.error('程序执行失败:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}); 