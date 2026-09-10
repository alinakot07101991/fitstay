# fitstay. — PRD and MVP Implementation Backlog

Статус: робочий implementation document для актуального підтвердженого продукту, сформований із погоджених правил проєкту станом на 2026-09-07.

Авторитетні продуктові рішення зберігаються в `PRODUCT_GUIDELINES.md`. Цей документ перетворює їх на screens, user stories, acceptance criteria, dependencies і порядок реалізації. У разі суперечності пріоритет має `PRODUCT_GUIDELINES.md`, а flow-specific правила — `USER_FLOW_GUIDELINES.md`.

## 1. Product objective

fitstay. допомагає самостійним мандрівникам перевірити конкретний уже знайдений готель за власними вподобаннями та контекстом поїздки, побачити персоналізований match score, ризики, невизначеність і evidence до бронювання.

Основна цінність MVP:

- скоротити ручний cross-platform research;
- показати, чи відповідає готель саме потребам цього користувача;
- не приховувати critical issues, conflicts і unknowns за високим score;
- дозволити перевірити основу висновку через sources, excerpts, dates і confidence;
- залишити фінальне рішення користувачеві.

## 2. Current implementation baseline

У React/Vite codebase зараз реалізований marketing landing page. Product application, account system, profile, trip chats, hotel checks, evidence pipeline, credit ledger, results, history, analytics і backend ще не реалізовані.

Поточний landing потребує окремої content-compliance перевірки перед publication, оскільки частина demo content, pricing, geography, language і alternative claims може не відповідати актуальним Product Guidelines.

## 3. MVP scope

Актуальний MVP є повноцінним web product і включає:

- обов’язкові account registration через email/password, Google або Facebook та verification email/identity;
- дві безкоштовні перевірки після verification;
- global traveler profile і trip-level overrides;
- hotel identification, confirmation, evidence retrieval, deterministic scoring і result history;
- template cards на home, включно з видимою карткою `Compare hotels`, яка відкриває coming-soon popup без запуску функції;
- one-time credit packages у EUR, paywall, Merchant of Record checkout, receipts і payment recovery;
- product UI English;
- supported chat languages English, German, Spanish, French і Ukrainian;
- будь-який hotel у Europe або Turkey, якщо пройдено entity та minimum-evidence gates;
- production monitoring, support, privacy, deletion і credit-recovery requirements.

Value fitstay. порівняно з generic ChatGPT вважається підтвердженим: продукт надає persistent profile, trip context, hotel identity confirmation, versioned evidence, deterministic scoring, critical gates, provenance і reproducible results у спеціалізованому workflow.

### Out of scope для MVP

- автоматичне бронювання або booking CTA;
- mobile native application;
- flights, routes, restaurants і activities;
- price monitoring;
- функціональне порівняння готелів;
- окремі профілі дітей або companions;
- custom templates і будь-яка точка входу для їх створення.

## 4. Primary actors

### Registered traveler

Користувач віком від 18 років, який створює profile, додає trip context, запускає hotel checks, читає results, evidence і history та керує своїми даними.

### Support / internal operator

Внутрішня роль для issue review, confirmed error correction, credit adjustment, payment recovery та source/pipeline incident handling. Точний admin interface не визначений; MVP потребує мінімальний secure internal tool або audited operations interface.

## 5. Screen map

```text
Marketing landing
└── Sign up / Sign in
    ├── Email or provider identity verification
    └── Profile onboarding
        └── App home
            ├── New trip chat / Hotel check
            │   ├── Chat context and preferences
            │   ├── Hotel identification and confirmation
            │   ├── Clarification / conflict resolution
            │   ├── Analysis row
            │   │   ├── Loading / background processing
            │   │   ├── Preliminary consent
            │   │   ├── Full or preliminary result accordion
            │   │   ├── Not enough data
            │   │   └── Check failed
            │   ├── Find alternative
            │   └── Report issue / Post-trip feedback
            ├── Search history / Trip chats
            ├── Saved hotels
            ├── Global traveler profile
            ├── Account and credit history
            ├── Notifications
            └── Help and support

Paywall
    ├── Package selection
    ├── Hosted checkout
    ├── Payment processing / failed
    └── Return to saved request and reconfirm
```

Hotel confirmation, loading, result і failure states можуть бути inline states усередині trip chat, а не окремими routes. Responsive implementation follows the visual guide: desktop uses history–workspace–preferences; mobile uses one column with secondary areas in drawers or sheets.

## 6. Screen inventory

