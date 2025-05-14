// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";

contract PropertyManager is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using RoleConstants for bytes32;
    
    uint8 public version;
    address public usdtAddress;
    uint8 public usdtDecimals;
    RealEstateSystem public system;
    
    enum PropertyStatus { NotRegistered, Pending, Approved, Rejected, Delisted }
    
    struct Property {
        string propertyId;
        uint8 status;
        uint40 registrationTime;
        bool exists;
        string country;
        string metadataURI;
    }
    
    mapping(string => Property) private _properties;
    string[] public allPropertyIds;
    mapping(string => address) public propertyTokens;
    mapping(string => address) public propertyOwners;
    mapping(address => string[]) public ownerProperties;
    
    event PropertyRegistered(string indexed propertyId, string country, string metadataURI, uint40 registrationTime);
    event PropertyStatusUpdated(string indexed propertyId, uint8 oldStatus, uint8 newStatus, uint40 updateTime);
    event PropertyManagerInitialized(address indexed deployer, address indexed system, uint8 version);
    event TokenRegistered(string indexed propertyId, address indexed tokenAddress);
    event PropertyOwnershipTransferred(string indexed propertyId, address indexed oldOwner, address indexed newOwner);
    event InitialPropertyTokenPurchased(string indexed propertyId, address indexed buyer, uint256 amount, uint40 purchaseTime);
    
    constructor() { _disableInitializers(); }
    
    function initialize(address _systemAddress) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        version = 1;
        emit PropertyManagerInitialized(msg.sender, _systemAddress, version);
    }
    
    function registerProperty(string memory propertyId, string memory country, string memory metadataURI, uint256 initialSupply, string memory tokenName, string memory tokenSymbol) external whenNotPaused returns (address) {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        require(!_properties[propertyId].exists, "Property already exists");
        
        uint40 registrationTime = uint40(block.timestamp);
        _properties[propertyId] = Property({
            propertyId: propertyId,
            status: uint8(PropertyStatus.Pending),
            registrationTime: registrationTime,
            exists: true,
            country: country,
            metadataURI: metadataURI
        });
        
        allPropertyIds.push(propertyId);
        address tokenAddress = _createToken(propertyId, initialSupply, tokenName, tokenSymbol);
        propertyTokens[propertyId] = tokenAddress;
        
        emit PropertyRegistered(propertyId, country, metadataURI, registrationTime);
        emit TokenRegistered(propertyId, tokenAddress);
        
        return tokenAddress;
    }
    
    function _createToken(string memory propertyId, uint256 initialSupply, string memory tokenName, string memory tokenSymbol) private returns (address) {
        PropertyToken token = new PropertyToken();
        token.initialize(system, propertyId, initialSupply, tokenName, tokenSymbol);
        return address(token);
    }
    
    function updatePropertyStatus(string memory propertyId, PropertyStatus status) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_properties[propertyId].exists, "Property not exist");
        
        uint8 oldStatus = _properties[propertyId].status;
        _properties[propertyId].status = uint8(status);
        
        emit PropertyStatusUpdated(propertyId, oldStatus, uint8(status), uint40(block.timestamp));
    }
    
    function updatePropertyMetadata(string memory propertyId, string memory country, string memory metadataURI) external whenNotPaused {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        require(_properties[propertyId].exists, "Property not exist");
        _properties[propertyId].country = country;
        _properties[propertyId].metadataURI = metadataURI;
    }
    
    function getProperty(string memory propertyId) external view returns (string memory, uint8, uint40, string memory, string memory) {
        require(_properties[propertyId].exists, "Property not exist");
        Property memory property = _properties[propertyId];
        return (property.propertyId, property.status, property.registrationTime, property.country, property.metadataURI);
    }
    
    function propertyExists(string memory propertyId) public view returns (bool) {
        return _properties[propertyId].exists;
    }
    
    function getPropertyStatus(string memory propertyId) public view returns (PropertyStatus) {
        require(_properties[propertyId].exists, "Property not exist");
        return PropertyStatus(_properties[propertyId].status);
    }
    
    function isPropertyApproved(string memory propertyId) public view returns (bool) {
        if (!_properties[propertyId].exists) return false;
        return _properties[propertyId].status == uint8(PropertyStatus.Approved);
    }
    
    function getAllPropertyIds() external view returns (string[] memory) {
        return allPropertyIds;
    }
    
    function getPropertiesPaginated(uint256 offset, uint256 limit) external view returns (uint256 totalCount, string[] memory ids, uint8[] memory statuses, string[] memory countries, address[] memory tokenAddresses) {
        totalCount = allPropertyIds.length;
        
        if (offset >= totalCount) {
            return (totalCount, new string[](0), new uint8[](0), new string[](0), new address[](0));
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 resultCount = end - offset;
        ids = new string[](resultCount);
        statuses = new uint8[](resultCount);
        countries = new string[](resultCount);
        tokenAddresses = new address[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            string memory propertyId = allPropertyIds[offset + i];
            Property memory property = _properties[propertyId];
            
            ids[i] = property.propertyId;
            statuses[i] = property.status;
            countries[i] = property.country;
            tokenAddresses[i] = propertyTokens[propertyId];
        }
        
        return (totalCount, ids, statuses, countries, tokenAddresses);
    }
    
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }
    
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }
    
    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    function getVersion() external view returns (uint8) {
        return version;
    }
    
    function transferPropertyOwnership(string memory propertyId, address newOwner) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_properties[propertyId].exists, "Property not exist");
        require(newOwner != address(0), "Invalid new owner address");
        
        address oldOwner = propertyOwners[propertyId];
        if (oldOwner != address(0)) {
            string[] storage oldOwnerProperties = ownerProperties[oldOwner];
            for (uint256 i = 0; i < oldOwnerProperties.length; i++) {
                if (keccak256(bytes(oldOwnerProperties[i])) == keccak256(bytes(propertyId))) {
                    oldOwnerProperties[i] = oldOwnerProperties[oldOwnerProperties.length - 1];
                    oldOwnerProperties.pop();
                    break;
                }
            }
        }
        
        propertyOwners[propertyId] = newOwner;
        ownerProperties[newOwner].push(propertyId);
        
        emit PropertyOwnershipTransferred(propertyId, oldOwner, newOwner);
    }
    
    function getPropertiesByOwner(address owner) external view returns (string[] memory) {
        return ownerProperties[owner];
    }
    
    function isPropertyOwner(string memory propertyId, address owner) external view returns (bool) {
        return propertyOwners[propertyId] == owner;
    }

    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }

    function getPropertyToken(string memory propertyId) external view returns (address) {
        require(_properties[propertyId].exists, "Property not exist");
        return propertyTokens[propertyId];
    }
    
    function initialBuyPropertyToken(string memory propertyId, uint256 amount) external whenNotPaused nonReentrant returns (bool) {
        require(_properties[propertyId].exists, "Property does not exist");
        require(_properties[propertyId].status == uint8(PropertyStatus.Approved), "Property is not in trading status");
        
        address tokenAddress = propertyTokens[propertyId];
        require(tokenAddress != address(0), "Property token not found");
        
        PropertyToken token = PropertyToken(tokenAddress);
        uint256 initialSupply = token.maxSupply();
        require(amount <= initialSupply, "Purchase amount exceeds available supply");
        
        require(usdtAddress != address(0), "USDT contract not set");
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        
        uint256 requiredUsdt = amount * (10 ** usdtDecimals);
        
        require(usdt.balanceOf(msg.sender) >= requiredUsdt, "Insufficient USDT balance");
        require(usdt.allowance(msg.sender, address(this)) >= requiredUsdt, "Insufficient USDT allowance");
        
        require(usdt.transferFrom(msg.sender, address(this), requiredUsdt), "USDT transfer failed");
        bool success = token.transfer(msg.sender, amount);
        require(success, "Token transfer failed");
        
        emit InitialPropertyTokenPurchased(propertyId, msg.sender, amount, uint40(block.timestamp));
        
        return true;
    }
    
    function setUsdtAddress(address _usdtAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_usdtAddress != address(0), "USDT address cannot be zero");
        usdtAddress = _usdtAddress;
        IERC20MetadataUpgradeable usdt = IERC20MetadataUpgradeable(_usdtAddress);
        usdtDecimals = uint8(usdt.decimals());
    }

    function getUsdtAddress() external view returns (address) {
        return usdtAddress;
    }

    function getUsdtDecimals() external view returns (uint8) {
        return usdtDecimals;
    }

    function getPropertyTokenAddress(string memory propertyId) external view returns (address) {
        require(_properties[propertyId].exists, "Property not exist");
        return propertyTokens[propertyId];
    }
} 