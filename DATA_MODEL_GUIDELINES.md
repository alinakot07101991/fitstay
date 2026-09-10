# fitstay. — Data Model Guidelines

Статус: робочий документ для погоджених правил структури даних і зв’язків між сутностями. User flows підтримуються в `USER_FLOW_GUIDELINES.md`, а продуктові правила — у `PRODUCT_GUIDELINES.md`.

## 1. Загальні принципи

- Дані мають дозволяти відтворити, на основі якого профілю, контексту, джерел і версії логіки було сформовано кожен результат.
- Історичний результат не змінюється заднім числом після редагування профілю або контексту поїздки.
- Нові значення застосовуються лише до наступної перевірки або до явно запущеного оновлення.

### Account та authentication identity

- У першій версії один `Account` має рівно один authentication method: `email_password`, `google` або `facebook`; account linking не підтримується.
- Authentication identity зберігає provider, стабільний provider subject ID, provider email і email verification state; provider access token не зберігається довше, ніж потрібно authentication architecture.
- Account зберігає immutable registration method, globally unique canonical normalized email, account verification timestamp, 18+ confirmation timestamp, created/updated timestamps і deletion state.
- Google/Facebook identity може створити verified account лише тоді, коли provider підтвердив email.
- Безкоштовне нарахування прив’язане до canonical account ID та idempotency key, а не до окремої authentication identity або callback.
- Спроба registration через інший method із тим самим canonical email не створює новий account або ledger grant і повертає flow до початкового sign-in method.
- Продукт запитує в Google/Facebook лише мінімальні authentication scopes і не отримує social graph, contacts, posts або friends data.
- Provider name може тимчасово передаватися в onboarding як editable prefill, але persistent profile зберігає лише ім’я, яке явно підтвердив користувач.
- Provider profile photo URL і image не зберігаються; avatar є derived presentation з ініціалів confirmed profile name.

## 2. Snapshot перевірки

У момент запуску кожна перевірка зберігає незмінний snapshot:

- глобальних параметрів профілю, що були скопійовані в чат;
- локальних змін контексту поточної поїздки;
- звичайних, важливих і критичних критеріїв та їхніх пріоритетів;
- ідентифікованого готелю, корпусу й категорії номера, якщо вони вказані;
- вибраної supported chat language;
- часу запуску перевірки.

Budget не є полем global traveler profile, trip chat context або primary hotel-check snapshot. Він зберігається лише в окремому `Alternative search request`, застосовується тільки до цього пошуку та не змінює source check або profile. Request містить source hotel/check ID; `geography_scope` зі значенням `same_destination`, `same_country` або `different_destination`; canonical target destination/area/country IDs; positive `maximum_price_per_night`; ISO 4217 `currency`; `check_in`; `check_out`; confirmed traveler composition snapshot; optional user-confirmed room configuration; та live-price evidence reference. `different_destination` містить рівно один confirmed destination. Maximum застосовується до всього номера або розміщення для occupancy, а не per person. Обов’язковий user-input `rooms` відсутній; default retrieval intent — одна accommodation unit для всієї групи. Room configuration стає required лише після source requirement, неможливості single-unit accommodation або явної user preference. Опції relative price direction не зберігаються. Кандидат проходить geography і budget gates лише за відповідності confirmed scope та live price для точних dates, occupancy і resolved room configuration; без такого evidence він не позначається як qualifying alternative.

Alternative price evidence зберігає source currency, nightly base amount, known mandatory taxes and fees, average nightly total, total stay price, number of nights, actual room count and allocation, retrieval timestamp, availability context і ознаку incomplete mandatory fees. Average nightly total розраховується з total stay price для всього розміщення. Якщо mandatory fee coverage неповний, сума зберігається як non-guaranteed і result отримує visible warning. Actual room configuration завжди входить до user-visible alternative result.

Якщо source currency збігається з user-selected currency, conversion не створюється. Інакше price record додатково зберігає original amount/currency, converted average nightly amount, converted stay total, target currency, FX rate, authorized FX provider, FX retrieval timestamp і rounding metadata. Converted user-facing amounts мають `approximate = true`; original source values залишаються незмінними для audit.

`Alternative search request` має окремі terminal outcomes щонайменше `completed`, `no_match`, `price_data_unavailable` і `technical_failure`. Inventory retrieval record зберігає authorized source ID, normalized query/hash, geography, dates, occupancy, budget, pagination або cursor metadata, returned candidate count, provider completeness signal, truncation/limit flags і retrieval timestamp. Фіксованого minimum hotel count немає. `no_match` валідний лише за explicit complete response для цього query та відсутності candidate, який пройшов constraints. Missing, unavailable, capped, truncated або completeness-unknown response дає `price_data_unavailable`; request inputs зберігаються, candidate result не створюється, а пов’язаний credit reservation повертається.

