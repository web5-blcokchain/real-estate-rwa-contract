/**
 * 智能合约部署流程脚本
 * 替代deploy.sh的功能，提供完整的合约部署、角色设置和验证流程
 */
require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');
const { DeploymentStrategy } = require('../shared/config/deployment');
const setupRoles = require('./setup-roles').main;

// 命令行参数处理
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

/**
 * 显示彩色输出
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * 运行Hardhat命令
 */
function runHardhatCommand(scriptPath, network, extraEnv = {}) {
  const env = {
    ...process.env,
    ...extraEnv
  };

  try {
    const command = `npx hardhat run ${scriptPath} --network ${network}`;
    console.log(`${colors.blue}执行命令: ${command}${colors.reset}`);
    
    const output = execSync(command, { 
      env, 
      stdio: 'inherit'
    });
    
    return { success: true, output };
  } catch (error) {
    console.error(`${colors.red}执行命令失败: ${error.message}${colors.reset}`);
    return { success: false, error };
  }
}

/**
 * 部署合约
 */
async function deployContracts(network, strategy, forceDeploy) {
  console.log(`${colors.green}=== 开始部署合约 ===${colors.reset}`);
  
  // 设置环境变量
  const env = {
    DEPLOY_STRATEGY: strategy,
    FORCE_DEPLOY: forceDeploy ? 'true' : 'false',
    SKIP_GAS_CONFIRMATION: 'true' // 自动确认gas估算
  };

  // 使用force-deploy.js脚本进行强制部署，避免gas估算问题
  const scriptPath = forceDeploy ? './scripts/force-deploy.js' : './scripts/deploy.js';
  const result = runHardhatCommand(scriptPath, network, env);
  
  if (!result.success) {
    throw new Error('部署合约失败');
  }
  
  console.log(`${colors.green}✅ 合约部署完成${colors.reset}`);
  return true;
}

/**
 * 部署代币实现
 */
