const { ethers } = require('ethers');
const { getNetworkConfig } = require('../../shared/utils/network');
const { getContractAddresses } = require('../../shared/config/contracts');
const { getAbi } = require('../../shared/utils/getAbis');
const { ApiError } = require('../src/middlewares/errorHandler');
const logger = require('../src/utils/logger');
const { initializeBlockchain } = require('../../shared/utils/blockchain');

// 测试流程
async function testFlow() {
  try {
    console.log('\n开始真实区块链接口测试...\n');
    console.log('注意：这些测试将连接真实区块链网络，并提交实际的交易！\n');

    // 初始化区块链连接
    const { provider, signer } = await initializeBlockchain();
    
    // 获取合约地址
    const addresses = await getContractAddresses();
    if (!addresses) {
      throw new ApiError(500, '未找到合约地址配置');
    }

    // 测试房产流程
    console.log('===== 测试房产流程 =====\n');
    
    try {
      console.log('注册新房产...');
      const propertyRegistry = new ethers.Contract(
        addresses.propertyRegistry,
        await getAbi('PropertyRegistry'),
        signer
      );
      
      const tx = await propertyRegistry.registerProperty(
        'PROP123',
        'JP',
        'ipfs://test-uri'
      );
      await tx.wait();
      console.log('房产注册成功！\n');
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
      console.log('获取房产列表...');
      const propertyRegistry = new ethers.Contract(
        addresses.propertyRegistry,
        await getAbi('PropertyRegistry'),
        provider
      );
      
      const count = await propertyRegistry.getPropertyCount();
      console.log(`找到 ${count.toString()} 个房产\n`);
      
      for (let i = 0; i < count; i++) {
        const propertyId = await propertyRegistry.propertyIds(i);
        const property = await propertyRegistry.properties(propertyId);
        console.log(`房产 ${propertyId}:`, property);
      }
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取房产列表失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是合约地址或ABI错误');
      }
      console.log('----------------------------------------\n');
    }

    // 测试代币流程
    console.log('===== 测试代币流程 =====\n');
    
    try {
      console.log('创建新代币...');
      const tokenFactory = new ethers.Contract(
        addresses.tokenFactory,
        await getAbi('TokenFactory'),
        signer
      );
      
      const tx = await tokenFactory.createToken('PROP123', 'Test Token', 'TEST');
      await tx.wait();
      console.log('代币创建成功！\n');
    } catch (error) {
      console.log('创建代币失败 (这可能是因为该房产已有代币或权限问题)');
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
      const tokenFactory = new ethers.Contract(
        addresses.tokenFactory,
        await getAbi('TokenFactory'),
        provider
      );
      
      const tokens = await tokenFactory.getAllTokens();
      console.log('代币列表:', tokens);
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取代币列表失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是合约地址或ABI错误');
      }
      console.log('----------------------------------------\n');
    }

    try {
      console.log('获取房产代币信息 (propertyId: PROP123)...');
      const tokenFactory = new ethers.Contract(
        addresses.tokenFactory,
        await getAbi('TokenFactory'),
        provider
      );
      
      const tokenAddress = await tokenFactory.getRealEstateToken('PROP123');
      console.log('代币地址:', tokenAddress);
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取房产代币信息失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是合约地址或ABI错误');
      }
      console.log('----------------------------------------\n');
    }

    // 测试租金流程
    console.log('===== 测试租金流程 =====\n');
    
    try {
      const tokenFactory = new ethers.Contract(
        addresses.tokenFactory,
        await getAbi('TokenFactory'),
        provider
      );
      
      const tokenAddress = await tokenFactory.getRealEstateToken('PROP123');
      
      if (tokenAddress === ethers.constants.AddressZero) {
        console.log('没有可用的代币地址，无法进行租金分配测试\n');
      } else {
        console.log('创建租金分配...');
        const rentService = new ethers.Contract(
          addresses.rentService,
          await getAbi('RentService'),
          signer
        );
        
        const tx = await rentService.createDistribution(
          tokenAddress,
          ethers.utils.parseEther('1000')
        );
        await tx.wait();
        console.log('租金分配创建成功！\n');
      }
    } catch (error) {
      console.log('租金分配测试失败');
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

    // 测试赎回流程
    console.log('===== 测试赎回流程 =====\n');
    
    try {
      const tokenFactory = new ethers.Contract(
        addresses.tokenFactory,
        await getAbi('TokenFactory'),
        provider
      );
      
      const tokenAddress = await tokenFactory.getRealEstateToken('PROP123');
      
      if (tokenAddress === ethers.constants.AddressZero) {
        console.log('没有可用的代币地址，无法进行赎回测试\n');
      } else {
        console.log('创建赎回请求...');
        const redemptionService = new ethers.Contract(
          addresses.redemptionService,
          await getAbi('RedemptionService'),
          signer
        );
        
        const tx = await redemptionService.createRedemption(
          tokenAddress,
          ethers.utils.parseEther('100')
        );
        await tx.wait();
        console.log('赎回请求创建成功！\n');
      }
    } catch (error) {
      console.log('赎回测试失败');
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

    console.log('真实区块链接口测试完成！');
    console.log('总体结果: 部分失败\n');
  } catch (error) {
    console.log('测试流程执行失败');
    console.log('错误:', error.message);
    if (error.code === 'NETWORK_ERROR') {
      console.log('网络连接失败，请检查网络配置和连接状态');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('账户余额不足，无法支付gas费用');
    } else if (error.code === 'CALL_EXCEPTION') {
      console.log('合约调用失败，可能是合约地址或ABI错误');
    }
    process.exit(1);
  }
}

// 运行测试
testFlow(); 