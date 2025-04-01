
根据搜索结果，我已经找到了项目中所有智能合约定义的事件。以下是完整列表，按合约分类：

## 合约事件总结

### RealEstateSystem 合约事件 (4个)
1. `SystemInitialized` - 系统初始化事件
2. `SystemStatusChanged` - 系统状态变更事件
3. `ComponentUpdated` - 组件更新事件
4. `VersionUpdated` - 版本更新事件

### RewardManager 合约事件 (13个)
1. `DistributionCreated` - 分配创建事件
2. `DistributionStatusChanged` - 分配状态变更事件
3. `DistributionWithdrawn` - 分配提取事件
4. `FeeRatesUpdated` - 费率更新事件
5. `FeeReceiverUpdated` - 费用接收地址更新事件
6. `EmergencyWithdrawalStatusChanged` - 紧急提款状态变更事件
7. `MinDistributionThresholdChanged` - 最小分配阈值变更事件
8. `PaymentTokenAdded` - 支付代币添加事件
9. `PaymentTokenRemoved` - 支付代币移除事件
10. `PlatformFeeRateUpdated` - 平台费率更新事件
11. `MaintenanceFeeRateUpdated` - 维护费率更新事件
12. `FeesDistributed` - 费用分配事件

### RealEstateFacade 合约事件 (15个)
1. `PropertyListed` - 房产上市事件
2. `TradeExecuted` - 交易执行事件
3. `RewardsClaimed` - 奖励领取事件
4. `PropertyValuationUpdated` - 房产估值更新事件
5. `TradingLimitsUpdated` - 交易限制更新事件
6. `OrderCreated` - 订单创建事件
7. `OrderCancelled` - 订单取消事件
8. `DistributionCreated` - 分配创建事件
9. `PropertyStatusUpdated` - 房产状态更新事件
10. `SystemContractUpdated` - 系统合约更新事件
11. `RoleManagerUpdated` - 角色管理器更新事件
12. `TokenSellOrderCreated` - 代币卖单创建事件
13. `DirectSellOrderCreated` - 直接卖单创建事件
14. `FacadeInitialized` - 门面合约初始化事件
15. `PropertyRegistered` - 房产注册事件

### TradingManager 合约事件 (16个)
1. `OrderCreated` - 订单创建事件
2. `OrderCancelled` - 订单取消事件
3. `OrderExecuted` - 订单执行事件
4. `FeeRateUpdated` - 费率更新事件
5. `FeeReceiverUpdated` - 费用接收地址更新事件
6. `TradingStatusUpdated` - 交易状态更新事件
7. `MinTradeAmountUpdated` - 最小交易金额更新事件
8. `MaxTradeAmountUpdated` - 最大交易金额更新事件
9. `CooldownPeriodUpdated` - 冷却期更新事件
10. `AddressBlacklisted` - 地址黑名单事件
11. `EmergencyWithdrawalRequested` - 紧急提款请求事件
12. `EmergencyWithdrawalApproved` - 紧急提款批准事件
13. `EmergencyWithdrawalExecuted` - 紧急提款执行事件
14. `EmergencyTokenWithdrawalRequested` - 紧急代币提款请求事件
15. `EmergencyTokenWithdrawalExecuted` - 紧急代币提款执行事件
16. `EmergencyTimelockUpdated` - 紧急时间锁更新事件
17. `RequiredApprovalsUpdated` - 所需批准数更新事件

### PropertyToken 合约事件 (4个)
1. `Blacklisted` - 黑名单添加事件
2. `UnBlacklisted` - 黑名单移除事件
3. `MaxSupplyUpdated` - 最大供应量更新事件
4. `SnapshotCreated` - 快照创建事件

### PropertyManager 合约事件 (5个)
1. `PropertyRegistered` - 房产注册事件
2. `PropertyStatusUpdated` - 房产状态更新事件
3. `PropertyManagerInitialized` - 房产管理器初始化事件
4. `TokenRegistered` - 代币注册事件
5. `ContractAuthorized` - 合约授权事件

### RoleManager 合约事件 (6个)
1. `RoleManagerAdminChanged` - 角色管理员变更事件
2. `EmergencyModeChanged` - 紧急模式变更事件
3. `EmergencyModeActivated` - 紧急模式激活事件
4. `EmergencyModeDeactivated` - 紧急模式停用事件
5. `EmergencyModeSet` - 紧急模式设置事件
6. `RoleManagerInitialized` - 角色管理器初始化事件

## 总计
项目中共定义了 **63个事件**，这些事件覆盖了系统的各个方面，包括：
- 系统状态变更
- 房产管理和状态更新
- 交易创建和执行
- 奖励分配和提取
- 安全控制和紧急操作
- 费用管理和配置更新

这些事件对于系统监控、数据分析和前端应用开发都是非常重要的，它们提供了合约状态变化的完整审计跟踪。
