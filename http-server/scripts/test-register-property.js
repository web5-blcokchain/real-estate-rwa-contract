/**
 * 房产注册测试脚本
 * 用于直接与合约交互，检查合约部署和注册逻辑
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 简单的日志函数
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg, err) => {
    console.error(`[ERROR] ${msg}`);
    if (err) console.error(err);
  },
  debug: (msg, obj) => {
    console.log(`[DEBUG] ${msg}`);
    if (obj) console.log(JSON.stringify(obj, null, 2));
  }
};

// 检查合约接口
async function checkContractInterface(contract) {
  try {
    log.info('检查合约接口...');
    
    // 获取合约函数签名
    const functions = Object.keys(contract.interface.functions)
      .filter(fn => !fn.startsWith('0x'))
      .sort();
    
    log.info(`合约共有 ${functions.length} 个函数:`);
    functions.forEach(fn => log.info(`- ${fn}`));
    
    // 检查PropertyManager相关函数是否存在
    const hasRegisterProperty = functions.some(fn => fn.startsWith('registerProperty'));
    const hasGetPropertyToken = functions.some(fn => fn.startsWith('getPropertyTokenAddress'));
    const hasGetPropertyStatus = functions.some(fn => fn.startsWith('getPropertyStatus'));
    
    log.info(`是否有注册房产函数: ${hasRegisterProperty}`);
    log.info(`是否有获取房产代币函数: ${hasGetPropertyToken}`);
    log.info(`是否有获取房产状态函数: ${hasGetPropertyStatus}`);
    
    return {
      hasRegisterProperty,
      hasGetPropertyToken,
      hasGetPropertyStatus
    };
  } catch (error) {
    log.error('检查合约接口失败', error);
    return {
      hasRegisterProperty: false,
      hasGetPropertyToken: false,
      hasGetPropertyStatus: false
    };
  }
}

async function main() {
  try {
    log.info('开始测试房产注册功能...');
    
    // 连接区块链节点
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // 检查连接
    const blockNumber = await provider.getBlockNumber();
    log.info(`成功连接到区块链，当前区块高度: ${blockNumber}`);
    
    // 获取网络信息
    const network = await provider.getNetwork();
    log.info(`网络名称: ${network.name}, 链ID: ${network.chainId}`);
    
    // 获取私钥（管理员账户）
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('未找到管理员私钥，请检查.env文件中的ADMIN_PRIVATE_KEY配置');
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey, provider);
    log.info(`使用管理员账户: ${wallet.address}`);
    
    // 获取RealEstateFacade合约地址
    const facadeAddress = process.env.CONTRACT_REALESTATEFACADE_ADDRESS;
    if (!facadeAddress) {
      throw new Error('未找到RealEstateFacade合约地址，请检查.env文件中的CONTRACT_REALESTATEFACADE_ADDRESS配置');
    }
    
    // 检查合约代码
    const code = await provider.getCode(facadeAddress);
    if (code === '0x') {
      throw new Error(`地址 ${facadeAddress} 上没有合约代码`);
    }
    log.info(`合约代码存在于地址 ${facadeAddress}`);
    
    // 尝试获取ABI
    let abi;
    const abiPaths = [
      path.join(__dirname, '../../artifacts/contracts/facade/RealEstateFacade.sol/RealEstateFacade.json'),
      path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json'),
      // 尝试更多可能的路径
      path.join(__dirname, '../../artifacts/contracts/PropertyManager.sol/PropertyManager.json')
    ];
    
    let abiPath;
    for (const currentPath of abiPaths) {
      if (fs.existsSync(currentPath)) {
        log.info(`找到ABI文件: ${currentPath}`);
        const abiJson = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
        abi = abiJson.abi;
        abiPath = currentPath;
        break;
      }
    }
    
    if (!abi) {
      throw new Error('未找到ABI文件，请确保合约已编译');
    }
    
    // 创建合约实例
    const contract = new ethers.Contract(facadeAddress, abi, wallet);
    log.info(`已连接到RealEstateFacade合约: ${facadeAddress}`);
    
    // 检查合约接口
    const interfaceInfo = await checkContractInterface(contract);
    
    if (!interfaceInfo.hasRegisterProperty) {
      log.warn('警告: 合约没有registerProperty函数，可能使用了错误的ABI或合约地址');
    }
    
    // 检查其他合约类型
    log.info('尝试获取主要合约地址...');
    try {
      // 这些只是例子，实际函数名需要根据合约接口调整
      if (contract.propertyManager) {
        const propertyManagerAddr = await contract.propertyManager();
        log.info(`PropertyManager 地址: ${propertyManagerAddr}`);
      }
      
      if (contract.getImplementation) {
        const implAddr = await contract.getImplementation();
        log.info(`实现合约地址: ${implAddr}`);
      }
    } catch (error) {
      log.warn('获取关联合约地址失败', error.message);
    }
    
    // 尝试检查是否是代理合约
    try {
      const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
      const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
      
      const adminData = await provider.getStorage(facadeAddress, adminSlot);
      const implData = await provider.getStorage(facadeAddress, implSlot);
      
      if (implData !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const implAddress = '0x' + implData.slice(26);
        log.info(`这是一个代理合约，实现合约地址: ${implAddress}`);
        
        // 使用实现合约地址创建新的实例
        if (implAddress !== '0x0000000000000000000000000000000000000000') {
          log.info('尝试使用实现合约地址创建合约实例...');
          const implContract = new ethers.Contract(implAddress, abi, wallet);
          await checkContractInterface(implContract);
        }
      } else {
        log.info('这不是一个标准代理合约');
      }
    } catch (error) {
      log.warn('检查代理合约失败', error.message);
    }
    
    try {
      // 生成随机属性ID
      const propertyId = `test-${Date.now()}`;
      log.info(`准备注册新房产，ID: ${propertyId}`);
      
      // 调用registerPropertyAndCreateToken函数
      log.info('尝试调用registerPropertyAndCreateToken函数...');
      const tx = await contract.registerPropertyAndCreateToken(
        propertyId,
        'JP',
        'ipfs://QmTest',
        '1000',
        `Test Token ${propertyId}`,
        `TST${propertyId.substring(0, 4)}`
      );
      
      log.info(`交易已提交，等待确认，交易哈希: ${tx.hash}`);
      
      // 等待交易确认
      const receipt = await tx.wait();
      log.info(`交易已确认，区块号: ${receipt.blockNumber}，Gas使用: ${receipt.gasUsed.toString()}`);
      
      // 打印事件
      if (receipt.logs && receipt.logs.length > 0) {
        log.info(`交易触发了 ${receipt.logs.length} 个事件`);
        
        for (let i = 0; i < receipt.logs.length; i++) {
          try {
            const log = receipt.logs[i];
            const parsedLog = contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (parsedLog) {
              log.info(`事件 ${i+1}: ${parsedLog.name}`);
              log.debug('事件参数:', parsedLog.args);
            }
          } catch (e) {
            // 忽略无法解析的日志
          }
        }
      }
      
      // 尝试获取注册的房产信息
      try {
        log.info(`尝试获取房产信息: ${propertyId}...`);
        const tokenAddress = await contract.getPropertyTokenAddress(propertyId);
        log.info(`房产 ${propertyId} 的代币地址: ${tokenAddress}`);
        
        const status = await contract.getPropertyStatus(propertyId);
        log.info(`房产 ${propertyId} 的状态: ${status}`);
        
        const valuation = await contract.getPropertyValuation(propertyId);
        log.info(`房产 ${propertyId} 的估值: ${valuation.toString()}`);
      } catch (error) {
        log.error(`获取房产信息失败`, error);
        log.warn('合约接口可能有问题，尝试使用其他方法获取信息...');
        
        // 尝试调用合约上的其他方法
        try {
          if (contract.getProperties) {
            const props = await contract.getProperties();
            log.info(`获取到 ${props.length} 个房产`);
          }
          
          if (contract.tokenAddresses) {
            const tokenAddr = await contract.tokenAddresses(propertyId);
            log.info(`通过tokenAddresses映射获取的代币地址: ${tokenAddr}`);
          }
        } catch (e) {
          log.warn('替代方法也失败', e.message);
        }
      }
    } catch (error) {
      log.error('注册房产失败', error);
      log.warn('合约调用失败，可能是以下原因之一:');
      log.warn('1. 合约地址错误');
      log.warn('2. ABI与合约不匹配');
      log.warn('3. 交易提交失败');
      log.warn('4. 权限不足');
    }
    
  } catch (error) {
    log.error('测试失败', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 