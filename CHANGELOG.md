# fitstay. — Changes Log

Цей документ є єдиним журналом змін у продукті та його документації. Він допомагає розуміти, що саме змінилося, чому, хто погодив зміну та які артефакти вона зачіпає.

## Правила ведення

- Додавати запис у цей файл одночасно зі зміною коду, дизайну, продуктового правила або документації.
- Не редагувати й не видаляти попередні записи. Якщо рішення змінюється, додати новий запис із посиланням на попередній.
- Фіксувати лише факти: не додавати припущення, незатверджені варіанти або зміни, яких не було.
- Для змін, що потребують рішення користувача, вказувати статус `Погоджено`, `Відкрито` або `Скасовано`.
- Один запис може охоплювати кілька файлів, якщо це одна логічна зміна.

## Формат запису

```md
### YYYY-MM-DD — Коротка назва зміни

- Тип: Product / UX / UI / Content / Documentation / Code / Data / Operations
- Статус: Погоджено / Відкрито / Скасовано
- Зміна: що саме було додано, змінено або видалено.
- Причина: навіщо це зроблено.
- Артефакти: перелік файлів, екранів або компонентів.
- Вплив: що варто перевірити або оновити далі.
```

---

## Історія

### 2026-09-12 — Повна search history під час нового hotel search

- Тип: Product / UX / Code
- Статус: Погоджено
- Зміна: ліва sidebar більше не замінює весь список одним поточним draft або active hotel. Під час нового пошуку вона показує всі збережені hotel checks у порядку від найновішого, додає поточний draft без дублювання і зберігає доступ до попередніх checks.
- Причина: користувач має бачити повний контекст пошуків і переходити до попередніх hotel chats навіть під час створення нового check.
- Вплив: змінено лише формування видимого списку в search history; Firestore/local persistence, hotel search flow та центральна область не змінені.

### 2026-09-12 — Додано Groq evidence analysis і scoring methodology 5/3/1

- Тип: Product / Code / Data / Operations
- Статус: Погоджено
- Зміна: додано server-only Groq analysis layer для класифікації вже зібраного hotel evidence за кожною user preference через strict Structured Outputs. Затверджено нову versioned scoring formula: Critical `5`, Important `3`, Nice to have `1`; status values `1 / 0.75 / 0.5 / 0.25 / 0`, а `insufficient_evidence` виключається з numerator і denominator. Match Score обчислює лише application code; Groq не генерує відсоток.
- Причина: перетворити traceable multi-provider evidence на персоналізовані, перевірювані висновки без prior hotel knowledge, unsupported claims або змішування confidence з percentage.
- Артефакти: `server/groq-analysis-service.js`, `server/groq-analysis.js`, declarations, `server/groq-analysis.test.mjs`, `src/hotelAnalysis.ts`, shared provider usage store, `vite.config.ts`, `.env.example`, Sites environment і runtime cache.
- Вплив: один uncached analysis використовує максимум один Groq request плюс один transient retry; до model context потрапляє максимум 30 source-diverse evidence items, completed results кешуються на 7 днів, atomic D1 limit має default `20` analyses per UTC day. UI та retrieval providers не змінено.

### 2026-09-12 — Інтегровано YouTube hotel evidence provider

- Тип: Code / Data / Operations
- Статус: Погоджено
- Зміна: додано незалежний server-only YouTube Data API v3 provider для контрольованого пошуку hotel review, room tour і guest experience videos, перевірки metadata, отримання максимум 20 top-level comments на відео та нормалізації traceable video/comment evidence. Search обмежено трьома requests, обробку — десятьма unique videos, pagination, replies, transcripts, audio/video downloads і Groq analysis не додано.
- Причина: додати відео та публічні guest comments до майбутнього мультиджерельного hotel evidence pipeline без зміни canonical Google Places identity.
- Артефакти: `server/youtube-evidence-service.js`, `server/youtube-evidence.js`, `server/youtube-usage-store.js`, declarations, integration tests, `src/youtubeEvidence.ts`, `db/schema.ts`, `drizzle/0000_youtube_daily_usage.sql`, `vite.config.ts`, `.env.example`, `.openai/hosting.json` і Sites runtime environment.
- Вплив: evidence кешується на 7 днів; атомарний D1 counter зупиняє зовнішні YouTube requests після configurable UTC daily limit, default `50`. UI, Google Places, SerpApi, Tavily, scoring і Groq analysis не змінено.

### 2026-09-12 — Інтегровано Tavily open-web evidence provider

- Тип: Code / Data / Operations
- Статус: Погоджено
- Зміна: додано незалежний server-only Tavily provider, який приймає canonical Google Places hotel і prioritized preferences, групує споріднені критерії максимум у 5 targeted Search queries, нормалізує traceable web evidence та selectively запускає basic Extract максимум для 5 URL із недостатнім snippet. Research і Crawl API не використовуються; кожен зовнішній запит має не більше одного retry й входить у жорсткий per-analysis budget.
- Причина: доповнити structured review sources відкритими публічними evidence sources без запуску AI-аналізу та без uncontrolled crawling.
- Артефакти: `server/tavily-evidence-service.js`, `server/tavily-evidence.js`, declarations, integration tests, `src/tavilyEvidence.ts`, `vite.config.ts`, `.env.example` і Sites runtime environment.
- Вплив: успішний hotel + preference analysis кешується на 7 днів у Cloudflare Cache API з in-memory fallback для local development; UI, Google Places identity, SerpApi reviews, scoring і Groq analysis не змінено.

### 2026-09-11 — Google Places став canonical hotel identity layer

- Тип: Code / Data / Operations
- Статус: Погоджено
- Зміна: додано окремий server-only Google Places API (New) service для Text Search, conservative hotel matching, stable Place ID і базової metadata. Запит використовує мінімальний field mask без reviews або photos, повертає ambiguous candidates замість неявного вибору, не робить automatic retries і кешує успішні resolutions на 24 години на server instance та в browser session.
- Причина: створити canonical hotel identity, яку надалі використовуватимуть SerpApi, Tripadvisor та інші evidence providers, не перетворюючи Places на review corpus.
- Артефакти: `server/google-places-service.js`, `server/google-places-service.d.ts`, `server/google-places.js`, `server/google-places.d.ts`, `server/google-places.test.mjs`, `src/googlePlaces.ts`, `vite.config.ts`, `.env.example` і Sites runtime environment.
- Вплив: один uncached hotel lookup виконує один Google Places request; UI, Groq analysis, scoring і review collection не змінено.

### 2026-09-11 — Інтегровано SerpApi Google Hotels reviews

- Тип: Code / Data / Operations
- Статус: Погоджено
- Зміна: додано modular server-only provider для ідентифікації Google Hotels property, перевірки неоднозначних збігів, отримання Google-only reviews через pagination token, нормалізації оригінального review text та структурованої обробки missing token, no reviews, invalid key, quota, network і malformed response failures. Додано безпечне development logging без API key.
- Причина: підготувати Google Hotels review corpus для майбутнього AI-аналізу без передавання SerpApi API key у browser code.
- Артефакти: `server/serpapi-google-hotels.js`, `server/serpapi-google-hotels.d.ts`, `server/serpapi-google-hotels.test.mjs`, `src/googleHotelsReviews.ts`, `vite.config.ts`, `.env.example` і Sites runtime environment.
- Вплив: UI, Groq analysis і match-score не змінено; внутрішній endpoint повертає hotel identity, property token, кількість і нормалізовані reviews.

### 2026-09-11 — Інтегровано Tripadvisor Terra reviews API

- Тип: Code / Data / Operations
- Статус: Погоджено
- Зміна: додано server-only endpoint для пошуку hotel Location ID у Tripadvisor Terra, виявлення неоднозначних збігів, посторінкового отримання оригінальних відгуків із `language=primary`, нормалізації review data та структурованої обробки 400, 404, 429 і upstream failures. Додано безпечне server-side логування кількості API calls, reviews і pagination pages.
- Причина: підготувати Tripadvisor review corpus для наступного етапу AI-аналізу без передавання Terra API key у browser code.
- Артефакти: `server/tripadvisor.js`, `src/tripadvisorReviews.ts`, `vite.config.ts`, `.env.example`, server integration tests і Sites runtime environment.
- Вплив: AI-аналіз ще не запускається; API повертає hotel identity, Tripadvisor Location ID, кількість і нормалізовані reviews.

### 2026-09-10 — Додано persistent chat composer і broad hotel lookup

- Тип: Product / UX / UI / Code / Documentation
- Статус: Погоджено
- Зміна: у нижній частині pre-check chat додано text composer без attachment actions: порожнє поле показує microphone icon, непорожнє — send icon. Нові повідомлення продовжують той самий чат. Lookup приймає partial name, окреме слово, destination, brand або URL; matching properties показуються для вибору, а brand queries із понад чотирма properties переводяться в clarification state. `No, change hotel` фокусує повторний ввід у тому самому чаті; `Yes, start check` запускає перевірку.
- Причина: дозволити природне уточнення hotel identity в conversation flow без вимоги одразу знати повну назву готелю.
- Артефакти: `src/VisualLab.tsx`, `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, Home pre-check chat і shared draft state.
- Вплив: draft створюється лише після ідентифікації або вибору конкретного property; credit flow до підтвердження не запускається.

### 2026-09-10 — Blob обмежено processing state

- Тип: UX / UI / Code / Documentation
- Статус: Погоджено
- Зміна: brand blob прибрано з AI identification response. Під час processing він показується окремо під поточним chat content, анімується без background container і повністю зникає після появи hotel confirmation result.
- Причина: відокремити системний processing indicator від авторства AI-відповіді та наблизити chat rhythm до наданого Claude reference.
- Артефакти: `src/VisualLab.tsx`, `USER_FLOW_GUIDELINES.md`, Home pre-check chat.
- Вплив: animation і `prefers-reduced-motion` fallback збережено; hotel card, CTA та draft lifecycle не змінено.

### 2026-09-10 — Встановлено minimum font size 12 px

- Тип: UI / Code
- Статус: Погоджено
- Зміна: усі product-facing тексти, labels, badges, metadata та supporting copy розміром 8–11.5 px збільшено до 12 px; HTML `small` у product screens також отримали explicit 12 px.
- Причина: забезпечити єдиний мінімальний поріг читабельності в усьому продукті.
- Артефакти: `src/App.tsx`, `src/VisualLab.tsx`, Landing і всі product screens.
- Вплив: службова оболонка Design Lab не змінена; spacing і badge containers можуть потребувати лише природного розширення під більший текст.

### 2026-09-10 — Draft збережено між чатами

- Тип: Product / UX / UI / Code / Documentation
- Статус: Погоджено
- Зміна: після ідентифікації готелю draft зберігається на рівні product session і залишається в history при переходах та відкритті нового чату. Клік по логотипу `fitstay.` тепер запускає той самий new-chat action, що й `Check hotel`. Після `Yes, start check` badge `Draft` прибирається.
- Причина: не втрачати незапущену перевірку при навігації та зробити логотип очікуваною точкою повернення до нового hotel check.
- Артефакти: `src/VisualLab.tsx`, `USER_FLOW_GUIDELINES.md`, Topbar, Home і shared History.
- Вплив: новий тимчасовий чат не додається до history до ідентифікації готелю та не змінює існуючий draft.

### 2026-09-10 — Уточнено відступ між Home blocks

- Тип: UI / Code
- Статус: Погоджено
- Зміна: між hero block `Good evening, Olivia` і `Start with a quick template` встановлено вертикальний margin 24 px.
- Причина: вирівняти вертикальний ритм центральної області Home.
- Артефакти: `src/VisualLab.tsx`, Home idle state і shared Card component.
- Вплив: внутрішні padding, chat state та інші Card instances не змінено.

### 2026-09-10 — Правий sidebar став суцільною колонкою

- Тип: UI / Code
- Статус: Погоджено
- Зміна: Preferences panel переведено з окремої rounded card у повновисотну праву колонку без зовнішніх відступів, скруглення й perimeter outline; додано лише divider зі сторони центрального контенту та ту саму translucent white surface, що в лівого sidebar.
- Причина: уніфікувати app shell і зробити обидві бічні панелі частинами єдиного edge-to-edge layout.
- Артефакти: `src/VisualLab.tsx`, shared desktop Shell і Preferences.
- Вплив: ширина, вміст, іконки та переходи правої панелі не змінено; mobile/tablet presentation не зачеплено.

### 2026-09-10 — Повернуто beige interaction states

- Тип: UI / Code
- Статус: Погоджено
- Зміна: coral hover/focus для secondary controls скасовано. Кнопки й поля знову використовують warm beige `#F3F0EB`; pressed state і focused hotel input — темніший beige `#E8E2DA`. Вкладені icon surfaces на hover також переведено в темніші beige tones із neutral glyph.
- Причина: повернути спокійнішу neutral interaction hierarchy та залишити coral виключно для brand accents і primary CTA.
- Артефакти: `src/index.css`, усі product buttons, inputs і icon surfaces.
- Вплив: focus ring основного hotel input залишається відсутнім; validation error outline, primary CTA, user avatar і Landing page не змінено.

### 2026-09-10 — Посилено коралові interaction states

- Тип: UI / Code
- Статус: Погоджено
- Зміна: secondary buttons та inputs отримали hover/focus `#FBE7E2` і pressed `#F7D8D0`; вкладена icon surface у кнопках стає темнішою кораловою `#F2BFB5` із контрастним glyph. В основного hotel input прибрано focus ring, а focus показано лише темнішою fill; червона outline збережена для validation error.
- Причина: зробити interaction states помітнішими, зберегти читабельність вкладених іконок і спростити active state hotel input.
- Артефакти: `src/VisualLab.tsx`, `src/index.css`, product buttons, fields, sidebar actions і analysis control.
- Вплив: primary CTA, user avatar і Landing page не змінено.

