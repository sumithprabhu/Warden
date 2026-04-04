// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Treasury.sol";

/// @title TreasuryFactory - Deploys deterministic per-org treasury contracts
/// @notice Uses CREATE2 so treasury addresses can be computed before deployment
contract TreasuryFactory {

    // --- State ---
    mapping(bytes32 => address) public treasuries;
    address[] public allTreasuries;

    // --- Events ---
    event TreasuryCreated(bytes32 indexed salt, address indexed treasury, address[] admins);

    // --- Errors ---
    error TreasuryAlreadyExists();
    error NoAdmins();

    /// @notice Deploy a new Treasury contract with a deterministic address
    /// @param _salt Unique identifier for this org (e.g. keccak256 of orgId)
    /// @param _admins Initial admin addresses for the treasury
    /// @return treasury The deployed treasury address
    function createTreasury(
        bytes32 _salt,
        address[] calldata _admins
    ) external returns (address treasury) {
        if (_admins.length == 0) revert NoAdmins();
        if (treasuries[_salt] != address(0)) revert TreasuryAlreadyExists();

        // Deploy with CREATE2
        bytes memory bytecode = type(Treasury).creationCode;
        assembly {
            treasury := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
        }
        require(treasury != address(0), "CREATE2 failed");

        // Initialize the treasury
        Treasury(payable(treasury)).initialize(_admins);

        treasuries[_salt] = treasury;
        allTreasuries.push(treasury);

        emit TreasuryCreated(_salt, treasury, _admins);
    }

    /// @notice Compute the address of a treasury before it's deployed
    /// @param _salt The salt that will be used for deployment
    /// @return The deterministic address
    function computeTreasuryAddress(bytes32 _salt) external view returns (address) {
        bytes memory bytecode = type(Treasury).creationCode;
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), _salt, keccak256(bytecode))
        );
        return address(uint160(uint256(hash)));
    }

    /// @notice Get total number of deployed treasuries
    function treasuryCount() external view returns (uint256) {
        return allTreasuries.length;
    }
}
