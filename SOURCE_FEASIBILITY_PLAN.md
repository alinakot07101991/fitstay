# fitstay. — Source Feasibility Plan

Статус: погоджений план ранньої технічної перевірки; виконано preliminary access desk research, live API POC і вибір конкретних готелів ще не завершені.

## 1. Мета

Перевірити до повноцінної розробки retrieval pipeline, чи можна стабільно зібрати достатню доказову базу для персоналізованої перевірки готелів у Європі та Туреччині.

Це не замінює обов’язкову ручну перевірку щонайменше 100 сценаріїв перед публічним запуском.

## 2. Обсяг

- 30 готелів у Європі та Туреччині;
- щонайменше 10 країн; початкова вибірка охоплює 11 країн;
- city hotels;
- resorts;
- boutique hotels;
- family hotels;
- budget hotels;
- luxury hotels.

Вибірка має включати різні мови джерел, великі мережі та незалежні готелі, а також об’єкти з кількома корпусами або room categories.

Ці 30 готелів є internal fixed test set для feasibility та повторного regression testing, а не каталогом доступних користувачеві об’єктів. Product приймає будь-який готель у Європі або Туреччині; кожен конкретний check усе одно проходить entity і minimum-evidence gates. Нові реальні складні випадки, знайдені під час експлуатації продукту, додаються до regression set.

Початковий перелік країн:

1. Іспанія.
2. Італія.
3. Франція.
4. Греція.
5. Португалія.
6. Хорватія.
7. Німеччина.
8. Швейцарія.
9. Польща.
10. Велика Британія.
11. Туреччина.

## 3. Що перевіряємо

Для кожного готелю фіксуємо:

- чи вдалося однозначно ідентифікувати об’єкт;
- чи доступний офіційний сайт;
- які незалежні джерела доступні;
- кількість і актуальність доступних відгуків;
- чи виконується minimum evidence rule з `PRODUCT_GUIDELINES.md`;
- чи можна розрізнити дані готелю, корпусу та room category;
- чи доступні дати, авторство та provenance доказів;
- чи доступна live price для точних dates і occupancy, повні mandatory fees та original currency;
- чи повертає source actual room configuration і коли вимагає явний room allocation input;
- чи надає inventory source надійний completeness signal, pagination metadata та ознаки cap/truncation для exact query;
- чи можна стабільно отримати timestamped FX rate з authorized provider і відтворити conversion;
- час виконання retrieval та аналізу;
- фактичну технічну вартість перевірки;
- помилки, обмеження доступу та нестабільні джерела.

## 4. Результат тесту

Після завершення тесту підготувати:

- coverage report за країнами, типами готелів і джерелами;
- перелік сценаріїв, де можливий full, preliminary або no-data result;
- оцінку часу й вартості однієї завершеної перевірки;
- перелік джерел, для яких потрібні API, partnership або licensed access;
- рекомендацію go / revise / no-go для retrieval approach.

## 5. Стартові pass/fail thresholds

Retrieval approach проходить ранню перевірку, якщо:

- щонайменше 80% вибірки дають full result;
- не більше 20% завершуються як `Preliminary result` або `Not enough data`;
- неправильно ідентифікованих готелів — 0;
- непідтверджених позитивних висновків за критичними критеріями — 0;
- median end-to-end check time не перевищує 3 хвилини;
- 90% перевірок завершуються не довше ніж за 5 хвилин;
- variable cost однієї завершеної перевірки не перевищує €0.30.

Поріг cost базується на найнижчій поточній ціні €1 за перевірку та залишає близько 70% до врахування постійних витрат. Якщо будь-який критичний quality threshold порушено, результат тесту — `revise` або `no-go` незалежно від середнього coverage.

У цьому threshold variable cost означає прямі витрати completed full hotel check на AI/LLM, retrieval і search APIs, translation, processing та proportional storage. Він не включає salaries, development або fixed SaaS subscriptions. Cost пошуку альтернативи вимірюється окремо без початкового target, оскільки внутрішній пошук може обробляти кількох кандидатів. Fully loaded cost з payment/Merchant-of-Record fees, support і credit returns визначається після появи фактичних даних.

## 6. Правила доступу під час тесту

- Доступні публічні сторінки можна використовувати для внутрішнього feasibility test і прототипу лише в межах правил джерела.
- Не обходити login, anti-bot protection, rate limits, robots restrictions або інші технічні й договірні обмеження.
- Результат тесту не є автоматичним дозволом використовувати те саме джерело у платному production product.
- До платного запуску для кожного ключового джерела має бути підтверджено API, partnership, licensed provider або інший явно дозволений access path.

## 7. Preliminary source access findings — 2026-09-08

Цей розділ фіксує перевірені обмеження офіційно документованих access paths. Він не є завершеним live POC і не підтверджує production rights.

### Booking.com Demand API

