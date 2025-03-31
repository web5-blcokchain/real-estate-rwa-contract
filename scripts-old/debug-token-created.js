/**
 * 代币创建情况调试脚本
 * 用于查看TokenFactory合约状态和已创建的代币
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('\n============= TokenFactory调试脚本 =============\n');
  
  // 加载部署状态
  const deployState = require('./deploy-state.json');
  console.log('成功加载部署状态');
  
  // 获取合约地址
  const tokenFactoryAddress = deployState.tokenFactory;
  const roleManagerAddress = deployState.roleManager;
  const propertyRegistryAddress = deployState.propertyRegistry;
  
  console.log(`合约地址:
  TokenFactory: ${tokenFactoryAddress}
  RoleManager: ${roleManagerAddress}
  PropertyRegistry: ${propertyRegistryAddress}
  `);
  
  // 获取账户
  const [deployer] = await ethers.getSigners();
  console.log(`使用账户: ${deployer.address}`);
  
  // 连接到合约
  const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
  const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
  const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
  
  console.log('成功连接到合约');
  
  // 检查TokenFactory创建的代币
  try {
    // 获取网络交易记录
    console.log('分析区块链上的TokenFactory交易...');
    
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`当前区块高度: ${currentBlock}`);
    
    // 获取最近几个区块
    const latestBlocks = [];
    for (let i = 0; i < 5 && currentBlock - i >= 0; i++) {
      latestBlocks.push(await ethers.provider.getBlock(currentBlock - i));
    }
    
    console.log(`分析最近 ${latestBlocks.length} 个区块的交易`);
    
    // 分析交易
    let foundTokenCreation = false;
    for (const block of latestBlocks) {
      if (!block || !block.transactions) continue;
      
      for (const txHash of block.transactions) {
        try {
          const tx = await ethers.provider.getTransaction(txHash);
          
          if (tx && tx.to && tx.to.toLowerCase() === tokenFactoryAddress.toLowerCase()) {
            console.log(`找到TokenFactory交易: ${txHash}`);
            
            const receipt = await ethers.provider.getTransactionReceipt(txHash);
            console.log(`  区块: ${receipt.blockNumber}, 状态: ${receipt.status ? '成功' : '失败'}`);
            
            // 检查是否有事件
            if (receipt.logs && receipt.logs.length > 0) {
              console.log(`  包含 ${receipt.logs.length} 个事件`);
              foundTokenCreation = true;
              
              // 尝试解析日志以获取创建的代币地址
              for (const log of receipt.logs) {
                if (log.topics && log.topics.length > 0) {
                  if (log.topics[0] === '0x5f7e321571d1591f8d2c01d7f4aeb27d537922f5111ca32d8f93b9890a34c2a4') {
                    // 这个事件主题匹配TokenCreated事件
                    console.log('  找到TokenCreated事件!');
                    
                    // 解析参数
                    if (log.topics.length > 2) {
                      const propertyId = log.topics[1];
                      const tokenAddress = '0x' + log.topics[2].slice(26);
                      console.log(`  创建的代币: ${tokenAddress} (对应房产ID: ${propertyId})`);
                      
                      try {
                        // 加载代币合约
                        const token = await ethers.getContractAt('RealEstateToken', tokenAddress);
                        const name = await token.name();
                        const symbol = await token.symbol();
                        const totalSupply = await token.totalSupply();
                        
                        console.log(`  代币详情:
                          名称: ${name}
                          符号: ${symbol}
                          总供应量: ${ethers.formatEther(totalSupply)}
                        `);
                      } catch (err) {
                        console.log(`  无法获取代币详情: ${err.message}`);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log(`  解析交易 ${txHash} 时出错: ${error.message}`);
        }
      }
    }
    
    if (!foundTokenCreation) {
      console.log('分析的区块中没有找到TokenFactory的代币创建交易');
    }
    
  } catch (error) {
    console.error('分析TokenFactory交易失败:', error);
  }
  
  // 检查权限设置
  try {
    console.log('\n检查权限设置...');
    
    // 检查关键角色
    const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
    const SNAPSHOT_ROLE = '0x5fdbd35e8da83ee755d5e62a539e5ed7f47126abede0b8b10f9ea43dc6eed07f';
    
    // 检查TokenFactory的关键权限
    console.log(`检查TokenFactory (${tokenFactoryAddress}) 的角色权限:`);
    
    try {
      const tokenFactoryHasMinter = await roleManager.functions.hasRole(MINTER_ROLE, tokenFactoryAddress);
      console.log(`  TokenFactory有MINTER_ROLE权限: ${tokenFactoryHasMinter}`);
    } catch (err) {
      console.log(`  检查MINTER_ROLE失败: ${err.message}`);
    }
    
    try {
      const tokenFactoryHasSnapshot = await roleManager.functions.hasRole(SNAPSHOT_ROLE, tokenFactoryAddress);
      console.log(`  TokenFactory有SNAPSHOT_ROLE权限: ${tokenFactoryHasSnapshot}`);
    } catch (err) {
      console.log(`  检查SNAPSHOT_ROLE失败: ${err.message}`);
    }
    
    try {
      const isAuthorized = await propertyRegistry.functions.isAuthorizedContract(tokenFactoryAddress);
      console.log(`  TokenFactory是PropertyRegistry的授权合约: ${isAuthorized}`);
    } catch (err) {
      console.log(`  检查授权状态失败: ${err.message}`);
    }
    
  } catch (error) {
    console.error('检查权限设置失败:', error);
  }
  
  console.log('\n调试完成!');
}

// 执行脚本
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('脚本执行错误:', error);
    process.exit(1);
  }); 