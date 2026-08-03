// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TipJar - On-chain decentralised thank-you wall & tip jar
/// @notice Anyone can send ETH tips with an optional message; every tip is stored on-chain
///         and emitted as an event to build a transparent live supporter feed without off-chain intermediaries.
contract TipJar {
    address public immutable owner;
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    /// @dev Reentrancy guard state variable
    uint256 private _locked = 1;

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
    error ReentrantCall();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Prevents reentrancy attacks on functions with external calls
    modifier nonReentrant() {
        if (_locked == 2) revert ReentrantCall();
        _locked = 2;
        _;
        _locked = 1;
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
    /// @dev Uses checks-effects-interactions pattern with nonReentrant guard.
    ///      State (balance snapshot) is captured and the event is emitted
    ///      BEFORE the external call to prevent reentrancy exploits.
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();

        // Effects: emit event BEFORE the external interaction
        emit Withdrawal(owner, balance);

        // Interaction: external call AFTER all state changes
        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert WithdrawalFailed();
    }

    /// @dev Revert direct plain ETH transfers so all tips go through tip()
    receive() external payable {
        revert("TipJar: use tip() function");
    }
}
