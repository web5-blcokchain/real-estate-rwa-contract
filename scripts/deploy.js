const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("开始部署房产通证化系统...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log(`使用部署账户: ${deployer.address}`);
  console.log(`账户余额: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  // 部署 RealEstateSystem
  console.log("部署 RealEstateSystem...");
  const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
  const system = await upgrades.deployProxy(RealEstateSystem, [], { initializer: 'initialize' });
  await system.deployed();
  console.log(`RealEstateSystem 已部署到: ${system.address}`);

  // 获取系统合约地址
  const addresses = await system.getSystemContracts();
  console.log("系统合约地址:");
  
  const contractNames = [
    "RoleManager", 
    "FeeManager", 
    "KYCManager", 
    "PropertyRegistry", 
    "TokenFactory", 
    "RedemptionManager", 
    "RentDistributor", 
    "Marketplace"
  ];
  
  for (let i = 0; i < contractNames.length; i++) {
    console.log(`${contractNames[i]}: ${addresses[i]}`);
  }

  // 获取各个合约实例
  const roleManager = await ethers.getContractAt("RoleManager", addresses[0]);
  const feeManager = await ethers.getContractAt("FeeManager", addresses[1]);
  const kycManager = await ethers.getContractAt("KYCManager", addresses[2]);
  const redemptionManager = await ethers.getContractAt("RedemptionManager", addresses[5]);
  const rentDistributor = await ethers.getContractAt("RentDistributor", addresses[6]);
  const marketplace = await ethers.getContractAt("Marketplace", addresses[7]);

  // 设置初始角色
  console.log("设置初始角色...");
  const PROPERTY_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPERTY_MANAGER_ROLE"));
  const KYC_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("KYC_MANAGER_ROLE"));
  
  // 使用环境变量中的地址
  const addr1 = process.env.ADDR1_ADDRESS;
  const addr2 = process.env.ADDR2_ADDRESS;
  
  if (addr1) {
    await roleManager.grantRole(PROPERTY_MANAGER_ROLE, addr1);
    console.log(`已授予 ${addr1} PROPERTY_MANAGER_ROLE 角色`);
  }
  
  if (addr2) {
    await roleManager.grantRole(KYC_MANAGER_ROLE, addr2);
    console.log(`已授予 ${addr2} KYC_MANAGER_ROLE 角色`);
  }

  // 设置费用收集者
  console.log("设置费用收集者...");
  const feeCollector = process.env.OWNER_ADDRESS || deployer.address;
  await feeManager.setFeeCollector(feeCollector);
  console.log(`已设置费用收集者为: ${feeCollector}`);

  // 设置费用比例 - 使用环境变量
  console.log("设置费用比例...");
  await feeManager.setFeeRate("PLATFORM_FEE", process.env.PLATFORM_FEE || 200);
  await feeManager.setFeeRate("MAINTENANCE_FEE", process.env.MAINTENANCE_FEE || 300);
  await feeManager.setFeeRate("TRADING_FEE", process.env.TRADING_FEE || 100);
  await feeManager.setFeeRate("REDEMPTION_FEE", process.env.REDEMPTION_FEE || 150);
  console.log("费用比例设置完成");

  // 设置赎回期限
  console.log("设置赎回期限...");
  await redemptionManager.setRedemptionPeriod(process.env.REDEMPTION_PERIOD || 2592000);
  console.log(`赎回期限设置为: ${process.env.REDEMPTION_PERIOD || 2592000} 秒`);

  // 部署稳定币（仅在测试网络）
  if (process.env.NETWORK === 'testnet') {
    console.log("部署测试稳定币...");
    const TestStablecoin = await ethers.getContractFactory("TestStablecoin");
    const stablecoin = await TestStablecoin.deploy(
      process.env.STABLECOIN_NAME || "Test USD",
      process.env.STABLECOIN_SYMBOL || "TUSD",
      ethers.utils.parseEther((process.env.STABLECOIN_SUPPLY || "1000000").toString())
    );
    await stablecoin.deployed();
    console.log(`测试稳定币已部署到: ${stablecoin.address}`);

    // 添加稳定币支持
    console.log("添加稳定币支持...");
    await rentDistributor.addSupportedStablecoin(stablecoin.address);
    await redemptionManager.addSupportedStablecoin(stablecoin.address);
    await marketplace.addSupportedStablecoin(stablecoin.address);
    console.log("稳定币支持已添加");
  }

  console.log("部署完成！");
  
  // 返回部署的合约地址，用于验证
  return {
    RealEstateSystem: system.address,
    RoleManager: addresses[0],
    FeeManager: addresses[1],
    KYCManager: addresses[2],
    PropertyRegistry: addresses[3],
    TokenFactory: addresses[4],
    RedemptionManager: addresses[5],
    RentDistributor: addresses[6],
    Marketplace: addresses[7]
  };
}

// 执行部署
main()
  .then((deployedContracts) => {
    console.log("部署的合约地址:");
    console.table(deployedContracts);
    process.exit(0);
  })
  .catch((error) => {
    console.error("部署过程中出错:", error);
    process.exit(1);
  });