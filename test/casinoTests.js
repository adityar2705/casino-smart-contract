const { expect } = require("chai");
const { ethers } = require("hardhat");

//global variables for testing
const valA = ethers.keccak256("0xBAD060A7");
const hashA = ethers.keccak256(valA);
const valBwin = ethers.keccak256("0x600D60A7");
const valBlose = ethers.keccak256("0xBAD060A7");

//test to check Casino.sol
describe("Casino", async function(){
    describe("starting bet tests",async function(){
        it("should not let an address bet below 0 Wei",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //transaction should revert -> bet value hasnt been passed
            await expect(casino.proposeBet(hashA)).to.be.reverted;
        });

        it("should not accept a bet that doesn't exist",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //the hashA hasnt been proposed yet so the transaction should revert
            await expect(casino.acceptBet(hashA, valBwin,{
                value:10
            })).to.be.reverted;
        });

        it("should allow to propose and accept bets",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //proposing a new bet with the hashed value
            const tx1 = await casino.proposeBet(hashA,{
                value:10
            });
            const receipt1 = await tx1.wait();

            //expect event to show bet proposed
            expect(receipt1.logs[0].fragment.name).to.equal("BetProposed");

            //accepting the proposed bet
            const tx2 = await casino.acceptBet(hashA, valBwin,{
                value:10
            });
            const receipt2 = await tx2.wait();

            //expect event to show accepted bet
            expect(receipt2.logs[0].fragment.name).to.equal("BetAccepted");
        })

        it("should not allow you to accept an already accepted bet", async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //proposing a new bet with the hashed value
            const tx1 = await casino.proposeBet(hashA,{
                value:10
            });
            const receipt1 = await tx1.wait();

            //accepting the proposed bet
            const tx2 = await casino.acceptBet(hashA, valBwin,{
                value:10
            });
            const receipt2 = await tx2.wait();

            //trying to accept an already accepted bet
            await expect(casino.acceptBet(hashA,valBlose,{
                value:10
            })).to.be.reverted;
        })

        it("should not allow you to accept the bet with the wrong amount",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //proposing a new bet with the hashed value
            const tx1 = await casino.proposeBet(hashA,{
                value:10
            });
            const receipt1 = await tx1.wait();
            console.log(receipt1.logs[0].fragment.name);

            //try to accept the bet with wrong amount -> should revert
            await expect(casino.acceptBet(hashA, valBlose, {
                value:5
            })).to.be.reverted;
        });

        it("should not allow you to reveal unless bet has been accepted",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

            //proposing a new bet with the hashed value
            const tx1 = await casino.proposeBet(hashA,{
                value:10
            });
            const receipt1 = await tx1.wait();

            //trying to reveal with the wrong amount
            await expect(casino.reveal(valA)).to.be.reverted;
        });

        it("should not allow to do a wrong reveal",async function(){
            const Casino = await ethers.getContractFactory("Casino");
            const casino = await Casino.deploy();

             //proposing a new bet with the hashed value
            let tx = await casino.proposeBet(hashA,{
                value:10
            });
            let receipt = await tx.wait();

            //accepting new bet with value of B 
            tx = await casino.acceptBet(hashA,valBwin,{
                value:10
            });
            receipt = await tx.wait();

            //reveal with wrong number -> not val A
            await expect(casino.reveal(valBwin)).to.be.reverted;
        })

        it("should work all the way through (B wins)",async function(){
            const signers = await ethers.getSigners();
            const Casino = await ethers.getContractFactory("Casino");
            const sideA = await Casino.deploy();
            const sideB = await sideA.connect(signers[1]);

            //side A proposes the bet
            let tx = await sideA.proposeBet(hashA,{
                value:1e10
            });
            let receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetProposed");

            //side B accepts the bet
            tx = await sideB.acceptBet(hashA, valBwin,{
                value:1e10
            });
            receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetAccepted");

            //revealing and checking of the bet -> if B wins or not
            const preBalance = await ethers.provider.getBalance(signers[1].address);
            tx = await sideA.reveal(valA);
            receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetSettled");

            const postBalance = await ethers.provider.getBalance(signers[1].address);
            const diffBalance = postBalance - preBalance;
            console.log("Bet win amount of B : ",Number(diffBalance));
            expect(Number(diffBalance)).to.equal(2e10);
        })

        it("should work all the way through (A wins)",async function(){
            const signers = await ethers.getSigners();
            const Casino = await ethers.getContractFactory("Casino");
            const sideA = await Casino.deploy();
            const sideB = await sideA.connect(signers[1]);

            //side A proposes the bet
            let tx = await sideA.proposeBet(hashA,{
                value:1e10
            });
            let receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetProposed");

            //side B accepts the bet
            tx = await sideB.acceptBet(hashA, valBlose,{
                value:1e10
            });
            receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetAccepted");

            //revealing and checking of the bet -> if B wins or not
            const preBalance = await ethers.provider.getBalance(signers[1].address);
            tx = await sideA.reveal(valA);
            receipt = await tx.wait();
            expect(receipt.logs[0].fragment.name).to.equal("BetSettled");

            const postBalance = await ethers.provider.getBalance(signers[1].address);
            const diffBalance = postBalance - preBalance;
            console.log("Bet win amount of B : ",Number(diffBalance));
            expect(Number(diffBalance)).to.equal(0);
        })
    });
});