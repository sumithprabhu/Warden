// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Treasury - Per-organization treasury for Warden
/// @notice Each org gets its own treasury contract. Admins can deposit, withdraw,
///         and approve spenders (e.g. Unlink) to move funds from the treasury.
contract Treasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State ---
    mapping(address => bool) public isAdmin;
    uint256 public adminCount;
    address public factory;

    // --- Events ---
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event SpenderApproved(address indexed token, address indexed spender, uint256 amount);
    event NativeReceived(address indexed from, uint256 amount);

    // --- Errors ---
    error NotAdmin();
    error NotFactory();
    error ZeroAddress();
    error CannotRemoveLastAdmin();
    error AlreadyAdmin();
    error NotAnAdmin();
    error ZeroAmount();
    error InsufficientBalance();

    // --- Modifiers ---
    modifier onlyAdmin() {
        if (!isAdmin[msg.sender]) revert NotAdmin();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    /// @notice Initialize the treasury with initial admins. Called once by factory.
    /// @param _admins Array of initial admin addresses
    function initialize(address[] calldata _admins) external {
        // Can only be called once (factory is set once)
        if (factory != address(0)) revert NotFactory();
        factory = msg.sender;

        for (uint256 i = 0; i < _admins.length; i++) {
            if (_admins[i] == address(0)) revert ZeroAddress();
            isAdmin[_admins[i]] = true;
            emit AdminAdded(_admins[i]);
        }
        adminCount = _admins.length;
    }

    // --- Admin Management ---

    /// @notice Add a new admin
    function addAdmin(address _admin) external onlyAdmin {
        if (_admin == address(0)) revert ZeroAddress();
        if (isAdmin[_admin]) revert AlreadyAdmin();
        isAdmin[_admin] = true;
        adminCount++;
        emit AdminAdded(_admin);
    }

    /// @notice Remove an admin (cannot remove the last one)
    function removeAdmin(address _admin) external onlyAdmin {
        if (!isAdmin[_admin]) revert NotAnAdmin();
        if (adminCount <= 1) revert CannotRemoveLastAdmin();
        isAdmin[_admin] = false;
        adminCount--;
        emit AdminRemoved(_admin);
    }

    // --- Token Operations ---

    /// @notice Deposit ERC-20 tokens into this treasury
    /// @dev Caller must have approved this contract first
    function deposit(address _token, uint256 _amount) external nonReentrant {
        if (_token == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(_token, msg.sender, _amount);
    }

    /// @notice Withdraw ERC-20 tokens to a specified address
    function withdraw(address _token, address _to, uint256 _amount) external onlyAdmin nonReentrant {
        if (_token == address(0) || _to == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();
        if (IERC20(_token).balanceOf(address(this)) < _amount) revert InsufficientBalance();

        IERC20(_token).safeTransfer(_to, _amount);
        emit Withdrawn(_token, _to, _amount);
    }

    /// @notice Approve a spender (e.g. Unlink router) to move tokens from this treasury
    function approveSpender(address _token, address _spender, uint256 _amount) external onlyAdmin {
        if (_token == address(0) || _spender == address(0)) revert ZeroAddress();

        IERC20(_token).forceApprove(_spender, _amount);
        emit SpenderApproved(_token, _spender, _amount);
    }

    /// @notice Get this treasury's balance of a specific token
    function tokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /// @notice Accept native ETH (for gas or wrapping)
    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }
}