| ID | Screen / surface | Scope | Purpose | Required states |
| --- | --- | --- | --- | --- |
| S-00 | Marketing landing | MVP | Explain confirmed value and lead to account access | default, responsive, legal links |
| S-01 | Authentication | MVP | Sign up and sign in with email/password, Google or Facebook and restore access | form error, provider error, session loading, recovery |
| S-02 | Account verification | MVP | Verify email or provider identity before credits and checks | email pending, expired link, resend, provider email unverified, verified |
| S-03 | Profile onboarding | MVP | Collect minimum global traveler profile | empty, validation error, conflict, completed |
| S-04 | App home | MVP | Start core task and access history/profile | first-use empty, returning user, zero credits, template cards, compare-coming-soon popup |
| S-05 | Trip chat workspace | MVP | Hold trip context and multiple checks | new chat, local overrides, profile changed |
| S-06 | Hotel identification | MVP | Confirm exact property before analysis | unique match, ambiguous, not found, unsupported geography |
| S-07 | Analysis row / accordion | MVP | Show progress, result and recoverable failures | queued, running, background, preliminary choice, full, no data, failed |
| S-08 | Result details | MVP | Explain verdict, scores, risks and evidence | Fits, Doesn’t fit, Preliminary, Not enough data |
| S-09 | Find alternative | MVP | Run one separate personalized alternative check | source-hotel selection, no previous checks, geography scope, destination identification, maximum nightly price, currency, dates, occupancy, running, result, no match, price data unavailable |
| S-10 | History and saved hotels | MVP | Reopen immutable result versions and chats | empty, populated, stale result, deleted reference |
| S-11 | Global profile | MVP | Edit defaults and criteria | view, edit, conflicts, priority limit |
| S-12 | Account / credit history | MVP | Show grants, purchases, reserves, spends and returns | balance, ledger list, linked check, deleted chat |
| S-13 | Notifications | MVP | Surface background completion and failures | unread, read, empty |
| S-14 | Help / report issue | MVP | Submit support request or evidence/payment issue | form, submitted, under review, resolved |
| S-15 | Paywall and package selection | MVP | Sell credit packages when balance is zero | packages, checkout return, cancelled |
| S-16 | Payment recovery | MVP | Resolve processing, failure or missing credits | processing, failed, restored, support handoff |

## 7. Core user journeys

### Journey A — First successful hotel check

1. User opens product registration or signs in.
2. User registers through email/password, Google or Facebook and completes the applicable account verification.
3. System grants exactly two free credits once.
4. User completes minimum profile.
5. User starts a new trip chat; current profile is copied as chat defaults.
6. User may edit local trip context and criteria.
7. User enters hotel name or link.
8. System identifies property and user confirms official name, city and country.
9. System validates conflicts, supported geography and credit availability.
10. Credit is reserved and analysis starts.
11. System retrieves and validates evidence, evaluates criteria and calculates deterministic scores.
12. User opens the completed compact analysis row and reads result details.
13. Credit becomes spent only after an eligible completed result.

### Journey B — Preliminary result

1. Pipeline reaches preliminary evidence threshold but cannot produce full result.
2. System explains the limitation before presenting the result as completed.
3. User chooses `View preliminary result` or `Stop check`.
4. `View preliminary result` produces the result and spends the credit.
5. `Stop check` does not produce the result and returns the credit.

### Journey C — Not enough data or technical failure

1. System stops without fabricating a score or complete result.
2. Compact row shows `Not enough data` or `Check failed`.
3. Accordion explains the recoverable reason without technical codes.
4. Credit returns automatically and visibly.
5. Request and context remain available for `Try again`.

### Journey D — Find alternative

1. User starts `Find alternative` from an existing result or the home template card.
2. An existing result becomes the source hotel automatically; from home, user selects one completed check from history.
3. If no completed checks exist, product explains that a hotel check is required and offers `Check a hotel` without creating a chat, reserving credit or opening paywall.
4. User selects same city/resort area, anywhere in source country or one explicitly identified different destination.
5. User provides maximum price per night for the whole room/accommodation, currency, stay dates and confirms traveler composition for this alternative search only.
6. `Cheaper`, `Similar price` and `More expensive` choices are absent.
7. System shows inherited profile and source-trip criteria; geography, budget inputs and local edits affect only this search.
8. User explicitly confirms launch; only then is one credit reserved and internal candidate search begins.
9. Product returns one fully checked alternative only when it matches confirmed geography and live price evidence confirms it is within budget for exact dates and occupancy, including known mandatory taxes and fees.
10. If sufficient live-price coverage finds no qualifying candidate, system shows `No match found`; if coverage is insufficient, it shows `Price data unavailable`. Both outcomes return the credit.

### Journey E — Zero-credit purchase and continuation

When balance is zero, the saved request opens paywall. After successful purchase the request does not run automatically; the user must confirm that it is still relevant.

## 8. Functional epics, user stories and acceptance criteria

### Epic A — App foundation and navigation

#### APP-01 — Application shell

As a registered user, I want stable navigation between home, trip chats, saved hotels, profile, settings and support.

Acceptance criteria:

- protected application routes are unavailable without a valid session;
- desktop follows history–workspace–preferences structure where relevant;
- tablet and mobile preserve the core task without horizontal overflow;
- keyboard navigation, focus states, semantic labels and screen-reader names are present;
- product UI copy is English.

#### APP-02 — Landing-to-product handoff

As a visitor, I want the landing CTA to take me to the correct access path.

Acceptance criteria:

