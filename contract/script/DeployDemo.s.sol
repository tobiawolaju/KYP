// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/KYPCommitmentDemo.sol";

contract DeployDemoScript is Script {
    function run() external {
        address verifier = vm.envAddress("VERIFIER_ADDRESS");
        vm.startBroadcast();
        new KYPCommitmentDemo(verifier);
        vm.stopBroadcast();
    }
}
