const { ethers } = require("hardhat");
require('dotenv').config();

// 常量定义
const TEST_PROPERTY_ID = "PROP-" + Date.now();
const TEST_PROPERTY_NAME = "测试房产";
const TEST_PROPERTY_SYMBOL = "TKO";
const TEST_PROPERTY_COUNTRY = "JP";
const TEST_PROPERTY_METADATA_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
const TEST_PROPERTY_INITIAL_SUPPLY = ethers.parseUnits("10000", 18);  // 1万代币
const TEST_PROPERTY_TOKEN_PRICE = ethers.parseUnits("100", 18);  // 每代币100 USDT

// 日志工具
const log = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.log(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  step: (message) => console.log(`\n[STEP ${message}]`),
  balance: (label, amount) => console.log(`[BALANCE] ${label}: ${amount}`)
};

// 格式化数量
function formatAmount(amount, decimals = 18) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(1);
}

// 主函数
async function main() {
  try {
    // 初始化
    log.info("开始房产代币化投资者流程测试...");
    
    // 使用操作员私钥创建签名者
    const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!operatorPrivateKey) {
      throw new Error("未找到操作员私钥，请在.env文件中设置OPERATOR_PRIVATE_KEY");
    }

    // 使用投资者私钥创建签名者
    const investorPrivateKey = process.env.INVESTOR_PRIVATE_KEY || operatorPrivateKey;
    
    // 获取提供者
    const provider = ethers.provider;
    const operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
    const investorWallet = new ethers.Wallet(investorPrivateKey, provider);
    
    log.info(`操作员地址: ${operatorWallet.address}`);
    log.info(`投资者地址: ${investorWallet.address}`);
    
    // 加载合约
    log.step("1】 加载合约");
    const facadeAddress = process.env.CONTRACT_REALESTATEFACADE_ADDRESS || "0xa8fcCF4D0e2f2c4451123fF2F9ddFc9be465Fa1d";
    if (!facadeAddress) {
      throw new Error("未找到Facade合约地址，请在.env文件中设置CONTRACT_REALESTATEFACADE_ADDRESS");
    }
    
    const facadeABI = require("../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json").abi;
    const facadeContract = new ethers.Contract(facadeAddress, facadeABI, operatorWallet);
    
    const tradingManagerAddress = process.env.TRADING_MANAGER_ADDRESS || "0xFf658343244c0475b9305859F1b7CDAB9784762f";
    const tradingManagerABI = require("../artifacts/contracts/TradingManager.sol/TradingManager.json").abi;
    const tradingManagerContract = new ethers.Contract(tradingManagerAddress, tradingManagerABI, operatorWallet);
    
    // 状态对象，用于跟踪测试过程中的重要变量
    const state = {
      propertyId: TEST_PROPERTY_ID,
      propertyTokenAddress: "",
      tokenSymbol: TEST_PROPERTY_SYMBOL,
      tokenDecimals: 18,
      isTestMode: true
    };
    
    // 步骤2: 注册房产
    log.step("2】 注册房产");
    try {
      const tx = await facadeContract.registerProperty(
        state.propertyId,
        TEST_PROPERTY_COUNTRY,
        TEST_PROPERTY_METADATA_URI,
        TEST_PROPERTY_INITIAL_SUPPLY,
        TEST_PROPERTY_NAME,
        TEST_PROPERTY_SYMBOL
      );
      
      log.info(`注册房产交易已发送，等待确认... 交易哈希: ${tx.hash}`);
      await tx.wait();
      
      // 获取房产代币地址
      const propertyInfo = await facadeContract.getPropertyInfo(state.propertyId);
      state.propertyTokenAddress = propertyInfo[5]; // 代币地址在第6个位置
      
      log.info(`房产代币地址: ${state.propertyTokenAddress}`);
      log.success("房产注册成功");
    } catch (error) {
      log.error(`注册房产失败: ${error.message}`);
      // 继续执行，使用已知的代币地址
      state.propertyTokenAddress = "0x2fdd5298ebcf286431b05fcd4ba925317fff3d74";
      log.info(`使用已知的房产代币地址: ${state.propertyTokenAddress}`);
    }
    
    // 步骤3: 创建卖单
    log.step("3】 创建卖单");
    try {
      // 使用成功的卖单创建代码
      const amount = ethers.parseUnits("10", 18); // 10个代币
      const price = ethers.parseUnits("100", 18); // 100单位价格
      
      log.info("创建卖单参数:");
      log.info(`- 代币地址: ${state.propertyTokenAddress}`);
      log.info(`- 数量: ${ethers.formatUnits(amount, 18)} ${state.tokenSymbol}`);
      log.info(`- 价格: ${ethers.formatUnits(price, 18)} USDT`);
      
      const tx = await tradingManagerContract.createSellOrder(
        state.propertyTokenAddress,
        amount,
        price
      );
      
      log.info(`交易已发送，等待确认... 交易哈希: ${tx.hash}`);
      const receipt = await tx.wait();
      log.info(`交易已确认，区块号: ${receipt.blockNumber}`);
      log.success("卖单创建成功!");
    } catch (error) {
      log.error(`创建卖单失败: ${error.message}`);
      if (error.data) {
        log.error(`错误数据: ${error.data}`);
      }
    }
    
    // 步骤4: 投资者购买代币
    log.step("4】 投资者购买代币");
    
    log.info("完成测试流程");
    
  } catch (error) {
    log.error(`测试过程中出现错误: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 