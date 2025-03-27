/**
 * 测试部署脚本
 * 用于测试ethers v5兼容性
 */
const { ethers } = require('hardhat');
const { ethers: ethersV5 } = require('../shared/utils/ethers-v5');
const logger = require('../shared/utils/logger');

// 确保部署日志记录器可用
let deployLogger = logger;
if (typeof logger.getLogger === 'function') {
  deployLogger = logger.getLogger('deploy-test');
}

async function main() {
  try {
    console.log('启动简化版部署测试脚本...');
    deployLogger.info('获取部署账户...');
    
    // 获取签名者
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    deployLogger.info(`部署账户: ${deployerAddress}`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    deployLogger.info(`部署网络: ${network.name} (Chain ID: ${network.chainId})`);
    
    // 获取账户余额
    const balance = await ethers.provider.getBalance(deployerAddress);
    deployLogger.info(`账户余额: ${ethersV5.utils.formatEther(balance)} ETH`);
    
    // 部署测试合约 MockERC20
    deployLogger.info('开始部署 MockERC20 合约...');
    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    const mockERC20 = await MockERC20Factory.deploy('Test Token', 'TEST', 18);
    
    // 等待部署完成
    await mockERC20.deployTransaction.wait();
    const mockERC20Address = await mockERC20.address;
    
    deployLogger.info(`MockERC20 部署成功，地址: ${mockERC20Address}`);
    
    // 使用contractAddress兼容函数验证
    if (typeof ethersV5.getContractAddress === 'function') {
      const compatAddress = await ethersV5.getContractAddress(mockERC20);
      deployLogger.info(`通过兼容函数获取地址: ${compatAddress}`);
      if (compatAddress !== mockERC20Address) {
        deployLogger.warn(`地址不匹配! 原地址: ${mockERC20Address}, 兼容地址: ${compatAddress}`);
      }
    }
    
    // 铸造一些代币
    const mintAmount = ethersV5.utils.parseEther('1000');
    const tx = await mockERC20.mint(deployerAddress, mintAmount);
    await tx.wait();
    
    deployLogger.info(`已铸造 1000 TEST 代币到部署账户`);
    
    // 获取余额验证
    const tokenBalance = await mockERC20.balanceOf(deployerAddress);
    deployLogger.info(`代币余额: ${ethersV5.utils.formatEther(tokenBalance)} TEST`);
    
    // 测试完成
    deployLogger.info('部署测试完成！');
    console.log('部署测试成功完成！');
  } catch (error) {
    console.error('部署测试失败:', error);
    deployLogger.error(`部署测试失败: ${error.message}`);
    
    // 提供更多错误细节
    if (error.code) {
      deployLogger.error(`错误代码: ${error.code}`);
    }
    if (error.transaction) {
      deployLogger.error(`交易: ${JSON.stringify({
        hash: error.transaction.hash,
        from: error.transaction.from,
        to: error.transaction.to || '(contract creation)'
      })}`);
    }
    
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main; 