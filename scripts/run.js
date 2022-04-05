//npx hardhat run scripts/run.js


const main = async () => {
    const [owner,randomPerson] = await hre.ethers.getSigners();

    const skeletonzContractFactory = await hre.ethers.getContractFactory("Skeletonz");
    const skeletonzContract = await skeletonzContractFactory.deploy();
    await skeletonzContract.deployed();
    console.log("Skeletonz Contract deployed to:", skeletonzContract.address);

  

    const gbonesContractFactory = await hre.ethers.getContractFactory("Skeletonz_GBONEs");
    const gbonesContract = await gbonesContractFactory.deploy(skeletonzContract.address);
    await skeletonzContract.deployed();
    console.log("GBONEs Contract deployed to: ", gbonesContract.address);

    const skellieContractFactory = await hre.ethers.getContractFactory("Skellies");
    const skelliesContract = await skellieContractFactory.deploy(gbonesContract.address, skeletonzContract.address);
    await skelliesContract.deployed();
    console.log("skellies Contract deployed to:", skelliesContract.address);

    let PROXY_ROLE = hre.ethers.utils.id("PROXY_ROLE"); //keccak256 of string
    //0x77d72916e966418e6dc58a19999ae9934bef3f749f1547cde0a86e809f19c89b

    await gbonesContract.grantRole(PROXY_ROLE,skelliesContract.address);
    await gbonesContract.setSkellieContract(skelliesContract.address);
    
    let balanceOf = await skeletonzContract.balanceOf(owner.address);
    console.log("balance of: " + owner.address + " is " + balanceOf);

    let publicMint = await skeletonzContract.connect(randomPerson).publicMint(5, {
        value: ethers.utils.parseEther("0.4")
    });
    await publicMint.wait();

    publicMint = await skeletonzContract.connect(randomPerson).publicMint(5, {
        value: ethers.utils.parseEther("0.4")
    });
    await publicMint.wait();

    publicMint = await skeletonzContract.connect(randomPerson).publicMint(5, {
        value: ethers.utils.parseEther("0.4")
    });
    await publicMint.wait();
    


    balanceOf = await skeletonzContract.balanceOf(randomPerson.address);
    console.log("balance of: " + randomPerson.address + " is " + balanceOf);

    await gbonesContract.connect(randomPerson).claimGenesisGbones();
    
    let balance = await gbonesContract.connect(randomPerson).balanceOf(randomPerson.address);
    console.log("gbones balance: " + balance);

    let skellieBal = await skelliesContract.balanceOf(randomPerson.address);
    console.log("skellies before breed " + skellieBal);

    for (let i = 0 ; i<50 ; i++) {
        await skelliesContract.connect(randomPerson).breedSkellie();
    }

    skellieBal = await skelliesContract.balanceOf(randomPerson.address);
    console.log("skellies after breed " + skellieBal);

    for (let i = 0 ; i<50 ; i++) {
        await skelliesContract.connect(randomPerson).breedSkellie();
    }

    await gbonesContract.claimMutantGbones();

}

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

runMain();

function donothing() {
    //
}