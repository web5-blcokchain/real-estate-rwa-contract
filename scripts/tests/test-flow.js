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
    // 获取合约地址
    const addresses = getContractAddresses();
    // 直接使用原始合约名称，保持与artifacts目录中的合约名称一致
    const address = addresses[contractName]; // 不再转换大小写
    
    if (!address) {
      console.warn(`未找到合约 ${contractName} 的地址，检查deploy-state.json...`);
      console.log('可用合约:', Object.keys(addresses).join(', '));
      throw new Error('Contract address not found for: ' + contractName);
    }
    
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
  
  // 获取合约ABI，使用标准 Hardhat 输出目录
  const abiPath = path.join(__dirname, '../../artifacts/contracts', `${name}.sol/${name}.json`);
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
    // 尝试旧路径作为后备方案
    const legacyPath = path.join(__dirname, '../../contracts/artifacts', `${name}.json`);
    if (fs.existsSync(legacyPath)) {
      console.log(`警告: 使用旧式ABI文件路径 ${legacyPath}`);
      const artifact = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
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
      console.log(`警告: 找不到合约 ${name} 的ABI文件，请确保已编译合约`);
    }
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

// 检查合约初始化状态
async function checkContractInitialization(contract, name) {
  try {
    console.log(`\n检查 ${name} 合约初始化状态...`);
    
    // 检查版本号
    const version = await contract.version();
    console.log(`${name} 版本号:`, version);
    
    // 检查链ID
    const chainId = await contract.chainId();
    console.log(`${name} 链ID:`, chainId);
    
    // 检查角色管理器
    const roleManager = await contract.roleManager();
    console.log(`${name} 角色管理器:`, roleManager);
    
    return true;
  } catch (error) {
    console.log(`${name} 合约可能未正确初始化:`, error.message);
    return false;
  }
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
    
    // 获取并分析合约
    const propertyRegistry = await getContract('PropertyRegistry');
    const tokenFactory = await getContract('TokenFactory');
    
    // 检查合约初始化状态
    const propertyRegistryInitialized = await checkContractInitialization(propertyRegistry, 'PropertyRegistry');
    const tokenFactoryInitialized = await checkContractInitialization(tokenFactory, 'TokenFactory');
    
    if (!propertyRegistryInitialized || !tokenFactoryInitialized) {
      console.log('\n警告：合约可能未正确初始化，请确保已经运行了部署脚本！');
      return;
    }
    
    // 分析合约
    await analyzeContract(propertyRegistry, 'PropertyRegistry');
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
      checkContractMethod(propertyRegistry, 'getAllPropertyIds');

      // 直接获取所有房产ID
      const propertyIds = await propertyRegistry.getAllPropertyIds();
      
      // 处理空数组情况
      if (!propertyIds || propertyIds.length === 0) {
        console.log('当前没有注册的房产\n');
      } else {
        console.log('房产IDs数组:', propertyIds);
        console.log(`找到 ${propertyIds.length} 个房产\n`);
        
        // 如果有房产，尝试获取第一个房产的详情
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
        // 尝试使用 getPropertyCount 作为备选方案
        try {
          const count = await propertyRegistry.getPropertyCount();
          console.log(`使用备选方法获取到房产数量: ${count}`);
        } catch (countError) {
          console.log('备选方法也失败:', countError.message);
        }
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
      checkContractMethod(tokenFactory, 'getAllTokens');

      // 直接获取所有代币地址
      const tokens = await tokenFactory.getAllTokens();
      console.log('代币列表:', tokens);
      console.log(`找到 ${tokens.length} 个代币\n`);
      
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