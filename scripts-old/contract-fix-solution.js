/**
 * 合约ABI修复方案
 * 解决合约实现与接口不匹配问题
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// 彩色日志函数
function logSuccess(message) { console.log(`\x1b[32m✓ ${message}\x1b[0m`); }
function logWarning(message) { console.log(`\x1b[33m! ${message}\x1b[0m`); }
function logError(message, error = null) { 
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  if (error) console.error(`  Error: ${error.message}`);
}

// 修复共享ABI文件
async function fixAbiFiles() {
  try {
    console.log('开始修复ABI定义文件...');
    
    // 获取ABI文件路径
    const abiDir = path.join(__dirname, '../shared/contracts');
    const abiFilePath = path.join(abiDir, 'abis.js');
    
    // 检查文件是否存在
    if (!fs.existsSync(abiFilePath)) {
      logError('找不到ABI文件：', abiFilePath);
      return false;
    }
    
    // 读取当前ABI文件内容
    const abiContent = fs.readFileSync(abiFilePath, 'utf8');
    
    // 创建备份
    const backupPath = path.join(abiDir, 'abis.js.backup-' + Date.now());
    fs.writeFileSync(backupPath, abiContent);
    logSuccess(`已创建ABI文件备份: ${backupPath}`);
    
    // 修复RoleManager ABI中的关键方法
    console.log('修复RoleManager ABI...');
    let updatedContent = abiContent;
    
    // 添加或更新hasRole方法
    const hasRoleFunction = `{
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }`;
    
    // 检查RoleManager ABI部分并添加hasRole方法（如果不存在）
    if (updatedContent.includes('abis.RoleManager = [') && !updatedContent.includes('"name": "hasRole"')) {
      updatedContent = updatedContent.replace(
        'abis.RoleManager = [',
        'abis.RoleManager = [\n  ' + hasRoleFunction + ','
      );
    }
    
    // 修复常量方法
    const roleConstants = [
      'SUPER_ADMIN',
      'PROPERTY_MANAGER', 
      'TOKEN_MANAGER',
      'MARKETPLACE_MANAGER',
      'FEE_MANAGER',
      'REDEMPTION_MANAGER',
      'FEE_COLLECTOR',
      'SNAPSHOT_ROLE',
      'MINTER_ROLE',
      'PAUSER_ROLE'
    ];
    
    let roleConstantsInsert = '';
    for (const role of roleConstants) {
      roleConstantsInsert += `  {
    "inputs": [],
    "name": "${role}",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },\n`;
    }
    
    // 添加角色常量方法
    if (updatedContent.includes('abis.RoleManager = [')) {
      updatedContent = updatedContent.replace(
        'abis.RoleManager = [',
        'abis.RoleManager = [\n' + roleConstantsInsert
      );
    }
    
    // 修复PropertyRegistry ABI
    console.log('修复PropertyRegistry ABI...');
    
    // 添加或更新isPropertyApproved方法
    const propertyMethods = `  {
    "inputs": [
      {
        "internalType": "string",
        "name": "propertyId",
        "type": "string"
      }
    ],
    "name": "isPropertyApproved",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "propertyId",
        "type": "string"
      }
    ],
    "name": "propertyExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "isAuthorizedContract",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },\n`;
    
    // 检查PropertyRegistry ABI部分并添加方法（如果不存在）
    if (updatedContent.includes('abis.PropertyRegistry = [') && !updatedContent.includes('"name": "isPropertyApproved"')) {
      updatedContent = updatedContent.replace(
        'abis.PropertyRegistry = [',
        'abis.PropertyRegistry = [\n' + propertyMethods
      );
    }
    
    // 写入更新后的内容
    fs.writeFileSync(abiFilePath, updatedContent);
    logSuccess('ABI文件已更新成功！');
    
    return true;
  } catch (error) {
    logError('修复ABI文件过程中出错', error);
    return false;
  }
}

// 创建修复型合约接口文件
async function createFixedInterfaces() {
  try {
    console.log('创建修复型合约接口...');
    
    // 定义修复型RoleManager接口
    const fixedRoleManagerInterface = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedRoleManager {
    // 角色常量
    function SUPER_ADMIN() external view returns (bytes32);
    function PROPERTY_MANAGER() external view returns (bytes32);
    function TOKEN_MANAGER() external view returns (bytes32);
    function MARKETPLACE_MANAGER() external view returns (bytes32);
    function FEE_MANAGER() external view returns (bytes32);
    function REDEMPTION_MANAGER() external view returns (bytes32);
    function FEE_COLLECTOR() external view returns (bytes32);
    function SNAPSHOT_ROLE() external view returns (bytes32);
    function MINTER_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    
    // 角色相关方法
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    
    // 辅助方法
    function deployer() external view returns (address);
    function version() external view returns (uint256);
}
`;

    // 定义修复型PropertyRegistry接口
    const fixedPropertyRegistryInterface = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedPropertyRegistry {
    // 状态枚举
    enum PropertyStatus {
        NotRegistered,
        Pending,
        Approved,
        Rejected,
        Delisted,
        Redemption,
        Frozen
    }
    
    // 检查方法
    function isPropertyApproved(string calldata propertyId) external view returns (bool);
    function propertyExists(string calldata propertyId) external view returns (bool);
    function isAuthorizedContract(address contractAddress) external view returns (bool);
    
    // 添加授权合约
    function addAuthorizedContract(address contractAddress) external;
    
    // 房产登记和状态管理
    function registerProperty(string calldata propertyId, string calldata country, string calldata metadataURI) external;
    function approveProperty(string calldata propertyId) external;
    function rejectProperty(string calldata propertyId) external;
    function getPropertyStatus(string calldata propertyId) external view returns (PropertyStatus);
    
    // 代币相关
    function registerTokenForProperty(string calldata propertyId, address tokenAddress) external;
    function RealEstateTokens(string calldata) external view returns (address);
    
    // 管理方法
    function roleManager() external view returns (address);
    function version() external view returns (uint256);
}
`;

    // 定义修复型TokenFactory接口
    const fixedTokenFactoryInterface = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedTokenFactory {
    // 查询方法
    function getTokenAddress(string calldata propertyId) external view returns (address);
    function getPropertyIdFromToken(address tokenAddress) external view returns (string memory);
    function tokenImplementation() external view returns (address);
    
    // 代币创建方法
    function createSingleToken(
        string calldata _name, 
        string calldata _symbol, 
        string calldata _propertyId, 
        uint256 _initialSupply
    ) external returns (address);
    
    function createTokenPublic(
        string calldata propertyId,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) external returns (address);
    
    // 管理方法
    function roleManager() external view returns (address);
    function propertyRegistry() external view returns (address);
    function rentDistributorAddress() external view returns (address);
}
`;

    // 创建目录
    const interfacesDir = path.join(__dirname, '../contracts/interfaces');
    if (!fs.existsSync(interfacesDir)) {
        fs.mkdirSync(interfacesDir, { recursive: true });
    }
    
    // 写入接口文件
    fs.writeFileSync(path.join(interfacesDir, 'IFixedRoleManager.sol'), fixedRoleManagerInterface);
    fs.writeFileSync(path.join(interfacesDir, 'IFixedPropertyRegistry.sol'), fixedPropertyRegistryInterface);
    fs.writeFileSync(path.join(interfacesDir, 'IFixedTokenFactory.sol'), fixedTokenFactoryInterface);
    
    logSuccess('修复型接口文件已创建成功！');
    return true;
  } catch (error) {
    logError('创建修复型接口文件过程中出错', error);
    return false;
  }
}

// 创建修复型访问辅助库
async function createHelperLibrary() {
  try {
    console.log('创建修复型访问辅助库...');
    
    // 定义辅助库内容
    const helperLibrary = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IFixedRoleManager.sol";
import "../interfaces/IFixedPropertyRegistry.sol";
import "../interfaces/IFixedTokenFactory.sol";

/**
 * @title ContractHelper
 * @dev 提供安全访问合约的辅助方法，避免直接调用可能失败的函数
 */
