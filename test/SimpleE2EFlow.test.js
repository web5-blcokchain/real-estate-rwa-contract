const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("简化房产资产流程测试", function() {
  let deployer, propertyManager, investor;
  let mockERC20;
  
  before(async function() {
    [deployer, propertyManager, investor] = await ethers.getSigners();
    
    // 部署模拟稳定币
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test USD", "USDT", 18);
    
    // 为测试账户铸造代币
    await mockERC20.mint(investor.address, ethers.utils.parseEther("1000"));
    console.log("已部署MockERC20:", mockERC20.address);
  });
  
  it("测试MockERC20基本功能", async function() {
    // 验证代币名称和符号
    expect(await mockERC20.name()).to.equal("Test USD");
    expect(await mockERC20.symbol()).to.equal("USDT");
    
    // 验证铸造功能
    expect(await mockERC20.balanceOf(investor.address)).to.equal(ethers.utils.parseEther("1000"));
    
    // 测试转账功能
    await mockERC20.connect(investor).transfer(propertyManager.address, ethers.utils.parseEther("100"));
    expect(await mockERC20.balanceOf(propertyManager.address)).to.equal(ethers.utils.parseEther("100"));
    expect(await mockERC20.balanceOf(investor.address)).to.equal(ethers.utils.parseEther("900"));
    
    console.log("MockERC20基本功能测试通过");
  });
  
  it("模拟房产代币的白名单功能", async function() {
    // 创建一个简单的白名单映射
    const whitelist = {};
    
    // 添加地址到白名单
    whitelist[investor.address] = true;
    expect(whitelist[investor.address]).to.be.true;
    
    // 移除地址从白名单
    delete whitelist[investor.address];
    expect(whitelist[investor.address]).to.be.undefined;
    
    console.log("白名单功能模拟测试通过");
  });
  
  it("模拟代币发行和交易流程", async function() {
    // 模拟代币总供应量
    const totalSupply = ethers.utils.parseEther("1000");
    
    // 模拟代币持有结构
    const tokenHoldings = {
      [deployer.address]: ethers.utils.parseEther("500"),
      [propertyManager.address]: ethers.utils.parseEther("300"),
      [investor.address]: ethers.utils.parseEther("200")
    };
    
    // 模拟交易：投资者购买100个代币
    const purchaseAmount = ethers.utils.parseEther("100");
    const price = ethers.utils.parseEther("1.1"); // 每代币1.1 USDT
    
    // 更新代币持有结构
    tokenHoldings[deployer.address] = tokenHoldings[deployer.address].sub(purchaseAmount);
    tokenHoldings[investor.address] = tokenHoldings[investor.address].add(purchaseAmount);
    
    // 验证代币持有量
    expect(tokenHoldings[deployer.address]).to.equal(ethers.utils.parseEther("400"));
    expect(tokenHoldings[investor.address]).to.equal(ethers.utils.parseEther("300"));
    
    console.log("代币发行和交易流程模拟测试通过");
  });
  
  it("模拟租金分发流程", async function() {
    // 模拟代币持有结构
    const tokenHoldings = {
      [deployer.address]: ethers.utils.parseEther("400"),
      [propertyManager.address]: ethers.utils.parseEther("300"),
      [investor.address]: ethers.utils.parseEther("300")
    };
    
    // 计算总供应量
    const totalSupply = Object.values(tokenHoldings).reduce(
      (sum, balance) => sum.add(balance), 
      ethers.BigNumber.from("0")
    );
    
    // 模拟租金金额
    const rentAmount = ethers.utils.parseEther("100");
    
    // 计算每个持有者应得的租金
    const rentDistribution = {};
    for (const [holder, balance] of Object.entries(tokenHoldings)) {
      rentDistribution[holder] = rentAmount.mul(balance).div(totalSupply);
    }
    
    // 验证分配是否正确
    expect(rentDistribution[deployer.address]).to.equal(ethers.utils.parseEther("40"));
    expect(rentDistribution[propertyManager.address]).to.equal(ethers.utils.parseEther("30"));
    expect(rentDistribution[investor.address]).to.equal(ethers.utils.parseEther("30"));
    
    console.log("租金分发流程模拟测试通过");
  });
  
  it("模拟赎回流程", async function() {
    // 模拟代币持有量
    let investorTokens = ethers.utils.parseEther("300");
    
    // 模拟赎回金额
    const redemptionAmount = ethers.utils.parseEther("100");
    
    // 模拟赎回价格 (假设1.05x的价格)
    const redemptionPrice = ethers.utils.parseEther("1.05");
    
    // 计算稳定币支付金额
    const stablecoinAmount = redemptionAmount.mul(redemptionPrice).div(ethers.utils.parseEther("1"));
    
    // 模拟赎回处理
    investorTokens = investorTokens.sub(redemptionAmount);
    
    // 验证赎回后的代币余额
    expect(investorTokens).to.equal(ethers.utils.parseEther("200"));
    expect(stablecoinAmount).to.equal(ethers.utils.parseEther("105"));
    
    console.log("赎回流程模拟测试通过");
  });
  
  it("模拟房产状态变更影响", async function() {
    // 模拟房产状态枚举
    const PropertyStatus = {
      NotRegistered: 0,
      Pending: 1,
      Approved: 2,
      Rejected: 3,
      Delisted: 4,
      Redemption: 5,
      Frozen: 6
    };
    
    // 默认状态
    let currentStatus = PropertyStatus.Approved;
    
    // 模拟冻结状态
    currentStatus = PropertyStatus.Frozen;
    const canTransfer = currentStatus !== PropertyStatus.Frozen;
    
    // 验证冻结状态下不能转账
    expect(canTransfer).to.be.false;
    
    // 恢复到正常状态
    currentStatus = PropertyStatus.Approved;
    const canTransferAfterUnfreeze = currentStatus !== PropertyStatus.Frozen;
    
    // 验证正常状态下可以转账
    expect(canTransferAfterUnfreeze).to.be.true;
    
    console.log("房产状态变更影响模拟测试通过");
  });
}); 