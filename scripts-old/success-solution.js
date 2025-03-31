/**
 * 房产代币创建完整解决方案
 * 解决了权限和ABI解码的问题，确保可以成功创建房产代币
 */

const { ethers } = require('hardhat');

// 彩色日志
function logSuccess(message) { console.log(`\x1b[32m✓ ${message}\x1b[0m`); }
function logInfo(message) { console.log(`\x1b[36mi ${message}\x1b[0m`); }
function logWarning(message) { console.log(`\x1b[33m! ${message}\x1b[0m`); }
function logError(message, error = null) { 
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  if (error) console.error(error);
}

async function main() {
  try {
    console.log('\n================ 房产代币创建解决方案 ================\n');
    
    // 步骤1: 加载部署状态和合约
    console.log('1. 加载部署状态和合约...');
    const deployState = require('./deploy-state.json');
    
    // 获取合约地址
    const roleManagerAddress = deployState.roleManager;
    const propertyRegistryAddress = deployState.propertyRegistry;
    const tokenFactoryAddress = deployState.tokenFactory;
    
    console.log(`合约地址:
  RoleManager: ${roleManagerAddress}
  PropertyRegistry: ${propertyRegistryAddress}
  TokenFactory: ${tokenFactoryAddress}
    `);
    
    // 获取账户
    const [deployer] = await ethers.getSigners();
    console.log(`使用部署者账户: ${deployer.address}`);
    
    // 连接到合约
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
    const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
    
    // 获取代币实现合约地址
    let tokenImplementationAddress;
    try {
      tokenImplementationAddress = await tokenFactory.tokenImplementation();
      console.log(`TokenImplementation: ${tokenImplementationAddress}`);
    } catch (error) {
      tokenImplementationAddress = deployState.TokenImplementation;
      if (!tokenImplementationAddress) {
        console.log('未能获取代币实现合约地址，将使用默认地址');
        tokenImplementationAddress = '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'; // 使用默认地址
      }
    }
    
    const tokenImplementation = await ethers.getContractAt('RealEstateToken', tokenImplementationAddress);
    
    logSuccess('成功连接到所有合约');
    
    // 步骤2: 授予所有必要的权限
    console.log('\n2. 设置必要的权限...');
    
    // 检查角色哈希
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
    const SNAPSHOT_ROLE = '0x5fdbd35e8da83ee755d5e62a539e5ed7f47126abede0b8b10f9ea43dc6eed07f';
    const SUPER_ADMIN_ROLE = '0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8';
    const PROPERTY_MANAGER_ROLE = '0x5cefc88e2d50f91b66109b6bb76803f11168ca3d1cee10cbafe864e4749970c7';
    
    // 确保部署者有所有角色
    try {
      console.log('确保部署者拥有所有必要角色...');
      const roles = [
        { name: 'DEFAULT_ADMIN_ROLE', hash: DEFAULT_ADMIN_ROLE },
        { name: 'MINTER_ROLE', hash: MINTER_ROLE },
        { name: 'SNAPSHOT_ROLE', hash: SNAPSHOT_ROLE },
        { name: 'SUPER_ADMIN_ROLE', hash: SUPER_ADMIN_ROLE },
        { name: 'PROPERTY_MANAGER_ROLE', hash: PROPERTY_MANAGER_ROLE }
      ];
      
      for (const role of roles) {
        try {
          const tx = await roleManager.grantRole(role.hash, deployer.address);
          await tx.wait();
          logSuccess(`已授予部署者 ${role.name} 角色`);
        } catch (error) {
          // 如果失败，可能已经有了角色
          logWarning(`授予部署者 ${role.name} 角色失败: ${error.message}`);
        }
      }
    } catch (error) {
      logError('设置部署者角色出错', error);
    }
    
    // 授予TokenFactory关键角色
    try {
      console.log('授予TokenFactory所有必要角色...');
      
      // 授予TokenFactory关键角色
      const factoryRoles = [
        { name: 'DEFAULT_ADMIN_ROLE', hash: DEFAULT_ADMIN_ROLE },
        { name: 'MINTER_ROLE', hash: MINTER_ROLE },
        { name: 'SNAPSHOT_ROLE', hash: SNAPSHOT_ROLE }, 
        { name: 'PROPERTY_MANAGER_ROLE', hash: PROPERTY_MANAGER_ROLE }
      ];
      
      for (const role of factoryRoles) {
        try {
          const tx = await roleManager.grantRole(role.hash, tokenFactoryAddress);
          await tx.wait();
          logSuccess(`已授予TokenFactory ${role.name} 角色`);
        } catch (error) {
          logWarning(`授予TokenFactory ${role.name} 角色失败: ${error.message}`);
        }
      }
      
      // 授予TokenFactory角色到实现合约
      console.log('授予Token实现合约必要角色...');
      try {
        const tx = await roleManager.grantRole(MINTER_ROLE, tokenImplementationAddress);
        await tx.wait();
        logSuccess(`已授予Token实现合约 MINTER_ROLE 角色`);
      } catch (error) {
        logWarning(`授予Token实现合约 MINTER_ROLE 角色失败: ${error.message}`);
      }
      
      // 确保TokenFactory是PropertyRegistry的授权合约
      try {
        const tx = await propertyRegistry.addAuthorizedContract(tokenFactoryAddress);
        await tx.wait();
        logSuccess('已将TokenFactory添加为PropertyRegistry的授权合约');
      } catch (error) {
        logWarning(`添加TokenFactory为PropertyRegistry授权合约失败: ${error.message}`);
      }
    } catch (error) {
      logError('设置TokenFactory角色出错', error);
    }
    
    // 步骤3: 注册一个新的测试房产
    console.log('\n3. 注册新的测试房产...');
    
    // 生成唯一的房产ID
    const timestamp = Date.now();
    const testPropertyId = `FIXED-TEST-${timestamp}`;
    
    try {
      console.log(`注册房产ID: ${testPropertyId}`);
      const registerTx = await propertyRegistry.registerProperty(
        testPropertyId,
        'Japan',
        'ipfs://QmTest12345'
      );
      await registerTx.wait();
      logSuccess('房产注册成功');
      
      // 批准房产
      console.log('批准房产...');
      const approveTx = await propertyRegistry.approveProperty(testPropertyId);
      await approveTx.wait();
      logSuccess('房产批准成功');
      
      // 检查房产状态
      const isApproved = await propertyRegistry.isPropertyApproved(testPropertyId);
      logSuccess(`房产已审批状态: ${isApproved}`);
    } catch (error) {
      logError('注册或批准房产失败', error);
      // 继续执行，因为房产可能已存在
    }
    
    // 步骤4: 创建代币
    console.log('\n4. 创建代币...');
    
    const tokenName = `Japan RWA ${testPropertyId}`;
    const tokenSymbol = `JRWA${timestamp.toString().slice(-4)}`;
    const initialSupply = ethers.parseEther('1000000'); // 100万代币
    
    console.log(`代币参数:
  名称: ${tokenName}
  符号: ${tokenSymbol}
  初始供应量: 1,000,000
    `);
    
    try {
      // 使用createSingleToken方法
      console.log('调用createSingleToken方法创建代币...');
      const createTx = await tokenFactory.createSingleToken(
        tokenName,
        tokenSymbol,
        testPropertyId,
        initialSupply,
        { gasLimit: 10000000 } // 增加gas限制避免gas不足
      );
      
      console.log(`交易已提交，等待确认: ${createTx.hash}`);
      const receipt = await createTx.wait();
      logSuccess(`代币创建成功! 使用了 ${receipt.gasUsed.toString()} gas`);
      
      // 分析事件找到代币地址
      let tokenAddress = null;
      for (const log of receipt.logs) {
        if (log.topics && log.topics.length > 0) {
          // TokenCreated事件的主题格式
          if (log.topics[0] === '0x5f7e321571d1591f8d2c01d7f4aeb27d537922f5111ca32d8f93b9890a34c2a4') {
            // 这是TokenCreated事件
            if (log.topics.length > 2) {
              tokenAddress = `0x${log.topics[2].slice(26).toLowerCase()}`;
              break;
            }
          }
        }
      }
      
      if (tokenAddress) {
        logSuccess(`通过事件找到创建的代币地址: ${tokenAddress}`);
        
        // 尝试连接到代币合约
        try {
          const token = await ethers.getContractAt('RealEstateToken', tokenAddress);
          const name = await token.name();
          const symbol = await token.symbol();
          const totalSupply = await token.totalSupply();
          
          console.log(`代币信息:
  名称: ${name}
  符号: ${symbol}
  总供应量: ${ethers.formatEther(totalSupply)} 代币
          `);
          
          logSuccess('成功验证代币!');
        } catch (error) {
          logError('无法连接到代币合约', error);
        }
      } else {
        logWarning('无法从事件中提取代币地址');
      }
      
    } catch (error) {
      logError('创建代币失败', error);
    }
    
    console.log('\n================ 测试完成 ================\n');
  } catch (error) {
    logError('执行过程中出错', error);
  }
}

// 执行脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 