library ContractHelper {
    // 角色常量哈希值（硬编码以避免调用可能失败的方法）
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant SUPER_ADMIN_ROLE = 0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8;
    bytes32 internal constant PROPERTY_MANAGER_ROLE = 0x5cefc88e2d50f91b66109b6bb76803f11168ca3d1cee10cbafe864e4749970c7;
    bytes32 internal constant TOKEN_MANAGER_ROLE = 0x593fb413ec9f9ad9f53f309300b515310ff474591268ca3cbe9752fd88eb76a0;
    bytes32 internal constant MINTER_ROLE = 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6;
    bytes32 internal constant SNAPSHOT_ROLE = 0x5fdbd35e8da83ee755d5e62a539e5ed7f47126abede0b8b10f9ea43dc6eed07f;
    
    /**
     * @dev 安全地检查账户是否有指定角色，避免调用失败
     */
    function safeHasRole(address roleManager, bytes32 role, address account) internal view returns (bool) {
        try IFixedRoleManager(roleManager).hasRole(role, account) returns (bool hasRole) {
            return hasRole;
        } catch {
            // 如果调用失败，则假设没有角色
            return false;
        }
    }
    
    /**
     * @dev 安全地授予角色，如果调用失败则使用低级调用
     */
    function safeGrantRole(address roleManager, bytes32 role, address account) internal returns (bool) {
        try IFixedRoleManager(roleManager).grantRole(role, account) {
            return true;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success,) = roleManager.call(
                abi.encodeWithSignature("grantRole(bytes32,address)", role, account)
            );
            return success;
        }
    }
    
    /**
     * @dev 安全地检查房产是否已批准
     */
    function safeIsPropertyApproved(address propertyRegistry, string memory propertyId) internal view returns (bool) {
        try IFixedPropertyRegistry(propertyRegistry).isPropertyApproved(propertyId) returns (bool approved) {
            return approved;
        } catch {
            // 如果调用失败，则返回false
            return false;
        }
    }
    
    /**
     * @dev 安全地注册房产
     */
    function safeRegisterProperty(
        address propertyRegistry, 
        string memory propertyId, 
        string memory country, 
        string memory metadataURI
    ) internal returns (bool) {
        try IFixedPropertyRegistry(propertyRegistry).registerProperty(propertyId, country, metadataURI) {
            return true;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success,) = propertyRegistry.call(
                abi.encodeWithSignature(
                    "registerProperty(string,string,string)", 
                    propertyId, 
                    country, 
                    metadataURI
                )
            );
            return success;
        }
    }
    
    /**
     * @dev 安全地创建代币
     */
    function safeCreateToken(
        address tokenFactory,
        string memory name,
        string memory symbol,
        string memory propertyId,
        uint256 initialSupply
    ) internal returns (address tokenAddress) {
        try IFixedTokenFactory(tokenFactory).createSingleToken(name, symbol, propertyId, initialSupply) returns (address addr) {
            return addr;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success, bytes memory data) = tokenFactory.call(
                abi.encodeWithSignature(
                    "createSingleToken(string,string,string,uint256)",
                    name,
                    symbol,
                    propertyId,
                    initialSupply
                )
            );
            
            // 尝试从返回数据中解析地址
            if (success && data.length >= 32) {
                assembly {
                    tokenAddress := mload(add(data, 32))
                }
            }
            
            return tokenAddress;
        }
    }
}
`;
    
    // 创建目录
    const librariesDir = path.join(__dirname, '../contracts/libraries');
    if (!fs.existsSync(librariesDir)) {
        fs.mkdirSync(librariesDir, { recursive: true });
    }
    
    // 写入库文件
    fs.writeFileSync(path.join(librariesDir, 'ContractHelper.sol'), helperLibrary);
    
    logSuccess('修复型辅助库已创建成功！');
    return true;
  } catch (error) {
    logError('创建修复型辅助库过程中出错', error);
    return false;
  }
}

// 创建示例使用脚本
async function createExampleScript() {
  try {
    console.log('创建示例使用脚本...');
    
    // 定义使用示例脚本
    const exampleScript = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ContractHelper.sol";
import "../interfaces/IFixedRoleManager.sol";
import "../interfaces/IFixedPropertyRegistry.sol";
import "../interfaces/IFixedTokenFactory.sol";

/**
 * @title TokenCreator
 * @dev 使用修复型接口和辅助库安全创建代币的示例合约
 */
contract TokenCreator {
    address public roleManager;
    address public propertyRegistry;
    address public tokenFactory;
    address public admin;
    
    event TokenCreationSucceeded(string propertyId, address tokenAddress);
    event TokenCreationFailed(string propertyId, string reason);
    
    constructor(
        address _roleManager,
        address _propertyRegistry,
        address _tokenFactory
    ) {
        roleManager = _roleManager;
        propertyRegistry = _propertyRegistry;
        tokenFactory = _tokenFactory;
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    /**
     * @dev 创建代币的安全方法，使用辅助库避免ABI不匹配问题
     */
    function createTokenSafely(
        string memory name,
        string memory symbol,
        string memory propertyId,
        uint256 initialSupply
    ) external onlyAdmin returns (address) {
        // 1. 确保TokenFactory拥有必要的角色
        bool hasGrantedRoles = 
            ContractHelper.safeGrantRole(roleManager, ContractHelper.MINTER_ROLE, tokenFactory) &&
            ContractHelper.safeGrantRole(roleManager, ContractHelper.SNAPSHOT_ROLE, tokenFactory) &&
            ContractHelper.safeGrantRole(roleManager, ContractHelper.TOKEN_MANAGER_ROLE, tokenFactory);
            
        if (!hasGrantedRoles) {
            emit TokenCreationFailed(propertyId, "Failed to grant roles");
            return address(0);
        }
        
        // 2. 注册和批准房产（如果需要）
        if (!ContractHelper.safeIsPropertyApproved(propertyRegistry, propertyId)) {
            // 注册一个新房产
            bool registered = ContractHelper.safeRegisterProperty(
                propertyRegistry, 
                propertyId, 
                "Test Country", 
                "https://example.com/metadata"
            );
            
            if (!registered) {
                emit TokenCreationFailed(propertyId, "Failed to register property");
                return address(0);
            }
            
            // 批准房产（低级调用，因为可能没有在接口中定义）
            (bool approved,) = propertyRegistry.call(
                abi.encodeWithSignature("approveProperty(string)", propertyId)
            );
            
            if (!approved) {
                emit TokenCreationFailed(propertyId, "Failed to approve property");
                return address(0);
            }
        }
        
        // 3. 创建代币
        address tokenAddress = ContractHelper.safeCreateToken(
            tokenFactory,
            name,
            symbol,
            propertyId,
            initialSupply
        );
        
        if (tokenAddress != address(0)) {
            emit TokenCreationSucceeded(propertyId, tokenAddress);
        } else {
            emit TokenCreationFailed(propertyId, "Failed to create token");
        }
        
        return tokenAddress;
    }
}
`;
    
    // 创建目录
    const exampleDir = path.join(__dirname, '../contracts/examples');
    if (!fs.existsSync(exampleDir)) {
        fs.mkdirSync(exampleDir, { recursive: true });
    }
    
    // 写入示例文件
    fs.writeFileSync(path.join(exampleDir, 'TokenCreator.sol'), exampleScript);
    
    logSuccess('示例使用脚本已创建成功！');
    return true;
  } catch (error) {
    logError('创建示例使用脚本过程中出错', error);
    return false;
  }
}

