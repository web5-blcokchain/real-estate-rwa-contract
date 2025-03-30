# 缓存目录

## 概述

此目录用于存储系统运行过程中生成的缓存文件，如ABI缓存、网络状态缓存等。这些缓存文件可以提高系统性能，避免重复计算和网络请求。

## 主要缓存文件

| 文件名 | 说明 | 清理策略 |
|--------|------|-----------|
| `abi-cache.json` | 合约ABI缓存 | 合约更新时自动重建 |
| `network-cache.json` | 网络连接状态缓存 | 定期自动刷新 |
| `price-cache.json` | 价格数据缓存 | 每24小时自动刷新 |

## 缓存管理

### 清理缓存

在遇到以下情况时，建议清理缓存：

1. 合约代码或ABI发生变更
2. 系统行为异常
3. 缓存文件过大（超过500KB）

清理缓存的方法：

```bash
# 清理所有缓存
rm -f shared/cache/*.json

# 只清理ABI缓存
rm -f shared/cache/abi-cache.json
```

### 缓存设置

缓存的过期时间和刷新策略可以在 `shared/utils/cache.js` 中配置：

```javascript
// 配置项示例
const cacheConfig = {
  abi: {
    expiry: 7 * 24 * 60 * 60 * 1000, // 7天
    autoRefresh: false
  },
  network: {
    expiry: 1 * 60 * 60 * 1000, // 1小时
    autoRefresh: true
  }
};
```

## 注意事项

- 缓存文件不应提交到版本控制系统
- 开发环境可能需要更频繁地清理缓存
- 生产环境应谨慎清理缓存，避免影响系统性能 