async function testFlow() {
  try {
    // 初始化系统
    await initializeSystem();
    log.success('系统初始化成功');

    // 注册房产
    await registerProperty();
    log.success('房产注册成功');

    // 更新房产状态
    await updatePropertyStatus();
    log.success('房产状态更新成功');

    // 投资者初始购买房产代币
    await initialInvestorBuy();
    log.success('投资者初始购买房产代币成功');

    // 创建卖单
    await createSellOrder();
    log.success('卖单创建成功');

    // 投资者创建买单
    await createBuyOrder();
    log.success('买单创建成功');

    // 购买卖单（使用正确的卖单ID）
    await buyOrder(state.sellOrderId);
    log.success('购买卖单成功');

    // 出售给买单（使用正确的买单ID）
    await sellOrder(state.buyOrderId);
    log.success('出售给买单成功');

    // 创建收益分配
    await createDistribution();
    log.success('收益分配创建成功');

    // 投资者领取收益
    await investorClaimReward();
    log.success('收益领取成功');

    return true;
  } catch (error) {
    log.error(`测试流程失败: ${error.message}`);
    return false;
  }
}

async function buyOrder(orderId) {
    try {
        log.step(5, '执行买单');
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
        
        // 获取卖单信息
        const order = await tradingManagerContract.getOrder(orderId);
        log.info(`卖单信息:
            - 卖家: ${order.seller}
            - 代币: ${order.token}
            - 数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(order.price, 18)} USDT
            - 是否活跃: ${order.active}
        `);

        // 等待冷却时间（1秒）
        log.info('等待订单冷却时间（1秒）...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        log.info('冷却时间结束，可以继续操作');

        // 执行买单
        const tx = await tradingManagerContract.buyOrder(orderId);
        const receipt = await tx.wait();
        log.info(`买单执行成功，交易哈希: ${receipt.hash}`);

        // 获取交易信息
        const tradeId = await tradingManagerContract.getUserTradesLength(state.investorWallet.address) - 1;
        const trade = await tradingManagerContract.getTrade(tradeId);
        log.info(`交易信息:
            - 买家: ${trade.buyer}
            - 卖家: ${trade.seller}
            - 代币: ${trade.token}
            - 数量: ${ethers.formatUnits(trade.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(trade.price, 18)} USDT
        `);

        return true;
    } catch (error) {
        log.error(`执行买单失败: ${error.message}`);
        return false;
    }
}

async function sellOrder(orderId) {
    try {
        log.step(8, '执行卖单');
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
        
        // 获取买单信息
        const order = await tradingManagerContract.getOrder(orderId);
        log.info(`买单信息:
            - 买家: ${order.buyer}
            - 代币: ${order.token}
            - 数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(order.price, 18)} USDT
            - 是否活跃: ${order.active}
        `);

        // 等待冷却时间（1秒）
        log.info('等待订单冷却时间（1秒）...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        log.info('冷却时间结束，可以继续操作');

        // 执行卖单
        const tx = await tradingManagerContract.sellOrder(orderId);
        const receipt = await tx.wait();
        log.info(`卖单执行成功，交易哈希: ${receipt.hash}`);

        // 获取交易信息
        const tradeId = await tradingManagerContract.getUserTradesLength(state.investorWallet.address) - 1;
        const trade = await tradingManagerContract.getTrade(tradeId);
        log.info(`交易信息:
            - 买家: ${trade.buyer}
            - 卖家: ${trade.seller}
            - 代币: ${trade.token}
            - 数量: ${ethers.formatUnits(trade.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(trade.price, 18)} USDT
        `);

        return true;
    } catch (error) {
        log.error(`执行卖单失败: ${error.message}`);
        return false;
    }
} 