- Demand API доступний не анонімно: потрібні статус Booking.com Managed Affiliate Partner, погоджений contract, Partner Centre, API key і affiliate ID.
- API може надавати property identity, details, room data, availability, pricing, review comments і review scores.
- Review endpoints доступні лише тоді, коли це прямо дозволяє конкретний partner agreement.
- Описані Booking.com integration types орієнтовані на travel content і booking journey, зокрема redirect до Booking.com. Потрібне письмове підтвердження, що fitstay може використовувати дозволені content/review endpoints у продукті без booking CTA, оскільки продуктове правило забороняє кнопки переходу для бронювання.
- Офіційні джерела: [Demand API prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites), [About accommodations](https://developers.booking.com/demand/docs/accommodations/about-accommodation), [Demand API overview](https://developers.booking.com/demand/docs).

### Tripadvisor Content API

- Content API призначений для consumer-facing websites і apps; proposed integration має пройти approval.
- Офіційний developer portal описує доступ до business details і не більше трьох reviews та двох photos на location.
- Такий response може бути secondary evidence, але сам по собі не дозволяє визначати повторювані review signals за чинними minimum-evidence rules fitstay.
- Eligibility і production approval потрібно підтвердити до інтеграції; FAQ також вказує на вимогу working product URL для application review.
- Офіційні джерела: [Tripadvisor Developer Portal](https://developer-tripadvisor.com/), [Content API FAQ](https://developer-tripadvisor.com/content-api/FAQ/).

### Google Places API

- Place Details придатний для hotel identity, canonical address, coordinates, website, aggregate rating і review count.
- API повертає не більше п’яти reviews, відсортованих за relevance, тому не може бути єдиним corpus для аналізу повторюваних complaints або strengths.
- Display Google Maps content потребує attribution. Для кожного показаного review користувач повинен мати прямий доступ до source review у Google Maps; review ordering/filtering також потрібно пояснювати.
- Google Places може бути identity та secondary-evidence source, але не повним review-analysis source.
- Офіційні джерела: [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details), [Place resource and review limits](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places), [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies).

### Google Hotel Prices

- Документація Google Hotel Prices описує інтеграцію, через яку hotel/travel partners передають Google власні prices, availability та inventory.
- Це не підтверджений general-purpose read API, з якого fitstay може отримувати live market prices для довільних готелів.
- Google Hotel Prices не розглядається як primary inventory source, доки окремий authorized partner path не підтверджено.
- Офіційне джерело: [Hotel Prices documentation](https://developers.google.com/hotels/hotel-prices).

### Official hotel websites

- Офіційний сайт може бути primary source для hotel identity, facilities, policies, room descriptions, renovation statements і pet/children rules.
- Офіційний сайт не є незалежним evidence для суб’єктивного guest experience і не замінює review corpus.
- Універсального API немає. Automated retrieval, цитування, збереження та refresh потрібно перевіряти окремо для кожного site або authorized retrieval provider.

### Виявлена source-to-quality суперечність

Чинні quality rules потребують щонайменше 10 доступних reviews для висновку про повторюваність і щонайменше 20 для High-confidence subjective experience. Standard Tripadvisor Content API і Google Places разом надають максимум вісім reviews на hotel. Отже:

- ці два API без додаткового licensed corpus не можуть самостійно виконати review-volume gates;
- Booking.com може потенційно закрити цей розрив лише після partner approval і explicit review-endpoint permission;
- якщо Booking.com або інший licensed review provider недоступний, product не повинен формувати повний висновок про recurring review signals;
- minimum-evidence thresholds не змінюються до live POC; розрив фіксується як P0 blocker.

Preliminary verdict: `revise / access unresolved`. Hotel identity і official facts технічно доступні. Trustworthy review-corpus analysis та live-price completeness ще не підтверджені.

## 8. Наступний POC-крок

1. Подати або підготувати заявки на Booking.com Demand API і Tripadvisor Content API з точним описом non-booking fitstay use case.
2. Отримати письмове підтвердження дозволених endpoints, display requirements, storage, quotation, derived AI analysis і відсутності booking CTA.
3. Паралельно оцінити licensed hotel/review data providers, які дозволяють AI-derived analysis і повертають достатній review corpus.
4. Лише після підтвердження access path обрати 30 готелів і виконати live retrieval test за thresholds розділу 5.
5. Якщо достатнього authorized review corpus немає, зупинити full-result implementation і повернутися до product-scope decision, не знижуючи evidence rules непомітно.

## 9. Відкриті рішення

1. Конкретні готелі у вибірці.
2. Authorized access path для кожного джерела.
3. Authorized FX-rate provider, freshness window і fallback behavior.
4. Inventory provider completeness semantics і спосіб виявлення capped або truncated response.
5. Licensed review corpus, достатній для чинних 10/20-review quality gates.
6. Сумісність Booking.com partner terms із відсутністю booking CTA у fitstay.
