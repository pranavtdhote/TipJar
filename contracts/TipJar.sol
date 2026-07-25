// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TipJar - On-chain decentralised thank-you wall & tip jar
/// @notice Anyone can send ETH tips with an optional message; every tip is stored on-chain
///         and emitted as an event to build a transparent live supporter feed without off-chain intermediaries.
contract TipJar {
    address public immutable owner;
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    struct Tip {
        address sender;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    Tip[] public tips;

    event NewTip(
        address indexed sender,
        uint256 amount,
        string message,
        uint256 timestamp
    );
    event Withdrawal(address indexed owner, uint256 amount);

    error InvalidAmount();
    error MessageTooLong(uint256 length, uint256 maxLength);
    error NotOwner();
    error NothingToWithdraw();
    error WithdrawalFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Send an ETH tip with an optional message.
    /// @param message Short public message attached to the tip (<=280 chars).
    function tip(string calldata message) external payable {
        if (msg.value == 0) revert InvalidAmount();
        if (bytes(message).length > MAX_MESSAGE_LENGTH) {
            revert MessageTooLong(bytes(message).length, MAX_MESSAGE_LENGTH);
        }

        tips.push(
            Tip({
                sender: msg.sender,
                amount: msg.value,
                message: message,
                timestamp: block.timestamp
            })
        );

        emit NewTip(msg.sender, msg.value, message, block.timestamp);
    }

    /// @notice Total number of tips ever recorded on-chain.
    function getTipsCount() external view returns (uint256) {
        return tips.length;
    }

    /// @notice Retrieve all tips stored in contract state.
    function getAllTips() external view returns (Tip[] memory) {
        return tips;
    }

    /// @notice Withdraw the full accumulated balance to the contract owner.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();

        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert WithdrawalFailed();

        emit Withdrawal(owner, balance);
    }

    /// @dev Revert direct plain ETH transfers so all tips go through tip()
    receive() external payable {
        revert("TipJar: use tip() function");
    }
}
