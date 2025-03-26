/**
 * 合约状态检查脚本
 * 
 * 此脚本用于检查配置的合约地址是否可访问，并获取其基本信息
 * 使用方法: node scripts/check-contracts.js
 */

const { getEnvPath } = require('../../shared/utils/paths');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: getEnvPath() });

const ethers = require('ethers');
const contractABIs = require('../src/contracts');

// 合约列表配置
const contracts = {
  roleManager: process.env.ROLE_MANAGER_ADDRESS,
  feeManager: process.env.FEE_MANAGER_ADDRESS,
  propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS,
  tokenFactory: process.env.TOKEN_FACTORY_ADDRESS,
  marketplace: process.env.MARKETPLACE_ADDRESS,
  rentDistributor: process.env.RENT_DISTRIBUTOR_ADDRESS,
  redemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS,
  tokenHolderQuery: process.env.TOKEN_HOLDER_QUERY_ADDRESS,
  realEstateSystem: process.env.REAL_ESTATE_SYSTEM_ADDRESS
};

// 检查合约状态
async function checkContracts() {
  if (!process.env.ETH_RPC_URL) {
    console.error('错误: ETH_RPC_URL 未配置');
    process.exit(1);
  }

  console.log('\n====================================');
  console.log('       合约状态检查工具');
  console.log('====================================\n');

  try {
    // 创建提供者
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
    
    // 获取网络信息
    const network = await provider.getNetwork();
    console.log(`连接到网络: ${network.name} (chainId: ${network.chainId})`);
    
    // 获取当前块高
    const blockNumber = await provider.getBlockNumber();
    console.log(`当前块高: ${blockNumber}`);
    
    console.log('\n合约状态检查结果:\n');

    // 检查每个合约
    for (const [name, address] of Object.entries(contracts)) {
      if (!address || address === '0x...') {
        console.log(`- ${name}: ❌ 未配置地址`);
        continue;
      }

      try {
        // 检查地址是否有代码
        const code = await provider.getCode(address);
        if (code === '0x') {
          console.log(`- ${name}: ❌ 地址无合约代码 (${address})`);
          continue;
        }

        // 如果有ABI，尝试获取版本
        if (contractABIs[name] && contractABIs[name].includes('VersionUpdated')) {
          try {
            const contract = new ethers.Contract(address, [
              "function version() view returns (uint256)"
            ], provider);
            
            const version = await contract.version();
            console.log(`- ${name}: ✅ 版本 ${version} (${address})`);
          } catch (error) {
            console.log(`- ${name}: ✅ 合约存在，但无法获取版本 (${address})`);
          }
        } else {
          console.log(`- ${name}: ✅ 合约代码存在 (${address})`);
        }
      } catch (error) {
        console.log(`- ${name}: ❌ 检查失败: ${error.message}`);
      }
    }

    console.log('\n检查完成!');
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 执行检查
checkContracts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`未处理的错误: ${error.message}`);
    process.exit(1);
  }); 