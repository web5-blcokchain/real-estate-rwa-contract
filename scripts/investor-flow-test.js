// 创建卖单
log.info("创建卖单...");
const sellOrderId = await tradingManagerContract.createSellOrder(
    state.propertyTokenAddress,  // token 地址
    TEST_PROPERTY_INITIAL_SUPPLY,  // amount
    TEST_PROPERTY_TOKEN_PRICE  // price
);
log.info(`卖单创建成功，订单ID: ${sellOrderId}`); 