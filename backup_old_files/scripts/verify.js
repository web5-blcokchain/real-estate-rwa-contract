/**
 * 合约验证脚本
 * 用于在区块链浏览器上验证合约代码
 */
require('dotenv').config();
const { run, ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');

// 最新部署记录路径
function getLatestDeploymentPath(networkName) {
  return path.join(__dirname, '../scripts/logging', `${networkName}-latest.json`);
}

// 加载最新部署记录
function loadLatestDeployment(networkName) {
  // 首先尝试从scripts/logging目录加载
  const deploymentPath = getLatestDeploymentPath(networkName);
  
  if (fs.existsSync(deploymentPath)) {
    return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  
  // 如果在scripts/logging目录找不到，尝试从scripts/deployments目录加载
  const scriptsDeploymentPath = path.join(__dirname, '../scripts/deployments', `${networkName}-latest.json`);
  if (fs.existsSync(scriptsDeploymentPath)) {
    logger.info(`从scripts/deployments目录加载部署记录: ${scriptsDeploymentPath}`);
    return JSON.parse(fs.readFileSync(scriptsDeploymentPath, 'utf8'));
  }
  
  // 如果在scripts/deployments目录找不到，尝试从deployments目录加载
  const rootDeploymentPath = path.join(__dirname, '../deployments', `${networkName}-latest.json`);
  if (fs.existsSync(rootDeploymentPath)) {
    logger.info(`从deployments目录加载部署记录: ${rootDeploymentPath}`);
    return JSON.parse(fs.readFileSync(rootDeploymentPath, 'utf8'));
  }
  
  // 然后尝试从shared/deployments目录加载
  const sharedDeploymentPath = path.join(__dirname, '../shared/deployments', `${networkName}-latest.json`);
  if (fs.existsSync(sharedDeploymentPath)) {
    logger.info(`从shared/deployments目录加载部署记录: ${sharedDeploymentPath}`);
    return JSON.parse(fs.readFileSync(sharedDeploymentPath, 'utf8'));
  }
  
  // 最后尝试从contracts.json加载
  const scriptLoggingPath = path.join(__dirname, '../scripts/logging/contracts.json');
  if (fs.existsSync(scriptLoggingPath)) {
    logger.info(`从scripts/logging/contracts.json加载部署记录: ${scriptLoggingPath}`);
    return JSON.parse(fs.readFileSync(scriptLoggingPath, 'utf8'));
  }
  
  // 再尝试scripts/deployments下的contracts.json
  const scriptContractsPath = path.join(__dirname, '../scripts/deployments/contracts.json');
  if (fs.existsSync(scriptContractsPath)) {
    logger.info(`从scripts/deployments/contracts.json加载部署记录: ${scriptContractsPath}`);
    return JSON.parse(fs.readFileSync(scriptContractsPath, 'utf8'));
  }
  
  // 最后尝试shared目录下的contracts.json
  const contractsPath = path.join(__dirname, '../shared/deployments/contracts.json');
  if (fs.existsSync(contractsPath)) {
    logger.info(`从shared/deployments/contracts.json加载部署记录: ${contractsPath}`);
    return JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
  }
  
  throw new Error(`未找到网络 ${networkName} 的部署记录`);
}

async function main() {
  try {
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${network.chainId}`;
    
    logger.info(`网络: ${networkName} (Chain ID: ${network.chainId})`);
    
    // 加载部署记录
    const deployment = loadLatestDeployment(networkName);
    logger.info(`加载部署记录: ${deployment.timestamp}`);
    logger.info(`部署策略: ${deployment.strategy}`);
    
    // 检查是否为可升级部署
    const isUpgradeable = deployment.strategy === 'upgradeable';
    
    // 要验证的合约名称和地址
    const contracts = [
      { name: 'RoleManager', address: deployment.contracts.RoleManager },
      { name: 'FeeManager', address: deployment.contracts.FeeManager },
      { name: 'PropertyRegistry', address: deployment.contracts.PropertyRegistry },
      { name: 'TokenFactory', address: deployment.contracts.TokenFactory },
      { name: 'RealEstateSystem', address: deployment.contracts.RealEstateSystem }
    ];
    
    // 添加可选合约
    if (deployment.contracts.RentDistributor) {
      contracts.push({ name: 'RentDistributor', address: deployment.contracts.RentDistributor });
    }
    
    if (deployment.contracts.RedemptionManager) {
      contracts.push({ name: 'RedemptionManager', address: deployment.contracts.RedemptionManager });
    }
    
    if (deployment.contracts.Marketplace) {
      contracts.push({ name: 'Marketplace', address: deployment.contracts.Marketplace });
    }
    
    if (deployment.contracts.TokenHolderQuery) {
      contracts.push({ name: 'TokenHolderQuery', address: deployment.contracts.TokenHolderQuery });
    }
    
    // 库合约
    if (deployment.libraries && deployment.libraries.SystemDeployerLib1) {
      contracts.push({ name: 'SystemDeployerLib1', address: deployment.libraries.SystemDeployerLib1 });
    }
    
    if (deployment.libraries && deployment.libraries.SystemDeployerLib2) {
      contracts.push({ name: 'SystemDeployerLib2', address: deployment.libraries.SystemDeployerLib2 });
    }
    
    logger.info(`===== 开始验证合约 (${isUpgradeable ? '可升级' : '标准'}模式) =====`);
    
    // 验证实现合约（如果是可升级模式）
    if (isUpgradeable && deployment.implementations) {
      logger.info('验证实现合约...');
      
      for (const [contractName, address] of Object.entries(deployment.implementations)) {
        try {
          logger.info(`验证 ${contractName} 实现合约: ${address}`);
          
          await run('verify:verify', {
            address: address,
            constructorArguments: []
          });
          
          logger.info(`${contractName} 实现合约验证成功`);
        } catch (error) {
          if (error.message.includes('Already Verified')) {
            logger.info(`${contractName} 实现合约已经验证过`);
          } else {
            logger.error(`${contractName} 实现合约验证失败: ${error.message}`);
          }
        }
      }
    }
    
    // 验证标准合约或代理合约
    for (const contract of contracts) {
      try {
        logger.info(`验证 ${contract.name}: ${contract.address}`);
        
        await run('verify:verify', {
          address: contract.address,
          constructorArguments: []
        });
        
        logger.info(`${contract.name} 验证成功`);
      } catch (error) {
        if (error.message.includes('Already Verified')) {
          logger.info(`${contract.name} 已经验证过`);
        } else if (error.message.includes('Proxy')) {
          logger.info(`${contract.name} 是代理合约，跳过验证`);
        } else {
          logger.error(`${contract.name} 验证失败: ${error.message}`);
        }
      }
    }
    
    logger.info('===== 合约验证完成 =====');
    
  } catch (error) {
    logger.error('合约验证失败:', error);
    throw error;
  } finally {
    closeLoggers();
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

module.exports = { main }; 