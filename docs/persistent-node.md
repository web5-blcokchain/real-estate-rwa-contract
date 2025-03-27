# 使用持久化Hardhat节点

## 概述

在开发过程中，使用持久化的Hardhat节点可以保持部署状态，避免每次测试时重新部署合约。这对于开发和测试特别有用，因为您可以保持合约状态和数据，而不是每次都从头开始。

## 启动持久化节点

```bash
# 在一个独立的终端窗口中启动Hardhat节点
npx hardhat node
```

节点启动后会显示可用的测试账户及其私钥，并保持运行状态，直到您手动停止它。

## 部署到持久化节点

使用`localhost`网络标识符连接到持久化节点：

```bash
# 部署合约到持久化节点
./deploy.sh localhost --strategy=upgradeable
```

这将把合约部署到正在运行的节点，合约状态将保持不变，直到节点停止运行。

## 测试部署

部署完成后，您可以运行测试脚本来验证部署：

```bash
# 测试部署
npx hardhat run --network localhost scripts/test/deployment-test.js
```

如果测试失败，可能需要使用授权脚本修复角色问题：

```bash
# 授予必要的角色
npx hardhat run --network localhost scripts/test/grant-roles.js
```

## 开发工作流程

1. 启动持久化节点（一次性）
2. 部署合约到节点
3. 运行测试确认部署成功
4. 进行开发和调试
5. 如果需要，可以升级合约而不丢失状态

## 与前端开发集成

前端应用可以直接连接到持久化节点：

```javascript
// 前端应用配置
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
```

## 常见问题

### 节点重启后数据丢失

持久化节点的数据仅在当前会话中保存。如果节点停止，所有区块链状态将丢失。

### 角色授权问题

如果遇到角色授权问题，可以使用`grant-roles.js`脚本授予必要的角色：

```bash
npx hardhat run --network localhost scripts/test/grant-roles.js
```

### 网络配置

确保`hardhat.config.js`和项目配置文件中正确配置了`localhost`网络：

```javascript
// hardhat.config.js
{
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545', 
      chainId: 31337
    }
  }
}
```

## 最佳实践

1. 在开发过程中保持节点运行
2. 使用不同的终端窗口运行部署和测试命令
3. 记录部署的合约地址，这些地址在节点运行期间保持不变
4. 在进行重大更改前，备份部署记录文件

## 总结

使用持久化的Hardhat节点可以显著提高开发效率，避免重复部署合约的时间开销，同时保持一致的测试环境。 