Якщо користувач пізніше змінює критерії або інший контекст у чаті, попередній snapshot і результат залишаються без змін. Оновлені параметри застосовуються лише до наступної перевірки.

## 3. Синхронізація профілю з наявним чатом

- Зміни глобального профілю не застосовуються до наявного чату автоматично.
- Система зберігає інформацію про те, що контекст чату відрізняється від актуального глобального профілю.
- Користувач може явно застосувати актуальні значення через `Update from profile`.
- Під час оновлення нові значення глобального профілю застосовуються як базовий шар, а всі параметри, які користувач явно змінив у цьому чаті, зберігаються поверх нього.
- Chat-level overrides завжди мають пріоритет над глобальним профілем.
- Оновлення змінює поточний контекст чату лише для майбутніх перевірок; snapshots завершених перевірок залишаються без змін.

## 4. Ідентичність готелю

- Сутність готелю зберігає офіційну назву, адресу, координати та доступні ідентифікатори зовнішніх джерел.
- У першому релізі об’єкт перевірки має бути розташований у Європі або Туреччині; країна проживання користувача цим правилом не обмежується.
- Корпус або будівля, категорія номера та дати поїздки зберігаються як окремі необов’язкові поля, а не як частина одного текстового поля hotel.
- Якщо доступні дані не показують суттєвих відмінностей, аналіз виконується на рівні готелю без додаткового уточнення.
- Якщо корпус або категорія номера суттєво впливають на критерії користувача, система просить уточнення.
- Якщо потрібну деталізацію неможливо визначити, пов’язаний висновок позначається як `Unknown`; це не зупиняє аналіз інших критеріїв, якщо не порушено правила критичних критеріїв.

## 5. Evidence snapshot

Для кожного доказу зберігаються:

- тип і назва джерела та URL;
- дата публікації або відгуку, якщо доступна;
- дата й час отримання;
- оригінальний релевантний фрагмент і переклад, якщо він використовувався;
- зв’язок із висновком, який доказ підтверджує або спростовує;
- зв’язок із готелем, корпусом або категорією номера;
- рівень упевненості;
- технічний ідентифікатор або content hash для виявлення змін.

Повна копія сторінки, повний масив відгуків або інший надлишковий контент не зберігаються без окремо підтвердженого юридичного права чи ліцензії.

## 6. Версіонування результату

Кожна перевірка та версія результату зберігають:

- версію scoring logic;
- версію result schema;
- назву та версію використаної моделі;
- версію prompt і pipeline configuration;
- мову user-visible result і evidence translation;
- дату й час аналізу;
- ідентифікатори використаних evidence records.

Внутрішні міркування або chain of thought моделі не зберігаються та не показуються користувачеві. Для пояснення використовуються лише перевірювані висновки, правила scoring і evidence.

## 7. Credit ledger

- Баланс кредитів не зберігається як одне довільно редаговане число.
- Кожне безкоштовне або платне нарахування, резервування, остаточне списання, звільнення резерву, повернення й ручне коригування записуються як окрема незмінна ledger operation.
- Операція містить тип, кількість кредитів, дату й час, статус, причину та пов’язаний account ID.
- Якщо операція стосується перевірки, вона пов’язується з конкретними trip chat і check ID.
- Якщо операція стосується покупки або повернення оплати, вона пов’язується з payment transaction ID.
- Поточний баланс розраховується з ledger operations.
- Ідемпотентний ключ запобігає повторному нарахуванню або списанню однієї операції.
- Кожен кредитний reserve/spend пов’язується з конкретним grant або purchase lot, з якого походить кредит.
- Спочатку використовуються дві безкоштовні перевірки нового акаунта, потім — найстаріші доступні платні кредити за принципом FIFO.

## 8. Видалення та retention

- Видалення чату охоплює його локальний контекст, повідомлення, перевірки та результати.
- Credit ledger не переписується й не втрачає операцій, але посилання на видалені чат і перевірку більше не відкриває їхній зміст.
- Видалення акаунта охоплює профіль, персональні дані, чати, повідомлення, перевірки та результати.
- Платіжні й бухгалтерські записи зберігаються лише в мінімальному обсязі та протягом строку, якого вимагає застосовне законодавство; після цього вони видаляються або знеособлюються.
- Знеособлені продуктові метрики не повинні дозволяти відновити особу користувача.
- Планована юрисдикція юридичної особи — Швейцарія. Точні строки retention визначаються після юридичної перевірки та вибору платіжного провайдера.

