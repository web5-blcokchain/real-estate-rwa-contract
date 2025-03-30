/**
 * 角色授权脚本
 * 自动为部署者账户设置必要的系统角色
 */
require('dotenv').config();
const { ethers } = require('hardhat');
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
    
    // 获取部署者
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 获取RoleManager合约实例
    const roleManager = await ethers.getContractAt('RoleManager', deployment.contracts.RoleManager, deployer);
    
    // 检查角色并授权
    const rolesToGrant = [
      { name: 'SUPER_ADMIN', method: 'SUPER_ADMIN' },
      { name: 'PROPERTY_MANAGER', method: 'PROPERTY_MANAGER' },
      { name: 'TOKEN_MANAGER', method: 'TOKEN_MANAGER' },
      { name: 'MARKETPLACE_MANAGER', method: 'MARKETPLACE_MANAGER' },
      { name: 'FEE_MANAGER', method: 'FEE_MANAGER' },
      { name: 'REDEMPTION_MANAGER', method: 'REDEMPTION_MANAGER' }
    ];
    
    logger.info('===== 开始设置角色 =====');
    
    // 首先检查默认管理员角色
    const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
    const hasDefaultAdmin = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    logger.info(`部署者拥有DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin}`);
    
    if (!hasDefaultAdmin) {
      logger.warn('部署者没有DEFAULT_ADMIN_ROLE，尝试使用紧急恢复函数');
      const tx = await roleManager.emergencyRecoverAdmin();
      await tx.wait();
      
      const hasAdminNow = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      logger.info(`DEFAULT_ADMIN_ROLE恢复结果: ${hasAdminNow ? '成功' : '失败'}`);
    }
    
    // 设置其他角色
    for (const role of rolesToGrant) {
      try {
        const roleId = await roleManager[role.method]();
        const hasRole = await roleManager.hasRole(roleId, deployer.address);
        
        if (!hasRole) {
          logger.info(`授予${role.name}角色...`);
          
          // 首先尝试使用标准方式授权
          let tx;
          try {
            tx = await roleManager.grantRole(roleId, deployer.address);
          } catch (err) {
            // 如果标准方式失败，尝试紧急授权
            logger.warn(`标准授权失败，尝试紧急授权: ${err.message}`);
            tx = await roleManager.emergencyGrantRole(roleId, deployer.address);
          }
          
          await tx.wait();
          
          // 检查是否成功
          const hasRoleNow = await roleManager.hasRole(roleId, deployer.address);
          logger.info(`${role.name}角色授权${hasRoleNow ? '成功' : '失败'}`);
        } else {
          logger.info(`部署者已拥有${role.name}角色`);
        }
      } catch (error) {
        logger.error(`授予${role.name}角色失败: ${error.message}`);
      }
    }
    
    logger.info('===== 角色设置完成 =====');
    
    // 验证关键角色
    logger.info('验证关键角色设置...');
    const hasSuperAdmin = await roleManager.hasRole(await roleManager.SUPER_ADMIN(), deployer.address);
    const hasPropertyManager = await roleManager.hasRole(await roleManager.PROPERTY_MANAGER(), deployer.address);
    
    if (hasSuperAdmin && hasPropertyManager) {
      logger.info('关键角色验证成功!');
    } else {
      logger.warn('关键角色验证失败! 请手动检查角色设置');
    }
    
  } catch (error) {
    logger.error('角色设置失败:', error);
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