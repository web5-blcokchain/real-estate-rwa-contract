const { Logger, EnvUtils } = require('../../common');
const { ContractUtils } = require('../../common');
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const fs = require('fs');
const path = require('path');

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