- CTA routes to sign up, sign in or the authenticated product according to session state;
- landing claims, prices, geography, source wording and examples match current Product Guidelines;
- fictional testimonials or unsupported factual claims are not published as real customer evidence;
- Privacy and Terms destinations exist before public product access.

#### APP-03 — Home template cards

As a registered user, I want to see quick template entry points and understand when a planned option is not yet available.

Acceptance criteria:

- template cards are present on home in the first product version;
- active cards open only their approved product flows;
- selecting `Check hotel` creates a new trip chat with a snapshot of current global profile settings and opens hotel input;
- creating this chat does not reserve or spend a credit; credit flow starts only after hotel identification, confirmation and explicit analysis launch;
- `Compare hotels` is visible without a `Coming soon` badge;
- selecting `Compare hotels` opens a popup with title `Compare hotels is coming soon`, explanatory body and one `Got it` action;
- the interaction does not create a chat, start a check, reserve or spend a credit, or open paywall;
- closing the popup returns keyboard focus to the `Compare hotels` card;
- functional hotel comparison remains unavailable until a separate post-MVP implementation decision.

### Epic B — Access, account and onboarding

#### AUTH-01 — Account entry and eligibility

As a visitor, I want to enter registration or sign-in through the correct account path.

Acceptance criteria:

- new eligible users can open registration without an invite;
- returning users can open sign-in;
- email/password, Google and Facebook are available authentication methods;
- account is bound to the method used at registration; linking or changing method is unavailable in MVP;
- another method returning an already registered canonical email cannot create a second account or grant free credits and directs the user to the original sign-in method;
- users confirm age 18+ before account creation;
- actual account availability follows legal, sanctions, tax and provider restrictions without exposing sensitive eligibility data.

#### AUTH-02 — Registration and account verification

As a new user, I want to create and verify my account through email/password, Google or Facebook before using checks.

Acceptance criteria:

- registration is restricted to users who confirm age 18+;
- email/password requires verification through an email link;
- Google/Facebook can complete verification without a separate email only when the provider supplies a verified email;
- social registration without provider-verified email is not completed and offers another supported method;
- canonical email is unique across all methods;
- registration through a different method with an existing canonical email is blocked without a second account or free-credit grant;
- verification is required before any check can start regardless of authentication method;
- two free credits are granted exactly once after successful verification;
- repeated verification callbacks do not duplicate the grant;
- user can resend an expired or missing verification email.

#### AUTH-03 — Sign in and session recovery

As a returning user, I want to securely regain access to my chats and results.

Acceptance criteria:

- valid user can sign in and sign out;
- returning users sign in through the same method used for registration;
- account linking and authentication-method changes are unavailable in MVP;
- expired session returns user to authentication without losing server-side data;
- email/password users can recover access through verified email; Google/Facebook recovery remains with the provider;
- authentication errors do not reveal whether an unrelated account exists.

#### PROFILE-01 — Minimum traveler profile

As a new user, I want to define defaults that can be reused in every trip chat.

Acceptance criteria:

- profile captures owner name, usual traveler composition, children ages when relevant, pets, general preferences, important and critical criteria;
- Google/Facebook provider name may prefill the owner-name field but requires explicit user confirmation before profile completion;
- provider profile photo is neither imported nor stored, and product avatar uses initials from the confirmed owner name;
- companion names and medical diagnoses are not collected;
- user can skip trip-specific dates and destination;
- onboarding completion enables creation of a trip chat;
- global profile remains editable later.

#### PROFILE-02 — Criteria priorities and conflicts

As a traveler, I want to mark what is normal, important or critical.

Acceptance criteria:

- system supports normal, important and critical priority levels;
- current Product Guidelines limit important criteria to 5 and critical criteria to 3, excluding safety and physical-accessibility requirements;
- exceeding a limit asks the user to reprioritize rather than silently dropping criteria;
- detected conflicts stop analysis and require an explicit user choice;
- AI-suggested criterion has no effect until the user adds it and selects priority.

### Epic C — Trip context and conversation

#### CHAT-01 — Create trip chat from profile snapshot

As a user, I want each trip to start from my global defaults while remaining independently editable.

Acceptance criteria:

- new chat copies current global profile values;
- newly opened chat remains transient and absent from history until a hotel is identified unambiguously or selected by the user from ambiguous matches;
- messages and trip-context changes without an identified hotel do not persist the chat;
- leaving before hotel identification discards the transient chat;
- after hotel identification and before check launch, the chat is persisted as a draft with profile snapshot, any chat-level customization and canonical hotel identity;
- draft history row shows destination as primary label, hotel name as secondary label, a `Draft` badge and last-updated date;
- starting the first check removes the `Draft` badge immediately and history does not replace it with progress, completion, result or error badge;
- local changes affect only that chat;
- completed check snapshots never change after later profile edits;
- multiple independent hotel checks can exist in one chat and each consumes its own credit;
- results appear chronologically without automatic comparison.

#### CHAT-02 — Update existing chat from profile

As a returning user, I want to choose whether an old chat adopts newer global defaults.

Acceptance criteria:

