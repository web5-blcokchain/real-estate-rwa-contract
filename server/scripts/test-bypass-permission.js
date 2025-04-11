/**
 * 测试绕过权限检查
 * 通过直接调用底层合约来测试更新房产状态
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 直接调用底层合约测试 =====');
    
    // 1. 连接到本地网络
    console.log('连接到本地区块链...');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    const blockNumber = await provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);
    
    // 2. 加载所有钱包 - 使用硬编码的私钥
    console.log('加载所有测试钱包...');
    
    // 硬编码测试账户私钥
    const accounts = [
      {
        role: 'admin',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // #0
      },
      {
        role: 'manager',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' // #1
      },
      {
        role: 'operator',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' // #2
      }
    ];
    
    // 创建所有钱包实例
    const wallets = {};
    for (const account of accounts) {
      wallets[account.role] = new ethers.Wallet(account.privateKey, provider);
      console.log(`${account.role} 钱包地址: ${wallets[account.role].address}`);
    }
    
    // 3. 获取最新部署报告
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
    
    // 4. 提取所有合约地址
    const extractAddress = (contractName) => {
      const match = latestReport.match(new RegExp(`${contractName}\\s*\\n\\s*-\\s*地址:\\s*(0x[a-fA-F0-9]{40})`));
      if (!match) throw new Error(`未找到 ${contractName} 合约地址`);
      return match[1];
    };
    
    const addresses = {
      system: extractAddress('RealEstateSystem'),
      facade: extractAddress('RealEstateFacade'),
      propertyManager: extractAddress('PropertyManager')
    };
    
    console.log('提取到的合约地址:');
    console.log(JSON.stringify(addresses, null, 2));
    
    // 5. 加载合约 ABI
    console.log('加载合约 ABI...');
    const loadAbi = (contractName) => {
      const abiPath = path.join(__dirname, `../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
      return JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
    };
    
    const abis = {
      system: loadAbi('RealEstateSystem'),
      facade: loadAbi('RealEstateFacade'),
      propertyManager: loadAbi('PropertyManager')
    };
    
    // 6. 创建合约实例
    const contracts = {};
    for (const [name, address] of Object.entries(addresses)) {
      // 为每种角色创建合约实例
      contracts[name] = {};
      for (const [role, wallet] of Object.entries(wallets)) {
        contracts[name][role] = new ethers.Contract(address, abis[name], wallet);
      }
    }
    
    // 7. 确保所有角色都有正确的权限
    console.log('检查和设置角色权限...');
    
    // 硬编码角色哈希值
    const ROLES = {
      ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
      MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
      OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
    };
    
    // 检查每个钱包的权限
    const roleChecks = [];
    for (const [role, wallet] of Object.entries(wallets)) {
      let roleKey;
      if (role === 'admin') roleKey = 'ADMIN_ROLE';
      else if (role === 'manager') roleKey = 'MANAGER_ROLE';
      else if (role === 'operator') roleKey = 'OPERATOR_ROLE';
      
      if (!roleKey) continue;
      
      const hasRole = await contracts.system.admin.hasRole(ROLES[roleKey], wallet.address);
      console.log(`${role} 是否有 ${roleKey}: ${hasRole}`);
      
      if (!hasRole) {
        roleChecks.push({ role, roleKey, wallet });
      }
    }
    
    // 授予缺失的权限
    if (roleChecks.length > 0) {
      console.log('授予缺失的权限...');
      for (const { role, roleKey, wallet } of roleChecks) {
        console.log(`授予 ${role} ${roleKey} 权限...`);
        const tx = await contracts.system.admin.grantRole(ROLES[roleKey], wallet.address);
        await tx.wait();
        console.log(`已授予 ${role} ${roleKey} 权限`);
      }
    }
    
    // 8. 注册测试房产
    console.log('注册测试房产...');
    const propertyId = `test-prop-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`使用房产ID: ${propertyId}`);
    
    try {
      const registerTx = await contracts.facade.operator.registerPropertyAndCreateToken(
        propertyId,
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
      console.log('尝试继续测试...');
    }
    
    // 9. 尝试直接用不同账户调用底层合约更新房产状态
    console.log('\n尝试直接调用PropertyManager合约更新房产状态...');
    
    // 枚举值: PropertyStatus { NotRegistered = 0, Pending = 1, Approved = 2, Rejected = 3, Delisted = 4 }
    // 使用每个角色尝试更新
    for (const role of ['admin', 'manager', 'operator']) {
      console.log(`\n尝试使用 ${role} 角色更新状态...`);
      
      try {
        // 检查当前状态
        const currentStatus = await contracts.propertyManager[role].getPropertyStatus(propertyId);
        console.log(`当前状态: ${currentStatus}`);
        
        // 直接调用PropertyManager合约
        console.log(`尝试更新状态为2 (Approved)...`);
        const updateTx = await contracts.propertyManager[role].updatePropertyStatus(propertyId, 2);
        
        console.log('更新交易已发送，等待确认...');
        const updateReceipt = await updateTx.wait();
        console.log(`✓ ${role} 角色更新成功! 交易哈希: ${updateReceipt.hash}`);
        
        // 检查更新后的状态
        const newStatus = await contracts.propertyManager[role].getPropertyStatus(propertyId);
        console.log(`更新后的状态: ${newStatus}`);
        
        // 成功后跳出循环
        break;
      } catch (error) {
        console.error(`× ${role} 角色更新失败:`, error.message);
        
        // 打印出错误详情
        if (error.data) {
          console.log(`错误数据: ${error.data}`);
        }
      }
    }
    
    // 10. 最后的解决方案: 使用委托调用(delegatecall)绕过权限
    if (true) {
      console.log('\n最终方案: 使用底层交易直接更新状态...');
      
      try {
        // 获取当前房产的元数据信息
        const propertyData = await contracts.propertyManager.admin.getProperty(propertyId);
        console.log('当前房产数据:', propertyData);
        
        // 使用 admin 钱包获取 PropertyToken 地址
        const tokenAddress = await contracts.propertyManager.admin.getPropertyToken(propertyId);
        console.log(`房产代币地址: ${tokenAddress}`);
        
        // 使用 PropertyManager 合约的 property.status 方法修改状态
        console.log('使用 admin 直接调用底层合约...');
        
        // 直接调用
        const updateTx = await contracts.propertyManager.admin.updatePropertyStatus(propertyId, 2);
        
        console.log('更新交易已发送，等待确认...');
        const updateReceipt = await updateTx.wait();
        console.log(`✓ 最终方案更新成功! 交易哈希: ${updateReceipt.hash}`);
        
        // 检查新状态
        const finalStatus = await contracts.propertyManager.admin.getPropertyStatus(propertyId);
        console.log(`最终状态: ${finalStatus}`);
        
        // 通过 Facade 检查状态
        const facadeStatus = await contracts.facade.admin.getPropertyStatus(propertyId);
        console.log(`通过Facade查询的状态: ${facadeStatus}`);
        
        return true;
      } catch (error) {
        console.error('最终方案也失败了:', error.message);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('测试脚本执行失败:', error);
    return false;
  }
}

// 执行主函数
main()
  .then(result => {
    if (result) {
      console.log('测试完成，成功找到解决方案!');
    } else {
      console.log('测试完成，所有方案均失败!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('测试执行错误:', error);
    process.exit(1);
  }); 