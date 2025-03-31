const { ethers } = require('hardhat');
const { logger } = require('./http-server/src/utils/logger');

async function main() {
  try {
    // 获取PropertyRegistry地址
    const propertyRegistryAddress = require('./scripts/deploy-state.json').propertyRegistry;
    logger.info(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署者账户: ${deployer.address}`);

    // 获取PropertyRegistry合约工厂
    const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');

    // 连接到已部署的PropertyRegistry
    const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);
    logger.info('已连接到PropertyRegistry合约');

    // 准备测试数据
    const propertyId = "property001";
    const country = "JP";
    const metadataURI = JSON.stringify({
      name: "东京高层公寓",
      location: "东京都新宿区西新宿1-1-1",
      description: "位于新宿核心商圈的现代化高层公寓，交通便利，设施完善",
      area: 85,
      rooms: 3,
      built: 2019,
      features: ["中央空调", "智能家居", "24小时安保"]
    });

    logger.info(`尝试注册房产: ${propertyId}, ${country}`);
    logger.info(`元数据: ${metadataURI}`);

    // 检查属性是否已存在
    try {
      const property = await propertyRegistry.getProperty(propertyId);
      logger.info(`房产 ${propertyId} 当前状态: ${property.exists ? '已存在' : '不存在'}`);
      if (property.exists) {
        logger.info(`状态: ${property.status}, 注册时间: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
      }
    } catch (error) {
      logger.info(`获取房产信息失败: ${error.message}`);
    }

    // 尝试注册房产
    try {
      const tx = await propertyRegistry.registerProperty(propertyId, country, metadataURI);
      logger.info(`交易已提交，等待确认: ${tx.hash}`);
      
      const receipt = await tx.wait();
      logger.info(`交易确认，状态: ${receipt.status === 1 ? '成功' : '失败'}`);
      
      // 再次检查属性是否存在
      const property = await propertyRegistry.getProperty(propertyId);
      logger.info(`房产 ${propertyId} 现在状态: ${property.exists ? '已存在' : '不存在'}`);
      if (property.exists) {
        logger.info(`状态: ${property.status}, 注册时间: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
      }
    } catch (error) {
      logger.error(`注册房产失败: ${error.message}`);
    }

  } catch (error) {
    logger.error('测试PropertyRegistry时出错:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 