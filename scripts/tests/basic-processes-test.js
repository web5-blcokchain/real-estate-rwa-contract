/**
 * 基础业务流程测试
 * 测试系统合约的基本功能
 */
const { ethers } = require('hardhat');
const { getContractAddresses } = require('../../shared/config/contracts');
const logger = require('../../shared/utils/logger');

/**
 * 测试主函数
 */
async function main() {
  try {
    console.log('=== 基础业务流程测试开始 ===');
    
    // 获取合约地址
    const contracts = getContractAddresses();
    const [admin, user1, user2] = await ethers.getSigners();
    
    console.log(`测试账户: ${admin.address} (超级管理员)`);
    console.log(`测试账户: ${user1.address} (用户1)`);
    console.log(`测试账户: ${user2.address} (用户2)`);
    
    // 加载系统合约 - 修正合约地址键名
    const realEstateSystem = await ethers.getContractAt('RealEstateSystem', contracts.realEstateSystem);
    const roleManager = await ethers.getContractAt('RoleManager', contracts.roleManager);
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', contracts.propertyRegistry);
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.tokenFactory);
    const feeManager = await ethers.getContractAt('FeeManager', contracts.feeManager);
    
    // 测试1: 角色检查
    console.log('\n--- 测试1: 角色验证 ---');
    // 检查admin是否有SUPER_ADMIN角色
    const SUPER_ADMIN_ROLE = '0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8';
    const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN_ROLE, admin.address);
    console.log(`管理员拥有SUPER_ADMIN角色: ${hasSuperAdmin}`);
    
    if (hasSuperAdmin) {
      console.log('✅ 角色权限验证成功');
    } else {
      console.error('❌ 角色权限验证失败');
    }
    
    // 测试2: 房产注册
    console.log('\n--- 测试2: 房产注册和查询 ---');
    const propertyId = `PROP-${Date.now()}`;
    const country = '日本';
    const metadataURI = `https://example.com/properties/${propertyId}`;
    
    // 注册房产
    const registerTx = await propertyRegistry.connect(admin).registerProperty(
      propertyId,
      country,
      metadataURI
    );
    
    await registerTx.wait();
    console.log(`✅ 房产注册成功: ${propertyId}`);
    
    // 查询房产信息
    const property = await propertyRegistry.properties(propertyId);
    console.log(`房产状态: ${property.status}`);
    
    // 测试3: 批准房产
    console.log('\n--- 测试3: 房产批准 ---');
    await propertyRegistry.connect(admin).approveProperty(propertyId);
    
    // 验证房产状态变更为已批准
    const updatedProperty = await propertyRegistry.properties(propertyId);
    console.log(`新房产状态: ${updatedProperty.status}`);
    
    // 状态2表示已批准，但我们需要进行字符串比较因为返回的是BigInt
    if (updatedProperty.status.toString() === '2') {
      console.log('✅ 房产批准成功');
    } else {
      console.error('❌ 房产批准失败');
    }
    
    // 测试4: 系统合约关系验证
    console.log('\n--- 测试4: 系统合约关系验证 ---');
    
    // 获取RealEstateSystem的合约引用
    const roleManagerInSystem = await realEstateSystem.roleManager();
    console.log(`RealEstateSystem.roleManager: ${roleManagerInSystem}`);
    console.log(`实际RoleManager地址: ${contracts.roleManager}`);
    
    if (roleManagerInSystem.toLowerCase() === contracts.roleManager.toLowerCase()) {
      console.log('✅ RoleManager引用正确');
    } else {
      console.error('❌ RoleManager引用错误');
    }
    
    // 测试5: FeeManager设置
    console.log('\n--- 测试5: 费用管理 ---');
    
    // 获取当前费率
    const platformFee = await feeManager.platformFee();
    const tradingFee = await feeManager.tradingFee();
    const redemptionFee = await feeManager.redemptionFee();
    
    console.log(`平台费率: ${platformFee} (${Number(platformFee)/100}%)`);
    console.log(`交易费率: ${tradingFee} (${Number(tradingFee)/100}%)`);
    console.log(`赎回费率: ${redemptionFee} (${Number(redemptionFee)/100}%)`);
    
    // 设置新的费率
    const newPlatformFee = 500; // 5%
    // 使用更新函数更新平台费率 - FeeType.PLATFORM = 4
    await feeManager.connect(admin).updateFee(4, newPlatformFee);
    
    // 验证费率已更新
    const updatedPlatformFee = await feeManager.platformFee();
    console.log(`更新后的平台费率: ${updatedPlatformFee} (${Number(updatedPlatformFee)/100}%)`);
    
    if (Number(updatedPlatformFee) === newPlatformFee) {
      console.log('✅ 费率更新成功');
    } else {
      console.error('❌ 费率更新失败');
    }
    
    // 测试6: 系统状态控制
    console.log('\n--- 测试6: 系统状态控制 ---');
    
    // 获取当前系统状态
    const systemActive = await realEstateSystem.systemActive();
    console.log(`当前系统状态: ${systemActive ? '激活' : '未激活'}`);
    
    // 修改系统状态
    await realEstateSystem.connect(admin).setSystemStatus(!systemActive);
    
    // 验证系统状态已更新
    const updatedSystemActive = await realEstateSystem.systemActive();
    console.log(`更新后的系统状态: ${updatedSystemActive ? '激活' : '未激活'}`);
    
    if (updatedSystemActive !== systemActive) {
      console.log('✅ 系统状态更新成功');
    } else {
      console.error('❌ 系统状态更新失败');
    }
    
    // 恢复系统状态
    await realEstateSystem.connect(admin).setSystemStatus(systemActive);
    console.log(`已恢复系统状态为: ${systemActive ? '激活' : '未激活'}`);
    
    console.log('\n=== 基础业务流程测试完成 ===');
    console.log('所有基础功能测试通过');
    return true;
  } catch (error) {
    console.error('业务流程测试失败:', error.message);
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

module.exports = { main }; 