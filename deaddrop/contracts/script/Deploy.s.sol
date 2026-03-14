// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {DeadDrop} from "../src/DeadDrop.sol";

contract DeployDeadDrop is Script {
    function run() external returns (DeadDrop deployed) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address client = vm.envAddress("CLIENT_ADDRESS");
        address freelancer = vm.envAddress("FREELANCER_ADDRESS");

        vm.startBroadcast(deployerKey);
        deployed = new DeadDrop(client, freelancer);
        vm.stopBroadcast();
    }
}
