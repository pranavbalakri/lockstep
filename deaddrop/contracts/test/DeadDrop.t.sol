// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeadDrop} from "../src/DeadDrop.sol";

contract DeadDropTest is Test {
    address internal client = makeAddr("client");
    address internal freelancer = makeAddr("freelancer");
    // address(this) is the deployer → ARBITER
    DeadDrop internal escrow;

    function setUp() external {
        escrow = new DeadDrop(client, freelancer);
        vm.deal(client, 10 ether);
    }

    // ── Deposit ──────────────────────────────────────────────────────────────

    function testDepositWorks() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Funded));
        assertEq(escrow.depositedAmount(), 1 ether);
        assertEq(address(escrow).balance, 1 ether);
    }

    function testDepositRevertsIfNotClient() external {
        vm.deal(freelancer, 1 ether);
        vm.prank(freelancer);
        vm.expectRevert(DeadDrop.OnlyClient.selector);
        escrow.deposit{value: 1 ether}();
    }

    function testDepositRevertsIfAlreadyFunded() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.deal(client, 1 ether);
        vm.prank(client);
        vm.expectRevert(DeadDrop.InvalidState.selector);
        escrow.deposit{value: 1 ether}();
    }

    // ── Release ───────────────────────────────────────────────────────────────

    function testClientCanRelease() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        uint256 before = freelancer.balance;

        vm.prank(client);
        escrow.release();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Released));
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.depositedAmount(), 0);
        assertEq(freelancer.balance, before + 1 ether);
    }

    function testArbiterCanRelease() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        uint256 before = freelancer.balance;

        // address(this) == ARBITER (deployer)
        escrow.release();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Released));
        assertEq(freelancer.balance, before + 1 ether);
    }

    function testFreelancerCannotRelease() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(freelancer);
        vm.expectRevert(DeadDrop.OnlyClient.selector);
        escrow.release();
    }

    function testCannotReleaseTwice() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(client);
        escrow.release();

        vm.prank(client);
        vm.expectRevert(DeadDrop.InvalidState.selector);
        escrow.release();
    }

    // ── Dispute ───────────────────────────────────────────────────────────────

    function testArbiterCanDisputeAndRefundsClient() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        uint256 before = client.balance;

        // address(this) == ARBITER
        escrow.dispute();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Disputed));
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.depositedAmount(), 0);
        assertEq(client.balance, before + 1 ether);
    }

    function testClientCannotDispute() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(client);
        vm.expectRevert(DeadDrop.OnlyParticipant.selector);
        escrow.dispute();
    }

    function testFreelancerCannotDispute() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(freelancer);
        vm.expectRevert(DeadDrop.OnlyParticipant.selector);
        escrow.dispute();
    }

    function testCannotDisputeTwice() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        escrow.dispute(); // arbiter

        vm.expectRevert(DeadDrop.InvalidState.selector);
        escrow.dispute();
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    function testArbiterIsDeployer() external view {
        assertEq(escrow.ARBITER(), address(this));
    }

    function testInvalidAddressReverts() external {
        vm.expectRevert(DeadDrop.InvalidAddress.selector);
        new DeadDrop(address(0), freelancer);

        vm.expectRevert(DeadDrop.InvalidAddress.selector);
        new DeadDrop(client, address(0));

        vm.expectRevert(DeadDrop.InvalidAddress.selector);
        new DeadDrop(client, client);
    }
}
