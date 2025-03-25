/**
 * 合约名称常量
 * 用于统一管理系统中所有合约的名称
 */
const CONTRACT_NAMES = {
  ROLE_MANAGER: 'RoleManager',
  PROPERTY_REGISTRY: 'PropertyRegistry',
  TOKEN_FACTORY: 'TokenFactory',
  REAL_ESTATE_TOKEN: 'RealEstateToken',
  REDEMPTION_MANAGER: 'RedemptionManager',
  RENT_DISTRIBUTOR: 'RentDistributor',
  FEE_MANAGER: 'FeeManager',
  MARKETPLACE: 'Marketplace',
  TOKEN_HOLDER_QUERY: 'TokenHolderQuery',
  REAL_ESTATE_SYSTEM: 'RealEstateSystem'
};

/**
 * 角色常量
 * 系统中定义的所有角色
 */
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  FEE_COLLECTOR: 'FEE_COLLECTOR',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  FINANCE: 'finance',
  EMERGENCY: 'emergency',
  USER: 'user'
};

/**
 * 操作权限配置 - 定义每种操作需要的角色
 */
const OPERATION_ROLES = {
  // 房产管理
  registerProperty: ROLES.OPERATOR,
  approveProperty: ROLES.ADMIN,
  rejectProperty: ROLES.ADMIN,
  delistProperty: ROLES.ADMIN,
  setPropertyStatus: ROLES.ADMIN,
  
  // 代币管理
  createToken: ROLES.ADMIN,
  updateTokenImplementation: ROLES.ADMIN,
  addToWhitelist: ROLES.OPERATOR,
  batchAddToWhitelist: ROLES.OPERATOR,
  removeFromWhitelist: ROLES.OPERATOR,
  batchRemoveFromWhitelist: ROLES.OPERATOR,
  
  // 赎回管理
  approveRedemption: ROLES.FINANCE,
  rejectRedemption: ROLES.FINANCE,
  completeRedemption: ROLES.FINANCE,
  addSupportedStablecoin: ROLES.ADMIN,
  removeSupportedStablecoin: ROLES.ADMIN,
  emergencyWithdraw: ROLES.EMERGENCY,
  
  // 租金管理
  distributeRent: ROLES.FINANCE,
  liquidateUnclaimedRent: ROLES.FINANCE
};

module.exports = {
  CONTRACT_NAMES,
  ROLES,
  OPERATION_ROLES
}; 