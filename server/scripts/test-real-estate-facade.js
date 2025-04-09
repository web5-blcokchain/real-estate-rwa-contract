/**
 * RealEstateFacadeController 测试脚本
 * 用于测试 RealEstateFacadeController 的所有功能和流程
 */

// 导入必要模块
const ethers = require('ethers');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// 导入控制器
const RealEstateFacadeController = require('../controllers/core/RealEstateFacadeController');
const BaseController = require('../controllers/BaseController');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 检查必要的环境变量
console.log("检查环境变量...");
const requiredEnvVars = [
  'CONTRACT_REALESTATEFACADE_ADDRESS',
  'CONTRACT_PROPERTYTOKEN_IMPLEMENTATION',
  'ADMIN_PRIVATE_KEY',
  'MANAGER_PRIVATE_KEY',
  'OPERATOR_PRIVATE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`缺少必要的环境变量: ${missingEnvVars.join(', ')}`);
  console.error('请确保这些变量在.env文件中设置正确');
  process.exit(1);
}

// 设置BaseController的角色重写
const roleOverrides = {
  "registerPropertyAndCreateToken": "admin",
  "updatePropertyStatus": "manager",
  "createOrder": "operator",
  "executeTrade": "operator",
  "cancelOrder": "operator",
  "createDistribution": "manager",
  "claimRewards": "operator",
  "getVersion": "operator",
  "getContract": "admin" // 默认角色
};

// 控制是否强制使用admin角色
let allowAdminOverride = false;

/**
 * 强制所有操作使用admin角色
 * @param {boolean} force - 是否强制使用admin角色
 */
function forceAdminRole(force = true) {
  allowAdminOverride = force;
  log('角色设置更新', `${force ? '强制' : '不强制'}使用admin角色执行所有操作`);
}

BaseController.setRoleOverrides(roleOverrides);
console.log("已设置角色重写:", roleOverrides);

// 创建readline接口用于等待用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 日志函数
function log(title, message) {
  const separator = '='.repeat(50);
  console.log(`\n${separator}\n${title}\n${separator}`);
  if (message) {
    // 添加BigInt序列化支持
    const replacer = (key, value) => {
      // 检查值是否是BigInt类型
      if (typeof value === 'bigint') {
        // 将BigInt转换为字符串
        return value.toString();
      }
      return value;
    };
    
    console.log(typeof message === 'object' ? JSON.stringify(message, replacer, 2) : message);
  }
}

// 等待用户输入函数
function waitForUserInput(message = '按回车键继续下一个测试...') {
  return new Promise((resolve) => {
    rl.question(message, () => {
      resolve();
    });
  });
}

// 生成唯一ID
function generateUniqueId() {
  const timestamp = Date.now();
  return `PROP-TEST-${timestamp}`;
}

/**
 * 根据不同操作选择正确的角色
 * @param {string} operation - 操作名称
 * @returns {string} - 所需角色
 */
function getRoleForOperation(operation) {
  // 如果allowAdminOverride为true，强制返回admin角色
  if (allowAdminOverride) {
    return 'admin';
  }
  
  // 否则使用已定义的roleOverrides映射
  return roleOverrides[operation] || roleOverrides["getContract"]; // 默认使用getContract的角色
}

/**
 * 创建模拟请求和响应对象
 * @param {Object} params - 参数对象
 * @param {Object} query - 查询参数
 * @param {Object} body - 请求体
 * @returns {Object} 请求和响应对象
 */
function createMockReqRes(params = {}, query = {}, body = {}) {
  const req = {
    params,
    query,
    body,
    headers: {
      'x-api-key': process.env.API_KEY || '123456'
    }
  };

  let statusCode = 200;
  let responseData = null;
  let responseError = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      if (statusCode >= 400) {
        responseError = data;
      } else {
        responseData = data;
      }
      return res;
    },
    getResponse: () => {
      return {
        statusCode,
        data: responseData,
        error: responseError
      };
    }
  };

  return { req, res };
}

/**
 * 测试 RealEstateFacadeController 的 registerPropertyAndCreateToken 方法
 */
