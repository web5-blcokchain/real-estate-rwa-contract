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

// 引入依赖
const { Logger, Validation } = require('../../shared/src');
const blockchainService = require('../src/services/BlockchainService');
const contractService = require('../src/services/contract.service');

// 设置日志级别
console.log('===== 开始测试房地产代币化流程 =====');

/**
 * 主流程测试函数
 */
async function testPropertyFlow() {
  try {
    // 步骤1: 初始化区块链服务
    await blockchainService.initialize();
    console.log('区块链服务初始化成功');
    
    // 获取区块链网络信息
    const chainId = await blockchainService.getNetworkId();
    const blockNumber = await blockchainService.getBlockNumber();
    console.log(`当前网络: chainId=${chainId}, blockNumber=${blockNumber}`);
    
    // 步骤2: 获取合约实例
    console.log('\n===== 获取合约实例 =====');
    // 获取RealEstateFacade合约实例
    const facadeContract = await getContractWithSigner('RealEstateFacade');
    console.log(`RealEstateFacade合约地址: ${await facadeContract.getAddress()}`);
    
    // 步骤3: 注册房产并创建代币
    console.log('\n===== 注册房产并创建代币 =====');
    const propertyData = {
      propertyId: `PROP${Date.now()}`, // 唯一ID
      name: '东京湾区公寓',
      symbol: 'TBA',
      initialSupply: '10000',
      initialPrice: '0.1',
      location: '日本东京',
      description: '位于东京湾区的高档公寓'
    };
    
    console.log(`尝试注册房产: ${propertyData.propertyId}`);
    try {
      // 获取PropertyToken实现合约地址
      const implementationAddress = await getPropertyTokenImplementation();
      
      // 准备参数并直接调用registerPropertyAndCreateToken
      console.log('使用registerPropertyAndCreateToken方法注册房产');
      const txResponse = await facadeContract.registerPropertyAndCreateToken(
        propertyData.propertyId,
        propertyData.location,
        propertyData.description,
        propertyData.name,
        propertyData.symbol,
        propertyData.initialSupply,
        implementationAddress
      );
      
      console.log(`房产注册交易发送成功: ${txResponse.hash}`);
      const receipt = await txResponse.wait();
      console.log(`房产注册交易确认: ${receipt.status === 1 ? '成功' : '失败'}`);
      
      // 从事件中获取propertyIdHash和tokenAddress
      const propertyIdHash = await getPropertyIdHash(facadeContract, propertyData.propertyId);
      console.log(`房产ID哈希: ${propertyIdHash}`);
      
      // 步骤4: 获取代币地址和详情
      console.log('\n===== 获取代币信息 =====');
      // 获取PropertyManager合约实例
      const propertyManagerContract = await getContractWithSigner('PropertyManager');
      // 获取代币地址
      const tokenAddress = await propertyManagerContract.propertyTokens(propertyIdHash);
      console.log(`代币合约地址: ${tokenAddress}`);
      
      // 获取代币详情
      const tokenContract = await getTokenContract(tokenAddress);
      const tokenName = await tokenContract.name();
      const tokenSymbol = await tokenContract.symbol();
      const totalSupply = await tokenContract.totalSupply();
      
      console.log(`代币名称: ${tokenName}`);
      console.log(`代币符号: ${tokenSymbol}`);
      console.log(`代币总供应量: ${totalSupply}`);
      
      // 步骤5: 测试代币转账
      console.log('\n===== 测试代币转账 =====');
      // 获取签名者地址
      const signerAddress = await facadeContract.signer.getAddress();
      console.log(`签名者地址: ${signerAddress}`);
      
      // 设置接收地址(这里用签名者地址模拟，实际应用中应使用其他地址)
      const receiverAddress = signerAddress;
      const transferAmount = '100';
      
      // 执行转账
      console.log(`尝试转账 ${transferAmount} 代币到地址: ${receiverAddress}`);
      const transferTx = await tokenContract.transfer(receiverAddress, transferAmount);
      console.log(`转账交易发送成功: ${transferTx.hash}`);
      const transferReceipt = await transferTx.wait();
      console.log(`转账交易确认: ${transferReceipt.status === 1 ? '成功' : '失败'}`);
      
      // 检查余额
      const balance = await tokenContract.balanceOf(receiverAddress);
      console.log(`接收地址余额: ${balance}`);
      
      // 步骤6: 创建销售订单
      console.log('\n===== 创建销售订单 =====');
      // 授权合约操作代币
      console.log('授权Facade合约操作代币');
      const approveTx = await tokenContract.approve(await facadeContract.getAddress(), '50');
      await approveTx.wait();
      
      // 创建销售订单
      console.log('创建销售订单');
      const sellAmount = '50';
      const sellPrice = '0.15'; // 以太币单价
      
      try {
        const orderTx = await facadeContract.createOrder(tokenAddress, sellAmount, sellPrice);
        console.log(`订单创建交易发送成功: ${orderTx.hash}`);
        const orderReceipt = await orderTx.wait();
        console.log(`订单创建交易确认: ${orderReceipt.status === 1 ? '成功' : '失败'}`);
        
        // 尝试获取订单ID
        const orderId = await getLatestOrderId();
        if (orderId) {
          console.log(`订单ID: ${orderId}`);
        }
      } catch (orderError) {
        console.log(`创建订单失败: ${orderError.message}`);
      }
      
      // 步骤7: 创建收益分配
      console.log('\n===== 测试收益分配 =====');
      try {
        // 使用管理员账户创建收益分配
        const rewardAmount = '1.0'; // 1个ETH
        const rewardDescription = '季度分红';
        
        console.log(`尝试创建收益分配，金额: ${rewardAmount} ETH`);
        const distributionTx = await facadeContract.createDistribution(
          propertyIdHash,
          rewardAmount,
          rewardDescription,
          true, // 应用费用
          '0x0000000000000000000000000000000000000000' // 使用ETH
        );
        
        console.log(`收益分配交易发送成功: ${distributionTx.hash}`);
        const distributionReceipt = await distributionTx.wait();
        console.log(`收益分配交易确认: ${distributionReceipt.status === 1 ? '成功' : '失败'}`);
        
        // 获取分配ID
        const distributionId = await getLatestDistributionId();
        if (distributionId) {
          console.log(`分配ID: ${distributionId}`);
          
          // 尝试领取收益
          console.log('\n尝试领取收益');
          const claimTx = await facadeContract.claimRewards(distributionId);
          console.log(`领取收益交易发送成功: ${claimTx.hash}`);
          const claimReceipt = await claimTx.wait();
          console.log(`领取收益交易确认: ${claimReceipt.status === 1 ? '成功' : '失败'}`);
        }
      } catch (rewardError) {
        console.log(`收益分配测试失败: ${rewardError.message}`);
      }
      
      console.log('\n===== 所有测试步骤完成 =====');
      
    } catch (error) {
      console.error(`房产注册失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('测试流程失败:', error);
  }
}

/**
 * 获取带签名者的合约实例
 * @param {string} contractName - 合约名称
 * @returns {Promise<Contract>} 合约实例
 */
async function getContractWithSigner(contractName) {
  // 获取合约ABI
  const abi = await contractService.getABIByName(contractName);
  if (!abi) {
    throw new Error(`未找到合约 ${contractName} 的ABI`);
  }
  
  // 获取合约地址
  const address = await contractService.getAddressByName(contractName);
  if (!address) {
    throw new Error(`未找到合约 ${contractName} 的地址`);
  }
  
  // 获取私钥
  const privateKey = process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('未找到管理员私钥');
  }
  
  // 创建带签名者的合约实例
  return await blockchainService.getSignedContractInstance(abi, address, privateKey);
}

/**
 * 获取代币合约实例
 * @param {string} tokenAddress - 代币合约地址
 * @returns {Promise<Contract>} 代币合约实例
 */
async function getTokenContract(tokenAddress) {
  // 获取PropertyToken合约ABI
  const abi = await contractService.getABIByName('PropertyToken');
  if (!abi) {
    throw new Error('未找到PropertyToken合约的ABI');
  }
  
  // 获取私钥
  const privateKey = process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('未找到管理员私钥');
  }
  
  // 创建带签名者的合约实例
  return await blockchainService.getSignedContractInstance(abi, tokenAddress, privateKey);
}

/**
 * 获取PropertyIdHash
 * @param {Contract} facadeContract - Facade合约实例
 * @param {string} propertyId - 房产ID
 * @returns {Promise<string>} PropertyIdHash
 */
async function getPropertyIdHash(facadeContract, propertyId) {
  try {
    // 尝试直接获取
    return await facadeContract.propertyIdToHash(propertyId);
  } catch (error) {
    // 如果Facade没有此方法，尝试使用PropertyManager
    const propertyManagerContract = await getContractWithSigner('PropertyManager');
    return await propertyManagerContract.propertyIdToHash(propertyId);
  }
}

/**
 * 获取PropertyToken实现合约地址
 * @returns {Promise<string>} 实现合约地址
 */
async function getPropertyTokenImplementation() {
  // 尝试从环境变量或配置中获取
  const implementationAddress = process.env.PROPERTY_TOKEN_IMPLEMENTATION;
  if (implementationAddress) {
    return implementationAddress;
  }
  
  // 否则抛出错误
  throw new Error('无法获取PropertyToken实现合约地址');
}

/**
 * 获取最新创建的订单ID
 * @returns {Promise<string>} 订单ID
 */
async function getLatestOrderId() {
  try {
    // 获取TradingManager合约
    const tradingManager = await getContractWithSigner('TradingManager');
    // 获取订单数量
    const orderCount = await tradingManager.getOrderCount();
    if (orderCount > 0) {
      return orderCount.toString();
    }
    return null;
  } catch (error) {
    console.log(`获取最新订单ID失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取最新创建的分配ID
 * @returns {Promise<string>} 分配ID
 */
async function getLatestDistributionId() {
  try {
    // 获取RewardManager合约
    const rewardManager = await getContractWithSigner('RewardManager');
    // 获取分配数量
    const distributionCount = await rewardManager.getDistributionCount();
    if (distributionCount > 0) {
      return distributionCount.toString();
    }
    return null;
  } catch (error) {
    console.log(`获取最新分配ID失败: ${error.message}`);
    return null;
  }
}

// 执行测试流程
testPropertyFlow()
  .then(() => {
    console.log('测试完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  }); 