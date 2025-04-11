const { Logger, EnvUtils } = require('../../common');
const { ContractUtils } = require('../../common');
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// 导入角色常量
const ROLES = {
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

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
  
  // 从 Markdown 报告中提取合约地址
  const contractAddresses = {};
  const addressRegex = /地址: (0x[a-fA-F0-9]{40})/g;
  let match;
  
  while ((match = addressRegex.exec(latestReport)) !== null) {
    const contractName = latestReport.substring(0, match.index).split('\n').pop().trim();
    contractAddresses[contractName] = match[1];
  }
  
  return {
    contracts: {
      realEstateFacade: {
        address: contractAddresses['RealEstateFacade']
      },
      realEstateSystem: {
        address: contractAddresses['RealEstateSystem']
      }
    }
  };
}

// 创建控制器实例
const controller = new RealEstateFacadeController();

// 测试数据
const TEST_DATA = {
  propertyId: '0x1234567890123456789012345678901234567890',
  propertyData: {
    country: 'JP',
    metadataURI: 'ipfs://Qm...'
  },
  tokenData: {
    name: 'Test Property Token',
    symbol: 'TPT',
    initialSupply: '1000000000000000000'
  },
  propertyTokenImplementation: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
};

/**
 * 执行测试用例
 */
async function runTest(name, testFn) {
  Logger.info(`开始测试: ${name}`);
  try {
    const result = await testFn();
    Logger.info(`测试成功: ${name}`, { result });
    return result;
  } catch (error) {
    Logger.error(`测试失败: ${name}`, { error: error.message });
    throw error;
  }
}

/**
 * 检查系统状态和角色权限
 */
async function checkSystemAndRoles() {
  Logger.info('检查系统状态和角色权限...');
  
  // 获取系统合约实例
  const systemContract = controller.getContract('RealEstateSystem', 'admin');
  
  // 检查系统状态
  const systemStatus = await systemContract.getSystemStatus();
  Logger.info(`当前系统状态: ${systemStatus} (${getSystemStatusName(systemStatus)})`);
  
  if (systemStatus !== 2) { // 2 = Active
    Logger.warn(`系统状态为 ${systemStatus} (${getSystemStatusName(systemStatus)})，尝试设置为 Active...`);
    const tx = await systemContract.setSystemStatus(2);
    await tx.wait();
    const newStatus = await systemContract.getSystemStatus();
    Logger.info(`系统状态已更新为: ${newStatus} (${getSystemStatusName(newStatus)})`);
  } else {
    Logger.info('系统已处于激活状态');
  }
  
  // 检查角色权限
  const operatorAddress = EnvUtils.getString('OPERATOR_ADDRESS');
  const hasOperatorRole = await systemContract.hasRole(
    ROLES.OPERATOR_ROLE,
    operatorAddress
  );
  Logger.info(`操作员角色权限: ${hasOperatorRole}`);
  
  if (!hasOperatorRole) {
    Logger.warn('操作员没有权限，尝试授予权限...');
    const tx = await systemContract.grantRole(
      ROLES.OPERATOR_ROLE,
      operatorAddress
    );
    await tx.wait();
    Logger.info('已授予操作员权限');
  }
  
  // 检查合约授权
  const facadeAddress = EnvUtils.getString('CONTRACT_REALESTATEFACADE_ADDRESS');
  const isAuthorized = await systemContract.authorizedContracts(facadeAddress);
  Logger.info(`门面合约授权状态: ${isAuthorized}`);
  
  if (!isAuthorized) {
    Logger.warn('门面合约未授权，尝试授权...');
    const tx = await systemContract.setContractAuthorization(facadeAddress, true);
    await tx.wait();
    Logger.info('已授权门面合约');
  }
}

/**
 * 获取系统状态名称
 */
function getSystemStatusName(status) {
  switch (status) {
    case 0: return 'Inactive';
    case 1: return 'Testing';
    case 2: return 'Active';
    case 3: return 'Suspended';
    case 4: return 'Upgrading';
    default: return 'Unknown';
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    // 获取合约地址
    const facadeAddress = EnvUtils.getString('CONTRACT_REALESTATEFACADE_ADDRESS');
    const systemAddress = EnvUtils.getString('CONTRACT_REALESTATESYSTEM_ADDRESS');
    
    Logger.info('使用合约地址', { 
      facadeAddress,
      systemAddress
    });

    // 检查系统状态和角色权限
    await checkSystemAndRoles();

    // 设置角色重写映射
    controller.constructor.setRoleOverrides({
      'registerPropertyAndCreateToken': 'operator',
      'getVersion': 'operator'
    });
    
    // 测试注册房产并创建代币
    await runTest('registerPropertyAndCreateToken', async () => {
      return await controller.registerPropertyAndCreateToken({
        body: {
          propertyId: TEST_DATA.propertyId,
          propertyData: TEST_DATA.propertyData,
          tokenData: TEST_DATA.tokenData,
          propertyTokenImplementation: TEST_DATA.propertyTokenImplementation
        }
      });
    });

    // 测试获取版本
    await runTest('getVersion', async () => {
      return await controller.getVersion({});
    });

    Logger.info('基础接口测试完成');
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