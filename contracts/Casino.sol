// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract Casino{
    //A sends hash(randomA) -> proposes a bet
    struct ProposedBet{
        address sideA;
        uint value;
        uint placedAt;
        bool accepted;
    }

    //B accepts the bet -> directly provides the randomB
    struct AcceptedBet{
        address sideB;
        uint acceptedAt;
        uint randomB;
    }

    //mappings to store the bets -> we key them by the commitment values of side A and B
    mapping(uint => ProposedBet) public proposedBet;
    mapping(uint => AcceptedBet) public acceptedBet;

    //event when bet is proposed
    event BetProposed(
        uint indexed _commitment,
        uint value
    );

    //event when bet is accepted -> time for A to reveal number
    event BetAccepted(
        uint indexed _commitment,
        address indexed _sideA
    );

    //event when the bet is settled
    event BetSettled(
        uint indexed _commitment,
        address winner,
        address loser,
        uint value
    );

    //side A can propose the bet
    function proposeBet(uint _commitment) external payable{
        require(proposedBet[_commitment].value == 0,"Bet already placed on that commitment.");
        require(msg.value > 0,"Bet value can't be zero.");

        //there's already a proposed bet for every commitment value filled with 0s -> we just need to modify it
        proposedBet[_commitment].sideA = msg.sender;
        proposedBet[_commitment].value = msg.value;
        proposedBet[_commitment].placedAt = block.timestamp;

        //emit event -> bet has been proposed
        emit BetProposed(_commitment,msg.value);
    }

    //called by sideB -> B provides its random number without hashing
    function acceptBet(uint _commitment, uint _random) external payable{
        require(!proposedBet[_commitment].accepted, "Bet has already been accepted.");
        require(proposedBet[_commitment].sideA != address(0),"Bet hasn't been proposed.");
        require(msg.value == proposedBet[_commitment].value,"Bet value needs to be the same.");

        //update the mapping to accept this bet on this particular proposed commitment
        acceptedBet[_commitment].randomB = _random;
        acceptedBet[_commitment].acceptedAt = block.timestamp;
        acceptedBet[_commitment].sideB = msg.sender;

        proposedBet[_commitment].accepted = true;

        //emit event -> bet has been accepted
        emit BetAccepted(_commitment, proposedBet[_commitment].sideA);
    }

    //side A has to reveal their random number -> bet has been accepted
    function reveal(uint _random) external{
        uint _commitment = uint256(keccak256(abi.encodePacked(_random)));

        //getting the addresses
        address payable _sideA = payable(msg.sender);
        address payable _sideB = payable(acceptedBet[_commitment].sideB);

        //agreed random value -> XOR of the 2 random values
        uint _agreedRandom = _random ^ acceptedBet[_commitment].randomB;

        //lets hold the value of the proposed bet (in Wei) in a variable
        uint _value = proposedBet[_commitment].value;

        require(proposedBet[_commitment].sideA == msg.sender,"Bet not placed by you or wrong value.");
        require(proposedBet[_commitment].accepted == true, "Bet hasn't been accepted yet.");

        if(_agreedRandom % 2 == 0){
            (bool s,) = _sideA.call{
                value:2*_value
            }("");
            require(s,"Failed to send bet winnings.");
            emit BetSettled(_commitment,_sideA,_sideB,_value);
        }
        else{
            (bool s,) = _sideB.call{
                value:2*_value
            }("");
            require(s,"Failed to send bet winnings.");
            emit BetSettled(_commitment,_sideB,_sideA,_value);
        }

        //cleanup to get the gas refund
        delete proposedBet[_commitment];
        delete acceptedBet[_commitment];
    }

}