// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error TransferFailed();
error NotEnoughFunds();
error NeedsToBeMoreThanZero();
error TokenNotAllowed(address token);
error NotEnoughTokensToBorrow(address token);

contract Lending is ReentrancyGuard, Ownable {
    mapping(address => address) public s_tokenToPriceFeed;
    address[] public s_allowedTokens;

    // user address -> token address -> deposit amount
    mapping(address => mapping(address => uint256))
        public s_accountToTokenDeposits;
    // user address -> token address -> borrow amount
    mapping(address => mapping(address => uint256))
        public s_accountToTokenBorrows;

    uint256 public constant LIQUIDATION_THRESHOLD = 30;
    uint256 public constant MIN_HEALTH_FACTOR = 1e18;

    // EVENTS
    event Deposit(
        address indexed account,
        address indexed token,
        uint256 indexed amount
    );
    event Withdraw(
        address indexed account,
        address indexed token,
        uint256 indexed amount
    );
    event AllowedTokenSet(address indexed token, address indexed priceFeed);
    event Borrow(
        address indexed account,
        address indexed token,
        uint256 indexed amount
    );
    event Repay(
        address indexed account,
        address indexed token,
        uint256 indexed amounts
    );

    constructor() {}

    function deposit(address token, uint256 amount)
        external
        nonReentrant
        isAllowedToken(token)
        moreThanZero(amount)
    {
        emit Deposit(msg.sender, token, amount);
        s_accountToTokenDeposits[msg.sender][token] += amount;
        bool success = IERC20(token).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();
    }

    function withdraw(address token, uint256 amount)
        external
        nonReentrant
        moreThanZero(amount)
    {
        if (s_accountToTokenDeposits[msg.sender][token] < amount)
            revert NotEnoughFunds();
        emit Withdraw(msg.sender, token, amount);
        _pullFunds(msg.sender, token, amount);
    }

    function _pullFunds(
        address account,
        address token,
        uint256 amount
    ) private {
        if (s_accountToTokenDeposits[account][token] < amount)
            revert NotEnoughFunds();
        s_accountToTokenDeposits[account][token] -= amount;
        bool success = IERC20(token).transfer(msg.sender, amount);
        if (!success) revert TransferFailed();
    }

    function borrow(address token, uint256 amount)
        external
        nonReentrant
        isAllowedToken(token)
        moreThanZero(amount)
    {
        if (IERC20(token).balanceOf(address(this)) < amount)
            revert NotEnoughTokensToBorrow(token);
        s_accountToTokenBorrows[msg.sender][token] += amount;
        emit Borrow(msg.sender, token, amount);
        bool success = IERC20(token).transfer(msg.sender, amount);
        if (!success) revert TransferFailed();
    }

    function repay(address token, uint256 amount)
        external
        nonReentrant
        isAllowedToken(token)
        moreThanZero(amount)
    {
        emit Repay(msg.sender, token, amount);
        _repay(msg.sender, token, amount);
    }

    function _repay(
        address account,
        address token,
        uint256 amount
    ) private {
        s_accountToTokenBorrows[account][token] -= amount;
        bool success = IERC20(token).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();
    }

    function getAccountInformation(address user)
        public
        view
        returns (uint256, uint256)
    {
        uint256 borrowedValueInEth = getAccountBorrowedValue(user);
        uint256 collateralValueInEth = getAccountCollateralValue(user);
        return (borrowedValueInEth, collateralValueInEth);
    }

    function getAccountCollateralValue(address user)
        public
        view
        returns (uint256)
    {
        uint256 totalCollateralValueInEth = 0;
        for (uint256 index = 0; index < s_allowedTokens.length; index++) {
            address token = s_allowedTokens[index];
            uint256 amount = s_accountToTokenDeposits[user][token];
            uint256 valueInEth = getEthValue(token, amount);
            totalCollateralValueInEth += valueInEth;
        }
        return totalCollateralValueInEth;
    }

    function getAccountBorrowedValue(address user)
        public
        view
        returns (uint256)
    {
        uint256 totalBorrowsValueInEth = 0;
        for (uint256 index = 0; index < s_allowedTokens.length; index++) {
            address token = s_allowedTokens[index];
            uint256 amount = s_accountToTokenBorrows[user][token];
            uint256 valueInEth = getEthValue(token, amount);
            totalBorrowsValueInEth += valueInEth;
        }
        return totalBorrowsValueInEth;
    }

    function getEthValue(address token, uint256 amount)
        public
        view
        returns (uint256)
    {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            s_tokenToPriceFeed[token]
        );
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return (uint256(price) * amount) / 1e18;
    }

    function healthFactor(address account) public view returns (uint256) {
        (
            uint256 borrowedValueInEth,
            uint256 collateralValueInEth
        ) = getAccountInformation(account);
        uint256 collateralAdjustedForThreshold = (collateralValueInEth *
            LIQUIDATION_THRESHOLD) / 100;
        if (borrowedValueInEth == 0) return 100e18;
        return (collateralAdjustedForThreshold * 1e18) / borrowedValueInEth;
    }

    // MODIFIERS

    modifier isAllowedToken(address token) {
        if (s_tokenToPriceFeed[token] == address(0))
            revert TokenNotAllowed(token);
        _;
    }

    modifier moreThanZero(uint256 amount) {
        if (amount <= 0) revert NeedsToBeMoreThanZero();
        _;
    }

    // OWNER FUNCTIONS

    function setAllowedToken(address token, address priceFeed)
        external
        onlyOwner
    {
        bool foundToken = false;
        uint256 allowedTokensLength = s_allowedTokens.length;
        for (uint256 index = 0; index < allowedTokensLength; index++) {
            if (s_allowedTokens[index] == token) {
                foundToken = true;
                break;
            }
        }
        if (!foundToken) {
            s_allowedTokens.push(token);
        }
        s_tokenToPriceFeed[token] = priceFeed;
        emit AllowedTokenSet(token, priceFeed);
    }
}
