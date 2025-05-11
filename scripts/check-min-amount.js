const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  try {
    console.log("开始检查最小交易金额...");
    
    // 设置网络连接
    const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'http://localhost:8545');
    const wallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
    
    // 获取TradingManager合约
    const tradingManagerAddress = "0xFf658343244c0475b9305859F1b7CDAB9784762f";
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = TradingManager.attach(tradingManagerAddress).connect(wallet);
    
    // 检查最小交易金额
    const minTradeAmount = await tradingManager.getMinTradeAmount();
    console.log(`合约设置的最小交易金额: ${minTradeAmount} 份`);
    
    // 我们在脚本中传入的值
    const ourAmount = 10;
    console.log(`我们传入的交易金额: ${ourAmount} 份`);
    
    // 检查是否满足最小交易要求
    if (ourAmount >= minTradeAmount) {
      console.log("✅ 我们的金额满足最小交易要求");
    } else {
      console.log("❌ 我们的金额低于最小交易要求");
      
      // 计算推荐金额
      const recommendedAmount = minTradeAmount;
      console.log(`建议使用的最小金额: ${recommendedAmount} 份`);
    }
    
    // 检查其他可能的限制
    // 获取合约的最大交易限额
    const maxTradeAmount = await tradingManager.getMaxTradeAmount();
    console.log(`最大交易金额: ${maxTradeAmount} 份`);
    
    // 检查冷却期
    const cooldownPeriod = await tradingManager.getCooldownPeriod();
    console.log(`交易冷却期: ${cooldownPeriod} 秒`);
    
    // 检查交易费率
    const feeRate = await tradingManager.feeRate();
    console.log(`交易费率: ${Number(feeRate) / 100}%`);
    
    // 检查价格设置
    console.log("\n检查价格参数:");
    const ourPrice = 100;
    console.log(`我们设置的价格: ${ourPrice} 份`);
    
  } catch (error) {
    console.error("检查过程中出错:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 