async function deployTokenImplementation(network) {
  console.log(`${colors.green}=== 开始部署代币实现 ===${colors.reset}`);
  
  // 确保部署状态文件存在
  const deployStatePath = path.join(process.cwd(), 'scripts/deploy-state.json');
  if (!fs.existsSync(deployStatePath)) {
    console.error(`${colors.red}错误: 找不到deploy-state.json文件，请先部署基础合约${colors.reset}`);
    return false;
  }
  
  // 检查TokenFactory是否已部署
  const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf-8'));
  if (!deployState.TokenFactory) {
    console.error(`${colors.red}错误: TokenFactory尚未部署，请先部署基础合约${colors.reset}`);
    return false;
  }
  
  // 部署RealEstateToken实现并设置TokenFactory
  const result = runHardhatCommand('./scripts/deploy-token-implementation.js', network);
  
  if (!result.success) {
    console.error(`${colors.yellow}⚠️ 代币实现部署失败!${colors.reset}`);
    console.error(`${colors.yellow}TokenFactory的tokenImplementation可能未正确设置${colors.reset}`);
    console.error(`${colors.yellow}完整业务流程测试可能会失败，代币创建将无法正常工作${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✅ 代币实现部署成功!${colors.reset}`);
  console.log(`${colors.green}TokenFactory的tokenImplementation已正确设置${colors.reset}`);
  return true;
}

/**
 * 设置角色
 */
async function setupContractRoles() {
  console.log(`${colors.green}=== 开始设置角色 ===${colors.reset}`);
  
  try {
    await setupRoles();
    console.log(`${colors.green}✅ 角色设置完成${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}设置角色失败: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * 验证部署
 */
async function verifyDeployment(network) {
  console.log(`${colors.green}=== 开始验证部署 ===${colors.reset}`);
  
  // 验证部署测试
  const deploymentTestPath = './scripts/tests/deployment-test.js';
  if (fs.existsSync(path.join(process.cwd(), deploymentTestPath))) {
    console.log(`${colors.blue}运行部署验证测试...${colors.reset}`);
    const deploymentTestResult = runHardhatCommand(deploymentTestPath, network);
    
    if (!deploymentTestResult.success) {
      console.error(`${colors.red}❌ 部署验证测试失败${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ 部署验证测试成功${colors.reset}`);
    
    // 运行基础业务流程测试
    const basicTestPath = './scripts/tests/basic-processes-test.js';
    if (fs.existsSync(path.join(process.cwd(), basicTestPath))) {
      console.log(`${colors.blue}运行基础业务流程测试...${colors.reset}`);
      const basicTestResult = runHardhatCommand(basicTestPath, network);
      
      if (!basicTestResult.success) {
        console.warn(`${colors.yellow}⚠️ 基础业务流程测试失败${colors.reset}`);
        console.warn(`${colors.yellow}请检查合约部署和角色设置${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ 基础业务流程测试成功${colors.reset}`);
        
        // 运行完整业务流程测试
        const fullTestPath = './scripts/tests/business-processes-test.js';
        if (fs.existsSync(path.join(process.cwd(), fullTestPath))) {
          console.log(`${colors.blue}运行完整业务流程测试...${colors.reset}`);
          const fullTestResult = runHardhatCommand(fullTestPath, network);
          
          if (!fullTestResult.success) {
            console.warn(`${colors.yellow}⚠️ 完整业务流程测试失败${colors.reset}`);
            console.warn(`${colors.yellow}这可能是因为代币创建过程出现问题${colors.reset}`);
            console.warn(`${colors.yellow}请检查TokenFactory.tokenImplementation是否已正确设置${colors.reset}`);
          } else {
            console.log(`${colors.green}✅ 完整业务流程测试成功!${colors.reset}`);
            console.log(`${colors.green}所有测试都已通过，系统已准备就绪${colors.reset}`);
          }
        }
      }
    }
  } else {
    console.warn(`${colors.yellow}⚠️ 未找到部署验证测试脚本${colors.reset}`);
  }
  
  return true;
}

/**
 * 验证合约代码
 */
async function verifyContracts(network) {
  if (network === 'localhost' || network === 'hardhat') {
    console.log(`${colors.yellow}在本地网络上跳过合约验证${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.green}=== 开始验证合约代码 ===${colors.reset}`);
  const result = runHardhatCommand('./scripts/verify.js', network);
  
  if (!result.success) {
    console.warn(`${colors.yellow}⚠️ 合约验证失败${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✅ 合约验证成功${colors.reset}`);
  return true;
}

/**
 * 主部署流程
 */
async function deployFlow(options) {
  console.log(`${colors.green}开始部署流程${colors.reset}`);
  console.log(`${colors.blue}网络: ${options.network}${colors.reset}`);
  console.log(`${colors.blue}部署策略: ${options.strategy}${colors.reset}`);
  console.log(`${colors.blue}强制部署: ${options.force ? '是' : '否'}${colors.reset}`);
  console.log(`${colors.blue}验证合约: ${options.verify ? '是' : '否'}${colors.reset}`);
  console.log(`${colors.blue}设置角色: ${options.roles ? '是' : '否'}${colors.reset}`);
  console.log(`${colors.blue}部署代币实现: ${options.tokenImpl ? '是' : '否'}${colors.reset}`);
  
  let hardhatNetwork = options.network;
  if (options.network === 'local') {
    hardhatNetwork = 'localhost';
  } else if (options.network === 'testnet') {
    hardhatNetwork = 'sepolia';
  }
  
  // 确认主网部署
  if (options.network === 'mainnet') {
    if (!options.confirm) {
      console.error(`${colors.red}警告: 部署到主网需要使用--confirm参数显式确认${colors.reset}`);
      return false;
    }
    console.warn(`${colors.red}警告: 您正在部署到主网环境!${colors.reset}`);
    console.warn(`${colors.yellow}这将部署合约到生产环境，并消耗真实的资金。${colors.reset}`);
  }
  
  // 1. 部署合约
  const deploySuccess = await deployContracts(hardhatNetwork, options.strategy, options.force);
  if (!deploySuccess) return false;
  
  // 2. 部署代币实现
  if (options.tokenImpl) {
    const tokenImplSuccess = await deployTokenImplementation(hardhatNetwork);
    if (!tokenImplSuccess) {
      console.warn(`${colors.yellow}⚠️ 代币实现部署失败，但将继续执行后续步骤${colors.reset}`);
    }
  }
  
  // 3. 设置角色
  if (options.roles) {
    const rolesSuccess = await setupContractRoles();
    if (!rolesSuccess) {
      console.warn(`${colors.yellow}⚠️ 角色设置失败，但将继续执行后续步骤${colors.reset}`);
    }
  }
  
  // 4. 验证部署
  await verifyDeployment(hardhatNetwork);
  
  // 5. 验证合约代码（如果需要）
  if (options.verify) {
    await verifyContracts(hardhatNetwork);
  }
  
  console.log(`${colors.green}✨ 部署流程完成!${colors.reset}`);
  return true;
}

/**
 * 命令行程序入口
 */
async function main() {
  try {
    const argv = yargs(hideBin(process.argv))
      .usage('用法: $0 <network> [options]')
      .option('strategy', {
        alias: 's',
        describe: '部署策略',
        choices: ['direct', 'upgradeable', 'minimal'],
        default: 'upgradeable'
      })
      .option('force', {
        alias: 'f',
        describe: '强制重新部署',
        type: 'boolean',
        default: false
      })
      .option('verify', {
        alias: 'v',
        describe: '验证合约代码',
        type: 'boolean',
        default: false
      })
      .option('roles', {
        alias: 'r',
        describe: '设置角色',
        type: 'boolean',
        default: true
      })
      .option('token-impl', {
        alias: 't',
        describe: '部署代币实现',
        type: 'boolean',
        default: true
      })
      .option('confirm', {
        describe: '确认主网部署',
        type: 'boolean',
        default: false
      })
      .command('local', '部署到本地网络', {}, (argv) => {
        argv.network = 'local';
      })
      .command('testnet', '部署到测试网', {}, (argv) => {
        argv.network = 'testnet';
        argv.verify = true;
      })
      .command('mainnet', '部署到主网', {}, (argv) => {
        argv.network = 'mainnet';
        argv.verify = true;
      })
      .demandCommand(1, '请指定要部署的网络: local, testnet, 或 mainnet')
      .help()
      .alias('help', 'h')
      .argv;
    
    const options = {
      network: argv._[0],
      strategy: argv.strategy,
      force: argv.force,
      verify: argv.verify,
      roles: argv.roles,
      tokenImpl: argv.tokenImpl,
      confirm: argv.confirm
    };
    
    if (!['local', 'testnet', 'mainnet'].includes(options.network)) {
      console.error(`${colors.red}错误: 无效的网络: ${options.network}${colors.reset}`);
      console.error(`${colors.red}有效的网络: local, testnet, mainnet${colors.reset}`);
      process.exit(1);
    }
    
    const success = await deployFlow(options);
    if (!success) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}部署流程失败: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    closeLoggers();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(colors.red + '部署失败:' + colors.reset, error);
      process.exit(1);
    });
} else {
  // 导出供其他模块使用
  module.exports = { deployFlow };
} 