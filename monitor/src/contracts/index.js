/**
 * 合约ABI索引文件
 * 
 * 此文件由 update-abis.js 脚本自动生成
 * 包含所有合约的事件定义
 * 
 * 生成时间: 2025-03-25T04:45:58.887Z
 */

// feeManager 合约ABI
const feeManagerABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event FeeCollected(uint8 indexed feeType, uint256 amount, address from)",
  "event FeeCollectorUpdated(address oldCollector, address newCollector)",
  "event FeeManagerInitialized(address deployer, address roleManager, uint256 version)",
  "event FeeUpdated(uint8 indexed feeType, uint256 oldValue, uint256 newValue)",
  "event FeeWithdrawn(address to, uint256 amount)",
  "event Initialized(uint8 version)",
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// marketplace 合约ABI
const marketplaceABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event EmergencyWithdraw(address indexed admin, address indexed token, uint256 amount)",
  "event Initialized(uint8 version)",
  "event MarketplaceInitialized(address deployer, address roleManager, address feeManager, uint256 version)",
  "event MarketplacePaused(address indexed admin)",
  "event MarketplaceUnpaused(address indexed admin)",
  "event OrderCancelled(uint256 indexed orderId, address indexed seller)",
  "event OrderCreated(uint256 indexed orderId, address indexed seller, address tokenAddress, uint256 tokenAmount, uint256 price, address stablecoin)",
  "event OrderFulfilled(uint256 indexed orderId, address indexed buyer, uint256 price)",
  "event PriceUpdated(uint256 indexed orderId, uint256 oldPrice, uint256 newPrice)",
  "event StablecoinStatusUpdated(address indexed token, bool status)",
  "event TradingFeeCollected(uint256 orderId, uint256 feeAmount, address feeToken)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// propertyRegistry 合约ABI
const propertyRegistryABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event AuthorizedContractUpdated(address indexed contractAddress, bool isAuthorized)",
  "event BeaconUpgraded(address indexed beacon)",
  "event Initialized(uint8 version)",
  "event PropertyApproved(string indexed propertyId, address approver)",
  "event PropertyDelisted(string indexed propertyId, address delister)",
  "event PropertyRegistered(string indexed propertyId, string country, string metadataURI)",
  "event PropertyRegistryInitialized(address deployer, address roleManager, uint256 version, uint256 chainId)",
  "event PropertyRejected(string indexed propertyId, address rejecter, string reason)",
  "event PropertyStatusTransition(string indexed propertyId, uint8 oldStatus, uint8 newStatus, address indexed changer)",
  "event PropertyStatusUpdated(string indexed propertyId, uint8 newStatus)",
  "event TokenRegistered(string indexed propertyId, address tokenAddress)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// realEstateSystem 合约ABI
const realEstateSystemABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event ContractUpgraded(string contractName, address newImplementation)",
  "event Initialized(uint8 version)",
  "event Paused(address account)",
  "event RealEstateSystemInitialized(address systemOwner, address roleManager, address propertyRegistry, address tokenFactory, address marketplace, address redemptionManager, address rentDistributor, uint256 chainId, uint256 version)",
  "event SystemStatusChanged(bool active)",
  "event Unpaused(address account)",
  "event Upgraded(address indexed implementation)",
];

// token 合约ABI
const tokenABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event BatchTransferCompleted(address indexed sender, uint256 successCount, uint256 failureCount)",
  "event BatchTransferFailures(address indexed sender, address[] recipients, uint256[] amounts, string[] reasons, uint256 failureCount)",
  "event BeaconUpgraded(address indexed beacon)",
  "event Initialized(uint8 version)",
  "event MaxSupplyUpdated(uint256 indexed oldMaxSupply, uint256 indexed newMaxSupply)",
  "event Paused(address account)",
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event Snapshot(uint256 id)",
  "event TokenFrozen(string propertyId)",
  "event TokenInitialized(string propertyId, address admin, uint256 version)",
  "event TokenUnfrozen(string propertyId)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event TransferRestrictionUpdated(bool restricted)",
  "event Unpaused(address account)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
  "event WhitelistBatchUpdated(uint256 count, bool status)",
  "event WhitelistEnabledUpdated(bool indexed enabled)",
  "event WhitelistUpdated(address indexed user, bool status)",
];