- changed global profile triggers `Update from profile` or `Keep current` choice;
- choosing `Keep current` preserves the existing context;
- `Update from profile` remains available while chat and profile differ;
- explicit chat-level overrides remain higher priority after update;
- update affects only future checks.

#### CHAT-03 — Supported chat language

As a user, I want to communicate in a supported language without changing the product UI language.

Acceptance criteria:

- first meaningful message is detected before retrieval and credit reservation;
- English, German, Spanish, French and Ukrainian continue in the detected language;
- unsupported language produces a short English choice of supported languages;
- check cannot start and credit cannot reserve before language selection;
- chat language changes only future responses and does not translate historical results.

### Epic D — Hotel identification and check start

#### HOTEL-01 — Submit and confirm hotel

As a user, I want to confirm the exact property before spending a credit.

Acceptance criteria:

- input accepts hotel name or link;
- unique match displays official name, city and country for confirmation;
- check starts only after confirmation;
- product does not show booking buttons;
- unsupported geography is explained before credit reservation.

#### HOTEL-02 — Ambiguous hotel

As a user, I want to select the right property when names are ambiguous.

Acceptance criteria:

- system never auto-selects between credible alternatives;
- options include enough identity information to distinguish properties;
- materially different building or room category is clarified when relevant;
- no credit is reserved before selection and confirmation.

#### HOTEL-03 — Hotel not found

As a user, I want to correct an incomplete hotel request.

Acceptance criteria:

- inline state is `Hotel not found`;
- entered text remains available;
- user is prompted for city, country or link;
- similar properties may be offered but are never auto-selected;
- no credit is reserved.

### Epic E — Credits and check lifecycle

#### CREDIT-01 — Immutable credit ledger

As a user, I want every credit operation to be correct and traceable.

Acceptance criteria:

- grants, reserves, spends, releases, returns and adjustments are immutable operations;
- balance is derived from ledger operations;
- every check-related operation links to chat and check IDs;
- idempotency prevents duplicate grant or spend;
- free credits are consumed before paid credits and paid lots use FIFO.

#### CREDIT-02 — Reserve, spend and return

As a user, I want a credit charged only for an eligible result.

Acceptance criteria:

- available credit reserves when analysis actually starts;
- full result spends the reservation;
- accepted preliminary result spends the reservation;
- `Stop check`, `Not enough data`, technical failure and unavailable AI/retrieval return the credit;
- duplicate submission cannot reserve or spend more than once;
- visible balance and ledger status update consistently.

#### CREDIT-03 — Zero-balance gate

As a user with no credits left, I want my request preserved while I purchase more credits.

Acceptance criteria:

- check cannot start without an available credit;
- zero balance opens the approved paywall;
- request and chat context remain saved;
- successful purchase does not start the saved check automatically;
- user must explicitly reconfirm the saved request.

### Epic F — Analysis pipeline and progress

#### CHECK-01 — Background analysis

As a user, I want a long-running check to continue after I leave the page.

Acceptance criteria:

- analysis row persists in chat with queued/running/completed/failed state;
- closing or navigating away does not cancel processing;
- returning user sees current state without duplicate job creation;
- completion creates an in-app notification;
- email notification is sent only after separate consent.

#### CHECK-02 — Deterministic pipeline

As the product, I need reproducible evidence-based results.

Acceptance criteria:

- pipeline snapshots profile, chat, criteria, hotel identity, language and start time;
- retrieval, evidence normalization, claim extraction, validation, scoring and result composition are distinct stages;
- each visible factual claim links to supporting evidence IDs;
- unsupported positive critical claim cannot reach the result;
- provider/model, prompt, pipeline, schema and scoring versions are stored;
- retries and fallback never consume additional credits.

#### CHECK-03 — Preliminary consent

As a user, I want to decide whether limited evidence is worth a credit.

Acceptance criteria:

- consent is requested only after preliminary minimum-data gate is met;
- limitation is explained before the choice;
- `View preliminary result` produces result and spends credit;
- `Stop check` produces no result and returns credit;
- no default choice is applied without user action.

#### CHECK-04 — Failure recovery

As a user, I want failed checks to be understandable and recoverable.

Acceptance criteria:

- technical failure uses `Check failed` in compact row;
- insufficient evidence below preliminary threshold uses `Not enough data` without numeric score;
- explanation avoids raw technical codes;
- credit returns automatically and visibly;
- request can be retried explicitly without automatic duplicate execution.

### Epic G — Result, scoring and evidence

#### RESULT-01 — Compact result row

As a user, I want a concise status that can be expanded for details.

Acceptance criteria:

- compact primary result is `Fits`, `Preliminary result`, `Doesn’t fit` or `Not enough data`;
- collapsed `Doesn’t fit` shows no critical issue count or issue name;
- accordion expansion exposes full result details;
- statuses are communicated by text and not color alone;
- result includes analysis date and checked criterion count.

#### RESULT-02 — Overall score and verdict

As a user, I want the score to match deterministic product rules.

Acceptance criteria:

