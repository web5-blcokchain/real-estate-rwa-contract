/**
 * ABI诊断工具 - 检查合约接口和实现是否匹配
 * 验证RoleManager、PropertyRegistry、TokenFactory和RealEstateToken的接口是否兼容
 */

const { ethers } = require('hardhat');

// 记录函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 彩色日志
function logSuccess(message) { console.log(`\x1b[32m✓ ${message}\x1b[0m`); }
function logWarning(message) { console.log(`\x1b[33m! ${message}\x1b[0m`); }
function logError(message, error = null) { 
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  if (error) console.error(`  Error: ${error.message}`);
}

// 获取合约函数签名
function getFunctionSignature(func) {
  if (!func || !func.name) return null;
  const inputTypes = func.inputs.map(input => input.type).join(',');
  return `${func.name}(${inputTypes})`;
}

// 分析合约接口
async function analyzeContract(name, contract) {
  log(`\n分析合约 ${name}...`);
  
  try {
    // 获取合约接口
    const fragment = await contract.interface.fragments;
    
    // 提取函数和事件
    const functions = fragment.filter(frag => frag.type === 'function');
    const events = fragment.filter(frag => frag.type === 'event');
    
    log(`发现 ${functions.length} 个函数，${events.length} 个事件`);
    
    // 关键函数列表
    const keyFunctions = [
      'hasRole', 'grantRole', 'revokeRole', 'renounceRole', 'getRoleAdmin',
      'isPropertyApproved', 'propertyExists', 'isAuthorizedContract',
      'getTokenAddress', 'tokenImplementation', 'getPropertyIdFromToken',
      'createSingleToken', 'createTokenPublic', 'mint', 'snapshot'
    ];
    
    // 检查关键函数
    log('检查关键函数:');
    for (const funcName of keyFunctions) {
      const func = functions.find(f => f.name === funcName);
      if (func) {
        const signature = getFunctionSignature(func);
        logSuccess(`  ${funcName} - 已发现: ${signature}`);
      } else {
        logWarning(`  ${funcName} - 未找到`);
      }
    }
    
    // 返回函数信息用于对比
    return {
      name,
      functions: functions.map(f => ({ 
        name: f.name, 
        signature: getFunctionSignature(f),
        stateMutability: f.stateMutability
      }))
    };
    
  } catch (error) {
    logError(`分析合约 ${name} 失败`, error);
    return { name, functions: [] };
  }
}

// 比较合约函数
function compareContracts(contract1, contract2) {
  log(`\n比较 ${contract1.name} 和 ${contract2.name} 函数交集...`);
  
  // 找出同名函数
  const commonFunctions = [];
  for (const func1 of contract1.functions) {
    const func2 = contract2.functions.find(f => f.name === func1.name);
    if (func2) {
      commonFunctions.push({
        name: func1.name,
        contract1Signature: func1.signature,
        contract2Signature: func2.signature,
        matches: func1.signature === func2.signature,
        stateMutability1: func1.stateMutability,
        stateMutability2: func2.stateMutability
      });
    }
  }
  
  // 显示对比结果
  log(`共找到 ${commonFunctions.length} 个同名函数`);
  for (const func of commonFunctions) {
    if (func.matches) {
      logSuccess(`  ${func.name} - 签名匹配`);
    } else {
      logError(`  ${func.name} - 签名不匹配:`);
      console.log(`    ${contract1.name}: ${func.contract1Signature} (${func.stateMutability1})`);
      console.log(`    ${contract2.name}: ${func.contract2Signature} (${func.stateMutability2})`);
    }
  }
  
  // 返回匹配和不匹配函数列表
  return {
    match: commonFunctions.filter(f => f.matches),
    mismatch: commonFunctions.filter(f => !f.matches)
  };
}

// 检查自定义合约函数
async function checkCustomFunctions(contract, contractName, functionList) {
  log(`\n检查 ${contractName} 自定义函数...`);
  
  for (const [funcName, args] of Object.entries(functionList)) {
    try {
      // 检查函数是否存在
      if (typeof contract[funcName] !== 'function') {
        logWarning(`  ${funcName} - 函数不存在`);
        continue;
      }
      
      // 尝试调用函数
      const result = await contract[funcName](...args);
      logSuccess(`  ${funcName}${args.length > 0 ? `(${args.join(', ')})` : '()'} - 调用成功: ${result.toString()}`);
    } catch (error) {
      logError(`  ${funcName}${args.length > 0 ? `(${args.join(', ')})` : '()'} - 调用失败`, error);
    }
  }
}

