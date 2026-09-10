# fitstay. — Beta Launch Plan

Статус: єдиний робочий документ для closed beta, pilot launch, prototype decisions, product research, порівняння з ChatGPT та критеріїв рішення про подальший launch. Погоджені рішення відокремлені від рекомендацій, які потрібно затвердити пізніше.

Увесь beta-specific context, pre-validation assumptions, participant research, recruitment, test methodology, ChatGPT comparison і staged-launch decision framework зберігаються тільки тут. Інші документи описують актуальний підтверджений продукт і не використовують beta як умову чинності продуктових правил.

## 0. Historical research inputs

До beta planning використовувалися AI-generated behavioral archetypes та AI-persona interviews. Вони допомогли сформувати recruitment hypotheses і task scenarios, але самі по собі не були evidence реальної поведінки користувачів. Цей provenance зберігається в Beta Launch Plan і не переноситься до актуальних product specifications.

Початкові cross-archetype hypotheses:

1. Перевірка готелю вимагає ручного збору інформації з кількох джерел.
2. Відгуки потребують значних витрат часу на ручне читання та пошук релевантних сигналів.
3. Одного джерела недостатньо для довіри до реального стану готелю.
4. Суперечлива інформація створює сумніви й запускає додаткову перевірку.
5. Невпевненість у якості варіанта може призвести до повторного пошуку.
6. AI може зменшити ручну роботу, але не усуває потребу у перевірці evidence.

Цитати з AI-persona interviews зберігаються як historical hypotheses, а не як user research evidence:

> Аліна: «Найбільше часу… іде на оцей ручний перехресний перегляд, коли порівнюєш інформацію з різних сайтів».

> Іван: «Не вистачає якогось єдиного зручного місця… щоб не доводилося відкривати по п'ять вкладок одночасно».

> Аліна: «Повністю довіряти йому я б не стала».

> Іван: «Повністю покладатися тільки на штучний інтелект я б… не став і самостійно б усе одно перевіряв».

## 1. Поточний контекст і погоджені межі

fitstay. запускається як справжній web application, а не як окремий clickable prototype.

Перший запуск має такі межі:

- доступ отримують лише відібрані та запрошені користувачі;
- кожен новий account отримує дві безкоштовні перевірки;
- real payments, checkout і придбання додаткових кредитів не доступні;
- користувачі працюють із власними реальними hotel-decision задачами;
- на цій cohort тестуються product value, usability, trust і quality;
- сайт явно позначений як `Beta`;
- результати pilot не вважаються автоматичним дозволом на public або paid launch.

Цей документ потрібен як орієнтир для правильного запуску та дослідження. До відкритих розділів можна повернутися пізніше без блокування поточної розробки сайту.

## 2. Мета pilot launch

Pilot має дати evidence для відповідей на п’ять go / no-go questions:

1. Чи потрібен людям окремий продукт для цього decision.
2. Чи може fitstay. бути помітно кращим за звичайний ChatGPT і ручний research.
3. Чи можна стабільно отримувати достатню evidence base.
4. Чи можна перетворювати evidence base на defensible і зрозумілий score.
5. Чи бачать користувачі достатню цінність, щоб пізніше розглянути оплату.

Окремо pilot перевіряє, чи зрозумілі profile model, hotel confirmation, critical criteria, result states, scores, risks, unknowns та evidence.

## 3. Що має бути справжнім у pilot product

Closed pilot — це production-like vertical slice з working accounts і persisted data.

Minimum working scope:

- registration, email verification та account;
- profile і chat-specific trip context;
- hotel entry, identification та confirmation, коли вона потрібна;
- запуск справжньої персоналізованої перевірки;
- compact result, main and category scores, critical criteria, strengths, risks, unknowns, evidence та sources;
- persisted chats, check history і result versions;
- usefulness feedback і report-an-issue flow;
- reservation, deduction та automatic return rules для двох безкоштовних кредитів.

Real payment flow, paid credits, Merchant of Record і checkout не входять до closed pilot.

Після використання двох free checks нова перевірка не запускається й paywall не відкривається. Поточний request і chat context залишаються збереженими. Exact zero-credit message, request-more-access action або manual additional grant залишаються окремим beta operations decision.

## 4. Internal analysis operations

- Retrieval і analysis можуть частково виконуватися manual або semi-automatically усередині системи.
- Користувач завжди отримує справжній result для свого готелю, а не заздалегідь вигаданий generic output.
- Кожен result дотримується чинних evidence, scoring, source, confidence, failure-state і critical-criterion rules.
- Manual processing не дозволяє створювати unsupported claims, вигадувати sources або обходити result gates.
- Користувач не бачить fake progress або тверджень про повну automation, яких продукт фактично не забезпечує.
- Processing status, expected waiting time і recovery мають відповідати фактичній operation model.