- full numeric result requires at least 70% weighted coverage, all critical criteria verified and at least 5 evaluated criteria or all active criteria when fewer than 5;
- preliminary numeric result requires at least 50% weighted coverage and 3 evaluated criteria;
- only validated `Known` criteria enter count, coverage and numeric score;
- full displayed score 70 or above gives `Fits`; full displayed score below 70 gives `Doesn’t fit`;
- confirmed critical failure overrides percentage and gives `Doesn’t fit`;
- failed-critical overall percentage is not primary and may appear only as `Other preferences match: X%`;
- overall state precedence is `Doesn’t fit` → `Not enough data` → `Preliminary result` → `Fits`.

#### RESULT-03 — Category scores

As a user, I want four explainable category views without hiding must-haves.

Acceptance criteria:

- fixed categories are `Room & comfort`, `Food & service`, `Location & logistics` and `Facilities & experience`;
- one criterion contributes to one primary category only;
- numeric category requires at least 2 evaluated criteria and 50% category weighted coverage;
- every numeric category shows `Checked X of Y`;
- failed critical criterion produces `Critical issue` instead of primary number;
- unresolved critical criterion produces `Needs verification`;
- eligible remainder may appear only as `Other criteria match: X%` in details;
- precedence is `Critical issue` → `Needs verification` → `Not enough data` → numeric score.

#### RESULT-04 — Score formatting and 100%

As a user, I want visible percentages that do not contradict the verdict.

Acceptance criteria:

- overall, category and secondary scores display whole numbers;
- deterministic half-up rounding occurs before threshold comparison;
- raw score remains stored for audit and analytics;
- 100% is allowed and not capped to 99%;
- 100% is labeled `Match`, never `Perfect match`, `Ideal hotel` or `Guaranteed`;
- `Checked X of Y` and analysis date remain visible.

#### RESULT-05 — Evidence accordion

As a skeptical traveler, I want to inspect why the product reached each conclusion.

Acceptance criteria:

- details expose strengths, risks, unknowns and conflicts;
- every factual conclusion can show source, original excerpt, translation when used, source date and confidence;
- source links exist only as evidence and not booking actions;
- hotel/building/room-category scope is clear;
- all failed, partial and unresolved critical criteria are visible after expansion;
- likely or low-confidence safety signals remain warnings and are not stated as confirmed facts.

### Epic H — Alternative search

#### ALT-01 — Start personalized alternative search

As a user, I want one better-fit hotel within my maximum nightly budget.

Acceptance criteria:

- action begins from a current result or the home template card;
- current result is used as the source hotel automatically;
- home entry with completed checks requires the user to select one source hotel from history;
- home entry without completed checks explains the prerequisite and offers `Check a hotel` without creating a chat, reserving credit or opening paywall;
- user chooses `Same city or resort area`, `Anywhere in this country` or `Different destination` before launch;
- different destination accepts exactly one city, island, resort area or country and requires destination identification/confirmation;
- search never expands beyond confirmed geography automatically, and another destination requires a new launch and credit;
- user provides positive maximum price per night, ISO currency, check-in, check-out and confirmed traveler composition;
- maximum price applies to the whole room/accommodation for the confirmed composition, not per person;
- no mandatory `Rooms` field is shown; initial retrieval seeks one accommodation unit for the full party;
- source-required allocation, impossible single-unit accommodation or explicit separate-room preference triggers a clarification instead of a hidden assumption;
- budget inputs exist only inside the alternative-search request and are not stored in global profile, trip context or the source check;
- relative price-direction choices are absent;
- inherited criteria and local overrides are shown before launch;
- changes affect only the alternative search;
- credit is reserved only after source hotel, confirmed geography, complete budget inputs, inherited criteria and explicit launch confirmation;
- candidate is presented as within budget only when live source confirms price for exact dates and occupancy;
- result shows average nightly total and total stay price including all known mandatory taxes and fees;
- result always shows actual room count and allocation supported by live-price evidence;
- incomplete mandatory-fee coverage produces a visible warning and the amount is not described as a guaranteed final price;
- source-provided user currency is used directly without conversion;
- differing source currency is converted through an authorized current FX source, shown as approximate in the selected currency, and keeps original amount/currency in details;
- FX provider, rate and retrieval timestamp are stored; missing or stale rate cannot confirm an in-budget candidate;
- one credit covers internal candidate search and one fully checked result.

#### ALT-02 — No qualifying alternative

As a user, I want an honest outcome when no hotel meets my constraints.

Acceptance criteria:

- result is `No match found`;
- status is used only when an authorized inventory source explicitly confirms complete processing of the exact geography/date/occupancy/budget query and no candidate passes constraints;
- no fixed hotel-count threshold substitutes for provider completeness;
- explanation limits the conclusion to available sources and never claims that no matching hotel exists in the entire market;
- credit returns automatically;
- system explains which constraints most often excluded candidates;
- system may suggest a higher maximum nightly price, different dates or a criterion change but never applies it automatically;
- system may suggest a separate search in another geography but never changes scope automatically;
- rerun after user changes is a new credit reservation.

