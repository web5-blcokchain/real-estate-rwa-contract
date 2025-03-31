# 环境变量与常量说明文档

## 环境变量简介
本文档说明项目中使用的环境变量，特别是关于角色管理和合约部署的标准化配置。

## 环境变量标准化原则

### 角色私钥 vs 角色地址
在本项目中，我们标准化了环境变量的使用方式，主要使用私钥而非地址进行角色授权：

- **私钥环境变量** (`*_PRIVATE_KEY`): 用于创建特定角色的钱包实例，系统主要使用这些私钥进行交易和角色授权
- **地址环境变量**: 仅保留了`MARKETPLACE_ADDRESS`用于监控系统，其他地址环境变量已移除

## 关键环境变量

### 必要的私钥（当前系统实际使用的私钥）
以下是系统中实际使用的关键私钥：
```
ADMIN_PRIVATE_KEY=0x...         # 管理员私钥，用于一般管理操作
SUPER_ADMIN_PRIVATE_KEY=0x...   # 超级管理员私钥，用于高权限管理操作
PROPERTY_MANAGER_PRIVATE_KEY=0x... # 属性管理员私钥，用于注册和管理不动产属性
TOKEN_MANAGER_PRIVATE_KEY=0x...  # 代币管理员私钥，用于代币管理操作
DEPLOYER_PRIVATE_KEY=0x...      # 部署者账户的私钥，用于部署合约
OPERATOR_PRIVATE_KEY=0x...      # 操作者私钥，用于HTTP服务器操作
```

### 监控配置
以下地址用于监控系统：
```
MARKETPLACE_ADDRESS=0x...        # 市场合约地址，主要用于监控系统
```

### 已移除的未使用私钥
以下私钥在当前代码中未实际使用，已从.env中移除以简化配置（但仍保留在.env.example作为参考）：
```
FEE_MANAGER_PRIVATE_KEY         # 费用管理员私钥
RENT_MANAGER_PRIVATE_KEY        # 租金管理员私钥
REDEMPTION_MANAGER_PRIVATE_KEY  # 赎回管理员私钥
MARKETPLACE_MANAGER_PRIVATE_KEY # 市场管理员私钥
FEE_COLLECTOR_PRIVATE_KEY       # 费用收集私钥
USER_PRIVATE_KEY               # 用户私钥
FINANCE_PRIVATE_KEY            # 财务私钥
EMERGENCY_PRIVATE_KEY          # 紧急操作私钥
```

## 常量模块化

为避免在代码中硬编码值，我们创建了以下常量模块：

### 角色常量模块 (`scripts/utils/roles.js`)

提供标准化的角色管理常量和函数：

```javascript
const { ROLES, getRoleHash, getRoleAddress, grantRole, hasRole } = require('./utils/roles');

// 角色常量示例
ROLES.DEFAULT_ADMIN    // 默认管理员角色
ROLES.SUPER_ADMIN      // 超级管理员角色
ROLES.MINTER           // 铸币角色
ROLES.PROPERTY_MANAGER // 属性管理员角色

// 授予角色示例
await grantRole(roleManager, ROLES.PROPERTY_MANAGER, address);

// 检查角色示例
const hasRole = await hasRole(roleManager, ROLES.MINTER, address);
```

### 通用常量模块 (`scripts/utils/constants.js`)

提供其他通用常量，避免硬编码：

```javascript
const { PROXY_SLOTS, ZERO_ADDRESS, ERC20_ROLES, TEST_CONFIG } = require('./utils/constants');

// 代理存储槽常量
PROXY_SLOTS.IMPLEMENTATION_SLOT  // EIP-1967实现合约存储槽

// 零地址常量
ZERO_ADDRESS  // 0x0000...0000

// 测试配置常量
TEST_CONFIG.PROPERTY.DEFAULT_COUNTRY  // 默认国家
TEST_CONFIG.TOKEN.DEFAULT_DECIMALS    // 默认小数位数
TEST_CONFIG.FEES.TRADING_FEE          // 默认交易费率
```

## 最佳实践

1. **使用角色模块**: 所有脚本应导入并使用 `scripts/utils/roles.js` 模块进行角色管理
2. **使用常量模块**: 使用 `scripts/utils/constants.js` 获取通用常量
3. **避免硬编码**: 绝不在脚本中硬编码角色哈希值或其他魔术数字
4. **标准化命名**: 使用常量模块确保命名一致性
5. **私钥优先**: 使用私钥环境变量而不是地址环境变量
6. **扩展常量**: 如需添加新常量，应添加到适当的常量模块中，而非在代码中硬编码
7. **最小权限**: 仅保留实际需要的私钥环境变量，避免不必要的配置 