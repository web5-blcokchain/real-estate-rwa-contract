/**
 * 简单合约交互测试脚本
 * 尝试直接与RoleManager合约交互，检查部署问题
 */
const { ethers, upgrades } = require('hardhat');
const logger = require('../shared/utils/logger');

async function main() {
  try {
    console.log('开始测试合约交互...');
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log(`部署账户: ${deployer.address}`);
    
    // 手动获取合约地址
    const roleManagerAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
    console.log(`RoleManager地址: ${roleManagerAddress}`);
    
    // 检查地址是否有代码
    const code = await ethers.provider.getCode(roleManagerAddress);
    console.log(`合约代码是否存在: ${code !== '0x'}`);
    console.log(`代码长度: ${code.length}`);
    
    console.log('正在尝试使用升级插件正确部署可升级合约...');
    
    // 使用OpenZeppelin upgrades插件部署UUPS代理
    const RoleManager = await ethers.getContractFactory('RoleManager');
    console.log('已创建合约工厂');
    
    try {
      console.log('部署UUPS代理合约...');
      const roleManager = await upgrades.deployProxy(RoleManager, [], {
        initializer: 'initialize',
        kind: 'uups',
        timeout: 60000,
        unsafeAllow: ['constructor'],
        gasLimit: 5000000
      });
      
      console.log('等待代理部署交易确认...');
      await roleManager.waitForDeployment();
      
      const proxyAddress = await roleManager.getAddress();
      console.log(`RoleManager代理地址: ${proxyAddress}`);
      
      // 获取实现合约地址
      const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      console.log(`RoleManager实现合约地址: ${implAddress}`);
      
      // 测试合约
      console.log('测试合约方法调用...');
      
      try {
        // 尝试验证初始化结果
        const SUPER_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SUPER_ADMIN'));
        const hasRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
        console.log(`部署账户是否具有SUPER_ADMIN角色: ${hasRole}`);
        
        // 检查所有角色
        const hasDefaultAdmin = await roleManager.hasRole(ethers.ZeroHash, deployer.address);
        console.log(`部署账户是否具有DEFAULT_ADMIN角色: ${hasDefaultAdmin}`);
        
        const version = await roleManager.version();
        console.log(`合约版本: ${version}`);
        
        // 设置一个角色以测试合约功能
        const TEST_ROLE = ethers.keccak256(ethers.toUtf8Bytes('TEST_ROLE'));
        console.log(`创建测试角色: ${TEST_ROLE}`);
        
        const grantRoleTx = await roleManager.grantRole(TEST_ROLE, deployer.address);
        await grantRoleTx.wait();
        console.log('授予角色成功');
        
        const hasTestRole = await roleManager.hasRole(TEST_ROLE, deployer.address);
        console.log(`部署账户是否具有TEST_ROLE角色: ${hasTestRole}`);
        
        return true;
      } catch (error) {
        console.error('调用合约方法出错:', error.message);
        console.error('错误详情:', error);
        return false;
      }
    } catch (deployError) {
      console.error('代理部署失败:', deployError.message);
      console.error('错误类型:', deployError.constructor.name);
      if (deployError.data) {
        console.error('错误数据:', deployError.data);
      }
      return false;
    }
  } catch (error) {
    console.error('测试脚本执行出错:', error.message);
    return false;
  }
}

// 执行主函数
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('执行出错:', error);
    process.exit(1);
  }); 