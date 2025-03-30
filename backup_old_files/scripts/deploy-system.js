/**
 * ============================================================================
 * 新架构部署示例
 * ============================================================================
 * 
 * 下面代码展示如何使用新的三层部署架构进行部署
 * 这段代码被注释，仅作为示例，可以在将来替换旧部署逻辑
 */

/*
const { 
  SystemDeployer, 
  DEPLOYMENT_STRATEGIES 
} = require('../shared/utils');

async function deploySystemWithNewArchitecture(force = false) {
  console.log('使用新架构部署系统...');
  
  // 加载环境变量
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
  const validatorPrivateKey = process.env.VALIDATOR_PRIVATE_KEY;
  const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
  
  // 获取网络
  const network = await ethers.provider.getNetwork();
  
  // 创建部署配置
  const deployConfig = {
    strategy: DEPLOYMENT_STRATEGIES.UPGRADEABLE,
    force: force,
    network: network.name,
    
    // 角色配置
    roles: {
      ADMIN_ROLE: process.env.ADMIN_ADDRESS,
      OPERATOR_ROLE: process.env.OPERATOR_ADDRESS,
      VALIDATOR_ROLE: process.env.VALIDATOR_ADDRESS,
      TREASURY_ROLE: process.env.TREASURY_ADDRESS
    }
  };
  
  // 创建系统部署器
  const deployer = new SystemDeployer(deployConfig);
  
  // 部署系统
  const result = await deployer.deploySystem();
  
  if (result.success) {
    console.log('系统部署成功!');
    console.log('已部署的合约:');
    Object.entries(result.contractAddresses).forEach(([name, address]) => {
      console.log(`  ${name}: ${address}`);
    });
    return result.contractAddresses;
  } else {
    console.error('系统部署失败:', result.error.message);
    return null;
  }
}
*/

// 原主函数后添加以下注释
/*
 * 注意: 此部署脚本使用旧版部署工具。建议使用新的部署架构，详见:
 * - scripts/deploy-with-new-architecture.js
 * - shared/utils/DEPLOYMENT_ARCHITECTURE.md
 */ 