### 2026-09-10 — Збільшено caption і body typography у продукті

- Тип: UI / Code
- Статус: Погоджено
- Зміна: у всіх product screens design lab caption size змінено з 11 до 12 px, body size — з 13 до 14 px.
- Причина: покращити читабельність дрібного тексту та уніфікувати продуктову type scale.
- Артефакти: `src/VisualLab.tsx`, усі product states і design-lab annotations.
- Вплив: Landing page не змінено; наявні 10 px metadata та інші display sizes залишено без змін.

### 2026-09-10 — Quick templates обмежено idle state

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: `Start with a quick template` повернуто на початковий Home і приховано тільки після submit валідного hotel query, коли центральна область переходить у chat state. Primary template фокусує hotel input; alternative і compare actions відновили попередні переходи та popup.
- Причина: зберегти discovery shortcuts до початку conversation, але звільнити full-height chat canvas після відправлення запиту.
- Артефакти: `src/VisualLab.tsx`, Home idle і chat states.
- Вплив: validation, animated blob, hotel confirmation і sidebar lifecycle не змінені.

### 2026-09-10 — Home input перетворено на pre-check chat flow

- Тип: Product / UX / UI / Content / Code
- Статус: Погоджено
- Зміна: hotel field на Home став справжнім input і більше не виконує navigation on focus/click. Після submit релевантного hotel name або URL центральний full-height canvas переходить у chat state: user message, 1.5-second identification processing із animated brand blob, assistant confirmation і hotel card. Перевірка запускається тільки через `Yes, start check`; `No, change hotel` повертає composer. Нерелевантний запит залишає Home у початковому стані та показує `Please enter a hotel name.` Видалено весь `Start with a quick template` block.
- Причина: зробити hotel identification явною частиною conversation flow та не використовувати credit до підтвердження правильного property.
- Артефакти: `src/VisualLab.tsx`, `src/index.css`, Home central canvas, history lifecycle і analysis/result entry states.
- Вплив: до ідентифікації chat не з’являється в history; після ідентифікації показується `Draft`, після запуску badge зникає. Left і right sidebars залишаються на місці протягом flow.

### 2026-09-10 — Спрощено центральний hotel input block

- Тип: UX / UI / Content / Code
- Статус: Погоджено
- Зміна: відступ між Home heading і description зменшено до 8 px; description переписано без em dash на `See how well a hotel fits your trip and what to watch out for.` Видалено secondary actions `Add context` і `Add link`. CTA перейменовано на `Check hotel` та переведено на landing coral `#F75B56` із відповідним hover. Input sparkle отримала tertiary neutral color. Із `Your result will include` видалено `Similar hotel alternatives`.
- Причина: сфокусувати центральну область на одному primary hotel-check action і спростити інформаційну ієрархію.
- Артефакти: `src/VisualLab.tsx`, Home central card.
- Вплив: hotel identification flow і remaining result promises не змінені.

### 2026-09-10 — Спрощено empty-state icon compositions

- Тип: UI / Code
- Статус: Погоджено
- Зміна: з основного history empty-state видалено додаткову search icon на white surface, залишено лише Lucide `Hotel` у beige container. Із search-modal empty-state видалено декоративну dot, залишено чисту Lucide `Search`.
- Причина: прибрати зайві деталі та зробити empty-state icons чистішими.
- Артефакти: `src/VisualLab.tsx`, history empty state і search modal empty state.
- Вплив: тексти, розміри контейнерів і поведінка пошуку не змінені.

### 2026-09-10 — Скориговано icon sizing і sidebar controls

- Тип: UI / Code
- Статус: Погоджено
- Зміна: у header лівого sidebar прибрано постійні icon backgrounds для search і collapse controls; залишено neutral hover surface. Collapse/expand glyph замінено на Lucide `PanelLeft` без chevron. Glyphs усередині 28 px action containers `Check hotel` і `Saved hotels` зменшено з 18 до 14 px. У Preferences icon containers зменшено з 40 до 32 px, icons залишено 18 px, rows вирівняно по верхньому краю.
- Причина: зменшити візуальну вагу controls і точніше відтворити задану ієрархію розмірів.
- Артефакти: `src/VisualLab.tsx`, left history sidebar і right Preferences sidebar.
- Вплив: icon library, semantic mappings, hover animations і navigation не змінені.

### 2026-09-10 — Переведено icon system на Lucide для shadcn

- Тип: UI / Code / Operations
- Статус: Погоджено
- Зміна: додано dependency `lucide-react` і замінено локальний SVG icon map у design lab на Lucide components, які shadcn використовує як стандартний icon set. Збережено 18 px default size, 1.7 px stroke, поточні semantic names, containers і microinteractions; empty-state illustration зібрано з Lucide `Hotel` і `Search`.
- Причина: використовувати підтримувану консистентну бібліотеку замість ручних SVG glyphs.
- Артефакти: `package.json`, `pnpm-lock.yaml`, `src/VisualLab.tsx`.
- Вплив: усі sidebar UI icons та empty-state glyphs тепер походять із Lucide; лише декоративні destination images залишаються raster assets.

### 2026-09-10 — Уніфіковано icon surfaces у sidebar

- Тип: UI / Code
- Статус: Погоджено
- Зміна: sidebar icons переведено на єдину систему з beige circular surface `#F3F0EB`, graphite outline glyph і stroke 1.7 px. Стиль застосовано до search/collapse controls, `Check hotel`, `Saved hotels`, основного та search-modal empty states. У Preferences додано outline icons для travelers, special conditions, travel preferences, meal type і departure city в 40 px beige containers.
- Причина: узгодити ліву й праву панелі з наданим референсом та прибрати змішування coral і neutral icon treatments.
- Артефакти: `src/VisualLab.tsx`, expanded history sidebar, search modal і Preferences.
- Вплив: budget row не додано відповідно до чинних Home product rules; hover animations і navigation збережені.

### 2026-09-10 — Додано пошук по hotel-check chats

- Тип: UX / UI / Content / Code
- Статус: Погоджено
- Зміна: search control у desktop sidebar тепер відкриває центральний viewport-level modal за Claude-патерном. За наявності history modal показує destination image, destination, hotel, date і `Draft` badge, якщо він застосовний; введення фільтрує записи за destination, hotel і date. Для першого входу показується стабільний empty state `Nothing to search yet`, а для запиту без збігів — `No matching checks`. Dialog закривається через close control, backdrop або `Escape`.
- Причина: дати користувачеві швидкий доступ до потрібної hotel check conversation без перегляду всієї історії.
- Артефакти: `src/VisualLab.tsx`, desktop history sidebar і search modal.
- Вплив: клік по completed result відкриває result state, клік по draft — hotel confirmation state; credits і lifecycle checks не змінені.

### 2026-09-10 — Оновлено glyph для Check hotel

- Тип: UI / Code
- Статус: Погоджено
- Зміна: icon `Check hotel` замінено на темну пару чотирипроменевих sparkles — більшу зверху ліворуч і меншу знизу праворуч — відповідно до наданого референсу.
- Причина: узгодити піктограму дії з бажаною легкою AI-метафорою.
- Артефакти: `src/VisualLab.tsx`, expanded history sidebar.
- Вплив: світлий background container і hover microinteraction збережені.

### 2026-09-10 — Полегшено icon treatment для Check hotel

- Тип: UI / Code
- Статус: Погоджено
- Зміна: з icon container `Check hotel` прибрано outline, coral-tint background освітлено до кольору empty-state surface, а building glyph замінено на тонку лупу зі sparkle. Hover microinteraction збережено й перейменовано відповідно до дії перевірки.
- Причина: зменшити візуальну вагу control та зробити піктограму перевірки зрозумілішою.
- Артефакти: `src/VisualLab.tsx`, `src/index.css`, expanded history sidebar.
- Вплив: розміри, переходи й інші sidebar controls не змінені.

### 2026-09-10 — Уточнено surface, icons і microinteractions sidebar

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: фон expanded sidebar змінено на 80% white surface із легким backdrop blur. `Check hotel` отримав light-coral circular icon container з тонкою coral outline. Для `Check hotel` і `Saved hotels` додано короткі semantic hover/focus animations у дусі Claude та fallback для `prefers-reduced-motion`. Неконтекстну chat illustration в empty history замінено на тонкий контур готелю з лупою.
- Причина: зробити navigation легшою, тактильнішою та точніше пов’язати empty state із перевіркою готелю.
- Артефакти: `src/VisualLab.tsx`, `src/index.css`, desktop history sidebar і empty state.
- Вплив: структура lifecycle states і переходи між ними не змінені.

### 2026-09-10 — Додано lifecycle states для Home history

- Тип: UX / UI / Content / Code
- Статус: Погоджено
- Зміна: для першого входу додано empty state без search results із компактною coral illustration і пояснювальним текстом. Після ідентифікації готелю sidebar показує один запис із бейджем `Draft`; після запуску першої перевірки — звичайну історію без draft badge. У design lab ці стани винесено в окремі екрани `Home · first visit`, `Home · draft` і `Home · history`.
- Причина: синхронізувати sidebar із реальним lifecycle перевірки та не показувати новому користувачу вигадану історію.
- Артефакти: `src/VisualLab.tsx`, desktop history sidebar і clean preview routes.
- Вплив: mobile і tablet layouts не показують desktop history sidebar; completed results відкривають result, draft повертає до confirmation state.

### 2026-09-09 — Вирівняно sidebar і top navigation

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: правий край expanded sidebar отримав тонкий warm-gray divider; history item hover/focus surface розтягнуто на всю ширину доступної content-зони; left inset логотипа в top navigation встановлено на 24 px і вирівняно з `Search history` усередині sidebar.
- Причина: чіткіше відокремити navigation від workspace та виправити горизонтальні alignment і hover coverage.
- Артефакти: `src/VisualLab.tsx`, top navigation і expanded history sidebar.
- Вплив: ширина sidebar і структура flow не змінені.

### 2026-09-09 — Уніфіковано primary icons у history sidebar

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: `Check hotel` отримав minimalist outline hotel icon, а `Saved hotels` — outline bookmark icon; обидва glyphs використовують однаковий 18 px container, stroke, cap і join. Блок цих actions відокремлено від history results тонким warm-gray divider.
- Причина: зробити значення дій зрозумілішим і зберегти консистентність із мінімалістичною icon system продукту.
- Артефакти: `src/VisualLab.tsx`, expanded history sidebar.
- Вплив: структура та переходи sidebar не змінені.

### 2026-09-09 — Sidebar інтегровано в edge-to-edge app layout

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: expanded sidebar став повноцінною лівою колонкою шириною 320 px без зовнішніх padding, border, radius і додаткового card container; spacing перенесено на внутрішні rows. Toggle icon оновлено до GPT-подібного split-panel glyph. Після згортання sidebar повністю виходить із grid, workspace розширюється, а expand control показується як floating button поверх workspace.
- Причина: поєднати Figma-подібну структуру лівої панелі з GPT-подібним control і звільняти максимальну ширину контенту у collapsed state.
- Артефакти: `src/VisualLab.tsx`, shared desktop app layout і sidebar.
- Вплив: top navigation залишається глобальною смугою; права preference panel зберігає окремий card container.

### 2026-09-09 — Перебудовано history sidebar за ChatGPT-патерном

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: перший рядок expanded sidebar тепер містить `Search history`, search control і collapse control. Далі розміщено link-buttons `Check hotel` та `Saved hotels`, після яких одразу показується поточний список history без окремого section heading. Нижню навігацію видалено повністю.
- Причина: зробити структуру лівої панелі простішою та ближчою до navigation pattern ChatGPT.
- Артефакти: `src/VisualLab.tsx`, shared desktop sidebar.
- Вплив: Settings залишається доступним через avatar у top navigation; collapsed state як і раніше містить лише expand control.

### 2026-09-09 — Наближено sidebar toggle до Figma-патерну

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: collapse control перероблено на просту borderless panel icon у верхньому правому куті expanded sidebar. У collapsed state висока панель замінюється компактною floating card лише з expand control; нижня навігація повністю приховується.
- Причина: зробити механіку згортання легшою та ближчою до референсу Figma без зайвого icon rail.
- Артефакти: `src/VisualLab.tsx`, shared desktop sidebar.
- Вплив: `Saved hotels`, `Settings` і `Help & Support` доступні лише у розгорнутому sidebar.

### 2026-09-09 — Спрощено collapsed state лівого sidebar

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: у згорнутому sidebar приховано `Check hotel` і весь search history; залишено лише control розгортання та нижню службову навігацію. Collapse control інтегровано в край панелі як компактну floating action замість окремого рядка. Висоту `Saved hotels`, `Settings` і `Help & Support` збільшено до 36 px.
- Причина: прибрати непотрібний вміст із compact rail і покращити візуальний ритм навігації.
- Артефакти: `src/VisualLab.tsx`, shared desktop sidebar.
- Вплив: expanded sidebar зберігає history і primary action; collapsed sidebar має ширину 72 px.

### 2026-09-09 — Спрощено account controls у top navigation

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: language control прибрано; баланс `2 free checks left` показується як text-button без постійної межі, яка з’являється на hover і keyboard focus, та відкриває credits/paywall screen. Натискання на avatar відкриває user Settings.
- Причина: зменшити візуальний шум top navigation і підготувати зрозумілі точки входу до покупки credits та account settings.
- Артефакти: `src/VisualLab.tsx`, shared top navigation.
- Вплив: top navigation однаково працює на всіх app screens у design lab.

