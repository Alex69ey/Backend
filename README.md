Основной проект Alpha Market Maker AI

Это основной фронтенд для взаимодействия с смарт-контрактом AlphaMarketMakerAiPayment. Он позволяет пользователям подключать кошелёк, оплачивать услуги с использованием USDT и просматривать доступные тарифы.

Возможности





Подключение к кошельку через Web3Modal.



Оплата услуг с использованием USDT (payForService).



Просмотр доступных тарифов (getTariff).



Интеграция с сетью Sepolia для тестирования.



Обработка ошибок и индикатор загрузки.



Стилизация с использованием Material-UI.

Предварительные требования





Установленный Node.js версии 18+.



MetaMask или другой кошелёк с настроенной сетью Sepolia.



Развёрнутый смарт-контракт AlphaMarketMakerAiPayment на сети Sepolia.



Адрес контракта для файла .env.

Установка





Склонируйте репозиторий:

git clone https://github.com/Alex69ey/alphamarketmakeraidapp.git
cd alphamarketmakeraidapp



Установите зависимости:

cd frontend
npm install



Создайте файл .env в папке frontend на основе .env.example (если его нет, создайте вручную) и добавьте адрес контракта:

cp .env.example .env

Отредактируйте .env:

REACT_APP_CONTRACT_ADDRESS=0xYourContractAddressOnSepolia

Запуск локально





Запустите сервер разработки:

cd frontend
npm start



Откройте http://localhost:3000 в браузере.



Подключите кошелёк (MetaMask) и убедитесь, что вы на сети Sepolia.



Проверьте:





Подключение кошелька работает.



Тарифы отображаются.



Оплата услуг доступна.

Развёртывание на Vercel





Инициализируйте Git, если ещё не сделано:

cd ..
git init
git add .
git commit -m "Изначальная версия"
git remote add origin https://github.com/Alex69ey/alphamarketmakeraidapp.git
git push -u origin main



Установите Vercel CLI:

npm install -g vercel
vercel login



Убедитесь, что в корне проекта есть vercel.json с настройками (например):

{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static",
      "config": { "distDir": "frontend/build" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/index.html"
    }
  ]
}



Разверните проект:

vercel --prod



Добавьте переменные окружения в Vercel:

vercel env add REACT_APP_CONTRACT_ADDRESS

Введите значение из файла .env.



Откройте предоставленный Vercel URL и протестируйте приложение.

Заметки по безопасности





Переменные окружения не попадают в Git (через .gitignore).



Используется HTTPS через Vercel для безопасного соединения.



Чувствительные данные (например, приватные ключи) не хранятся в коде.

Устранение проблем





Проблемы с подключением кошелька: Убедитесь, что MetaMask установлен и вы на сети Sepolia.



Тарифы не отображаются: Проверьте адрес контракта и доступность функции getTariff.



Ошибка оплаты: Убедитесь, что у вашего кошелька достаточно USDT и газа.

Если возникнут проблемы, создайте запрос на GitHub или свяжитесь с разработчиком.