## 9. Saved hotel

- `Saved hotel` посилається на конкретні hotel ID, trip chat, check ID і result version ID.
- Збереження не є окремою копією результату: воно відкриває саме ту версію, яку користувач зберіг.
- Повторна перевірка того самого готелю не замінює збережену версію автоматично.
- Користувач може явно оновити saved reference до нової версії результату.
- Якщо користувач видаляє пов’язаний чат або результат, saved reference також видаляється; окрема копія результату не зберігається.

## 10. Мінімальний набір сутностей MVP

1. Account.
2. Traveler profile.
3. Trip chat.
4. Chat context і його зміни.
5. Hotel, building і room category.
6. Hotel check.
7. Result version.
8. Criterion evaluation / claim.
9. Evidence record.
10. Saved hotel.
11. Credit ledger operation.
12. Payment transaction.
13. Issue report.
14. Post-trip feedback.
15. In-app notification.

Для дітей, партнерів або інших супроводжуючих не створюються окремі персональні сутності. Зберігаються лише склад поїздки, вік дітей за потреби та функціональні вимоги без імен супроводжуючих.

До однозначної hotel identification новий trip chat існує лише як transient client/session state і не входить до persistent history. Повідомлення та зміна trip context без ідентифікованого готелю не створюють persistent chat. Після автоматичної однозначної ідентифікації або явного вибору користувачем створюється persistent `Trip chat` зі status `draft`. Він зберігає snapshot актуального global profile, chat-level overrides, якщо вони були, та canonical hotel ID, але ще не містить запущеного `Hotel check`. History representation використовує destination як primary label, hotel name як secondary label, badge `Draft` і `updated_at` як дату останньої зміни. Якщо користувач залишає flow до hotel identification, transient state видаляється без history record. Після запуску першої перевірки chat перестає мати draft status, а history representation не показує replacement lifecycle, result або error badge; ці стани належать `Hotel check` і result усередині чату. Точні database enum names визначаються в implementation schema.

## 11. Payment transaction

Payment transaction зберігає:

- внутрішній transaction ID;
- зовнішній transaction ID платіжного провайдера;
- назву провайдера;
- вибраний пакет перевірок;
- суму й валюту;
- статус;
- дату й час створення та останнього оновлення;
- idempotency key;
- receipt URL, якщо його надає провайдер;
- пов’язані credit ledger operations.

Продукт не зберігає номер картки, CVV або інші платіжні реквізити. Їх обробляє сертифікований платіжний провайдер.

## 12. Кастомний критерій

Кастомний критерій зберігає:

- оригінальне формулювання користувача без переписування;
- нормалізовані внутрішні категорії або attributes для retrieval і scoring;
- рівень важливості;
- scope: global profile або конкретний trip chat;
- статус інтерпретації та рівень упевненості.

Один користувацький критерій може бути пов’язаний із кількома внутрішніми attributes. Якщо система не впевнена в інтерпретації, вона просить користувача уточнити зміст і не застосовує непідтверджене зіставлення автоматично.

AI-suggested criterion зберігається окремо як suggestion і не впливає на профіль, контекст чату, retrieval або scoring, доки користувач явно не додасть його та не вибере рівень важливості.

## 13. Criterion evaluation / claim

Кожен criterion evaluation зберігає criterion ID, original user wording, normalized claim, одну primary score category, hotel/building/room scope, assessment state, fit state, supporting та opposing evidence IDs, recency metadata, deterministic confidence level і коротке evidence-based explanation.

Compound user requirement зберігає зв’язок із створеними atomic criterion IDs. Fit state `partly_meets` валідний лише для indivisible criterion із material limitation; `unknown` не може автоматично перетворюватися на `partly_meets`. Для critical criterion `partly_meets` встановлює mandatory gate state `failed` і overall result `Doesn’t fit`. Якщо documented limitation несумісне з конкретним user або trip context, criterion зберігається як `doesnt_meet`, а не `partly_meets`.

Для deterministic confidence calculation зберігаються: claim type (`objective_operational` або `subjective_experience`), source type, official-source flag, entity scope match, source/review dates, relevant review corpus size, independent supporting review count, platform count, conflict flag і причина присвоєного confidence level. Для `High` objective claim потрібні current official source, exact scope match і відсутність credible recent conflict. Для `High` subjective claim потрібні minimum 20 relevant reviews і minimum 3 independent recent supporting reviews у різні дати без credible conflict; second platform є supporting diversity signal, але не mandatory gate. `Medium` охоплює один reliable independent non-review source, review corpus 10–19 або single-platform evidence, що не проходить High gates. Single review, indirect чи outdated evidence, unclear scope або corpus менше 10 для pattern claim отримують `Low`.

