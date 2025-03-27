// 首先初始化模块别名
require('../../shared/utils/moduleAlias').initializeAliases();

const { ethers } = require('ethers');
const { getContractAddresses, getAbi, getContractAddress } = require('../../shared/config/contracts');
const logger = require('../../server/src/utils/logger');
const { initializeBlockchain, resetBlockchain } = require('../../shared/utils/blockchain');
const { initializeAbis } = require('../../shared/utils/getAbis');
const fs = require('fs');
const path = require('path');

// 输出更详细的日志
const DEBUG = true;

// 辅助方法：输出调试日志
function debug(message, data) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
    if (data !== undefined) {
      console.log(data);
    }
  }
}

// 检查合约方法是否存在
function checkContractMethod(contract, methodName) {
  if (!(methodName in contract)) {
    console.log(`[警告] 合约方法 ${methodName} 不存在`);
    return false;
  }
  
  if (typeof contract[methodName] !== 'function') {
    console.log(`[警告] ${methodName} 存在但不是函数，而是 ${typeof contract[methodName]}`);
    return false;
  }
  
  debug(`方法 ${methodName} 存在并且是函数类型`);
  return true;
}

// 辅助方法：执行合约调用并处理错误
async function executeContractMethod(contract, methodName, args = [], options = {}) {
  try {
    if (!contract) {
      throw new Error('合约未成功加载');
    }
    
    debug(`准备调用合约方法: ${methodName}`, args);
    
    // 检查方法是否存在
    if (!checkContractMethod(contract, methodName)) {
      throw new Error(`合约方法 ${methodName} 不存在`);
    }
    
    if (methodName.startsWith('get') || methodName.includes('Read')) {
      // 读取方法
      debug(`执行读取方法: ${methodName}`);
      const result = await contract[methodName](...args);
      debug(`方法 ${methodName} 返回结果:`, result);
      return result;
    } else {
      // 写入方法
      debug(`执行写入方法: ${methodName}`);
      const tx = await contract[methodName](...args);
      debug(`方法 ${methodName} 交易哈希:`, tx.hash);
      return tx;
    }
  } catch (error) {
    console.log(`执行合约方法 ${methodName} 失败: ${error.message}`);
    if (error.code) {
      console.log(`错误代码: ${error.code}`);
    }
    if (error.info) {
      console.log(`错误信息:`, error.info);
    }
    throw error;
  }
}

// 获取合约实例
async function getContract(contractName, useSigner = true) {
  try {
    const address = getContractAddress(contractName);
    const abi = getAbi(contractName);
    const provider = await initializeBlockchain();
    
    // 如果需要签名者，从provider获取
    let signer = null;
    if (useSigner) {
      try {
        signer = await provider.getSigner();
      } catch (error) {
        console.warn('无法获取签名者，将使用只读模式:', error.message);
      }
    }
    
    return new ethers.Contract(
      address,
      abi,
      signer || provider
    );
  } catch (error) {
    console.error(`获取合约 ${contractName} 失败:`, error);
    throw error;
  }
}

// 打印合约分析信息
async function analyzeContract(contract, name) {
  console.log(`\n===== 分析合约 ${name} =====`);
  console.log('合约地址:', contract.target);
  
  // 获取合约ABI
  const abiPath = path.join(__dirname, '../../contracts/artifacts', `${name}.json`);
  if (fs.existsSync(abiPath)) {
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    if (artifact.abi && Array.isArray(artifact.abi)) {
      const abiFunctions = artifact.abi.filter(item => item.type === 'function');
      console.log(`合约ABI包含 ${abiFunctions.length} 个函数:`);
      
      // 检查函数是否可以直接访问
      for (const func of abiFunctions) {
        const isAccessible = func.name in contract;
        console.log(`- ${func.name}: ${func.stateMutability} (可访问: ${isAccessible})`);
      }
    }
  } else {
    console.log(`警告: 找不到合约 ${name} 的ABI文件`);
  }
  
  console.log('\n测试合约函数可用性:');
  
  // 测试几个常见的方法
  const commonMethods = [
    'registerProperty', 
    'getPropertyCount', 
    'getAllPropertyIds',
    'createSingleToken',
    'getAllTokens',
    'getTokenByProperty'
  ];
  
  for (const method of commonMethods) {
    if (method in contract) {
      console.log(`- ${method}: 可用 (${typeof contract[method]})`);
    } else {
      console.log(`- ${method}: 不可用`);
    }
  }
  
  console.log('============================\n');
}