### 2026-09-09 — Оновлено app navigation і collapsible sidebar

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: wordmark `fitstay.` перенесено до top navigation; у desktop sidebar додано control згортання з compact rail 72 px; відступ після `Your search history` зменшено до 8 px; усі history rows показують destination і конкретну назву hotel. Нижні пункти `Saved hotels`, `Settings` і `Help & Support` уніфіковано як link-buttons висотою 28 px з однаковими 16 px outline icons, hover, active і keyboard-focus states.
- Причина: зробити глобальну навігацію послідовною, звільнити workspace за потреби й перетворити службові пункти на робочі destinations.
- Артефакти: `src/VisualLab.tsx`, Home, shared app shell, Saved hotels, Settings, Help & Support.
- Вплив: у згорнутому sidebar history зберігається як ряд thumbnails, а link-buttons показуються як icon-only controls із tooltip через `title`.

### 2026-09-09 — Уточнено desktop history sidebar

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: ширину лівого sidebar встановлено на 320 px; у search history додано круглі destination thumbnails для Rhodes, Bali, Barcelona, Maldives і Prague; у header sidebar залишено лише wordmark `fitstay.`; прибрано дії `View search history` і `Templates`.
- Причина: наблизити post-onboarding Home до погодженого візуального референсу та спростити службову навігацію.
- Артефакти: `src/VisualLab.tsx`, `src/imports/destination-*.png`, Home та спільний desktop app shell.
- Вплив: згенеровані фотореалістичні destination assets оптимізовано до 256 px для використання як thumbnails.

### 2026-09-09 — Додано чистий preview-режим design lab

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: query-параметр `preview` відкриває вибраний екран `/design-lab` без внутрішньої навігації, device switcher, canvas frame і review notes. Режим автоматично перемикає desktop, tablet і mobile layout відповідно до ширини browser window.
- Причина: дозволити переглядати експериментальний інтерфейс як звичайний сайт без службових елементів design workshop.
- Артефакти: `src/VisualLab.tsx`, `/design-lab?preview=home`.
- Вплив: повний workshop залишається доступним за `/design-lab`.

### 2026-09-09 — Розширено design lab до повного MVP flow

- Тип: UX / UI / Code
- Статус: Погоджено
- Зміна: у `/design-lab` додано клікабельні стани registration, email verification, onboarding, hotel identification, ambiguous match, hotel not found, paywall, analysis, preliminary-result decision, full result, not enough data, technical failure, alternative setup, verified alternative result і profile. Home наближено до наданого візуального референсу для post-onboarding стану; `Compare hotels` відкриває погоджений інформаційний popup.
- Причина: зібрати основні погоджені MVP flows в одному адаптивному стенді для послідовної візуальної роботи.
- Артефакти: `src/VisualLab.tsx`, маршрут `/design-lab`.
- Вплив: Home не містить budget або `Create a custom template`, оскільки вони виключені з погодженого MVP flow. Композиція result score залишається відкритим візуальним рішенням.

### 2026-09-09 — Додано internal Visual workshop

- Тип: UI / Code / Documentation
- Статус: Погоджено
- Зміна: додано окрему приховану сторінку `/design-lab` для спільного доопрацювання visual direction і product screens. Сторінка містить перемикання Home, Hotel check, Analysis, Result і Profile, а також desktop, tablet і mobile canvas. Вона не додана до public product navigation і не змінює основний user flow.
- Причина: відокремити visual exploration від production landing page та послідовно погоджувати екрани в одному живому середовищі.
- Артефакти: `src/VisualLab.tsx`, `src/App.tsx`.
- Вплив: усі композиції на сторінці є робочими explorations; score composition і semantic tokens залишаються відкритими рішеннями до явного погодження.

### 2026-09-08 — Виконано preliminary source access research

- Тип: Sources / Research / Documentation
- Статус: Відкрито
- Зміна: перевірено офіційно документовані access paths Booking.com Demand API, Tripadvisor Content API, Google Places API і Google Hotel Prices. Зафіксовано, що Booking.com потребує Managed Affiliate Partner contract і окремого дозволу на review endpoints, Tripadvisor стандартно надає до 3 reviews, Google Places — до 5, а Google Hotel Prices не є general-purpose read API для довільного live-price retrieval.
- Причина: перевірити головний feasibility blocker до реалізації retrieval pipeline.
- Артефакти: `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: standard Tripadvisor і Google responses разом не виконують чинні 10/20-review gates. Потрібен Booking.com review access або інший licensed corpus; до цього trustworthy recurring-signal analysis і full-result pipeline залишаються P0 blocker.

### 2026-09-08 — Прибрано обов’язковий Rooms input

- Тип: Product / UX / Data / AI / Sources / Documentation
- Статус: Погоджено
- Зміна: `Find alternative` не показує окреме обов’язкове поле `Rooms`. Default retrieval шукає одну accommodation unit для всього підтвердженого складу. Room configuration уточнюється лише коли single-unit варіант неможливий, source вимагає allocation або користувач указав окремі номери як requirement. Result завжди показує actual configuration, наприклад `1 family room` або `2 rooms`.
- Причина: не додавати friction більшості користувачів, але не формувати неправильну live price через приховане припущення про room allocation.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: retrieval integration має підтримувати single-unit default, conditional clarification і actual room configuration provenance.

### 2026-09-08 — Визначено completeness gate для No match found

- Тип: Product / UX / Data / AI / Sources / Documentation
- Статус: Погоджено
- Зміна: для `No match found` не використовується fixed hotel-count threshold. Status дозволений лише за explicit completeness signal від authorized inventory source для exact geography/date/occupancy/budget query та відсутності candidate, який пройшов constraints. Capped, truncated або completeness-unknown response дає `Price data unavailable`. Пояснення обмежує висновок доступними sources, а не всім ринком.
- Причина: кількість кандидатів не доводить повноту пошуку й суттєво відрізняється між city, resort area та country scope.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: feasibility POC має перевірити provider completeness semantics, pagination, caps і truncation detection до реалізації genuine no-match outcome.

### 2026-09-08 — Відокремлено Price data unavailable від No match found

- Тип: Product / UX / Data / AI / Analytics / Documentation
- Статус: Погоджено
- Зміна: `No match found` дозволений лише після достатнього live-price retrieval, коли жоден candidate не пройшов constraints. Якщо live price data недостатньо, alternative search завершується окремим status `Price data unavailable`: candidate не показується, credit повертається, parameters зберігаються, а `Try again` запускається лише явно.
- Причина: не видавати технічну або data limitation за доказ відсутності відповідних готелів.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `ANALYTICS_MEASUREMENT_PLAN.md`.
- Вплив: pipeline і analytics мають окремо вимірювати genuine no-match та live-price coverage failure; точний sufficient-coverage threshold ще потрібно визначити.

### 2026-09-08 — Додано geography choice до Find alternative

- Тип: Product / UX / Data / AI / Documentation
- Статус: Погоджено
- Зміна: перед alternative search користувач обирає `Same city or resort area`, `Anywhere in this country` або `Different destination`. Для останнього варіанта вводиться й підтверджується рівно одне місто, острів, resort area або країна. Один запуск охоплює один confirmed scope; система не розширює geography автоматично. Інший destination потребує нового запуску та кредиту.
- Причина: дозволити шукати як локальну, так і географічно іншу альтернативу, не роблячи пошук необмеженим і не втрачаючи trip intent.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: alternative flow потребує geography selector, destination identity confirmation і pre-scoring candidate scope gate.

### 2026-09-08 — Визначено FX conversion для alternative price

- Тип: Product / UX / Data / AI / Sources / Documentation
- Статус: Погоджено
- Зміна: source-provided user currency використовується без conversion. Якщо валюта відрізняється, deterministic code конвертує ціну через актуальний authorized FX source; user-selected currency показується як approximate із `≈`, original amount/currency залишаються в details. Зберігаються rate, provider і retrieval timestamp; missing або stale rate не дозволяє підтвердити candidate як in-budget.
- Причина: порівнювати live price з budget у вибраній користувачем валюті без прихованих або невідтворюваних обчислень.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: потрібно окремо вибрати authorized FX provider, freshness window, rounding і fallback policy та включити conversion у source feasibility POC.

### 2026-09-08 — Уточнено meaning і presentation alternative price

- Тип: Product / UX / Data / Documentation
- Статус: Погоджено
- Зміна: `Maximum price per night` у `Find alternative` означає ціну всього номера або розміщення для підтвердженого складу, а не per person. Budget gate враховує відомі mandatory taxes і fees. Result показує average nightly total і total stay price; непідтверджені mandatory fees створюють warning, а сума не називається guaranteed final price.
- Причина: зробити budget comparison однозначним і не приховувати збори, які можуть змінити реальну вартість проживання.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: live-price normalization має відрізняти base price, taxes, fees, nightly average, stay total та fee-completeness state.

### 2026-09-08 — Maximum nightly budget замінив relative price segments

- Тип: Product / UX / Data / Documentation
- Статус: Погоджено
- Зміна: у `Find alternative` прибрано `Cheaper`, `Similar price` і `More expensive`. Перед запуском користувач задає `Maximum price per night`, валюту, дати проживання та підтверджує склад мандрівників. Кандидат вважається таким, що вкладається в бюджет, лише за live price evidence для точних dates і occupancy.
- Причина: конкретне максимальне обмеження зрозуміліше за relative segment і не залежить від припущення про актуальну ціну вихідного готелю.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: alternative-search request потребує nightly amount, ISO currency, dates, traveler composition snapshot і live-price evidence; без повного input або live confirmation пошук не може повернути confirmed in-budget result.

### 2026-09-08 — Бюджет перенесено лише до Find alternative

- Тип: Product / UX / Data / Documentation
- Статус: Погоджено
- Зміна: бюджет прибрано з minimum profile, trip context і primary hotel-check flow. Він не впливає на основний match result і запитується лише всередині `Find alternative`, де застосовується до одного search request без зміни profile, source check або chat context.
- Причина: основна перевірка оцінює відповідність уже знайденого готелю та не повинна створювати очікування live price або availability verification; бюджет потрібен лише для пошуку кандидатів.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: budget control потрібно прибрати з profile і main-check preferences UI та визначити його точний формат для alternative-search form.

### 2026-09-08 — Визначено social name prefill та avatar

- Тип: Product / UX / Data / Privacy / Documentation
- Статус: Погоджено
- Зміна: Google/Facebook provider name використовується лише як редагований prefill під час profile onboarding і зберігається тільки після явного підтвердження користувачем. Provider profile photo не імпортується та не зберігається; product avatar формується з ініціалів підтвердженого імені.
- Причина: спростити onboarding без зайвого збирання зовнішніх profile data та зберегти погоджений мінімалістичний avatar.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`.
- Вплив: auth integration може читати provider name для prefill, але не повинна persist provider photo URL або image.

### 2026-09-08 — Account закріплено за registration method

- Тип: Product / UX / Data / Security / Documentation
- Статус: Погоджено
- Зміна: account входить лише через той самий канал, через який його створено: email/password, Google або Facebook. Account linking і зміна authentication method не входять до першої версії. Canonical email унікальний між усіма каналами; спроба іншого method із тим самим email не створює другий account і не нараховує free credits, а повертає користувача до початкового sign-in method.
- Причина: зберегти передбачувану модель входу та уникнути дубльованих accounts і безкоштовних нарахувань.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: auth UI має пояснювати необхідність початкового sign-in method; recovery для Google/Facebook відбувається через відповідного provider.

### 2026-09-08 — Додано Google і Facebook authentication

