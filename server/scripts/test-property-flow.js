/**
 * 房地产代币化核心业务流程测试脚本
 * 
 * 本脚本测试房地产资产从注册到交易的完整业务流程：
 * 1. 初始化区块链连接
 * 2. 注册房产
 * 3. 创建代币
 * 4. 查询代币信息
 * 5. 测试代币转账
 * 6. 创建和执行交易
 * 7. 分配和领取收益
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const shared = require('../../shared/src');

// 使用常量
const CONTRACT_NAMES = {
  FACADE: 'Facade',
  PROPERTY_TOKEN: 'PropertyToken',
  REAL_ESTATE_FACADE: 'RealEstateFacade'
};

const WALLET_TYPES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR'
};

// 从shared模块中提取所需的类和配置
const { 
  Wallet, 
  Provider, 
  Contract,
  Logger
} = shared;

const {
  EnvConfig,
  NetworkConfig,
  AbiConfig,
  AddressConfig
} = shared.config;

// 确保显式加载环境变量
console.log('当前工作目录:', process.cwd());
console.log('尝试加载.env文件...');
try {
  // 确定项目根目录的.env文件路径
  const projectEnvPath = path.resolve(process.cwd(), '../.env');
  
  if (fs.existsSync(projectEnvPath)) {
    console.log('从项目根目录加载.env文件:', projectEnvPath);
    // 显式加载.env文件
    require('dotenv').config({ path: projectEnvPath });
    
    // 显示.env文件内容前几行
    const envContent = fs.readFileSync(projectEnvPath, 'utf8');
    const lines = envContent.split('\n').slice(0, 5).join('\n');
    console.log('项目根目录.env文件内容预览:', lines + '...');
  } else {
    throw new Error(`未找到项目根目录的.env文件: ${projectEnvPath}`);
  }
  
  // 加载EnvConfig
  EnvConfig.load();
  
  // 打印关键环境变量
  console.log('环境变量加载情况:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- BLOCKCHAIN_NETWORK:', process.env.BLOCKCHAIN_NETWORK);
  console.log('- PROJECT_PATH:', process.env.PROJECT_PATH);
  console.log('- ADMIN_PRIVATE_KEY存在:', !!process.env.ADMIN_PRIVATE_KEY);
  console.log('- OPERATOR_PRIVATE_KEY存在:', !!process.env.OPERATOR_PRIVATE_KEY);
  console.log('- RPC_URL:', process.env.RPC_URL || process.env.LOCALHOST_RPC_URL);
} catch (error) {
  console.error('加载环境变量时出错:', error);
  throw new Error(`加载环境变量失败: ${error.message}`);
}

// 使用PROJECT_PATH设置正确的部署文件路径
let deploymentPath;
if (process.env.PROJECT_PATH) {
  // 使用项目根目录的PROJECT_PATH
  deploymentPath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
  console.log('使用PROJECT_PATH设置部署文件路径:', deploymentPath);
} else {
  // 回退到相对路径
  deploymentPath = path.resolve(process.cwd(), '../config/deployment.json');
  console.log('未找到PROJECT_PATH环境变量，使用相对路径:', deploymentPath);
}

if (!fs.existsSync(deploymentPath)) {
  throw new Error(`部署文件不存在: ${deploymentPath}，请先部署合约并生成deployment.json文件`);
}
AddressConfig.setDeploymentPath(deploymentPath);

// 使用PROJECT_PATH设置正确的ABI目录路径
let abiDirPath;
if (process.env.PROJECT_PATH) {
  // 使用项目根目录的PROJECT_PATH
  abiDirPath = path.resolve(process.env.PROJECT_PATH, 'config/abi');
  console.log('使用PROJECT_PATH设置ABI目录路径:', abiDirPath);
} else {
  // 回退到相对路径
  abiDirPath = path.resolve(process.cwd(), '../config/abi');
  console.log('未找到PROJECT_PATH环境变量，使用相对路径:', abiDirPath);
}

if (!fs.existsSync(abiDirPath)) {
  throw new Error(`ABI目录不存在: ${abiDirPath}，请确保ABI文件已正确配置`);
}
try {
  const abis = AbiConfig.loadAllContractAbis(abiDirPath);
  console.log(`已加载${Object.keys(abis).length}个合约ABI，包括: ${Object.keys(abis).join(', ')}`);
} catch (error) {
  throw new Error(`加载ABI文件失败: ${error.message}`);
}

// 设置日志级别
console.log('===== 开始测试房地产代币化流程 =====');

/**
 * 获取私钥 - 失败时直接抛出错误
 * @param {string} keyType - 私钥类型
 * @returns {string} 私钥
 */
