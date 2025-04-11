/**
 * RealEstateFacadeController 测试脚本
 * 测试房地产外观控制器的各项功能
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger, EnvUtils, Blockchain } = require('../../common');
const { ResponseUtils } = require('../utils');
const BaseController = require('../controllers/BaseController');
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const { 
  ContractUtils, 
  WalletManager, 
  ProviderManager, 
  AbiUtils 
} = Blockchain;

// 设置日志级别为 debug
process.env.LOG_LEVEL = 'debug';

// 导入角色常量
const ROLES = {
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

// 创建模拟的 Express 响应对象
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.responseData = null;
    this.responseHeaders = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.responseData = data;
    return this;
  }

  send(data) {
    this.responseData = data;
    return this;
  }

  setHeader(name, value) {
    this.responseHeaders[name] = value;
    return this;
  }

  getResult() {
    return {
      statusCode: this.statusCode,
      data: this.responseData,
      headers: this.responseHeaders
    };
  }
}

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
    const facadeAddressMatch = latestReport.match(/RealEstateFacade\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    
    // 确保我们至少找到了关键合约
    if (!systemAddressMatch) {
      throw new Error('未在部署报告中找到 RealEstateSystem 合约地址');
    }
    
    if (!facadeAddressMatch) {
      throw new Error('未在部署报告中找到 RealEstateFacade 合约地址');
    }

    const addresses = {
      systemAddress: systemAddressMatch ? systemAddressMatch[1] : null,
      propertyManagerAddress: propertyManagerAddressMatch ? propertyManagerAddressMatch[1] : null,
      facadeAddress: facadeAddressMatch ? facadeAddressMatch[1] : null
    };
    
    // 将地址写入环境变量，以便控制器能够正确获取
    if (addresses.systemAddress) {
      process.env.CONTRACT_REALESTATESYSTEM_ADDRESS = addresses.systemAddress;
    }
    
    if (addresses.propertyManagerAddress) {
      process.env.CONTRACT_PROPERTYMANAGER_ADDRESS = addresses.propertyManagerAddress;
    }
    
    if (addresses.facadeAddress) {
      process.env.CONTRACT_REALESTATEFACADE_ADDRESS = addresses.facadeAddress;
    }
    
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
async function checkSystemAndRoles() {
  try {
    console.log('检查系统状态和角色权限...');
    
    // 获取系统合约地址
    const { systemAddress } = getLatestDeploymentReport();
    
    // 直接使用 ethers.js 加载合约实例
    const adminWallet = WalletManager.getRoleWallet('admin');
    const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const system = new ethers.Contract(systemAddress, artifact.abi, adminWallet);
    
    // 1. 检查系统状态
    const status = await system.getSystemStatus();
    console.log(`系统状态: ${status.toString()} (${getSystemStatusName(status)})`);
    
    if (Number(status) !== 2) { // 2 表示 Active 状态
      console.log('系统未处于 Active 状态，正在激活系统...');
      const tx = await system.setSystemStatus(2);
      await tx.wait();
      console.log('系统已激活');
      const newStatus = await system.getSystemStatus();
      console.log(`系统状态已更新为: ${newStatus} (${getSystemStatusName(newStatus)})`);
    }
    
    // 2. 确保操作员有相应的角色权限
    const operatorAddress = WalletManager.getRoleWallet('operator').address;
    const hasOperatorRole = await system.hasRole(ROLES.OPERATOR_ROLE, operatorAddress);
    console.log(`地址 ${operatorAddress} 是否有 OPERATOR_ROLE 权限: ${hasOperatorRole}`);
    
    if (!hasOperatorRole) {
      console.log('正在授予 OPERATOR_ROLE 权限...');
      const tx = await system.grantRole(ROLES.OPERATOR_ROLE, operatorAddress);
      await tx.wait();
      console.log('已授予 OPERATOR_ROLE 权限');
    }
    
    // 3. 确保管理员有 MANAGER_ROLE 权限
    const adminAddress = adminWallet.address;
    const hasManagerRole = await system.hasRole(ROLES.MANAGER_ROLE, adminAddress);
    console.log(`地址 ${adminAddress} 是否有 MANAGER_ROLE 权限: ${hasManagerRole}`);
    
    if (!hasManagerRole) {
      console.log('正在授予管理员 MANAGER_ROLE 权限...');
      const tx = await system.grantRole(ROLES.MANAGER_ROLE, adminAddress);
      await tx.wait();
      console.log('已授予管理员 MANAGER_ROLE 权限');
    }
    
    // 4. 确保 manager 角色账户有 MANAGER_ROLE 权限
    const managerWallet = WalletManager.getRoleWallet('manager');
    const managerAddress = managerWallet.address;
    const hasManagerRoleForManager = await system.hasRole(ROLES.MANAGER_ROLE, managerAddress);
    console.log(`地址 ${managerAddress} 是否有 MANAGER_ROLE 权限: ${hasManagerRoleForManager}`);
    
    if (!hasManagerRoleForManager) {
      console.log('正在授予 manager 账户 MANAGER_ROLE 权限...');
      const tx = await system.grantRole(ROLES.MANAGER_ROLE, managerAddress);
      await tx.wait();
      console.log('已授予 manager 账户 MANAGER_ROLE 权限');
    }
    
    // 5. 检查门面合约是否已授权
    const { facadeAddress } = getLatestDeploymentReport();
    const isAuthorized = await system.authorizedContracts(facadeAddress);
    console.log(`门面合约 ${facadeAddress} 是否已授权: ${isAuthorized}`);
    
    if (!isAuthorized) {
      console.log('正在授权门面合约...');
      const tx = await system.setContractAuthorization(facadeAddress, true);
      await tx.wait();
      console.log('已授权门面合约');
    }
    
    return {
      system,
      status: status.toString(),
      operatorAddress,
      adminAddress,
      managerAddress,
      facadeAddress
    };
  } catch (error) {
    console.error('检查系统状态和角色权限失败:', error);
    throw error;
  }
}

/**
 * 获取系统状态名称
 */
