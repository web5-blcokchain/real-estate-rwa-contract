const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// 部署记录文件路径
const DEPLOYMENTS_PATH = path.join(__dirname, "../../deployments.json");

// 读取部署记录
function readDeployments() {
  try {
    if (fs.existsSync(DEPLOYMENTS_PATH)) {
      return JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH));
    }
  } catch (error) {
    console.error("读取部署记录失败:", error);
  }
  return {};
}

// 保存部署记录
function saveDeployments(deployments) {
  try {
    fs.writeFileSync(
      DEPLOYMENTS_PATH,
      JSON.stringify(deployments, null, 2)
    );
    console.log("部署记录已保存到:", DEPLOYMENTS_PATH);
  } catch (error) {
    console.error("保存部署记录失败:", error);
  }
}

// 部署可升级合约
async function deployUpgradeable(contractName, args = [], initializerName = "initialize") {
  console.log(`开始部署 ${contractName}...`);
  
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await upgrades.deployProxy(Contract, args, {
    initializer: initializerName,
  });
  
  await contract.deployed();
  console.log(`${contractName} 已部署到:`, contract.address);
  
  return contract;
}

// 获取合约实例
async function getContract(contractName, address) {
  return await ethers.getContractAt(contractName, address);
}

// 验证合约
async function verifyContract(address, constructorArgs = []) {
  try {
    console.log(`验证合约: ${address}`);
    const { run } = require("hardhat"); // 在函数内部导入run，避免全局导入可能的问题
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`合约验证成功: ${address}`);
  } catch (error) {
    console.error(`合约验证失败: ${address}`, error.message);
  }
}

// 获取环境变量，带默认值
function getEnv(key, defaultValue = "") {
  return process.env[key] || defaultValue;
}

// 获取网络配置
function getNetworkConfig() {
  // 使用与hardhat.config.js一致的网络名称
  const network = getEnv("DEPLOY_NETWORK", "hardhat");
  
  // 验证网络名称是否有效
  const validNetworks = ["hardhat", "bsc_mainnet", "bsc_testnet"];
  if (!validNetworks.includes(network)) {
    console.warn(`警告: 不支持的网络名称 "${network}"，有效的网络名称: ${validNetworks.join(", ")}`);
  }
  
  console.log(`部署网络: ${network}`);
  return network;
}

// 获取角色常量
function getRoles() {
  return {
    SUPER_ADMIN: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPER_ADMIN")),
    PROPERTY_MANAGER: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPERTY_MANAGER")),
    FEE_COLLECTOR: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FEE_COLLECTOR")),
  };
}

module.exports = {
  readDeployments,
  saveDeployments,
  deployUpgradeable,
  getContract,
  verifyContract,
  getEnv,
  getNetworkConfig,
  getRoles,
};