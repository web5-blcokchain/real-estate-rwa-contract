/**
 * TokenFactory合约调试脚本
 * 使用底层调用诊断createSingleToken和createTokenPublic函数失败的原因
 */

const { ethers } = require('hardhat');
const path = require('path');
const fs = require('fs');
const { ROLES } = require('./utils/roles');

// Constants
const MINTER_ROLE = ROLES.MINTER;
const SUPER_ADMIN = ROLES.DEFAULT_ADMIN;
const PROPERTY_MANAGER = ROLES.PROPERTY_MANAGER;
const TOKEN_MANAGER = ROLES.TOKEN_MANAGER;

// 用于记录的辅助函数
const log = (message, data) => {
  if (data) {
    console.log(`[${new Date().toISOString()}] ${message}`, data);
  } else {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
};

const logError = (message, error) => {
  if (error) {
    console.error(`✗ ${message}`);
    console.error(error);
  } else {
    console.error(`✗ ${message}`);
  }
};

const logSuccess = (message) => {
  console.log(`✓ ${message}`);
};

// Load deployment statuses
function loadDeploymentStatuses() {
  const deployStatePath = path.join(__dirname, 'deploy-state.json');
  if (!fs.existsSync(deployStatePath)) {
    throw new Error(`部署状态文件不存在: ${deployStatePath}`);
  }

  const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
  log('成功加载部署状态');
  
  // 转换为格式化输出
  const deployments = {
    TokenFactory: { address: deployState.tokenFactory },
    RoleManager: { address: deployState.roleManager },
    PropertyRegistry: { address: deployState.propertyRegistry }
  };
  
  // 输出合约地址
  Object.keys(deployments).forEach(name => {
    log(`- ${name}: ${deployments[name].address}`);
  });
  
  return deployments;
}

async function main() {
  try {
    log('开始调试TokenFactory合约...');
    
    // 加载部署状态
    const deployments = loadDeploymentStatuses();

    // 连接TokenFactory合约
    const tokenFactory = await ethers.getContractAt('TokenFactory', deployments.TokenFactory.address);
    log('TokenFactory合约连接成功');

    // 连接到RoleManager和PropertyRegistry
    const roleManager = await ethers.getContractAt('RoleManager', deployments.RoleManager.address);
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', deployments.PropertyRegistry.address);

    log(`RoleManager合约地址: ${roleManager.target}`);
    log(`PropertyRegistry合约地址: ${propertyRegistry.target}`);

    // 获取合约实例
    const tokenImplementation = await tokenFactory.tokenImplementation();
    log(`Token实现合约地址: ${tokenImplementation}`);

    // 获取当前帐户
    const [deployer] = await ethers.getSigners();
    log(`当前部署者地址: ${deployer.address}`);

    // 检查部署者是否有必要的角色
    const hasAdminRole = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
    const hasPropertyRole = await roleManager.hasRole(PROPERTY_MANAGER, deployer.address);
    const hasTokenRole = await roleManager.hasRole(TOKEN_MANAGER, deployer.address);

    log('角色检查:', {
      SUPER_ADMIN: hasAdminRole,
      PROPERTY_MANAGER: hasPropertyRole,
      TOKEN_MANAGER: hasTokenRole
    });

    if (!hasAdminRole && !hasPropertyRole) {
      logError('当前账户没有足够的权限创建代币，需要SUPER_ADMIN或PROPERTY_MANAGER角色');
    }

    // 获取所有代币数量
    const tokenCount = await tokenFactory.getTokenCount();
    log(`当前已创建的代币数量: ${tokenCount}`);

    // 检查最近创建的属性
    log('开始诊断最近创建的属性状态...');

    // 查询指定属性ID
    const testPropertyId = 'TEST-4434'; // 根据需要修改
    log(`检查房产 ${testPropertyId} 的状态...`);

    try {
      const property = await propertyRegistry.getProperty(testPropertyId);
      log(`房产 ${testPropertyId} 存在: ${property.exists}`);

      if (property.exists) {
        log(`房产状态: ${property.status}`);

        // 尝试获取关联代币地址
        const tokenAddress = await tokenFactory.getTokenAddress(testPropertyId);
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        if (tokenAddress !== zeroAddress) {
          log(`房产 ${testPropertyId} 已有代币地址: ${tokenAddress}`);
        } else {
          log(`房产 ${testPropertyId} 尚未创建代币`);

          // 尝试创建代币
          log('尝试诊断代币创建失败原因...');

          if (property.status.toString() === '2') { // 2 = Approved
            log('尝试为已审核房产创建代币...');
            try {
              const tx = await tokenFactory.createTokenPublic(
                testPropertyId,
                `${testPropertyId} Token`,
                `TK${testPropertyId.slice(-4)}`,
                ethers.utils.parseEther('1000000'),
                ethers.utils.parseEther('1000000')
              );
              
              await tx.wait();
              logSuccess('代币创建交易已提交');
              
              // 再次检查代币地址
              const newTokenAddress = await tokenFactory.getTokenAddress(testPropertyId);
              log(`创建后的代币地址: ${newTokenAddress}`);
            } catch (error) {
              logError('创建代币失败', error);
            }
          } else {
            logError('代币创建失败原因: 房产未审核');
          }
        }
      } else {
        logError('代币创建失败原因: 房产不存在');
      }
    } catch (error) {
      logError('查询房产信息时出错', error);
    }

    // 检查TokenFactory合约是否有必要的角色
    const factoryHasAdminRole = await roleManager.hasRole(SUPER_ADMIN, tokenFactory.address);
    const factoryHasPropertyRole = await roleManager.hasRole(PROPERTY_MANAGER, tokenFactory.address);
    const factoryHasTokenRole = await roleManager.hasRole(TOKEN_MANAGER, tokenFactory.address);

    log('TokenFactory角色检查:', {
      SUPER_ADMIN: factoryHasAdminRole,
      PROPERTY_MANAGER: factoryHasPropertyRole,
      TOKEN_MANAGER: factoryHasTokenRole
    });

    // 检查TokenFactory是否被授权为PropertyRegistry的授权合约
    const isAuthorized = await propertyRegistry.isAuthorizedContract(tokenFactory.address);
    log(`\nTokenFactory授权检查:`, {
      isAuthorized: isAuthorized
    });

    if (!isAuthorized) {
      console.log('警告: TokenFactory不是PropertyRegistry的授权合约。这可能导致无法注册代币!');
      
      if (hasAdminRole) {
        log('尝试将TokenFactory添加为授权合约...');
        try {
          const tx = await propertyRegistry.addAuthorizedContract(tokenFactory.address);
          await tx.wait();
          const checkAgain = await propertyRegistry.isAuthorizedContract(tokenFactory.address);
          logSuccess(`授权操作后的状态: ${checkAgain ? '成功' : '失败'}`);
        } catch (error) {
          logError('授权失败', error);
        }
      } else {
        log('需要SUPER_ADMIN角色才能添加授权合约');
      }
    }

    // 检查RealEstateToken的实现合约地址
    try {
      log('\n检查MINTER_ROLE的授权情况:');
      
      // 检查TokenFactory是否有MINTER_ROLE权限
      const factoryHasMinterRole = await roleManager.hasRole(MINTER_ROLE, tokenFactory.address);
      log(`TokenFactory是否有MINTER_ROLE: ${factoryHasMinterRole}`);
      
      // 检查代币实现合约是否有MINTER_ROLE权限
      const tokenImplHasMinterRole = await roleManager.hasRole(MINTER_ROLE, tokenImplementation);
      log(`代币实现合约是否有MINTER_ROLE: ${tokenImplHasMinterRole}`);
      
      // 如果没有权限，尝试授予
      if (!factoryHasMinterRole && hasAdminRole) {
        log('尝试给TokenFactory授予MINTER_ROLE...');
        try {
          const tx = await roleManager.grantRole(MINTER_ROLE, tokenFactory.address);
          await tx.wait();
          logSuccess('已授予TokenFactory MINTER_ROLE权限');
        } catch (error) {
          logError('授予MINTER_ROLE失败', error);
        }
      }
      
      if (!tokenImplHasMinterRole && hasAdminRole) {
        log('尝试给代币实现合约授予MINTER_ROLE...');
        try {
          const tx = await roleManager.grantRole(MINTER_ROLE, tokenImplementation);
          await tx.wait();
          logSuccess('已授予代币实现合约MINTER_ROLE权限');
        } catch (error) {
          logError('授予MINTER_ROLE失败', error);
        }
      }
    } catch (error) {
      logError('获取角色详情失败', error);
    }

    log('代币工厂诊断完成');
  } catch (error) {
    logError('诊断过程中出错', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 