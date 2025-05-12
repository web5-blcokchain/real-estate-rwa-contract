const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置参数
const WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PROPERTY_TOKEN_ADDRESS = "0xAbB608121Fd652F112827724B28a61e09f2dcDf4";
const PROPERTY_ID = 6; // 资产ID，当前未用到，仅做标记

// 加载 PropertyToken ABI
function loadAbiFromArtifacts(contractName) {
  try {
    const artifactPath = path.join(__dirname, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    return artifact.abi;
  } catch (error) {
    console.error(`[ERROR] 加载 ${contractName} ABI失败: ${error.message}`);
    return null;
  }
}

async function main() {
  // 连接 provider
  const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'http://localhost:8545');

  // 加载 PropertyToken 合约
  const abi = loadAbiFromArtifacts('PropertyToken');
  if (!abi) {
    console.error('[ERROR] 未能加载 PropertyToken ABI');
    return;
  }
  const propertyTokenContract = new ethers.Contract(PROPERTY_TOKEN_ADDRESS, abi, provider);

  // 查询余额
  const balance = await propertyTokenContract.balanceOf(WALLET_ADDRESS);
  const totalSupply = await propertyTokenContract.totalSupply();
  const decimals = await propertyTokenContract.decimals();
  const symbol = await propertyTokenContract.symbol();

  console.log(`[INFO] 钱包地址: ${WALLET_ADDRESS}`);
  console.log(`[INFO] 资产合约地址: ${PROPERTY_TOKEN_ADDRESS}`);
  console.log(`[INFO] 资产ID: ${PROPERTY_ID}`);
  console.log(`[INFO] 资产总供应量: ${totalSupply}`);
  console.log(`[BALANCE] ${symbol}: ${balance}`);
}

main().catch(err => {
  console.error('[ERROR]', err);
});