function getPrivateKey(keyType) {
  try {
    // 检查私钥环境变量是否存在
    const privateKeyEnvName = `${keyType}_PRIVATE_KEY`;
    if (!process.env[privateKeyEnvName]) {
      throw new Error(`环境变量 ${privateKeyEnvName} 未设置，请检查.env文件`);
    }
    
    const privateKey = EnvConfig.getPrivateKey(keyType);
    if (!privateKey) {
      throw new Error(`私钥 ${keyType} 检索失败，请检查.env文件和EnvConfig.getPrivateKey实现`);
    }
    
    return privateKey;
  } catch (error) {
    Logger.error(`获取${keyType}私钥失败`, { error: error.message });
    throw new Error(`无法获取${keyType}私钥: ${error.message}`);
  }
}

/**
 * 主流程测试函数
 */
async function testPropertyFlow() {
  try {
    Logger.info('开始测试房产通证流程');

    // 加载部署信息 - 验证deployment.json是否存在并可读
    let deploymentPath;
    if (process.env.PROJECT_PATH) {
      // 使用项目根目录的PROJECT_PATH
      deploymentPath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
      Logger.info(`使用PROJECT_PATH加载部署文件: ${deploymentPath}`);
    } else {
      // 回退到相对路径
      deploymentPath = path.resolve(process.cwd(), '../config/deployment.json');
      Logger.info(`未找到PROJECT_PATH环境变量，使用相对路径: ${deploymentPath}`);
    }

    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`部署文件不存在: ${deploymentPath}，请先部署合约并生成deployment.json文件`);
    }

    // 读取部署信息
    Logger.info(`正在读取部署信息: ${deploymentPath}`);
    const deploymentContent = fs.readFileSync(deploymentPath, 'utf8');
    const deploymentData = JSON.parse(deploymentContent);
    
    if (!deploymentData || !deploymentData.contracts) {
      throw new Error('部署文件格式不正确，缺少contracts字段');
    }
    
    Logger.info('部署信息加载成功', { 
      network: deploymentData.network,
      contractCount: Object.keys(deploymentData.contracts).length
    });

    // 设置环境变量
    const networkType = EnvConfig.getNetworkType();
    Logger.info(`当前网络: ${networkType}`);

    // 1. 初始化区块链连接 - 使用shared模块的Provider
    Logger.info('正在创建Provider...');
    // 从配置中获取RPC URL，显式打印出来，确保连接到正确的网络
    const rpcUrl = EnvConfig.getNetworkConfig().rpcUrl || 'http://localhost:8545';
    Logger.info(`将使用RPC URL: ${rpcUrl}`, { rpcUrl, networkType });
    
    const provider = await Provider.create({ 
      networkType,
      rpcUrl 
    });
    
    // 打印详细的网络信息
    const networkInfo = await Provider.getNetwork(provider);
    const blockNumber = await Provider.getBlockNumber(provider);
    
    Logger.info('Provider创建成功，网络连接详情', {
      chainId: networkInfo.chainId,
      networkName: networkInfo.name,
      blockNumber: blockNumber,
      nodeUrl: rpcUrl
    });

    // 2. 创建钱包 - 使用shared模块的Wallet
    const adminPrivateKey = getPrivateKey(WALLET_TYPES.ADMIN);
    const adminWallet = await Wallet.create({ 
      privateKey: adminPrivateKey, 
      provider 
    });
    Logger.info('管理员钱包创建成功', { address: adminWallet.address });

    const operatorPrivateKey = getPrivateKey(WALLET_TYPES.OPERATOR);
    const operatorWallet = await Wallet.create({ 
      privateKey: operatorPrivateKey, 
      provider 
    });
    Logger.info('操作员钱包创建成功', { address: operatorWallet.address });

    // 3. 获取必要的合约
    const facadeContractAddress = AddressConfig.getContractAddress('Facade');
    if (!facadeContractAddress) {
      throw new Error(`无法获取Facade合约地址，请确保部署文件中包含此合约`);
    }
    Logger.info('获取Facade合约地址', { address: facadeContractAddress });

    // 4. 获取RealEstateFacade合约实例 - 直接使用ethers库
    const facadeAbi = AbiConfig.getContractAbi("RealEstateFacade").abi;
    if (!facadeAbi) {
      throw new Error(`未找到RealEstateFacade的ABI，请确保ABI文件存在`);
    }

    // 直接使用ethers库创建合约实例
    const facadeContract = new ethers.Contract(facadeContractAddress, facadeAbi, adminWallet);
    Logger.info('RealEstateFacade合约实例创建成功', { address: facadeContractAddress });

    // 测试数据 - 房产信息
    const propertyData = {
      propertyId: "PROP" + Date.now(),
      metadataURI: "ipfs://QmXaZcjw32fGfUmPL9ZNmJhkZ1XQxJwo6jgob4o5Jtbt5C",
      ownerAddress: adminWallet.address,
      attributes: {
        location: "东京都中央区银座4-5-6",
        size: 120, // 平方米
        type: "公寓",
        price: ethers.parseEther("150").toString() // 150 ETH，转为字符串避免BigInt序列化问题
      }
    };

    // 注册房产
    Logger.info('正在注册房产...', { propertyId: propertyData.propertyId });

    try {
      // 使用registerPropertyAndCreateToken方法，按照合约中定义的参数顺序
      // 获取代币实现合约地址
      const tokenImplAddress = AddressConfig.getContractAddress('PropertyToken');
      if (!tokenImplAddress) {
        throw new Error('无法获取PropertyToken实现合约地址');
      }
      
      Logger.info('准备调用合约方法: registerPropertyAndCreateToken', {
        method: 'registerPropertyAndCreateToken',
        contractAddress: facadeContractAddress,
        signer: adminWallet.address,
        propertyId: propertyData.propertyId,
        tokenName: "房产代币" + propertyData.propertyId.substring(4),
        tokenSymbol: "PROP" + propertyData.propertyId.substring(4)
      });
      
      const registerTx = await facadeContract.registerPropertyAndCreateToken(
        propertyData.propertyId,         // propertyId
        "JP",                            // country
        propertyData.metadataURI,        // metadataURI
        "房产代币" + propertyData.propertyId.substring(4), // tokenName
        "PROP" + propertyData.propertyId.substring(4),    // tokenSymbol
        ethers.parseEther("1000"),       // initialSupply
        tokenImplAddress                // propertyTokenImplementation
      );
      
      Logger.info('交易已发送到网络，等待确认...', {
        txHash: registerTx.hash,
        nonce: registerTx.nonce,
        gasLimit: registerTx.gasLimit?.toString(),
        gasPrice: registerTx.gasPrice?.toString()
      });
      
      // 等待交易确认
      const registerReceipt = await registerTx.wait();
      
      // 计算propertyId的哈希值，仅用于记录
      const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyData.propertyId));
      
      Logger.info('房产注册并创建代币成功', {
        propertyId: propertyData.propertyId,
        txHash: registerReceipt.hash,
        blockNumber: registerReceipt.blockNumber,
        calculatedHash: propertyIdHash,
        gasUsed: registerReceipt.gasUsed?.toString(),
        status: registerReceipt.status,
        events: registerReceipt.logs?.length || 0
      });
      
      Logger.info('房产注册流程测试成功');
      return true;
    } catch (error) {
      Logger.error('房产注册失败', { error: error.message, stack: error.stack });
      throw new Error(`房产注册交易失败: ${error.message}`);
    }
  } catch (error) {
    Logger.error('房产通证流程测试失败', { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 获取合约实例的帮助函数
 * @param {string} name - 合约名称
 * @param {ethers.Wallet} signer - 签名者
 * @returns {Promise<ethers.Contract>} 合约实例
 */
async function getContractWithSigner(name, signer) {
  try {
    // 获取ABI
    const abiInfo = AbiConfig.getContractAbi(name);
    if (!abiInfo || !abiInfo.abi) {
      throw new Error(`未找到${name}的ABI`);
    }
    const abi = abiInfo.abi;
    
    // 获取合约地址
    const address = AddressConfig.getContractAddress(name);
    if (!address) {
      throw new Error(`未找到${name}的地址`);
    }
    
    // 直接创建ethers合约实例
    return new ethers.Contract(address, abi, signer);
  } catch (error) {
    Logger.error(`获取合约实例失败: ${name}`, { error: error.message });
    throw error;
  }
}

/**
 * 获取PropertyToken合约实例
 * @param {ethers.Wallet} signer - 签名者
 * @returns {Promise<ethers.Contract>} PropertyToken合约实例
 */
async function getTokenContract(signer) {
  return getContractWithSigner(CONTRACT_NAMES.PROPERTY_TOKEN, signer);
}

/**
 * 获取房产ID的哈希
 * @param {string} propertyId - 房产ID
 * @returns {string} 房产ID的哈希
 */
function getPropertyIdHash(propertyId) {
  return ethers.keccak256(ethers.toUtf8Bytes(propertyId));
}

/**
 * 获取PropertyToken实现合约的地址
 * @returns {Promise<string>} PropertyToken实现合约的地址
 */
function getPropertyTokenImplementation() {
  return AddressConfig.getContractAddress(CONTRACT_NAMES.PROPERTY_TOKEN);
}

/**
 * 生成唯一的订单ID
 * @returns {string} 唯一订单ID
 */
function getLatestOrderId() {
  return "ORDER_" + Date.now();
}

/**
 * 生成唯一的分配ID
 * @returns {string} 唯一分配ID
 */
function getLatestDistributionId() {
  return "DIST_" + Date.now();
}

/**
 * 主函数
 */
(async () => {
  try {
    const success = await testPropertyFlow();
    if (success) {
      Logger.info('测试执行成功', { success: true });
      process.exit(0);
    } else {
      Logger.error('测试执行失败', { success: false });
      process.exit(1);
    }
  } catch (error) {
    Logger.error('测试执行失败', { 
      error: error.message,
      success: false 
    });
    process.exit(1);
  }
})(); 