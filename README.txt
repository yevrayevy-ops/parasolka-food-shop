Telegram Shop Mini App

This version loads products from Google Sheets through Google Apps Script and sends orders to the "Заказы" sheet.

Apps Script endpoint:
https://script.google.com/macros/s/AKfycbwYQVdbUFT4575C8F6OeKP57lNxbeDLIZvGBTq5iOqknIYDlUynNDzx2bxniE6gFlaUzg/exec

Google Sheets products columns:
A ID
B Товар
C Категория
D Цена
E Наличие
F Фото
G Описание

Orders sheet should have these 11 columns:
№ заказа | Дата | Клиент | Телефон | Telegram | Товар | Кол-во | Цена | Сумма | Комментарий | Статус

Deploy the contents of this folder to Vercel. The Telegram BotFather Menu Button should continue to use the Vercel URL. .
