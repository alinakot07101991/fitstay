# fitstay. — AI Pipeline Guidelines

Статус: робочий документ для погоджених правил AI та deterministic processing.

## 1. Розподіл відповідальності

AI використовується для:

- вилучення релевантних фактів і фрагментів із доступних джерел;
- зіставлення evidence з критеріями користувача;
- нормалізації формулювань;
- визначення, чи evidence підтверджує, спростовує або не дозволяє перевірити claim;
- формування короткого пояснення на основі структурованих перевірюваних даних.

Детермінований application code використовується для:

- застосування зафіксованих ваг критеріїв;
- розрахунку category scores та overall score;
- застосування critical gates;
- визначення результату `Fits`, `Preliminary result`, `Doesn’t fit` або `Not enough data`;
- правил резервування, списання й повернення кредитів.

Модель не генерує score «за відчуттям» і не може самостійно змінювати ваги, thresholds або critical rules.

Фіксовані score categories: `Room & comfort`, `Food & service`, `Location & logistics` і `Facilities & experience`. AI може запропонувати primary category для normalized criterion, але mapping проходить schema validation і кожен criterion входить лише до однієї category. Overall match score розраховується за всіма активними критеріями окремо, а не як arithmetic mean category scores. Category без застосовних або перевірюваних criteria повертає `Not enough data` без числового score.

Application code показує numeric category score лише за двох одночасних умов: evaluated criterion count не менше 2 та evaluated weight не менше 50% total active weight категорії. Score використовує ті самі criterion weights і fit values, що й overall score. Якщо gate не виконано, повертається `Not enough data`; єдиний active critical criterion залишається окремим critical outcome без category number. Якщо critical criterion категорії failed через `Doesn’t meet` або `Partly meets`, category composer повертає primary state `Critical issue` замість numeric score. Якщо critical criterion unresolved через `Unknown`, `Likely` або `Known + Medium confidence`, composer повертає `Needs verification` і обмежує overall result станом `Preliminary result`. В обох випадках eligible match решти criteria передається лише як secondary field `other_criteria_match`. Інші categories обчислюються незалежно. AI не може обійти або змінити цей gate.

Category composer застосовує deterministic precedence: `critical_issue` → `needs_verification` → `not_enough_data` → `numeric_score`. Перевірка наступного state виконується лише тоді, коли жоден state вищого пріоритету не активний.

Overall score eligibility також визначає application code. `Full` numeric result потребує minimum 70% total active weighted coverage, усіх verified critical criteria та minimum 5 evaluated criteria або всіх active criteria, якщо їх менше п’яти. `Preliminary` numeric result потребує minimum 50% weighted coverage і 3 evaluated criteria та не може створювати positive verdict. Нижчий coverage або count повертає `Not enough data` без overall number. Failed critical criterion примусово встановлює `Doesn’t fit`, а unknown critical criterion блокує `Fits` незалежно від percentage.

Після підтвердження full eligibility application code застосовує provisional match threshold 70%: score `>= 70` дає `Fits`, score `< 70` дає `Doesn’t fit`. Confirmed critical failure встановлює `Doesn’t fit` раніше й незалежно від threshold. Preliminary numeric score не класифікується як final fit або final non-fit лише за percentage. Threshold зберігається як versioned scoring configuration, а не вільно визначається AI.

Application code обчислює raw overall, category і secondary percentages із повною precision, потім створює displayed score за deterministic half-up rounding до найближчого integer. `fit_threshold` застосовується до displayed overall score, а не до hidden raw value. AI не виконує rounding і не може змінювати його rule.

`display_score = 100` є валідним і не cap-иться до 99. Result composer трактує його лише як повну відповідність evaluated criteria в межах evidence scope. User-visible generation не може перетворювати 100% на claims `Perfect match`, `Ideal hotel`, `Guaranteed` або іншу гарантію; explanation має зберігати analysis scope, coverage і date.

Overall result composer застосовує deterministic precedence `doesnt_fit` → `not_enough_data` → `preliminary` → `fits`. Confirmed failed critical gate має найвищий пріоритет навіть за insufficient coverage решти criteria. Threshold-based `doesnt_fit` застосовується лише до full-eligible result зі score нижче 70%. За відсутності confirmed critical failure pipeline перевіряє minimum preliminary-data gate; якщо він не пройдений, повертається `not_enough_data`. `Preliminary` можливий лише після проходження цього gate, а `fits` — лише після всіх full-result gates і score щонайменше 70%.

## 2. Відтворюваність

