# Japanese Real Estate Tokenization Platform Documentation

This documentation center provides comprehensive technical and user documentation for the Japanese Real Estate Tokenization Platform, including backend services, smart contracts, deployment guides, and usage instructions.

## Project Overview

[Project Homepage](../../README.md) - System introduction and architecture overview

## Backend Service Documentation

The backend service interacts with Ethereum smart contracts to manage property registration, tokenization, redemption, and rent distribution. See [Backend Service Documentation](../README.md) for details.

### Key Features

- Property Management - Registration, approval, delisting
- Token Management - Token creation, whitelist management
- Redemption Management - Handling redemption requests
- Rent Management - Rent distribution and collection
- Role-based operation permission system

## System Core Documents

| Document | Description |
|---------|------|
| [System Flowchart](../../docs/系统流程图.md) | Displays interaction flow between system components |
| [Technical Documentation](../../docs/技术文档.md) | Detailed technical implementation documentation |
| [Role Function Table](../../docs/角色功能表.md) | System roles and their corresponding permissions |

## User Guides

| Document | Description |
|---------|------|
| [User Manual](../../docs/用户手册.md) | End-user guide |
| [FAQ](../../docs/FAQ.md) | Frequently asked questions |

## Deployment and Maintenance

| Document | Description |
|---------|------|
| [Development Deployment Guide](../../docs/开发部署指南.md) | Development environment setup and instructions |
| [Mainnet Deployment Guide](../../docs/主网部署指南.md) | Production environment deployment process and considerations |
| [Repair Guide](../../docs/修复指南.md) | Methods for fixing common issues and system maintenance |

## Backend Service Architecture

The backend service is built with Node.js and Express, with main components including:

1. **Configuration Management**: Managing environment variables, network configuration, and role permissions
2. **Multi-role Private Key Management**: Using different private keys for signing based on operation type
3. **Contract Service Layer**: Encapsulating interaction logic with Ethereum smart contracts
4. **Controllers and Routes**: Handling HTTP requests and defining API endpoints
5. **Authentication and Error Handling**: API key authentication and unified error handling

For detailed backend architecture and directory structure, refer to [Backend Service Documentation](../README.md#project-structure).

## Contract and Backend Interaction

The backend service interacts with Ethereum smart contracts using the `ethers.js` library. When handling specific operations, the system automatically selects the corresponding role's private key for signing based on the operation type (defined in `operationRoles` in `config/index.js`).

For example, when handling property approval operations, the system uses the admin private key; when handling rent distribution, it uses the finance private key.

For detailed contract interaction processes and role definitions, refer to:
- [Role Function Table](../../docs/角色功能表.md)
- [System Flowchart](../../docs/系统流程图.md)

## Testing and Maintenance

The system provides unit tests and integration tests, which can be run with:

```bash
npm test
```

For system maintenance or fixing common issues, refer to the [Repair Guide](../../docs/修复指南.md).

## Document Navigation

For Chinese documentation, see [中文文档导航](./文档导航.md). 