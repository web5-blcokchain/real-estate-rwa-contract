const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

// 日志工具
const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

// 获取初始化参数
const getInitParams = () => {
  return {
    trading: {
      tradingFeeRate: parseInt(process.env.TRADING_FEE_RATE || "100"), // 默认1%
      tradingFeeReceiver: process.env.TRADING_FEE_RECEIVER || ethers.ZeroAddress,
      maxTradeAmount: process.env.MAX_TRADE_AMOUNT || "1000", // 默认为1000
      minTradeAmount: process.env.MIN_TRADE_AMOUNT || "0.01", // 默认为0.01
      cooldownPeriod: process.env.COOLDOWN_PERIOD || "3600", // 默认为1小时(3600秒)
    },
    reward: {
      platformFeeRate: parseInt(process.env.PLATFORM_FEE_RATE || "500"), // 默认5%
      maintenanceFeeRate: parseInt(process.env.MAINTENANCE_FEE_RATE || "200"), // 默认2%
      rewardFeeReceiver: process.env.REWARD_FEE_RECEIVER || ethers.ZeroAddress,
      minDistributionThreshold: process.env.MIN_DISTRIBUTION_THRESHOLD || "0.01"
    },
    token: {
      name: process.env.TOKEN_FACTORY_NAME || "Token Factory",
      symbol: process.env.TOKEN_FACTORY_SYMBOL || "TF",
      initialSupply: process.env.TOKEN_FACTORY_INITIAL_SUPPLY || "0"
    }
  };
};

/**
 * 部署测试代币
 */
async function deployTestToken(signer) {
  logger.info("正在部署测试代币...");
  const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
  const testToken = await SimpleERC20.deploy(
    "Test Token", 
    "TEST",
    ethers.parseEther("1000000") // 初始供应量：1,000,000 TEST
  );
  
  await testToken.waitForDeployment();
  
  const testTokenAddress = await testToken.getAddress();
  logger.info("测试代币已部署到:", testTokenAddress);
  
  return testToken;
}

/**
 * 部署系统合约
 */
