# 配置模块 (Config Module)

配置模块包含系统的各种配置文件，包括部署信息、合约ABI、网络配置等。此目录的内容主要由部署脚本自动生成或更新。

## 目录结构

```
config/
├── abi/                # 合约ABI目录
│   ├── RealEstateFacade.json   # 门面合约ABI
│   ├── PropertyManager.json    # 房产管理合约ABI
│   ├── PropertyToken.json      # 房产代币合约ABI
│   ├── RoleManager.json        # 角色管理合约ABI
│   ├── RewardManager.json      # 奖励管理合约ABI
│   ├── RealEstateSystem.json   # 系统合约ABI
│   └── TradingManager.json     # 交易管理合约ABI
├── deployment.json     # 部署信息配置
├── implementations.json # 代理合约实现地址配置
└── README.md           # 本文档
```

## 主要文件说明

### 部署信息 (`deployment.json`)

`deployment.json` 文件存储系统部署的关键信息，包括合约地址、部署网络、部署时间等：

```json
{
  "network": "sepolia",
  "timestamp": "2023-04-01T10:32:58.237Z",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "contracts": {
    "SimpleERC20": "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
    "RoleManager": "0x59b670e9fA9D0A427751Af201D676719a970857b",
    "PropertyManager": "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
    "TradingManager": "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
    "RewardManager": "0x67d269191c92Caf3cD7723F116c85e6E9bf55933",
    "PropertyToken": "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
    "System": "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
    "Facade": "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB"
  },
  "systemStatus": "1",
  "deployMethod": "step-by-step",
  "implementations": {
    "RoleManager": "0x9A676e781A523b5d0C0e43731313A708CB607508",
    "PropertyManager": "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
    "TradingManager": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    "RewardManager": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
    "PropertyToken": "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
    "System": "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
    "Facade": "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
  }
}
```

**字段说明：**

- `network`: 部署的网络名称（localhost, sepolia, mainnet等）
- `timestamp`: 部署时间
- `deployer`: 部署者地址
- `contracts`: 各合约的代理地址
- `systemStatus`: 系统状态（1: Active, 2: Paused, 3: Emergency）
- `deployMethod`: 部署方法（默认: step-by-step）
- `implementations`: 可升级合约的实现地址

### 合约ABI (`abi/`)

`abi/` 目录存储所有智能合约的ABI（应用程序二进制接口）。这些ABI文件在部署过程中自动生成，用于前端和服务器与智能合约进行交互。

每个合约的ABI文件名与合约名称完全相同，例如 `RealEstateFacade.json`。

### 代理实现地址 (`implementations.json`)

`implementations.json` 文件存储可升级合约的实现地址，方便升级追踪和管理：

```json
{
  "RoleManager": "0x9A676e781A523b5d0C0e43731313A708CB607508",
  "PropertyManager": "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
  "TradingManager": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  "RewardManager": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  "PropertyToken": "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  "System": "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
  "Facade": "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
}
```

## 使用方法

### 在部署脚本中使用

在部署脚本中，配置模块的文件通常作为输出结果：

```javascript
// scripts/deploy-step.js
async function main() {
  // 部署合约...
  
  // 生成部署信息
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      SimpleERC20: await testToken.getAddress(),
      RoleManager: await contracts.roleManager.getAddress(),
      // ...其他合约地址
    },
    systemStatus: "1",
    deployMethod: "step-by-step",
    implementations: await getImplementationAddresses(/* 参数 */)
  };

  // 保存部署信息
  const deploymentPath = path.join(__dirname, '../config/deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  // 导出合约ABI
  await exportContractABIs([
    "RealEstateSystem",
    "RealEstateFacade",
    // ...其他合约名称
  ]);
}
```

### 在应用程序中使用

在前端或后端应用程序中，配置模块的文件通常作为输入参数：

```javascript
// 在服务端代码中
const fs = require('fs');
const path = require('path');

// 读取部署信息
const deploymentInfo = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/deployment.json'), 'utf8')
);

// 读取合约ABI
const facadeAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/abi/RealEstateFacade.json'), 'utf8')
);

// 创建合约实例
const facadeContract = new ethers.Contract(
  deploymentInfo.contracts.Facade,
  facadeAbi,
  provider
);
```

## 注意事项

1. **不要手动修改** 这些配置文件，它们是由部署脚本自动生成的。手动更改可能导致系统不一致。

2. **备份重要配置**：每次部署后，建议备份 `deployment.json` 和 `implementations.json` 文件。

3. **版本控制**：通常 `abi/` 目录下的文件应纳入版本控制，但 `deployment.json` 和 `implementations.json` 取决于部署环境，可能需要针对不同环境维护不同版本。

4. **网络适配**：部署到不同网络时，会生成不同的 `deployment.json` 文件，应确保应用程序能够根据目标网络加载正确的配置。

## 开发指南

### 添加新合约

当添加新合约时，需要更新部署脚本以确保新合约的ABI被正确导出：

1. 在 `scripts/deploy-step.js` 中添加新合约的部署代码
2. 在 `exportContractABIs` 函数调用中添加新合约的名称
3. 修改 `getImplementationAddresses` 函数以包含新合约的实现地址

### 自定义配置文件格式

如需修改配置文件格式或添加新的配置文件，应同时更新相关的部署脚本和使用这些配置的代码。 