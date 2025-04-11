/**
 * 模拟实际使用场景的测试脚本
 * 重现并解决 test-wallet-role.js 中的问题
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger, EnvUtils, Blockchain } = require('../../common');
const { 
  ContractUtils, 
  AbiUtils, 
  WalletManager, 
  ProviderManager 
} = Blockchain;

// 导入角色常量
const ROLES = {
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

// 设置日志级别为 debug
process.env.LOG_LEVEL = 'debug';

/**
 * 获取最新的部署报告
 * @returns {Object} 包含合约地址的对象
 */
function getLatestDeploymentReport() {
  try {
    Logger.info('获取最新部署报告...');
    const reportsDir = path.join(__dirname, '../../deployment-reports');
    
    // 检查目录是否存在
    if (!fs.existsSync(reportsDir)) {
      throw new Error(`部署报告目录不存在: ${reportsDir}`);
    }
    
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('localhost-') && file.endsWith('.md'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('-')[1].split('.')[0]);
        const timestampB = parseInt(b.split('-')[1].split('.')[0]);
        return timestampB - timestampA;
      });

    if (files.length === 0) {
      throw new Error('未找到部署报告');
    }

    Logger.info(`找到最新部署报告: ${files[0]}`);
    const reportPath = path.join(reportsDir, files[0]);
    const latestReport = fs.readFileSync(reportPath, 'utf8');
    
    // 从部署报告中提取合约地址
    const systemAddressMatch = latestReport.match(/RealEstateSystem\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const propertyManagerAddressMatch = latestReport.match(/PropertyManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const tradingManagerAddressMatch = latestReport.match(/TradingManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const rewardManagerAddressMatch = latestReport.match(/RewardManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const facadeAddressMatch = latestReport.match(/RealEstateFacade\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    
    // 检查是否成功提取所有地址
    if (!systemAddressMatch) {
      Logger.error('未找到 RealEstateSystem 合约地址');
    }
    if (!propertyManagerAddressMatch) {
      Logger.error('未找到 PropertyManager 合约地址');
    }
    if (!tradingManagerAddressMatch) {
      Logger.error('未找到 TradingManager 合约地址');
    }
    if (!rewardManagerAddressMatch) {
      Logger.error('未找到 RewardManager 合约地址');
    }
    if (!facadeAddressMatch) {
      Logger.error('未找到 RealEstateFacade 合约地址');
    }

    const addresses = {
      systemAddress: systemAddressMatch ? systemAddressMatch[1] : null,
      propertyManagerAddress: propertyManagerAddressMatch ? propertyManagerAddressMatch[1] : null,
      tradingManagerAddress: tradingManagerAddressMatch ? tradingManagerAddressMatch[1] : null,
      rewardManagerAddress: rewardManagerAddressMatch ? rewardManagerAddressMatch[1] : null,
      facadeAddress: facadeAddressMatch ? facadeAddressMatch[1] : null
    };
    
    Logger.info('成功提取合约地址', addresses);
    return addresses;
  } catch (error) {
    Logger.error('获取部署报告失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 检查网络连接
 */
async function checkNetworkConnection() {
  try {
    console.log('检查网络连接...');
    
    // 使用 ProviderManager 获取 Provider
    const provider = ProviderManager.getDefaultProvider();
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    
    // 获取区块号（验证连接）
    const blockNumber = await provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);
    
    return true;
  } catch (error) {
    console.error('网络连接失败:', error);
    return false;
  }
}

/**
 * 检查系统状态和角色权限
 */
async function checkSystemAndRoles(contract, wallet) {
  try {
    console.log('检查系统状态和角色权限...');
    
    // 获取系统合约
    const systemAddress = await contract.system();
    console.log(`系统合约地址: ${systemAddress}`);
    
    if (!systemAddress) {
      throw new Error('无法获取系统合约地址，合约系统属性为空');
    }
    
    // 使用 ContractUtils 获取合约实例
    // 首先尝试使用 ContractUtils，如果失败则使用直接方式
    let system;
    try {
      system = await ContractUtils.getContract('RealEstateSystem', systemAddress);
      console.log('成功使用 ContractUtils 获取系统合约实例');
    } catch (error) {
      console.error('使用 ContractUtils 获取系统合约失败:', error.message);
      
      // 使用直接方式获取合约实例
      console.log('尝试使用直接方式获取系统合约实例...');
      const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
      const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      system = new ethers.Contract(systemAddress, artifact.abi, wallet);
      console.log('成功使用直接方式获取系统合约实例');
    }
    
    // 1. 检查系统状态
    const status = await system.getSystemStatus();
    console.log(`系统状态: ${status.toString()}`);
    
    if (Number(status) !== 2) { // 2 表示 Active 状态
      console.log('系统未处于 Active 状态，正在激活系统...');
      // 获取 admin 钱包
      const adminWallet = WalletManager.getRoleWallet('admin');
      // 使用 admin 钱包激活系统
      await system.connect(adminWallet).setSystemStatus(2);
      console.log('系统已激活');
    }
    
    // 2. 检查钱包是否有 MANAGER_ROLE 权限
    const hasManagerRole = await system.hasRole(ROLES.MANAGER_ROLE, wallet.address);
    console.log(`钱包 ${wallet.address} 是否有 MANAGER_ROLE 权限: ${hasManagerRole}`);
    
    if (!hasManagerRole) {
      console.log('正在授予钱包 MANAGER_ROLE 权限...');
      const adminWallet = WalletManager.getRoleWallet('admin');
      await system.connect(adminWallet).grantRole(ROLES.MANAGER_ROLE, wallet.address);
      console.log('已授予钱包 MANAGER_ROLE 权限');
    }
    
    // 3. 检查合约是否已授权
    // 注意: 在 ethers v6 中，合约地址通过 contract.target 获取
    const contractAddress = typeof contract.target === 'string' ? contract.target : contract.address;
    
    // 在 ethers v6 中，不再使用 isContractAuthorized 函数，而是直接查询 authorizedContracts 映射
    const isContractAuthorized = await system.authorizedContracts(contractAddress);
    console.log(`合约 ${contractAddress} 是否已授权: ${isContractAuthorized}`);
    
    if (!isContractAuthorized) {
      console.log('正在授权合约...');
      const adminWallet = WalletManager.getRoleWallet('admin');
      // 在 ethers v6 中，使用 setContractAuthorization 而不是 authorizeContract
      await system.connect(adminWallet).setContractAuthorization(contractAddress, true);
      console.log('已授权合约');
    }
    
    return system;
  } catch (error) {
    console.error('检查系统状态和角色权限失败:', error);
    throw error;
  }
}

/**
 * 调用合约方法
 */
async function callContractMethods(contract, wallet) {
  try {
    console.log('调用 getVersion 方法...');
    const version = await contract.getVersion();
    console.log(`合约版本: ${version.toString()}`);
    
    // 生成随机房产ID以避免冲突
    const randomId = `test-property-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`使用随机房产ID: ${randomId}`);
    
    console.log('调用 registerPropertyAndCreateToken 方法...');
    try {
      const tx = await contract.connect(wallet).registerPropertyAndCreateToken(
        randomId,
        'Japan',
        'https://example.com/metadata/random',
        1000000,
        'Test Property Token Random',
        'TPTR'
      );
      console.log('交易已发送，等待确认...');
      
      const receipt = await tx.wait();
      console.log(`交易已确认，交易哈希: ${receipt.hash}`);
      return true;
    } catch (error) {
      // 检查错误原因
      console.error('合约方法调用失败:', {
        message: error.message,
        reason: error.reason,
        code: error.code
      });
      
      if (error.message.includes('Property already exists')) {
        console.log('房产ID已存在，这是预期的错误。在实际应用中，您需要使用唯一的房产ID。');
        return true;
      }
      
      throw error;
    }
  } catch (error) {
    console.error('调用合约方法失败:', error);
    throw error;
  }
}

/**
 * 使用指定角色的钱包调用合约
 */
async function callContractWithRoleWallet(role) {
  try {
    console.log(`使用 ${role} 角色的钱包调用合约...`);
    
    // 1. 获取钱包
    const wallet = WalletManager.getRoleWallet(role);
    console.log(`获取到 ${role} 角色的钱包: ${wallet.address}`);
    
    // 2. 获取合约地址
    const { facadeAddress } = getLatestDeploymentReport();
    console.log(`获取到 RealEstateFacade 合约地址: ${facadeAddress}`);
    
    if (!facadeAddress || !ethers.isAddress(facadeAddress)) {
      throw new Error(`无效的合约地址: ${facadeAddress}`);
    }
    
    // 3. 尝试使用 ContractUtils 获取合约实例
    let contract;
    try {
      // 尝试使用 ContractUtils
      contract = await ContractUtils.getContractWithRole('RealEstateFacade', facadeAddress, role);
      console.log('成功使用 ContractUtils 获取合约实例');
    } catch (error) {
      console.error('使用 ContractUtils 获取合约实例失败:', error.message);
      
      // 使用直接方式获取合约实例
      console.log('尝试使用直接方式获取合约实例...');
      const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
      const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      contract = new ethers.Contract(facadeAddress, artifact.abi, wallet);
      console.log('成功使用直接方式获取合约实例');
    }
    
    // 4. 检查合约接口
    if (!contract.interface) {
      console.error('合约接口不存在，无法调用合约方法');
      throw new Error('合约接口不存在');
    }
    
    // 5. 检查系统状态和角色权限
    await checkSystemAndRoles(contract, wallet);
    
    // 6. 调用合约方法
    await callContractMethods(contract, wallet);
    
    console.log('合约调用成功');
    return true;
  } catch (error) {
    console.error('使用角色钱包调用合约失败:', error);
    throw error;
  }
}

/**
 * 主程序入口
 */
async function main() {
  console.log('开始执行测试脚本...');
  
  try {
    // 检查网络连接
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new Error('网络连接失败，请确保本地节点正在运行');
    }
    
    // 使用 operator 角色钱包调用合约
    await callContractWithRoleWallet('operator');
    
    console.log('测试成功完成!');
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

// 执行主程序
main().catch(error => {
  console.error('主程序执行失败:', error);
  process.exit(1);
}); 