## 5. Research cohort

Основна cohort:

- 12–15 реальних самостійних мандрівників;
- фокус MVP — технічно підковані користувачі віком 18–45 років;
- 4–5 family travelers, 4–5 couple travelers і 4–5 solo travelers;
- кожен учасник самостійно бере участь у виборі та бронюванні готелю;
- кожен учасник планує поїздку до Європи або Туреччини чи нещодавно обирав там готель;
- країна проживання не обмежується;
- учасник може користуватися англомовним interface;
- кожен учасник має реальну hotel-decision задачу та кілька значущих критеріїв;
- до основної cohort не входять travel agents, hospitality professionals або учасники розробки fitstay.;
- cohort охоплює різні рівні досвіду з ChatGPT і не складається лише з active AI users.

Behavioral archetypes використовуються як hypotheses для recruitment і analysis, але не замінюють реальних учасників і не вважаються validated personas.

## 6. Recruitment

- Двоє знайомих можуть пройти pilot sessions для перевірки task script і moderation flow; їхні результати не входять до основної cohort.
- 6–8 учасників основної cohort залучаються через тематичні travel, expat і family communities.
- 6–8 учасників залучаються через незалежну research panel.
- Не більше 2–3 учасників основної cohort походять з одного community або personal network.
- Recruitment invitation нейтрально описує дослідження вибору готелю й не підказує, що fitstay. має бути кращим за ChatGPT.
- Screener збирає лише age range, country of residence, travel context, destination, trip timing, роль у виборі готелю, English proficiency та AI familiarity.

## 7. Формат дослідження

Це не лише survey. Основний формат — moderated session із реальною задачею, доповнена product analytics, коротким questionnaire та interview.

Рекомендована тривалість однієї session — 45–60 хвилин.

### 7.1 Context interview — 5–10 хвилин

Учасник пояснює задачу поїздки, свої критерії та показує звичайний спосіб перевірки готелю. Moderator фіксує sources, sequence, time, unresolved doubts і критерії рішення.

### 7.2 Робота з fitstay. — 15–20 хвилин

Учасник самостійно виконує перевірку на реальному сайті. Moderator спостерігає, але не допомагає, доки учасник повністю не заблокований.

Фіксуються task completion, time, errors, points of confusion, evidence opens, розуміння scores, risks і unknowns та вплив result на рішення.

### 7.3 Порівняння зі звичайним ChatGPT — близько 10 хвилин

Та сама задача виконується у звичайному ChatGPT. Порядок показу балансується: частина учасників починає з fitstay., частина — з ChatGPT, щоб first-product effect не створював систематичної переваги.

### 7.4 Короткий questionnaire — 3–5 хвилин

Після обох варіантів учасник відповідає на короткі standardized questions:

- `Did this check help your decision?` — `Yes`, `Partly`, `No`;
- якому result він довіряє більше;
- який result зрозуміліший;
- чи дізнався він щось важливе нове;
- чи змінив або уточнив result його рішення;
- який спосіб він обрав би наступного разу: fitstay., ChatGPT, manual research або no preference.

### 7.5 Follow-up interview — 10–15 хвилин

Учасник пояснює відповіді власними словами: що саме дало цінність, чого бракувало, які claims викликали сумнів, що було незрозумілим і чому він віддав перевагу певному способу.

### 7.6 Willingness-to-pay signal

У closed pilot гроші не списуються й checkout не запускається. Після отримання value дослідник може показати поточні package options як окремий research stimulus і запропонувати обрати:

- join future paid beta;
- package, який учасник реально розглянув би;
- not interested.

Research screen має прямо повідомляти, що це не покупка і charge не відбудеться. Такий вибір є сильнішим signal, ніж абстрактне запитання «чи заплатили б ви», але не прирівнюється до actual payment conversion.

## 8. Дані та evidence дослідження

Рішення спираються на поєднання трьох типів даних:

1. Behavior: completion, time, navigation, errors, evidence opens, returns і повторні checks.
2. Standardized responses: usefulness, clarity, trust, new information, decision impact, stated preference і ChatGPT preference win-rate.
3. Qualitative evidence: explanations, quotes, confusion, objections, unmet expectations і observed workarounds.

Якщо session записується, participant має надати explicit consent. Research notes не повинні містити зайвих personal або payment data; quotes для ширшого використання anonymized.

## 9. Правила інтерпретації