#### ALT-03 — Price data unavailable

As a user, I want the product to distinguish missing price evidence from a genuine lack of matching hotels.

Acceptance criteria:

- insufficient live-price coverage produces `Price data unavailable`, never `No match found`;
- capped, truncated or completeness-unknown source response also produces `Price data unavailable`;
- no candidate is presented as within budget;
- credit returns automatically and visibly;
- source hotel, geography, budget, dates, traveler composition and criteria remain saved in the current alternative request;
- `Try again` starts a new attempt and new credit reservation only after explicit user action.

### Epic I — History, saved results and updates

#### HISTORY-01 — Trip chat history

As a user, I want to reopen the exact context and version of past checks.

Acceptance criteria:

- history unit is trip chat;
- chats without an identified hotel do not appear in history, even when the user changed context or sent a message;
- identified but not-yet-checked hotel chats appear in history with destination on the first line, hotel name on the second, a `Draft` badge and last-updated date;
- after a check starts, history removes `Draft` without adding another status badge; check progress and outcome remain inside the chat;
- chat contains context, checks, alternatives, corrections and messages chronologically;
- opening a result returns its immutable version;
- deleted chat content cannot be reopened from credit history;
- user can delete a check/chat and can delete the account.

#### SAVE-01 — Save result version

As a user, I want a saved hotel to point to the result I chose.

Acceptance criteria:

- saved item links to hotel, chat, check and result version;
- rerun does not silently change saved version;
- user may explicitly update saved reference;
- deleting source chat/result deletes the saved reference after warning.

#### UPDATE-01 — Refresh stale result

As a user, I want to understand when an older check may no longer be reliable.

Acceptance criteria:

- analysis date is always visible;
- operational conditions are flagged for refresh after 30 days and stable characteristics after 90 days;
- renovation, owner or brand change invalidates old result regardless of age;
- refresh creates a new version and preserves old version;
- a normal recheck costs one credit according to Product Guidelines.

### Epic J — Trust, corrections, feedback and support

#### TRUST-01 — Report incorrect fact

As a user, I want to report a wrong hotel, outdated source or misinterpreted review.

Acceptance criteria:

- `Report issue` is available beside relevant conclusion or evidence;
- reason supports wrong hotel, outdated information, misinterpreted review and other;
- original result remains visible as `Under review`;
- issue review does not require a new credit;
- correction creates a new result version with change summary;
- material confirmed product error returns a credit automatically.

#### FEEDBACK-01 — Immediate usefulness feedback

As the product team, we want to know whether a completed full result helped the decision.

Acceptance criteria:

- full result offers optional `Did this check help your decision?`;
- answers are `Yes`, `Partly`, `No`;
- response is tied to result version without storing unnecessary chat content;
- dismissal does not block product use.

#### FEEDBACK-02 — Post-trip accuracy feedback

As a traveler, I want to compare the analysis with my actual stay.

Acceptance criteria:

- prompt appears only after known completed dates or explicit `Stayed here`;
- required answer choices are `Accurate`, `Partly accurate`, `Inaccurate`;
- optional criterion selection and comment follow the main answer;
- every `Inaccurate` answer creates a review item;
- email request requires prior separate consent.

#### SUPPORT-01 — Support escalation

As a user, I want a support path for unresolved product, credit and payment issues.

Acceptance criteria:

- request includes relevant account, transaction, check or issue ID without requiring the user to copy technical IDs;
- critical safety, wrong-entity and unsupported-claim incidents can be escalated immediately;
- support action is auditable;
- final tooling and service coverage remain open operational decisions.

### Epic K — Analytics, monitoring and release safety

#### ANALYTICS-01 — Privacy-safe event taxonomy

As the product team, we want to measure the funnel without collecting sensitive content.

Acceptance criteria:

- events cover onboarding, hotel identification, check/result, alternatives, retention, issue reporting and feedback;
- event payloads exclude hotel name, chat text, criterion text, evidence quote, profile content and user comments;
- required technical/product events follow applicable consent rules;
- event names and definitions match `ANALYTICS_MEASUREMENT_PLAN.md`.

#### MONITOR-01 — Operational and trust monitoring

As the product team, we need immediate visibility into critical failures.

Acceptance criteria:

- dashboards cover product/revenue, operations and AI quality/trust;
- immediate alerts exist for wrong hotel, unsupported positive critical claim, incorrect credit handling, incorrect payment credit delivery and known critical safety concern;
- model, prompt, schema and scoring changes are traceable;
- release candidate passes regression set and has no unresolved critical incident.

#### QA-01 — Fixed regression set

As the product team, we need stable scoring and claims across versions.

Acceptance criteria:

- source feasibility begins with a fixed 30-hotel internal set across Europe and Turkey;
- pre-public-launch regression set contains at least 100 scenarios;
- identical snapshots, evidence and scoring version produce identical states and numeric scores;
- new model or pipeline runs in shadow mode before replacement;
- intentional result behavior change creates new version and changelog entry.

### Epic L — Payments

#### PAY-01 — Zero-credit paywall

