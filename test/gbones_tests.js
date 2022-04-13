const { expect } = require("chai");
const { ethers } = require("hardhat");
const {utils, BigNumber} = require('ethers');

describe("Gbones tests", function () {
	
  let owner,randomPerson;
  let skeletonzContractFactory;
  let skeletonzContract;
  let gbonesContractFactory;
  let gbonesContract;
  let skellieContractFactory;
  let skelliesContract;
  let PROXY_ROLE;
	
  beforeEach(async function () {
    
	[owner,randomPerson] = await hre.ethers.getSigners();

    skeletonzContractFactory = await hre.ethers.getContractFactory("Skeletonz");
    skeletonzContract = await skeletonzContractFactory.deploy();
    await skeletonzContract.deployed();
    console.log("Skeletonz Contract deployed to:", skeletonzContract.address);

    gbonesContractFactory = await hre.ethers.getContractFactory("Skeletonz_GBONEs");
    gbonesContract = await gbonesContractFactory.deploy(skeletonzContract.address);
    await skeletonzContract.deployed();
    console.log("GBONEs Contract deployed to: ", gbonesContract.address);

    skellieContractFactory = await hre.ethers.getContractFactory("Skellies");
    skelliesContract = await skellieContractFactory.deploy(gbonesContract.address, skeletonzContract.address);
    await skelliesContract.deployed();
    console.log("skellies Contract deployed to:", skelliesContract.address);
	
	// Proxy
	PROXY_ROLE = hre.ethers.utils.id("PROXY_ROLE"); //keccak256 of string
    //0x77d72916e966418e6dc58a19999ae9934bef3f749f1547cde0a86e809f19c89b

    await gbonesContract.grantRole(PROXY_ROLE,skelliesContract.address);
    await gbonesContract.setSkellieContract(skelliesContract.address);
	
  });
	
	
  it("Should claim GBONES as random person", async function () {

	// mint 5 skeletonz
	let publicMint = await skeletonzContract.connect(randomPerson).publicMint(5, {
        value: ethers.utils.parseEther("0.4")
    });
    await publicMint.wait();
	
	// get balance of minted skeletonz
	let balanceOf = await skeletonzContract.balanceOf(randomPerson.address);
    console.log("balance of: " + randomPerson.address + " is " + balanceOf);
	
    await gbonesContract.connect(randomPerson).claimGenesisGbones();
    
    let balance = await gbonesContract.connect(randomPerson).balanceOf(randomPerson.address);
    console.log("gbones balance: " + balance);

  });
  
  
  
  it.only("Should test Gbone getters and mint 1 skellie", async function () {

	// mint 5 skeletonz
	let publicMint = await skeletonzContract.connect(randomPerson).publicMint(5, {
        value: ethers.utils.parseEther("0.4")
    });
    await publicMint.wait();
	
	// get balance of minted skeletonz
	let balanceOf = await skeletonzContract.balanceOf(randomPerson.address);
    console.log("balance of: " + randomPerson.address + " is " + balanceOf);
	
	let total = await skeletonzContract.total();
	
	// for loop all minted skeletonz
	for (let i = 0 ; i < total ; i++) {
        
		let getClaimTime = await gbonesContract.connect(randomPerson).getClaimTimeForGenesisToken(i);
		console.log(getClaimTime); 
		
    }
	
   let getGenesisClaimAmount = await gbonesContract.connect(randomPerson).getTotalGenesisClaimAmountForOwner(randomPerson.address);
   let genesisAmountBN = BigNumber.from(getGenesisClaimAmount.toString());
   
   // total claimable tokens
   console.log("Gbones to Claim for " + total + " skeletonz : " + utils.formatEther(genesisAmountBN));
   
   // claim gbones as random person
   await gbonesContract.connect(randomPerson).claimGenesisGbones();
   console.log("Claimed " + utils.formatEther(genesisAmountBN) + " gbones");
    
   let balance = await gbonesContract.connect(randomPerson).balanceOf(randomPerson.address);
   console.log("Gbones balance after claim: " + balance);
   
   // check how many gbones are left to claim (should be 0)
   let getGenesisClaimAmount_new = await gbonesContract.connect(randomPerson).getTotalGenesisClaimAmountForOwner(randomPerson.address);
   let genesisAmountBN_new = BigNumber.from(getGenesisClaimAmount_new.toString());
   
   // total claimable tokens
   console.log("Gbones to Claim for " + total + " skeletonz after the claim : " + utils.formatEther(genesisAmountBN_new));
   
   
   // mint 1 skellie
   await skelliesContract.connect(randomPerson).breedSkellie();
   // await skelliesContract.connect(randomPerson).breedSkellie(); // For 2 skellies no balance - tested
   
   let skellieBal = await skelliesContract.balanceOf(randomPerson.address);
   console.log("Skellies after breed " + skellieBal);
  
   balance = await gbonesContract.connect(randomPerson).balanceOf(randomPerson.address);
   let balance_after_breed = BigNumber.from(balance.toString());
   console.log("Gbones balance after breed: " + utils.formatEther(balance_after_breed));
   
   
   // increase time so we get *some* number instead of 0, if mutant was minted
   const sevenDays = 7 * 24 * 60 * 60;
   
   await ethers.provider.send('evm_increaseTime', [sevenDays]);
   await ethers.provider.send('evm_mine');
   
   
   // get number of tokens based on ID 0 (new minted)
   balance = await gbonesContract.connect(randomPerson).getTotalMutantClaimAmountForOwner(randomPerson.address);
   let balance_skellie = BigNumber.from(balance.toString());
   console.log("Gbones to claim for 1 mutant skellie: " + utils.formatEther(balance_skellie)); // if any number == mutant was minted
   
    
  });
  
});
