// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./utils/SafeMath.sol";

/**
 * @title PropertyToken - 日本房产资产代币化合约
 * @author Fashi Shijian团队
 * @notice 本合约实现了单个房产资产的代币化，将实物房产转化为可交易的数字资产代币
 * 
 * @dev 合约功能描述：
 * 1. 资产代币化：基于ERC20标准将房产价值转化为可分割、可交易的代币
 * 2. 代币供应管理：控制代币的最大供应量，支持动态调整
 * 3. 安全特性：
 *    - 实现黑名单机制，防止恶意账户参与交易
 *    - 支持暂停功能，应对紧急情况
 *    - 支持快照功能，记录特定时间点的代币分布状态
 * 4. 合规要求：满足日本房产法规的相关要求，支持KYC/AML合规
 * 5. 可升级性：支持合约升级，确保系统可持续发展
 * 
 * @dev 继承关系：
 * - ERC20Upgradeable：提供标准ERC20代币功能
 * - ERC20BurnableUpgradeable：支持代币销毁
 * - ERC20SnapshotUpgradeable：支持代币余额快照
 * - PausableUpgradeable：支持紧急暂停功能
 * - UUPSUpgradeable：支持可升级合约模式
 * 
 * @dev 与其他模块的关联：
 * - RealEstateSystem：依赖核心系统合约进行权限验证
 * - PropertyManager：由资产管理合约创建和部署
 * - TradingManager：与交易管理合约协作，支持代币交易和转移
 * 
 * @dev 权限控制：
 * - ADMIN：可管理最大供应量、暂停/恢复代币交易、升级合约
 * - MANAGER：可管理黑名单、监控代币流动
 * - OPERATOR：可创建代币快照、查询代币状态
 * 
 * @dev 业务规则：
 * - 代币总量取决于房产估值和代币化比例
 * - 代币转移受黑名单和暂停状态的限制
 * - 最大供应量不可低于当前流通量
 * 
 * @dev 部署流程：
 * - 由PropertyManager合约在房产注册时创建
 * - 初始代币分配给房产所有者或平台
 * - 后续通过二级市场流通
 */
contract PropertyToken is 
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20SnapshotUpgradeable,
    PausableUpgradeable {

    using SafeMath for uint256;

    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;

    // Token information structure
    struct TokenInfo {
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 price;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 lockupPeriod;
    }

    // Property ID
    string public propertyId;

    // Maximum supply
    uint256 public maxSupply;

    // Blacklist mapping
    mapping(address => bool) public blacklisted;

    // System contract reference
    RealEstateSystem public system;

    // 事件 - 优化事件定义
    event Blacklisted(
        address indexed account,
        uint40 updateTime
    );
    event UnBlacklisted(
        address indexed account,
        uint40 updateTime
    );
    event MaxSupplyUpdated(
        uint256 oldMaxSupply,
        uint256 newMaxSupply,
        uint40 updateTime
    );
    event SnapshotCreated(
        uint256 indexed snapshotId,
        uint40 createTime
    );
    event PropertyTokenInitialized(
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 price,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 lockupPeriod,
        uint40 initTime
    );

    /**
     * @dev Initializes the contract with property details and initial supply - 需要OPERATOR权限
     */
    function initialize(
        RealEstateSystem _system,
        string memory _propertyId,
        uint256 _initialSupply,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Snapshot_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        system = _system;
        propertyId = _propertyId;
        maxSupply = _initialSupply;
        _mint(msg.sender, _initialSupply);

        emit PropertyTokenInitialized(
            _name,
            _symbol,
            _initialSupply,
            0,  // price
            0,  // minInvestment
            0,  // maxInvestment
            0,  // lockupPeriod
            uint40(block.timestamp)
        );
    }

    /**
     * @dev Creates a snapshot of the current token balances - 需要OPERATOR权限
     */
    function snapshot() external {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        _snapshot();
    }

    /**
     * @dev Updates the maximum supply of tokens - 需要ADMIN权限
     */
    function updateMaxSupply(uint256 _newMaxSupply) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_newMaxSupply >= totalSupply(), "New max supply must be >= current total supply");
        
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _newMaxSupply;
        
        emit MaxSupplyUpdated(oldMaxSupply, _newMaxSupply, uint40(block.timestamp));
    }

    /**
     * @dev Adds an account to the blacklist - 需要MANAGER权限
     */
    function blacklist(address _account) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(!blacklisted[_account], "Account already blacklisted");
        blacklisted[_account] = true;
        emit Blacklisted(_account, uint40(block.timestamp));
    }

    /**
     * @dev Removes an account from the blacklist - 需要MANAGER权限
     */
    function unBlacklist(address _account) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(blacklisted[_account], "Account not blacklisted");
        blacklisted[_account] = false;
        emit UnBlacklisted(_account, uint40(block.timestamp));
    }

    /**
     * @dev Pauses token transfers - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }

    /**
     * @dev Unpauses token transfers - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, ERC20SnapshotUpgradeable) whenNotPaused {
        require(!blacklisted[from] && !blacklisted[to], "Blacklisted address");
        require(totalSupply() + (from == address(0) ? amount : 0) <= maxSupply, "Exceeds max supply");
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract - 需要ADMIN权限
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
    }

    /**
     * @dev Returns the version of the contract
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }

    /**
     * @dev Updates the system contract reference - 需要ADMIN权限
     */
    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;

    // 用户操作（不需要角色权限）
    function balanceOf(address account) public view virtual override returns (uint256) {
        return super.balanceOf(account);
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return super.allowance(owner, spender);
    }
}