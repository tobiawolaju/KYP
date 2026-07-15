// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/KYPCommitment.sol";

contract KYPCommitmentTest is Test {
    KYPCommitment kyp;

    address owner = address(this);
    address verifier = address(0xBEEF);
    address user = address(0xCAFE);
    address protocol = address(0xABCD);

    function setUp() public {
        kyp = new KYPCommitment(verifier);
        vm.deal(user, 10 ether);
    }

    function test_StakeCreatesActiveCommitment() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        KYPCommitment.Commitment memory c = kyp.getCommitment(id);
        assertEq(c.user, user);
        assertEq(c.protocolAddress, protocol);
        assertEq(c.amount, 1 ether);
        assertEq(uint256(c.status), uint256(KYPCommitment.Status.Active));
        assertEq(kyp.activeStakedTotal(), 1 ether);
    }

    function test_VerifyReturnsStakeBeforeDeadline() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        uint256 balanceBefore = user.balance;

        vm.prank(verifier);
        kyp.verify(id);

        KYPCommitment.Commitment memory c = kyp.getCommitment(id);
        assertEq(uint256(c.status), uint256(KYPCommitment.Status.Verified));
        assertEq(user.balance, balanceBefore + 1 ether);
        assertEq(kyp.activeStakedTotal(), 0);
    }

    function test_VerifyFailsAfterDeadline() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        vm.warp(block.timestamp + 73 hours);

        vm.prank(verifier);
        vm.expectRevert("deadline passed, use slash");
        kyp.verify(id);
    }

    function test_SlashForfeitsStakeAfterDeadline() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        vm.warp(block.timestamp + 73 hours);

        vm.prank(verifier);
        kyp.slash(id);

        KYPCommitment.Commitment memory c = kyp.getCommitment(id);
        assertEq(uint256(c.status), uint256(KYPCommitment.Status.Slashed));
        assertEq(kyp.activeStakedTotal(), 0);
        assertEq(kyp.forfeitedBalance(), 1 ether);
    }

    function test_SlashFailsBeforeDeadline() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        vm.prank(verifier);
        vm.expectRevert("deadline not passed yet");
        kyp.slash(id);
    }

    function test_OnlyVerifierCanVerifyOrSlash() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        vm.expectRevert("not verifier");
        kyp.verify(id);

        vm.warp(block.timestamp + 73 hours);
        vm.expectRevert("not verifier");
        kyp.slash(id);
    }

    function test_OwnerCanWithdrawForfeitedFunds() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);

        vm.warp(block.timestamp + 73 hours);
        vm.prank(verifier);
        kyp.slash(id);

        address payable to = payable(address(0xD00D));
        kyp.withdrawForfeited(1 ether, to);

        assertEq(to.balance, 1 ether);
        assertEq(kyp.forfeitedBalance(), 0);
    }

    function test_WithdrawCannotTouchActiveStakes() public {
        vm.prank(user);
        kyp.stake{value: 1 ether}(protocol);

        // nothing slashed yet, so forfeited balance is 0 — withdraw should revert
        address payable to = payable(address(0xD00D));
        vm.expectRevert("exceeds forfeited balance");
        kyp.withdrawForfeited(1 ether, to);
    }

    function test_NonOwnerCannotWithdraw() public {
        vm.prank(user);
        uint256 id = kyp.stake{value: 1 ether}(protocol);
        vm.warp(block.timestamp + 73 hours);
        vm.prank(verifier);
        kyp.slash(id);

        vm.prank(user);
        vm.expectRevert("not owner");
        kyp.withdrawForfeited(1 ether, payable(user));
    }
}