// redemptionManager 合约ABI
const redemptionManagerABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event Initialized(uint8 version)",
  "event RedemptionApproved(uint256 indexed requestId, address indexed approver, uint256 stablecoinAmount)",
  "event RedemptionCancelled(uint256 indexed requestId, address indexed canceller)",
  "event RedemptionCompleted(uint256 indexed requestId, address indexed completer)",
  "event RedemptionFeeCollected(uint256 requestId, uint256 feeAmount, address feeToken)",
  "event RedemptionManagerInitialized(address deployer, address roleManager, address feeManager, address propertyRegistry, uint256 version)",
  "event RedemptionPeriodUpdated(uint256 oldPeriod, uint256 newPeriod)",
  "event RedemptionRejected(uint256 indexed requestId, address indexed rejecter, string reason)",
  "event RedemptionRequested(uint256 indexed requestId, address indexed requester, uint256 indexed propertyId, address tokenAddress, uint256 tokenAmount)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// rentDistributor 合约ABI
const rentDistributorABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event AllUnclaimedLiquidated(address indexed recipient, uint256 totalAmount)",
  "event BeaconUpgraded(address indexed beacon)",
  "event DistributionUnclaimedMarked(uint256 indexed distributionId, address indexed stablecoin, uint256 amount)",
  "event Initialized(uint8 version)",
  "event LiquidationFailed(address indexed stablecoin, uint256 amount, string reason)",
  "event Paused(address account)",
  "event RentClaimed(uint256 distributionId, address user, uint256 amount)",
  "event RentDistributorInitialized(address deployer, address roleManager, address feeManager, uint256 version)",
  "event RentProcessed(uint256 distributionId, uint256 platformFee, uint256 maintenanceFee, uint256 netAmount)",
  "event RentReceived(uint256 distributionId, string propertyId, address stablecoin, uint256 amount, string rentalPeriod)",
  "event StablecoinStatusUpdated(address indexed token, bool status)",
  "event UnclaimedRentLiquidated(address indexed recipient, address indexed stablecoin, uint256 amount)",
  "event Unpaused(address account)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// roleManager 合约ABI
const roleManagerABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event EmergencyAdminRecovery(address indexed deployer)",
  "event EmergencyRoleGranted(address indexed deployer, bytes32 indexed role, address indexed account)",
  "event Initialized(uint8 version)",
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleManagerInitialized(address deployer, uint256 version)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event Upgraded(address indexed implementation)",
  "event VersionUpdated(uint256 oldVersion, uint256 newVersion)",
];

// tokenFactory 合约ABI
const tokenFactoryABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event Initialized(uint8 version)",
  "event TokenCreated(string propertyId, address tokenAddress, string name, string symbol)",
  "event TokenImplementationUpdated(address oldImplementation, address newImplementation)",
  "event Upgraded(address indexed implementation)",
];

// tokenHolderQuery 合约ABI
const tokenHolderQueryABI = [
  "event AdminChanged(address previousAdmin, address newAdmin)",
  "event BeaconUpgraded(address indexed beacon)",
  "event HolderBalanceQueried(address indexed token, uint256 snapshotId, address holder, uint256 balance)",
  "event Initialized(uint8 version)",
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event Upgraded(address indexed implementation)",
];

// 导出所有合约ABI的映射表
module.exports = {
  feeManager: feeManagerABI,
  marketplace: marketplaceABI,
  propertyRegistry: propertyRegistryABI,
  realEstateSystem: realEstateSystemABI,
  token: tokenABI,
  redemptionManager: redemptionManagerABI,
  rentDistributor: rentDistributorABI,
  roleManager: roleManagerABI,
  tokenFactory: tokenFactoryABI,
  tokenHolderQuery: tokenHolderQueryABI,
};