As a user with no credits, I want to understand available packages without losing my request.

Acceptance criteria:

- paywall opens only after user attempts to start a check with zero credits;
- no per-check cost is shown in the normal check-start flow;
- saved hotel request and chat context remain intact;
- packages are 5/€10, 10/€18, 20/€20, 50/€50 and 100/€100;
- credits do not expire.

#### PAY-02 — Hosted checkout and reconfirmation

As a purchaser, I want credits delivered exactly once without an obsolete check starting automatically.

Acceptance criteria:

- Merchant of Record handles payment details and applicable taxes;
- final EUR amount and tax are visible before confirmation;
- successful payment creates credits exactly once;
- after returning from checkout, saved check does not start automatically;
- user must explicitly reconfirm the request;
- cancelled purchase leaves request intact and adds no credits.

#### PAY-03 — Payment failure and recovery

As a user, I want a safe recovery path when checkout or credit delivery fails.

Acceptance criteria:

- failed payment keeps paywall and request available;
- processing state blocks duplicate payment;
- successful recovery shows `Credits added`;
- missing automatic recovery offers support with transaction ID attached;
- payment and ledger events are idempotent.

## 9. Scope notes and resolved boundaries

### Template cards

Template cards are part of the first product version. For MVP:

- `Check hotel` creates a new trip chat with current global profile settings and opens hotel input without affecting credits;
- `Find alternative` opens its approved source-hotel selection flow;
- `Compare hotels` appears as a visible future-feature entry point and opens only the approved coming-soon popup;
- the popup does not create a chat, start a check, affect credits or open paywall;
- functional hotel comparison remains post-MVP;
- `Create a custom template` is absent from the first-version interface and backlog.

### Current criteria limit

This PRD follows the current authoritative Product Guidelines: maximum 5 important and 3 critical criteria, with safety and physical-accessibility requirements excluded from the limit. If a different critical limit was intended earlier, it requires an explicit product change rather than a silent PRD correction.

## 10. Prioritized implementation backlog

Priority meanings:

- `P0` — required for a safe end-to-end MVP;
- `P1` — required for complete MVP value, trust and retention;
- `P2` — required before public release but may follow the first internal vertical slice;
- `Later` — explicitly outside current MVP.

| Order | Backlog item | Priority | Scope | Dependencies | Completion gate |
| ---: | --- | --- | --- | --- | --- |
| 1 | Confirm backend, database, auth, job and hosting architecture | P0 | MVP | none | Architecture decision recorded |
| 2 | Run source feasibility POC on fixed 30-hotel set | P0 blocker | MVP | source access assessment | Pass/revise/no-go report |
| 3 | Convert Data Model Guidelines into required-field schema and migrations | P0 | MVP | architecture | Schema validation and migration test |
| 4 | Build application shell, routing, responsive layout and home template cards | P0 | MVP | architecture, visual guide | APP-01 and APP-03 accepted at 320/390/768/1440px |
| 5 | Implement registration, verification and session flow | P0 | MVP | auth architecture | AUTH-01–03 accepted |
| 6 | Implement global profile and criterion management | P0 | MVP | schema, auth | PROFILE-01–02 accepted |
| 7 | Implement trip chats, snapshots and profile-update behavior | P0 | MVP | profile, schema | CHAT-01–03 accepted |
| 8 | Implement hotel identity search, ambiguity and confirmation | P0 | MVP | source POC | HOTEL-01–03 accepted; wrong entity = 0 in test set |
| 9 | Implement immutable credit ledger and check reservation | P0 | MVP | schema, auth | CREDIT-01–03 accepted; duplicate grant/spend tests pass |
| 10 | Implement retrieval-to-evidence vertical slice | P0 blocker | MVP | source POC, identity | One supported hotel produces auditable evidence snapshot |
| 11 | Implement claim extraction, confidence and unsupported-claim validation | P0 blocker | MVP | evidence slice | No unsupported positive critical claim in regression tests |
| 12 | Implement deterministic scoring and result-state engine | P0 | MVP | criteria, validated claims | Golden tests cover thresholds, precedence and rounding |
| 13 | Finalize score visualization and implement compact result accordion | P0 | MVP | scoring engine, visual decision | RESULT-01–05 accepted and accessible |
| 14 | Implement background jobs, retry, fallback and notifications | P0 | MVP | pipeline, job architecture | CHECK-01–04 accepted |
| 15 | Implement history, saved results and versioned updates | P1 | MVP | chats, results | HISTORY-01, SAVE-01, UPDATE-01 accepted |
| 16 | Implement Find alternative | P1 | MVP | full hotel check, credits | ALT-01–03 accepted |
| 17 | Implement issue reporting, correction and support handoff | P0 | MVP | results, versions | TRUST-01 and SUPPORT-01 accepted |
| 18 | Implement usefulness and post-trip feedback | P1 | MVP | results, notifications | FEEDBACK-01–02 accepted |
| 19 | Implement privacy-safe analytics events and dashboards | P0 | MVP | all instrumented flows | Event QA and critical alerts pass |
| 20 | Align landing content with current product rules | P0 | MVP | finalized access route | Content compliance review passes |
| 21 | Select and onboard Merchant of Record | P0 | MVP | legal/provider assessment | Provider approved and webhooks tested |
| 22 | Finalize Privacy Policy, Terms, consent and refund texts | P0 | MVP | legal review, MoR | Legal approval recorded |
| 23 | Implement paywall, checkout and payment recovery | P0 | MVP | MoR, legal, ledger | PAY-01–03 accepted |
| 24 | Validate commercial source rights and access | P0 blocker | MVP | source providers | Authorized path documented per source |
| 25 | Complete accessibility, security, abuse and deletion testing | P0 | MVP | complete product flows | No unresolved critical defects |
| 26 | Run production regression and operational rehearsal | P0 | MVP | complete MVP | Release readiness checklist passes |
| 27 | Functional Compare hotels flow | Later | post-MVP | multiple completed checks | Separate PRD required; MVP includes only coming-soon popup |

