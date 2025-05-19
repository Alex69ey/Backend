const { ethers } = require("ethers");
const { decrypt } = require("eth-crypto");

const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID");
const contractAddress = "0xYOUR_DEPLOYED_CONTRACT_ADDRESS";
const abi = [
  "function clientRecords(address) view returns (bytes encryptedData, uint256 timestamp, uint8 tariffId, bool paid)"
];
const clientAddress = "0xCLIENT_ADDRESS";
const privateKey = "YOUR_PRIVATE_KEY";

async function getAndDecryptClientData() {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const clientData = await contract.clientRecords(clientAddress);
  const encryptedDataHex = clientData.encryptedData;

  if (!encryptedDataHex || encryptedDataHex === "0x") {
    console.log("No data found for this client.");
    return;
  }

  const encryptedData = JSON.parse(ethers.utils.toUtf8String(encryptedDataHex));
  const decrypted = await decrypt(privateKey, encryptedData);
  const clientInfo = JSON.parse(decrypted);

  console.log("Client Information:", clientInfo);
}

getAndDecryptClientData().catch(console.error);