- Тип: Product / UX / Data / Privacy / Analytics / Documentation
- Статус: Погоджено
- Зміна: перша версія підтримує registration і sign-in через email/password, Google та Facebook. Email/password потребує verification link; Google/Facebook можуть завершити verification без окремого листа лише з provider-verified email. Вимога 18+, profile onboarding і одноразове нарахування двох free credits застосовуються до всіх методів. Analytics activation тепер відраховується від універсального account verification, а social authentication обмежено мінімальними scopes без social graph, contacts, posts або friends data.
- Причина: зменшити friction під час реєстрації та підтримати звичні способи входу без послаблення verification, privacy й anti-duplication rules.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`.
- Вплив: потрібно вибрати auth provider, налаштувати Google/Facebook applications і окремо визначити account-linking behavior для однакових email.

### 2026-09-08 — Draft badge прибирається після запуску перевірки

- Тип: UX / Data / Documentation
- Статус: Погоджено
- Зміна: badge `Draft` показується в history лише до запуску першої перевірки. Одразу після запуску він зникає й не замінюється на `Checking`, `Completed`, result status або error status. Progress і результат залишаються всередині чату.
- Причина: не перевантажувати history lifecycle-статусами та використовувати badge лише для позначення підготовленої, але ще не запущеної перевірки.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: history item renderer має залежати лише від pre-launch draft state; check і result statuses не створюють history badges.

### 2026-09-08 — Визначено history row для draft

- Тип: UX / Data / Documentation
- Статус: Погоджено
- Зміна: history row збереженого draft показує destination у першому рядку, назву ідентифікованого готелю в другому, badge `Draft` і дату останньої зміни.
- Причина: одночасно показувати контекст поїздки, конкретний об’єкт і незавершений стан чату.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: trip chat list item має отримувати canonical destination, hotel display name, draft status і `updated_at`.

### 2026-09-08 — Уточнено момент збереження chat draft

- Тип: Product / UX / Data / Documentation
- Статус: Погоджено
- Зміна: попереднє правило збереження після будь-якої значущої дії замінено. Тепер чат стає persistent draft лише після однозначної ідентифікації введеного готелю або явного вибору об’єкта користувачем. Draft містить profile snapshot, chat-level customization, якщо вона була, та canonical hotel identity без запущеної перевірки. У history показуються destination готелю та badge `Draft`. Повідомлення або зміна контексту без ідентифікованого готелю не зберігають чат.
- Причина: draft повинен представляти конкретний підготовлений hotel check; без hotel identity неможливо надійно визначити destination та корисну одиницю історії.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: цей запис замінює погоджене раніше 2026-09-08 правило про persistence після hotel input, message або context change; попередній запис зберігається як audit history.

### 2026-09-08 — Визначено lifecycle порожнього chat draft

- Тип: Product / UX / Data / Documentation
- Статус: Погоджено
- Зміна: новий trip chat не показується в історії та існує як transient draft, доки користувач не введе готель, не надішле змістовне повідомлення або не змінить trip context. Порожній draft видаляється після виходу. Після першої значущої дії чат зберігається в історії як draft, навіть якщо перевірку ще не запущено.
- Причина: дозволити `Check hotel` одразу відкривати новий чат, не засмічуючи history покинутими порожніми записами й не втрачаючи внесений користувачем контекст.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: implementation має відрізняти transient client/session draft від persistent trip chat і тестувати promotion після кожного типу значущої дії.

### 2026-09-08 — Check hotel template створює новий чат

- Тип: Product / UX / Documentation
- Статус: Погоджено
- Зміна: натискання на template card `Check hotel` створює новий trip chat, копіює до нього snapshot актуальних global profile settings і відкриває hotel input. Створення чату не резервує та не списує кредит; credit flow починається лише після ідентифікації, підтвердження готелю та явного запуску аналізу.
- Причина: використовувати `Check hotel` як окрему точку старту нової перевірки, а не як дубль focus-поведінки на home.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: потрібно визначити display та retention поведінку для створених, але незавершених порожніх чатів.

### 2026-09-08 — Визначено home flow для Find alternative

- Тип: Product / UX / Documentation
- Статус: Погоджено
- Зміна: `Find alternative` доступний із готового результату та як template card на home. У home flow користувач обирає вихідний готель із завершених перевірок. Якщо історія порожня, продукт пояснює prerequisite і пропонує `Check a hotel` без створення чату, резервування кредиту або відкриття paywall. Кредитний flow починається лише після вибору вихідного готелю, цінового сегмента, перегляду критеріїв і явного підтвердження запуску.
- Причина: пошук альтернативи потребує перевіреного вихідного готелю та його trip context, але має залишатися доступним із template section на головному екрані.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: alternative flow потребує source-hotel picker із history та окремого empty-history state.

### 2026-09-08 — Прибрано Create a custom template з першої версії

- Тип: Product / UX / Documentation
- Статус: Погоджено
- Зміна: картку, кнопку та будь-яку іншу точку входу `Create a custom template` повністю прибрано зі scope та інтерфейсу першої версії. Для неї не показується coming-soon popup; окремий backlog item також видалено.
- Причина: не показувати недоступну функцію та не ускладнювати першу версію додатковим напрямом взаємодії.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: home template section містить лише погоджені entry points і видиму preview-картку `Compare hotels`.

### 2026-09-08 — Додано template cards і preview для Compare hotels до першої версії

- Тип: Product / UX / Documentation
- Статус: Погоджено
- Зміна: секцію template cards включено до першої версії продукту. Картка `Compare hotels` залишається видимою без badge `Coming soon`, але натискання відкриває лише popup `Compare hotels is coming soon` із поясненням і кнопкою `Got it`. Взаємодія не створює чат, не запускає перевірку, не впливає на кредити й не відкриває paywall. Функціональне порівняння готелів залишається post-MVP.
- Причина: показати запланований напрям продукту на головному екрані, не створюючи хибного враження, що функція вже доступна.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`.
- Вплив: home implementation має містити доступний modal flow і чітко відокремлювати preview card від функціональних template entry points.

### 2026-09-07 — Ізольовано beta context від актуальних product specifications

- Тип: Product / Documentation / Planning / Research
- Статус: Погоджено
- Зміна: `BETA_LAUNCH_PLAN.md` визначено єдиним документом для beta/pilot, limited-audience research, recruitment, prototype decisions, ChatGPT comparison, willingness-to-pay research і staged-launch criteria. До нього перенесено provenance та цитати AI-persona research і beta zero-credit rule. `PRODUCT_GUIDELINES.md` тепер описує product value, audience, behavioral archetypes і перевагу над generic ChatGPT як підтверджені foundations. `PRD_MVP_BACKLOG.md` переписано як єдиний production MVP із registration, payments, paywall і release requirements без invite-only або closed-beta stage. Beta-specific references прибрано з analytics і source plans; `AGENTS.md` оновлено як routing rule.
- Причина: мати один ізольований beta/research document, тоді як усі інші product documents описують актуальний продукт так, ніби проміжні дослідження вже підтвердили його value і differentiation.
- Артефакти: `BETA_LAUNCH_PLAN.md`, `PRODUCT_GUIDELINES.md`, `PRD_MVP_BACKLOG.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `SOURCE_FEASIBILITY_PLAN.md`, `AGENTS.md`.
- Вплив: beta methodology та historical pre-validation assumptions не переносяться в current product specs; implementation використовує full MVP scope, а technical, legal і source blockers залишаються відкритими до фактичного виконання. Попередній changelog entry про split PRD stages вважається superseded цим рішенням, але зберігається як audit history.

### 2026-09-07 — Створено PRD і MVP implementation backlog

- Тип: Product / UX / Documentation / Planning / Engineering
- Статус: Погоджено
- Зміна: створено `PRD_MVP_BACKLOG.md`, який перетворює чинні Product Guidelines на screen map, screen inventory, core journeys, 31 user story з acceptance criteria, prioritized backlog, dependencies, delivery milestones і Definition of Done. Scope розділено на closed free beta без payments та limited paid MVP. Current code baseline зафіксовано як marketing landing без реалізованого product application.
- Причина: надати команді реалізований порядок робіт, не дублюючи й не змінюючи авторитетні продуктові рішення.
- Артефакти: `PRD_MVP_BACKLOG.md`; посилання на `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `SOURCE_FEASIBILITY_PLAN.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md` і `BETA_LAUNCH_PLAN.md`.
- Вплив: implementation має починатися з architecture decision, source feasibility POC і required-field data schema; comparison та custom templates не входять у MVP без окремого рішення.

### 2026-09-07 — Визначено значення та presentation для 100% score

- Тип: Product / Scoring / UX / Content / AI / Data / Visual style
- Статус: Погоджено
- Зміна: 100% є валідним `Match score` і не cap-иться до 99%. Він означає відповідність evaluated preferences у межах evidence scope, а не perfect або guaranteed hotel. Поруч обов’язково показуються `Checked X of Y` і analysis date; scope пояснюється в accordion. Також синхронізовано visual guide з раніше погодженим compact `Doesn’t fit` без critical details у collapsed state.
- Причина: зберегти математичну чесність score, не перетворюючи його на необґрунтовану гарантію.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: UI дозволяє displayed score 100, але забороняє `Perfect match`, `Ideal hotel`, `Guaranteed` та аналогічні claims; scoring block для MVP вважається визначеним.

### 2026-09-07 — Визначено округлення match scores

- Тип: Product / Scoring / UX / AI / Data / Analytics
- Статус: Погоджено
- Зміна: overall, category і secondary percentages показуються цілими числами після deterministic half-up rounding. `fit_threshold` застосовується до displayed score; raw score зберігається з повною precision для analytics, audit і regression testing. Наприклад, 69.5% відображається як 70% і може дати `Fits` після проходження інших gates.
- Причина: не допускати суперечності між видимим percentage і result status та прибрати зайву візуальну точність.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: scoring implementation має зберігати `raw_score` і `display_score`, а verdict engine — використовувати displayed integer.

### 2026-09-07 — Визначено provisional threshold для `Fits`

- Тип: Product / Scoring / UX / AI / Data / Beta
- Статус: Погоджено
- Зміна: для full result score 70% або вище дає `Fits`, а score нижче 70% дає `Doesn’t fit`; confirmed critical failure залишається незалежним override. Preliminary percentage не створює final verdict. Threshold зберігається як versioned scoring configuration і має бути перевірений у beta.
- Причина: відокремити достатність evidence від фактичного рівня відповідності готелю вподобанням користувача.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `BETA_LAUNCH_PLAN.md`.
- Вплив: scoring engine має застосовувати `fit_threshold = 70` лише після full eligibility; beta analysis має порівняти цей поріг із user decisions і post-trip feedback.

### 2026-09-07 — Визначено precedence overall result states

- Тип: Product / Scoring / UX / AI / Data
- Статус: Погоджено
- Зміна: встановлено порядок `Doesn’t fit` → `Not enough data` → `Preliminary result` → `Fits`. Confirmed critical failure має найвищий пріоритет навіть за insufficient coverage; без confirmed failure `Not enough data` використовується, доки не виконано minimum preliminary-data gates.
- Причина: зробити overall result deterministic і не показувати preliminary verdict без мінімально достатнього evidence.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: result composer, schema validation і UI мають застосовувати однаковий precedence order.

### 2026-09-07 — Визначено precedence category states

- Тип: Product / Scoring / UX / AI / Data
- Статус: Погоджено
- Зміна: встановлено deterministic precedence `Critical issue` → `Needs verification` → `Not enough data` → numeric score. Category завжди має один primary state; нижчий state не може замінити активний вищий.
- Причина: усунути неоднозначність, коли category одночасно має critical failure, unresolved must-have або insufficient coverage.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: category composer, schema validation і UI мають застосовувати однаковий precedence order.

### 2026-09-07 — Додано `Needs verification` для unresolved critical criteria

- Тип: Product / Scoring / UX / AI / Data
- Статус: Погоджено
- Зміна: category з critical criterion у стані `Unknown`, `Likely` або `Known + Medium confidence` показує `Needs verification` замість numeric score. Причина й optional `Other criteria match: X%` доступні в accordion; overall result залишається `Preliminary result`.
- Причина: відрізнити непідтверджений must-have від доведеного critical failure і не маскувати його category percentage.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: category schema потребує `needs_verification` no-score state; UI та result composer мають застосовувати його до всіх unresolved critical states.

### 2026-09-07 — Визначено category state при critical failure

- Тип: Product / Scoring / UX / AI / Data
- Статус: Погоджено
- Зміна: category з critical criterion у стані `Doesn’t meet` або `Partly meets` показує `Critical issue` замість primary numeric score. У розгорнутих деталях може показуватися `Other criteria match: X%`; інші category scores не змінюються.
- Причина: не дозволити високому category percentage маскувати порушення must-have.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: category result schema потребує `critical_issue` no-score state і secondary field `other_criteria_match`; UI має замінювати число status label лише в affected category.

### 2026-09-07 — Спрощено compact status для `Doesn’t fit`

- Тип: UX / Content / Product
- Статус: Погоджено
- Зміна: у compact analysis row показується лише загальний status `Doesn’t fit`, без кількості та назв critical issues. Усі порушені, частково виконані й неперевірені critical requirements показуються після розкриття accordion.
- Причина: зберегти компактність головного status, не втрачаючи важливих деталей аналізу.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: accordion має перелічувати всі critical issues; compact row не містить issue count або конкретної причини.

### 2026-09-07 — Визначено відображення score при `Doesn’t fit`

- Тип: Product / Scoring / UX / AI / Data
- Статус: Погоджено
- Зміна: failed critical requirement робить `Doesn’t fit` головним результатом із назвою порушеної вимоги. Високий percentage не показується як primary match score; за наявності достатніх даних він може залишатися нижче як `Other preferences match: X%`. Чотири category scores доступні як supporting details.
- Причина: не створювати враження позитивної рекомендації через високий percentage, коли готель порушує must-have користувача.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: result schema потребує secondary field `other_preferences_match`, а UI має візуально підпорядковувати percentage і category scores статусу `Doesn’t fit`.

### 2026-09-07 — Визначено правила `Partly meets`

- Тип: Product / Scoring / AI / Data / UX
- Статус: Погоджено
- Зміна: compound requirements розділяються на independently verifiable atomic criteria. `Partly meets` застосовується лише до indivisible criterion із material limitation; missing evidence дає `Unknown`. Для critical criterion `Partly meets` не проходить mandatory gate і дає `Doesn’t fit`; limitation, несумісне з конкретним user context, дає `Doesn’t meet`.
- Причина: не маскувати відсутність даних або фактичне порушення must-have як часткову відповідність.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: requirement normalization має створювати atomic criteria, а scoring і result UI — валідовувати `partly_meets` за critical gate та user context.

### 2026-09-07 — Визначено детерміновані рівні confidence

- Тип: Product / Scoring / AI / Data / Trust
- Статус: Погоджено
- Зміна: зафіксовано правила `High`, `Medium` і `Low confidence` окремо для objective operational facts та subjective guest-experience claims. Актуальний official source може самостійно підтвердити objective fact за exact scope і без свіжої суперечності; subjective High потребує minimum 20 relevant reviews і minimum 3 незалежних свіжих supporting reviews. Single, indirect, outdated або scope-ambiguous evidence визначається як Low і не може залишатися `Known`.
- Причина: зробити confidence reproducible та не використовувати hotel self-description як достатнє підтвердження суб’єктивного досвіду гостей.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: confidence engine і claim schema мають зберігати inputs та reason для присвоєного рівня; result UI має показувати непідтверджені claims як `Likely` або `Unknown`.

### 2026-09-07 — Визначено confidence gate для evaluated criteria

- Тип: Product / Scoring / AI / Data / Trust
- Статус: Погоджено
- Зміна: normal та important criteria входять у score за `Known + High/Medium confidence`; positive critical confirmation дозволене лише за `Known + High`. `Known + Medium` для critical блокує `Fits` і веде до `Preliminary result`. `Known + Low` заборонено schema та понижується до `Likely` або `Unknown`; low-confidence negative safety signal зберігає warning без confirmed claim.
- Причина: не дозволити low-confidence evidence потрапляти в numeric score або підтверджувати must-have.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: claim validation і persistence мають застосовувати confidence gate перед обчисленням evaluated counts, coverage та scores.

