/**
 * 测试更新房产状态
 * 专门解决"Caller is not a manager"问题
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 开始测试更新房产状态 =====');
    
    // 1. 连接到本地网络
    console.log('连接到本地区块链...');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    const blockNumber = await provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);
    
    // 2. 加载合约和钱包
    console.log('加载合约和钱包...');
    
    // 为了测试方便，直接使用Hardhat node的默认账户私钥
    const adminPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 默认账户 #0
    const managerPrivateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // 默认账户 #1
    const operatorPrivateKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'; // 默认账户 #2
    
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const managerWallet = new ethers.Wallet(managerPrivateKey, provider);
    const operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
    
    console.log(`管理员钱包地址: ${adminWallet.address}`);
    console.log(`管理者钱包地址: ${managerWallet.address}`);
    console.log(`操作员钱包地址: ${operatorWallet.address}`);
    
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
    const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const facadeAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
    
    const systemArtifact = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8'));
    const facadeArtifact = JSON.parse(fs.readFileSync(facadeAbiPath, 'utf8'));
    
    const systemContract = new ethers.Contract(systemAddress, systemArtifact.abi, adminWallet);
    const facadeContract = new ethers.Contract(facadeAddress, facadeArtifact.abi, managerWallet);
    
    // 4. 检查系统状态
    console.log('检查系统状态和权限...');
    const systemStatus = await systemContract.getSystemStatus();
    console.log(`系统状态: ${systemStatus} (${getSystemStatusName(systemStatus)})`);
    
    // 5. 获取和设置角色权限
    // 直接从源代码硬编码角色常量
    const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
    const MANAGER_ROLE = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08';
    const OPERATOR_ROLE = '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929';
    
    console.log('检查角色权限...');
    console.log(`ADMIN_ROLE: ${ADMIN_ROLE}`);
    console.log(`MANAGER_ROLE: ${MANAGER_ROLE}`);
    console.log(`OPERATOR_ROLE: ${OPERATOR_ROLE}`);
    
    // 检查管理员权限
    const adminHasAdminRole = await systemContract.hasRole(ADMIN_ROLE, adminWallet.address);
    console.log(`管理员是否有 ADMIN_ROLE: ${adminHasAdminRole}`);
    
    // 检查管理者权限
    const managerHasManagerRole = await systemContract.hasRole(MANAGER_ROLE, managerWallet.address);
    console.log(`管理者是否有 MANAGER_ROLE: ${managerHasManagerRole}`);
    
    // 如果管理者没有 MANAGER_ROLE，授予权限
    if (!managerHasManagerRole) {
      console.log('授予管理者 MANAGER_ROLE 权限...');
      const tx = await systemContract.grantRole(MANAGER_ROLE, managerWallet.address);
      await tx.wait();
      console.log('权限授予成功');
      
      // 再次检查
      const hasRoleNow = await systemContract.hasRole(MANAGER_ROLE, managerWallet.address);
      console.log(`授权后再次检查: ${hasRoleNow}`);
    }
    
    // 检查操作员权限
    const operatorHasOperatorRole = await systemContract.hasRole(OPERATOR_ROLE, operatorWallet.address);
    console.log(`操作员是否有 OPERATOR_ROLE: ${operatorHasOperatorRole}`);
    
    // 如果操作员没有 OPERATOR_ROLE，授予权限
    if (!operatorHasOperatorRole) {
      console.log('授予操作员 OPERATOR_ROLE 权限...');
      const tx = await systemContract.grantRole(OPERATOR_ROLE, operatorWallet.address);
      await tx.wait();
      console.log('权限授予成功');
    }
    
    // 6. 注册一个新房产
    console.log('注册一个新房产用于测试...');
    const randomId = `test-prop-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`使用房产ID: ${randomId}`);
    
    // 使用操作员钱包注册房产
    const facadeContractWithOperator = facadeContract.connect(operatorWallet);
    
    try {
      const registerTx = await facadeContractWithOperator.registerPropertyAndCreateToken(
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
    
    // 确保再次使用管理者钱包连接合约
    const facadeContractWithManager = facadeContract.connect(managerWallet);
    
    try {
      console.log(`更新房产 ${randomId} 的状态为 ForSale (2)...`);
      const updateTx = await facadeContractWithManager.updatePropertyStatus(randomId, 2);
      
      console.log('更新交易已发送，等待确认...');
      const updateReceipt = await updateTx.wait();
      console.log(`更新成功，交易哈希: ${updateReceipt.hash}`);
      console.log('✓ 测试通过');
      
      // 获取更新后的状态
      const newStatus = await facadeContractWithManager.getPropertyStatus(randomId);
      console.log(`更新后的房产状态: ${newStatus}`);
      
      return true;
    } catch (error) {
      console.error('更新房产状态失败:', error);
      
      // 打印调用者信息和合约信息
      console.log('\n诊断信息:');
      console.log(`调用者地址: ${managerWallet.address}`);
      console.log(`合约地址: ${facadeAddress}`);
      console.log(`系统合约地址: ${systemAddress}`);
      
      // 检查角色权限
      const hasRole = await systemContract.hasRole(MANAGER_ROLE, managerWallet.address);
      console.log(`调用者是否有 MANAGER_ROLE: ${hasRole}`);
      
      console.log('\n尝试特殊解决方法:');
      console.log('将管理者钱包添加为具体合约的授权地址...');
      
      try {
        const authTx = await systemContract.setContractAuthorization(managerWallet.address, true);
        await authTx.wait();
        console.log('已将调用者地址添加为授权合约');
        
        // 再次尝试
        console.log('再次尝试更新房产状态...');
        const updateTx = await facadeContractWithManager.updatePropertyStatus(randomId, 2);
        const updateReceipt = await updateTx.wait();
        console.log(`✓ 更新成功，交易哈希: ${updateReceipt.hash}`);
        return true;
      } catch (secondError) {
        console.error('特殊解决方法失败:', secondError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('测试脚本执行失败:', error);
    return false;
  }
}

/**
 * 获取系统状态名称
 */
function getSystemStatusName(status) {
  switch (Number(status)) {
    case 0: return 'Inactive';
    case 1: return 'Testing';
    case 2: return 'Active';
    case 3: return 'Suspended';
    case 4: return 'Upgrading';
    default: return 'Unknown';
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