async function testRegisterPropertyAndCreateToken() {
  log('测试 registerPropertyAndCreateToken 方法');
  
  // 创建一个新的控制器实例，使用admin角色
  const controller = new RealEstateFacadeController();
  console.log(`使用 ${getRoleForOperation('registerPropertyAndCreateToken')} 角色执行操作`);
  
  // 获取当前方法使用的钱包地址
  const { WalletManager, ContractUtils } = require('../../common/blockchain');
  const role = getRoleForOperation('registerPropertyAndCreateToken');
  const wallet = WalletManager.getRoleWallet(role);
  const walletAddress = await wallet.getAddress();
  console.log(`当前操作使用的钱包地址: ${walletAddress}`);
  
  // 打印钱包余额
  try {
    const provider = wallet.provider;
    const balance = await provider.getBalance(walletAddress);
    console.log(`钱包余额: ${ethers.formatEther(balance)} ETH`);
  } catch (error) {
    console.log("无法获取钱包余额:", error.message);
  }
  
  // 生成一个唯一的propertyId
  const propertyId = generateUniqueId();
  console.log("使用动态生成的 propertyId:", propertyId);
  
  // 从环境变量获取PropertyToken实现合约地址
  const propertyTokenImplementation = process.env.CONTRACT_PROPERTYTOKEN_IMPLEMENTATION;
  if (!propertyTokenImplementation) {
    log('测试失败', '未找到CONTRACT_PROPERTYTOKEN_IMPLEMENTATION环境变量');
    return null;
  }
  
  // 创建模拟数据
  const propertyData = {
    country: "Japan",
    metadataURI: "ipfs://QmTest" + Date.now()
  };
  
  const tokenData = {
    name: "Test Property Token " + Date.now(),
    symbol: "TPT" + Date.now().toString().substring(8, 12),
    initialSupply: ethers.parseEther("1000000").toString() // 100万代币
  };

  // 创建请求体
  const requestBody = {
    propertyId,
    propertyData,
    tokenData,
    propertyTokenImplementation
  };

  console.log("请求体:", JSON.stringify(requestBody, null, 2));

  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 在调用方法前手动获取并打印合约信息
    try {
      console.log("在调用方法前检查合约和权限...");
      
      // 获取合约实例
      const contractAdmin = controller.getContract('RealEstateFacade', 'admin');
      console.log("获取到admin合约实例");
      
      const adminWallet = contractAdmin.runner;
      const adminAddress = await adminWallet.getAddress();
      console.log("admin合约使用的钱包地址:", adminAddress);
      
      // 尝试获取RealEstateFacade合约和System合约，检查权限
      try {
        // 创建一个临时控制器获取合约实例
        const tempController = new RealEstateFacadeController();
        
        // 获取RealEstateFacade合约实例
        const adminContract = tempController.getContract('RealEstateFacade', 'admin');
        const managerContract = tempController.getContract('RealEstateFacade', 'manager');
        
        log('合约地址信息', {
          RealEstateFacade: await adminContract.getAddress()
        });
        
        // 尝试获取system地址并检查权限
        try {
          const systemAddress = await adminContract.system();
          log('System合约地址', systemAddress);
          
          // 创建System合约实例
          const systemContract = ContractUtils.getContractWithRole('RealEstateSystem', systemAddress, 'admin');
          
          // 获取角色常量
          const managerRole = await systemContract.MANAGER_ROLE();
          log('MANAGER_ROLE值', managerRole);
          
          // 检查各钱包是否有MANAGER_ROLE
          const adminAddress = await adminWallet.getAddress();
          const managerAddress = await managerWallet.getAddress();
          
          const isAdminManager = await systemContract.hasRole(managerRole, adminAddress);
          const isManagerHasRole = await systemContract.hasRole(managerRole, managerAddress);
          
          log('权限检查结果', {
            'admin钱包有MANAGER_ROLE': isAdminManager,
            'manager钱包有MANAGER_ROLE': isManagerHasRole
          });
          
          // 检查Admin角色
          const adminRole = await systemContract.ADMIN_ROLE();
          const isAdminHasAdminRole = await systemContract.hasRole(adminRole, adminAddress);
          const isManagerHasAdminRole = await systemContract.hasRole(adminRole, managerAddress);
          
          log('更多权限检查结果', {
            'admin钱包有ADMIN_ROLE': isAdminHasAdminRole,
            'manager钱包有ADMIN_ROLE': isManagerHasAdminRole
          });
        } catch (error) {
          log('权限检查失败:', error.message);
        }
      } catch (error) {
        log('获取合约信息失败', {
          error: error.message,
          stack: error.stack
        });
      }
      
    } catch (error) {
      console.log("检查合约和权限时出错:", error.message);
      console.log("错误堆栈:", error.stack);
    }
    
    // 调用 registerPropertyAndCreateToken 方法
    await controller.registerPropertyAndCreateToken(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '房产注册失败');
      console.log("错误信息:", response.error || response.data);
      return null;
    }
    
    log('测试成功', '房产注册成功');
    console.log("注册成功的propertyId:", propertyId);
    console.log("请在后续测试中使用此ID");
    
    // 返回创建的 propertyId 以供后续测试使用
    return propertyId;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return null;
  }
}

