const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  try {
    console.log("开始测试创建卖单...");
    
    // 使用操作员私钥创建签名者
    const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!operatorPrivateKey) {
      throw new Error("未找到操作员私钥，请在.env文件中设置OPERATOR_PRIVATE_KEY");
    }
    
    // 获取网络配置
    const provider = ethers.provider;
    const operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
    console.log(`使用操作员地址: ${operatorWallet.address}`);
    
    // 连接到TradingManager合约
    const tradingManagerAddress = "0xFf658343244c0475b9305859F1b7CDAB9784762f";
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = TradingManager.attach(tradingManagerAddress).connect(operatorWallet);
    
    // 获取代币合约地址
    const propertyTokenAddress = "0x2fdd5298ebcf286431b05fcd4ba925317fff3d74"; // 从错误信息中获取
    
    // 创建卖单参数 - 确保金额满足最小要求
    const amount = 10; // 10个代币，直接用整数
    const price = 100; // 100单位价格，直接用整数
    
    console.log("创建卖单参数:");
    console.log(`- 代币地址: ${propertyTokenAddress}`);
    console.log(`- 数量: ${amount} 份`);
    console.log(`- 价格: ${price} 单位`);
    
    // 创建卖单
    console.log("\n发送交易...");
    const tx = await tradingManager.createSellOrder(
      propertyTokenAddress,
      amount,
      price
    );
    
    console.log(`交易已发送，等待确认... 交易哈希: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`交易已确认，区块号: ${receipt.blockNumber}`);
    
    // 输出成功信息
    console.log("✅ 卖单创建成功!");
    
  } catch (error) {
    console.error("创建卖单失败:", error);
    // 输出更详细的错误信息
    if (error.reason) {
      console.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
      console.error(`错误数据: ${error.data}`);
    }
    if (error.transaction) {
      console.error(`交易内容:`, error.transaction);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 