# 日本房地产代币化系统

## 系统概述

本系统是一个基于以太坊的房地产代币化平台，允许将日本房地产资产代币化并进行交易。系统采用模块化设计，使用门面模式简化用户交互，同时保持系统的可扩展性和安全性。

## 系统架构

系统由以下核心组件组成：

1. **SimpleRealEstateSystem**
   - 系统核心合约
   - 管理系统状态和组件
   - 处理紧急情况
   - 管理合约升级

2. **RealEstateFacade**
   - 业务操作门面合约
   - 简化用户交互
   - 封装复杂操作
   - 提供统一的错误处理

3. **PropertyManager**
   - 房产管理合约
   - 处理房产注册和状态管理
   - 管理房产估值

4. **PropertyToken**
   - 房产代币合约
   - 实现 ERC20 标准
   - 管理代币发行和转账

5. **TradingManager**
   - 交易管理合约
   - 处理订单创建和执行
   - 管理交易价格和限制

6. **RewardManager**
   - 奖励管理合约
   - 处理分红和奖励分配
   - 管理奖励领取

7. **SimpleRoleManager**
   - 角色管理合约
   - 管理访问权限
   - 控制操作权限

## 主要功能

### 1. 房产管理
- 房产上架
- 状态更新
- 估值管理
- 信息查询

### 2. 代币管理
- 代币发行
- 代币转账
- 余额查询
- 快照功能

### 3. 交易管理
- 创建订单
- 取消订单
- 执行交易
- 价格管理

### 4. 奖励管理
- 创建分配
- 领取奖励
- 奖励查询
- 分红管理

### 5. 系统管理
- 状态控制
- 紧急处理
- 合约升级
- 权限管理

## 部署指南

1. 安装依赖：
```bash
npm install
```

2. 编译合约：
```bash
npx hardhat compile
```

3. 运行测试：
```bash
npx hardhat test
```

4. 部署合约：
```bash
npx hardhat run scripts/deploy.js --network <network>
```

## 使用示例

### 1. 上架房产
```javascript
// 管理员上架房产
await facade.listProperty(
  "PROP001",
  "Tokyo Property",
  "TKY",
  ethers.utils.parseEther("1000"),
  ethers.utils.parseEther("1"),
  "Tokyo",
  "A luxury property in Tokyo"
);
```

### 2. 创建交易订单
```javascript
// 用户创建卖单
await facade.createOrder(
  tokenAddress,
  ethers.utils.parseEther("10"),
  ethers.utils.parseEther("1")
);
```

### 3. 执行交易
```javascript
// 用户执行交易
await facade.executeTrade(
  orderId,
  { value: ethers.utils.parseEther("10") }
);
```

### 4. 创建奖励分配
```javascript
// 管理员创建奖励分配
await facade.createDistribution(
  propertyIdHash,
  ethers.utils.parseEther("100"),
  "Monthly dividend",
  true,
  ethers.constants.AddressZero
);
```

### 5. 领取奖励
```javascript
// 用户领取奖励
await facade.claimRewards(distributionId);
```

## 安全特性

1. **访问控制**
   - 基于角色的权限管理
   - 多重签名支持
   - 紧急暂停机制

2. **交易安全**
   - 重入攻击防护
   - 溢出检查
   - 状态验证

3. **升级机制**
   - 可升级合约
   - 版本控制
   - 向后兼容

## 开发指南

### 添加新功能
1. 在相应的管理合约中实现核心功能
2. 在门面合约中添加便捷接口
3. 添加相应的测试用例
4. 更新文档

### 升级合约
1. 创建新的实现合约
2. 在系统合约中注册新版本
3. 执行升级
4. 验证功能

## 注意事项

1. 部署前确保所有依赖已安装
2. 测试网络上进行充分测试
3. 注意 gas 费用优化
4. 定期备份重要数据
5. 监控系统状态

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License 