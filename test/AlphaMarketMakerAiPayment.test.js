const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AlphaMarketMakerAiPayment", function () {
  let AlphaMarketMakerAiPayment, alphaMarketMaker, owner, client, usdt;
  let tariffCount = 13; // Количество тарифов в конструкторе

  beforeEach(async function () {
    [owner, client] = await ethers.getSigners();

    // Разворачиваем моковый USDT токен
    const USDT = await ethers.getContractFactory("USDTMock");
    usdt = await USDT.deploy();
    await usdt.waitForDeployment();

    // Разворачиваем контракт AlphaMarketMakerAiPayment
    AlphaMarketMakerAiPayment = await ethers.getContractFactory("AlphaMarketMakerAiPayment");
    
    // Передаём адрес USDT и тестовый публичный ключ
    const mockPublicKey = ethers.toUtf8Bytes("test-public-key");
    alphaMarketMaker = await AlphaMarketMakerAiPayment.deploy(
      await usdt.getAddress(),
      mockPublicKey
    );
    await alphaMarketMaker.waitForDeployment();

    // Даём клиенту 10000 USDT для тестов
    await usdt.mint(client.address, ethers.parseUnits("10000", 6));
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await alphaMarketMaker.owner()).to.equal(owner.address);
    });

    it("should set the correct USDT address", async function () {
      expect(await alphaMarketMaker.usdt()).to.equal(await usdt.getAddress());
    });

    it("should set the correct owner public key", async function () {
      const expectedPublicKey = ethers.toUtf8Bytes("test-public-key");
      const expectedPublicKeyHex = ethers.hexlify(expectedPublicKey);
      expect(await alphaMarketMaker.ownerPublicKey()).to.equal(expectedPublicKeyHex);
    });

    it("should initialize tariffs correctly", async function () {
      const tariff0 = await alphaMarketMaker.getTariff(1);
      expect(tariff0.price).to.equal(ethers.parseUnits("552", 6));
      expect(tariff0.tradingPairs).to.equal(1);
      expect(tariff0.durationWeeks).to.equal(2);

      const tariff1 = await alphaMarketMaker.getTariff(2);
      expect(tariff1.price).to.equal(ethers.parseUnits("1040", 6));
      expect(tariff1.tradingPairs).to.equal(1);
      expect(tariff1.durationWeeks).to.equal(4);
    });
  });

  describe("payForService", function () {
    it("should allow client to pay for a service with valid tariff and emit PaymentReceived", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6); // Цена тарифа 1
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Одобряем контракт на списание USDT
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);

      // Выполняем оплату
      await expect(
        alphaMarketMaker.connect(client).payForService(tariffId, encryptedData)
      )
        .to.emit(alphaMarketMaker, "PaymentReceived")
        .withArgs(client.address, amount, tariffId, encryptedData);

      // Проверяем, что USDT списаны с клиента
      expect(await usdt.balanceOf(client.address)).to.equal(ethers.parseUnits("9448", 6)); // 10000 - 552

      // Проверяем, что USDT переведены на контракт
      expect(await usdt.balanceOf(alphaMarketMaker.getAddress())).to.equal(amount);

      // Проверяем запись в clientRecords
      const paymentCount = await alphaMarketMaker.getPaymentCount(client.address);
      expect(paymentCount).to.equal(1);
    });

    it("should correctly store client data in clientRecords", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Одобряем контракт на списание USDT
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);

      // Выполняем оплату
      const tx = await alphaMarketMaker.connect(client).payForService(tariffId, encryptedData);
      const receipt = await tx.wait();
      const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      // Проверяем clientRecords
      const clientData = await alphaMarketMaker.clientRecords(client.address, 0);
      const encryptedDataHex = ethers.hexlify(encryptedData);
      expect(clientData.encryptedData).to.equal(encryptedDataHex);
      expect(clientData.tariffId).to.equal(tariffId);
      expect(clientData.timestamp).to.equal(timestamp);
    });

    it("should revert if tariff ID is invalid", async function () {
      const invalidTariffId = tariffCount + 1;
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      await expect(
        alphaMarketMaker.connect(client).payForService(invalidTariffId, encryptedData)
      ).to.be.revertedWith("Invalid tariff ID");
    });

    it("should revert if encrypted data is too large", async function () {
      const tariffId = 1;
      // Создаём данные размером больше 1024 байт
      const largeData = ethers.toUtf8Bytes("a".repeat(1025));

      await expect(
        alphaMarketMaker.connect(client).payForService(tariffId, largeData)
      ).to.be.revertedWith("Data too large");
    });

    it("should revert if client has insufficient USDT balance", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Создаём нового клиента без USDT (берём третий аккаунт)
      const [_, __, newClient] = await ethers.getSigners();

      // Проверяем, что баланс newClient равен 0
      expect(await usdt.balanceOf(newClient.address)).to.equal(0);

      // Вызываем approve, чтобы пройти проверку allowance
      await usdt.connect(newClient).approve(alphaMarketMaker.getAddress(), amount);

      // Проверяем, что payForService отклоняется
      await expect(
        alphaMarketMaker.connect(newClient).payForService(tariffId, encryptedData)
      ).to.be.revertedWith("Insufficient USDT balance");
    });

    it("should revert if allowance is not set", async function () {
      const tariffId = 1;
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      await expect(
        alphaMarketMaker.connect(client).payForService(tariffId, encryptedData)
      ).to.be.revertedWith("Approve USDT first");
    });

    it("should revert with PaymentFailed reason if transfer fails", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Одобряем контракт на списание USDT
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);

      // Модифицируем USDT мок, чтобы transferFrom всегда возвращал false
      await usdt.setFailTransferFrom(true);

      // Проверяем, что транзакция отклоняется с правильной ошибкой
      await expect(
        alphaMarketMaker.connect(client).payForService(tariffId, encryptedData)
      ).to.be.revertedWith("Transfer failed");

      // Проверяем, что баланс клиента не изменился
      expect(await usdt.balanceOf(client.address)).to.equal(ethers.parseUnits("10000", 6));

      // Проверяем, что баланс контракта остался нулевым
      expect(await usdt.balanceOf(alphaMarketMaker.getAddress())).to.equal(0);
    });
  });

  describe("withdrawUSDT", function () {
    it("should allow owner to withdraw USDT", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Клиент оплачивает сервис
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);
      await alphaMarketMaker.connect(client).payForService(tariffId, encryptedData);

      // Владелец выводит средства
      const initialBalance = await usdt.balanceOf(owner.address);
      await alphaMarketMaker.connect(owner).withdrawUSDT(amount);
      expect(await usdt.balanceOf(owner.address)).to.equal(initialBalance + amount);
      expect(await usdt.balanceOf(alphaMarketMaker.getAddress())).to.equal(0);
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        alphaMarketMaker.connect(client).withdrawUSDT(ethers.parseUnits("100", 6))
      )
        .to.be.revertedWithCustomError(alphaMarketMaker, "OwnableUnauthorizedAccount")
        .withArgs(client.address);
    });

    it("should revert if contract balance is zero", async function () {
      await expect(
        alphaMarketMaker.connect(owner).withdrawUSDT(ethers.parseUnits("100", 6))
      ).to.be.revertedWith("Insufficient contract balance");
    });

    it("should revert if withdrawal amount is zero", async function () {
      await expect(
        alphaMarketMaker.connect(owner).withdrawUSDT(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should revert if withdrawal fails", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Клиент оплачивает сервис, токены переводятся на контракт
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);
      await alphaMarketMaker.connect(client).payForService(tariffId, encryptedData);

      // Пытаемся вывести больше, чем есть на контракте (552 + 1 USDT)
      await expect(
        alphaMarketMaker.connect(owner).withdrawUSDT(amount + BigInt(1))
      ).to.be.revertedWith("Insufficient contract balance");
    });
  });

  describe("getTariff", function () {
    it("should return correct tariff details", async function () {
      const tariffId = 3;
      const tariff = await alphaMarketMaker.getTariff(tariffId);
      expect(tariff.price).to.equal(ethers.parseUnits("1600", 6));
      expect(tariff.tradingPairs).to.equal(2);
      expect(tariff.durationWeeks).to.equal(4);
    });

    it("should revert for invalid tariff ID", async function () {
      await expect(alphaMarketMaker.getTariff(tariffCount + 1)).to.be.revertedWith(
        "Invalid tariff ID"
      );
    });
  });

  describe("getPaymentCount", function () {
    it("should return correct payment count for a client", async function () {
      const tariffId = 1;
      const amount = ethers.parseUnits("552", 6);
      const encryptedData = ethers.toUtf8Bytes("testEncryptedData");

      // Клиент делает два платежа
      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);
      await alphaMarketMaker.connect(client).payForService(tariffId, encryptedData);

      await usdt.connect(client).approve(alphaMarketMaker.getAddress(), amount);
      await alphaMarketMaker.connect(client).payForService(tariffId, encryptedData);

      const paymentCount = await alphaMarketMaker.getPaymentCount(client.address);
      expect(paymentCount).to.equal(2);
    });

    it("should return 0 for a client with no payments", async function () {
      const paymentCount = await alphaMarketMaker.getPaymentCount(client.address);
      expect(paymentCount).to.equal(0);
    });
  });
});