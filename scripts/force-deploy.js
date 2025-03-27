/**
 * 强制部署脚本
 * 绕过部署状态检查，强制重新部署所有合约
 */
require('dotenv').config();
const { ethers } = require('hardhat');
const { DeploymentStrategy } = require('../shared/config/deployment');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');
const {
  deployLibraries,
  deployUpgradeableContract,
  saveDeploymentRecord
} = require('../shared/utils/deployment-core');

async function main() {
  try {
    console.log("=== 强制部署合约 ===");
    
    // 获取部署账户
    const [signer] = await ethers.getSigners();
    console.log(`部署账户: ${signer.address}`);
    
    // 获取账户余额
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`账户余额: ${ethers.formatEther(balance)} ETH`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${network.chainId}`;
    console.log(`部署网络: ${networkName} (Chain ID: ${network.chainId})`);
    
    // 部署策略
    const strategy = process.env.DEPLOY_STRATEGY || DeploymentStrategy.UPGRADEABLE;
    console.log(`部署策略: ${strategy}`);
    
    // 部署库合约前预估gas使用量
    console.log("\n=== 预估库合约部署gas使用量 ===");
    const SystemDeployerLib1 = await ethers.getContractFactory('SystemDeployerLib1');
    const SystemDeployerLib2 = await ethers.getContractFactory('SystemDeployerLib2');
    
    try {
      const lib1DeployTx = await SystemDeployerLib1.getDeployTransaction();
      const lib1GasEstimate = await signer.estimateGas(lib1DeployTx);
      const gasPrice = await ethers.provider.getFeeData().then(data => data.gasPrice || ethers.utils.parseUnits('50', 'gwei'));
      
      // 计算ETH消耗量
      const lib1GasEth = ethers.formatEther(lib1GasEstimate * gasPrice);
      console.log(`SystemDeployerLib1预估gas使用量: ${lib1GasEstimate.toString()} gas单位`);
      console.log(`预计消耗ETH: ${lib1GasEth} ETH (约 $${(parseFloat(lib1GasEth) * 3500).toFixed(2)} USD)`);
      
      const lib2DeployTx = await SystemDeployerLib2.getDeployTransaction();
      const lib2GasEstimate = await signer.estimateGas(lib2DeployTx);
      
      // 计算ETH消耗量
      const lib2GasEth = ethers.formatEther(lib2GasEstimate * gasPrice);
      console.log(`SystemDeployerLib2预估gas使用量: ${lib2GasEstimate.toString()} gas单位`);
      console.log(`预计消耗ETH: ${lib2GasEth} ETH (约 $${(parseFloat(lib2GasEth) * 3500).toFixed(2)} USD)`);
      
      const totalGasEth = parseFloat(lib1GasEth) + parseFloat(lib2GasEth);
      console.log(`总计预估消耗: ${totalGasEth.toFixed(6)} ETH (约 $${(totalGasEth * 3500).toFixed(2)} USD)`);
      
      console.log('警告: 库合约非常大，可能需要大量gas进行部署');
      console.log('建议确保本地节点配置了足够高的区块gas限制');
      
      // 询问用户是否继续
      if (!process.env.SKIP_GAS_CONFIRMATION) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        await new Promise((resolve) => {
          readline.question('是否继续部署? (y/N): ', (answer) => {
            if (answer.toLowerCase() !== 'y') {
              console.log('部署已取消');
              process.exit(0);
            }
            readline.close();
            resolve();
          });
        });
      }
    } catch (error) {
      console.log('预估gas失败，这可能是因为合约太大。将继续尝试部署。');
      console.log(`错误详情: ${error.message}`);
    }
    
    // 部署库合约
    console.log("\n=== 部署库合约 ===");
    const libraries = await deployLibraries(signer, {
      skipGasEstimation: true
    });
    
    // 部署主合约
    console.log("\n=== 部署主合约 ===");
    const deployedContracts = {};
    const implementations = {};
    
    // 定义合约顺序
    const contractOrder = [
      'RoleManager',
      'FeeManager',
      'PropertyRegistry',
      'RentDistributor',
      'TokenFactory',
      'RedemptionManager',
      'Marketplace',
      'TokenHolderQuery',
      'RealEstateSystem'
    ];
    
    // 部署 RoleManager
    const roleManagerResult = await deployUpgradeableContract('RoleManager', []);
    deployedContracts['RoleManager'] = roleManagerResult.proxyAddress;
    implementations['RoleManager'] = roleManagerResult.implementationAddress;
    
    // 部署 FeeManager
    const feeManagerResult = await deployUpgradeableContract(
      'FeeManager',
      [deployedContracts['RoleManager']]
    );
    deployedContracts['FeeManager'] = feeManagerResult.proxyAddress;
    implementations['FeeManager'] = feeManagerResult.implementationAddress;
    
    // 部署 PropertyRegistry
    const propertyRegistryResult = await deployUpgradeableContract(
      'PropertyRegistry',
      [deployedContracts['RoleManager']]
    );
    deployedContracts['PropertyRegistry'] = propertyRegistryResult.proxyAddress;
    implementations['PropertyRegistry'] = propertyRegistryResult.implementationAddress;
    
    // 部署 RentDistributor
    const rentDistributorResult = await deployUpgradeableContract(
      'RentDistributor',
      [
        deployedContracts['RoleManager'],
        deployedContracts['FeeManager']
      ]
    );
    deployedContracts['RentDistributor'] = rentDistributorResult.proxyAddress;
    implementations['RentDistributor'] = rentDistributorResult.implementationAddress;
    
    // 部署 TokenFactory
    const tokenFactoryResult = await deployUpgradeableContract(
      'TokenFactory',
      [
        deployedContracts['RoleManager'],
        deployedContracts['PropertyRegistry'],
        '0x0000000000000000000000000000000000000000', // tokenImplementation
        deployedContracts['RentDistributor']
      ]
    );
    deployedContracts['TokenFactory'] = tokenFactoryResult.proxyAddress;
    implementations['TokenFactory'] = tokenFactoryResult.implementationAddress;
    
    // 部署 RedemptionManager
    const redemptionManagerResult = await deployUpgradeableContract(
      'RedemptionManager',
      [
        deployedContracts['RoleManager'],
        deployedContracts['PropertyRegistry'],
        deployedContracts['TokenFactory']
      ]
    );
    deployedContracts['RedemptionManager'] = redemptionManagerResult.proxyAddress;
    implementations['RedemptionManager'] = redemptionManagerResult.implementationAddress;
    
    // 部署 Marketplace
    const marketplaceResult = await deployUpgradeableContract(
      'Marketplace',
      [
        deployedContracts['RoleManager'],
        deployedContracts['FeeManager']
      ]
    );
    deployedContracts['Marketplace'] = marketplaceResult.proxyAddress;
    implementations['Marketplace'] = marketplaceResult.implementationAddress;
    
    // 部署 TokenHolderQuery
    const tokenHolderQueryResult = await deployUpgradeableContract(
      'TokenHolderQuery',
      [deployedContracts['RoleManager']]
    );
    deployedContracts['TokenHolderQuery'] = tokenHolderQueryResult.proxyAddress;
    implementations['TokenHolderQuery'] = tokenHolderQueryResult.implementationAddress;
    
    // 部署 RealEstateSystem
    const realEstateSystemResult = await deployUpgradeableContract(
      'RealEstateSystem',
      [
        deployedContracts['RoleManager'],
        deployedContracts['FeeManager'],
        deployedContracts['PropertyRegistry'],
        deployedContracts['TokenFactory'],
        deployedContracts['RedemptionManager'],
        deployedContracts['RentDistributor'],
        deployedContracts['Marketplace'],
        deployedContracts['TokenHolderQuery']
      ]
    );
    deployedContracts['RealEstateSystem'] = realEstateSystemResult.proxyAddress;
    implementations['RealEstateSystem'] = realEstateSystemResult.implementationAddress;
    
    // 保存部署记录
    const timestamp = new Date().toISOString();
    const deploymentRecord = {
      timestamp,
      network: {
        name: networkName,
        chainId: network.chainId.toString()
      },
      strategy,
      deployer: signer.address,
      contracts: deployedContracts,
      libraries,
      implementations,
      forceDeployed: true
    };
    
    await saveDeploymentRecord(deploymentRecord, networkName, true);
    
    console.log("\n=== 部署完成 ===");
    console.log("合约地址:");
    for (const [name, address] of Object.entries(deployedContracts)) {
      console.log(`${name}: ${address}`);
    }
    
    return deployedContracts;
  } catch (error) {
    console.error('部署失败:', error);
    throw error;
  } finally {
    closeLoggers();
  }
}

// 执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 