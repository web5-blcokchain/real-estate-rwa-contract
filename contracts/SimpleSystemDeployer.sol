// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "./SimpleRealEstateSystem.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./PropertyToken.sol";
import "./RealEstateFacade.sol";

/**
 * @title SimpleSystemDeployer
 * @dev 负责部署整个不动产系统及其组件的合约
 */
contract SimpleSystemDeployer {
    
    // Deployment parameters
    struct RoleInitParams {
        address admin;
    }

    struct TradingInitParams {
        uint256 tradingFeeRate;
        address feeReceiver;
        uint256 minTradeAmount;
    }

    struct RewardInitParams {
        uint256 platformFeeRate;
        uint256 maintenanceFeeRate;
        address feeReceiver;
        uint256 minDistributionThreshold;
        address[] supportedPaymentTokens;
    }

    struct TokenInitParams {
        string name;
        string symbol;
        uint256 initialSupply;
    }

    struct SystemInitParams {
        bool startPaused;
    }

    // Deployed contracts
    ProxyAdmin public proxyAdmin;
    SimpleRealEstateSystem public system;
    SimpleRoleManager public roleManager;
    PropertyManager public propertyManager;
    TradingManager public tradingManager;
    RewardManager public rewardManager;
    PropertyToken public tokenFactory;
    RealEstateFacade public facade;

    // Events
    event SystemDeployed(
        address indexed proxyAdmin,
        address indexed system,
        address indexed roleManager,
        address propertyManager,
        address tradingManager,
        address rewardManager,
        address tokenFactory,
        address facade
    );
    
    /**
     * @dev Deploys the entire real estate system
     */
    function deploySystem(
        RoleInitParams memory roleParams,
        TradingInitParams memory tradingParams,
        RewardInitParams memory rewardParams,
        TokenInitParams memory tokenParams,
        SystemInitParams memory systemParams
    ) public returns (address[] memory) {
        // Deploy ProxyAdmin
        proxyAdmin = new ProxyAdmin();

        // Deploy implementation contracts
        SimpleRealEstateSystem systemImpl = new SimpleRealEstateSystem();
        SimpleRoleManager roleManagerImpl = new SimpleRoleManager();
        PropertyManager propertyManagerImpl = new PropertyManager();
        TradingManager tradingManagerImpl = new TradingManager();
        RewardManager rewardManagerImpl = new RewardManager();
        PropertyToken tokenFactoryImpl = new PropertyToken();
        RealEstateFacade facadeImpl = new RealEstateFacade();

        // Deploy proxies
        bytes memory emptyData = "";
        roleManager = SimpleRoleManager(
            address(
                new TransparentUpgradeableProxy(
                    address(roleManagerImpl),
                    address(proxyAdmin),
                    emptyData
                )
            )
        );

        system = SimpleRealEstateSystem(
            address(
                new TransparentUpgradeableProxy(
                    address(systemImpl),
                    address(proxyAdmin),
                    emptyData
                )
            )
        );

        propertyManager = PropertyManager(
            address(
                new TransparentUpgradeableProxy(
                    address(propertyManagerImpl),
                    address(proxyAdmin),
                    emptyData
                )
            )
        );

        tradingManager = TradingManager(
            payable(
                address(
                    new TransparentUpgradeableProxy(
                        address(tradingManagerImpl),
                        address(proxyAdmin),
                        emptyData
                    )
                )
            )
        );

        rewardManager = RewardManager(
            payable(
                address(
                    new TransparentUpgradeableProxy(
                        address(rewardManagerImpl),
                        address(proxyAdmin),
                        emptyData
                    )
                )
            )
        );

        tokenFactory = PropertyToken(
            address(
                new TransparentUpgradeableProxy(
                    address(tokenFactoryImpl),
                    address(proxyAdmin),
                    emptyData
                )
            )
        );

        facade = RealEstateFacade(
            address(
                new TransparentUpgradeableProxy(
                    address(facadeImpl),
                    address(proxyAdmin),
                    emptyData
                )
            )
        );

        // Initialize contracts
        roleManager.initialize(roleParams.admin);

        system.initialize(
            address(roleManager),
            address(propertyManager),
            payable(address(tradingManager)),
            payable(address(rewardManager))
        );

        propertyManager.initialize(address(roleManager));

        tradingManager.initialize(address(roleManager));

        rewardManager.initialize(
            address(roleManager),
            rewardParams.platformFeeRate,
            rewardParams.maintenanceFeeRate,
            rewardParams.feeReceiver,
            rewardParams.minDistributionThreshold
        );

        tokenFactory.initialize(
            bytes32(0),
            tokenParams.name,
            tokenParams.symbol,
            tokenParams.initialSupply,
            roleParams.admin,
            address(roleManager)
        );

        facade.initialize(
            address(system),
            address(roleManager),
            address(propertyManager),
            payable(address(tradingManager)),
            payable(address(rewardManager))
        );

        // Add supported payment tokens
        for (uint256 i = 0; i < rewardParams.supportedPaymentTokens.length; i++) {
            rewardManager.addSupportedPaymentToken(rewardParams.supportedPaymentTokens[i]);
        }

        // Return deployed addresses
        address[] memory addresses = new address[](8);
        addresses[0] = address(proxyAdmin);
        addresses[1] = address(system);
        addresses[2] = address(roleManager);
        addresses[3] = address(propertyManager);
        addresses[4] = address(tradingManager);
        addresses[5] = address(rewardManager);
        addresses[6] = address(tokenFactory);
        addresses[7] = address(facade);

        emit SystemDeployed(
            address(proxyAdmin),
            address(system),
            address(roleManager),
            address(propertyManager),
            address(tradingManager),
            address(rewardManager),
            address(tokenFactory),
            address(facade)
        );

        return addresses;
    }
    
    /**
     * @dev Deploys a simplified version of the system with a single admin
     */
    function deploySingleAdminSystem(address admin) public returns (address[] memory) {
        require(admin != address(0), "Invalid admin address");

        RoleInitParams memory roleParams = RoleInitParams({
            admin: admin
        });

        TradingInitParams memory tradingParams = TradingInitParams({
            tradingFeeRate: 500, // 5%
            feeReceiver: admin,
            minTradeAmount: 0
        });

        address[] memory supportedTokens = new address[](1);
        supportedTokens[0] = address(0); // ETH

        RewardInitParams memory rewardParams = RewardInitParams({
            platformFeeRate: 500, // 5%
            maintenanceFeeRate: 200, // 2%
            feeReceiver: admin,
            minDistributionThreshold: 0.01 ether,
            supportedPaymentTokens: supportedTokens
        });

        TokenInitParams memory tokenParams = TokenInitParams({
            name: "Property Token Factory",
            symbol: "PTF",
            initialSupply: 0
        });

        SystemInitParams memory systemParams = SystemInitParams({
            startPaused: false
        });

        return deploySystem(
            roleParams,
            tradingParams,
            rewardParams,
            tokenParams,
            systemParams
        );
    }
} 