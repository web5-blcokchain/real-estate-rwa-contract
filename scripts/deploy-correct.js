const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

/**
 * 验证合约部署
 */
async function verifyDeployment(contracts) {
  try {
    logger.info("开始验证合约部署...");
    
    // 验证系统状态
    const systemStatus = await contracts.system.getSystemStatus();
    logger.info(`系统状态: ${systemStatus}`);
    
    // 验证合约授权
    const isPropertyManagerAuthorized = await contracts.system.authorizedContracts(contracts.propertyManagerAddress);
    const isTradingManagerAuthorized = await contracts.system.authorizedContracts(contracts.tradingManagerAddress);
    const isRewardManagerAuthorized = await contracts.system.authorizedContracts(contracts.rewardManagerAddress);
    const isFacadeAuthorized = await contracts.system.authorizedContracts(contracts.realEstateFacadeAddress);
    
    logger.info("合约授权状态:");
    logger.info(`- PropertyManager: ${isPropertyManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- TradingManager: ${isTradingManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- RewardManager: ${isRewardManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- RealEstateFacade: ${isFacadeAuthorized ? "已授权" : "未授权"}`);
    
    // 验证交易参数
    const maxTradeAmount = await contracts.tradingManager.maxTradeAmount();
    const minTradeAmount = await contracts.tradingManager.minTradeAmount();
    const cooldownPeriod = await contracts.tradingManager.cooldownPeriod();
    const feeRate = await contracts.tradingManager.feeRate();
    
    logger.info("交易参数:");
    logger.info(`- 最大交易金额: ${ethers.formatEther(maxTradeAmount)} ETH`);
    logger.info(`- 最小交易金额: ${ethers.formatEther(minTradeAmount)} ETH`);
    logger.info(`- 冷却期: ${cooldownPeriod} 秒`);
    logger.info(`- 交易费率: ${Number(feeRate) / 100}%`);
    
    // 验证 PropertyToken
    const propertyTokenName = await contracts.propertyToken.name();
    const propertyTokenSymbol = await contracts.propertyToken.symbol();
    const propertyTokenTotalSupply = await contracts.propertyToken.totalSupply();
    
    logger.info("PropertyToken 信息:");
    logger.info(`- 名称: ${propertyTokenName}`);
    logger.info(`- 符号: ${propertyTokenSymbol}`);
    logger.info(`- 总供应量: ${ethers.formatEther(propertyTokenTotalSupply)}`);
    
    // 验证 SimpleERC20
    const testTokenName = await contracts.testToken.name();
    const testTokenSymbol = await contracts.testToken.symbol();
    const testTokenTotalSupply = await contracts.testToken.totalSupply();
    
    logger.info("SimpleERC20 信息:");
    logger.info(`- 名称: ${testTokenName}`);
    logger.info(`- 符号: ${testTokenSymbol}`);
    logger.info(`- 总供应量: ${ethers.formatEther(testTokenTotalSupply)}`);
    
    logger.info("合约验证完成！");
    return true;
  } catch (error) {
    logger.error("验证失败:", error);
    return false;
  }
}