### 2026-09-07 — `Known` визначено єдиним evaluated status для scoring

- Тип: Product / Scoring / AI / Data / Trust
- Статус: Погоджено
- Зміна: лише validated assessment `Known` входить до numeric scores, evaluated count і evaluated weight. `Likely`, `Conflicting` та `Unknown` не впливають на percentage; `Likely` може відображатися як tentative strength/risk. Likely critical criterion блокує `Fits` і веде до `Preliminary result`, а likely safety signal завжди створює warning.
- Причина: зробити score evidence-backed і не маскувати припущення як перевірені criteria.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: claim schema потребує deterministic `evaluated` flag; coverage і score formulas використовують лише validated `Known` evaluations.

### 2026-09-07 — Визначено minimum-data gates для overall score

- Тип: Product / Scoring / AI / Data / UX
- Статус: Погоджено
- Зміна: full numeric overall score потребує minimum 70% weighted coverage, усіх verified critical criteria та minimum 5 evaluated criteria або всіх active criteria, якщо їх менше п’яти. Preliminary number потребує minimum 50% coverage і 3 evaluated criteria та не може створити positive verdict. Нижчий coverage/count дає `Not enough data` без числа; failed critical criterion дає `Doesn’t fit`, unknown critical блокує `Fits`.
- Причина: не показувати переконливий overall percentage на недостатній частині профілю та зберегти пріоритет critical gates.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: result schema зберігає overall counts, weights, coverage, eligibility і no-score reason; application logic детерміновано визначає full, preliminary або no-score state.

### 2026-09-07 — Визначено minimum-data gate для category scores

- Тип: Product / Scoring / AI / Data / UX
- Статус: Погоджено
- Зміна: numeric category score показується лише за evaluated criterion count щонайменше 2 та evaluated weight щонайменше 50% total active category weight. Поруч показується `Checked X of Y`; інакше category має `Not enough data` без числа. Єдиний active critical criterion показується окремим critical status, а не category score.
- Причина: не показувати візуально переконливий percentage, розрахований за одним другорядним або недостатньо покритим criterion.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: category result schema зберігає counts, weights, weighted coverage і eligibility; application logic, а не AI, застосовує gate перед показом числа.

### 2026-09-07 — Визначено чотири category scores

- Тип: Product / Scoring / AI / Data / UX
- Статус: Погоджено
- Зміна: окрім overall match score, результат містить чотири фіксовані персоналізовані scores: `Room & comfort`, `Food & service`, `Location & logistics` і `Facilities & experience`. Кожен criterion має одну primary score category без double counting; critical requirements залишаються окремими gates. Category без застосовних або перевірюваних criteria показує `Not enough data`, а overall score не є середнім category scores.
- Причина: дати стабільну зрозумілу структуру ключового result element без втрати персоналізації.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: result schema, criterion normalization і майбутній score UI мають підтримувати рівно чотири category slots; visual composition залишається відкритим design decision.

### 2026-09-07 — Визначено flow для supported та unsupported chat languages

- Тип: Product / UX / AI / Data
- Статус: Погоджено
- Зміна: мова першого змістовного повідомлення визначається автоматично. English, German, Spanish, French і Ukrainian продовжують чат відповідною мовою; для unsupported language показується English notice з вибором підтримуваної мови. До вибору check не запускається й credit не резервується. Chat language можна змінити локально; попередні result versions не перекладаються автоматично.
- Причина: уникнути ненадійного best-effort output поза протестованим multilingual scope та зберегти відтворюваність історичних результатів.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: language detection виконується до retrieval; check snapshot і result version зберігають language metadata, а UI потребує unsupported-language notice та chat-level language setting.

### 2026-09-07 — Russian замінено на Ukrainian у supported chat languages

- Тип: Product / Content / AI
- Статус: Погоджено
- Зміна: Russian виключено з офіційно підтримуваних мов чату MVP і замінено на Ukrainian. Актуальний набір: English, German, Spanish, French і Ukrainian.
- Причина: уточнення multilingual scope користувачем.
- Артефакти: `PRODUCT_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`.
- Вплив: language QA та regression coverage для Russian не входять до MVP; відповідні перевірки виконуються для Ukrainian.

### 2026-09-07 — Визначено supported chat languages для MVP

- Тип: Product / Content / AI
- Статус: Погоджено
- Зміна: interface залишається англійським; офіційно підтримувані мови чату — English, German, Spanish, French і Russian. User-visible response та evidence translation використовують мову поточного чату, а original evidence excerpt зберігається без заміни.
- Причина: визначити перевірюваний multilingual scope замість невизначеного формулювання «supported languages».
- Артефакти: `PRODUCT_GUIDELINES.md`, `AI_PIPELINE_GUIDELINES.md`.
- Вплив: language QA та regression set мають покривати всі п’ять мов без зміни criterion interpretation, critical gates або scoring.

### 2026-09-07 — Розділено product coverage і internal hotel test set

- Тип: Product / Data / Quality assurance
- Статус: Погоджено
- Зміна: product coverage не обмежується підготовленим hotel catalog: користувач може перевіряти будь-який готель у Європі або Туреччині. Набір із 30 різноманітних готелів визначено лише як fixed internal feasibility/regression set; реальні складні beta cases додаються до нього.
- Причина: забезпечити широке user-facing coverage та водночас мати повторювану основу для порівняння pipeline versions, coverage, latency, cost і critical errors.
- Артефакти: `PRODUCT_GUIDELINES.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: UI не показує закритий каталог; кожен введений готель проходить identity та evidence gates, а внутрішні quality tests повторюються на стабільній вибірці.

### 2026-09-07 — Уточнено unit-cost metric

- Тип: Product / Analytics / Economics / Operations
- Статус: Погоджено
- Зміна: `cost per completed useful analysis` виключено через biased voluntary-feedback denominator. Основною operational metric визначено technical variable cost per completed full hotel check із provisional target не більше €0.30; до нього входять AI/LLM, retrieval/search APIs, translation, processing і proportional storage. Find alternative cost та fully loaded cost вимірюються окремо без початкового target.
- Причина: не змішувати технічну ефективність перевірки, добровільний usefulness feedback і повну економіку продукту.
- Артефакти: `PRODUCT_GUIDELINES.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: cost reporting має відокремлювати base hotel check, internal alternative search і fully loaded economics; salaries, development та fixed SaaS не входять до €0.30 threshold.

### 2026-09-07 — Визначено post-trip feedback rate

- Тип: Product / Analytics / Trust
- Статус: Погоджено
- Зміна: post-trip feedback rate визначено як надсилання `Accurate`, `Partly accurate` або `Inaccurate` протягом 30 днів після фактичного показу prompt; provisional target — щонайменше 20%. Користувачі, які не бачили prompt, не входять до denominator. Response distribution вимірюється окремо, кожне `Inaccurate` створює review item, а accuracy target відкладається до перших 50 responses.
- Причина: вимірювати реальну перевірку результату після поїздки, не занижуючи response rate користувачами без показаного prompt.
- Артефакти: `PRODUCT_GUIDELINES.md`, `ANALYTICS_MEASUREMENT_PLAN.md`.
- Вплив: event taxonomy містить `post-trip prompt shown`; reporting має зв’язувати prompt і response та автоматично маршрутизувати inaccurate feedback на review.

### 2026-09-07 — Save rate виключено із success metrics

- Тип: Product / Analytics
- Статус: Погоджено
- Зміна: save rate більше не використовується як product success metric і для нього не встановлюється baseline або target. Comparison rate залишено лише для наступного етапу після появи функції порівняння.
- Причина: результати автоматично зберігаються в історії чату, тому окрема дія `Save` не є надійним signal отриманої цінності.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: launch і product-value decisions не спираються на save behavior; функція збереження та її технічна модель не змінюються.

### 2026-09-07 — Усунено два documentation inconsistencies після розділення планів

- Тип: Documentation / Product / Research
- Статус: Погоджено
- Зміна: `ChatGPT preference win-rate` перенесено з Product Guidelines до Beta Launch Plan. Загальне твердження про відсутність target values замінено точним переліком: targets погоджені для usefulness, activation, completion, payment і 30-day repeat use; відкритими залишаються save rate, post-trip feedback rate та cost per completed useful analysis.
- Причина: зберегти ChatGPT comparison у beta research scope і усунути суперечність між погодженими metrics та open gaps.
- Артефакти: `PRODUCT_GUIDELINES.md`, `BETA_LAUNCH_PLAN.md`.
- Вплив: product metrics і beta comparison metrics більше не змішані; наступні metric decisions мають закрити три конкретні gaps.

### 2026-09-07 — Уточнено межі Product Guidelines і Beta Launch Plan

- Тип: Documentation / Product / Research
- Статус: Погоджено
- Зміна: `PRODUCT_GUIDELINES.md` підтверджено як основний документ про продукт, MVP, scoring, results, payments, credits, success metrics, trust і operations. Окремий документ перейменовано на `BETA_LAUNCH_PLAN.md`; він містить beta і pilot scope, prototype decision, testing on limited audience, comparison with ChatGPT, research protocol та metrics для рішення continue / iterate / stop.
- Причина: чітко розділити довгострокові product rules та metrics від тимчасового beta launch і validation plan.
- Артефакти: `PRODUCT_GUIDELINES.md`, `BETA_LAUNCH_PLAN.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `AGENTS.md`; замінено `PILOT_LAUNCH_AND_RESEARCH_GUIDE.md`.
- Вплив: product, MVP, payment і overall success decisions оновлюються в Product Guidelines; beta, prototype і launch-validation decisions — у Beta Launch Plan.

### 2026-09-07 — Доповнено consolidated research guide без втрати попередніх правил

- Тип: Documentation / Research / Analytics
- Статус: Погоджено
- Зміна: до `PILOT_LAUNCH_AND_RESEARCH_GUIDE.md` перенесено повний набір раніше погоджених experimentation rules, включно з 95% confidence, 80% power, minimum two-week duration і safety guardrails. Також відновлено specific research gaps про шаблонність AI-persona interviews, зациклення персони Івана на чистоті та невідповідність звичайного 30-day return природному travel cycle.
- Причина: завершити consolidation без втрати деталей із попередніх документів.
- Артефакти: `PILOT_LAUNCH_AND_RESEARCH_GUIDE.md`.
- Вплив: єдиний guide тепер містить pilot protocol, research gaps, future experimentation rules і staged-launch orientation; draft thresholds усе ще потребують окремого погодження.

### 2026-09-07 — Об’єднано pilot launch і research guidance

- Тип: Documentation / Research / Product / Operations
- Статус: Погоджено
- Зміна: весь detailed content про closed beta, pilot launch, recruitment, moderated research, questionnaire, willingness-to-pay check і staged launch об’єднано в `PILOT_LAUNCH_AND_RESEARCH_GUIDE.md`. Поточний pilot запускається як real invite-only application із двома безкоштовними перевірками та без payments. Деталі прибрано з Product Guidelines і замінено посиланням; окремі `BETA_LAUNCH_PLAN.md` та `PRODUCT_VALIDATION_PLAN.md` більше не використовуються.
- Причина: зберігати product rules окремо від research і pilot operations та мати єдиний документ-орієнтир, до якого можна повернутися пізніше.
- Артефакти: `PILOT_LAUNCH_AND_RESEARCH_GUIDE.md`, `PRODUCT_GUIDELINES.md`, `ANALYTICS_MEASUREMENT_PLAN.md`, `AGENTS.md`; замінено `BETA_LAUNCH_PLAN.md` і `PRODUCT_VALIDATION_PLAN.md`.
- Вплив: усі майбутні beta, pilot, survey та research decisions мають оновлювати єдиний guide; draft success thresholds залишаються відкритими до окремого погодження.

### 2026-09-07 — Prototype замінено staged launch справжнього сайту

- Тип: Product / Research / Operations / Documentation
- Статус: Погоджено
- Зміна: product validation проводиться в closed free beta реального web product, а не в окремому clickable prototype. Створено три launch stages: invite-only closed beta для 12–15 users із двома безкоштовними перевірками та без real payments; limited paid beta після source, payment, legal, pipeline і monitoring readiness; public launch після підтвердження value, reliability та відсутності unresolved critical incidents. Manual або semi-automated analysis дозволений усередині closed beta за всіма чинними evidence і trust rules.
- Причина: одразу збирати поведінкові дані в справжньому продукті, не приймаючи передчасно ризики публічного платного запуску.
- Артефакти: `BETA_LAUNCH_PLAN.md`, `PRODUCT_VALIDATION_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: перший build має бути production-like vertical slice з real accounts, persisted chats/results і free-credit logic; payment activation та public access залишаються gated наступними stages.

### 2026-09-07 — Визначено recruitment channels для product validation

- Тип: Research / Recruitment
- Статус: Погоджено
- Зміна: recruitment для основної вибірки поєднує 6–8 учасників із travel, expat і family communities та 6–8 учасників із незалежної research panel; не більше 2–3 учасників можуть походити з одного community або personal network. Двоє знайомих використовуються лише для pilots. Invitation формулюється нейтрально, а screener обмежується необхідними non-sensitive eligibility fields.
- Причина: поєднати реальний travel context із різноманітнішою вибіркою та зменшити channel, social-desirability і framing bias.
- Артефакти: `PRODUCT_VALIDATION_PLAN.md`.
- Вплив: recruitment materials не повинні обіцяти перевагу fitstay. над ChatGPT; participant source має фіксуватися для контролю концентрації вибірки.

### 2026-09-07 — Визначено screening criteria для product validation

