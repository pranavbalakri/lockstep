// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LockstepEscrow (DeadDrop)
/// @notice Three-party escrow: client deposits ETH, arbiter (Lockstep server) resolves.
///         - CLIENT calls deposit() to fund the escrow.
///         - CLIENT or ARBITER can call release() to send ETH to the freelancer (work accepted).
///         - ARBITER can call dispute() to refund ETH to the client (AI verdict: incomplete).
contract DeadDrop {
    address public immutable CLIENT;
    address public immutable FREELANCER;
    address public immutable ARBITER;

    enum EscrowState { IDLE, FUNDED, RELEASED }
    EscrowState public state;

    uint256 public depositedAmount;

    event Deposited(address indexed funder, uint256 amount);
    event Released(address indexed recipient, uint256 amount);
    event Disputed(address indexed raisedBy);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidState();
    error OnlyClient();
    error OnlyParticipant();
    error TransferFailed();

    constructor(address _client, address _freelancer) {
        if (_client == address(0) || _freelancer == address(0) || _client == _freelancer)
            revert InvalidAddress();
        CLIENT    = _client;
        FREELANCER = _freelancer;
        ARBITER   = msg.sender;
        state     = EscrowState.IDLE;
    }

    /// @notice Client funds the escrow. Must send exactly the agreed amount.
    function deposit() external payable {
        if (msg.sender != CLIENT) revert OnlyClient();
        if (state != EscrowState.IDLE) revert InvalidState();
        if (msg.value == 0) revert InvalidAmount();
        depositedAmount = msg.value;
        state = EscrowState.FUNDED;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Release ETH to freelancer. Callable by CLIENT (accepted) or ARBITER (AI verdict: pass).
    function release() external {
        if (msg.sender != CLIENT && msg.sender != ARBITER) revert OnlyParticipant();
        if (state != EscrowState.FUNDED) revert InvalidState();
        uint256 amount = address(this).balance;
        state = EscrowState.RELEASED;
        (bool ok,) = FREELANCER.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Released(FREELANCER, amount);
    }

    /// @notice Refund ETH to client. Callable by ARBITER only (AI verdict: incomplete).
    function dispute() external {
        if (msg.sender != ARBITER) revert OnlyParticipant();
        if (state != EscrowState.FUNDED) revert InvalidState();
        uint256 amount = address(this).balance;
        state = EscrowState.RELEASED;
        (bool ok,) = CLIENT.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Disputed(msg.sender);
    }
}
