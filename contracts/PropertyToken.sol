// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

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
 * @title PropertyToken
 * @dev 优化的房产代币合约，继承自ERC20标准
 * 权限说明：
 * - ADMIN: 最高权限，包含所有权限
 * - MANAGER: 管理权限，包含OPERATOR权限
 * - OPERATOR: 基础操作权限
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
        string indexed propertyId,
        string name,
        string symbol,
        uint256 initialSupply,
        address indexed admin,
        address indexed system,
        uint40 initTime
    );

    /**
     * @dev Initializes the contract with property details and initial supply - 需要OPERATOR权限
     */
    function initialize(
        string memory _propertyId,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _admin,
        address _systemAddress
    ) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        
        system.validateRole(RoleConstants.OPERATOR_ROLE, msg.sender);
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Snapshot_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        propertyId = _propertyId;
        uint256 defaultMaxSupply = 1000000000;
        maxSupply = defaultMaxSupply.mul(10**decimals()); // Default 1 billion tokens

        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }

        emit PropertyTokenInitialized(
            _propertyId,
            _name,
            _symbol,
            _initialSupply,
            _admin,
            _systemAddress,
            uint40(block.timestamp)
        );
    }

    /**
     * @dev Creates a snapshot of the current token balances - 需要OPERATOR权限
     */
    function snapshot() external returns (uint256) {
        system.validateRole(RoleConstants.OPERATOR_ROLE, msg.sender);
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId, uint40(block.timestamp));
        return snapshotId;
    }

    /**
     * @dev Updates the maximum supply of tokens - 需要ADMIN权限
     */
    function updateMaxSupply(uint256 _newMaxSupply) external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(_newMaxSupply >= totalSupply(), "New max supply must be >= current total supply");
        
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _newMaxSupply;
        
        emit MaxSupplyUpdated(oldMaxSupply, _newMaxSupply, uint40(block.timestamp));
    }

    /**
     * @dev Adds an account to the blacklist - 需要MANAGER权限
     */
    function blacklist(address _account) external {
        system.validateRole(RoleConstants.MANAGER_ROLE, msg.sender);
        require(!blacklisted[_account], "Account already blacklisted");
        blacklisted[_account] = true;
        emit Blacklisted(_account, uint40(block.timestamp));
    }

    /**
     * @dev Removes an account from the blacklist - 需要MANAGER权限
     */
    function unBlacklist(address _account) external {
        system.validateRole(RoleConstants.MANAGER_ROLE, msg.sender);
        require(blacklisted[_account], "Account not blacklisted");
        blacklisted[_account] = false;
        emit UnBlacklisted(_account, uint40(block.timestamp));
    }

    /**
     * @dev Pauses token transfers - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        _pause();
    }

    /**
     * @dev Unpauses token transfers - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
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
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(!system.emergencyMode(), "Emergency mode active");
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
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
}