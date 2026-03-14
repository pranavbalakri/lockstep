// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DeadDrop {
    enum EscrowState {
        Unfunded,
        Funded,
        Released,
        Disputed
    }

    error OnlyClient();
    error OnlyParticipant();
    error InvalidAddress();
    error InvalidState();
    error InvalidAmount();
    error TransferFailed();

    address public immutable CLIENT;
    address public immutable FREELANCER;
    uint256 public depositedAmount;
    EscrowState public state;

    event Deposited(address indexed funder, uint256 amount);
    event Released(address indexed recipient, uint256 amount);
    event Disputed(address indexed raisedBy);

    constructor(address _client, address _freelancer) {
        if (_client == address(0) || _freelancer == address(0) || _client == _freelancer) {
            revert InvalidAddress();
        }

        CLIENT = _client;
        FREELANCER = _freelancer;
        state = EscrowState.Unfunded;
    }

    function deposit() external payable {
        if (msg.sender != CLIENT) revert OnlyClient();
        if (state != EscrowState.Unfunded) revert InvalidState();
        if (msg.value == 0) revert InvalidAmount();

        depositedAmount = msg.value;
        state = EscrowState.Funded;

        emit Deposited(msg.sender, msg.value);
    }

    function release() external {
        if (msg.sender != CLIENT) revert OnlyClient();
        if (state != EscrowState.Funded) revert InvalidState();

        uint256 amount = depositedAmount;
        depositedAmount = 0;
        state = EscrowState.Released;

        (bool success,) = payable(FREELANCER).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Released(FREELANCER, amount);
    }

    function dispute() external {
        if (msg.sender != CLIENT && msg.sender != FREELANCER) revert OnlyParticipant();
        if (state != EscrowState.Funded) revert InvalidState();

        state = EscrowState.Disputed;

        emit Disputed(msg.sender);
    }
}