- Тип: Research / Product
- Статус: Погоджено
- Зміна: основну вибірку розподілено між 4–5 family, 4–5 couple і 4–5 solo contexts. Учасники віком 18–45 років самостійно обирають готелі, мають реальну задачу для Європи або Туреччини, можуть проживати в будь-якій країні та користуватися англомовним interface. Виключено travel agents, hospitality professionals і команду fitstay.; потрібні різні рівні досвіду з ChatGPT. Дві sessions зі знайомими дозволені лише як pilots і не входять до основної вибірки.
- Причина: забезпечити відповідність MVP audience, покрити основні travel contexts і зменшити selection bias у порівнянні з ChatGPT.
- Артефакти: `PRODUCT_VALIDATION_PLAN.md`.
- Вплив: recruitment screener має перевіряти реальну hotel-decision задачу, роль у виборі, destination scope, English usability, професійні exclusions і AI familiarity.

### 2026-09-07 — Визначено перший product validation round

- Тип: Research / Product / Documentation
- Статус: Погоджено
- Зміна: створено `PRODUCT_VALIDATION_PLAN.md` для першого дослідження з 12–15 реальними самостійними мандрівниками до 45 років, включаючи family, couple і solo contexts. Учасники працюють із реальною hotel-decision задачею, показують поточний workflow, тестують fitstay. і порівнюють його зі звичайним ChatGPT; вимірюються trust, clarity, new information, decision impact і willingness to pay.
- Причина: перевірити потребу в окремому продукті, його перевагу над ChatGPT і ручним research та готовність платити до повноцінної розробки.
- Артефакти: `PRODUCT_VALIDATION_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: behavioral archetypes залишаються hypotheses; product value не вважається підтвердженою до проведення sessions і погодження success thresholds.

### 2026-09-07 — Визначено experimentation rules

- Тип: Analytics / Product / Research / Trust
- Статус: Погоджено
- Зміна: до стабільного traffic формальні A/B tests не проводяться; для UX iteration встановлено мінімум 5 користувачів на кожен суттєво відмінний affected segment. Для майбутніх A/B tests заздалегідь фіксуються hypothesis, одна primary metric, segment, duration і guardrails; sample size розраховується з 95% confidence та 80% power, test триває щонайменше два повні тижні. Заборонено послаблювати trust і safety rules, а critical incident або порушення required reliability target зупиняє experiment.
- Причина: уникнути хибних висновків на ранніх малих samples і не дозволити growth experiments погіршувати надійність, credits або user safety.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: кожний A/B test потребує pre-defined analysis plan і calculated sample size; ранні UX-рішення спираються на qualitative testing, funnel observation та feedback.

### 2026-09-07 — Визначено monitoring dashboards і critical alerts

- Тип: Analytics / Operations / AI quality / Trust
- Статус: Погоджено
- Зміна: monitoring розділено на Product & Revenue, Operations та AI Quality & Trust dashboards. Визначено п’ять категорій подій, що створюють негайний critical alert: неправильний hotel entity після confirmation, unsupported positive critical claim, списання без result або credit return, неправильне чи повторне нарахування після оплати та рекомендація готелю з відомим critical safety concern.
- Причина: відокремити product і revenue trends від operational reliability та AI trust risks, а критичні інциденти не залишати до періодичного review.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: implementation має підтримувати три dashboard views, immediate alert routing для critical events і daily/weekly review для інших indicators.

### 2026-09-07 — Визначено retention metrics

- Тип: Analytics / Product
- Статус: Погоджено
- Зміна: 30-day repeat-use rate визначено як запуск наступної перевірки або пошуку альтернативи протягом 30 днів після першого full result із provisional target щонайменше 30% value-activated користувачів. 90-day trip-cycle retention визначено як повернення та запуск нової перевірки протягом 90 днів; на MVP для нього збирається baseline без target.
- Причина: вимірювати повторне отримання цінності з урахуванням нерегулярної частоти планування подорожей, а не звичайне відкриття продукту.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: retention cohorts починаються з першого full result; passive visits не входять у repeat-use або trip-cycle retention.

### 2026-09-07 — Встановлено targets для payment metrics

- Тип: Analytics / Product / Payment
- Статус: Погоджено
- Зміна: qualified free-to-paid conversion визначено як покупку протягом 30 днів після використання обох безкоштовних перевірок із provisional target щонайменше 10%; payment processing success — щонайменше 95% підтверджених спроб без урахування скасувань користувачем і відмов банку; credit delivery accuracy — 100% правильних одноразових нарахувань після успішної оплати.
- Причина: окремо вимірювати комерційну конверсію серед користувачів, які вичерпали free value, надійність payment processing і коректність кредитного ledger.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: payment dashboard має використовувати qualified denominator для conversion і звіряти кожну успішну transaction з рівно однією коректною credit grant operation.

### 2026-09-06 — Встановлено targets для completion metrics

- Тип: Analytics / Product / AI quality
- Статус: Погоджено
- Зміна: provisional target для resolved check rate встановлено на рівні щонайменше 95% запущених перевірок; для full result rate — щонайменше 80%.
- Причина: окремо вимірювати технічну здатність завершити перевірку коректним outcome та частку перевірок із повним evidence-backed результатом.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: analytics має відрізняти `Full result`, `Preliminary result`, `Not enough data` і technical failure; resolved check rate включає перші три outcomes, full result rate — лише перший.

### 2026-09-06 — Встановлено target для check-start activation

- Тип: Analytics / Product
- Статус: Погоджено
- Зміна: provisional target для check-start activation встановлено на рівні щонайменше 60% серед перших 200 email-verified accounts.
- Причина: отримати ранній індикатор того, чи onboarding, profile setup і головний екран доводять користувача до запуску основної дії.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: activation funnel має окремо показувати conversion до першого запуску перевірки та conversion до першого full result.

### 2026-09-06 — Розділено check-start activation, value activation і engagement

- Тип: Analytics / Product
- Статус: Погоджено
- Зміна: check-start activation означає запуск першої перевірки протягом 7 днів; value activation — отримання й відкриття першого full result протягом 7 днів; engagement охоплює meaningful actions після першого результату. Для value activation встановлено provisional target ≥40% серед перших 200 verified accounts.
- Причина: окремо вимірювати намір виконати основну дію, фактичне отримання цінності та подальшу взаємодію.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: activation funnel потребує двох distinct conversion stages; preliminary/no-data/failed results не входять у value activation.

### 2026-09-06 — Визначено мінімальну analytics event taxonomy

- Тип: Analytics / Privacy / Product
- Статус: Погоджено
- Зміна: зафіксовано events для onboarding, hotel identification, checks, results, payments, alternatives, saved items, issues і post-trip feedback без текстового користувацького content.
- Причина: вимірювати ключові funnels, не включаючи sensitive або надлишкові дані в analytics.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`.
- Вплив: analytics implementation має передавати лише event metadata та pseudonymous IDs.

### 2026-09-06 — Визначено product activation

- Тип: Analytics / Product
- Статус: Погоджено
- Зміна: activation настає лише після отримання й відкриття першого full result. Registration, email verification, profile completion, preliminary/no-data result і technical failure не вважаються activation.
- Причина: вимірювати момент отримання основної цінності, а не завершення адміністративного onboarding step.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: activation event залежить від full-result completion і result open.

### 2026-09-06 — Визначено provisional usefulness targets

- Тип: Analytics / Product / Research
- Статус: Погоджено
- Зміна: для перших 100 usefulness responses встановлено targets: ≥60% `Yes`, ≥80% `Yes` + `Partly`; response rate вимірюється окремо. Створено Analytics and Measurement Plan.
- Причина: отримати початковий критерій цінності продукту та не приховувати selection bias низькою response rate.
- Артефакти: `ANALYTICS_MEASUREMENT_PLAN.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: масштабування paid acquisition потребує аналізу, якщо usefulness нижче provisional thresholds.

### 2026-09-06 — Перенесено usefulness feedback до готового результату

- Тип: UX / Analytics / Research
- Статус: Погоджено
- Зміна: `Did this check help your decision?` показується як необов’язковий feedback одразу після результату. Post-trip форма більше не повторює його й зосереджується на фактичній точності та розбіжностях.
- Причина: вимірювати основну цінність швидше й не залежати лише від низькочастотного post-trip response.
- Артефакти: `USER_FLOW_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: result screen потребує compact usefulness feedback; post-trip form містить accuracy question та optional details.

### 2026-09-06 — Встановлено мінімальний вік 18 років

- Тип: Legal / Product / UX
- Статус: Погоджено
- Зміна: реєстрація й оплата доступні лише користувачам 18+. Діти зберігаються тільки як неперсоналізована частина складу поїздки без імен та окремих профілів.
- Причина: акаунт, згода та платіж належать повнолітньому власнику; продукт не потребує дитячих акаунтів.
- Артефакти: `LEGAL_COMPLIANCE_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: onboarding потребує age confirmation, а trip composition — лише функціональних child age fields.

### 2026-09-06 — Визначено analytics і data-use consent

- Тип: Privacy / Analytics / Product
- Статус: Погоджено
- Зміна: essential technical/product events збираються без змісту чатів; ad trackers і продаж персональних даних заборонені. Chat/profile content не використовується для model training без explicit consent; marketing cookies та optional analytics потребують consent.
- Причина: мінімізувати збір даних і відокремити роботу основного сервісу від необов’язкового tracking або training use.
- Артефакти: `LEGAL_COMPLIANCE_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: analytics schema не містить message content; consent management має окремі optional categories.

### 2026-09-06 — Уточнено credit return і monetary refund

- Тип: Payment / Legal / UX
- Статус: Погоджено
- Зміна: automatic credit return визначено як внутрішню операцію, а не повернення грошей. Monetary refund можливий лише через підтримку після підтвердження некоректного AI-результату; невикористані кредити, помилкова покупка чи зміна рішення не є добровільною підставою для refund.
- Причина: розділити відновлення послуги всередині продукту та реальне повернення платежу.
- Артефакти: `PRODUCT_GUIDELINES.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: support refund flow запускається лише для підтвердженого AI error; automatic failure handling повертає тільки кредит. Обов’язкові вимоги закону та Merchant of Record мають пріоритет.

### 2026-09-06 — Визначено порядок використання кредитів

- Тип: Payment / Data / Product
- Статус: Погоджено
- Зміна: спочатку використовуються дві безкоштовні перевірки, потім найстаріші платні кредити за FIFO. Кожне reserve/spend пов’язується з конкретним grant або purchase lot.
- Причина: зробити списання передбачуваним і зберегти зв’язок невикористаного платного залишку з покупкою для підтримки refund requests.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: credit allocation logic має підтримувати lots і FIFO, а не лише загальний balance.

### 2026-09-06 — Вибрано Merchant of Record direction для MVP

- Тип: Payment / Legal / Architecture
- Статус: Погоджено
- Зміна: для MVP зафіксовано Merchant of Record model. Paddle і Lemon Squeezy залишаються кандидатами до перевірки approval, fees, payouts, restrictions, refunds та one-time credit packages у EUR.
- Причина: спростити глобальну обробку indirect taxes, buyer receipts та payment compliance.
- Артефакти: `LEGAL_COMPLIANCE_GUIDELINES.md`.
- Вплив: до реалізації checkout потрібен provider assessment; прямий Stripe не є поточним MVP-напрямом.

### 2026-09-06 — Визначено відображення податків у checkout

- Тип: Payment / UX / Legal
- Статус: Погоджено
- Зміна: до підтвердження платежу checkout показує остаточну суму в EUR та окремо відображає застосовний податок.
- Причина: не допускати неочікуваної зміни суми після дії користувача.
- Артефакти: `LEGAL_COMPLIANCE_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: payment/tax setup має розраховувати фінальну суму до confirmation step.

### 2026-09-06 — Змінено валюту цін і платежів на EUR

- Тип: Product / Payment / Economics
- Статус: Погоджено
- Зміна: числові значення пакетів збережено, але ціни змінено з USD на EUR: 5 — €10, 10 — €18, 20 — €20, 50 — €50, 100 — €100. Усі платежі першого релізу здійснюються в EUR; feasibility cost threshold змінено на €0.30.
- Причина: використовувати єдину європейську валюту для pricing і checkout.
- Артефакти: `PRODUCT_GUIDELINES.md`, `SOURCE_FEASIBILITY_PLAN.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`.
- Вплив: paywall, checkout, receipts, analytics та cost reports мають використовувати EUR. Попередні USD-значення в історичних записах changelog більше не є активними.

### 2026-09-06 — Визначено глобальний ринок користувачів

- Тип: Product / Legal / Scope
- Статус: Погоджено
- Зміна: цільовий ринок користувачів визначено як глобальний без продуктового обмеження за країною проживання. Фактична реєстрація та оплата залишаються subject to legal, sanctions, tax і provider restrictions.
- Причина: дозволити користуватися продуктом мандрівникам незалежно від місця проживання, зберігаючи обов’язкові compliance guardrails.
- Артефакти: `PRODUCT_GUIDELINES.md`, `LEGAL_COMPLIANCE_GUIDELINES.md`.
- Вплив: onboarding і paywall мають підтримувати country-based availability checks без зміни глобального product positioning.

### 2026-09-06 — Визначено плановану юрисдикцію бізнесу

- Тип: Legal / Operations / Documentation
- Статус: Погоджено
- Зміна: Швейцарію визначено як плановану країну реєстрації юридичної особи; створено окремий документ Legal and Compliance Guidelines з відкритими юридичними питаннями.
- Причина: задати базову юрисдикцію для подальшої перевірки privacy, payments, consumer, tax і retention requirements.
- Артефакти: `LEGAL_COMPLIANCE_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: legal policies та provider selection мають перевірятися для швейцарської юридичної особи й фактичних ринків користувачів.

### 2026-09-06 — Визначено AI regression і consistency testing

- Тип: AI / QA / Trust
- Статус: Погоджено
- Зміна: встановлено regression set щонайменше зі 100 сценаріїв, exact consistency для state/scores за однакових inputs і shadow testing нових model/prompt versions.
- Причина: не допускати непояснених змін результату після оновлення AI або pipeline.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`.
- Вплив: production deployment AI-змін блокується за критичних regression differences; очікувана зміна потребує version ID і changelog entry.

