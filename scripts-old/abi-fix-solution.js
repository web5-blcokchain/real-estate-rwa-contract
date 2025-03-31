/**
 * ABI兼容性修复方案
 * 使用低级调用绕过ABI接口不匹配问题
 */

// 使用完整的ethers引入，而不是从hardhat获取
const hre = require('hardhat');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

// 彩色日志函数
function logSuccess(message) { console.log(`\x1b[32m✓ ${message}\x1b[0m`); }
function logWarning(message) { console.log(`\x1b[33m! ${message}\x1b[0m`); }
function logError(message, error = null) { 
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  if (error) console.error(`  Error: ${error.message}`);
}

// 更新ABI文件
async function updateAbiFiles() {
  try {
    console.log('正在更新ABI文件...');
    
    // 确定ABI目录路径
    const abiDir = path.join(__dirname, '../shared/contracts');
    
    // 检查目录是否存在
    if (!fs.existsSync(abiDir)) {
      logWarning(`目录不存在: ${abiDir}`);
      return false;
    }
    
    // 获取ABI文件路径
    const abiFilePath = path.join(abiDir, 'abis.js');
    
    // 检查文件是否存在
    if (!fs.existsSync(abiFilePath)) {
      logWarning(`ABI文件不存在: ${abiFilePath}`);
      return false;
    }
    
    // 读取当前的ABI文件内容
    const currentAbi = fs.readFileSync(abiFilePath, 'utf8');
    
    // 创建备份
    const backupPath = path.join(abiDir, 'abis.js.backup');
    fs.writeFileSync(backupPath, currentAbi);
    logSuccess(`已创建ABI文件备份: ${backupPath}`);
    
    return true;
  } catch (error) {
    logError('更新ABI文件失败', error);
    return false;
  }
}

