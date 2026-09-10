# fitstay. — Legal and Compliance Guidelines

Статус: робочий документ. Він фіксує продуктові рішення, але не замінює юридичну консультацію.

## 1. Планована юрисдикція

- Планована країна реєстрації юридичної особи — Швейцарія.
- Географія готелів першого релізу — Європа та Туреччина.
- Цільовий ринок користувачів — глобальний; продуктова концепція не обмежує користувача за країною проживання.
- Глобальний target не є гарантією реєстрації або оплати з кожної країни: фактична доступність визначається legal, sanctions, tax і payment-provider requirements.
- Усі платежі першого релізу здійснюються в EUR; local-currency pricing не підтримується.

## 2. Відображення податків і фінальної суми

- До підтвердження платежу користувач бачить остаточну суму в EUR.
- Якщо для транзакції застосовується податок, він розраховується через обраний payment/tax setup і показується окремо у складі фінальної суми.
- Сума не повинна неочікувано збільшуватися після підтвердження оплати.

## 3. Payment model

- Для MVP використовується напрям Merchant of Record, а не власна пряма merchant integration.
- Merchant of Record має обробляти payment collection, застосовні indirect taxes та compliant buyer receipts/invoices у підтримуваних юрисдикціях.
- Поточні кандидати для перевірки — Paddle і Lemon Squeezy.
- Конкретний провайдер не затверджений до перевірки onboarding/approval, актуальних fees, payout terms, country restrictions, refunds, webhooks, idempotency та підтримки one-time credit packages у EUR.

## 4. Refund direction

- Автоматичне повернення внутрішнього кредиту не є поверненням грошей.
- Добровільний грошовий refund за невикористані кредити, помилкову покупку або зміну рішення користувача не передбачений.
- Повне або часткове повернення грошей розглядається лише через підтримку після підтвердження некоректного AI-результату.
- Обов’язкові права користувача за застосовним законодавством і правила Merchant of Record мають пріоритет над продуктовою політикою.

Офіційні довідкові матеріали:

- [Paddle: VAT and Merchant of Record](https://www.paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf)
- [Lemon Squeezy: Supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Lemon Squeezy: Store activation](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)
- [Lemon Squeezy: Currencies](https://docs.lemonsqueezy.com/help/payments/currencies)

## 5. Analytics і використання даних

- Необхідні технічні та продуктові events можна збирати за замовчуванням без змісту чатів, профілю або повідомлень.
- Продукт не використовує рекламні trackers і не продає персональні дані.
- Тексти чатів, profile data, issue comments і post-trip comments не використовуються для training або fine-tuning моделей без окремої явної згоди.
- Marketing cookies і необов’язкова analytics активуються лише після consent, якщо він потрібен для відповідного користувача та юрисдикції.
- Відмова від optional consent не блокує основну перевірку готелю.
- Для Google і Facebook authentication запитуються лише мінімальні scopes, потрібні для входу, verified email і name prefill. Продукт не запитує social graph, contacts, posts або friends data, не імпортує й не зберігає provider profile photo.

## 6. Вікове обмеження

- Створити власний акаунт і здійснювати оплату може лише користувач віком від 18 років.
- Діти можуть бути зазначені тільки як частина складу поїздки без імені, власного акаунта або окремого персонального профілю.
- Збирається лише вік дитини, якщо він потрібен для функціональної перевірки критеріїв подорожі.

## 7. Відкриті рішення

1. Форма та фактична реєстрація юридичної особи.
2. Застосовні privacy, consumer protection, tax і cross-border rules.
3. Винятки з глобальної доступності акаунтів та оплат, яких вимагають legal, sanctions, tax або payment-provider rules.
4. Вибір Merchant of Record між кандидатами після provider assessment.
5. Фінальні Privacy Policy, Terms of Use, юридично перевірена refund policy та consent texts.
6. Юридично допустимі строки retention.
7. Source-by-source права на retrieval, citations, storage та commercial use.
