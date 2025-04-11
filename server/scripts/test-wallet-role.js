const { Logger, EnvUtils, Blockchain } = require('../../common');
const { ContractUtils, AbiUtils, WalletManager, ProviderManager } = Blockchain;
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// 设置日志级别为 debug
process.env.LOG_LEVEL = 'debug';

// 导入角色常量
const ROLES = {
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

/**
 * 检查网络连接
 */
async function checkNetworkConnection() {
  try {
    console.log('正在检查网络连接...');
    
    // 获取网络配置
    const networkConfig = EnvUtils.getNetworkConfig();
    console.log('网络配置:', networkConfig);
    
    // 获取 Provider
    const provider = ProviderManager.getDefaultProvider();
    console.log('Provider:', provider);
    
    if (!provider) {
      throw new Error('无法获取 Provider 实例');
    }
    
    // 获取网络信息
    const networkInfo = await provider.getNetwork();
    console.log('网络信息:', {
      chainId: networkInfo.chainId.toString(),
      name: networkInfo.name
    });
    
    // 获取区块号
    const blockNumber = await provider.getBlockNumber();
    console.log('当前区块号:', blockNumber.toString());
    
    Logger.info('网络连接状态', {
      blockNumber: blockNumber.toString(),
      chainId: networkInfo.chainId.toString(),
      networkName: networkInfo.name
    });
    
    return true;
  } catch (error) {
    console.error('网络连接失败:', error);
    Logger.error('网络连接失败', { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 检查系统状态和角色权限
 */
async function checkSystemAndRoles(contract, wallet) {
    Logger.info('检查系统状态和角色权限...');
    
    // 获取系统合约
    const systemAddress = await contract.system();
    const system = await ContractUtils.getContract('RealEstateSystem', systemAddress);
    
    // 1. 检查系统状态
    const status = await system.getSystemStatus();
    Logger.info(`系统状态: ${status}`);
    
    if (status !== 2) { // 2 表示 Active 状态
        Logger.info('系统未处于 Active 状态，正在激活系统...');
        // 获取 admin 钱包
        const adminWallet = WalletManager.getRoleWallet('admin');
        // 使用 admin 钱包激活系统
        await system.connect(adminWallet).activateSystem();
        Logger.info('系统已激活');
    }
    
    // 2. 检查钱包是否有 MANAGER_ROLE 权限
    const hasManagerRole = await system.hasRole(RoleConstants.MANAGER_ROLE(), wallet.address);
    Logger.info(`钱包 ${wallet.address} 是否有 MANAGER_ROLE 权限: ${hasManagerRole}`);
    
    if (!hasManagerRole) {
        Logger.info('正在授予钱包 MANAGER_ROLE 权限...');
        await system.connect(adminWallet).grantRole(RoleConstants.MANAGER_ROLE(), wallet.address);
        Logger.info('已授予钱包 MANAGER_ROLE 权限');
    }
    
    // 3. 检查合约是否已授权
    const isContractAuthorized = await system.isContractAuthorized(contract.address);
    Logger.info(`合约 ${contract.address} 是否已授权: ${isContractAuthorized}`);
    
    if (!isContractAuthorized) {
        Logger.info('正在授权合约...');
        await system.connect(adminWallet).authorizeContract(contract.address);
        Logger.info('已授权合约');
    }
    
    Logger.info('系统状态和角色权限检查完成');
}

/**
 * 获取最新的部署报告
 */
function getLatestDeploymentReport() {
    const reportsDir = path.join(__dirname, '../../deployment-reports');
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

    const latestReport = fs.readFileSync(path.join(reportsDir, files[0]), 'utf8');
    Logger.info('读取部署报告:');
    console.log(latestReport);  // 直接输出报告内容
    
    // 从部署报告中提取合约地址
    const systemAddressMatch = latestReport.match(/RealEstateSystem\n- 地址: (0x[a-fA-F0-9]{40})/);
    const propertyManagerAddressMatch = latestReport.match(/PropertyManager\n- 地址: (0x[a-fA-F0-9]{40})/);
    const tradingManagerAddressMatch = latestReport.match(/TradingManager\n- 地址: (0x[a-fA-F0-9]{40})/);
    const rewardManagerAddressMatch = latestReport.match(/RewardManager\n- 地址: (0x[a-fA-F0-9]{40})/);
    const facadeAddressMatch = latestReport.match(/RealEstateFacade\n- 地址: (0x[a-fA-F0-9]{40})/);
    
    if (!systemAddressMatch || !propertyManagerAddressMatch || !tradingManagerAddressMatch || 
        !rewardManagerAddressMatch || !facadeAddressMatch) {
        throw new Error('部署报告中缺少合约地址信息');
    }

    return {
        systemAddress: systemAddressMatch[1],
        propertyManagerAddress: propertyManagerAddressMatch[1],
        tradingManagerAddress: tradingManagerAddressMatch[1],
        rewardManagerAddress: rewardManagerAddressMatch[1],
        facadeAddress: facadeAddressMatch[1]
    };
}

/**
 * 使用指定角色的钱包调用合约
 */
async function callContractWithRoleWallet(role) {
    Logger.info(`使用 ${role} 角色的钱包调用合约...`);
    
    // 1. 获取钱包
    const wallet = WalletManager.getRoleWallet(role);
    Logger.info(`获取到 ${role} 角色的钱包: ${wallet.address}`);
    
    // 2. 获取合约地址
    const { facadeAddress } = getLatestDeploymentReport();
    Logger.info(`获取到 RealEstateFacade 合约地址: ${facadeAddress}`);
    
    // 3. 获取合约实例
    const contract = await ContractUtils.getContract('RealEstateFacade', facadeAddress);
    
    // 4. 检查系统状态和角色权限
    await checkSystemAndRoles(contract, wallet);
    
    // 5. 调用合约方法
    try {
        Logger.info('调用 getVersion 方法...');
        const version = await contract.connect(wallet).getVersion();
        Logger.info(`合约版本: ${version}`);
        
        Logger.info('调用 registerPropertyAndCreateToken 方法...');
        const tx = await contract.connect(wallet).registerPropertyAndCreateToken(
            'test-property-1',
            'Japan',
            'https://example.com/metadata/1',
            1000000,
            'Test Property Token',
            'TPT'
        );
        Logger.info('交易已发送，等待确认...');
        const receipt = await tx.wait();
        Logger.info('交易已确认:', receipt);
    } catch (error) {
        Logger.error('调用合约方法失败:', error);
        throw error;
    }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    // 检查网络连接
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new Error('网络连接失败，请确保本地节点正在运行');
    }
    
    // 使用 operator 角色钱包调用合约
    await callContractWithRoleWallet('operator');
    
    Logger.info('测试完成');
  } catch (error) {
    Logger.error('测试过程中发生错误', { error: error.message });
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  Logger.error('测试执行失败', { error: error.message });
  process.exit(1);
}); 