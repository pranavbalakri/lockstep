// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeadDrop} from "../src/DeadDrop.sol";

contract DeadDropTest is Test {
    address internal client = makeAddr("client");
    address internal freelancer = makeAddr("freelancer");

    DeadDrop internal escrow;

    function setUp() external {
        escrow = new DeadDrop(client, freelancer);
        vm.deal(client, 10 ether);
    }

    function testDepositWorks() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Funded));
        assertEq(escrow.depositedAmount(), 1 ether);
        assertEq(address(escrow).balance, 1 ether);
    }

    function testOnlyClientCanRelease() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(freelancer);
        vm.expectRevert(DeadDrop.OnlyClient.selector);
        escrow.release();
    }

    function testReleaseSendsEth() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        uint256 freelancerBalanceBefore = freelancer.balance;

        vm.prank(client);
        escrow.release();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Released));
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.depositedAmount(), 0);
        assertEq(freelancer.balance, freelancerBalanceBefore + 1 ether);
    }

    function testDisputeChangesState() external {
        vm.prank(client);
        escrow.deposit{value: 1 ether}();

        vm.prank(freelancer);
        escrow.dispute();

        assertEq(uint256(escrow.state()), uint256(DeadDrop.EscrowState.Disputed));
        assertEq(address(escrow).balance, 1 ether);
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
}
