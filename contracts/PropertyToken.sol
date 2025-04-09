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

    // Property ID hash
    bytes32 public propertyIdHash;

    // Maximum supply
    uint256 public maxSupply;

    // Blacklist mapping
    mapping(address => bool) public blacklisted;

    // System contract reference
    RealEstateSystem public system;

    // Events
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event SnapshotCreated(uint256 snapshotId);

    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(system.checkRole(RoleConstants.ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(system.checkRole(RoleConstants.OPERATOR_ROLE, msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 修饰器：只有UPGRADER角色可以调用
     */
    modifier onlyUpgrader() {
        require(system.checkRole(RoleConstants.UPGRADER_ROLE, msg.sender), "Not upgrader");
        _;
    }
    
    /**
     * @dev 修饰器：只有PAUSER角色可以调用
     */
    modifier onlyPauser() {
        require(system.checkRole(RoleConstants.PAUSER_ROLE, msg.sender), "Not pauser");
        _;
    }

    /**
     * @dev Initializes the contract with property details and initial supply
     */
    function initialize(
        bytes32 _propertyIdHash,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _admin,
        address _systemAddress
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Snapshot_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);

        propertyIdHash = _propertyIdHash;
        uint256 defaultMaxSupply = 1000000000;
        maxSupply = defaultMaxSupply.mul(10**decimals()); // Default 1 billion tokens

        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }
    }

    /**
     * @dev Creates a snapshot of the current token balances
     */
    function snapshot() external onlyOperator returns (uint256) {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }

    /**
     * @dev Updates the maximum supply of tokens
     */
    function updateMaxSupply(uint256 _newMaxSupply) external onlyAdmin {
        require(_newMaxSupply >= totalSupply(), "New max supply must be >= current total supply");
        maxSupply = _newMaxSupply;
        emit MaxSupplyUpdated(_newMaxSupply);
    }

    /**
     * @dev Adds an account to the blacklist
     */
    function blacklist(address _account) external onlyAdmin {
        require(!blacklisted[_account], "Account already blacklisted");
        blacklisted[_account] = true;
        emit Blacklisted(_account);
    }

    /**
     * @dev Removes an account from the blacklist
     */
    function unBlacklist(address _account) external onlyAdmin {
        require(blacklisted[_account], "Account not blacklisted");
        blacklisted[_account] = false;
        emit UnBlacklisted(_account);
    }

    /**
     * @dev Pauses token transfers
     */
    function pause() external onlyPauser {
        _pause();
    }

    /**
     * @dev Unpauses token transfers
     */
    function unpause() external onlyPauser {
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
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {
        require(!system.emergencyMode(), "Emergency mode active");
    }

    /**
     * @dev Returns the version of the contract
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
}