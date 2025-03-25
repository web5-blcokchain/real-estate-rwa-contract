/**
 * 合约ABI索引文件
 * 
 * 此文件用于集中管理所有合约的ABI定义，当前版本仅包含事件定义
 * 后续可以扩展为完整的ABI，包括函数和状态变量等
 */

// 角色管理合约ABI
const roleManagerABI = [
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event VersionUpdated(uint256 version)"
];

// 房产注册合约ABI
const propertyRegistryABI = [
  "event PropertyCreated(uint256 indexed propertyId, address indexed creator)",
  "event PropertyStatusChanged(uint256 indexed propertyId, uint8 oldStatus, uint8 newStatus, address operator)",
  "event PropertyApproved(uint256 indexed propertyId)",
  "event PropertyRejected(uint256 indexed propertyId, string reason)",
  "event TokenRegistered(uint256 indexed propertyId, address indexed tokenAddress)",
  "event VersionUpdated(uint256 version)"
];

// 代币工厂合约ABI
const tokenFactoryABI = [
  "event TokenCreated(address indexed tokenAddress, uint256 indexed propertyId, string name, string symbol)",
  "event WhitelistStatusChanged(address indexed token, bool status)",
  "event VersionUpdated(uint256 version)"
];

// 房产代币合约ABI (通用ERC20代币事件)
const tokenABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event WhitelistAdded(address indexed account)",
  "event WhitelistRemoved(address indexed account)",
  "event TokenFrozen(uint256 indexed propertyId)",
  "event TokenUnfrozen(uint256 indexed propertyId)",
  "event VersionUpdated(uint256 version)"
];

// 市场合约ABI
const marketplaceABI = [
  "event OrderCreated(uint256 indexed orderId, address indexed token, address seller, uint256 amount, uint256 price)",
  "event OrderCancelled(uint256 indexed orderId)",
  "event OrderFilled(uint256 indexed orderId, address buyer, uint256 amount)",
  "event FeeCollected(address token, uint256 amount)",
  "event EmergencyWithdraw(address token, address to, uint256 amount)",
  "event VersionUpdated(uint256 version)"
];

// 租金分发合约ABI
const rentDistributorABI = [
  "event RentDistributed(address indexed token, uint256 amount, uint256 timestamp)",
  "event RentClaimed(address indexed token, address indexed claimer, uint256 amount)",
  "event UnclaimedRentLiquidated(address indexed token, uint256 amount)",
  "event VersionUpdated(uint256 version)"
];

// 赎回管理合约ABI
const redemptionManagerABI = [
  "event RedemptionRequested(uint256 indexed requestId, address indexed token, address requester, uint256 amount)",
  "event RedemptionApproved(uint256 indexed requestId, address approver, uint256 stablecoinAmount)",
  "event RedemptionCompleted(uint256 indexed requestId)",
  "event RedemptionRejected(uint256 indexed requestId, string reason)",
  "event VersionUpdated(uint256 version)"
];

// 代币持有者查询合约ABI
const tokenHolderQueryABI = [
  "event VersionUpdated(uint256 version)"
];

// 系统合约ABI
const realEstateSystemABI = [
  "event ReferenceUpdated(string name, address oldAddress, address newAddress)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 version)"
];

// 导出所有合约ABI的映射表
module.exports = {
  roleManager: roleManagerABI,
  propertyRegistry: propertyRegistryABI,
  tokenFactory: tokenFactoryABI,
  token: tokenABI,
  marketplace: marketplaceABI,
  rentDistributor: rentDistributorABI,
  redemptionManager: redemptionManagerABI,
  tokenHolderQuery: tokenHolderQueryABI,
  realEstateSystem: realEstateSystemABI
}; 