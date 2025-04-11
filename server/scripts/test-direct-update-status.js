/**
 * 直接测试更新房产状态
 * 完全绕过RoleConstants库和控制器层
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 开始直接测试更新房产状态 =====');
    
    // 1. 连接到本地网络
    console.log('连接到本地区块链...');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    const blockNumber = await provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);
    
    // 2. 加载合约和钱包 - 使用硬编码的私钥
    console.log('加载合约和钱包...');
    
    // 为了测试方便，直接使用Hardhat node的默认账户私钥
    const adminPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 默认账户 #0
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    console.log(`管理员钱包地址: ${adminWallet.address}`);
    
    // 获取部署报告中的合约地址
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
    const systemAddressMatch = latestReport.match(/RealEstateSystem\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    const facadeAddressMatch = latestReport.match(/RealEstateFacade\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    
    if (!systemAddressMatch || !facadeAddressMatch) {
      throw new Error('未在部署报告中找到必要的合约地址');
    }
    
    const systemAddress = systemAddressMatch[1];
    const facadeAddress = facadeAddressMatch[1];
    console.log(`系统合约地址: ${systemAddress}`);
    console.log(`门面合约地址: ${facadeAddress}`);
    
    // 3. 初始化合约实例
    console.log('初始化合约实例...');
    const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const facadeAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
    
    const systemArtifact = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8'));
    const facadeArtifact = JSON.parse(fs.readFileSync(facadeAbiPath, 'utf8'));
    
    const systemContract = new ethers.Contract(systemAddress, systemArtifact.abi, adminWallet);
    const facadeContract = new ethers.Contract(facadeAddress, facadeArtifact.abi, adminWallet);
    
    // 4. 硬编码角色哈希值，和RoleConstants库中的一致
    const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
    const MANAGER_ROLE = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08';
    const OPERATOR_ROLE = '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929';
    
    // 5. 检查管理员权限
    console.log('检查角色权限...');
    const adminHasAdminRole = await systemContract.hasRole(ADMIN_ROLE, adminWallet.address);
    console.log(`管理员是否有 ADMIN_ROLE: ${adminHasAdminRole}`);
    
    const adminHasManagerRole = await systemContract.hasRole(MANAGER_ROLE, adminWallet.address);
    console.log(`管理员是否有 MANAGER_ROLE: ${adminHasManagerRole}`);
    
    // 如果管理员没有 MANAGER_ROLE，授予权限
    if (!adminHasManagerRole) {
      console.log('授予管理员 MANAGER_ROLE 权限...');
      const tx = await systemContract.grantRole(MANAGER_ROLE, adminWallet.address);
      await tx.wait();
      console.log('权限授予成功');
      
      // 再次检查
      const hasRoleNow = await systemContract.hasRole(MANAGER_ROLE, adminWallet.address);
      console.log(`授权后再次检查: ${hasRoleNow}`);
    }
    
    // 6. 注册一个新房产
    console.log('注册一个新房产用于测试...');
    const randomId = `test-prop-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`使用房产ID: ${randomId}`);
    
    try {
      const registerTx = await facadeContract.registerPropertyAndCreateToken(
        randomId,
        'Japan',
        'https://example.com/metadata/test',
        ethers.parseEther('1000'),
        'Test Property Token',
        'TPT'
      );
      
      console.log('注册交易已发送，等待确认...');
      const registerReceipt = await registerTx.wait();
      console.log(`注册成功，交易哈希: ${registerReceipt.hash}`);
    } catch (error) {
      console.error('注册房产失败:', error.message);
      // 尝试继续测试，可能已有注册的房产
      console.log('尝试继续测试...');
    }
    
    // 7. 测试更新房产状态
    console.log('\n开始测试更新房产状态...');
    
    // 尝试不同的调试方法
    console.log('在更新前，检查一些潜在的问题...');
    
    // 检查授权合约状态
    const isAuthorized = await systemContract.authorizedContracts(facadeAddress);
    console.log(`门面合约是否授权: ${isAuthorized}`);
    
    if (!isAuthorized) {
      console.log('授权门面合约...');
      const authTx = await systemContract.setContractAuthorization(facadeAddress, true);
      await authTx.wait();
      console.log('门面合约已授权');
    }
    
    // 创建一个直接调用updatePropertyStatus的事务对象
    console.log(`尝试更新房产 ${randomId} 的状态为 ForSale (2)...`);
    
    try {
      const updateTx = await facadeContract.updatePropertyStatus(randomId, 2);
      console.log('更新交易已发送，等待确认...');
      const updateReceipt = await updateTx.wait();
      console.log(`✓ 更新成功，交易哈希: ${updateReceipt.hash}`);
      
      // 获取更新后的状态
      const newStatus = await facadeContract.getPropertyStatus(randomId);
      console.log(`更新后的房产状态: ${newStatus}`);
      
      return true;
    } catch (error) {
      console.error('更新房产状态失败:', error.message);
      
      // 输出更详细的错误信息
      if (error.data) {
        console.log('错误数据:', error.data);
      }
      
      if (error.transaction) {
        console.log('事务信息:', {
          from: error.transaction.from,
          to: error.transaction.to,
          data: error.transaction.data ? error.transaction.data.substring(0, 66) + '...' : 'No data'
        });
      }
      
      // 尝试最后一种方法：使用低级调用
      console.log('\n尝试特殊方法: 直接修改系统状态...');
      try {
        // 先确保系统是激活状态
        const systemStatus = await systemContract.getSystemStatus();
        console.log(`当前系统状态: ${systemStatus}`);
        
        if (systemStatus !== 2) { // 2 = Active
          const statusTx = await systemContract.setSystemStatus(2);
          await statusTx.wait();
          console.log('系统状态已设置为Active');
        }
        
        // 现在尝试再次更新
        console.log('再次尝试更新房产状态...');
        const updateTx = await facadeContract.updatePropertyStatus(randomId, 2);
        const updateReceipt = await updateTx.wait();
        console.log(`✓ 更新成功，交易哈希: ${updateReceipt.hash}`);
        return true;
      } catch (specialError) {
        console.error('特殊方法也失败:', specialError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('测试脚本执行失败:', error);
    return false;
  }
}

// 执行主函数
main()
  .then(result => {
    if (result) {
      console.log('测试完成，全部通过!');
    } else {
      console.log('测试完成，但存在失败项!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('测试执行错误:', error);
    process.exit(1);
  }); 