## 11. Recommended delivery milestones

### M0 — Feasibility and architecture

- architecture decision;
- exact MVP schema draft;
- source feasibility test set and retrieval POC;
- initial scoring golden cases;
- primary and fallback AI/provider direction.

Exit criterion: at least one end-to-end evidence path is technically and legally plausible; no implementation proceeds on the assumption of unavailable source access.

### M1 — Account and profile foundation

- app shell;
- email/password, Google and Facebook registration, authentication and account verification;
- free-credit grant;
- profile and criteria;
- trip chat snapshot.

Exit criterion: verified user can reach a new trip chat with two credits and correct defaults.

### M2 — Core check vertical slice

- hotel identification and confirmation;
- credit reservation;
- background job;
- evidence retrieval and snapshot;
- one deterministic result with source links;
- credit spend/return.

Exit criterion: one supported hotel can complete the full journey without manual database correction.

### M3 — Trustworthy result experience

- all overall and category states;
- compact accordion;
- evidence, conflicts, unknowns and critical issues;
- preliminary consent, no-data and technical failure recovery;
- responsive and accessibility validation.

Exit criterion: golden scenarios render the correct status, score, credit outcome and evidence at all target breakpoints.

### M4 — Complete product value

- history, saved results and updates;
- Find alternative;
- issue reporting and corrections;
- analytics, feedback, alerts and internal operations;
- landing alignment and account handoff.

Exit criterion: operational rehearsal passes and no critical incident remains unresolved.

### M5 — Payments and release readiness

- authorized commercial source paths;
- legal texts and retention decisions;
- Merchant of Record;
- paywall, checkout, receipts and recovery;
- production support coverage.

Exit criterion: all public MVP release gates, legal requirements and payment recovery tests pass.

## 12. Dependencies and blockers

### Blocking before trustworthy analysis

- source feasibility POC and authorized access direction;
- exact hotel entity matching strategy;
- required-field data schema;
- AI provider and fallback technical test;
- unsupported-claim validation implementation;
- score visualization decision for result UI.

### Blocking before public product access

- Privacy Policy, Terms and consent text;
- deletion path;
- critical alerts and support owner;
- regression and credit-recovery tests;
- source-by-source commercial rights;
- Merchant of Record selection and approval;
- legal review of privacy, consumer, tax, cross-border and refund rules;
- payment webhooks, idempotency and receipts;
- exact retention periods;
- support coverage for payment and AI-result disputes.

## 13. Definition of Done for every story

A story is complete only when:

- all acceptance criteria pass;
- loading, empty, error and recovery states are implemented where applicable;
- analytics events contain no prohibited content;
- keyboard and screen-reader behavior is verified;
- mobile, tablet and desktop layouts are checked at 320px, 390px, 768px and 1440px;
- user-visible claims follow evidence and tone rules;
- credit and payment mutations are idempotent;
- tests cover critical business rules;
- documentation and `CHANGELOG.md` are updated when behavior changes;
- no unresolved critical defect remains.

## 14. Open implementation decisions

These items are intentionally not resolved in this PRD:

1. Backend, database, authentication, queue and hosting stack.
2. Concrete 30 hotels for source feasibility test.
3. Authorized source access path for each provider.
4. Required fields, data types and database constraints for every entity.
5. Primary and fallback AI/model providers.
6. Stage-specific timeout values.
7. Final score visualization and exact design tokens.
8. Final legal texts and retention periods.
9. Merchant of Record selection.
10. Exact support tooling and production service coverage.

## 15. Source documents

- `PRODUCT_GUIDELINES.md`
- `USER_FLOW_GUIDELINES.md`
- `DATA_MODEL_GUIDELINES.md`
- `AI_PIPELINE_GUIDELINES.md`
- `SOURCE_FEASIBILITY_PLAN.md`
- `ANALYTICS_MEASUREMENT_PLAN.md`
- `LEGAL_COMPLIANCE_GUIDELINES.md`
- `VISUAL_STYLE_GUIDELINES.md`
- `CHANGELOG.md`