async function deploySystem(signer) {
  const initParams = getInitParams();
  const deployedContracts = {};
  
  try {
    // 1. 部署 PropertyManager
    logger.info("正在部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [signer.address], {
      kind: "uups",
    });
    await propertyManager.waitForDeployment();
    const propertyManagerAddress = await propertyManager.getAddress();
    logger.info("PropertyManager 已部署到:", propertyManagerAddress);
    deployedContracts.propertyManager = propertyManager;
    
    // 2. 部署 TradingManager
    logger.info("正在部署 TradingManager...");
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = await upgrades.deployProxy(TradingManager, [signer.address], {
      kind: "uups",
    });
    await tradingManager.waitForDeployment();
    const tradingManagerAddress = await tradingManager.getAddress();
    logger.info("TradingManager 已部署到:", tradingManagerAddress);
    deployedContracts.tradingManager = tradingManager;
    
    // 3. 部署 RewardManager (注意参数顺序必须与合约中的initialize参数匹配)
    logger.info("正在部署 RewardManager...");
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewardManager = await upgrades.deployProxy(RewardManager, [
      initParams.reward.platformFeeRate,
      initParams.reward.maintenanceFeeRate,
      initParams.reward.rewardFeeReceiver,
      ethers.parseEther(initParams.reward.minDistributionThreshold.toString()),
      signer.address // 临时系统地址，后面会更新
    ], {
      kind: "uups",
    });
    await rewardManager.waitForDeployment();
    const rewardManagerAddress = await rewardManager.getAddress();
    logger.info("RewardManager 已部署到:", rewardManagerAddress);
    deployedContracts.rewardManager = rewardManager;
    
    // 4. 部署 RealEstateSystem 系统合约 (移到此处，确保先有 System 后有 PropertyToken)
    logger.info("正在部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [
      signer.address, // 部署者作为初始管理员
    ], {
      kind: "uups",
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    logger.info("RealEstateSystem 已部署到:", systemAddress);
    deployedContracts.system = system;
    
    // 5. 手动设置系统合约的组件地址
    logger.info("正在设置系统合约的组件地址...");
    // 添加授权组件
    let tx = await system.setContractAuthorization(propertyManagerAddress, true);
    await tx.wait();
    logger.info("已将 PropertyManager 添加为授权合约");
    
    tx = await system.setContractAuthorization(tradingManagerAddress, true);
    await tx.wait();
    logger.info("已将 TradingManager 添加为授权合约");
    
    tx = await system.setContractAuthorization(rewardManagerAddress, true);
    await tx.wait();
    logger.info("已将 RewardManager 添加为授权合约");
    
    // 6. 更新各组件的系统地址 - 首先检查是否能直接在 PropertyManager 上授权合约
    logger.info("正在为 PropertyManager 添加合约授权...");
    tx = await propertyManager.setContractAuthorization(systemAddress, true);
    await tx.wait();
    logger.info("已在 PropertyManager 上授权 System 合约");
    
    logger.info("正在更新各合约的系统地址...");
    tx = await propertyManager.setSystem(systemAddress);
    await tx.wait();
    logger.info("PropertyManager 的系统地址已更新");
    
    // 类似步骤设置其他合约
    logger.info("正在为 TradingManager 添加合约授权...");
    tx = await tradingManager.setContractAuthorization(systemAddress, true);
    await tx.wait();
    logger.info("已在 TradingManager 上授权 System 合约");
    
    tx = await tradingManager.setSystem(systemAddress);
    await tx.wait();
    logger.info("TradingManager 的系统地址已更新");
    
    logger.info("正在为 RewardManager 添加合约授权...");
    tx = await rewardManager.setContractAuthorization(systemAddress, true);
    await tx.wait();
    logger.info("已在 RewardManager 上授权 System 合约");
    
    tx = await rewardManager.setSystem(systemAddress);
    await tx.wait();
    logger.info("RewardManager 的系统地址已更新");
    
    // 7. 部署 PropertyToken 示例（作为实现合约）- 现在 System 已经存在
    logger.info("正在部署 PropertyToken 实现合约...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.ZeroHash, // 空的propertyIdHash
      initParams.token.name,
      initParams.token.symbol,
      ethers.parseEther(initParams.token.initialSupply.toString()),
      signer.address,
      systemAddress // 使用实际的系统地址
    ], {
      kind: "uups",
    });
    await propertyToken.waitForDeployment();
    const propertyTokenAddress = await propertyToken.getAddress();
    logger.info("PropertyToken 示例已部署到:", propertyTokenAddress);
    deployedContracts.propertyToken = propertyToken;
    
    // 8. 部署 RealEstateFacade 外观合约
    logger.info("正在部署 RealEstateFacade...");
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    const realEstateFacade = await upgrades.deployProxy(RealEstateFacade, [
      systemAddress,
      signer.address, // 部署者作为初始管理员
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress
    ], {
      kind: "uups",
    });
    await realEstateFacade.waitForDeployment();
    const realEstateFacadeAddress = await realEstateFacade.getAddress();
    logger.info("RealEstateFacade 已部署到:", realEstateFacadeAddress);
    deployedContracts.realEstateFacade = realEstateFacade;
    
    // 9. 授予合约相关角色（确保合约可以正常工作）
    logger.info("正在授予必要角色...");
    
    // 授予系统合约的角色
    logger.info("正在授予系统合约角色...");
    // 获取角色常量
    const ADMIN_ROLE = await system.ADMIN_ROLE();
    const MANAGER_ROLE = await system.MANAGER_ROLE();
    const OPERATOR_ROLE = await system.OPERATOR_ROLE();
    const PAUSER_ROLE = await system.PAUSER_ROLE();
    const UPGRADER_ROLE = await system.UPGRADER_ROLE();
    
    // 确保部署者有管理员角色
    if (!(await system.hasRole(ADMIN_ROLE, signer.address))) {
      tx = await system.grantRole(ADMIN_ROLE, signer.address);
      await tx.wait();
      logger.info(`已授予部署者(${signer.address}) ADMIN_ROLE`);
    }
    
    // 确保部署者有其他必要角色
    if (!(await system.hasRole(MANAGER_ROLE, signer.address))) {
      tx = await system.grantRole(MANAGER_ROLE, signer.address);
      await tx.wait();
      logger.info(`已授予部署者(${signer.address}) MANAGER_ROLE`);
    }
    
    if (!(await system.hasRole(OPERATOR_ROLE, signer.address))) {
      tx = await system.grantRole(OPERATOR_ROLE, signer.address);
      await tx.wait();
      logger.info(`已授予部署者(${signer.address}) OPERATOR_ROLE`);
    }
    
    if (!(await system.hasRole(PAUSER_ROLE, signer.address))) {
      tx = await system.grantRole(PAUSER_ROLE, signer.address);
      await tx.wait();
      logger.info(`已授予部署者(${signer.address}) PAUSER_ROLE`);
    }
    
    if (!(await system.hasRole(UPGRADER_ROLE, signer.address))) {
      tx = await system.grantRole(UPGRADER_ROLE, signer.address);
      await tx.wait();
      logger.info(`已授予部署者(${signer.address}) UPGRADER_ROLE`);
    }
    
    // 10. 现在可以安全地设置 TradingManager 参数
    logger.info("正在设置 TradingManager 参数...");
    
    logger.info(`设置最大交易金额: ${initParams.trading.maxTradeAmount}`);
    tx = await tradingManager.setMaxTradeAmount(ethers.parseEther(initParams.trading.maxTradeAmount.toString()));
    await tx.wait();
    
    logger.info(`设置最小交易金额: ${initParams.trading.minTradeAmount}`);
    tx = await tradingManager.setMinTradeAmount(ethers.parseEther(initParams.trading.minTradeAmount.toString()));
    await tx.wait();
    
    logger.info(`设置交易冷却期: ${initParams.trading.cooldownPeriod}秒`);
    tx = await tradingManager.setCooldownPeriod(initParams.trading.cooldownPeriod);
    await tx.wait();
    
    logger.info(`设置交易费率: ${initParams.trading.tradingFeeRate}`);
    tx = await tradingManager.setFeeRate(initParams.trading.tradingFeeRate);
    await tx.wait();
    
    logger.info(`设置交易费接收者: ${initParams.trading.tradingFeeReceiver}`);
    tx = await tradingManager.setFeeReceiver(initParams.trading.tradingFeeReceiver);
    await tx.wait();
    
    // 11. 部署测试代币
    const testToken = await deployTestToken(signer);
    deployedContracts.testToken = testToken;
    
    // 生成部署报告
    generateDeploymentReport(deployedContracts);
    
    return deployedContracts;
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
  }
}