// 使用低级调用方式向合约授予角色
async function grantRoleWithLowLevelCall(roleManager, roleHash, account, signer) {
  console.log(`使用低级调用授予角色: ${roleHash} 到账户: ${account}`);
  
  try {
    // 创建合约接口
    const roleManagerABI = [
      'function grantRole(bytes32 role, address account)'
    ];
    const roleManagerInterface = new ethers.Interface(roleManagerABI);
    
    // 编码函数调用数据
    const data = roleManagerInterface.encodeFunctionData('grantRole', [
      roleHash,
      account
    ]);
    
    // 发送交易
    const tx = await signer.sendTransaction({
      to: roleManager.address,
      data
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    logSuccess(`角色授予成功: ${receipt.hash}`);
    return true;
  } catch (error) {
    logError('角色授予失败', error);
    return false;
  }
}

// 使用低级调用方式注册房产
async function registerPropertyWithLowLevelCall(propertyRegistry, propertyId, country, metadataURI, signer) {
  console.log(`使用低级调用注册房产: ${propertyId}`);
  
  try {
    // 创建合约接口
    const propertyRegistryABI = [
      'function registerProperty(string propertyId, string country, string metadataURI)'
    ];
    const propertyRegistryInterface = new ethers.Interface(propertyRegistryABI);
    
    // 编码函数调用数据
    const data = propertyRegistryInterface.encodeFunctionData('registerProperty', [
      propertyId,
      country,
      metadataURI
    ]);
    
    // 发送交易
    const tx = await signer.sendTransaction({
      to: propertyRegistry.address,
      data
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    logSuccess(`房产注册成功: ${receipt.hash}`);
    return true;
  } catch (error) {
    logError('房产注册失败', error);
    return false;
  }
}

// 使用低级调用方式批准房产
async function approvePropertyWithLowLevelCall(propertyRegistry, propertyId, signer) {
  console.log(`使用低级调用批准房产: ${propertyId}`);
  
  try {
    // 创建合约接口
    const propertyRegistryABI = [
      'function approveProperty(string propertyId)'
    ];
    const propertyRegistryInterface = new ethers.Interface(propertyRegistryABI);
    
    // 编码函数调用数据
    const data = propertyRegistryInterface.encodeFunctionData('approveProperty', [
      propertyId
    ]);
    
    // 发送交易
    const tx = await signer.sendTransaction({
      to: propertyRegistry.address,
      data
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    logSuccess(`房产批准成功: ${receipt.hash}`);
    return true;
  } catch (error) {
    logError('房产批准失败', error);
    return false;
  }
}

// 使用低级调用方式添加授权合约
async function addAuthorizedContractWithLowLevelCall(propertyRegistry, contractAddress, signer) {
  console.log(`使用低级调用添加授权合约: ${contractAddress}`);
  
  try {
    // 创建合约接口
    const propertyRegistryABI = [
      'function addAuthorizedContract(address contractAddress)'
    ];
    const propertyRegistryInterface = new ethers.Interface(propertyRegistryABI);
    
    // 编码函数调用数据
    const data = propertyRegistryInterface.encodeFunctionData('addAuthorizedContract', [
      contractAddress
    ]);
    
    // 发送交易
    const tx = await signer.sendTransaction({
      to: propertyRegistry.address,
      data
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    logSuccess(`授权合约添加成功: ${receipt.hash}`);
    return true;
  } catch (error) {
    logError('授权合约添加失败', error);
    return false;
  }
}

// 使用低级调用方式创建代币
async function createTokenWithLowLevelCall(tokenFactory, propertyId, name, symbol, initialSupply, signer) {
  console.log(`使用低级调用创建代币: ${name} (${symbol}) 对应房产ID: ${propertyId}`);
  
  try {
    // 创建合约接口
    const tokenFactoryABI = [
      'function createSingleToken(string _name, string _symbol, string _propertyId, uint256 _initialSupply) returns (address)',
      'event TokenCreated(string propertyId, address tokenAddress, string name, string symbol)'
    ];
    const tokenFactoryInterface = new ethers.Interface(tokenFactoryABI);
    
    // 编码函数调用数据
    const data = tokenFactoryInterface.encodeFunctionData('createSingleToken', [
      name,
      symbol,
      propertyId,
      initialSupply
    ]);
    
    // 发送交易
    const tx = await signer.sendTransaction({
      to: tokenFactory.address,
      data
    });
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    // 解析事件找到代币地址
    let tokenAddress = null;
    for (const log of receipt.logs) {
      try {
        const topics = log.topics || [];
        const data = log.data || '0x';
        
        if (topics.length > 0) {
          try {
            const parsed = tokenFactoryInterface.parseLog({ topics, data });
            if (parsed && parsed.name === 'TokenCreated') {
              tokenAddress = parsed.args.tokenAddress;
              break;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    if (tokenAddress) {
      logSuccess(`代币创建成功: ${tokenAddress}`);
    } else {
      logWarning(`代币可能已创建，但无法从日志中获取地址`);
    }
    
    return { success: true, receipt, tokenAddress };
  } catch (error) {
    logError('代币创建失败', error);
    return { success: false, error };
  }
}

// 主函数
async function main() {
  try {
    console.log('开始修复ABI兼容性问题...');
    
    // 检查是否已存在部署状态文件
    const deployStatePath = path.join(__dirname, 'deploy-state.json');
    if (!fs.existsSync(deployStatePath)) {
      logError('找不到部署状态文件，请先部署合约');
      return;
    }
    
    // 加载部署状态
    const deployState = require('./deploy-state.json');
    console.log('已加载部署状态');
    
    // 获取合约地址
    const roleManagerAddress = deployState.roleManager;
    const propertyRegistryAddress = deployState.propertyRegistry;
    const tokenFactoryAddress = deployState.tokenFactory;
    
    console.log(`合约地址: 
  RoleManager: ${roleManagerAddress}
  PropertyRegistry: ${propertyRegistryAddress}
  TokenFactory: ${tokenFactoryAddress}
`);
    
    // 获取测试账户
    const [deployer] = await hre.ethers.getSigners();
    console.log(`使用部署者账户: ${deployer.address}`);
    
    // 连接到合约(使用标准接口，但不调用可能失败的方法)
    const roleManager = await hre.ethers.getContractAt('RoleManager', roleManagerAddress);
    const propertyRegistry = await hre.ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
    const tokenFactory = await hre.ethers.getContractAt('TokenFactory', tokenFactoryAddress);
    
    // 定义关键角色哈希值(直接硬编码，避免调用合约方法)
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    // 使用ethers.js的keccak256和toUtf8Bytes方法
    const SUPER_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SUPER_ADMIN'));
    const PROPERTY_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROPERTY_MANAGER'));
    const TOKEN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('TOKEN_MANAGER'));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
    const SNAPSHOT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SNAPSHOT_ROLE'));
    
    console.log(`关键角色哈希值:
  DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}
  SUPER_ADMIN_ROLE: ${SUPER_ADMIN_ROLE}
  PROPERTY_MANAGER_ROLE: ${PROPERTY_MANAGER_ROLE}
  TOKEN_MANAGER_ROLE: ${TOKEN_MANAGER_ROLE}
  MINTER_ROLE: ${MINTER_ROLE}
  SNAPSHOT_ROLE: ${SNAPSHOT_ROLE}
`);
    
    // 1. 确保TokenFactory有MINTER_ROLE权限
    console.log('步骤1: 给TokenFactory授予必要的角色权限');
    await grantRoleWithLowLevelCall(roleManager, MINTER_ROLE, tokenFactoryAddress, deployer);
    await grantRoleWithLowLevelCall(roleManager, SNAPSHOT_ROLE, tokenFactoryAddress, deployer);
    await grantRoleWithLowLevelCall(roleManager, TOKEN_MANAGER_ROLE, tokenFactoryAddress, deployer);
    
    // 2. 确保TokenFactory是授权合约
    console.log('步骤2: 将TokenFactory添加为授权合约');
    await addAuthorizedContractWithLowLevelCall(propertyRegistry, tokenFactoryAddress, deployer);
    
    // 3. 注册并批准一个测试房产
    const testPropertyId = `TEST-${Date.now()}`;
    const testCountry = 'Japan';
    const testMetadataURI = 'https://example.com/metadata/test-property';
    
    console.log('步骤3: 注册并批准测试房产');
    await registerPropertyWithLowLevelCall(propertyRegistry, testPropertyId, testCountry, testMetadataURI, deployer);
    await approvePropertyWithLowLevelCall(propertyRegistry, testPropertyId, deployer);
    
    // 4. 创建代币
    console.log('步骤4: 创建测试代币');
    const tokenName = `Test Real Estate Token ${Date.now()}`;
    const tokenSymbol = `TRET${Date.now() % 1000}`;
    // 使用hre.ethers来处理大数
    const initialSupply = hre.ethers.parseUnits('1000', 18); // 1000 tokens with 18 decimals
    
    const result = await createTokenWithLowLevelCall(
      tokenFactory,
      testPropertyId,
      tokenName,
      tokenSymbol,
      initialSupply,
      deployer
    );
    
    if (result.success) {
      console.log('\n========== 修复成功 ==========');
      console.log('已成功创建房产代币，修复方案有效');
      console.log(`
修复摘要:
1. 问题根本原因: ABI定义与实际合约实现不匹配，导致解码错误
2. 解决方法: 使用低级调用(direct low-level calls)绕过ABI解码问题
3. 关键修复点:
   - 硬编码关键角色哈希值而不是从合约获取
   - 使用自定义接口定义直接编码函数调用
   - 直接发送交易而不是通过合约对象调用方法
   - 手动解析事件日志获取结果
`);
    } else {
      console.log('\n========== 修复失败 ==========');
      console.log('代币创建仍然失败，可能需要进一步调查');
    }
    
  } catch (error) {
    logError('执行过程中出现错误', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  grantRoleWithLowLevelCall,
  registerPropertyWithLowLevelCall,
  approvePropertyWithLowLevelCall,
  addAuthorizedContractWithLowLevelCall,
  createTokenWithLowLevelCall,
  main
}; 