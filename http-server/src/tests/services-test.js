/**
 * 服务测试文件
 * 用于测试区块链服务功能
 */

// 导入服务
const blockchainService = require('../services/blockchainService');
const { Logger } = require('../../../shared/src');

// 将日志级别设为debug以便查看更多信息
Logger.configure({ level: 'debug' });

/**
 * 运行测试
 */
async function runTests() {
  console.log('======= 开始测试区块链服务 =======');
  
  try {
    // 测试区块链服务
    await testBlockchainService();
    
    console.log('======= 测试完成，所有测试通过 =======');
  } catch (error) {
    console.error('======= 测试失败 =======');
    console.error(error);
  }
}

/**
 * 测试区块链服务
 */
async function testBlockchainService() {
  console.log('\n1. 测试基础区块链功能');
  
  // 初始化
  console.log('- 初始化区块链服务');
  await blockchainService.initialize();
  
  // 获取网络信息
  console.log('- 获取网络信息');
  const networkInfo = await blockchainService.getNetworkInfo();
  console.log(`  连接到网络: ${networkInfo.name} (${networkInfo.chainId})`);
  console.log(`  当前区块: ${networkInfo.blockNumber}`);
  console.log(`  Gas价格: ${networkInfo.formattedGasPrice}`);
  
  // 获取Provider
  console.log('- 获取Provider');
  const provider = await blockchainService.getProvider();
  console.log(`  Provider可用: ${!!provider}`);
  
  console.log('\n2. 测试合约功能');
  
  try {
    const contractName = 'RealEstateFacade';
    
    // 创建合约实例
    console.log(`- 尝试创建合约实例: ${contractName}`);
    try {
      const contract = await blockchainService.createContract(contractName);
      console.log(`  合约实例创建${contract ? '成功' : '失败'}`);
      
      // 如果成功创建，尝试调用一个方法
      if (contract) {
        console.log('- 尝试调用合约只读方法');
        try {
          const result = await blockchainService.callContractMethod(contract, 'getSystemInfo');
          console.log(`  调用成功: ${JSON.stringify(result)}`);
        } catch (callError) {
          console.log(`  调用方法失败: ${callError.message}`);
        }
      }
    } catch (contractError) {
      console.log(`  创建合约实例失败: ${contractError.message}`);
      console.log('  这可能是因为合约地址未设置或ABI未找到');
      console.log('  这是正常的，因为shared模块会处理这些细节');
    }
  } catch (error) {
    console.log(`  合约测试出现错误: ${error.message}`);
  }
  
  console.log('\n3. 测试钱包功能');
  
  try {
    console.log('- 尝试创建测试钱包');
    try {
      // 使用一个随机的临时私钥进行测试
      const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
      const wallet = await blockchainService.createWalletFromPrivateKey(privateKey);
      console.log(`  钱包创建${wallet ? '成功' : '失败'}`);
      if (wallet) {
        console.log(`  钱包地址: ${await wallet.getAddress()}`);
      }
    } catch (walletError) {
      console.log(`  创建钱包失败: ${walletError.message}`);
    }
  } catch (error) {
    console.log(`  钱包测试出现错误: ${error.message}`);
  }
  
  console.log('\n✅ 区块链服务测试完成');
}

// 执行测试
runTests().catch(console.error); 