/**
 * 获取合约的实现地址
 */
async function getImplementationAddress(contractAddress) {
  try {
    return await upgrades.erc1967.getImplementationAddress(contractAddress);
  } catch (error) {
    logger.error(`获取实现地址失败: ${error.message}`);
    return "获取失败";
  }
}

/**
 * 生成部署报告
 */
async function generateDeploymentReport(contracts) {
  // 创建报告目录
  const reportDir = path.join(__dirname, "../docs/deploy");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 创建部署报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `deploy-report-${timestamp}.md`);
  
  // 收集合约地址和实现地址
  const addresses = {};
  const implementations = {};
  
  for (const [name, contract] of Object.entries(contracts)) {
    if (contract.getAddress) {
      addresses[name] = await contract.getAddress();
      
      // 如果是代理合约，获取实现地址
      if (name !== "testToken") {
        implementations[name] = await getImplementationAddress(addresses[name]);
      }
    }
  }
  
  // 生成报告内容
  let reportContent = `# 房产代币化系统部署报告
  
## 基本信息
- 部署时间: ${new Date().toISOString()}
- 网络: ${hre.network.name}
- 部署者: ${addresses.deployer || (await contracts.system.owner())}

## 合约地址

| 合约名称 | 代理地址 | 实现地址 |
|---------|---------|---------|
`;

  // 添加合约地址信息
  for (const [name, address] of Object.entries(addresses)) {
    if (name === "testToken") {
      reportContent += `| SimpleERC20 (测试代币) | ${address} | (非代理合约) |\n`;
    } else {
      reportContent += `| ${name} | ${address} | ${implementations[name] || "N/A"} |\n`;
    }
  }
  
  // 写入报告文件
  fs.writeFileSync(reportPath, reportContent);
  logger.info(`部署报告已生成: ${reportPath}`);
  
  // 更新.env文件
  updateEnvFile(addresses, implementations);
  
  return reportPath;
}

/**
 * 更新环境变量文件
 */
function updateEnvFile(addresses, implementations) {
  logger.info("正在更新.env文件...");
  
  // 读取当前.env文件
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }
  } catch (error) {
    logger.error(`读取.env文件失败: ${error.message}`);
    return;
  }
  
  // 备份原始.env文件
  const backupPath = path.join(__dirname, `../.env.backup.${Date.now()}`);
  if (envContent) {
    fs.writeFileSync(backupPath, envContent);
    logger.info(`原始.env文件已备份: ${backupPath}`);
  }
  
  // 删除已有的合约地址部分
  const contractSectionMarker = "# 以下是合约部署后自动生成的地址信息";
  if (envContent.includes(contractSectionMarker)) {
    envContent = envContent.split(contractSectionMarker)[0].trim();
  }
  
  // 添加新的合约地址信息
  envContent += `\n\n${contractSectionMarker}\n`;
  envContent += `# 部署时间: ${new Date().toISOString()}\n\n`;
  
  // 添加合约地址
  for (const [name, address] of Object.entries(addresses)) {
    if (name === "testToken") {
      envContent += `CONTRACT_SIMPLEERC20_ADDRESS=${address}\n`;
    } else {
      envContent += `CONTRACT_${name.toUpperCase()}_ADDRESS=${address}\n`;
    }
  }
  
  // 添加实现地址
  envContent += `\n# 实现合约地址\n`;
  for (const [name, address] of Object.entries(implementations)) {
    envContent += `CONTRACT_${name.toUpperCase()}_IMPLEMENTATION=${address}\n`;
  }
  
  // 写入更新后的.env文件
  fs.writeFileSync(envPath, envContent);
  logger.info(`环境变量文件已更新: ${envPath}`);
}

// 主函数
async function main() {
  logger.info("开始部署房产代币化系统...");
  
  try {
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 部署系统
    const contracts = await deploySystem(deployer);
    
    logger.info("系统部署成功!");
    return contracts;
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
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

module.exports = { main, deploySystem, deployTestToken };