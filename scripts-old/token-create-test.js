/**
 * 简化版的代币创建测试脚本
 * 直接尝试创建代币，避免对合约方法的复杂交互
 */

const { ethers } = require('hardhat');

// 测试配置
const TEST_CONFIG = {
  property: {
    id: `TEST-${Math.floor(Math.random() * 10000)}`,
    country: 'Japan',
    metadataURI: 'ipfs://QmTest12345'
  },
  token: {
    namePrefix: 'Japan RWA',
    symbolPrefix: 'JRW',
    initialSupply: '1000000' // 100万代币
  }
};

// 记录函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSuccess(message) { console.log(`\x1b[32m✓ ${message}\x1b[0m`); }
function logWarning(message) { console.log(`\x1b[33m! ${message}\x1b[0m`); }
function logError(message, error = null) { 
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  if (error) console.error(error);
}

// 显示测试阶段
function logStage(stage) {
  console.log('\n' + '='.repeat(80));
  console.log(`【${stage}】`);
  console.log('='.repeat(80) + '\n');
}

//------------------------------------------------------------------------------
// 常量：导入角色常量和通用常量
//------------------------------------------------------------------------------
const { ROLES } = require('./utils/roles');
const { ZERO_ADDRESS } = require('./utils/constants');

// 使用角色常量
const DEFAULT_ADMIN_ROLE = ROLES.DEFAULT_ADMIN;
const MINTER_ROLE = ROLES.MINTER;
const SNAPSHOT_ROLE = ROLES.SNAPSHOT;