// 修复方案说明
function generateSolution() {
  return `
=======================================
房产代币系统ABI修复方案总结
=======================================

问题根源：
---------
1. ABI定义与合约实际实现不匹配，导致解码错误
2. 关键方法如hasRole()、MINTER_ROLE()等无法正常调用
3. 跨合约交互失败，无法正确授予权限和创建代币

解决方案：
---------
1. 修复共享ABI文件，添加缺失的方法定义
2. 创建可靠的接口定义，确保类型安全
3. 提供辅助库，使用安全调用方式绕过ABI问题
4. 硬编码关键常量，避免调用可能失败的getter方法
5. 提供高低级调用的回退机制，确保操作成功

文件列表：
---------
1. 修复的ABI定义文件: shared/contracts/abis.js
2. 接口定义文件:
   - contracts/interfaces/IFixedRoleManager.sol
   - contracts/interfaces/IFixedPropertyRegistry.sol
   - contracts/interfaces/IFixedTokenFactory.sol
3. 辅助库: contracts/libraries/ContractHelper.sol
4. 示例合约: contracts/examples/TokenCreator.sol

使用方法：
---------
1. 在合约中:
   - 导入接口和辅助库
   - 使用ContractHelper提供的安全方法进行合约交互
   - 参考TokenCreator合约作为示例实现

2. 在JavaScript中:
   - 使用低级调用方式，如直接编码函数调用
   - 使用自定义ABI定义，仅包含所需方法
   - 处理事件日志时小心解析

注意事项：
---------
1. 长期解决方案是重新部署合约并确保ABI完全匹配
2. 当前修复为临时方案，确保系统可以继续运行
3. 在重要操作时加入适当的错误处理和回退机制
`;
}

// 主函数
async function main() {
  try {
    console.log('开始执行ABI修复方案...');
    
    // 修复ABI文件
    const abiFixed = await fixAbiFiles();
    
    // 创建修复型接口
    const interfacesCreated = await createFixedInterfaces();
    
    // 创建辅助库
    const helperCreated = await createHelperLibrary();
    
    // 创建示例脚本
    const exampleCreated = await createExampleScript();
    
    // 输出修复方案说明
    if (abiFixed && interfacesCreated && helperCreated && exampleCreated) {
      console.log(generateSolution());
      logSuccess('ABI修复方案执行完成！');
    } else {
      logWarning('部分修复步骤未完成，请检查错误信息。');
    }
    
  } catch (error) {
    logError('执行ABI修复方案过程中出错', error);
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

module.exports = { main }; 