async function main() {
  try {
    log('开始分析合约ABI定义与实现...');
    
    // 加载部署状态
    const deployState = require('./deploy-state.json');
    log('已加载部署状态');
    
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
    log(`使用部署者账户: ${deployer.address}`);
    
    // 连接到合约
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
    const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
    
    // 获取代币实现地址
    let tokenImplementationAddress;
    try {
      tokenImplementationAddress = await tokenFactory.tokenImplementation();
      log(`TokenImplementation: ${tokenImplementationAddress}`);
    } catch (error) {
      logError(`获取代币实现合约地址失败`, error);
      
      // 尝试从部署状态获取
      tokenImplementationAddress = deployState.tokenImplementation;
      if (!tokenImplementationAddress) {
        logWarning('未能从部署状态获取代币实现合约地址，将使用测试地址');
        // 使用测试地址作为备用
        tokenImplementationAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      }
    }
    
    // 尝试连接到代币实现合约
    let tokenImplementation;
    try {
      tokenImplementation = await ethers.getContractAt('RealEstateToken', tokenImplementationAddress);
      log(`成功连接到代币实现合约: ${tokenImplementationAddress}`);
    } catch (error) {
      logError(`连接到代币实现合约失败`, error);
    }
    
    // 分析各合约接口
    const roleManagerInfo = await analyzeContract('RoleManager', roleManager);
    const propertyRegistryInfo = await analyzeContract('PropertyRegistry', propertyRegistry);
    const tokenFactoryInfo = await analyzeContract('TokenFactory', tokenFactory);
    
    // 如果成功连接到代币实现合约，也分析它
    let tokenImplementationInfo = null;
    if (tokenImplementation) {
      tokenImplementationInfo = await analyzeContract('RealEstateToken', tokenImplementation);
    }
    
    // 比较各合约接口
    const rmVsPrCompare = compareContracts(roleManagerInfo, propertyRegistryInfo);
    const rmVsTfCompare = compareContracts(roleManagerInfo, tokenFactoryInfo);
    const prVsTfCompare = compareContracts(propertyRegistryInfo, tokenFactoryInfo);
    
    // 如果有代币实现合约，比较与其他合约的接口
    if (tokenImplementationInfo) {
      const tfVsTokenCompare = compareContracts(tokenFactoryInfo, tokenImplementationInfo);
      log(`\n${tokenFactoryInfo.name} 和 ${tokenImplementationInfo.name} 不匹配函数数量: ${tfVsTokenCompare.mismatch.length}`);
    }
    
    // 检查特定合约函数
    await checkCustomFunctions(roleManager, 'RoleManager', {
      'hasRole': [roleManager.SUPER_ADMIN(), deployer.address],
      'MINTER_ROLE': [],
      'SNAPSHOT_ROLE': []
    });
    
    await checkCustomFunctions(propertyRegistry, 'PropertyRegistry', {
      'isPropertyApproved': ['TEST-1234'],
      'propertyExists': ['TEST-1234'],
      'isAuthorizedContract': [tokenFactoryAddress]
    });
    
    await checkCustomFunctions(tokenFactory, 'TokenFactory', {
      'getTokenAddress': ['TEST-1234'],
      'tokenImplementation': [],
      'roleManager': []
    });
    
    log('\n分析完成!');
    
    // 总结与建议
    log('\n========== 诊断总结 ==========');
    
    // 列出可能导致问题的接口不匹配
    const totalMismatches = rmVsPrCompare.mismatch.length + rmVsTfCompare.mismatch.length + prVsTfCompare.mismatch.length;
    if (totalMismatches > 0) {
      logWarning(`发现 ${totalMismatches} 个接口不匹配，可能导致调用问题`);
    } else {
      logSuccess('未发现接口签名不匹配问题');
    }
    
    // 建议
    log('\n建议:');
    log('1. 对于ABI解码错误，检查合约实现中的函数与期望的接口是否匹配');
    log('2. 确保所有合约都正确部署并初始化');
    log('3. 验证合约对应的角色和权限设置');
    log('4. 使用低级调用绕过接口不匹配问题');
    
  } catch (error) {
    logError('分析过程中出错', error);
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