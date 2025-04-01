// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./utils/SafeMath.sol";

contract PropertyToken is 
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20SnapshotUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable {

    using SafeMath for uint256;

    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Property ID hash
    bytes32 public propertyIdHash;

    // Maximum supply
    uint256 public maxSupply;

    // Role manager contract
    SimpleRoleManager public roleManager;

    // Blacklist mapping
    mapping(address => bool) public blacklisted;

    // Events
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event SnapshotCreated(uint256 snapshotId);

    /**
     * @dev Initializes the contract with property details and initial supply
     */
    function initialize(
        bytes32 _propertyIdHash,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _admin,
        address _roleManager
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Snapshot_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        propertyIdHash = _propertyIdHash;
        uint256 defaultMaxSupply = 1000000000;
        maxSupply = defaultMaxSupply.mul(10**decimals()); // Default 1 billion tokens
        roleManager = SimpleRoleManager(_roleManager);

        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }
    }

    /**
     * @dev Creates a snapshot of the current token balances
     */
    function snapshot() external onlyRole(OPERATOR_ROLE) returns (uint256) {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }

    /**
     * @dev Updates the maximum supply of tokens
     */
    function updateMaxSupply(uint256 _newMaxSupply) external onlyRole(ADMIN_ROLE) {
        require(_newMaxSupply >= totalSupply(), "New max supply must be >= current total supply");
        maxSupply = _newMaxSupply;
        emit MaxSupplyUpdated(_newMaxSupply);
    }

    /**
     * @dev Adds an account to the blacklist
     */
    function blacklist(address _account) external onlyRole(ADMIN_ROLE) {
        require(!blacklisted[_account], "Account already blacklisted");
        blacklisted[_account] = true;
        emit Blacklisted(_account);
    }

    /**
     * @dev Removes an account from the blacklist
     */
    function unBlacklist(address _account) external onlyRole(ADMIN_ROLE) {
        require(blacklisted[_account], "Account not blacklisted");
        blacklisted[_account] = false;
        emit UnBlacklisted(_account);
    }

    /**
     * @dev Pauses token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
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
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
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