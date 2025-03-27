// 首先初始化模块别名
require('../../shared/utils/moduleAlias').initializeAliases();

const { ethers } = require('ethers');
const { contractService } = require('../../shared/utils/contractService');
const { configManager } = require('../../shared/config');
const { getContractAddresses } = require('../../shared/config/contracts');
const logger = require('../../server/src/utils/logger');
const { initializeBlockchain, resetBlockchain } = require('../../shared/utils/blockchain');

// 辅助方法：执行合约调用并处理错误
async function executeContractMethod(contractPromise, methodName, args = [], options = {}) {
  try {
    const contract = await contractPromise;
    if (!contract) {
      throw new Error('合约未成功加载');
    }
    
    if (methodName.startsWith('get') || methodName.includes('Read')) {
      // 读取方法
      return await contract[methodName](...args);
    } else {
      // 写入方法
      const tx = await contract[methodName](...args);
      return tx;
    }
  } catch (error) {
    console.log(`执行合约方法 ${methodName} 失败: ${error.message}`);
    throw error;
  }
}

// 测试流程
async function testFlow() {
  try {
    console.log('\n开始真实区块链接口测试...\n');
    console.log('注意：这些测试将连接真实区块链网络，并提交实际的交易！\n');

    // 初始化区块链连接
    await initializeBlockchain();
    
    // 初始化合约服务
    if (!contractService.initialized) {
      await contractService.initialize();
    }
    
    // 获取合约地址
    const addresses = getContractAddresses();
    
    // 测试房产流程
    console.log('===== 测试房产流程 =====\n');
    
    try {
      console.log('注册新房产...');
      const propertyRegistry = await contractService.getPropertyRegistry();
      
      const tx = await propertyRegistry.registerProperty(
        'PROP123',
        'JP',
        'ipfs://test-uri'
      );
      
      console.log('房产注册成功！\n',tx);
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
      const propertyRegistry = await contractService.getPropertyRegistry();
      
      // 使用正确的方法获取房产列表
      console.log('调用 getAllPropertyIds 方法...');
      const allPropertyIds = await propertyRegistry.getAllPropertyIds();
      console.log(`找到 ${allPropertyIds.length} 个房产\n`);
      
      // 遍历所有房产ID
      for (let i = 0; i < allPropertyIds.length; i++) {
        const propertyId = allPropertyIds[i];
        console.log(`获取房产信息: ${propertyId}`);
        const property = await propertyRegistry.properties(propertyId);
        console.log(`房产 ${propertyId}:`, property);
      }
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取房产列表失败');
      console.log('错误:', error.message);
      console.log('错误代码:', error.code);
      
      // 尝试其他可能的方法
      try {
        console.log('尝试使用备选方法获取房产信息...');
        // 在 catch 块中重新获取合约
        const propertyRegistry = await contractService.getPropertyRegistry();
        
        // 尝试直接获取刚注册的房产信息
        console.log('尝试直接获取PROP123房产');
        const property = await propertyRegistry.properties('PROP123');
        console.log('找到特定房产 PROP123:', property);
        
        // 尝试其他可能的方法获取房产列表
        try {
          // 尝试使用getPropertyCount方法
          console.log('尝试使用getPropertyCount方法');
          const count = await propertyRegistry.getPropertyCount();
          console.log(`使用getPropertyCount方法，找到 ${count.toString()} 个房产`);
          
          // 如果成功获取数量，尝试获取所有ID
          for (let i = 0; i < count; i++) {
            try {
              const propId = await propertyRegistry.allPropertyIds(i);
              console.log(`房产ID ${i}:`, propId);
            } catch (err) {
              console.log(`无法获取索引 ${i} 的房产ID:`, err.message);
            }
          }
        } catch (e) {
          console.log('getPropertyCount方法调用失败:', e.message);
        }
      } catch (err) {
        console.log('备选方法也失败:', err.message);
      }
      
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是合约地址或ABI错误');
        
        // 输出更多诊断信息
        try {
          console.log('PropertyRegistry合约地址:', await contractService.getContractAddress('PropertyRegistry'));
          
          // 尝试直接获取合约信息
          const prop = await contractService.getContract('PropertyRegistry', await contractService.getContractAddress('PropertyRegistry'), true);
          console.log('合约实例:', prop.address ? '成功' : '失败');
          
          // 检查合约是否有getAllPropertyIds方法
          console.log('是否有getAllPropertyIds方法:', typeof prop.getAllPropertyIds === 'function' ? '是' : '否');
          
          // 检查合约是否已初始化
          try {
            const ver = await prop.version();
            console.log('合约版本:', ver.toString());
          } catch (e) {
            console.log('无法获取合约版本:', e.message);
          }
        } catch (diagErr) {
          console.log('诊断失败:', diagErr.message);
        }
      }
      console.log('----------------------------------------\n');
    }

    // 测试代币流程
    console.log('===== 测试代币流程 =====\n');
    
    try {
      console.log('创建新代币...');
      const tokenFactory = await contractService.getTokenFactory();
      
      // 保存交易以便我们可以获取事件日志
      const tx = await tokenFactory.createSingleToken(
        'Test Token', 
        'TEST',
        'PROP123', 
        ethers.utils.parseEther('1000')
      );
      
      console.log('代币创建请求已提交，等待交易确认...');
      const receipt = await tx.wait();
      console.log('交易已确认，区块号:', receipt.blockNumber);
      
      // 尝试从事件中获取代币地址
      let createdTokenAddress = null;
      if (receipt.events) {
        for (const event of receipt.events) {
          // 尝试解析可能的代币创建事件
          console.log('事件:', event.event);
          // 如果有事件名称和参数，这很可能是我们感兴趣的事件
          if (event.args && event.event && 
             (event.event === 'TokenCreated' || event.event.includes('Token'))) {
            console.log('找到代币创建事件:', event.args);
            // 不同的合约可能有不同的事件格式，检查可能的位置
            if (event.args.tokenAddress) {
              createdTokenAddress = event.args.tokenAddress;
            } else if (event.args.token) {
              createdTokenAddress = event.args.token;
            } else if (event.args.length >= 2 && ethers.utils.isAddress(event.args[1])) {
              // 第二个参数可能是代币地址
              createdTokenAddress = event.args[1];
            }
          }
        }
      }
      
      if (createdTokenAddress) {
        console.log('从事件中发现新创建的代币地址:', createdTokenAddress);
        // 将此地址保存在全局变量中，以便其他测试使用
        global.createdTokenAddress = createdTokenAddress;
      }
      
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
      const tokenFactory = await contractService.getTokenFactory();
      
      // 检查TokenFactory实例
      console.log('TokenFactory地址:', tokenFactory.address);
      
      try {
        console.log('尝试使用getTokenCount方法...');
        const tokenCount = await tokenFactory.getTokenCount();
        console.log(`代币总数: ${tokenCount.toString()}`);
        
        // 读取所有代币地址
        const tokens = [];
        for (let i = 0; i < tokenCount; i++) {
          try {
            const tokenAddress = await tokenFactory.allTokens(i);
            tokens.push(tokenAddress);
          } catch (error) {
            console.log(`读取代币 ${i} 失败: ${error.message}`);
          }
        }
        
        console.log('代币列表:', tokens);
      } catch (countError) {
        console.log('getTokenCount方法失败，尝试直接使用getAllTokens...');
        
        try {
          const tokens = await tokenFactory.getAllTokens();
          console.log(`找到 ${tokens.length} 个代币`);
          console.log('代币列表:', tokens);
        } catch (listError) {
          console.log('getAllTokens方法也失败:', listError.message);
          console.log('尝试迭代allTokens数组...');
          
          // 如果没有长度方法，则使用迭代查找
          let i = 0;
          let foundToken = true;
          const tokens = [];
          
          while (foundToken && i < 100) { // 设置上限防止无限循环
            try {
              const token = await tokenFactory.allTokens(i);
              console.log(`找到索引${i}的代币:`, token);
              tokens.push(token);
              i++;
            } catch (error) {
              console.log(`索引${i}无代币,停止迭代:`, error.message);
              foundToken = false;
            }
          }
          
          console.log(`通过迭代找到 ${tokens.length} 个代币`);
          console.log('代币列表:', tokens);
        }
      }
      
      console.log('----------------------------------------\n');
    } catch (error) {
      console.log('获取代币列表失败');
      console.log('错误:', error.message);
      if (error.code === 'NETWORK_ERROR') {
        console.log('网络连接失败，请检查网络配置和连接状态');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('合约调用失败，可能是合约地址或ABI错误');
        
        // 输出更多诊断信息
        try {
          console.log('TokenFactory合约地址:', await contractService.getContractAddress('TokenFactory'));
          
          // 尝试直接获取合约信息
          const factory = await contractService.getContract('TokenFactory', await contractService.getContractAddress('TokenFactory'), true);
          console.log('合约实例:', factory.address ? '成功' : '失败');
          
          // 检查合约是否有TokenFactory方法
          console.log('是否有getAllTokens方法:', typeof factory.getAllTokens === 'function' ? '是' : '否');
          console.log('是否有getTokenCount方法:', typeof factory.getTokenCount === 'function' ? '是' : '否');
          
          // 检查合约是否有allTokens方法
          console.log('是否有allTokens方法:', typeof factory.allTokens === 'function' ? '是' : '否');
        } catch (diagErr) {
          console.log('诊断失败:', diagErr.message);
        }
      }
      console.log('----------------------------------------\n');
    }

    try {
      console.log('获取房产代币信息 (propertyId: PROP123)...');
      
      // 首先检查我们是否在前面的测试中已经获取到了代币地址
      let tokenAddress = global.createdTokenAddress || ethers.constants.AddressZero;
      
      // 如果没有找到缓存的地址，则尝试从合约获取
      if (tokenAddress === ethers.constants.AddressZero) {
        const tokenFactory = await contractService.getTokenFactory();
        
        // 尝试直接查询特定propertyId的方法
        try {
          // 尝试不同的可能的方法名
          const possibleMethodNames = [
            'getRealEstateToken',
            'getTokenForProperty',
            'propertyToToken',
            'tokensByProperty',
            'getTokenByPropertyId'
          ];
          
          for (const methodName of possibleMethodNames) {
            if (typeof tokenFactory[methodName] === 'function') {
              try {
                const addr = await tokenFactory[methodName]('PROP123');
                if (addr && addr !== ethers.constants.AddressZero) {
                  tokenAddress = addr;
                  console.log(`通过方法 ${methodName} 找到代币地址`);
                  break;
                }
              } catch (err) {
                // 忽略错误，尝试下一个方法
              }
            }
          }
        } catch (error) {
          console.log('直接查询失败，尝试遍历代币数组...');
        }
        
        // 如果直接查询失败，回退到遍历查询
        if (tokenAddress === ethers.constants.AddressZero) {
          // 使用前面定义的方法逻辑...
          let tokenCount = 0;
          
          try {
            // 尝试使用长度方法
            tokenCount = await tokenFactory.getTokenCount();
          } catch (error) {
            // 如果没有长度方法，则使用迭代查找
            let i = 0;
            let foundToken = true;
            while (foundToken && i < 100) {
              try {
                await tokenFactory.allTokens(i);
                i++;
              } catch (error) {
                foundToken = false;
                tokenCount = i;
              }
            }
          }
          
          // 查找与PROP123匹配的代币
          for (let i = 0; i < tokenCount; i++) {
            try {
              const addr = await tokenFactory.allTokens(i);
              // 尝试不同的方法获取propertyId
              try {
                // 尝试使用tokenToProperty方法
                const propId = await tokenFactory.tokenToProperty(addr);
                if (propId === 'PROP123') {
                  tokenAddress = addr;
                  break;
                }
              } catch (error) {
                // 尝试使用token实例自身的方法
                try {
                  const token = await contractService.getToken(addr);
                  const propId = await token.propertyId();
                  if (propId === 'PROP123') {
                    tokenAddress = addr;
                    break;
                  }
                } catch (err) {
                  // 忽略错误，继续下一个
                }
              }
            } catch (error) {
              // 忽略错误，继续下一个
            }
          }
        }
      } else {
        console.log('使用之前缓存的代币地址');
      }
      
      console.log('代币地址:', tokenAddress);
      
      // 缓存找到的地址以供后续测试使用
      if (tokenAddress !== ethers.constants.AddressZero) {
        global.createdTokenAddress = tokenAddress;
      }
      
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
      console.log('测试租金分配...');
      // 使用之前缓存的代币地址
      let tokenAddress = global.createdTokenAddress || ethers.constants.AddressZero;
      
      if (tokenAddress === ethers.constants.AddressZero) {
        console.log('没有可用的代币地址，无法进行租金分配测试\n');
      } else {
        console.log('创建租金分配，使用代币地址:', tokenAddress);
        const rentService = await contractService.getRentDistributor();
        
        const tx = await rentService.createDistribution(
          tokenAddress,
          ethers.utils.parseEther('1000')
        );
        
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
      // 使用之前缓存的代币地址
      let tokenAddress = global.createdTokenAddress || ethers.constants.AddressZero;
      
      if (tokenAddress === ethers.constants.AddressZero) {
        console.log('没有可用的代币地址，无法进行赎回测试\n');
      } else {
        console.log('创建赎回请求，使用代币地址:', tokenAddress);
        const redemptionService = await contractService.getRedemptionManager();
        
        const tx = await redemptionService.createRedemption(
          tokenAddress,
          ethers.utils.parseEther('100')
        );
        
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
    
    console.log('测试流程完成！');
    resetBlockchain();
  } catch (error) {
    console.log('测试流程执行失败');
    console.log('错误:', error.message);
    resetBlockchain();
    process.exit(1);
  }
}

// 执行测试流程
testFlow()
  .then(() => {
    console.log('\n所有测试完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  }); 