/**
 * 测试 RealEstateFacadeController 的 updatePropertyStatus 方法
 * @param {string} propertyId - 房产ID
 */
async function testUpdatePropertyStatus(propertyId) {
  log('测试 updatePropertyStatus 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log(`使用 ${getRoleForOperation('updatePropertyStatus')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建请求体，使用状态值2（ForSale）
  const requestBody = {
    propertyId,
    status: 2  // ForSale状态
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 updatePropertyStatus 方法
    await controller.updatePropertyStatus(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '更新房产状态失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '更新房产状态成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 RealEstateFacadeController 的 createOrder 方法
 * @param {string} propertyId - 房产ID
 */
async function testCreateOrder(propertyId) {
  log('测试 createOrder 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log(`使用 ${getRoleForOperation('createOrder')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 需要先获取对应的token地址
  // 这里假设我们已经知道了token地址，实际使用时可能需要先查询
  // 从环境变量获取，或者从PropertyManager获取
  const tokenAddress = process.env.TEST_TOKEN_ADDRESS;
  if (!tokenAddress) {
    log('测试失败', '未找到令牌地址，请先设置TEST_TOKEN_ADDRESS环境变量');
    return null;
  }
  
  // 创建请求体
  const requestBody = {
    token: tokenAddress,
    amount: ethers.parseEther("1000").toString(), // 1000代币
    price: ethers.parseEther("10").toString()  // 价格10 ETH
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 createOrder 方法
    await controller.createOrder(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '创建卖单失败');
      console.log("错误信息:", response.error || response.data);
      return null;
    }
    
    log('测试成功', '创建卖单成功');
    const orderId = response.data?.data?.orderId;
    console.log("创建的orderId:", orderId);
    
    // 返回创建的 orderId 以供后续测试使用
    return orderId;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return null;
  }
}

/**
 * 测试 RealEstateFacadeController 的 executeTrade 方法
 * @param {string} orderId - 订单ID
 */
async function testExecuteTrade(orderId) {
  log('测试 executeTrade 方法');
  console.log("使用的 orderId:", orderId);
  console.log(`使用 ${getRoleForOperation('executeTrade')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建请求体
  const requestBody = {
    orderId,
    value: ethers.parseEther("10").toString() // 支付10 ETH
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 executeTrade 方法
    await controller.executeTrade(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '执行交易失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '执行交易成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 RealEstateFacadeController 的 createDistribution 方法
 * @param {string} propertyId - 房产ID
 */
async function testCreateDistribution(propertyId) {
  log('测试 createDistribution 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log(`使用 ${getRoleForOperation('createDistribution')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建请求体
  const requestBody = {
    propertyId,
    amount: ethers.parseEther("5000").toString(), // 5000代币奖励
    description: "Test Distribution " + Date.now(),
    applyFees: true,
    paymentToken: "0x0000000000000000000000000000000000000000" // 使用原生代币
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 createDistribution 方法
    await controller.createDistribution(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '创建奖励分配失败');
      console.log("错误信息:", response.error || response.data);
      return null;
    }
    
    log('测试成功', '创建奖励分配成功');
    const distributionId = response.data?.data?.distributionId;
    console.log("创建的distributionId:", distributionId);
    
    // 返回创建的 distributionId 以供后续测试使用
    return distributionId;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return null;
  }
}

/**
 * 测试 RealEstateFacadeController 的 claimRewards 方法
 * @param {string} distributionId - 分配ID
 */
async function testClaimRewards(distributionId) {
  log('测试 claimRewards 方法');
  console.log("使用的 distributionId:", distributionId);
  console.log(`使用 ${getRoleForOperation('claimRewards')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建请求体
  const requestBody = {
    distributionId
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 claimRewards 方法
    await controller.claimRewards(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '领取奖励失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '领取奖励成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 RealEstateFacadeController 的 getVersion 方法
 */
async function testGetVersion() {
  log('测试 getVersion 方法');
  console.log(`使用 ${getRoleForOperation('getVersion')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes();

  try {
    // 调用 getVersion 方法
    await controller.getVersion(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '获取版本失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '获取版本成功');
    console.log("合约版本:", response.data?.data?.version);
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 RealEstateFacadeController 的 cancelOrder 方法
 * @param {string} orderId - 订单ID
 */
async function testCancelOrder(orderId) {
  log('测试 cancelOrder 方法');
  console.log("使用的 orderId:", orderId);
  console.log(`使用 ${getRoleForOperation('cancelOrder')} 角色执行操作`);
  
  // 创建一个新的控制器实例
  const controller = new RealEstateFacadeController();
  
  // 创建请求体
  const requestBody = {
    orderId
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 cancelOrder 方法
    await controller.cancelOrder(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '取消订单失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '取消订单成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  log('开始测试 RealEstateFacadeController');

  try {
    // 打印环境变量信息
    log('环境变量信息', {
      ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY ? process.env.ADMIN_PRIVATE_KEY.substring(0, 6) + '...' : undefined,
      MANAGER_PRIVATE_KEY: process.env.MANAGER_PRIVATE_KEY ? process.env.MANAGER_PRIVATE_KEY.substring(0, 6) + '...' : undefined,
      OPERATOR_PRIVATE_KEY: process.env.OPERATOR_PRIVATE_KEY ? process.env.OPERATOR_PRIVATE_KEY.substring(0, 6) + '...' : undefined,
      CONTRACT_REALESTATEFACADE_ADDRESS: process.env.CONTRACT_REALESTATEFACADE_ADDRESS,
      CONTRACT_PROPERTYTOKEN_IMPLEMENTATION: process.env.CONTRACT_PROPERTYTOKEN_IMPLEMENTATION
    });

    // 导入必要的工具类，用于获取钱包地址
    const { WalletManager, ContractUtils } = require('../../common/blockchain');
    
    // 获取各角色的钱包地址
    const adminWallet = WalletManager.getRoleWallet('admin');
    const managerWallet = WalletManager.getRoleWallet('manager');
    const operatorWallet = WalletManager.getRoleWallet('operator');

    // 打印钱包地址
    log('钱包地址信息', {
      admin: await adminWallet.getAddress(),
      manager: await managerWallet.getAddress(),
      operator: await operatorWallet.getAddress()
    });

    // 尝试获取RealEstateFacade合约和System合约，检查权限
    try {
      // 创建一个临时控制器获取合约实例
      const tempController = new RealEstateFacadeController();
      
      // 获取RealEstateFacade合约实例
      const adminContract = tempController.getContract('RealEstateFacade', 'admin');
      const managerContract = tempController.getContract('RealEstateFacade', 'manager');
      
      log('合约地址信息', {
        RealEstateFacade: await adminContract.getAddress()
      });
      
      // 尝试获取system地址并检查权限
      try {
        const systemAddress = await adminContract.system();
        log('System合约地址', systemAddress);
        
        // 创建System合约实例
        const systemContract = ContractUtils.getContractWithRole('RealEstateSystem', systemAddress, 'admin');
        
        // 获取角色常量
        const managerRole = await systemContract.MANAGER_ROLE();
        log('MANAGER_ROLE值', managerRole);
        
        // 检查各钱包是否有MANAGER_ROLE
        const adminAddress = await adminWallet.getAddress();
        const managerAddress = await managerWallet.getAddress();
        
        const isAdminManager = await systemContract.hasRole(managerRole, adminAddress);
        const isManagerHasRole = await systemContract.hasRole(managerRole, managerAddress);
        
        log('权限检查结果', {
          'admin钱包有MANAGER_ROLE': isAdminManager,
          'manager钱包有MANAGER_ROLE': isManagerHasRole
        });
        
        // 检查Admin角色
        const adminRole = await systemContract.ADMIN_ROLE();
        const isAdminHasAdminRole = await systemContract.hasRole(adminRole, adminAddress);
        const isManagerHasAdminRole = await systemContract.hasRole(adminRole, managerAddress);
        
        log('更多权限检查结果', {
          'admin钱包有ADMIN_ROLE': isAdminHasAdminRole,
          'manager钱包有ADMIN_ROLE': isManagerHasAdminRole
        });
      } catch (error) {
        log('权限检查失败:', error.message);
      }
      
    } catch (error) {
      log('获取合约信息失败', {
        error: error.message,
        stack: error.stack
      });
    }
    
    // 显示角色信息
    log('权限和角色信息', {
      adminRole: {
        description: "管理员角色，可以执行所有操作",
        operations: "registerPropertyAndCreateToken"
      },
      managerRole: {
        description: "管理员角色，可以管理房产和奖励",
        operations: "updatePropertyStatus, createDistribution"
      },
      operatorRole: {
        description: "操作员角色，可以执行日常操作",
        operations: "createOrder, executeTrade, cancelOrder, claimRewards, getVersion"
      }
    });
    
    // 等待用户确认继续
    await waitForUserInput("按回车键开始测试...");
    
    // 首先测试获取版本
    await testGetVersion();
    await waitForUserInput();
    
    // 测试 registerPropertyAndCreateToken 方法
    const propertyId = await testRegisterPropertyAndCreateToken();
    
    if (!propertyId) {
      log('测试中断', '无法创建房产，测试终止');
      rl.close();
      return;
    }
    
    log('注册房产测试成功完成');
    console.log("创建的propertyId:", propertyId);
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 updatePropertyStatus...");
    
    // 测试 updatePropertyStatus 方法
    const updateStatusSuccess = await testUpdatePropertyStatus(propertyId);
    if (!updateStatusSuccess) {
      log('测试警告', 'updatePropertyStatus 测试失败');
      
      // 询问用户是否使用admin角色重试
      const retry = await new Promise((resolve) => {
        rl.question("是否使用admin角色重试此操作? (y/n): ", (answer) => {
          resolve(answer.toLowerCase() === 'y');
        });
      });
      
      if (retry) {
        log('使用admin角色重试', '强制使用admin角色执行updatePropertyStatus');
        
        // 开启admin角色重写
        forceAdminRole(true);
        
        // 重试操作
        const retrySuccess = await testUpdatePropertyStatus(propertyId);
        
        // 恢复原始设置
        forceAdminRole(false);
        
        if (!retrySuccess) {
          log('测试警告', '即使使用admin角色，updatePropertyStatus仍然失败');
        } else {
          log('测试成功', '使用admin角色成功执行了updatePropertyStatus');
        }
      } else {
        log('测试警告', '用户选择不重试，继续执行其他测试');
      }
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 createOrder...");
    
    // 测试 createOrder 方法
    const orderId = await testCreateOrder(propertyId);
    if (!orderId) {
      log('测试警告', 'createOrder 测试失败，但继续进行其他测试');
    } else {
      // 等待用户确认继续
      await waitForUserInput("按回车键继续测试 executeTrade...");
      
      // 测试 executeTrade 方法
      const executeTradeSuccess = await testExecuteTrade(orderId);
      if (!executeTradeSuccess) {
        log('测试警告', 'executeTrade 测试失败，但继续进行其他测试');
      }
      
      // 测试 cancelOrder 方法 (如果没执行交易成功，才测试取消订单)
      if (!executeTradeSuccess) {
        await waitForUserInput("按回车键继续测试 cancelOrder...");
        const cancelOrderSuccess = await testCancelOrder(orderId);
        if (!cancelOrderSuccess) {
          log('测试警告', 'cancelOrder 测试失败，但继续进行其他测试');
        }
      }
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 createDistribution...");
    
    // 测试 createDistribution 方法
    const distributionId = await testCreateDistribution(propertyId);
    if (!distributionId) {
      log('测试警告', 'createDistribution 测试失败，但继续进行其他测试');
    } else {
      // 等待用户确认继续
      await waitForUserInput("按回车键继续测试 claimRewards...");
      
      // 测试 claimRewards 方法
      const claimRewardsSuccess = await testClaimRewards(distributionId);
      if (!claimRewardsSuccess) {
        log('测试警告', 'claimRewards 测试失败');
      }
    }
    
    // 测试结束
    log('测试完成', '所有测试已完成');
    rl.close();
  } catch (error) {
    log('测试主函数失败', error.message);
    console.error("Stack trace:", error.stack);
    rl.close();
  }
}

// 运行主函数
main().catch(error => {
  log('测试失败', error.message);
  console.error("Stack trace:", error.stack);
  rl.close();
  process.exit(1);
}); 