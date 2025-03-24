/**
 * 环境变量验证脚本
 * 用于检查部署前环境变量是否正确设置
 */
require("dotenv").config();
const { logger } = require("./logger");

/**
 * 验证环境变量
 * @param {boolean} strict 是否严格验证（如为false，则只警告不报错）
 * @returns {boolean} 验证是否通过
 */
function validateEnv(strict = true) {
  const log = logger.info.bind(logger);
  const warn = logger.warn.bind(logger);
  const error = strict ? logger.error.bind(logger) : warn;
  
  log("验证环境变量...");
  
  // 必需的环境变量
  const requiredVars = [
    "PRIVATE_KEY"
  ];
  
  // 推荐的环境变量
  const recommendedVars = [
    "MAINNET_RPC_URL",
    "TESTNET_RPC_URL",
    "BSCSCAN_API_KEY"
  ];
  
  // 检查必需的环境变量
  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    error(`缺少必需的环境变量: ${missingVars.join(", ")}`);
    if (strict) return false;
  }
  
  // 检查推荐的环境变量
  const missingRecommended = [];
  for (const varName of recommendedVars) {
    if (!process.env[varName]) {
      missingRecommended.push(varName);
    }
  }
  
  if (missingRecommended.length > 0) {
    warn(`以下推荐的环境变量未设置: ${missingRecommended.join(", ")}`);
    warn('建议设置这些环境变量以确保部署和验证正常进行');
  }
  
  // 验证网络名称
  const network = process.env.DEPLOY_NETWORK || "hardhat";
  const validNetworks = ["hardhat", "localhost", "bsc_mainnet", "bsc_testnet"];
  if (!validNetworks.includes(network)) {
    error(`不支持的网络名称 "${network}"，有效的网络名称: ${validNetworks.join(", ")}`);
    if (strict) return false;
  }
  
  // 验证私钥格式（如果存在）
  const privateKey = process.env.PRIVATE_KEY;
  if (privateKey && !/^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
    error("PRIVATE_KEY 格式不正确");
    if (strict) return false;
  }
  
  // 验证费用设置
  const fees = ["TRADING_FEE", "TOKENIZATION_FEE", "REDEMPTION_FEE", "PLATFORM_FEE", "MAINTENANCE_FEE"];
  for (const fee of fees) {
    if (process.env[fee]) {
      const feeValue = parseInt(process.env[fee]);
      if (isNaN(feeValue) || feeValue < 0 || feeValue > 10000) {
        error(`${fee} 必须是0-10000之间的数字 (当前值: ${process.env[fee]})`);
        if (strict) return false;
      }
    }
  }
  
  log("环境变量验证通过");
  return true;
}

// 向后兼容的函数，与原verify-env.js接口相同
function verifyEnv() {
  return validateEnv(false);
}

// 如果直接运行此脚本
if (require.main === module) {
  const isValid = validateEnv();
  process.exit(isValid ? 0 : 1);
} else {
  // 作为模块导出
  module.exports = {
    validateEnv,
    verifyEnv
  };
}