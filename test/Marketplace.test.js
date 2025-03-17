const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
  deploySystem, 
  registerAndApproveProperty, 
  createPropertyToken,
  verifyUsers,
  addUsersToWhitelist
} = require("./utils/testHelpers");

describe("市场测试", function () {
  let owner, seller, buyer, feeCollector;
  let marketplace, token, tokenAddress, propertyId, stablecoin;
  let orderId;

  beforeEach(async function () {
    const deployed = await deploySystem();
    owner = deployed.owner;
    seller = deployed.user1;
    buyer = deployed.user2;
    feeCollector = deployed.feeCollector;
    marketplace = deployed.marketplace;
    stablecoin = deployed.stablecoin;
    
    // 注册并审核房产
    propertyId = await registerAndApproveProperty(deployed.propertyRegistry, deployed.propertyManager, owner);
    
    // 创建房产代币
    const result = await createPropertyToken(deployed.tokenFactory, propertyId, owner);
    token = result.token;
    tokenAddress = result.tokenAddress;
    
    // KYC验证用户并添加到白名单
    await verifyUsers(deployed.kycManager, deployed.kycManager, [seller, buyer]);
    await addUsersToWhitelist(token, owner, [seller, buyer]);
    
    // 分发代币给卖家
    await token.connect(owner).transfer(seller.address, ethers.utils.parseEther("300"));
    
    // 卖家批准市场合约使用代币
    const tokenAmount = ethers.utils.parseEther("100");
    await token.connect(seller).approve(marketplace.address, tokenAmount);
    
    // 创建订单
    const price = ethers.utils.parseEther("500");
    const tx = await marketplace.connect(seller).createOrder(
      tokenAddress, tokenAmount, price, stablecoin.address
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'OrderCreated');
    orderId = event.args.orderId;
  });

  it("卖家应该能够创建订单", async function () {
    const order = await marketplace.orders(orderId);
    
    expect(order.seller).to.equal(seller.address);
    expect(order.tokenAddress).to.equal(tokenAddress);
    expect(order.tokenAmount).to.equal(ethers.utils.parseEther("100"));
    expect(order.price).to.equal(ethers.utils.parseEther("500"));
    expect(order.stablecoinAddress).to.equal(stablecoin.address);
    expect(order.status).to.equal(0); // Active
    
    // 检查代币是否已转移到市场合约
    expect(await token.balanceOf(marketplace.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("买家应该能够购买订单", async function () {
    // 买家批准市场合约使用稳定币
    const price = ethers.utils.parseEther("500");
    await stablecoin.connect(buyer).approve(marketplace.address, price);
    
    const initialSellerBalance = await stablecoin.balanceOf(seller.address);
    const initialFeeCollectorBalance = await stablecoin.balanceOf(feeCollector.address);
    
    await marketplace.connect(buyer).fulfillOrder(orderId);
    
    const order = await marketplace.orders(orderId);
    expect(order.status).to.equal(1); // Fulfilled
    
    // 检查代币是否已转移给买家
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.utils.parseEther("100"));
    
    // 检查稳定币是否已转移给卖家（减去1%交易费）
    const fee = ethers.utils.parseEther("5"); // 1% of 500
    const sellerAmount = price.sub(fee);
    expect(await stablecoin.balanceOf(seller.address)).to.equal(initialSellerBalance.add(sellerAmount));
    
    // 检查费用是否已转移给费用收集者
    expect(await stablecoin.balanceOf(feeCollector.address)).to.equal(initialFeeCollectorBalance.add(fee));
  });

  it("卖家应该能够取消订单", async function () {
    const initialBalance = await token.balanceOf(seller.address);
    
    await marketplace.connect(seller).cancelOrder(orderId);
    
    const order = await marketplace.orders(orderId);
    expect(order.status).to.equal(2); // Cancelled
    
    // 检查代币是否已返还给卖家
    expect(await token.balanceOf(seller.address)).to.equal(initialBalance.add(ethers.utils.parseEther("100")));
  });

  it("非卖家不应该能够取消订单", async function () {
    await expect(
      marketplace.connect(buyer).cancelOrder(orderId)
    ).to.be.revertedWith("Not seller");
  });

  it("卖家应该能够更新订单价格", async function () {
    const newPrice = ethers.utils.parseEther("600");
    await marketplace.connect(seller).updatePrice(orderId, newPrice);
    
    const order = await marketplace.orders(orderId);
    expect(order.price).to.equal(newPrice);
  });

  it("非卖家不应该能够更新订单价格", async function () {
    await expect(
      marketplace.connect(buyer).updatePrice(orderId, ethers.utils.parseEther("600"))
    ).to.be.revertedWith("Not seller");
  });

  it("应该能够获取活跃订单数量", async function () {
    expect(await marketplace.getActiveOrderCount()).to.equal(1);
    
    // 取消订单
    await marketplace.connect(seller).cancelOrder(orderId);
    
    expect(await marketplace.getActiveOrderCount()).to.equal(0);
  });

  it("应该能够获取用户订单", async function () {
    const userOrders = await marketplace.getUserOrders(seller.address);
    expect(userOrders.length).to.equal(1);
    expect(userOrders[0]).to.equal(orderId);
  });
});