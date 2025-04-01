const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TradingManager", function () {
  let roleManager;
  let tradingManager;
  let propertyToken;
  let admin;
  let seller;
  let buyer;
  let feeReceiver;
  
  // 角色常量
  let ADMIN_ROLE;
  let MANAGER_ROLE;
  
  // 测试参数
  const tokenName = "Property Token";
  const tokenSymbol = "PROP";
  const initialSupply = ethers.utils.parseEther("1000");
  const tradeAmount = ethers.utils.parseEther("100");
  const price = ethers.utils.parseEther("1"); // 每代币1 ETH
  const totalPrice = price.mul(tradeAmount.div(ethers.utils.parseEther("1")));
  const feeRate = 250; // 2.5%
  const feeAmount = totalPrice.mul(feeRate).div(10000);
  
  beforeEach(async function () {
    [admin, seller, buyer, feeReceiver] = await ethers.getSigners();
    
    // 部署 RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, [admin.address], {
      kind: "uups",
    });
    
    // 获取角色常量
    ADMIN_ROLE = await roleManager.ADMIN_ROLE();
    MANAGER_ROLE = await roleManager.MANAGER_ROLE();
    
    // 设置角色
    await roleManager.grantRole(MANAGER_ROLE, admin.address);
    
    // 部署 PropertyToken (简化的测试代币)
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.constants.HashZero, // 假设的propertyId
      tokenName,
      tokenSymbol,
      initialSupply,
      admin.address,
      roleManager.address
    ], {
      kind: "uups",
    });
    
    // 转移一些代币给卖家
    await propertyToken.transfer(seller.address, tradeAmount.mul(2));
    
    // 部署 TradingManager
    const TradingManager = await ethers.getContractFactory("TradingManager");
    tradingManager = await upgrades.deployProxy(TradingManager, [roleManager.address], {
      kind: "uups",
    });
    
    // 设置交易参数
    await tradingManager.setFeeRate(feeRate);
    await tradingManager.setFeeReceiver(feeReceiver.address);
    await tradingManager.setMaxTradeAmount(ethers.utils.parseEther("500"));
    await tradingManager.setMinTradeAmount(ethers.utils.parseEther("10"));
    
    // 卖家授权TradingManager花费代币
    await propertyToken.connect(seller).approve(tradingManager.address, tradeAmount.mul(2));
  });
  
  describe("初始化和配置", function () {
    it("应正确设置角色管理器", async function () {
      expect(await tradingManager.roleManager()).to.equal(roleManager.address);
    });
    
    it("应正确设置费率", async function () {
      expect(await tradingManager.feeRate()).to.equal(feeRate);
    });
    
    it("应正确设置费用接收者", async function () {
      expect(await tradingManager.feeReceiver()).to.equal(feeReceiver.address);
    });
    
    it("应正确设置最大交易数量", async function () {
      expect(await tradingManager.maxTradeAmount()).to.equal(ethers.utils.parseEther("500"));
    });
    
    it("应正确设置最小交易数量", async function () {
      expect(await tradingManager.minTradeAmount()).to.equal(ethers.utils.parseEther("10"));
    });
    
    it("非管理员不应能设置费率", async function () {
      await expect(
        tradingManager.connect(seller).setFeeRate(500)
      ).to.be.reverted;
    });
  });
  
  describe("创建订单", function () {
    it("用户应该能创建代币销售订单", async function () {
      await expect(
        tradingManager.connect(seller).createTokenSellOrder(
          propertyToken.address,
          tradeAmount,
          price
        )
      ).to.emit(tradingManager, "OrderCreated")
        .withArgs(1, seller.address, propertyToken.address, tradeAmount, price);
      
      const order = await tradingManager.orders(1);
      expect(order.seller).to.equal(seller.address);
      expect(order.token).to.equal(propertyToken.address);
      expect(order.amount).to.equal(tradeAmount);
      expect(order.price).to.equal(price);
      expect(order.status).to.equal(1); // 1: Active
    });
    
    it("用户不应能创建金额小于最小交易数量的订单", async function () {
      const smallAmount = ethers.utils.parseEther("5"); // 小于设置的最小值
      
      await expect(
        tradingManager.connect(seller).createTokenSellOrder(
          propertyToken.address,
          smallAmount,
          price
        )
      ).to.be.revertedWith("Amount below minimum");
    });
    
    it("用户不应能创建金额大于最大交易数量的订单", async function () {
      const largeAmount = ethers.utils.parseEther("600"); // 大于设置的最大值
      
      // 首先转移更多代币给卖家
      await propertyToken.transfer(seller.address, largeAmount);
      await propertyToken.connect(seller).approve(tradingManager.address, largeAmount);
      
      await expect(
        tradingManager.connect(seller).createTokenSellOrder(
          propertyToken.address,
          largeAmount,
          price
        )
      ).to.be.revertedWith("Amount exceeds maximum");
    });
    
    it("用户不应能用余额不足创建订单", async function () {
      const excessAmount = ethers.utils.parseEther("300"); // 超过卖家余额
      
      await expect(
        tradingManager.connect(buyer).createTokenSellOrder(
          propertyToken.address,
          excessAmount,
          price
        )
      ).to.be.reverted; // ERC20: transfer amount exceeds balance
    });
  });
  
  describe("取消订单", function () {
    let orderId;
    
    beforeEach(async function () {
      // 创建订单
      await tradingManager.connect(seller).createTokenSellOrder(
        propertyToken.address,
        tradeAmount,
        price
      );
      orderId = 1;
    });
    
    it("卖家应该能取消自己的订单", async function () {
      await expect(
        tradingManager.connect(seller).cancelOrder(orderId)
      ).to.emit(tradingManager, "OrderCancelled")
        .withArgs(orderId);
      
      const order = await tradingManager.orders(orderId);
      expect(order.status).to.equal(3); // 3: Cancelled
      
      // 验证代币已返还给卖家
      const sellerBalance = await propertyToken.balanceOf(seller.address);
      expect(sellerBalance).to.equal(tradeAmount.mul(2)); // 初始额度恢复
    });
    
    it("非卖家不应能取消订单", async function () {
      await expect(
        tradingManager.connect(buyer).cancelOrder(orderId)
      ).to.be.revertedWith("Not order owner");
    });
    
    it("不应能取消已完成的订单", async function () {
      // 先完成订单
      await tradingManager.connect(buyer).buyTokens(
        orderId,
        { value: totalPrice }
      );
      
      await expect(
        tradingManager.connect(seller).cancelOrder(orderId)
      ).to.be.revertedWith("Order not active");
    });
  });
  
  describe("购买交易", function () {
    let orderId;
    
    beforeEach(async function () {
      // 创建订单
      await tradingManager.connect(seller).createTokenSellOrder(
        propertyToken.address,
        tradeAmount,
        price
      );
      orderId = 1;
    });
    
    it("买家应该能购买代币并支付正确金额", async function () {
      const buyerInitialBalance = await buyer.getBalance();
      const feeReceiverInitialBalance = await feeReceiver.getBalance();
      const sellerInitialBalance = await seller.getBalance();
      
      // 买家购买代币
      const tx = await tradingManager.connect(buyer).buyTokens(
        orderId,
        { value: totalPrice }
      );
      
      // 获取交易收据和gas使用
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // 验证订单状态已更新
      const order = await tradingManager.orders(orderId);
      expect(order.status).to.equal(2); // 2: Completed
      
      // 验证代币已转移给买家
      const buyerTokenBalance = await propertyToken.balanceOf(buyer.address);
      expect(buyerTokenBalance).to.equal(tradeAmount);
      
      // 验证交易费已支付给费用接收者
      const feeReceiverFinalBalance = await feeReceiver.getBalance();
      expect(feeReceiverFinalBalance.sub(feeReceiverInitialBalance)).to.equal(feeAmount);
      
      // 验证卖家收到了剩余的ETH
      const sellerFinalBalance = await seller.getBalance();
      expect(sellerFinalBalance.sub(sellerInitialBalance)).to.equal(totalPrice.sub(feeAmount));
      
      // 验证买家的ETH减少了
      const buyerFinalBalance = await buyer.getBalance();
      expect(buyerInitialBalance.sub(buyerFinalBalance).sub(gasUsed)).to.equal(totalPrice);
    });
    
    it("买家不应能用不足的ETH购买代币", async function () {
      const insufficientAmount = totalPrice.sub(ethers.utils.parseEther("10"));
      
      await expect(
        tradingManager.connect(buyer).buyTokens(
          orderId,
          { value: insufficientAmount }
        )
      ).to.be.revertedWith("Insufficient payment");
    });
    
    it("不应能购买不存在的订单", async function () {
      const nonExistentOrderId = 99;
      
      await expect(
        tradingManager.connect(buyer).buyTokens(
          nonExistentOrderId,
          { value: totalPrice }
        )
      ).to.be.revertedWith("Order not found");
    });
    
    it("不应能购买已取消的订单", async function () {
      // 先取消订单
      await tradingManager.connect(seller).cancelOrder(orderId);
      
      await expect(
        tradingManager.connect(buyer).buyTokens(
          orderId,
          { value: totalPrice }
        )
      ).to.be.revertedWith("Order not active");
    });
    
    it("不应能购买已完成的订单", async function () {
      // 先完成订单
      await tradingManager.connect(buyer).buyTokens(
        orderId,
        { value: totalPrice }
      );
      
      await expect(
        tradingManager.connect(buyer).buyTokens(
          orderId,
          { value: totalPrice }
        )
      ).to.be.revertedWith("Order not active");
    });
  });
  
  describe("直接交易", function () {
    it("买家应该能直接向卖家购买代币", async function () {
      // 卖家授权TradingManager花费代币
      await propertyToken.connect(seller).approve(tradingManager.address, tradeAmount);
      
      const buyerInitialBalance = await buyer.getBalance();
      const feeReceiverInitialBalance = await feeReceiver.getBalance();
      const sellerInitialBalance = await seller.getBalance();
      
      // 直接交易
      const tx = await tradingManager.connect(buyer).executeTrade(
        seller.address,
        propertyToken.address,
        tradeAmount,
        price,
        { value: totalPrice }
      );
      
      // 获取交易收据和gas使用
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // 验证代币已转移给买家
      const buyerTokenBalance = await propertyToken.balanceOf(buyer.address);
      expect(buyerTokenBalance).to.equal(tradeAmount);
      
      // 验证交易费已支付给费用接收者
      const feeReceiverFinalBalance = await feeReceiver.getBalance();
      expect(feeReceiverFinalBalance.sub(feeReceiverInitialBalance)).to.equal(feeAmount);
      
      // 验证卖家收到了剩余的ETH
      const sellerFinalBalance = await seller.getBalance();
      expect(sellerFinalBalance.sub(sellerInitialBalance)).to.equal(totalPrice.sub(feeAmount));
      
      // 验证买家的ETH减少了
      const buyerFinalBalance = await buyer.getBalance();
      expect(buyerInitialBalance.sub(buyerFinalBalance).sub(gasUsed)).to.equal(totalPrice);
    });
  });
}); 