// 测试流程
async function testFlow() {
  try {
    console.log('\n开始真实区块链接口测试...\n');
    console.log('注意：这些测试将连接真实区块链网络，并提交实际的交易！\n');

    // 初始化ABIs
    try {
      await initializeAbis();
      debug('已初始化所有合约ABIs');
    } catch (error) {
      console.error('初始化ABIs失败:', error.message);
    }

    // 初始化区块链连接
    await initializeBlockchain();
    debug('区块链连接初始化完成');
    
    // 获取合约地址
    const addresses = getContractAddresses();
    debug('合约地址:', addresses);
    
    // 输出ABI文件路径检查
    const propertyRegistryPath = path.join(__dirname, '../../contracts/artifacts/PropertyRegistry.json');
    const tokenFactoryPath = path.join(__dirname, '../../contracts/artifacts/TokenFactory.json');

    console.log('检查ABI文件路径:');
    console.log(`PropertyRegistry ABI 文件路径存在: ${fs.existsSync(propertyRegistryPath)}`);
    console.log(`TokenFactory ABI 文件路径存在: ${fs.existsSync(tokenFactoryPath)}`);

    // 获取并分析合约
    const propertyRegistry = await getContract('PropertyRegistry');
    await analyzeContract(propertyRegistry, 'PropertyRegistry');

    const tokenFactory = await getContract('TokenFactory');
    await analyzeContract(tokenFactory, 'TokenFactory');
    
    // 测试房产流程
    console.log('===== 测试房产流程 =====\n');
    
    try {
      console.log('注册新房产...');
      
      // 检查方法
      checkContractMethod(propertyRegistry, 'registerProperty');

      const tx = await propertyRegistry.registerProperty(
        'PROP123',
        'JP',
        'ipfs://test-uri'
      );
      
      console.log('房产注册成功！\n');
      debug('交易详情:', tx);
    } catch (error) {
      console.log('注册房产失败 (这可能是因为房产已存在或区块链连接问题)');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        console.log('账户余额不足，无法支付gas费用');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是权限问题或参数错误');
      }
      console.log('----------------------------------------\n');
    }

    try {
      console.log('获取房产数量...');
      
      // 检查方法
      checkContractMethod(propertyRegistry, 'allPropertyIds');

      // 获取数组长度
      const propertyCount = await propertyRegistry.getPropertyCount();
      console.log(`找到 ${propertyCount} 个房产\n`);
      
      // 获取所有房产ID
      const propertyIds = [];
      for (let i = 0; i < propertyCount; i++) {
        const propertyId = await propertyRegistry.allPropertyIds(i);
        propertyIds.push(propertyId);
      }
      console.log('房产IDs数组:', propertyIds);
      
      // 如果有房产，尝试获取第一个房产的详情
      if (propertyIds.length > 0) {
        // 获取第一个ID
        const propertyId = propertyIds[0];
        console.log(`获取房产 ${propertyId} 的详情...`);
        
        // 检查方法
        checkContractMethod(propertyRegistry, 'getProperty');
        
        const property = await propertyRegistry.getProperty(propertyId);
        console.log(`房产 ${propertyId}:`, property);
      }
      
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取房产列表失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'BAD_DATA') {
        console.log('合约返回数据解码失败，可能是合约状态异常');
      }
      console.log('----------------------------------------\n');
    }

    // 测试代币流程
    console.log('===== 测试代币流程 =====\n');
    
    try {
      console.log('创建新代币...');
      
      // 检查方法
      checkContractMethod(tokenFactory, 'createSingleToken');

      const tx = await tokenFactory.createSingleToken(
        'PROP123',
        'Test Token',
        'TEST',
        ethers.parseEther('1000000')
      );
      
      console.log('代币创建成功！\n');
      debug('交易详情:', tx);
    } catch (error) {
      console.log('创建代币失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        console.log('账户余额不足，无法支付gas费用');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是权限问题或参数错误');
      }
      console.log('----------------------------------------\n');
    }

    try {
      console.log('获取代币列表...');
      
      // 检查方法
      checkContractMethod(tokenFactory, 'allTokens');

      // 获取代币数量
      const tokenCount = await tokenFactory.getTokenCount();
      console.log(`找到 ${tokenCount} 个代币\n`);
      
      // 获取所有代币地址
      const tokens = [];
      for (let i = 0; i < tokenCount; i++) {
        const tokenAddress = await tokenFactory.allTokens(i);
        tokens.push(tokenAddress);
      }
      console.log('代币列表:', tokens);
      
      // 如果有代币，尝试获取第一个代币的详情
      if (tokens.length > 0) {
        const tokenAddress = tokens[0];
        console.log(`获取代币 ${tokenAddress} 的详情...`);
        
        // 检查方法
        checkContractMethod(tokenFactory, 'getTokenAddress');
        
        const tokenInfo = await tokenFactory.getTokenAddress('PROP123');
        console.log('代币详情:', tokenInfo);
      }
      
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取代币列表失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'BAD_DATA') {
        console.log('合约返回数据解码失败，可能是合约状态异常');
      }
      console.log('----------------------------------------\n');
    }

    console.log('所有测试完成！\n');
  } catch (error) {
    console.error('测试流程失败:', error);
  } finally {
    // 重置区块链连接
    await resetBlockchain();
  }
}

// 运行测试
testFlow().catch(console.error); 