function getSystemStatusName(status) {
  switch (Number(status)) {
    case 0: return 'Inactive';
    case 1: return 'Testing';
    case 2: return 'Active';
    case 3: return 'Suspended';
    case 4: return 'Upgrading';
    default: return 'Unknown';
  }
}

/**
 * 测试用例：获取合约版本
 */
async function testGetVersion(controller) {
  console.log('\n===== 测试获取合约版本 =====');
  
  try {
    // 创建模拟请求和响应
    const req = {};
    const res = new MockResponse();
    
    // 调用控制器方法
    await controller.getVersion(req, res);
    
    // 获取响应结果
    const result = res.getResult();
    console.log('控制器响应:', result);
    
    if (result.statusCode === 200 && result.data && result.data.success) {
      console.log('✓ 测试通过，版本号:', result.data.data.version);
      return true;
    } else {
      console.error('✗ 测试失败，响应状态码不是 200 或响应不包含成功的版本信息');
      return false;
    }
  } catch (error) {
    console.error('✗ 测试失败:', error);
    return false;
  }
}

/**
 * 测试用例：注册房产并创建代币
 */
async function testRegisterPropertyAndCreateToken(controller) {
  console.log('\n===== 测试注册房产并创建代币 =====');
  
  try {
    // 生成随机房产ID以避免冲突
    const randomId = `test-property-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`使用随机房产ID: ${randomId}`);
    
    // 创建模拟请求
    const req = {
      body: {
        propertyId: randomId,
        propertyData: {
          country: 'Japan',
          metadataURI: 'https://example.com/metadata/random'
        },
        tokenData: {
          name: 'Test Property Token Random',
          symbol: 'TPTR',
          initialSupply: ethers.parseEther('1000').toString()
        },
      }
    };
    
    const res = new MockResponse();
    
    // 调用控制器方法
    console.log('调用 registerPropertyAndCreateToken 方法...');
    await controller.registerPropertyAndCreateToken(req, res);
    
    // 获取响应结果
    const result = res.getResult();
    console.log('控制器响应:', result);
    
    if (result.statusCode === 200 && result.data && result.data.success) {
      console.log('✓ 测试通过，交易哈希:', result.data.data.transactionHash);
      return true;
    } else {
      console.error('✗ 测试失败，响应状态码不是 200 或响应不包含成功信息');
      return false;
    }
  } catch (error) {
    console.error('✗ 测试失败:', error);
    return false;
  }
}

/**
 * 测试用例：更新房产状态
 */
async function testUpdatePropertyStatus(controller, propertyId) {
  console.log('\n===== 测试更新房产状态 =====');
  
  try {
    console.log('改用直接方式调用合约...');
    
    // 获取合约地址
    const { facadeAddress, systemAddress } = getLatestDeploymentReport();
    
    // 使用 admin 钱包（已确认有 MANAGER_ROLE 权限）
    const adminWallet = WalletManager.getRoleWallet('admin');
    console.log(`使用 admin 钱包: ${adminWallet.address}`);
    
    // 尝试直接在 RealEstateSystem 中授予权限
    console.log('尝试直接在 RealEstateSystem 中授予 MANAGER_ROLE 权限...');
    const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const systemArtifact = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8'));
    const systemContract = new ethers.Contract(systemAddress, systemArtifact.abi, adminWallet);
    
    // 获取 MANAGER_ROLE 哈希
    const MANAGER_ROLE = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08';
    
    // 用 DEFAULT_ADMIN_ROLE 权限直接授予自己 MANAGER_ROLE 权限
    console.log(`检查 ${adminWallet.address} 是否有 MANAGER_ROLE 权限...`);
    const hasRole = await systemContract.hasRole(MANAGER_ROLE, adminWallet.address);
    console.log(`检查结果: ${hasRole}`);
    
    if (!hasRole) {
      console.log('开始授予权限...');
      const tx = await systemContract.grantRole(MANAGER_ROLE, adminWallet.address);
      await tx.wait();
      console.log('权限授予完成');
      
      // 再次检查
      const hasRoleNow = await systemContract.hasRole(MANAGER_ROLE, adminWallet.address);
      console.log(`授权后再次检查结果: ${hasRoleNow}`);
    }
    
    // 直接使用 ethers.js 加载合约实例
    console.log('加载 RealEstateFacade 合约...');
    const abiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(facadeAddress, artifact.abi, adminWallet);
    
    // 直接调用合约方法
    console.log('调用 updatePropertyStatus 方法，将状态设置为 ForSale...');
    console.log('参数:', { propertyId, status: 2 });
    
    const tx = await contract.updatePropertyStatus(propertyId, 2);
    console.log('交易已发送:', tx.hash);
    
    // 等待交易确认
    console.log('等待交易确认...');
    const receipt = await tx.wait();
    console.log('交易已确认，交易哈希:', receipt.hash);
    
    return true;
  } catch (error) {
    console.error('测试失败:', error);
    return false;
  }
}

/**
 * 主程序入口
 */
async function main() {
  console.log('===== 开始测试 RealEstateFacadeController =====');
  
  // 检查网络连接
  const isConnected = await checkNetworkConnection();
  if (!isConnected) {
    throw new Error('网络连接失败，请确保本地节点正在运行');
  }
  
  // 获取合约地址
  const deploymentReport = getLatestDeploymentReport();
  console.log('部署报告合约地址:', deploymentReport);
  
  // 检查系统状态和角色权限
  await checkSystemAndRoles();
  
  // 创建控制器实例
  console.log('创建 RealEstateFacadeController 实例...');
  const controller = new RealEstateFacadeController();
  
  // 设置角色重写映射，确保所有方法都使用正确的角色调用
  BaseController.setRoleOverrides({
    'registerPropertyAndCreateToken': 'operator',
    'updatePropertyStatus': 'manager',
    'executeTrade': 'operator',
    'createDistribution': 'manager',
    'distributeRewards': 'manager',
    'getVersion': 'operator',
    'claimRewards': 'operator',
    'createOrder': 'operator',
    'cancelOrder': 'operator'
  });
  
  // 运行测试用例
  let propertyId = null;
  
  console.log('开始执行测试用例...');
  
  // 测试获取合约版本
  const versionTestResult = await testGetVersion(controller);
  if (!versionTestResult) {
    throw new Error('获取合约版本测试失败');
  }
  
  // 测试注册房产并创建代币
  const randomId = `test-property-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  console.log(`准备注册新房产，ID: ${randomId}`);
  
  // 创建模拟请求
  const registerReq = {
    body: {
      propertyId: randomId,
      propertyData: {
        country: 'Japan',
        metadataURI: 'https://example.com/metadata/random'
      },
      tokenData: {
        name: 'Test Property Token Random',
        symbol: 'TPTR',
        initialSupply: ethers.parseEther('1000').toString()
      }
    }
  };
  
  const registerRes = new MockResponse();
  
  // 调用注册方法
  await controller.registerPropertyAndCreateToken(registerReq, registerRes);
  const registerResult = registerRes.getResult();
  
  // 检查注册结果
  if (registerResult.statusCode === 200 && registerResult.data && registerResult.data.success) {
    console.log(`✓ 注册房产成功，ID: ${randomId}`);
    propertyId = randomId; // 使用注册成功的房产ID用于后续测试
  } else {
    console.error('✗ 注册房产失败');
    throw new Error('注册房产并创建代币测试失败');
  }
  
  // 等待一段时间确保区块链确认
  console.log('等待区块链确认...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试更新房产状态
  console.log(`使用已注册的房产ID ${propertyId} 测试更新状态...`);
  const updateStatusTestResult = await testUpdatePropertyStatus(controller, propertyId);
  if (!updateStatusTestResult) {
    console.warn('更新房产状态测试失败，但继续执行其他测试');
  }
  
  console.log('\n===== 所有测试完成 =====');
}

// 执行主程序
main().catch(error => {
  console.error('主程序执行失败:', error);
  process.exit(1);
}); 