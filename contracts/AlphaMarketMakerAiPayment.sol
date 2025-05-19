// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AlphaMarketMakerAiPayment is Ownable {
    IERC20 public usdt;
    uint256 public constant MAX_DATA_SIZE = 1024;
    bytes public ownerPublicKey;

    struct Tariff {
        uint256 price;
        uint8 tradingPairs;
        uint8 durationWeeks;
    }

    struct ClientData {
        bytes encryptedData;
        uint256 timestamp;
        uint8 tariffId;
    }

    mapping(uint8 => Tariff) public tariffs;
    mapping(address => ClientData[]) public clientRecords;

    event PaymentReceived(address indexed client, uint256 amount, uint8 tariffId, bytes encryptedData);
    event PaymentFailed(address indexed client, string reason);

    constructor(address _usdtAddress, bytes memory _ownerPublicKey) Ownable(msg.sender) {
        usdt = IERC20(_usdtAddress);
        ownerPublicKey = _ownerPublicKey;

        tariffs[1] = Tariff(552 * 10**6, 1, 2);
        tariffs[2] = Tariff(1040 * 10**6, 1, 4);
        tariffs[3] = Tariff(1600 * 10**6, 2, 4);
        tariffs[4] = Tariff(2000 * 10**6, 3, 4);
        tariffs[5] = Tariff(2400 * 10**6, 4, 4);
        tariffs[6] = Tariff(2800 * 10**6, 5, 4);
        tariffs[7] = Tariff(1600 * 10**6, 1, 8);
        tariffs[8] = Tariff(2800 * 10**6, 2, 8);
        tariffs[9] = Tariff(3600 * 10**6, 3, 8);
        tariffs[10] = Tariff(4400 * 10**6, 4, 8);
        tariffs[11] = Tariff(4800 * 10**6, 5, 8);
        tariffs[12] = Tariff(7 * 10**6, 0, 0);
        tariffs[13] = Tariff(799 * 10**6, 0, 0);
    }

    function payForService(uint8 _tariffId, bytes memory _encryptedData) external {
        require(_tariffId > 0 && _tariffId <= 13, "Invalid tariff ID");
        require(_encryptedData.length <= MAX_DATA_SIZE, "Data too large");

        Tariff memory tariff = tariffs[_tariffId];
        uint256 amount = tariff.price;

        require(amount > 0, "Invalid tariff");
        require(usdt.balanceOf(msg.sender) >= amount, "Insufficient USDT balance");
        require(usdt.allowance(msg.sender, address(this)) >= amount, "Approve USDT first");

        bool success = usdt.transferFrom(msg.sender, address(this), amount);
        if (!success) {
            emit PaymentFailed(msg.sender, "Transfer failed");
            revert("Transfer failed");
        }

        clientRecords[msg.sender].push(ClientData({
            encryptedData: _encryptedData,
            timestamp: block.timestamp,
            tariffId: _tariffId
        }));

        emit PaymentReceived(msg.sender, amount, _tariffId, _encryptedData);
    }

    function withdrawUSDT(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        uint256 contractBalance = usdt.balanceOf(address(this));
        require(contractBalance >= _amount, "Insufficient contract balance");

        bool success = usdt.transfer(owner(), _amount);
        require(success, "Withdrawal failed");
    }

    function getTariff(uint8 _tariffId) external view returns (uint256 price, uint8 tradingPairs, uint8 durationWeeks) {
        require(_tariffId > 0 && _tariffId <= 13, "Invalid tariff ID");
        Tariff memory tariff = tariffs[_tariffId];
        return (tariff.price, tariff.tradingPairs, tariff.durationWeeks);
    }

    function getPaymentCount(address _client) external view returns (uint256) {
        return clientRecords[_client].length;
    }
}