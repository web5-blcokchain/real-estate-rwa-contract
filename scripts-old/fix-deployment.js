/**
 * 部署问题修复工具
 * 该脚本用于诊断和修复常见的部署问题
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { logger } = require('../shared/utils');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

async function main() {
  try {
    logger.info('\n' + '='.repeat(80));
    logger.info('🔧 部署问题修复工具');
    logger.info('='.repeat(80) + '\n');

    // 1. 诊断环境配置
    await checkEnvironment();
    
    // 2. 检查Hardhat网络状态
    await checkHardhatNetwork();
    
    // 3. 检查部署状态
    await checkDeployment();
    
    // 4. 检查角色授权
    await checkRoles();
    
    // 5. 运行测试脚本
    await runBasicTest();
    
    logger.info('\n' + '='.repeat(80));
    logger.info('🎉 修复流程已完成');
    logger.info('='.repeat(80) + '\n');
    
    return { success: true };
  } catch (error) {
    logger.error('修复流程失败:', error);
    return { success: false, error };
  }
}

// 检查环境配置
async function checkEnvironment() {
  logger.info('📋 检查环境配置...');
  
  // 检查关键环境变量
  const criticalVars = [
    'ADMIN_PRIVATE_KEY', 
    'SUPER_ADMIN_PRIVATE_KEY', 
    'PROPERTY_MANAGER_PRIVATE_KEY', 
    'DEPLOYER_PRIVATE_KEY'
  ];
  
  const missingVars = [];
  for (const varName of criticalVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logger.warn(`❌ 缺少以下关键环境变量: ${missingVars.join(', ')}`);
    logger.info('尝试从.env.example复制默认值...');
    
    // 从.env.example复制缺失的环境变量到.env
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const envExampleContent = fs.readFileSync('.env.example', 'utf8');
      
      let updatedEnvContent = envContent;
      const envLines = envExampleContent.split('\n');
      
      for (const varName of missingVars) {
        // 在.env.example中查找变量定义
        const varLine = envLines.find(line => line.startsWith(`${varName}=`));
        if (varLine) {
          updatedEnvContent += `\n# 自动添加的缺失环境变量\n${varLine}\n`;
        }
      }
      
      // 如果有更新，写入.env文件
      if (updatedEnvContent !== envContent) {
        fs.writeFileSync('.env', updatedEnvContent);
        logger.info('✅ 已从.env.example添加缺失的环境变量');
      }
    } catch (error) {
      logger.error(`无法从.env.example复制环境变量: ${error.message}`);
    }
  } else {
    logger.info('✅ 所有关键环境变量已配置');
  }
  
  return true;
}

// 检查Hardhat网络状态
async function checkHardhatNetwork() {
  logger.info('\n📡 检查Hardhat网络状态...');
  
  try {
    // 尝试连接到网络
    await ethers.provider.getBlockNumber();
    logger.info('✅ 已连接到Hardhat网络');
  } catch (error) {
    logger.error('❌ 无法连接到Hardhat网络');
    logger.info('正在尝试重启Hardhat节点...');
    
    // 尝试重启Hardhat节点
    try {
      // 尝试终止现有的节点实例
      spawnSync('pkill', ['-f', 'hardhat node']);
      logger.info('已终止现有的Hardhat节点进程');
      
      // 启动新的节点实例
      const hardhatNode = spawnSync('npx', ['hardhat', 'node', '--hostname', '127.0.0.1', '--port', '8545'], {
        detached: true,
        stdio: 'ignore'
      });
      
      if (hardhatNode.error) {
        throw hardhatNode.error;
      }
      
      logger.info('✅ 已成功启动新的Hardhat节点');
      logger.info('请等待节点初始化 (5秒)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (restartError) {
      logger.error(`无法重启Hardhat节点: ${restartError.message}`);
      logger.info('请手动运行以下命令:');
      logger.info('npx hardhat node --hostname 127.0.0.1 --port 8545');
      return false;
    }
  }
  
  return true;
}

// 检查部署状态
async function checkDeployment() {
  logger.info('\n🔍 检查部署状态...');
  
  // 检查deploy-state.json是否存在
  const deployStatePath = path.join(process.cwd(), 'scripts/deploy-state.json');
  
  if (!fs.existsSync(deployStatePath)) {
    logger.warn('❌ 找不到deploy-state.json文件');
    logger.info('运行完整部署...');
    
    // 运行部署脚本
    try {
      const deployResult = spawnSync('npx', ['hardhat', 'run', 'scripts/deploy-with-new-architecture.js'], {
        stdio: 'inherit'
      });
      
      if (deployResult.error) {
        throw deployResult.error;
      }
      
      if (deployResult.status !== 0) {
        throw new Error(`部署脚本返回错误代码: ${deployResult.status}`);
      }
      
      logger.info('✅ 部署成功完成');
    } catch (deployError) {
      logger.error(`部署失败: ${deployError.message}`);
      return false;
    }
  } else {
    try {
      // 读取并验证部署状态文件
      const deployState = require('../scripts/deploy-state.json');
      
      // 检查必要的合约地址
      let roleManagerAddress, tokenFactoryAddress, propertyRegistryAddress;
      
      if (deployState.contracts) {
        roleManagerAddress = deployState.contracts.roleManager;
        tokenFactoryAddress = deployState.contracts.tokenFactory;
        propertyRegistryAddress = deployState.contracts.propertyRegistry;
      } else {
        roleManagerAddress = deployState.roleManager;
        tokenFactoryAddress = deployState.tokenFactory;
        propertyRegistryAddress = deployState.propertyRegistry;
      }
      
      if (!roleManagerAddress || !tokenFactoryAddress || !propertyRegistryAddress) {
        logger.warn('❌ 部署状态文件不完整，缺少必要的合约地址');
        logger.info('重新运行部署...');
        
        // 强制重新部署
        const deployResult = spawnSync('npx', ['hardhat', 'run', 'scripts/deploy-with-new-architecture.js', '--force'], {
          stdio: 'inherit'
        });
        
        if (deployResult.error || deployResult.status !== 0) {
          throw new Error('强制重新部署失败');
        }
        
        logger.info('✅ 重新部署成功完成');
      } else {
        logger.info('✅ 部署状态文件检查通过');
        logger.info(`RoleManager: ${roleManagerAddress}`);
        logger.info(`TokenFactory: ${tokenFactoryAddress}`);
        logger.info(`PropertyRegistry: ${propertyRegistryAddress}`);
      }
    } catch (error) {
      logger.error(`检查部署状态失败: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

// 检查角色授权
async function checkRoles() {
  logger.info('\n👥 检查角色授权...');
  
  try {
    // 运行角色修复脚本
    const roleFixResult = spawnSync('npx', ['hardhat', 'run', 'scripts/fix-property-manager-role.js'], {
      stdio: 'inherit'
    });
    
    if (roleFixResult.error || roleFixResult.status !== 0) {
      throw new Error('角色修复脚本执行失败');
    }
    
    logger.info('✅ 角色修复脚本执行成功');
  } catch (error) {
    logger.error(`检查角色授权失败: ${error.message}`);
    return false;
  }
  
  return true;
}

// 运行基本测试
async function runBasicTest() {
  logger.info('\n🧪 运行基本测试...');
  
  try {
    const testResult = spawnSync('npx', ['hardhat', 'run', 'scripts/tests/basic-processes-test.js'], {
      stdio: 'inherit'
    });
    
    if (testResult.error) {
      throw testResult.error;
    }
    
    if (testResult.status !== 0) {
      logger.warn('❌ 基本测试失败');
      return false;
    }
    
    logger.info('✅ 基本测试通过');
    return true;
  } catch (error) {
    logger.error(`运行基本测试失败: ${error.message}`);
    return false;
  }
}

// 如果直接运行脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { main }; 