Criterion evaluation також зберігає deterministic `evaluated` flag. Він має значення `true` лише для assessment `Known`, що пройшов evidence validation. `Likely`, `Conflicting` і `Unknown` завжди мають `evaluated = false` та не входять до numeric score, evaluated count або evaluated weight. Для `Likely` зберігається tentative strength/risk role; likely critical або safety signal додатково зберігає blocking/warning state.

Для normal та important criterion schema дозволяє `evaluated = true` за `Known + High` або `Known + Medium confidence`. Для critical criterion positive confirmation і `evaluated = true` дозволені лише за `Known + High confidence`; `Known + Medium` зберігає preliminary blocking state. Комбінація `Known + Low confidence` невалідна й перед збереженням понижується до `Likely` або `Unknown`. Low-confidence negative safety signal зберігає warning state без confirmed-fact status.

Дозволені primary score categories: `Room & comfort`, `Food & service`, `Location & logistics` і `Facilities & experience`. Критерій може бути пов’язаний із кількома internal attributes, але для category scoring враховується лише в одній primary category, щоб уникнути double counting.

Кожен category result зберігає total active criterion count, evaluated criterion count, total active weight, evaluated weight, weighted coverage, critical gate state, score eligibility state, numeric score або no-score state та IDs включених criterion evaluations. Numeric score дозволений лише за evaluated criterion count не менше 2 і weighted coverage не менше 50%. Єдиний active critical criterion зберігається та показується як critical outcome без category score. Якщо critical gate категорії failed через `doesnt_meet` або `partly_meets`, primary no-score state має значення `critical_issue`. Якщо critical gate unresolved через `unknown`, `likely` або `known_medium_confidence`, primary no-score state має значення `needs_verification`, а overall result state обмежується `preliminary`. В обох випадках eligible match решти criteria зберігається окремо як secondary `other_criteria_match`. Failure або unresolved state однієї category не змінює numeric eligibility інших categories.

Поле primary category state приймає рівно одне значення за precedence `critical_issue` → `needs_verification` → `not_enough_data` → `numeric_score`. Schema validation відхиляє numeric primary state, якщо активний будь-який state вищого пріоритету.

Overall result зберігає total active criterion count, evaluated criterion count, total active weight, evaluated weight, weighted coverage, critical verification state, score eligibility state, result state і numeric score або no-score reason. `Full` eligibility потребує minimum 70% weighted coverage, усіх verified critical criteria та minimum 5 evaluated criteria або всіх active criteria, якщо їх менше п’яти. `Preliminary` numeric eligibility потребує minimum 50% weighted coverage і 3 evaluated criteria. Нижчий coverage або count зберігається як `Not enough data` без overall number. Для `Doesn’t fit` через failed critical criterion зберігаються failed critical criterion IDs; розрахований percentage, якщо він eligible, записується в окреме secondary field `other_preferences_match`, а не як primary overall match score. Category scores залишаються supporting details.

Primary overall result state зберігається як одне значення за precedence `doesnt_fit` → `not_enough_data` → `preliminary` → `fits`. Confirmed critical failure встановлює `doesnt_fit` незалежно від coverage. Threshold-based `doesnt_fit` валідний лише за full eligibility і score нижче versioned `fit_threshold`, provisional value якого для MVP дорівнює 70. Без confirmed failure стан `not_enough_data` має пріоритет над `preliminary`, доки minimum preliminary eligibility не виконано. State `fits` валідний лише за full eligibility, усіх confirmed critical criteria та score не нижче `fit_threshold`. Result metadata зберігає scoring configuration version і застосоване threshold value.

Для кожного overall, category і secondary percentage зберігаються `raw_score` із повною calculation precision та `display_score` як integer після deterministic half-up rounding. Verdict threshold порівнюється з `display_score`, щоб displayed percentage і result state не суперечили одне одному. Приклад: `raw_score = 69.5` дає `display_score = 70`.

`display_score` має inclusive range 0–100; значення 100 зберігається без artificial cap. Result metadata разом зі score містить evaluated count, total active count, analysis date та evidence scope, щоб 100% залишалося match measurement, а не guarantee claim.

Числовий confidence, не виведений із зафіксованих правил, не зберігається й не показується.

## 14. Відкриті рішення

1. Обов’язкові поля для кожної погодженої сутності.
2. Точні строки retention після юридичної перевірки для Швейцарії та підтримуваних ринків користувачів.
