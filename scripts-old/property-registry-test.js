/**
 * 房产注册测试脚本
 * 包含完整流程：注册新房产、查询房产状态、审核房产
 */

const { ethers } = require('hardhat');
const { ZERO_ADDRESS } = require('./utils/constants');
const { ROLES } = require('./utils/roles');

// 硬编码角色哈希值，避免调用可能会失败的合约方法
const SUPER_ADMIN_ROLE = '0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8';
const PROPERTY_MANAGER_ROLE = '0x5cefc88e2d50f91b66109b6bb76803f11168ca3d1cee10cbafe864e4749970c7';

async function main() {
  try {
    console.log('=== 房产注册测试开始 ===');
    
    // 加载部署状态
    const deployState = require('./deploy-state.json');
    const propertyRegistryAddress = deployState.propertyRegistry;
    const roleManagerAddress = deployState.roleManager;
    
    console.log(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);
    console.log(`RoleManager合约地址: ${roleManagerAddress}`);

    // 获取部署者和其他测试账户
    const [deployer, propertyManager, validator] = await ethers.getSigners();
    console.log(`部署者账户: ${deployer.address}`);
    console.log(`Property Manager账户: ${propertyManager.address}`);
    console.log(`Validator账户 (需要SUPER_ADMIN角色): ${validator.address}`);

    // 加载合约
    const RoleManager = await ethers.getContractFactory('RoleManager');
    const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');

    // 连接到已部署的合约
    const roleManager = await RoleManager.attach(roleManagerAddress);
    const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);
    
    console.log('已连接到合约');
    
    // 1. 检查并设置角色
    console.log('\n=== 角色设置 ===');
    const hasSuperAdminRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
    console.log(`部署者是否有SUPER_ADMIN角色: ${hasSuperAdminRole}`);
    
    if (hasSuperAdminRole) {
      // 确保PropertyManager角色已设置
      const hasPropertyManagerRole = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
      if (!hasPropertyManagerRole) {
        console.log('正在为Property Manager授予角色...');
        const tx1 = await roleManager.grantRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
        await tx1.wait();
        console.log(`✅ Property Manager角色已授予: ${propertyManager.address}`);
      } else {
        console.log(`✅ Property Manager角色已存在: ${propertyManager.address}`);
      }
      
      // 确保验证者账户有SUPER_ADMIN角色
      const validatorHasSuperAdminRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, validator.address);
      if (!validatorHasSuperAdminRole) {
        console.log('正在为验证者授予SUPER_ADMIN角色...');
        const tx2 = await roleManager.grantRole(SUPER_ADMIN_ROLE, validator.address);
        await tx2.wait();
        console.log(`✅ SUPER_ADMIN角色已授予验证者: ${validator.address}`);
      } else {
        console.log(`✅ 验证者已拥有SUPER_ADMIN角色: ${validator.address}`);
      }
    }
    
    // 2. 生成唯一的房产ID
    const timestamp = Math.floor(Date.now() / 1000);
    const propertyId = `property-${timestamp}`;
    console.log(`\n=== 测试房产ID: ${propertyId} ===`);
    
    // 3. 注册新房产 (使用Property Manager账户)
    console.log('\n=== 注册新房产 ===');
    const country = 'JP';
    const metadataURI = JSON.stringify({
      name: '东京高层公寓',
      location: '东京都新宿区西新宿1-1-1',
      description: '位于新宿核心商圈的现代化高层公寓，交通便利，设施完善',
      area: 85,
      rooms: 3,
      built: 2019,
      features: ['中央空调', '智能家居', '24小时安保']
    });
    
    try {
      console.log(`准备注册房产: ${propertyId}, ${country}`);
      const tx = await propertyRegistry.connect(propertyManager).registerProperty(propertyId, country, metadataURI);
      console.log(`交易已提交，等待确认: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ 交易已确认，状态: ${receipt.status === 1 ? '成功' : '失败'}`);
      
      // 检查房产状态
      const property = await propertyRegistry.getProperty(propertyId);
      console.log(`房产状态: ${getStatusText(property.status)}`);
      console.log(`注册时间: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
      console.log(`元数据: ${property.metadataURI}`);
    } catch (error) {
      console.error(`❌ 注册房产失败: ${error.message}`);
    }
    
    // 4. 查询所有注册的房产
    console.log('\n=== 查询所有房产 ===');
    const allPropertyIds = await propertyRegistry.getAllPropertyIds();
    console.log(`共找到 ${allPropertyIds.length} 个已注册的房产`);
    
    for (const id of allPropertyIds) {
      const property = await propertyRegistry.getProperty(id);
      console.log(`- 房产ID: ${id}`);
      console.log(`  状态: ${getStatusText(property.status)}`);
      console.log(`  国家: ${property.country}`);
      console.log(`  注册时间: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
    }
    
    // 5. 审核房产 (使用拥有SUPER_ADMIN角色的账户)
    console.log(`\n=== 审核房产: ${propertyId} ===`);
    try {
      const property = await propertyRegistry.getProperty(propertyId);
      const status = Number(property.status);
      const isPending = status === 1; // Pending = 1
      
      if (isPending) {
        console.log('房产状态为待审核，开始审核...');
        const tx = await propertyRegistry.connect(validator).approveProperty(propertyId);
        console.log(`审核交易已提交: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ 交易已确认，状态: ${receipt.status === 1 ? '成功' : '失败'}`);
        
        // 验证审核结果
        const updatedProperty = await propertyRegistry.getProperty(propertyId);
        const newStatus = Number(updatedProperty.status);
        console.log(`审核后状态: ${getStatusText(newStatus)}`);
      } else {
        console.log(`房产当前状态为 ${getStatusText(status)}，不是待审核状态`);
      }
    } catch (error) {
      console.error(`❌ 审核房产失败: ${error.message}`);
    }
    
    console.log('\n=== 房产注册测试完成 ===');
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 辅助函数：将状态码转换为文本描述
function getStatusText(statusCode) {
  const statusMap = {
    0: '未注册(NonExistent)',
    1: '待审核(Pending)',
    2: '已审核(Approved)',
    3: '已拒绝(Rejected)',
    4: '已锁定(Locked)'
  };
  return statusMap[statusCode] || `未知(${statusCode})`;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 