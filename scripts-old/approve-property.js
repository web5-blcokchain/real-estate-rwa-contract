/**
 * 房产审核脚本
 * 将房产状态从Pending(1)变更为Approved(2)
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('开始执行房产审核流程...');

  // 加载部署状态
  const deployState = require('./deploy-state.json');
  console.log('成功加载部署状态');

  // 获取合约地址
  const propertyRegistryAddress = deployState.propertyRegistry;
  console.log(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);

  // 连接到合约
  const [deployer] = await ethers.getSigners();
  console.log(`使用账户: ${deployer.address}`);

  const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');
  const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);
  console.log('已连接到PropertyRegistry合约');

  // 获取当前已存在的属性
  const allPropertyIds = await propertyRegistry.getAllPropertyIds();
  console.log(`找到${allPropertyIds.length}个已注册的房产`);

  if (allPropertyIds.length === 0) {
    console.error('没有找到已注册的房产，无法审核');
    return;
  }

  // 检查属性状态并审核
  for (const propertyId of allPropertyIds) {
    try {
      const property = await propertyRegistry.getProperty(propertyId);
      const status = Number(property.status);
      const isPending = status === 1; // 根据枚举值: Pending = 1
      
      console.log(`房产ID: ${propertyId}, 状态: ${status}, 是否待审核: ${isPending}`);
      
      // 只审核待审核的房产
      if (isPending) {
        console.log(`审核房产 ${propertyId}...`);
        
        // 审核房产
        const tx = await propertyRegistry.approveProperty(propertyId);
        console.log(`审核交易已提交: ${tx.hash}`);
        await tx.wait();
        
        // 验证审核结果
        const updatedProperty = await propertyRegistry.getProperty(propertyId);
        const newStatus = Number(updatedProperty.status);
        const isApproved = newStatus === 2; // Approved = 2
        
        if (isApproved) {
          console.log(`✅ 房产 ${propertyId} 审核成功! 新状态: ${newStatus}`);
        } else {
          console.error(`❌ 房产 ${propertyId} 审核失败! 当前状态: ${newStatus}`);
        }
      } else {
        console.log(`房产 ${propertyId} 不是待审核状态，跳过`);
      }
    } catch (error) {
      console.error(`处理房产 ${propertyId} 时出错:`, error);
    }
  }

  console.log('房产审核流程完成');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 