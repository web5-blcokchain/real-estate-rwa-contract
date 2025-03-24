# 日本房产通证化系统API文档

本文档详细描述了系统中各个合约提供的主要函数接口，供开发者集成和调用。

## 1. RealEstateSystem

系统的主合约，负责管理和协调其他合约。

### 1.1 初始化函数

#### initialize
初始化系统合约。

```solidity
function initialize() external initializer
```