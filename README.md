# 日本房产通证化系统文档中心

欢迎使用日本房产通证化系统文档中心。本文档集提供了系统的全面说明，包括开发指南、使用手册和技术文档。

## 文档目录

### 核心文档

- [技术文档](./docs/技术文档.md) - 系统架构、合约设计和核心功能的技术详解
- [用户手册](./docs/用户手册.md) - 系统用户操作指南，适用于各类用户角色
- [开发部署指南](./docs/开发部署指南.md) - 详细的开发、测试和部署流程说明
- [主网部署指南](./docs/主网部署指南.md) - 主网部署的特殊注意事项和流程
- [常见问题(FAQ)](./docs/FAQ.md) - 常见问题解答
- [合约引用修复指南](./docs/修复指南.md) - 修复RealEstateSystem合约引用的详细操作流程

### 辅助文档

- [系统流程图](./docs/系统流程图.md) - 主要业务流程的可视化说明
- [角色功能表](./docs/角色功能表.md) - 系统角色及其权限说明

## 文档说明

### 适用读者

- **开发者**: 请主要参考[技术文档](./docs/技术文档.md)和[开发部署指南](./docs/开发部署指南.md)
- **管理员**: 请参考[用户手册](./docs/用户手册.md)的管理员部分和[主网部署指南](./docs/主网部署指南.md)
- **投资者/用户**: 请参考[用户手册](./docs/用户手册.md)的投资者和租金部分

### 文档版本

当前文档版本: v1.0.0 (2023年3月)

最近更新:
- 完善了所有文档内容
- 优化了部署指南
- 添加了FAQ章节
- 更新了主网部署相关说明

### 支持和反馈

如有任何问题或建议，请联系系统开发团队。

# 房产通证化系统修复指南

## 系统引用修复

在部署过程中，`RealEstateSystem`合约的组件引用出现了错误。目前已经进行了诊断并提供了解决方案。

### 问题诊断

经过验证，发现`RealEstateSystem`合约中的引用存在以下问题：

1. `PropertyRegistry`地址引用不正确 - 当前值指向了`FeeManager`
2. `TokenFactory`地址引用不正确 - 当前值指向了`PropertyRegistry`
3. 多个管理器地址为零地址（未正确设置）

### 修复方案

我们已经创建了脚本来生成新的合约实现并记录当前状态。修复需要手动执行以下步骤：

1. 使用超级管理员权限调用`RealEstateSystem`合约的`upgradeContract`函数
   ```solidity
   function upgradeContract(string memory contractName, address newImplementation) external onlySuperAdmin
   ```

2. 使用以下参数调用:
   - `contractName`: "RealEstateSystem" 
   - `newImplementation`: 参见生成的验证文件中的`newImplementation`地址

3. 升级后，调用`initialize`函数重新设置引用:
   ```solidity
   function initialize(
       address _roleManager,
       address _propertyRegistry,
       address _tokenFactory,
       address _rentDistributor,
       address _marketplace,
       address _tokenHolderQuery,
       uint256 _chainId
   ) public
   ```

4. 使用验证文件中的正确地址进行初始化

### 运行诊断

要生成最新的诊断信息和修复指南，请运行:

```bash
npx hardhat run scripts/manual-fix-reference.js --network <network>
```

该脚本将:
1. 部署新的实现合约
2. 生成详细的验证报告
3. 提供具体的修复步骤

### 验证修复

修复完成后，可以运行以下命令验证系统状态:

```bash
npx hardhat run scripts/verify-deployment.js --network <network>
```

## 预防措施

为防止未来出现类似问题，我们建议:

1. 在部署后立即运行验证脚本
2. 确保每次升级后都进行验证
3. 使用合约测试来验证组件之间的引用关系 