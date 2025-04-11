/**
 * 长期解决方案：修复权限验证系统
 * 本脚本提供两种解决方案：
 * 1. 为Facade合约直接授予MANAGER_ROLE
 * 2. 提议修改validateRole方法，同时检查合约授权
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 长期解决方案：修复权限验证系统 =====');
    
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
    const extractAddress = (contractName) => {
      const match = latestReport.match(new RegExp(`${contractName}\\s*\\n\\s*-\\s*地址:\\s*(0x[a-fA-F0-9]{40})`));
      if (!match) throw new Error(`未找到 ${contractName} 合约地址`);
      return match[1];
    };
    
    const addresses = {
      system: extractAddress('RealEstateSystem'),
      facade: extractAddress('RealEstateFacade')
    };
    
    console.log('提取到的合约地址:');
    console.log(JSON.stringify(addresses, null, 2));
    
    // 4. 加载合约ABI
    console.log('加载合约ABI...');
    const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
    const systemAbi = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8')).abi;
    
    // 5. 创建合约实例
    const systemContract = new ethers.Contract(addresses.system, systemAbi, adminWallet);
    
    // 6. 获取参数：选择解决方案
    const args = process.argv.slice(2);
    const solution = args[0] || 'help';
    
    if (solution === 'help' || !['check', 'grant', 'authorize'].includes(solution)) {
      console.log('\n使用方法: node fix-permission-system.js [check|grant|authorize]\n');
      console.log('解决方案:');
      console.log('check    - 检查当前权限状态');
      console.log('grant    - 为Facade合约授予MANAGER_ROLE');
      console.log('authorize - 授权Facade合约调用');
      process.exit(1);
    }
    
    // 7. 硬编码角色哈希值
    const ROLES = {
      ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
      MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
      OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
    };
    
    // 8. 执行所选解决方案
    if (solution === 'check') {
      // 解决方案1: 检查当前权限状态
      console.log('\n==== 检查当前权限状态 ====');
      
      // 检查Facade是否有各种角色
      const facadeHasAdminRole = await systemContract.hasRole(ROLES.ADMIN_ROLE, addresses.facade);
      const facadeHasManagerRole = await systemContract.hasRole(ROLES.MANAGER_ROLE, addresses.facade);
      const facadeHasOperatorRole = await systemContract.hasRole(ROLES.OPERATOR_ROLE, addresses.facade);
      
      console.log(`Facade合约地址: ${addresses.facade}`);
      console.log(`Facade是否有ADMIN_ROLE: ${facadeHasAdminRole}`);
      console.log(`Facade是否有MANAGER_ROLE: ${facadeHasManagerRole}`);
      console.log(`Facade是否有OPERATOR_ROLE: ${facadeHasOperatorRole}`);
      
      // 检查Facade是否是授权合约
      const facadeIsAuthorized = await systemContract.authorizedContracts(addresses.facade);
      console.log(`Facade是否是授权合约: ${facadeIsAuthorized}`);
      
      // 检查管理员是否有各种角色
      const adminHasAdminRole = await systemContract.hasRole(ROLES.ADMIN_ROLE, adminWallet.address);
      const adminHasManagerRole = await systemContract.hasRole(ROLES.MANAGER_ROLE, adminWallet.address);
      const adminHasOperatorRole = await systemContract.hasRole(ROLES.OPERATOR_ROLE, adminWallet.address);
      
      console.log(`\n管理员地址: ${adminWallet.address}`);
      console.log(`管理员是否有ADMIN_ROLE: ${adminHasAdminRole}`);
      console.log(`管理员是否有MANAGER_ROLE: ${adminHasManagerRole}`);
      console.log(`管理员是否有OPERATOR_ROLE: ${adminHasOperatorRole}`);
      
      // 输出诊断信息
      console.log('\n诊断结果:');
      if (!facadeHasManagerRole) {
        console.log('问题: Facade合约没有MANAGER_ROLE，使用 "grant" 解决方案授予权限');
      }
      
      if (!facadeIsAuthorized) {
        console.log('问题: Facade合约不是授权合约，使用 "authorize" 解决方案添加授权');
      }
      
      if (facadeHasManagerRole && facadeIsAuthorized) {
        console.log('权限看起来已经配置正确');
      }
      
    } else if (solution === 'grant') {
      // 解决方案2: 为Facade合约授予MANAGER_ROLE
      console.log('\n==== 为Facade合约授予MANAGER_ROLE ====');
      
      // 先检查是否已有权限
      const facadeHasManagerRole = await systemContract.hasRole(ROLES.MANAGER_ROLE, addresses.facade);
      
      if (facadeHasManagerRole) {
        console.log('Facade合约已经有MANAGER_ROLE，无需再次授予');
      } else {
        console.log(`向Facade合约 ${addresses.facade} 授予MANAGER_ROLE...`);
        
        try {
          const tx = await systemContract.grantRole(ROLES.MANAGER_ROLE, addresses.facade);
          console.log('授权交易已发送，等待确认...');
          const receipt = await tx.wait();
          console.log(`✅ 授权成功! 交易哈希: ${receipt.hash}`);
          
          // 验证权限是否成功授予
          const hasRoleNow = await systemContract.hasRole(ROLES.MANAGER_ROLE, addresses.facade);
          if (hasRoleNow) {
            console.log('验证成功: Facade合约现在有MANAGER_ROLE');
            
            // 提供代码修改建议
            console.log('\n长期解决方案:');
            console.log('在系统初始化时自动授予Facade合约MANAGER_ROLE:');
            console.log('在RealEstateFacade.initialize()方法中添加:');
            console.log('```solidity');
            console.log('// 确保Facade合约本身有MANAGER_ROLE');
            console.log('if (!system.hasRole(RoleConstants.MANAGER_ROLE(), address(this))) {');
            console.log('    system.grantRole(RoleConstants.MANAGER_ROLE(), address(this));');
            console.log('}');
            console.log('```');
          } else {
            console.error('⚠️ 授权后验证失败: Facade合约仍然没有MANAGER_ROLE');
          }
        } catch (error) {
          console.error(`授权失败: ${error.message}`);
        }
      }
      
    } else if (solution === 'authorize') {
      // 解决方案3: 授权Facade合约
      console.log('\n==== 授权Facade合约 ====');
      
      // 先检查是否已授权
      const facadeIsAuthorized = await systemContract.authorizedContracts(addresses.facade);
      
      if (facadeIsAuthorized) {
        console.log('Facade合约已经是授权合约，无需再次授权');
      } else {
        console.log(`将Facade合约 ${addresses.facade} 添加为授权合约...`);
        
        try {
          const tx = await systemContract.setContractAuthorization(addresses.facade, true);
          console.log('授权交易已发送，等待确认...');
          const receipt = await tx.wait();
          console.log(`✅ 授权成功! 交易哈希: ${receipt.hash}`);
          
          // 验证是否成功授权
          const isAuthorizedNow = await systemContract.authorizedContracts(addresses.facade);
          if (isAuthorizedNow) {
            console.log('验证成功: Facade合约现在是授权合约');
            
            // 提供代码修改建议
            console.log('\n长期解决方案:');
            console.log('修改RealEstateSystem.validateRole()方法，同时检查授权合约:');
            console.log('```solidity');
            console.log('function validateRole(bytes32 role, address account, string memory message) public view {');
            console.log('    // 检查直接拥有角色或是授权合约');
            console.log('    require(hasRole(role, account) || authorizedContracts[account], message);');
            console.log('}');
            console.log('```');
          } else {
            console.error('⚠️ 授权后验证失败: Facade合约仍然不是授权合约');
          }
        } catch (error) {
          console.error(`授权失败: ${error.message}`);
        }
      }
    }
    
    console.log('\n总结:');
    console.log('1. 使用 "node server/scripts/quick-fix-property-status.js <房产ID> <状态>" 可以直接更新房产状态');
    console.log('2. 长期解决方案需要修改合约代码，可选以下方案:');
    console.log('   - 为Facade合约授予MANAGER_ROLE');
    console.log('   - 修改validateRole()方法，检查授权合约映射');
    console.log('   - 重新部署修复后的合约');
    
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