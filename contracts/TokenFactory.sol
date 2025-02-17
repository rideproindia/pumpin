// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error InsufficientLiquidity();
error MaxSupplyReached();
error InvalidVestingParameters();
error NotTokenOwner();
error VestingAlreadyExists();
error NoVestingFound();
error VestingNotMatured();
error InvalidTimeLock();
error InvalidTokenParameters();
error UnauthorizedTransfer();
error ExceedsMaxSupply();
error InvalidWhitelistProof();
error TokenNotCreated();
error TokenNotLaunched();
error TokenAlreadyLaunched();

contract TokenFactory is Ownable2Step, ReentrancyGuard, Pausable, Multicall {
    using SafeERC20 for IERC20;

    uint256 private constant MIN_LAUNCH_DURATION = 1 hours;
    uint256 private constant MAX_SUPPLY = 1e27;
    uint256 private constant MIN_VESTING_INTERVAL = 1 days;

    struct TokenDetails {
        address tokenAddress;
        string name;
        string symbol;
        uint256 totalSupply;
        address owner;
        bool isLocked;
        uint256 maxWalletSize;
        uint256 maxTransactionAmount;
        bool hasAntiBot;
        uint256 timeLockDuration;
        bool isLaunched;
        bytes32 whitelistRoot;
        uint256 launchPrice;
    }

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 interval;
        bool isActive;
        bool isRevocable;
        uint256 cliffDuration;
    }

    mapping(address => TokenDetails) public tokens;
    mapping(address => bool) public isTokenCreated;
    mapping(address => mapping(address => VestingSchedule)) public vestingSchedules;
    mapping(address => bool) public antiBotProtection;
    mapping(address => uint256) public tradingStartTime;

    event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 totalSupply, address indexed owner, uint256 timestamp);
    event VestingScheduleCreated(address indexed token, address indexed beneficiary, uint256 totalAmount, uint256 duration, uint256 timestamp);
    event VestingRevoked(address indexed token, address indexed beneficiary, uint256 timestamp);
    event TokenLaunched(address indexed token, uint256 launchPrice, uint256 timestamp);

    modifier validToken(address token) {
        if (!isTokenCreated[token]) revert TokenNotCreated();
        _;
    }

    modifier onlyTokenOwner(address token) {
        if (msg.sender != tokens[token].owner) revert NotTokenOwner();
        _;
    }

    function createTokenAdvanced(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        uint256 maxWalletSize,
        uint256 maxTransactionAmount,
        bool enableAntiBot,
        uint256 timeLockDuration,
        bytes32 whitelistRoot
    ) external nonReentrant whenNotPaused returns (address) {
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert InvalidTokenParameters();
        if (totalSupply == 0 || totalSupply > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (timeLockDuration > 0 && timeLockDuration < MIN_LAUNCH_DURATION) revert InvalidTimeLock();

        ERC20Token newToken = new ERC20Token(name, symbol, totalSupply, msg.sender, address(this));

        tokens[address(newToken)] = TokenDetails({
            tokenAddress: address(newToken),
            name: name,
            symbol: symbol,
            totalSupply: totalSupply,
            owner: msg.sender,
            isLocked: false,
            maxWalletSize: maxWalletSize,
            maxTransactionAmount: maxTransactionAmount,
            hasAntiBot: enableAntiBot,
            timeLockDuration: timeLockDuration,
            isLaunched: false,
            whitelistRoot: whitelistRoot,
            launchPrice: 0
        });

        isTokenCreated[address(newToken)] = true;
        antiBotProtection[address(newToken)] = enableAntiBot;

        emit TokenCreated(address(newToken), name, symbol, totalSupply, msg.sender, block.timestamp);

        return address(newToken);
    }

    function createVestingSchedule(
        address token,
        address beneficiary,
        uint256 amount,
        uint256 duration,
        uint256 interval,
        uint256 cliffDuration,
        bool isRevocable
    ) external validToken(token) onlyTokenOwner(token) returns (bool) {
        if (vestingSchedules[token][beneficiary].isActive) revert VestingAlreadyExists();
        if (duration < interval || interval < MIN_VESTING_INTERVAL) revert InvalidVestingParameters();
        if (cliffDuration >= duration) revert InvalidVestingParameters();

        vestingSchedules[token][beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: block.timestamp,
            duration: duration,
            interval: interval,
            isActive: true,
            isRevocable: isRevocable,
            cliffDuration: cliffDuration
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit VestingScheduleCreated(token, beneficiary, amount, duration, block.timestamp);
        return true;
    }

    function launchToken(address token, uint256 initialPrice) external validToken(token) onlyTokenOwner(token) returns (bool) {
        TokenDetails storage details = tokens[token];
        if (details.isLaunched) revert TokenAlreadyLaunched();

        details.isLaunched = true;
        details.launchPrice = initialPrice;
        tradingStartTime[token] = block.timestamp;

        emit TokenLaunched(token, initialPrice, block.timestamp);
        return true;
    }
}

contract ERC20Token is ERC20, Ownable2Step {
    TokenFactory public immutable factory;

    constructor(string memory name, string memory symbol, uint256 totalSupply, address owner, address _factory)
        ERC20(name, symbol) 
    {
        factory = TokenFactory(_factory);
        _mint(owner, totalSupply);
        _transferOwnership(owner);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        if (from == address(0) || to == address(0)) return;

        if (!factory.isTokenCreated(address(this))) revert TokenNotCreated();
        if (factory.tradingStartTime(address(this)) == 0) revert TokenNotLaunched();

        super._beforeTokenTransfer(from, to, amount);
    }
}