- Самооцінка учасника не замінює observation його поведінки.
- Позитивна реакція на interface не вважається доказом product value.
- Stated willingness to pay не вважається actual conversion.
- Результати 12–15 sessions є directional evidence, а не репрезентативною оцінкою всього ринку.
- Findings аналізуються окремо за family, couple і solo contexts, якщо між ними виникають суттєві відмінності.
- Contradictions, failures і негативні reactions зберігаються, а не усереднюються або виключаються.
- Тимчасове UI-рішення, включно з presentation of scores, не вважається validated final design лише через використання у pilot.

## 10. Draft success thresholds — потребують окремого погодження

Ці thresholds є рекомендацією для майбутнього обговорення, а не затвердженим go decision. `Go` після малої cohort означає продовжити closed pilot, а не перейти до public launch.

### Continue pilot

- щонайменше 80% учасників завершують основну перевірку;
- щонайменше 60% відповідають `Yes` на usefulness question;
- щонайменше 60% бачать конкретну перевагу fitstay. над ChatGPT або manual research;
- щонайменше 30% обирають join future paid beta або конкретний package як research signal;
- немає critical factual або safety errors.

### Iterate

- critical safety threshold не порушено, але один або кілька value чи usability targets не досягнуто;
- повторювані проблеми мають конкретну product, content або UI cause, яку можна виправити;
- після виправлення проводиться наступний невеликий research round.

### Stop expansion and reassess

- будь-яка critical error зупиняє нові checks до виправлення та verification;
- менше 30% учасників бачать конкретну перевагу над ChatGPT і manual research;
- менше 10% демонструють willingness-to-pay signal;
- більше половини не можуть завершити core task через product concept, а не окремі UI defects.

## 11. Experimentation rules для майбутніх ітерацій

- До появи стабільного traffic формальні A/B tests не проводяться, а statistical conclusions не робляться на малих samples. Для ранніх рішень використовуються funnel observation, user feedback і usability testing.
- Для однієї UX iteration usability testing охоплює щонайменше 5 користувачів із кожного суттєво відмінного сегмента, якого стосується зміна.
- До запуску A/B test фіксуються hypothesis, одна primary metric, eligible segment, duration і guardrails.
- Sample size розраховується окремо за baseline і minimum detectable effect з 95% confidence та 80% statistical power. Універсальний fixed minimum sample size не використовується.
- A/B test триває щонайменше два повні тижні та не завершується до досягнення calculated sample size.
- Не допускаються experiments, що послаблюють evidence rules, critical-criterion gates, credit recovery або safety protections.
- Experiment зупиняється після будь-якого critical incident або порушення required reliability target.

## 12. Подальший staged launch

### Current stage — Closed free pilot

Invite-only users, дві безкоштовні перевірки, no payments, real product і можливі manual або semi-automated internal operations.

### Future stage — Limited paid beta

Може розглядатися лише після authorized source path, Merchant of Record, verified credit ledger and recovery, applicable legal texts, unsupported-claim detection, monitoring, support escalation, required quality gates і закриття critical incidents.

### Future stage — Public launch

Може розглядатися після підтвердження product value, source coverage, latency, cost, measurable metrics, legal and payment readiness та здатності команди підтримувати заявлений service level.

## 13. Open decisions для наступного обговорення

1. Success thresholds для continue / iterate / stop.
2. Incentive для учасників.
3. Фінальний screener, recruitment invitation, questionnaire, interview guide і task script.
4. Точний invite mechanism і cohort management.
5. Processing time та service-level wording для manual або semi-automated checks.
6. Дата початку й тривалість closed pilot.
7. Support coverage під час pilot.
8. Entry criteria для майбутніх limited paid beta і public launch після отримання реальних даних.

## 14. Research and market gaps, які має перевірити pilot

- Provisional match threshold 70% для final status `Fits` не валідований реальними user outcomes; beta має перевірити, чи узгоджується він із рішеннями користувачів і post-trip accuracy feedback.
- Behavioral archetypes створені за допомогою AI і не валідовані на репрезентативній вибірці реальних користувачів.
- Інтерв’ю з AI-персонами дали hypotheses, але авторка прямо зазначає шаблонність відповідей і штучне зациклення персони Івана на чистоті.
- Behavioral archetypes і результати AI-interviews не валідовані реальними користувачами.
- Готовність делегувати AI та trust до analysis залишаються hypotheses.
- Не підтверджено willingness to pay.
- Не підтверджено, що окремий product дає більше value, ніж ChatGPT і manual research.
- Природна frequency hotel decisions може бути недостатньою для очікуваного retention.
- Return within 30 days може не відповідати природному travel cycle; у чинній analytics model 30-day repeat use відокремлено від 90-day trip-cycle retention.
- Post-trip feedback response rate не підтверджено.
