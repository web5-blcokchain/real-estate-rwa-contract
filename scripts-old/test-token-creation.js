/**
 * 房产代币创建测试脚本
 * 测试为已审核的房产创建代币
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('开始测试房产代币创建流程...');

  // 加载部署状态
  const deployState = require('./deploy-state.json');
  console.log('成功加载部署状态');

  // 获取合约地址
  const tokenFactoryAddress = deployState.tokenFactory;
  const propertyRegistryAddress = deployState.propertyRegistry;
  const roleManagerAddress = deployState.roleManager;

  console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
  console.log(`PropertyRegistry合约地址: ${propertyRegistryAddress}`);
  console.log(`RoleManager合约地址: ${roleManagerAddress}`);

  // 连接到合约
  const [deployer] = await ethers.getSigners();
  console.log(`使用账户: ${deployer.address}`);

  const TokenFactory = await ethers.getContractFactory('TokenFactory');
  const tokenFactory = await TokenFactory.attach(tokenFactoryAddress);
  console.log('已连接到TokenFactory合约');

  const PropertyRegistry = await ethers.getContractFactory('PropertyRegistry');
  const propertyRegistry = await PropertyRegistry.attach(propertyRegistryAddress);
  console.log('已连接到PropertyRegistry合约');

  // 获取当前已存在的属性
  const allPropertyIds = await propertyRegistry.getAllPropertyIds();
  console.log(`找到${allPropertyIds.length}个已注册的房产`);

  if (allPropertyIds.length === 0) {
    console.error('没有找到已注册的房产，无法创建代币');
    return;
  }

  // 检查属性状态并创建代币
  for (const propertyId of allPropertyIds) {
    try {
      const property = await propertyRegistry.getProperty(propertyId);
      const status = Number(property.status);
      const isApproved = status === 2; // 根据枚举值: Approved = 2
      
      console.log(`房产ID: ${propertyId}, 状态: ${status}, 是否已审核: ${isApproved}`);
      
      // 检查是否已有代币
      const existingToken = await tokenFactory.getTokenAddress(propertyId);
      if (existingToken !== '0x0000000000000000000000000000000000000000') {
        console.log(`房产 ${propertyId} 已存在代币: ${existingToken}, 跳过`);
        continue;
      }
      
      // 只为已审核的房产创建代币
      if (isApproved) {
        // 准备代币参数
        const tokenName = `Japan RWA ${propertyId}`;
        const tokenSymbol = `JRW${propertyId.substring(0, 4)}`;
        const initialSupply = ethers.parseEther('1000000'); // 初始供应量 1,000,000 代币
        
        console.log(`为房产 ${propertyId} 创建代币: ${tokenName} (${tokenSymbol})`);
        
        try {
          // 创建代币 - 尝试使用createTokenPublic
          const tx = await tokenFactory.createTokenPublic(
            propertyId,
            tokenName,
            tokenSymbol,
            initialSupply,
            0 // 最大供应量为0表示使用默认值
          );
          
          console.log(`创建代币交易已提交: ${tx.hash}`);
          await tx.wait();
          
          // 获取代币地址
          const tokenAddress = await tokenFactory.getTokenAddress(propertyId);
          console.log(`代币创建成功! 房产ID: ${propertyId}, 代币地址: ${tokenAddress}`);
        } catch (error) {
          console.error(`使用createTokenPublic创建代币失败: ${error.message}`);
          console.log('尝试使用createToken方法...');
          
          try {
            // 尝试使用直接的createToken内部方法调用（可能不会成功，因为是internal）
            const tx = await tokenFactory.createToken(
              propertyId,
              tokenName,
              tokenSymbol,
              initialSupply,
              0
            );
            
            console.log(`创建代币交易已提交: ${tx.hash}`);
            await tx.wait();
            
            // 获取代币地址
            const tokenAddress = await tokenFactory.getTokenAddress(propertyId);
            console.log(`代币创建成功! 房产ID: ${propertyId}, 代币地址: ${tokenAddress}`);
          } catch (innerError) {
            console.error(`所有尝试都失败了: ${innerError.message}`);
            throw error; // 重新抛出原始错误
          }
        }
      } else {
        console.log(`房产 ${propertyId} 未批准，无法创建代币`);
      }
    } catch (error) {
      console.error(`处理房产 ${propertyId} 时出错:`, error);
    }
  }
  
  // 获取所有代币信息
  const tokenCount = await tokenFactory.getTokenCount();
  console.log(`系统中共有 ${tokenCount} 个代币`);
  
  const allTokens = await tokenFactory.getAllTokens();
  for (let i = 0; i < allTokens.length; i++) {
    try {
      const tokenAddress = allTokens[i];
      const propertyId = await tokenFactory.getPropertyIdFromToken(tokenAddress);
      console.log(`代币 ${i+1}: 地址=${tokenAddress}, 房产ID=${propertyId}`);
    } catch (error) {
      console.error(`获取代币 ${allTokens[i]} 信息失败:`, error);
    }
  }

  console.log('房产代币创建测试完成');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
