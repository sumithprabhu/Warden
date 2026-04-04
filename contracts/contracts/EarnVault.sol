// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EarnVault — deposit USDC, receive lpUSD 1:1
/// @notice Dummy yield vault for Warden. Deposit USDC and get lpUSD as proof.
///         Burn lpUSD to redeem the underlying USDC.
contract EarnVault is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _usdc) ERC20("Warden LP USD", "lpUSD") {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /// @notice Returns 6 decimals to match USDC
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Deposit USDC and receive lpUSD 1:1
    /// @param amount Amount of USDC (6 decimals)
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Burn lpUSD and redeem USDC 1:1
    /// @param amount Amount of lpUSD to burn
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient lpUSD");
        _burn(msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Total USDC held in the vault
    function totalDeposits() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