Кожен результат пов’язується зі snapshot вхідних даних, evidence records, версією моделі, prompt/pipeline configuration, scoring logic і result schema відповідно до `DATA_MODEL_GUIDELINES.md`.

Офіційно підтримувані мови чату для MVP: англійська, німецька, іспанська, французька та українська. Structured extraction, criterion mapping, critical gates і scoring не змінюються залежно від мови. User-visible explanation і переклад evidence формуються мовою поточного чату, тоді як original evidence excerpt зберігається без заміни.

Pipeline визначає мову першого змістовного повідомлення до retrieval і credit reservation. Unsupported language не обробляється як best-effort supported input: check залишається незапущеним, доки користувач не обере одну з підтримуваних мов. Зміна chat language застосовується лише до наступних user-visible responses і result versions та не перегенеровує попередні результати.

## 3. Послідовність pipeline

1. Зафіксувати snapshot профілю, chat context і критеріїв.
2. Ідентифікувати готель та потрібний рівень деталізації.
3. Сформувати retrieval plan за критеріями.
4. Отримати дані з дозволених джерел.
5. Нормалізувати й дедуплікувати evidence та пов’язати його з готелем, корпусом або room category.
6. Вилучити claims, дати, підтвердження, заперечення та суперечності.
7. Пройти quality gates: entity identity, minimum evidence, critical criteria verification та unsupported-claim check.
8. Детермінованим кодом розрахувати category scores, overall score і result state.
9. Сформувати пояснення лише зі структурованих claims та evidence.
10. Зберегти versioned result і показати його користувачеві.

Якщо quality gate не пройдено, pipeline не переходить до звичайного позитивного результату та використовує відповідний preliminary, no-data або failure state.

## 4. Structured claim output

Для кожного висновку AI повертає структурований запис:

- criterion ID;
- оригінальне формулювання критерію користувача;
- нормалізований claim;
- scope: hotel, building або room category;
- assessment: `Known`, `Likely`, `Conflicting` або `Unknown`;
- criterion fit: meets, partly meets, doesn’t meet або unknown;
- supporting evidence IDs;
- opposing evidence IDs;
- дати та recency metadata;
- коротке пояснення, сформоване лише з пов’язаного evidence.

Перед claim evaluation pipeline розділяє compound requirement на independently verifiable atomic criteria. `Partly meets` дозволено лише для indivisible criterion із material limitation, яке все ще частково задовольняє потребу. Missing або insufficient evidence повертає `Unknown`, а не `Partly meets`. Для critical criterion `Partly meets` завжди fail mandatory gate і дає `Doesn’t fit`. Якщо конкретне обмеження несумісне з user context, fit state має бути `Doesn’t meet` незалежно від того, що загальна умова доступна для інших користувачів.

Якщо mandatory gate failed, result composer встановлює `Doesn’t fit` як primary status і додає конкретний failed critical criterion. Обчислений percentage не подається як overall match score; він може бути переданий UI лише як secondary field `other_preferences_match`. Category scores зберігаються як supporting detail і не можуть змінити primary status.

Модель не призначає довільний числовий confidence. Рівень `High`, `Medium` або `Low` розраховується детермінованими правилами на основі якості, кількості, актуальності та узгодженості джерел.

Confidence engine розділяє objective operational facts і subjective guest-experience claims:

- `High`: актуальний офіційний source прямо підтверджує objective fact для правильного entity scope і не має свіжої достовірної суперечності; або subjective signal підтримують щонайменше три незалежні свіжі відгуки в різні дати в corpus від 20 релевантних відгуків без достовірної суперечності. Друга платформа підсилює source diversity, але не є mandatory, якщо independence, recency та достатній corpus підтверджені на одній платформі.
- `Medium`: актуальний direct claim походить з одного надійного незалежного non-review source; або узгоджений review signal має corpus 10–19; або кілька відгуків з однієї платформи не проходять High gates за independence, recency чи corpus size.
- `Low`: evidence складається з одиничного відгуку, є непрямим, застарілим, має unclear entity scope або corpus менше 10 для pattern claim. Pipeline не дозволяє зберегти такий claim як `Known` і понижує його до `Likely` або `Unknown`.

Офіційний source сам по собі може підтвердити objective operational fact, але не subjective guest experience на кшталт тиші, чистоти чи якості сервісу.

Лише assessment `Known`, що пройшов evidence validation, отримує `evaluated = true` і може входити до numeric score, evaluated count та evaluated weight. `Likely`, `Conflicting` і `Unknown` мають `evaluated = false`. `Likely` може бути показаний як tentative strength або risk, але не впливає на percentage. `Likely` для critical criterion блокує `Fits` і веде до `Preliminary result`; likely safety signal завжди створює warning і additional-verification requirement.

