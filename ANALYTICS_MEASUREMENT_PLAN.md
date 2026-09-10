# fitstay. — Analytics and Measurement Plan

Статус: робочий документ для погоджених product, quality та trust metrics. Збір даних підпорядковується `LEGAL_COMPLIANCE_GUIDELINES.md`.

## 1. Основна метрика

Основна метрика — частка completed full checks, після яких користувач відповів, що результат допоміг прийняти рішення.

Під готовим результатом показується необов’язкове питання `Did this check help your decision?` з відповідями `Yes`, `Partly`, `No`.

## 2. Provisional targets

Для перших 100 отриманих відповідей:

- `Yes` — щонайменше 60%;
- `Yes` + `Partly` — щонайменше 80%;
- response rate вимірюється й показується окремо.

Ці targets є стартовими, а не остаточними. Результат нижче порогів потребує аналізу причин до масштабування платного acquisition.

## 3. Privacy constraint

Analytics events не містять текстів чатів, profile content, evidence quotes або user comments. Optional analytics і marketing cookies використовуються лише відповідно до consent rules.

## 4. Activation

### Check-start activation

Користувач досягає check-start activation, якщо запускає першу перевірку протягом 7 днів після account verification. Для email/password це успішний email verification; для Google/Facebook — створення account із provider-verified email. Це вимірює, чи onboarding і головний екран довели користувача до основної дії, але ще не підтверджує отримання цінності.

Provisional target для перших 200 verified accounts — щонайменше 60% check-start activation.

### Value activation

Користувач досягає value activation лише після того, як отримав і відкрив перший full result протягом 7 днів після account verification.

Provisional target для перших 200 verified accounts — щонайменше 40% value activation.

Registration, account verification і profile completion є onboarding progress. `Preliminary result`, `Not enough data` і technical failure не вважаються value activation.

### Engagement

Engagement вимірює meaningful actions після першого результату: повторну перевірку, запуск пошуку альтернативи, відкриття evidence, збереження готелю або повернення в продукт в інший день.

## 5. Completion

- resolved check rate — частка запущених перевірок, які завершилися `Full result`, `Preliminary result` або `Not enough data`, а не technical failure; provisional target — щонайменше 95%;
- full result rate — частка запущених перевірок, які завершилися `Full result`; provisional target — щонайменше 80%.

### Cost

- technical variable cost per completed full hotel check — прямі витрати на AI/LLM, retrieval і search APIs, translation, processing та proportional storage; provisional target — не більше €0.30;
- salaries, development і fixed SaaS subscriptions не входять до technical variable cost;
- Find alternative cost вимірюється окремо без початкового target;
- fully loaded cost із payment/Merchant-of-Record fees, support і credit returns визначається після появи фактичних даних;
- cost per useful analysis не використовується, оскільки voluntary usefulness responses створюють selection bias у denominator.

## 6. Payment

- qualified free-to-paid conversion — частка користувачів, які придбали пакет протягом 30 днів після використання обох безкоштовних перевірок; provisional target — щонайменше 10%;
- payment processing success — частка підтверджених користувачем payment attempts, які успішно завершив payment provider, без урахування скасувань користувачем і відмов банку; provisional target — щонайменше 95%;
- credit delivery accuracy — частка успішних оплат, після яких правильна кількість кредитів була нарахована рівно один раз; required target — 100%.

Qualified free-to-paid conversion не включає accounts, які не використали обидві безкоштовні перевірки.

## 7. Retention

- 30-day repeat-use rate — частка value-activated користувачів, які запускають ще одну перевірку або пошук альтернативи протягом 30 днів після першого full result; provisional target — щонайменше 30%;
- 90-day trip-cycle retention — частка value-activated користувачів, які повертаються та запускають нову перевірку протягом 90 днів після першого full result; на MVP вимірюється baseline без target.

Просте відкриття продукту без запуску перевірки або пошуку альтернативи не вважається repeat use чи trip-cycle retention.

## 8. Post-trip feedback

- post-trip feedback rate — частка користувачів, які надіслали `Accurate`, `Partly accurate` або `Inaccurate` протягом 30 днів після фактичного показу post-trip prompt; provisional target — щонайменше 20%;
- користувачі, яким prompt не було показано, не входять до denominator;
- частки `Accurate`, `Partly accurate` та `Inaccurate` показуються окремо;
- кожна відповідь `Inaccurate` автоматично створює review item;
- accuracy target визначається після перших 50 отриманих post-trip responses.

## 9. Monitoring dashboards

### Product & Revenue

Dashboard містить activation funnel, usefulness, repeat use, paywall conversion і purchases.

### Operations

Dashboard містить analysis duration p50/p90, technical failures, retries, частку `Preliminary result` і `Not enough data`, credit returns, payment processing success і technical variable cost per completed full hotel check.

### AI Quality & Trust

Dashboard містить incorrect hotel identification, unsupported claims, false-positive confirmation of critical requirements, source diversity, cross-run consistency та user-reported issues.

### Immediate critical alerts

Негайний alert створюється, якщо:

- після hotel confirmation проаналізовано неправильний об’єкт;
- у результаті з’явилося unsupported positive claim для critical criterion;
- кредит списано, але користувач не отримав result або automatic credit return;
- після успішної оплати кредити нараховано неправильно або повторно;
- результат рекомендує готель із відомим critical safety concern.

Інші dashboard indicators перевіряються щодня або щотижня залежно від severity та обсягу даних.

## 10. Мінімальна event taxonomy

### Onboarding

- account created;
- account verification completed;
- authentication method used: email/password, Google or Facebook;
- profile completed.

### Hotel identification

- hotel submitted;
- hotel identified;
- hotel ambiguous;
- hotel not found.

### Check and result

- check started;
- check completed — full;
- check completed — preliminary;
- check completed — no data;
- check failed;
- result opened;
- evidence opened;
- usefulness submitted.

### Payment

- paywall opened;
- checkout started;
- checkout completed;
- checkout failed.

### Alternative and retention

- alternative started;
- alternative completed;
- alternative no match;
- alternative price data unavailable;
- hotel saved;
- hotel removed;
- issue reported;
- issue resolved;
- post-trip prompt shown;
- post-trip feedback submitted.

Events не містять hotel name, chat text, criterion text, evidence quote, profile content або user comment.

## 11. Analytics governance

Цей документ визначає актуальні product analytics metrics, event taxonomy, dashboards і alert rules. Зміни metric definitions або targets мають бути versioned і не змінюють історичні cohorts заднім числом.

## 12. Відкриті рішення

На поточному етапі відкритих рішень для цього analytics framework немає. Provisional targets переглядаються після накопичення зазначених cohorts і samples.