async function main() {
  try {
    logStage('初始化');
    
    // 加载部署状态
    const deployState = require('./deploy-state.json');
    log('成功加载部署状态');
    
    // 获取合约地址
    const roleManagerAddress = deployState.roleManager;
    const propertyRegistryAddress = deployState.propertyRegistry;
    const tokenFactoryAddress = deployState.tokenFactory;
    const realEstateSystemAddress = deployState.realEstateSystem;
    
    log(`合约地址: 
      RoleManager: ${roleManagerAddress}
      PropertyRegistry: ${propertyRegistryAddress}
      TokenFactory: ${tokenFactoryAddress}
      RealEstateSystem: ${realEstateSystemAddress}
    `);
    
    // 获取测试账户
    const [deployer] = await ethers.getSigners();
    log(`部署者账户: ${deployer.address}`);
    
    // 连接到合约
    const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
    
    logStage('1. 注册测试房产');
    
    const testPropertyId = TEST_CONFIG.property.id;
    log(`测试房产ID: ${testPropertyId}`);
    
    try {
      // 直接注册和批准房产
      log('正在注册房产...');
      const registerTx = await propertyRegistry.registerProperty(
        testPropertyId,
        TEST_CONFIG.property.country,
        TEST_CONFIG.property.metadataURI
      );
      await registerTx.wait();
      logSuccess('房产注册成功');
      
      // 批准房产
      log('正在批准房产...');
      const approveTx = await propertyRegistry.approveProperty(testPropertyId);
      await approveTx.wait();
      logSuccess('房产批准成功');
      
      // 检查房产是否已批准
      const isApproved = await propertyRegistry.isPropertyApproved(testPropertyId);
      if (isApproved) {
        logSuccess('确认房产已批准');
      } else {
        logWarning('房产未被批准，将尝试继续创建代币');
      }
    } catch (error) {
      logWarning('房产注册/批准过程中出错，将尝试继续创建代币:', error.message);
    }
    
    logStage('2. 设置紧急授权');
    
    // 确保TokenFactory有必要的权限
    const roles = [
      { name: 'DEFAULT_ADMIN_ROLE', hash: DEFAULT_ADMIN_ROLE },
      { name: 'MINTER_ROLE', hash: MINTER_ROLE },
      { name: 'SNAPSHOT_ROLE', hash: SNAPSHOT_ROLE }
    ];
    
    log('授予TokenFactory必要的角色权限...');
    for (const role of roles) {
      try {
        const tx = await roleManager.grantRole(role.hash, tokenFactory.target);
        await tx.wait();
        logSuccess(`已为TokenFactory授予 ${role.name} 角色`);
      } catch (error) {
        logWarning(`授予TokenFactory ${role.name} 角色失败: ${error.message}`);
      }
    }
    
    // 将TokenFactory添加为PropertyRegistry的授权合约
    try {
      const tx = await propertyRegistry.addAuthorizedContract(tokenFactory.target);
      await tx.wait();
      logSuccess('已将TokenFactory添加为PropertyRegistry的授权合约');
    } catch (error) {
      logWarning(`添加TokenFactory为授权合约失败: ${error.message}`);
    }
    
    logStage('3. 创建代币');
    
    // 检查房产是否已有代币
    try {
      const existingToken = await tokenFactory.getTokenAddress(testPropertyId);
      
      if (existingToken !== ZERO_ADDRESS) {
        logWarning(`房产 ${testPropertyId} 已存在代币地址: ${existingToken}`);
        log('测试完成');
        return true;
      }
    } catch (error) {
      logWarning(`检查已有代币失败: ${error.message}`);
    }
    
    // 准备代币参数
    const tokenName = `${TEST_CONFIG.token.namePrefix} ${testPropertyId}`;
    const tokenSymbol = `${TEST_CONFIG.token.symbolPrefix}${testPropertyId.substring(0, 4)}`;
    const initialSupply = ethers.parseEther(TEST_CONFIG.token.initialSupply);
    
    log(`代币参数:
      名称: ${tokenName}
      代号: ${tokenSymbol}
      初始供应量: ${TEST_CONFIG.token.initialSupply}
    `);
    
    // 尝试使用createSingleToken方法
    log('使用createSingleToken方法创建代币...');
    try {
      // 创建代币，提高gas限制避免gas不足
      const tx = await tokenFactory.createSingleToken(
        tokenName,
        tokenSymbol,
        testPropertyId,
        initialSupply,
        { gasLimit: 9000000 }
      );
      
      log(`交易已提交，等待确认: ${tx.hash}`);
      const receipt = await tx.wait();
      logSuccess(`代币创建成功! 使用了 ${receipt.gasUsed.toString()} gas`);
      
      // 获取代币地址
      try {
        const tokenAddress = await tokenFactory.getTokenAddress(testPropertyId);
        log(`创建的代币地址: ${tokenAddress}`);
        
        // 尝试获取代币信息
        const token = await ethers.getContractAt('RealEstateToken', tokenAddress);
        const tokenName = await token.name();
        const tokenSymbol = await token.symbol();
        const totalSupply = await token.totalSupply();
        
        log(`代币信息:
          名称: ${tokenName}
          符号: ${tokenSymbol}
          总供应量: ${ethers.formatEther(totalSupply)} 代币
        `);
      } catch (error) {
        logWarning(`获取代币信息失败: ${error.message}`);
      }
    } catch (error) {
      logError('代币创建失败', error);
      
      // 尝试使用createTokenPublic方法
      log('使用createTokenPublic方法尝试创建代币...');
      try {
        const tx = await tokenFactory.createTokenPublic(
          testPropertyId,
          tokenName,
          tokenSymbol,
          initialSupply,
          0, // maxSupply (0 = 默认值)
          { gasLimit: 9000000 }
        );
        
        log(`交易已提交，等待确认: ${tx.hash}`);
        const receipt = await tx.wait();
        logSuccess(`代币创建成功! 使用了 ${receipt.gasUsed.toString()} gas`);
        
        // 验证代币是否已创建
        const tokenAddress = await tokenFactory.getTokenAddress(testPropertyId);
        log(`创建的代币地址: ${tokenAddress}`);
      } catch (secondError) {
        logError('使用createTokenPublic方法也失败了', secondError);
        log('记录错误信息用于调试:');
        log(`错误消息1: ${error.message}`);
        log(`错误消息2: ${secondError.message}`);
        
        // 分析错误信息
        if (error.message.includes('missing role') || secondError.message.includes('missing role')) {
          log('可能是角色权限问题，检查TokenFactory是否有MINTER_ROLE和SNAPSHOT_ROLE权限');
        }
        
        if (error.message.includes('not authorized') || secondError.message.includes('not authorized')) {
          log('可能是授权问题，检查TokenFactory是否是PropertyRegistry的授权合约');
        }
      }
    }
    
    logStage('测试完成');
    return true;
  } catch (error) {
    logError('测试过程中出错', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 