Confidence gate застосовується детерміновано після evidence validation. Для normal та important criteria `evaluated = true` дозволено за `Known` із `High` або `Medium confidence`. Critical criterion може бути позитивно confirmed лише за `Known + High confidence`; `Known + Medium` для critical має `evaluated = false`, блокує `Fits` і переводить result у `Preliminary result`. Schema забороняє `Known + Low confidence`: pipeline понижує assessment до `Likely` або `Unknown`. Low-confidence negative safety signal не стає confirmed claim, але завжди створює user-visible warning.

## 5. Unsupported-claim validation

Після extraction виконується окремий validation stage:

- кожен фактичний user-visible claim має містити evidence IDs;
- evidence має стосуватися того самого готелю, корпусу або room category;
- релевантний фрагмент джерела має справді підтримувати сформульований claim;
- застарілі дані не описуються як поточні;
- unsupported claim видаляється або змінюється на `Unknown`;
- unsupported positive claim за критичним критерієм блокує звичайний результат.

Validation поєднує детерміновані schema, identity, scope, date та citation checks з окремим AI-verification pass. Результат не покладається лише на self-check першої генерації.

### Alternative price normalization

- До candidate retrieval application code фіксує один confirmed geography scope: canonical source destination/resort area, source country або один user-selected different destination.
- Retrieval не розширює geography scope автоматично й відхиляє candidate поза confirmed scope до персоналізованого scoring.
- Default retrieval шукає одну accommodation unit для всього confirmed traveler composition і не вимагає окремого `Rooms` input.
- Якщо source потребує room allocation, single-unit accommodation неможливе або user criteria вимагають окремих номерів, pipeline призупиняє відповідний search step і просить explicit configuration замість прихованого припущення.
- Alternative result завжди містить actual room count and allocation, які підтримує live-price evidence.
- AI не обчислює й не вигадує exchange rate.
- Якщо live source повертає user-selected currency, application code використовує original amount без conversion.
- Якщо source currency відрізняється, deterministic code отримує актуальний rate з authorized FX provider і зберігає provider, rate та retrieval timestamp.
- Budget gate використовує normalized amount разом із known mandatory taxes і fees для точних dates та occupancy.
- Converted amount позначається як approximate; original source amount і currency зберігаються та доступні в details.
- Відсутній або прострочений FX rate не замінюється припущенням і не дозволяє підтвердити candidate як in-budget у вибраній валюті.
- `No match found` формується лише тоді, коли authorized inventory provider повернув deterministic completeness signal для exact query і жоден candidate не пройшов constraints; AI не визначає completeness самостійно.
- Фіксована кількість отриманих або перевірених готелів не замінює provider completeness signal.
- Missing, unavailable, capped, truncated або completeness-unknown inventory response повертає `Price data unavailable`, не створює candidate result і запускає automatic credit return.
- User-visible explanation обмежує висновок доступними sources і не узагальнює його на весь hotel market.

## 6. Retry, timeout і provider fallback

- Кожен stage зберігає output і має idempotency key, тому його можна безпечно повторити без дублювання результатів або credit operations.
- Для тимчасової технічної помилки виконуються дві автоматичні повторні спроби зі зростаючою затримкою.
- Після невдалих повторів використовується заздалегідь налаштований fallback provider, лише якщо він пройшов ті самі schema, quality та regression tests.
- Уже зібране валідне evidence не отримується повторно без потреби.
- Retries і fallback не резервують і не списують додаткові кредити.
- Якщо основний і fallback providers недоступні, перевірка завершується technical error, кредит повертається, а запит зберігається для `Try again`.
- Фактично використані provider і model version записуються в result metadata.

## 7. Regression і consistency testing

- Підтримується зафіксований regression set щонайменше зі 100 сценаріїв.
- За однакових input snapshot, evidence і scoring version result state та числові scores мають збігатися.
- Набір confirmed і critical claims не може змінюватися без зміни input, evidence або versioned logic.
- Формулювання explanation може незначно відрізнятися, але факти, статуси й зміст не змінюються.
- Нова model, prompt або pipeline version спочатку проходить regression set у shadow mode.
- Версія не замінює production configuration за наявності критичних розбіжностей.
- Кожна очікувана зміна result behavior отримує нову version ID та запис у `CHANGELOG.md`.

## 8. Відкриті рішення

1. Конкретний model provider і fallback provider після технічного тестування.
2. Stage-specific timeout values після вимірювання реальної latency.