### 2026-09-06 — Визначено retry та provider fallback strategy

- Тип: AI / Architecture / Reliability
- Статус: Погоджено
- Зміна: pipeline stages зберігаються й повторюються ідемпотентно; transient failure отримує дві автоматичні спроби, після чого можливий лише заздалегідь протестований fallback provider. Retries не використовують додаткові кредити.
- Причина: відновлювати тимчасові збої без повторного збору валідних даних, подвійних списань або неперевіреної зміни якості.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`.
- Вплив: orchestration потребує persisted stage outputs, retry policy, idempotency та provider metadata.

### 2026-09-06 — Визначено unsupported-claim validation

- Тип: AI / Trust / Architecture
- Статус: Погоджено
- Зміна: після claim extraction виконується незалежна перевірка evidence links, entity/scope, citation support і recency. Unsupported claim видаляється або стає `Unknown`; unsupported positive critical claim блокує звичайний результат.
- Причина: не покладатися на self-check першої генерації та не показувати непідтверджені факти.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`.
- Вплив: pipeline потребує deterministic validators і окремого AI-verification pass до scoring.

### 2026-09-06 — Визначено structured claim output і confidence

- Тип: AI / Data / Trust
- Статус: Погоджено
- Зміна: кожен claim містить criterion, scope, assessment, fit state, supporting/opposing evidence, recency й explanation. Confidence `High` / `Medium` / `Low` обчислюється кодом із характеристик evidence, а не генерується моделлю як довільне число.
- Причина: зробити claim-level висновки перевірюваними та не створювати хибну точність.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: AI integration потребує strict structured schema, а confidence engine — окремих deterministic rules.

### 2026-09-06 — Визначено послідовність AI pipeline

- Тип: AI / Architecture / Trust
- Статус: Погоджено
- Зміна: зафіксовано десять етапів від input snapshot та entity resolution до deterministic scoring, versioned result і delivery. Quality gates виконуються до scoring та звичайного позитивного результату.
- Причина: забезпечити контрольовану послідовність і не дозволити генерації обходити перевірку evidence та critical criteria.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`.
- Вплив: реалізація pipeline має зберігати stage status і завершуватися відповідним degraded/failure state, якщо gate не пройдено.

### 2026-09-06 — Створено AI Pipeline Guidelines

- Тип: AI / Architecture / Documentation
- Статус: Погоджено
- Зміна: AI відповідає за extraction, normalization та evidence classification, а deterministic code — за scoring, critical gates, result state і credit rules.
- Причина: зробити результат відтворюваним, тестованим і незалежним від довільного числового висновку моделі.
- Артефакти: `AI_PIPELINE_GUIDELINES.md`.
- Вплив: AI output має бути структурованим; модель не може самостійно змінювати scoring weights або thresholds.

### 2026-09-06 — Визначено межу public retrieval

- Тип: Data / Compliance / Product
- Статус: Погоджено
- Зміна: public retrieval дозволено лише для внутрішнього feasibility test і прототипу в межах правил джерела. Платний production launch потребує підтвердженого authorized access path; обхід обмежень заборонений.
- Причина: відокремити технічну перевірку доступності даних від права на їхнє комерційне використання.
- Артефакти: `PRODUCT_GUIDELINES.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: перед production launch потрібен documented source-by-source access review.

### 2026-09-06 — Визначено thresholds source feasibility test

- Тип: Research / Data / Economics
- Статус: Погоджено
- Зміна: зафіксовано стартові пороги full-result coverage, критичних помилок, latency та variable cost для раннього тесту 30 готелів.
- Причина: мати об’єктивний go / revise / no-go критерій до повноцінної retrieval-розробки.
- Артефакти: `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: тест має вимірювати ≥80% full results, нуль критичних quality failures, median ≤3 хвилин, p90 ≤5 хвилин і variable cost ≤$0.30.

### 2026-09-06 — Додано Туреччину до географії першого релізу

- Тип: Product / Data / Scope
- Статус: Погоджено
- Зміна: географію готелів першого релізу уточнено до «Європа та Туреччина»; Туреччину додано одинадцятою країною source feasibility sample.
- Причина: охопити великий і важливий ринок resort hotels, значна частина якого географічно розташована поза Європою.
- Артефакти: `PRODUCT_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`, `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: entity validation, retrieval і тестова вибірка мають підтримувати турецькі готелі та турецькомовні джерела.

### 2026-09-06 — Створено план source feasibility test

- Тип: Research / Data / Documentation
- Статус: Погоджено
- Зміна: заплановано ранню перевірку 30 європейських готелів щонайменше з 10 країн і різних hotel types для оцінки coverage, recency, entity matching, latency та cost.
- Причина: перевірити життєздатність retrieval до повноцінної розробки та окремо від launch QA на 100 сценаріїв.
- Артефакти: `SOURCE_FEASIBILITY_PLAN.md`.
- Вплив: перед запуском тесту потрібно затвердити вибірку й pass/fail thresholds.

### 2026-09-06 — Визначено географію готелів першого релізу

- Тип: Product / Data / Scope
- Статус: Погоджено
- Зміна: перший реліз перевіряє готелі, розташовані в Європі. Країна проживання користувача цим рішенням не обмежується; для кожного готелю діє minimum evidence rule.
- Причина: обмежити початкову географію джерел і тестування без штучного обмеження аудиторії.
- Артефакти: `PRODUCT_GUIDELINES.md`, `DATA_MODEL_GUIDELINES.md`.
- Вплив: entity validation і source feasibility testing мають використовувати європейські готелі.

### 2026-09-06 — Визначено активацію AI-suggested criteria

- Тип: AI / UX / Personalization
- Статус: Погоджено
- Зміна: запропонований AI критерій не впливає на профіль, чат, retrieval або scoring до явного додавання користувачем і вибору рівня важливості.
- Причина: не змінювати пріоритети користувача без його усвідомленої дії.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: suggestions потребують окремого pending state і explicit add action.

### 2026-09-06 — Визначено модель кастомного критерію

- Тип: Data / AI / Personalization
- Статус: Погоджено
- Зміна: кастомний критерій зберігає незмінений текст користувача та окрему нормалізовану внутрішню інтерпретацію для retrieval і scoring. Неоднозначна інтерпретація потребує уточнення.
- Причина: не втрачати початковий зміст вимоги й не застосовувати непідтверджене AI-mapping.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: criteria model потребує original text, normalized attributes, scope, priority та interpretation confidence.

### 2026-09-06 — Визначено структуру payment transaction

- Тип: Data / Payment / Security
- Статус: Погоджено
- Зміна: payment transaction зберігає provider IDs, пакет, суму, валюту, статус, timestamps, idempotency key, receipt і зв’язок із ledger. Дані банківської картки продукт не зберігає.
- Причина: забезпечити відновлення та аудит платежів, залишивши обробку платіжних реквізитів сертифікованому провайдеру.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: payment integration має бути provider-hosted або tokenized і не передавати card data до application storage.

### 2026-09-06 — Визначено сутності даних MVP

- Тип: Data / Architecture
- Статус: Погоджено
- Зміна: зафіксовано мінімальний набір сутностей від account і trip chat до evidence, ledger, issue report та feedback. Для супроводжуючих не створюються окремі персональні записи.
- Причина: розділити дані з різними життєвими циклами й не збирати зайві персональні дані.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: наступний schema design має використовувати цей набір як основу.

### 2026-09-06 — Визначено видалення saved items разом із чатом

- Тип: Data / UX / Privacy
- Статус: Погоджено
- Зміна: видалення чату або результату видаляє пов’язані saved items; перед підтвердженням користувач бачить попередження. Окрема копія результату не зберігається.
- Причина: не залишати результат після явного видалення його вихідного контексту.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: delete confirmation потребує перевірки saved references і cascade deletion.

### 2026-09-06 — Визначено модель `Saved hotel`

- Тип: Data / UX / Product
- Статус: Погоджено
- Зміна: saved item посилається на конкретну версію результату та trip chat. Повторна перевірка не замінює збережену версію автоматично; користувач оновлює її явно.
- Причина: зберегти контекст, критерії та доказову основу саме того рішення, яке користувач додав до saved items.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: saved entity потребує hotel, chat, check і result-version references.

### 2026-09-06 — Визначено принципи видалення та retention

- Тип: Data / Privacy / Compliance
- Статус: Погоджено
- Зміна: видалення чату охоплює його контекст і результати; видалення акаунта — персональні дані та весь користувацький контент. Ledger не переписується, а мінімальні платіжні записи зберігаються лише за юридичною вимогою та надалі видаляються або знеособлюються.
- Причина: поєднати контроль користувача над даними, аудит кредитів і законні вимоги до платіжних записів.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: delete flows потребують cascade policy, розриву посилань на видалений контент і окремої legal retention configuration.

### 2026-09-06 — Визначено credit ledger та історію кредитів

- Тип: Data / Payment / UX
- Статус: Погоджено
- Зміна: кредитні операції зберігаються в append-only ledger, а баланс обчислюється з нього. У налаштуваннях акаунта користувач бачить історію нарахувань, резервувань, списань і повернень із посиланнями на відповідні чати та перевірки.
- Причина: запобігти подвійним списанням і зробити рух кредитів прозорим для користувача та підтримки.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: потрібні immutable ledger operations, idempotency keys і user-facing credit history.

### 2026-09-06 — Визначено версіонування результатів

- Тип: Data / AI-result / Trust
- Статус: Погоджено
- Зміна: кожна перевірка зберігає версії scoring logic, result schema, моделі, prompt/pipeline configuration, дату аналізу та ID evidence records. Внутрішні міркування моделі не зберігаються й не показуються.
- Причина: забезпечити відтворюваність, аудит змін і зрозуміле пояснення результатів без збереження chain of thought.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: pipeline deployment потребує version IDs, які записуються в кожен результат.

### 2026-09-06 — Визначено склад evidence snapshot

- Тип: Data / Trust / Compliance
- Статус: Погоджено
- Зміна: для кожного доказу зберігаються provenance, дати, релевантний оригінальний фрагмент і переклад, зв’язок із claim та рівнем готелю, confidence і технічний ідентифікатор зміни. Повні сторінки або масиви відгуків не зберігаються без окремого правового дозволу.
- Причина: забезпечити відтворюваність результату без надлишкового збирання стороннього контенту.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: retrieval pipeline має формувати мінімальний evidence record та враховувати legal/licensing constraints.

### 2026-09-06 — Визначено рівні ідентичності готелю

- Тип: Data / AI-result / UX
- Статус: Погоджено
- Зміна: готель, корпус, категорія номера та дати зберігаються окремо; корпус і номер є необов’язковими та уточнюються лише за суттєвих відмінностей, що впливають на критерії.
- Причина: не ускладнювати кожну перевірку, але не змішувати дані різних корпусів або room categories.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: entity matching та evidence mapping мають підтримувати різний рівень деталізації; невизначений пов’язаний висновок отримує `Unknown`.

### 2026-09-06 — Визначено пріоритет chat-level overrides

- Тип: Data / UX / Product
- Статус: Погоджено
- Зміна: під час `Update from profile` актуальний профіль оновлює базовий шар контексту, але явні налаштування поточного чату зберігаються та мають вищий пріоритет.
- Причина: не перезаписувати параметри, які користувач задав спеціально для конкретної поїздки.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: chat context потрібно зберігати як profile base плюс окремий шар overrides.

### 2026-09-06 — Визначено ручне оновлення чату з профілю

