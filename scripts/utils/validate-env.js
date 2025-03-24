/**
 * 环境变量验证脚本
 * 用于检查部署前环境变量是否正确设置
 */
require("dotenv").config();

function validateEnv() {
  console.log("验证环境变量...");
  
  // 必需的环境变量
  const requiredVars = [
    "PRIVATE_KEY",
    "BSC_MAINNET_RPC",
    "BSC_TESTNET_RPC"
  ];
  
  // 检查必需的环境变量
  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error(`错误: 缺少必需的环境变量: ${missingVars.join(", ")}`);
    return false;
  }
  
  // 验证网络名称
  const network = process.env.DEPLOY_NETWORK || "hardhat";
  const validNetworks = ["hardhat", "bsc_mainnet", "bsc_testnet"];
  if (!validNetworks.includes(network)) {
    console.error(`错误: 不支持的网络名称 "${network}"，有效的网络名称: ${validNetworks.join(", ")}`);
    return false;
  }
  
  // 验证私钥格式
  const privateKey = process.env.PRIVATE_KEY;
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("错误: PRIVATE_KEY 格式不正确");
    return false;
  }
  
  // 验证费用设置
  const fees = ["TRADING_FEE", "TOKENIZATION_FEE", "REDEMPTION_FEE", "PLATFORM_FEE"];
  for (const fee of fees) {
    const feeValue = parseInt(process.env[fee] || "0");
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 10000) {
      console.error(`错误: ${fee} 必须是0-10000之间的数字 (当前值: ${process.env[fee]})`);
      return false;
    }
  }
  
  console.log("环境变量验证通过");
  return true;
}

// 如果直接运行此脚本
if (require.main === module) {
  const isValid = validateEnv();
  process.exit(isValid ? 0 : 1);
} else {
  // 作为模块导出
  module.exports = validateEnv;
}