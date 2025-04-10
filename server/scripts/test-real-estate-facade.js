const { Logger, EnvUtils, AddressUtils } = require('../../common');
const { ResponseUtils } = require('../utils');
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const { ethers } = require('ethers');

// 创建控制器实例
const controller = new RealEstateFacadeController();

// 测试配置
const TEST_CONFIG = {
  API_KEY: EnvUtils.getApiKey(),
  API_BASE_URL: EnvUtils.getString('API_BASE_URL', 'http://localhost:3000'),
  WAIT_CONFIRMATION: true, // 是否等待交易确认
  CONFIRMATION_TIMEOUT: 60000, // 交易确认超时时间（毫秒）
  CONFIRMATION_INTERVAL: 2000, // 检查交易状态的间隔（毫秒）
};

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
    initialSupply: '1000000000000000000' // 1 token
  },
  propertyTokenImplementation: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  status: 1, // Active
  orderId: '0x1234567890123456789012345678901234567890',
  distributionId: '0x1234567890123456789012345678901234567890',
  amount: '1000000000000000000', // 1 ETH
  price: '2000000000000000000', // 2 ETH
  recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
};

/**
 * 检查账户角色
 * @param {ethers.Contract} contract - 合约实例
 * @param {string} account - 账户地址
 * @param {string} role - 角色名称
 */
async function checkRole(contract, account, role) {
  try {
    // 使用正确的角色哈希
    const roleHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${role.toUpperCase()}_ROLE`)
    );
    
    const hasRole = await contract.hasRole(roleHash, account);
    Logger.info(`角色检查`, { 
      account,
      role,
      hasRole,
      roleHash
    });
    return hasRole;
  } catch (error) {
    Logger.error(`角色检查失败`, { error: error.message });
    return false;
  }
}

/**
 * 等待交易确认
 * @param {string} txHash - 交易哈希
 * @returns {Promise<Object>} 交易收据
 */
async function waitForConfirmation(txHash) {
  if (!TEST_CONFIG.WAIT_CONFIRMATION) {
    return { hash: txHash };
  }

  Logger.info('等待交易确认...', { txHash });
  
  const provider = new ethers.JsonRpcProvider(EnvUtils.getString('LOCALHOST_RPC_URL', 'http://localhost:8545'));
  const startTime = Date.now();
  
  while (Date.now() - startTime < TEST_CONFIG.CONFIRMATION_TIMEOUT) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        Logger.info('交易已确认', { 
          txHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status === 1 ? '成功' : '失败'
        });
        return receipt;
      }
    } catch (error) {
      Logger.error('获取交易收据失败', { error: error.message });
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.CONFIRMATION_INTERVAL));
  }
  
  throw new Error('交易确认超时');
}

/**
 * 执行测试用例
 * @param {string} name - 测试用例名称
 * @param {Function} testFn - 测试函数
 */
async function runTest(name, testFn) {
  Logger.info(`\n开始测试: ${name}`);
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
    Logger.info('开始RealEstateFacadeController测试', { config: TEST_CONFIG });
    
    // 获取合约实例和账户信息
    const contract = controller.getContract('RealEstateFacade', 'manager');
    Logger.info('合约实例创建成功', { 
      contractAddress: contract.address,
      contractName: 'RealEstateFacade'
    });
    
    const provider = new ethers.JsonRpcProvider(EnvUtils.getString('LOCALHOST_RPC_URL', 'http://localhost:8545'));
    Logger.info('Provider创建成功', { 
      network: await provider.getNetwork()
    });
    
    const privateKey = EnvUtils.getString('ADMIN_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('未设置PRIVATE_KEY环境变量');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    const account = wallet.address;
    
    Logger.info('当前账户信息', {
      account,
      contractAddress: contract.address,
      network: await provider.getNetwork()
    });
    
    // 检查角色
    await checkRole(contract, account, 'manager');
    await checkRole(contract, account, 'admin');
    await checkRole(contract, account, 'operator');
    
    // 1. 测试注册房产并创建代币
    const registerResult = await runTest('registerPropertyAndCreateToken', async () => {
      const result = await controller.registerPropertyAndCreateToken(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            propertyData: TEST_DATA.propertyData,
            tokenData: TEST_DATA.tokenData,
            propertyTokenImplementation: TEST_DATA.propertyTokenImplementation
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 2. 测试更新房产状态
    await runTest('updatePropertyStatus', async () => {
      const result = await controller.updatePropertyStatus(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            status: TEST_DATA.status
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 3. 测试执行交易
    await runTest('executeTrade', async () => {
      const result = await controller.executeTrade(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            orderId: TEST_DATA.orderId
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 4. 测试创建分配
    await runTest('createDistribution', async () => {
      const result = await controller.createDistribution(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            amount: TEST_DATA.amount
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 5. 测试分配奖励
    await runTest('distributeRewards', async () => {
      const result = await controller.distributeRewards(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            distributionId: TEST_DATA.distributionId
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 6. 测试获取版本
    await runTest('getVersion', async () => {
      return await controller.getVersion(
        {},
        { json: (data) => data }
      );
    });
    
    // 7. 测试领取奖励
    await runTest('claimRewards', async () => {
      const result = await controller.claimRewards(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 8. 测试创建订单
    await runTest('createOrder', async () => {
      const result = await controller.createOrder(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            amount: TEST_DATA.amount,
            price: TEST_DATA.price
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    // 9. 测试取消订单
    await runTest('cancelOrder', async () => {
      const result = await controller.cancelOrder(
        { 
          body: { 
            propertyId: TEST_DATA.propertyId,
            orderId: TEST_DATA.orderId
          } 
        },
        { json: (data) => data }
      );
      await waitForConfirmation(result.transactionHash);
      return result;
    });
    
    Logger.info('所有测试完成');
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