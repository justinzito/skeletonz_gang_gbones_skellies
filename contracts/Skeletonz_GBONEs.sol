// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract Skeletonz_Contract {
   function balanceOf(address owner) virtual public view returns(uint);
   function totalSupply() virtual public view returns(uint);
   function ownerOf(uint tokenId) virtual public view returns(address);
}

abstract contract Skellies_Contract {
   function balanceOf(address owner) virtual public view returns(uint);
   function totalSupply() virtual public view returns(uint);
   function ownerOf(uint tokenId) virtual public view returns(address);
   function isMutantToken(uint256 tokenId) virtual public view returns(bool);
   function timestampOf(uint256 tokenId) virtual public view returns (uint64);
}


contract Skeletonz_GBONEs is ERC20, ReentrancyGuard, AccessControl {

    //Role Creation
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROXY_ROLE = keccak256("PROXY_ROLE");

    struct DefaultSchedule {
        uint256 ceilToken;
        uint64 timestamp;
    }

    DefaultSchedule[] private _schedule;

    address _genesisContract;
    uint256 _genesisRate = 173610000000000;

    address _skellieContract;
    uint256 _mutantRate = 347220000000000;
    
    
    mapping(uint256 => uint64) private _genesis_claimTimestamp;
    mapping(uint256 => uint64) private _mutant_claimTimestamp;


    constructor(address genesisContract) ERC20("Skeletonz GBONEs", "GBONE") {
        console.log("time at deploy: ",block.timestamp);

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADMIN_ROLE,_msgSender());

        _genesisContract = genesisContract;

        //set initial default time for first 666 tokens
        //_schedule.push(DefaultSchedule({ceilToken: 666,timestamp: 1647772512}));
        _schedule.push(DefaultSchedule({ceilToken: 666,timestamp: 0}));
    }

    //--------------- WRITE FUNCTIONS
    
    function claimGenesisGbones(uint[] memory tokens) public nonReentrant {

        // load the contract
        Skeletonz_Contract source_data = Skeletonz_Contract(_genesisContract);

        uint256 totalClaimDelta = 0;

        uint64 claimTimestamp = uint64(block.timestamp);

        for (uint64 i=0; i<tokens.length;i++) {
            if (source_data.ownerOf(i) == msg.sender) {
                totalClaimDelta += (claimTimestamp - getClaimTimeForGenesisToken(tokens[i]));
                _genesis_claimTimestamp[tokens[i]] = claimTimestamp;
            }
        }

        _mint(msg.sender,totalClaimDelta * _genesisRate);
    }

    function claimMutantGbones(uint[] memory tokens) public nonReentrant {

        uint256 totalClaimDelta = 0;
        uint64 claimTimestamp = uint64(block.timestamp);
        Skellies_Contract source_data = Skellies_Contract(_skellieContract);

        for (uint64 i=0; i<tokens.length;i++) {
            if (source_data.ownerOf(i) == msg.sender && source_data.isMutantToken(tokens[i])) {
                totalClaimDelta += (claimTimestamp - getClaimTimeForSkellieToken(tokens[i]));
                _mutant_claimTimestamp[tokens[i]] = claimTimestamp;
            }
        }
        
        _mint(msg.sender,totalClaimDelta * _mutantRate);
    }

    function setSkellieContract(address skellieContract) external onlyRole(ADMIN_ROLE) {
        _skellieContract = skellieContract;
    }

    function pushSchedule(uint256 ceilToken, uint64 startTimestamp) external onlyRole(ADMIN_ROLE) {

        _schedule.push(DefaultSchedule({ceilToken: ceilToken,timestamp: startTimestamp}));
    }

    function burnGbones(address account, uint256 amount) external onlyRole(PROXY_ROLE) {

        _burn(account, amount);

    }


    //------------------- VIEW FUNCTIONS

    //-------------- GENESIS RELATED METHODS --------------------
    function getClaimTimeForGenesisToken(uint256 tokenId) public view returns (uint64)  {
        
        uint64 claimTimestamp = _genesis_claimTimestamp[tokenId];

        if (claimTimestamp == 0) {
            //cycle through the schedule
            for (uint i=0; i<_schedule.length;i++) {
                if (tokenId < _schedule[i].ceilToken) {
                    claimTimestamp = _schedule[i].timestamp;
                    break;
                }
            }
        }

        return claimTimestamp;
    }

    function getTotalGenesisClaimAmountForOwner(address ownerAddress) public view returns (uint256) {

        uint[] memory tokens = getGenesisIDsByOwner(ownerAddress);
        uint256 totalClaimDelta = 0;

        uint64 claimTimestamp = uint64(block.timestamp);

        for (uint64 i=0; i<tokens.length;i++) {
            totalClaimDelta += (claimTimestamp - getClaimTimeForGenesisToken(tokens[i]));
        }

        return totalClaimDelta * _genesisRate;
    }

    function getGenesisIDsByOwner(address ownerAddress) public view returns (uint[] memory) {

        // load the contract
        Skeletonz_Contract source_data = Skeletonz_Contract(_genesisContract);

        uint[] memory output = new uint[](source_data.balanceOf(ownerAddress)); // set array length to number of tokens caller has

        uint total = source_data.totalSupply();

        uint counter = 0;

        // iterate all tokens
        for (uint i = 0; i < total; i++) {

            // find the ones belonging to ownerAddress
            if (source_data.ownerOf(i) == ownerAddress) {

                // set output to those belonging to ownerAddress
                output[counter] = i;

                counter++;
            }
        }

        return output;
    }

    //------------ SKELLIE RELATED METHODS --------------------
    function getClaimTimeForSkellieToken(uint256 tokenId) public view returns (uint64)  {

        Skellies_Contract source_data = Skellies_Contract(_skellieContract);

        uint64 claimTimestamp = _mutant_claimTimestamp[tokenId];
        uint64 txTimestamp = source_data.timestampOf(tokenId);

        if (txTimestamp > claimTimestamp) {
            claimTimestamp = txTimestamp;
        }
        
        return claimTimestamp;
    }

    function getTotalMutantClaimAmountForOwner(address ownerAddress) public view returns (uint256) {

        uint[] memory tokens = getSkellieIDsByOwner(ownerAddress);
        uint256 totalClaimDelta = 0;
        uint64 claimTimestamp = uint64(block.timestamp);
        Skellies_Contract source_data = Skellies_Contract(_skellieContract);

        for (uint64 i=0; i<tokens.length;i++) {
            if (source_data.isMutantToken(tokens[i])) {
                totalClaimDelta += (claimTimestamp - getClaimTimeForSkellieToken(tokens[i]));
                
            }
        }

        return totalClaimDelta * _mutantRate;
    }

    function getSkellieIDsByOwner(address ownerAddress) public view returns (uint[] memory) {

        // load the contract
        Skellies_Contract source_data = Skellies_Contract(_skellieContract);

        uint[] memory output = new uint[](source_data.balanceOf(ownerAddress)); // set array length to number of tokens caller has

        uint total = source_data.totalSupply();

        uint counter = 0;

        // iterate all tokens
        for (uint i = 0; i < total; i++) {

            // find the ones belonging to ownerAddress
            if (source_data.ownerOf(i) == ownerAddress) {

                // set output to those belonging to ownerAddress
                output[counter] = i;

                counter++;
            }
        }

        return output;
    }

    function getScheduleSize() public view returns (uint) {
        return _schedule.length;
    }

    function getScheduleAtIndex(uint index) public view returns (uint256,uint64) {

        return (_schedule[index].ceilToken,_schedule[index].timestamp);
    }

}