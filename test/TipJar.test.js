const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TipJar Smart Contract", function () {
  let tipJar;
  let owner;
  let tipper1;
  let tipper2;

  beforeEach(async function () {
    [owner, tipper1, tipper2] = await ethers.getSigners();
    const TipJarFactory = await ethers.getContractFactory("TipJar");
    tipJar = await TipJarFactory.deploy();
    await tipJar.waitForDeployment();
  });

  it("Should set the deployer as immutable owner", async function () {
    expect(await tipJar.owner()).to.equal(owner.address);
  });

  it("Should record tips and emit NewTip event", async function () {
    const tipAmount = ethers.parseEther("0.05");
    const message = "Great project! 🚀";

    await expect(tipJar.connect(tipper1).tip(message, { value: tipAmount }))
      .to.emit(tipJar, "NewTip")
      .withArgs(tipper1.address, tipAmount, message, (timestamp) => timestamp > 0);

    expect(await tipJar.getTipsCount()).to.equal(1);

    const tipData = await tipJar.tips(0);
    expect(tipData.sender).to.equal(tipper1.address);
    expect(tipData.amount).to.equal(tipAmount);
    expect(tipData.message).to.equal(message);

    const allTips = await tipJar.getAllTips();
    expect(allTips.length).to.equal(1);
    expect(allTips[0].sender).to.equal(tipper1.address);
    expect(allTips[0].amount).to.equal(tipAmount);
    expect(allTips[0].message).to.equal(message);
  });

  it("Should revert with InvalidAmount if tip is 0 ETH", async function () {
    await expect(
      tipJar.connect(tipper1).tip("No ETH tip", { value: 0 })
    ).to.be.revertedWithCustomError(tipJar, "InvalidAmount");
  });

  it("Should revert with MessageTooLong if message exceeds 280 chars", async function () {
    const longMessage = "a".repeat(281);
    await expect(
      tipJar.connect(tipper1).tip(longMessage, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(tipJar, "MessageTooLong");
  });

  it("Should allow owner to withdraw accumulated funds", async function () {
    const tipAmount = ethers.parseEther("1.0");
    await tipJar.connect(tipper1).tip("Here is 1 ETH", { value: tipAmount });

    const contractBalance = await ethers.provider.getBalance(await tipJar.getAddress());
    expect(contractBalance).to.equal(tipAmount);

    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    const tx = await tipJar.connect(owner).withdraw();
    const receipt = await tx.wait();
    const gasUsed = receipt.fee;

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance + tipAmount - gasUsed);

    const finalContractBalance = await ethers.provider.getBalance(await tipJar.getAddress());
    expect(finalContractBalance).to.equal(0);
  });

  it("Should revert withdrawal attempt by non-owner", async function () {
    await tipJar.connect(tipper1).tip("Tip", { value: ethers.parseEther("0.1") });
    await expect(tipJar.connect(tipper2).withdraw()).to.be.revertedWithCustomError(
      tipJar,
      "NotOwner"
    );
  });
});
