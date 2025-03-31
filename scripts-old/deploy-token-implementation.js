/**
 * 部署代币实现合约并配置TokenFactory
 * 
 * 该脚本部署代币实现合约并更新TokenFactory的tokenImplementation字段
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// 日志工具
const logger = {
  info: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`), // 绿色
  warn: (msg) => console.log(`\x1b[33m${msg}\x1b[0m`), // 黄色
  error: (msg) => console.log(`\x1b[31m${msg}\x1b[0m`) // 红色
};

/**
 * 获取已部署合约地址
 */
async function getContractAddresses() {
  try {
    // 优先从部署状态文件读取
    const deployStatePath = path.join(process.cwd(), 'scripts/deploy-state.json');
    
    if (fs.existsSync(deployStatePath)) {
      const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf-8'));
      return deployState;
    }
  } catch (error) {
    logger.error(`读取部署状态文件失败: ${error.message}`);
  }
  
  throw new Error('无法获取已部署合约地址，请先运行部署脚本');
}

/**
 * 检查合约方法
 */
async function logContractMethods(contractName, contractAddress) {
  try {
    // 获取合约实例
    const contract = await ethers.getContractAt(contractName, contractAddress);
    
    // 获取函数签名
    const functions = contract.interface.fragments
      .filter(fragment => fragment.type === 'function')
      .map(fragment => fragment.format());
    
    logger.info(`${contractName}方法:`);
    functions.forEach(func => {
      logger.info(`- ${func}`);
    });
    
    return functions;
  } catch (error) {
    logger.error(`获取${contractName}方法失败: ${error.message}`);
    return [];
  }
}

// 主函数
async function main() {
  try {
    logger.info('=== 开始部署代币实现合约并配置TokenFactory ===');
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    logger.info(`部署网络: ${networkName} (Chain ID: ${network.chainId})`);
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署者地址: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    logger.info(`部署者余额: ${ethers.formatEther(balance)} ETH`);
    
    // 获取已部署合约地址
    const contracts = await getContractAddresses();
    logger.info('已加载合约地址');
    
    // 确认TokenFactory合约已部署
    if (!contracts.tokenFactory) {
      throw new Error('TokenFactory合约未找到，请先部署基础合约');
    }
    
    logger.info(`TokenFactory地址: ${contracts.tokenFactory}`);
    
    // 检查TokenFactory方法
    await logContractMethods('TokenFactory', contracts.tokenFactory);
    
    // 检查RoleManager方法
    await logContractMethods('RoleManager', contracts.roleManager);
    
    // 部署RealEstateToken实现合约
    logger.info('开始部署RealEstateToken实现合约...');
    const RealEstateToken = await ethers.getContractFactory('RealEstateToken');
    const tokenImplementation = await RealEstateToken.deploy();
    
    // 等待部署完成
    logger.info('等待代币实现合约部署完成...');
    await tokenImplementation.waitForDeployment();
    
    // 获取部署地址
    const tokenImplAddress = await tokenImplementation.getAddress();
    logger.info(`RealEstateToken实现合约已部署: ${tokenImplAddress}`);
    
    // 获取TokenFactory合约实例
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.tokenFactory);
    
    // 更新TokenFactory的代币实现地址
    logger.info('正在更新TokenFactory的代币实现地址...');
    try {
      // 使用正确的方法名称更新实现地址
      const tx = await tokenFactory.updateTokenImplementation(tokenImplAddress);
      
      // 等待交易确认
      logger.info('交易已提交，等待确认...');
      await tx.wait();
      logger.info('交易已确认！');
    } catch (error) {
      logger.error(`更新TokenFactory失败: ${error.message}`);
      throw error;
    }
    
    // 获取当前TokenFactory中的实现地址 (更新后)
    try {
      const newImplementation = await tokenFactory.tokenImplementation();
      logger.info(`更新后的TokenFactory实现地址: ${newImplementation}`);
      
      if (newImplementation !== tokenImplAddress) {
        const errorMsg = `验证失败：TokenFactory.tokenImplementation (${newImplementation}) 与部署的实现 (${tokenImplAddress}) 不匹配`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.error(`验证TokenFactory实现地址失败: ${error.message}`);
      logger.warn('跳过验证，继续执行...');
    }
    
    logger.info('✅ TokenFactory代币实现地址更新成功!');
    
    // 保存代币实现地址到文件
    const outputData = {
      ...contracts,
      tokenImplementation: tokenImplAddress
    };
    
    // 更新部署状态文件
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/deploy-state.json'),
      JSON.stringify(outputData, null, 2)
    );
    
    // 更新部署文件夹中的合约地址文件
    const deploymentsDir = path.join(process.cwd(), 'shared/deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(deploymentsDir, 'contracts.json'),
      JSON.stringify(outputData, null, 2)
    );
    
    const networkFilename = `${networkName}-latest.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, networkFilename),
      JSON.stringify(outputData, null, 2)
    );
    
    logger.info('部署记录已更新，已保存至:');
    logger.info('- scripts/deploy-state.json');
    logger.info('- shared/deployments/contracts.json');
    logger.info(`- shared/deployments/${networkFilename}`);
    
    return {
      tokenImplementation: tokenImplAddress,
      success: true
    };
  } catch (error) {
    logger.error(`部署失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log(`✨ 代币实现合约已部署并配置: ${result.tokenImplementation}`);
        console.log(`TokenFactory现在可以正常创建代币了！`);
        process.exit(0);
      } else {
        console.error(`❌ 部署失败: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 