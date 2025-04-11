/**
 * 修复Facade合约权限问题
 * 给现有部署的Facade合约授予所有必要的角色权限
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 修复Facade合约权限 =====');
    
    // 1. 连接到本地网络
    console.log('连接到本地区块链...');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    
    // 2. 加载管理员钱包
    console.log('加载管理员钱包...');
    const adminPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat #0
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    console.log(`管理员钱包地址: ${adminWallet.address}`);
    
    // 3. 获取合约地址
    console.log('获取合约地址...');
    const deploymentReports = path.join(__dirname, '../../deployment-reports');
    const files = fs.readdirSync(deploymentReports)
      .filter(file => file.startsWith('localhost-') && file.endsWith('.md'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('-')[1].split('.')[0]);
        const timestampB = parseInt(b.split('-')[1].split('.')[0]);
        return timestampB - timestampA;
      });
    
    if (files.length === 0) {
      throw new Error('未找到部署报告');
    }
    
    console.log(`找到最新部署报告: ${files[0]}`);
    const reportPath = path.join(deploymentReports, files[0]);
    const latestReport = fs.readFileSync(reportPath, 'utf8');
    
    // 从部署报告中提取合约地址
    const systemMatch = latestReport.match(/RealEstateSystem\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const facadeMatch = latestReport.match(/RealEstateFacade\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    
    if (!systemMatch || !facadeMatch) {
      throw new Error('未在部署报告中找到必要的合约地址');
    }
    
    const systemAddress = systemMatch[1];
    const facadeAddress = facadeMatch[1];
    console.log(`系统合约地址: ${systemAddress}`);
    console.log(`门面合约地址: ${facadeAddress}`);
    
    // 4. 加载合约ABI
    console.log('加载系统合约ABI...');
    const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const systemAbi = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8')).abi;
    
    // 5. 创建合约实例
    const systemContract = new ethers.Contract(systemAddress, systemAbi, adminWallet);
    
    // 6. 硬编码角色哈希值
    const ROLES = {
      ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
      MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
      OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
    };
    
    // 7. 检查当前权限状态
    console.log('检查当前Facade权限状态...');
    const facadeHasAdmin = await systemContract.hasRole(ROLES.ADMIN_ROLE, facadeAddress);
    const facadeHasManager = await systemContract.hasRole(ROLES.MANAGER_ROLE, facadeAddress);
    const facadeHasOperator = await systemContract.hasRole(ROLES.OPERATOR_ROLE, facadeAddress);
    
    console.log(`Facade合约当前权限状态:`);
    console.log(`- ADMIN_ROLE: ${facadeHasAdmin ? "已有" : "缺失"}`);
    console.log(`- MANAGER_ROLE: ${facadeHasManager ? "已有" : "缺失"}`);
    console.log(`- OPERATOR_ROLE: ${facadeHasOperator ? "已有" : "缺失"}`);
    
    // 8. 确认管理员有权限授予角色
    const adminHasAdminRole = await systemContract.hasRole(ROLES.ADMIN_ROLE, adminWallet.address);
    if (!adminHasAdminRole) {
      console.error(`错误: 管理员账户 ${adminWallet.address} 缺少 ADMIN_ROLE，无法授予权限`);
      console.log('请使用具有 ADMIN_ROLE 的账户运行此脚本');
      process.exit(1);
    }
    
    // 9. 授予缺失的权限
    console.log('\n开始授予缺失的权限...');
    
    // 授予 ADMIN_ROLE
    if (!facadeHasAdmin) {
      console.log('正在授予 ADMIN_ROLE...');
      const tx1 = await systemContract.grantRole(ROLES.ADMIN_ROLE, facadeAddress);
      await tx1.wait();
      console.log('✅ ADMIN_ROLE 授予成功');
    }
    
    // 授予 MANAGER_ROLE
    if (!facadeHasManager) {
      console.log('正在授予 MANAGER_ROLE...');
      const tx2 = await systemContract.grantRole(ROLES.MANAGER_ROLE, facadeAddress);
      await tx2.wait();
      console.log('✅ MANAGER_ROLE 授予成功');
    }
    
    // 授予 OPERATOR_ROLE
    if (!facadeHasOperator) {
      console.log('正在授予 OPERATOR_ROLE...');
      const tx3 = await systemContract.grantRole(ROLES.OPERATOR_ROLE, facadeAddress);
      await tx3.wait();
      console.log('✅ OPERATOR_ROLE 授予成功');
    }
    
    // 10. 确认Facade现在是授权合约
    const isAuthorized = await systemContract.authorizedContracts(facadeAddress);
    if (!isAuthorized) {
      console.log('正在将Facade添加为授权合约...');
      const tx4 = await systemContract.setContractAuthorization(facadeAddress, true);
      await tx4.wait();
      console.log('✅ Facade已添加为授权合约');
    } else {
      console.log('Facade已经是授权合约');
    }
    
    // 11. 验证最终权限状态
    console.log('\n验证最终权限状态...');
    const finalFacadeHasAdmin = await systemContract.hasRole(ROLES.ADMIN_ROLE, facadeAddress);
    const finalFacadeHasManager = await systemContract.hasRole(ROLES.MANAGER_ROLE, facadeAddress);
    const finalFacadeHasOperator = await systemContract.hasRole(ROLES.OPERATOR_ROLE, facadeAddress);
    const finalIsAuthorized = await systemContract.authorizedContracts(facadeAddress);
    
    console.log(`Facade合约最终权限状态:`);
    console.log(`- ADMIN_ROLE: ${finalFacadeHasAdmin ? "已有" : "缺失"}`);
    console.log(`- MANAGER_ROLE: ${finalFacadeHasManager ? "已有" : "缺失"}`);
    console.log(`- OPERATOR_ROLE: ${finalFacadeHasOperator ? "已有" : "缺失"}`);
    console.log(`- 授权合约: ${finalIsAuthorized ? "已授权" : "未授权"}`);
    
    if (finalFacadeHasAdmin && finalFacadeHasManager && finalFacadeHasOperator && finalIsAuthorized) {
      console.log('\n🎉 权限修复成功！Facade合约现在拥有所有必要的权限');
      console.log('现在您应该能够正常调用updatePropertyStatus方法了');
    } else {
      console.error('\n❌ 权限修复失败，请检查错误信息');
    }
    
  } catch (error) {
    console.error('脚本执行错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main()
  .then(() => {
    console.log('脚本执行完成');
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }); 