- Тип: UX / Data / Product
- Статус: Погоджено
- Зміна: старий чат не синхронізується з оновленим глобальним профілем автоматично. Користувач може обрати `Keep current`, а secondary action `Update from profile` залишається біля налаштувань до явного оновлення.
- Причина: зберегти локальний контекст поїздки та дати можливість оновити його в будь-який момент.
- Артефакти: `DATA_MODEL_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: потрібно зберігати стан розбіжності між chat context і profile version; завершені snapshots не змінюються.

### 2026-09-06 — Створено Data Model Guidelines і правило snapshot

- Тип: Data / Documentation / AI-result
- Статус: Погоджено
- Зміна: створено окрему специфікацію даних; кожна перевірка зберігає незмінний snapshot профілю, контексту поїздки, критеріїв, ідентифікованого готелю та часу запуску.
- Причина: не змінювати історичні результати заднім числом і забезпечити їхню відтворюваність.
- Артефакти: `DATA_MODEL_GUIDELINES.md`.
- Вплив: наступні зміни профілю або чату застосовуються лише до нових перевірок.

### 2026-09-06 — Визначено payment error flows

- Тип: UX / Payment / Operations
- Статус: Погоджено
- Зміна: визначено окремі стани `Payment failed` і `Payment processing`. Повторна оплата блокується для незавершеної транзакції; запит зберігається, кредити відновлюються автоматично, а transaction ID передається в підтримку за потреби.
- Причина: запобігти подвійній оплаті та втраті зв’язку між платежем і початковою перевіркою.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: paywall потребує idempotency, polling/webhook state та prefilled support escalation.

### 2026-09-06 — Визначено `Not enough data`

- Тип: UX / AI-result / Payment
- Статус: Погоджено
- Зміна: якщо доказів недостатньо навіть для `Preliminary result`, система показує `Not enough data`, не формує score, пояснює відсутні підтвердження, повертає кредит і зберігає запит для ручного `Try again`.
- Причина: не показувати оцінку без достатньої доказової основи та не списувати кредит за незавершену послугу.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: evidence gate потребує окремого no-data result state без score.

### 2026-09-06 — Визначено поля post-trip feedback

- Тип: UX / Research / Content
- Статус: Погоджено
- Зміна: post-trip форма містить два обов’язкові питання про вплив на рішення й точність результату, а також необов’язковий вибір критеріїв із розбіжностями та коментар.
- Причина: отримувати основні сигнали корисності й точності без перевантаження користувача.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: feedback UI потребує двох коротких required steps та optional details.

### 2026-09-06 — Визначено момент post-trip feedback

- Тип: UX / Research
- Статус: Погоджено
- Зміна: feedback запитується лише після завершення відомих дат поїздки або після явної дії `Stayed here`. Без цих сигналів продукт не вгадує момент поїздки; email використовується тільки за окремою згодою.
- Причина: не надсилати нерелевантні запити та не робити припущень про фактичну подорож.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: feedback trigger залежить від trip dates або explicit stay confirmation.

### 2026-09-06 — Визначено повернення кредиту за підтверджену помилку

- Тип: Trust / Payment / AI-result
- Статус: Погоджено
- Зміна: кредит автоматично повертається, якщо підтверджена помилка суттєво змінила статус, score або висновок за важливим чи критичним критерієм. Другорядне виправлення без впливу на рішення не повертає кредит.
- Причина: пов’язати компенсацію з реальною втратою цінності перевірки.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: review process має визначати material impact помилки та запускати автоматичне повернення кредиту за відповідної умови.

### 2026-09-06 — Визначено flow повідомлення про неправильний факт

- Тип: UX / Trust / AI-result
- Статус: Погоджено
- Зміна: дія `Report issue` доступна біля конкретного висновку або доказу. Користувач обирає причину й може додати коментар; результат отримує `Under review`, а підтверджене виправлення зберігається як нова версія.
- Причина: зробити виправлення точним, прозорим і відтворюваним без прихованого перезаписування результату.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: result UI потребує claim-level report action, review status і version history.

### 2026-09-06 — Дозволено кілька перевірок у trip chat

- Тип: UX / Product / Payment
- Статус: Погоджено
- Зміна: один чат поїздки може містити кілька незалежних перевірок готелів зі спільним локальним контекстом. Кожна перевірка використовує окремий кредит; результати зберігаються хронологічно без автоматичного comparison у першому релізі.
- Причина: дати змогу дослідити кілька варіантів для однієї поїздки без дублювання контексту.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: composer чату має підтримувати нову перевірку, а history — кілька result entries у межах одного trip chat.

### 2026-09-06 — Визначено структуру історії

- Тип: UX / Product / Data
- Статус: Погоджено
- Зміна: історія групується за чатами конкретних поїздок. Усередині чату зберігаються локальний контекст, перевірки, альтернатива, версії, виправлення та повідомлення.
- Причина: зберігати повний контекст поїздки й не дробити пов’язані дії на окремі записи історії.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: data model та history UI мають використовувати trip chat як батьківську сутність для результатів.

### 2026-09-06 — Визначено flow `Hotel not found`

- Тип: UX / Content
- Статус: Погоджено
- Зміна: якщо готель не знайдено до запуску, система зберігає введення, просить додати локацію або посилання, може показати схожі об’єкти для підтвердження та не резервує кредит.
- Причина: допомогти виправити запит без втрати введених даних і без необґрунтованого списання.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: hotel input потребує inline error, уточнення та optional suggestions state.

### 2026-09-06 — Визначено згоду на платний preliminary result

- Тип: UX / AI-result / Payment
- Статус: Погоджено
- Зміна: якщо доступний лише `Preliminary result`, користувач обирає `View preliminary result` зі списанням кредиту або `Stop check` із поверненням кредиту.
- Причина: не списувати кредит за завідомо неповний результат без усвідомленої згоди.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: analysis flow потребує decision state після перевірки minimum evidence та до формування попереднього результату.

### 2026-09-06 — Визначено flow технічної помилки аналізу

- Тип: UX / Content / Payment
- Статус: Погоджено
- Зміна: технічна помилка показується в компактній строці аналізу як `Check failed`; деталі доступні в акордеоні. Кредит автоматично повертається, запит зберігається, повторний запуск можливий лише через `Try again`.
- Причина: зберегти контекст користувача та дати прозорий шлях відновлення без автоматичного повторного списання.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: error state потребує refund confirmation, збереженого draft і manual retry.

### 2026-09-06 — Визначено `No match found` для пошуку альтернативи

- Тип: UX / Content / Payment
- Статус: Погоджено
- Зміна: якщо альтернативу не знайдено, користувач бачить `No match found`, підтвердження повернення кредиту та пояснення обмежень. Змінені параметри запускаються як нова спроба з новим резервуванням кредиту.
- Причина: пояснити відсутність результату й не послаблювати вимоги без згоди користувача.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: no-result state потребує пояснення, refund confirmation і дій для редагування параметрів.

### 2026-09-06 — Визначено базовий flow пошуку альтернативи

- Тип: UX / Product
- Статус: Погоджено
- Зміна: після результату користувач обирає `Find alternative`, задає ціновий сегмент, переглядає успадковані критерії та може локально змінити їх до запуску. Зміни не впливають на початкову перевірку чи глобальний профіль.
- Причина: дати користувачеві контроль над окремим пошуком альтернативи без неочікуваної зміни збережених налаштувань.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: alternative flow потребує review step для сегмента й критеріїв та використовує спільну credit/paywall logic.

### 2026-09-06 — Уточнено повернення з paywall

- Тип: UX / Payment
- Статус: Погоджено
- Зміна: після успішної покупки збережена перевірка не запускається автоматично. Користувач повертається до запиту й окремо підтверджує запуск; невикористані кредити залишаються на балансі.
- Причина: до завершення оплати початковий запит може втратити актуальність.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: success state paywall має повертати збережений draft і пропонувати явну дію `Start check`.

### 2026-09-06 — Визначено запуск перевірки та paywall без кредитів

- Тип: UX / Payment
- Статус: Погоджено
- Зміна: за наявності кредиту перевірка запускається після підтвердження готелю, кредит резервується, а баланс зменшується. За нульового балансу перевірка не запускається та відкривається paywall із пакетами; поточний запит і контекст зберігаються.
- Причина: визначити однозначну поведінку для доступного та нульового credit balance.
- Артефакти: `USER_FLOW_GUIDELINES.md`.
- Вплив: flow запуску потребує перевірки балансу, paywall state і відновлення збереженого запиту після оплати або закриття paywall.

### 2026-09-06 — Прибрано артиклі з коротких UI-labels

- Тип: Content / UX / UI
- Статус: Погоджено
- Зміна: для кнопок і status badges зафіксовано короткі природні формулювання без артиклів. Активний негативний статус змінено з `Not a fit` на `Doesn’t fit`; дія пошуку альтернативи — `Find alternative`.
- Причина: зробити короткі UI-labels компактнішими та послідовнішими.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: нові кнопки й badges мають уникати артиклів без порушення природної англійської. Попередній запис про `Not a fit` збережено як історію зміни.

### 2026-09-06 — Скорочено негативний статус результату

- Тип: Content / UX / Product
- Статус: Погоджено
- Зміна: довгий статус `Does not meet mandatory requirements` замінено на `Not a fit`. Поруч обов’язково показується конкретна критична вимога, якій готель не відповідає.
- Причина: зробити статус коротшим і легшим для швидкого сканування без втрати пояснення.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: використовувати `Not a fit` у result UI, повідомленнях і майбутніх макетах.

### 2026-09-06 — Перевірено перенесення user flows і відновлено правила comparison

- Тип: Documentation / Product
- Статус: Погоджено
- Зміна: підтверджено збереження перенесених user flows; відновлено раніше зафіксовані правила майбутнього comparison, які були помилково вилучені під час зміни меж першого релізу.
- Причина: зберегти повноту Product Guidelines і не видаляти погоджені правила без окремого рішення.
- Артефакти: `PRODUCT_GUIDELINES.md`, `USER_FLOW_GUIDELINES.md`.
- Вплив: comparison залишається поза першим релізом, але його погоджена credit logic збережена для наступного етапу.

### 2026-09-06 — Винесено user flows в окремий документ

- Тип: Documentation / UX
- Статус: Погоджено
- Зміна: onboarding, запуск перевірки, loading state і компактний результат перенесено з Product Guidelines до окремого документа user flows.
- Причина: відокремити послідовність взаємодії від продуктових правил та обмежень.
- Артефакти: `USER_FLOW_GUIDELINES.md`, `PRODUCT_GUIDELINES.md`.
- Вплив: усі наступні рішення щодо послідовності екранів і станів потрібно фіксувати у `USER_FLOW_GUIDELINES.md`.

### 2026-09-06 — Визначено loading state аналізу

- Тип: UX / UI
- Статус: Погоджено
- Зміна: аналіз показується однією компактною строкою, яку можна розгорнути як акордеон із деталями фактичних етапів. Штучний відсоток готовності не використовується; процес продовжується у фоні.
- Причина: дати прозорість без перевантаження екрана та без оманливої точності прогресу.
- Артефакти: `PRODUCT_GUIDELINES.md`, `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: loading UI потребує collapsed і expanded станів та реальних статусів pipeline.

### 2026-09-06 — Визначено credit UX під час запуску перевірки

- Тип: UX / Payment
- Статус: Погоджено
- Зміна: flow запуску не показує вартість чи кількість кредитів за окрему перевірку. Користувач підтверджує лише ідентифікований готель, після чого аналіз запускається; баланс доступний як ненав’язлива інформація в інтерфейсі.
- Причина: зберегти простий, сфокусований flow перевірки без зайвого платіжного кроку.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: не додавати в CTA або confirmation step текст на кшталт «1 credit» чи ціну перевірки.

### 2026-09-06 — Визначено підтвердження ідентичності готелю

- Тип: UX / Product / AI-result
- Статус: Погоджено
- Зміна: за однозначного зіставлення готелю аналіз запускається без окремого підтвердження; за кількох можливих збігів або суттєвих відмінностей корпусу чи категорії номера користувач обирає об’єкт до запуску.
- Причина: прибрати зайвий крок для точних запитів і не допустити аналізу неправильного об’єкта.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: loading state показує ідентифікований готель, а ambiguous-hotel state потребує карток вибору.

### 2026-09-06 — Визначено уточнення перед запуском перевірки

- Тип: UX / Product / AI-result
- Статус: Погоджено
- Зміна: для критичного критерію система збирає необхідний контекст до запуску аналізу. Для звичайних і важливих критеріїв користувач може продовжити з неповним результатом, а неперевірюваний критерій позначається як `Unknown`.
- Причина: не показувати непідтверджену відповідність критичній вимозі, водночас не блокуючи перевірку через другорядні дані.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: pre-check flow має визначати, яких саме даних бракує для кожного критерію.

### 2026-09-06 — Визначено склад мінімального профілю

- Тип: UX / Product / Data
- Статус: Погоджено
- Зміна: мінімальний профіль містить ім’я, звичний склад поїздки, загальні вподобання, орієнтир бюджету та важливі й критичні критерії. Параметри конкретної поїздки задаються в чаті.
- Причина: забезпечити персоналізований перший результат без перевантаження onboarding.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: форма onboarding та модель профілю мають відокремлювати глобальні дані від контексту конкретної поїздки.

### 2026-09-06 — Визначено перший onboarding flow

- Тип: UX / Product
- Статус: Погоджено
- Зміна: після підтвердження email користувач проходить мінімальне створення профілю до першої перевірки.
- Причина: персоналізована перевірка має ґрунтуватися на профілі, а не на неповних або відсутніх даних.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: onboarding має включати підтвердження email, мінімальний профіль і лише потім головний екран перевірки.

### 2026-09-06 — Уточнено межі першого релізу

- Тип: Product / MVP scope
- Статус: Погоджено
- Зміна: перевірка одного готелю та платний пошук однієї повністю перевіреної альтернативи залишаються у першому релізі. Порівняння кількох готелів перенесено до наступного етапу.
- Причина: зменшити складність scoring, result UI та першої реалізації без втрати основної цінності продукту.
- Артефакти: `PRODUCT_GUIDELINES.md`.
- Вплив: не проєктувати й не реалізовувати compare flow у межах першого релізу.

### 2026-08-31 — Додано журнал змін

- Тип: Documentation
- Статус: Погоджено
- Зміна: створено централізований журнал для продукту, документації, дизайну та коду.
- Причина: зберігати прозору історію рішень і змін у проєкті.
- Артефакти: `CHANGELOG.md`.
- Вплив: усі наступні зміни мають супроводжуватися записом у цьому файлі.

### 2026-08-31 — Додано Product Guidelines

- Тип: Documentation / Product
- Статус: Погоджено
- Зміна: до проєкту додано узгоджений документ із продуктовими правилами, межами MVP, принципами довіри, роботи з даними, результатами, оплатою, edge cases і failure states.
- Причина: зафіксувати єдине джерело продуктових рішень для подальшого дизайну та розробки.
- Артефакти: `PRODUCT_GUIDELINES.md`, `AGENTS.md`.
- Вплив: перед продуктовими, UX, content, AI-result, scoring, data, payment або trust-рішеннями потрібно звірятися з `PRODUCT_GUIDELINES.md`.

### 2026-08-31 — Додано Visual Style Guidelines

- Тип: Documentation / UI
- Статус: Погоджено
- Зміна: до проєкту додано візуальний стайлгайд fitstay. на основі головного екрана застосунку та лендингу.
- Причина: зафіксувати візуальний напрям, палітру, типографіку, компоненти, motion, accessibility і responsive principles.
- Артефакти: `VISUAL_STYLE_GUIDELINES.md`.
- Вплив: перед створенням або зміною UI звірятися зі стайлгайдом. Композиція загального match score і 3–5 category scores залишається відкритим рішенням.