async function deploy() {
  try {
    logger.info("开始正确的部署流程...");
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 1. 首先部署 System 合约
    logger.info("步骤1: 部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [deployer.address], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto"]
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    logger.info(`RealEstateSystem 部署到: ${systemAddress}`);
    
    // 2. 部署其他合约，直接传入正确的系统地址
    logger.info("步骤2: 部署管理合约...");
    
    // 部署 PropertyManager
    logger.info("部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await propertyManager.waitForDeployment();
    const propertyManagerAddress = await propertyManager.getAddress();
    logger.info(`PropertyManager 部署到: ${propertyManagerAddress}`);
    
    // 部署 TradingManager
    logger.info("部署 TradingManager...");
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = await upgrades.deployProxy(TradingManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await tradingManager.waitForDeployment();
    const tradingManagerAddress = await tradingManager.getAddress();
    logger.info(`TradingManager 部署到: ${tradingManagerAddress}`);
    
    // 部署 RewardManager
    logger.info("部署 RewardManager...");
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewardManager = await upgrades.deployProxy(RewardManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await rewardManager.waitForDeployment();
    const rewardManagerAddress = await rewardManager.getAddress();
    logger.info(`RewardManager 部署到: ${rewardManagerAddress}`);
    
    // 3. 在系统中授权各合约
    logger.info("步骤3: 授权合约...");
    let tx = await system.setContractAuthorization(propertyManagerAddress, true);
    await tx.wait();
    logger.info("PropertyManager 已授权");
    
    tx = await system.setContractAuthorization(tradingManagerAddress, true);
    await tx.wait();
    logger.info("TradingManager 已授权");
    
    tx = await system.setContractAuthorization(rewardManagerAddress, true);
    await tx.wait();
    logger.info("RewardManager 已授权");
    
    // 4. 部署 PropertyToken
    logger.info("步骤4: 部署 PropertyToken...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.ZeroHash, // propertyIdHash
      "Test Property Token", // name
      "TPT", // symbol
      ethers.parseEther("1000000"), // initialSupply
      deployer.address, // admin
      systemAddress // systemAddress
    ], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await propertyToken.waitForDeployment();
    const propertyTokenAddress = await propertyToken.getAddress();
    logger.info(`PropertyToken 部署到: ${propertyTokenAddress}`);
    
    // 5. 部署 SimpleERC20 测试代币
    logger.info("步骤5: 部署 SimpleERC20 测试代币...");
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const testToken = await SimpleERC20.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000") // 初始供应量：1,000,000 TEST
    );
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    logger.info(`SimpleERC20 部署到: ${testTokenAddress}`);
    
    // 6. 部署门面合约
    logger.info("步骤6: 部署门面合约...");
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    const realEstateFacade = await upgrades.deployProxy(RealEstateFacade, [
      systemAddress,
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress
    ], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await realEstateFacade.waitForDeployment();
    const realEstateFacadeAddress = await realEstateFacade.getAddress();
    logger.info(`RealEstateFacade 部署到: ${realEstateFacadeAddress}`);
    
    // 授权门面合约
    tx = await system.setContractAuthorization(realEstateFacadeAddress, true);
    await tx.wait();
    logger.info("RealEstateFacade 已授权");
    
    // 7. 设置交易管理器参数
    logger.info("步骤7: 配置交易参数...");
    tx = await tradingManager.setMaxTradeAmount(ethers.parseEther("1000"));
    await tx.wait();
    tx = await tradingManager.setMinTradeAmount(ethers.parseEther("0.01"));
    await tx.wait();
    tx = await tradingManager.setCooldownPeriod(3600);
    await tx.wait();
    tx = await tradingManager.setFeeRate(100); // 1%
    await tx.wait();
    tx = await tradingManager.setFeeReceiver(deployer.address);
    await tx.wait();
    logger.info("交易参数已配置");
    
    // 8. 激活系统
    logger.info("步骤8: 激活系统...");
    tx = await system.setSystemStatus(2); // Active = 2
    await tx.wait();
    logger.info("系统已激活");
    
    // 输出所有合约地址
    logger.info("== 合约地址摘要 ==");
    logger.info(`RealEstateSystem: ${systemAddress}`);
    logger.info(`PropertyManager: ${propertyManagerAddress}`);
    logger.info(`TradingManager: ${tradingManagerAddress}`);
    logger.info(`RewardManager: ${rewardManagerAddress}`);
    logger.info(`PropertyToken: ${propertyTokenAddress}`);
    logger.info(`SimpleERC20: ${testTokenAddress}`);
    logger.info(`RealEstateFacade: ${realEstateFacadeAddress}`);
    
    // 验证部署
    const contracts = {
      system,
      propertyManager,
      tradingManager,
      rewardManager,
      propertyToken,
      testToken,
      realEstateFacade,
      systemAddress,
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress,
      propertyTokenAddress,
      testTokenAddress,
      realEstateFacadeAddress
    };
    
    await verifyDeployment(contracts);
    
    logger.info("部署完成！系统已准备就绪。");
    
    return contracts;
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
  }
}

// 直接运行脚本时执行部署
if (require.main === module) {
  deploy()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploy, verifyDeployment }; 