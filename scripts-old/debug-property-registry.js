const { ethers } = require('hardhat');

async function main() {
  try {
    console.log('开始调试PropertyRegistry合约...');
    // 获取PropertyRegistry和RoleManager地址
    const deployState = require('./deploy-state.json');
    const propertyRegistryAddress = deployState.propertyRegistry;
    const roleManagerAddress = deployState.roleManager;
    
    console.log(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);
    console.log(`RoleManager合约地址: ${roleManagerAddress}`);

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log(`部署者账户: ${deployer.address}`);

    // 加载合约
    const RoleManager = await ethers.getContractFactory('RoleManager');
    const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');

    // 连接到已部署的合约
    const roleManager = await RoleManager.attach(roleManagerAddress);
    const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);
    
    console.log('已连接到合约');
    
    // 1. 检查部署者账户的角色
    const superAdminRole = await roleManager.SUPER_ADMIN();
    const propertyManagerRole = await roleManager.PROPERTY_MANAGER();
    
    console.log(`\n角色哈希值:`);
    console.log(`SUPER_ADMIN: ${superAdminRole}`);
    console.log(`PROPERTY_MANAGER: ${propertyManagerRole}`);
    
    const hasSuperAdminRole = await roleManager.hasRole(superAdminRole, deployer.address);
    const hasPropertyManagerRole = await roleManager.hasRole(propertyManagerRole, deployer.address);
    
    console.log(`\n部署者角色:`);
    console.log(`是否有SUPER_ADMIN角色: ${hasSuperAdminRole}`);
    console.log(`是否有PROPERTY_MANAGER角色: ${hasPropertyManagerRole}`);
    
    // 2. 如果部署者没有PROPERTY_MANAGER角色，授予该角色
    if (!hasPropertyManagerRole) {
      console.log('\n部署者没有PROPERTY_MANAGER角色，正在授予...');
      if (hasSuperAdminRole) {
        const tx = await roleManager.grantRole(propertyManagerRole, deployer.address);
        await tx.wait();
        console.log('已授予PROPERTY_MANAGER角色');
      } else {
        console.log('部署者没有SUPER_ADMIN角色，无法授予PROPERTY_MANAGER角色');
      }
    }
    
    // 3. 尝试获取PropertyRegistry里的角色引用
    const prRoleManager = await propertyRegistry.roleManager();
    console.log(`\nPropertyRegistry中的RoleManager引用: ${prRoleManager}`);
    console.log(`预期的RoleManager地址: ${roleManagerAddress}`);
    console.log(`引用是否正确: ${prRoleManager.toLowerCase() === roleManagerAddress.toLowerCase()}`);
    
    // 4. 检查房产是否已注册
    const propertyId = "property001";
    let propertyExists = false;
    
    try {
      const property = await propertyRegistry.getProperty(propertyId);
      propertyExists = property.exists;
      console.log(`\n房产ID ${propertyId} 状态: ${propertyExists ? '已存在' : '不存在'}`);
      if (propertyExists) {
        console.log(`状态: ${property.status}`);
        console.log(`registrationTime: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
      }
    } catch (error) {
      console.log(`\n无法获取房产信息: ${error.message}`);
    }
    
    // 5. 尝试注册新房产
    if (!propertyExists) {
      console.log('\n尝试注册新房产...');
      const country = "JP";
      const metadataURI = JSON.stringify({
        name: "测试房产",
        location: "测试地址",
        description: "这是一个测试用的房产",
        area: 100,
        rooms: 3
      });
      
      try {
        console.log(`准备注册房产: ${propertyId}, ${country}, ${metadataURI}`);
        const tx = await propertyRegistry.registerProperty(propertyId, country, metadataURI);
        console.log(`交易已提交，等待确认: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`交易已确认，状态: ${receipt.status === 1 ? '成功' : '失败'}`);
        
        // 再次检查房产是否存在
        const property = await propertyRegistry.getProperty(propertyId);
        console.log(`注册后，房产ID ${propertyId} 状态: ${property.exists ? '已存在' : '不存在'}`);
        if (property.exists) {
          console.log(`状态: ${property.status}`);
          console.log(`registrationTime: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
        }
      } catch (error) {
        console.log(`注册房产失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('调试PropertyRegistry时出错:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 