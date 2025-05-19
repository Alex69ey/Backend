const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Разворачиваем USDTMock
  const USDT = await ethers.getContractFactory("USDTMock");
  const usdt = await USDT.deploy();
  await usdt.waitForDeployment();
  console.log("USDTMock deployed to:", await usdt.getAddress());

  // Получаем приватный ключ из переменной окружения
  let privateKey = process.env.PRIVATE_KEY;
  console.log("Private Key from .env:", privateKey);
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  // Проверяем формат приватного ключа
  if (!privateKey.startsWith("0x")) {
    console.log("Adding 0x prefix to private key");
    privateKey = "0x" + privateKey;
  }

  // Создаём кошелёк из приватного ключа
  let wallet;
  try {
    wallet = new ethers.Wallet(privateKey);
    console.log("Wallet created successfully. Wallet address:", wallet.address);
  } catch (error) {
    throw new Error("Failed to create wallet from private key: " + error.message);
  }

  // Проверяем, что кошелёк создан корректно
  if (!wallet) {
    throw new Error("Wallet is undefined");
  }

  // Получаем публичный ключ через SigningKey
  let ownerPublicKey;
  try {
    const signingKey = new ethers.SigningKey(privateKey);
    ownerPublicKey = signingKey.compressedPublicKey; // Используем compressedPublicKey в ethers@6.x
    console.log("Owner Public Key:", ownerPublicKey);
  } catch (error) {
    throw new Error("Failed to compute public key: " + error.message);
  }

  if (!ownerPublicKey) {
    throw new Error("Failed to obtain ownerPublicKey");
  }

  // Разворачиваем AlphaMarketMakerAiPayment с публичным ключом
  const AlphaMarketMakerAiPayment = await ethers.getContractFactory("AlphaMarketMakerAiPayment");
  const alphaMarketMaker = await AlphaMarketMakerAiPayment.deploy(
    await usdt.getAddress(),
    ownerPublicKey
  );
  await alphaMarketMaker.waitForDeployment();
  console.log("AlphaMarketMakerAiPayment deployed to:", await alphaMarketMaker.getAddress());

  // Минтим USDT для deployer'а
  await usdt.mint(deployer.address, ethers.parseUnits("10000", 6));
  console.log("Minted 10000 USDT to deployer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });