const { ethers } = require("hardhat");

//deploying the Casino.sol smart contract
async function main(){
    const Casino = await ethers.getContractFactory("Casino");
    const casino = await Casino.deploy();

    await casino.waitForDeployment();

    console.log("Casino smart contract deployed on : ",casino.target);
}

main().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error(error);
    process.exit(1);
})