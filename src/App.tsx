import { useState, useEffect } from 'react'
import hotelPhoto from '@/imports/ChatGPT_Image_Aug_24__2026__03_55_28_PM.png'
import tripIllustration from '@/imports/ChatGPT_Image_Aug_24__2026__03_57_19_PM.png'
import hotelIllustration from '@/imports/ChatGPT_Image_Aug_24__2026__04_00_22_PM_1.png'
import reportIllustration from '@/imports/ChatGPT_Image_Aug_24__2026__04_06_39_PM.png'
import matchScoreIcon from '@/imports/icon_checkmark.png'
import aiBlob from '@/imports/blob-animation.png'
import riskFlagIcon from '@/imports/icon_flag_2_.png'
import insightsIcon from '@/imports/icon_magnifying_glass.png'
import alternativesIcon from '@/imports/icon_arrow_clean.png'
import VisualLab from './VisualLab'
// v2

type Lang = 'en' | 'ua'

// ─── Translations ────────────────────────────────────────────────────────────

const T = {
  en: {
    nav: {
      how: 'How it works',
      features: 'Features',
      pricing: 'Pricing',
      faq: 'FAQ',
      cta: 'Try free',
    },
    hero: {
      eyebrow: 'AI hotel intelligence',
      h1: { l1: 'Does this hotel', l2pre: 'actually ', l2accent: 'fit', l3: 'your trip?' },
      sub: 'fitstay. checks whether the hotel you already love truly works for your specific journey. Before you book.',
      inputPlaceholder: 'Enter a hotel name or link…',
      inputCta: 'Check hotel',
      resultLabel: 'Your fit report includes:',
      bullets: ["Personalized match score", "What you'll love", "Risks to watch for", "Better-fit alternatives"],
    },
    marquee: ['AI-powered', 'Honest', 'Personalized', 'Before you book', 'Your trip, your fit', 'No more guessing', 'Built for real travelers'],
    editorial: {
      l1: 'Most travelers book first.',
      l2: 'Wonder later.',
      l3: { pre: 'fitstay. helps you ', accent: 'know', post: '' },
      l4: 'before you go.',
      sub: 'Stop relying on generic star ratings and sponsored reviews. Get a real analysis built around your trip, your people, and your priorities.',
      cta: 'Try free',
    },
    hiw: {
      label: 'How it works',
      h2: 'Three steps to travel clarity.',
      steps: [
        { n: '01', title: 'Share your trip context', desc: "Who's traveling, when, and what kind of experience you're after. Thirty seconds." },
        { n: '02', title: 'Enter your hotel', desc: "Paste a hotel name or link. We'll recognize it instantly." },
        { n: '03', title: 'Read your fit report', desc: 'Get your match score, honest flags, and smarter alternatives. All in one clear report.' },
      ],
    },
    features: {
      label: 'What you get',
      h2a: 'Not just reviews.',
      h2b: 'Your match.',
      sub: "fitstay. doesn't repeat what Google already shows you. It connects the dots between the hotel and your specific trip.",
      items: [
        { sym: '✦', title: 'Personalized match score', desc: 'A single number showing how well this hotel fits your exact trip context.' },
        { sym: '◈', title: 'Honest risk flags', desc: 'Noise complaints for light sleepers. Pet policies for dog travelers. Things reviews always bury.' },
        { sym: '◉', title: 'Trip-specific insights', desc: 'Not generic pros and cons. Analysis tied to your dates, group size, and purpose.' },
        { sym: '◎', title: 'Smarter alternatives', desc: "When the fit isn't perfect, we surface hotels that score higher for your trip." },
      ],
      card: {
        hotel: 'Marina Bay Sands',
        location: 'Singapore',
        trip: 'Family trip · Jul 2026',
        score: 82,
        checks: ['Excellent breakfast included', 'Pet-friendly across all areas'],
        warns: ['Pool area not fenced (3 kids)', 'Busy lobby during check-in'],
        cta: 'View full report →',
        scoreLabel: 'Match Score',
      },
    },
    testimonials: {
      label: 'What travelers say',
      h2: 'Finally, a tool that gets it.',
      items: [
        { initials: 'SK', name: 'Sarah K.', trip: 'Family trip to Bali', quote: "I'd already picked a beautiful hotel. fitstay. flagged the pool wasn't fenced. No review mentioned it. We switched. Worth every second.", tag: '97% match' },
        { initials: 'MT', name: 'Marco T.', trip: 'Honeymoon in Maldives', quote: 'The match score was 94%. We booked with zero hesitation. The hotel was exactly as described, and we knew why before we landed.', tag: '94% match' },
        { initials: 'YM', name: 'Yeva M.', trip: 'Solo trip to Tokyo', quote: 'As a solo female traveler, I have specific safety priorities. fitstay. addressed every single one in the report. Prepared, not anxious.', tag: '89% match' },
        { initials: 'RL', name: 'Rachel L.', trip: 'Weekend in Barcelona', quote: "I loved the look of a boutique hotel. fitstay. pointed out the neighbourhood gets loud on weekends, exactly when we were going. Switched to a quieter street. Great call.", tag: '88% match' },
        { initials: 'JP', name: 'James P.', trip: 'Business trip to Dubai', quote: 'I travel for work constantly. fitstay. checks all the practical stuff I forget to verify: proximity to the venue, gym hours, early check-in. Saves me an hour every trip.', tag: '91% match' },
        { initials: 'AK', name: 'Anna K.', trip: 'Family trip to Greece', quote: 'We travel with two kids and my mother-in-law. The accessibility check alone made fitstay. worth it. The "sea view" room had 40 steps. We needed ground floor.', tag: '85% match' },
      ],
    },
    pricing: {
      label: 'Pricing',
      h2: 'Try free. Buy more when you need it.',
      sub: 'Every check includes the full report: match score, risk flags, and hotel alternatives. Start with 2 free checks, no card required.',
      features: ['Personalized match score', 'Full fit report', 'Risk flags & warnings', 'Hotel alternatives', 'Trip context analysis', 'Instant results'],
      cta: 'Try free',
      ctaNote: '2 checks included · No credit card',
      creditsLabel: 'Need more checks?',
      creditsPrice: '$9.99',
      creditsUnit: '5 checks',
      creditsNote: 'Credits never expire',
      creditsCheckLabel: 'checks',
      creditsBuyLabel: 'Buy',
      creditsPerCheck: 'per check',
      creditsDiscount: 'off',
    },
    faq: {
      label: 'Questions',
      h2: 'Worth asking.',
      items: [
        { q: 'Do I need to search for a hotel on the platform?', a: "No. You can start with a specific hotel you've already chosen and want to evaluate before booking." },
        { q: 'What do I get after the hotel assessment?', a: "You'll get an assessment of how well the hotel matches your needs and travel scenario. The platform also explains its strengths and weaknesses and highlights potential risks. If relevant alternatives are available, you'll be able to explore those as well." },
        { q: 'Can the platform suggest cheaper or more expensive alternatives?', a: "Yes. If your chosen hotel isn't a great match for your needs, or if there are other suitable options, the platform can suggest cheaper, more expensive, or similar hotels, as well as options that may be better suited to your specific trip." },
        { q: 'Where does the hotel information come from?', a: "The platform analyzes information from various publicly available sources, including reviews, photos, videos, and official hotel pages. AI helps process this information and turn it into a clear assessment based on your needs." },
        { q: 'Does the platform make the decision for me?', a: "No. It helps you understand the important pros, cons, and potential risks, but it doesn't decide which hotel you should book. The final choice is always yours." },
        { q: "Can I use the platform if I'm not very familiar with new technology?", a: "Yes. You don't need to understand how the technology works. Simply provide the hotel you're considering and answer a few straightforward questions about your trip and expectations." },
      ],
    },
    footerCta: {
      h2: 'Your next trip deserves a better start.',
      sub: 'Check your hotel in under a minute. Free to try.',
      cta: 'Check my hotel',
      note: 'No credit card required.',
    },
    footer: {
      tagline: 'AI hotel intelligence for the traveler who plans with purpose.',
      nav: ['How it works', 'Features', 'Pricing', 'FAQ'],
      legal: ['Privacy', 'Terms'],
      copy: '© 2026 fitstay. All rights reserved.',
    },
  },

  ua: {
    nav: {
      how: 'Як це працює',
      features: 'Можливості',
      pricing: 'Ціни',
      faq: 'FAQ',
      cta: 'Спробувати',
    },
    hero: {
      eyebrow: 'AI-аналіз готелів',
      h1: { l1: 'Чи підходить цей готель', l2pre: 'саме ', l2accent: 'вашій', l3: 'поїздці?' },
      sub: 'fitstay. перевіряє, чи обраний вами готель справді підходить для вашої конкретної подорожі. До бронювання.',
      inputPlaceholder: 'Введіть назву готелю або посилання…',
      inputCta: 'Перевірити',
      resultLabel: 'Ваш звіт включає:',
      bullets: ['Персоналізований рейтинг', 'Що вам сподобається', 'На що звернути увагу', 'Кращі альтернативи'],
    },
    marquee: ['AI-аналіз', 'Чесно', 'Персоналізовано', 'До бронювання', 'Ваша поїздка. Ваш вибір.', 'Без здогадів', 'Для справжніх мандрівників'],
    editorial: {
      l1: 'Більшість спочатку бронюють.',
      l2: 'Потім думають.',
      l3: { pre: 'fitstay. допомагає вам ', accent: 'знати', post: '' },
      l4: 'до того, як вирушите.',
      sub: 'Перестаньте покладатися на загальні рейтинги та спонсоровані відгуки. Отримайте реальний аналіз, побудований навколо вашої поїздки, вашої компанії та ваших пріоритетів.',
      cta: 'Спробувати безкоштовно',
    },
    hiw: {
      label: 'Як це працює',
      h2: 'Три кроки до впевненої подорожі.',
      steps: [
        { n: '01', title: 'Розкажіть про поїздку', desc: 'Хто їде, коли, який вид відпочинку потрібен. Тридцять секунд.' },
        { n: '02', title: 'Вкажіть готель', desc: 'Введіть назву або посилання. Ми розпізнаємо його миттєво.' },
        { n: '03', title: 'Читайте звіт відповідності', desc: 'Отримайте рейтинг, чесні попередження та кращі альтернативи. Все в одному місці.' },
      ],
    },
    features: {
      label: 'Що ви отримуєте',
      h2a: 'Не просто відгуки.',
      h2b: 'Ваш збіг.',
      sub: "fitstay. не повторює те, що вже показує Google. Ми з'єднуємо готель із вашою конкретною поїздкою.",
      items: [
        { sym: '✦', title: 'Персоналізований рейтинг', desc: 'Одне число, що показує, наскільки готель підходить для вашої поїздки.' },
        { sym: '◈', title: 'Чесні попередження', desc: 'Шум для чутливих. Правила щодо тварин. Те, що ховається у відгуках.' },
        { sym: '◉', title: 'Аналіз під вашу поїздку', desc: "Аналіз прив'язаний до ваших дат і мети, а не загальні плюси і мінуси." },
        { sym: '◎', title: 'Кращі альтернативи', desc: 'Коли збіг неідеальний, ми показуємо готелі з вищим рейтингом для вас.' },
      ],
      card: {
        hotel: 'Marina Bay Sands',
        location: 'Сінгапур',
        trip: 'Сімейна поїздка · Лип 2026',
        score: 82,
        checks: ['Відмінний сніданок включено', 'Дружній до домашніх тварин'],
        warns: ['Басейн без огорожі (3 дітей)', 'Черги на реєстрацію'],
        cta: 'Переглянути звіт →',
        scoreLabel: 'Рейтинг збігу',
      },
    },
    testimonials: {
      label: 'Що кажуть мандрівники',
      h2: 'Нарешті інструмент, який розуміє.',
      items: [
        { initials: 'СК', name: 'Сара К.', trip: 'Сімейна поїздка на Балі', quote: 'Я вже обрала чудовий готель. fitstay. попередив, що басейн без огорожі. Жоден відгук не згадував. Ми змінили. Варто було.', tag: '97% збіг' },
        { initials: 'МТ', name: 'Марко Т.', trip: 'Медовий місяць на Мальдівах', quote: 'Рейтинг збігу 94%. Ми забронювали без вагань. Готель виявився саме таким, і ми знали це ще до прильоту.', tag: '94% збіг' },
        { initials: 'ЄМ', name: 'Єва М.', trip: 'Соло до Токіо', quote: 'Як мандрівниця-соло, у мене конкретні пріоритети безпеки. fitstay. розглянув кожен із них. Я відчула впевненість, а не тривогу.', tag: '89% збіг' },
        { initials: 'РЛ', name: 'Рейчел Л.', trip: 'Вихідні в Барселоні', quote: 'Я знайшла бутик-готель, який дуже сподобався. fitstay. попередив, що квартал шумний у вихідні, саме тоді ми й їхали. Обрали тихішу вулицю. Правильне рішення.', tag: '88% збіг' },
        { initials: 'ДП', name: 'Джеймс П.', trip: 'Відрядження в Дубай', quote: 'Я постійно їжджу у відрядження. fitstay. перевіряє все практичне, про що я забуваю: відстань до місця зустрічі, тренажерний зал, ранній заїзд. Економить годину щоразу.', tag: '91% збіг' },
        { initials: 'АК', name: 'Анна К.', trip: 'Сімейна поїздка до Греції', quote: 'Ми подорожуємо з двома дітьми та свекрухою. Перевірка доступності виправдала fitstay. Виявилося, що «номер із видом на море» передбачав 40 сходинок. Нам потрібен був перший поверх.', tag: '85% збіг' },
      ],
    },
    pricing: {
      label: 'Ціни',
      h2: 'Спробуйте безкоштовно. Купуйте більше коли потрібно.',
      sub: 'Кожна перевірка включає повний звіт: рейтинг збігу, попередження та альтернативи. Починайте з 2 безкоштовних перевірок, без картки.',
      features: ['Персоналізований рейтинг збігу', 'Повний звіт відповідності', 'Попередження та ризики', 'Альтернативні готелі', 'Аналіз контексту поїздки', 'Миттєвий результат'],
      cta: 'Спробувати безкоштовно',
      ctaNote: '2 перевірки включено · Без кредитної картки',
      creditsLabel: 'Потрібно більше перевірок?',
      creditsNote: 'Кредити не мають терміну дії',
      creditsCheckLabel: 'перевірок',
      creditsBuyLabel: 'Придбати',
      creditsPerCheck: 'за перевірку',
      creditsDiscount: 'знижка',
    },
    faq: {
      label: 'Питання',
      h2: 'Варті уваги.',
      items: [
        { q: 'Чи потрібно шукати готель на платформі?', a: "Ні. Ви можете одразу вказати конкретний готель, який уже розглядаєте, і оцінити його перед бронюванням." },
        { q: 'Що я отримаю після оцінки готелю?', a: "Ви отримаєте оцінку того, наскільки готель відповідає вашим потребам і сценарію подорожі. Платформа також пояснить його сильні та слабкі сторони і виділить потенційні ризики. За наявності релевантних альтернатив ви зможете їх переглянути." },
        { q: 'Чи може платформа запропонувати дешевші або дорожчі альтернативи?', a: "Так. Якщо обраний готель не дуже підходить для ваших потреб або є інші відповідні варіанти, платформа може запропонувати дешевші, дорожчі чи схожі готелі, а також варіанти, що краще відповідають вашій конкретній поїздці." },
        { q: 'Звідки береться інформація про готель?', a: "Платформа аналізує інформацію з різних публічно доступних джерел: відгуки, фото, відео та офіційні сторінки готелів. ШІ допомагає опрацювати цю інформацію і перетворити її на зрозумілу оцінку відповідно до ваших потреб." },
        { q: 'Чи приймає платформа рішення замість мене?', a: "Ні. Вона допомагає зрозуміти важливі плюси, мінуси та потенційні ризики, але не вирішує, який готель вам бронювати. Фінальний вибір завжди за вами." },
        { q: 'Чи можу я користуватися платформою, якщо не дуже знайомий з технологіями?', a: "Так. Вам не потрібно розуміти, як працює технологія. Просто вкажіть готель, який розглядаєте, і дайте відповідь на кілька простих запитань про вашу поїздку та очікування." },
      ],
    },
    footerCta: {
      h2: 'Ваша наступна поїздка заслуговує кращого початку.',
      sub: 'Перевірте готель менш ніж за хвилину. Безкоштовно.',
      cta: 'Перевірити готель',
      note: 'Картка не потрібна.',
    },
    footer: {
      tagline: 'AI-аналіз готелів для мандрівника, який планує свідомо.',
      nav: ['Як це працює', 'Можливості', 'Ціни', 'FAQ'],
      legal: ['Конфіденційність', 'Умови'],
      copy: '© 2026 fitstay. Всі права захищено.',
    },
  },
}

type Tx = typeof T['en']

// ─── Shared primitives ────────────────────────────────────────────────────────

function Logo() {
  return (
    <span className="font-sans font-semibold text-[17px] tracking-[-0.02em] text-ink select-none">
      fitstay<span className="text-coral">.</span>
    </span>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-full border border-ink/15 overflow-hidden text-[12px] sm:text-[13px] font-medium font-sans">
      {(['en', 'ua'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 sm:px-3 py-1.5 transition-colors duration-150 uppercase tracking-wider ${
            lang === l
              ? 'bg-ink text-white'
              : 'text-ink/45 hover:text-ink/75'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav({ lang, setLang, tx, onAuth }: { lang: Lang; setLang: (l: Lang) => void; tx: Tx; onAuth: () => void }) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-ivory/88 backdrop-blur-md border-b border-ink/[0.07] px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto h-[62px] flex items-center justify-between gap-2 sm:gap-6">
        <Logo />
        <div className="hidden lg:flex items-center gap-7 text-[13.5px] text-ink/50 font-sans">
          <a href="#how" className="hover:text-ink transition-colors">{tx.nav.how}</a>
          <a href="#features" className="hover:text-ink transition-colors">{tx.nav.features}</a>
          <a href="#pricing" className="hover:text-ink transition-colors">{tx.nav.pricing}</a>
          <a href="#faq" className="hover:text-ink transition-colors">{tx.nav.faq}</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <button
            onClick={onAuth}
            className="bg-coral text-white text-[12.5px] sm:text-[13.5px] font-semibold font-sans px-3 sm:px-4 py-2 rounded-full hover:bg-[#e54d49] transition-colors whitespace-nowrap"
          >
            {tx.nav.cta}
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ tx, onAuth }: { tx: Tx; onAuth: () => void }) {
  const h = tx.hero
  return (
    <section className="pt-28 sm:pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px] gap-10 lg:gap-14 items-start min-w-0">

          {/* Left column */}
          <div className="min-w-0">
            <h1 className="font-display italic text-ink leading-[0.91] tracking-[-0.01em] mb-8"
              style={{ fontSize: 'clamp(46px, 6.8vw, 86px)' }}>
              {h.h1.l1}<br />
              {h.h1.l2pre}<span className="text-coral">{h.h1.l2accent}</span><br />
              {h.h1.l3}
            </h1>

            <p className="text-ink/55 font-sans leading-relaxed mb-10 max-w-[420px]"
              style={{ fontSize: 'clamp(15px, 1.5vw, 17px)' }}>
              {h.sub}
            </p>

            {/* Input */}
            <div className="bg-white rounded-3xl sm:rounded-full p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 shadow-sm border border-ink/8 max-w-[540px]">
              <input
                type="text"
                placeholder={h.inputPlaceholder}
                className="w-full sm:flex-1 px-4 sm:px-6 h-12 bg-transparent text-ink placeholder:text-ink/28 text-[15px] font-sans outline-none min-w-0"
              />
              <button onClick={onAuth} className="w-full sm:w-auto bg-coral text-white text-[14px] font-semibold font-sans px-7 h-12 rounded-full hover:bg-[#e54d49] transition-colors whitespace-nowrap flex-shrink-0">
                {h.inputCta}
              </button>
            </div>

            {/* Result bullets */}
            <p className="text-[12px] text-ink/35 uppercase tracking-[0.12em] font-sans mb-3">{h.resultLabel}</p>
            <div className="flex flex-wrap gap-2">
              {h.bullets.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 text-[13px] text-ink/65 font-sans bg-white/70 px-3 py-1.5 rounded-full border border-ink/[0.09]">
                  <span className="text-coral text-[12px]">✦</span>
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right column: hero image */}
          <div className="relative lg:mt-2 min-w-0">
            <div className="relative rounded-[26px] overflow-hidden bg-sky aspect-[4/5]">
              <img
                src={hotelPhoto}
                alt="Hotel"
                className="w-full h-full object-cover"
              />
              {/* Overlay gradient at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/60 to-transparent" />
              {/* Score badge */}
              <div className="absolute bottom-5 left-5">
                <div className="bg-ink/80 backdrop-blur-sm text-white rounded-2xl px-4 py-3 inline-block">
                  <div className="text-[12px] text-white/70 uppercase tracking-widest font-sans mb-1">Match score</div>
                  <div className="text-[26px] font-semibold font-sans leading-none">93<span className="text-[16px] text-white/70">%</span></div>
                </div>
              </div>
              {/* Trip tag */}
              <div className="absolute bottom-5 right-5">
                <div className="bg-lime text-ink text-[12px] font-semibold font-sans rounded-xl px-3 py-2">
                  Family trip ✓
                </div>
              </div>
            </div>
            {/* Decorative blob */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-blush opacity-70 -z-10" />
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function Marquee({ tx }: { tx: Tx }) {
  const doubled = [...tx.marquee, ...tx.marquee, ...tx.marquee, ...tx.marquee]
  return (
    <div className="bg-ink overflow-hidden py-4 border-y border-white/5">
      <div className="animate-marquee flex whitespace-nowrap">
        {doubled.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-5 px-6 text-[12px] font-semibold font-sans text-white/50 uppercase tracking-[0.14em]">
            {p}
            <span className="text-coral text-base">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Editorial black block ────────────────────────────────────────────────────

function Editorial({ tx, onAuth }: { tx: Tx; onAuth: () => void }) {
  const e = tx.editorial
  return (
    <section className="bg-ink px-6 lg:px-10 py-36 lg:py-52">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <h2 className="font-display italic text-white leading-[0.93] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(38px, 5.2vw, 72px)' }}>
            {e.l3.pre}<span className="text-lime">{e.l3.accent}</span>{e.l3.post}<br />
            {e.l4}
          </h2>
        </div>
        <div className="lg:pl-10">
          <p className="text-white/70 font-sans font-medium mb-4 max-w-sm"
            style={{ fontSize: 'clamp(14px, 1.4vw, 17px)' }}>
            {e.l1} {e.l2}
          </p>
          <p className="text-white/45 font-sans leading-relaxed mb-10 max-w-sm"
            style={{ fontSize: 'clamp(14px, 1.4vw, 17px)' }}>
            {e.sub}
          </p>
          <button
            onClick={onAuth}
            className="inline-flex items-center gap-2 bg-coral text-white font-semibold font-sans px-6 h-12 rounded-full hover:bg-[#e54d49] transition-colors"
          >
            {e.cta}
            <span className="text-sm">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks({ tx }: { tx: Tx }) {
  const hiw = tx.hiw
  return (
    <section id="how" className="px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 lg:mb-20">
          <span className="text-[12px] text-ink/35 uppercase tracking-[0.14em] font-sans">{hiw.label}</span>
          <h2 className="font-display italic text-ink leading-tight mt-3"
            style={{ fontSize: 'clamp(34px, 4.8vw, 62px)' }}>
            {hiw.h2}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10 lg:gap-12">
          {hiw.steps.map((step, i) => (
            <div key={step.n}>
              <div className="mb-3">
                {i === 0 && (
                  <img src={tripIllustration} alt="Share your trip context" className="w-[180px] h-[180px] object-contain" />
                )}
                {i === 1 && (
                  <img src={hotelIllustration} alt="Enter your hotel" className="w-[180px] h-[180px] object-contain" />
                )}
                {i === 2 && (
                  <img src={reportIllustration} alt="Read your fit report" className="w-[180px] h-[180px] object-contain" />
                )}
              </div>
              <div className="w-8 h-px bg-coral mb-5" />
              <h3 className="font-semibold font-sans text-ink text-[17px] mb-3">{step.title}</h3>
              <p className="text-ink/50 font-sans leading-relaxed text-[14.5px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features({ tx, onAuth }: { tx: Tx; onAuth: () => void }) {
  const f = tx.features
  return (
    <section id="features" className="px-6 lg:px-10 py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 lg:mb-20">
          <span className="text-[12px] text-ink/35 uppercase tracking-[0.14em] font-sans">{f.label}</span>
          <h2 className="font-display italic text-ink leading-tight mt-3"
            style={{ fontSize: 'clamp(34px, 4.8vw, 62px)' }}>
            {f.h2a}<br />
            <span className="text-coral">{f.h2b}</span>
          </h2>
          <p className="text-ink/50 font-sans leading-relaxed mt-4 max-w-lg text-[15px]">{f.sub}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Product UI simulation card */}
          <div className="bg-ivory rounded-3xl p-6 lg:p-8 order-2 lg:order-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-ink/[0.06]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="font-semibold font-sans text-ink text-[16px] leading-tight">{f.card.hotel}</div>
                  <div className="text-[13px] text-ink/45 font-sans mt-0.5">{f.card.location}</div>
                </div>
                <span className="text-[12px] bg-ivory text-ink/55 font-sans px-3 py-1.5 rounded-full flex-shrink-0">{f.card.trip}</span>
              </div>
              {/* Score bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[13px] font-medium font-sans text-ink">{f.card.scoreLabel}</span>
                  <span className="text-[22px] font-bold font-sans text-coral leading-none">{f.card.score}%</span>
                </div>
                <div className="h-2 bg-ivory-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-full transition-all"
                    style={{ width: `${f.card.score}%` }}
                  />
                </div>
              </div>
              {/* Checks */}
              <div className="space-y-2.5 mb-3">
                {f.card.checks.map((c) => (
                  <div key={c} className="flex items-center gap-3 text-[13px]">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-ink text-[12px] font-bold flex-shrink-0" style={{backgroundColor:'#C8E830'}}>✓</span>
                    <span className="text-ink/70 font-sans">{c}</span>
                  </div>
                ))}
              </div>
              {/* Warnings */}
              <div className="space-y-2.5 mb-6">
                {f.card.warns.map((w) => (
                  <div key={w} className="flex items-center gap-3 text-[13px]">
                    <span className="w-5 h-5 rounded-full bg-blush flex items-center justify-center text-ink text-[12px] font-semibold flex-shrink-0">!</span>
                    <span className="text-ink/70 font-sans">{w}</span>
                  </div>
                ))}
              </div>
              <button onClick={onAuth} className="w-full text-center text-[13px] text-coral font-semibold font-sans h-12 border border-coral/25 rounded-full hover:bg-coral/5 transition-colors">
                {f.card.cta}
              </button>
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-9 order-1 lg:order-2 lg:pt-12">
            {f.items.map((item, i) => (
              <div key={item.title} className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-ivory flex items-center justify-center text-coral flex-shrink-0 text-base font-medium overflow-hidden">
                  {i === 0
                    ? <img src={matchScoreIcon} alt="" className="w-6 h-6 object-contain" />
                    : i === 1
                    ? <img src={riskFlagIcon} alt="" className="w-6 h-6 object-contain" />
                    : i === 2
                    ? <img src={insightsIcon} alt="" className="w-6 h-6 object-contain" />
                    : i === 3
                    ? <img src={alternativesIcon} alt="" className="w-6 h-6 object-contain" />
                    : item.sym}
                </div>
                <div>
                  <h3 className="font-semibold font-sans text-ink text-[15.5px] mb-1.5">{item.title}</h3>
                  <p className="text-ink/50 font-sans leading-relaxed text-[14px]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials({ tx }: { tx: Tx }) {
  const t = tx.testimonials
  return (
    <section className="py-24 lg:py-32">
      <div className="px-6 lg:px-10 mb-16 max-w-7xl mx-auto">
        <span className="text-[12px] text-ink/35 uppercase tracking-[0.14em] font-sans">{t.label}</span>
        <h2 className="font-display italic text-ink leading-tight mt-3"
          style={{ fontSize: 'clamp(34px, 4.8vw, 62px)' }}>
          {t.h2}
        </h2>
      </div>
      <div className="overflow-x-auto scrollbar-none pl-6 lg:pl-10 pr-6 lg:pr-10">
        <div className="flex gap-5 w-max">
          {t.items.map((item, i) => {
            const isDark = i === 1
            const isAccent = i === 5
            return (
            <div
              key={item.name}
              className={`w-[320px] lg:w-[360px] flex-shrink-0 rounded-3xl p-7 flex flex-col gap-6 ${isDark ? 'bg-ink text-white' : isAccent ? 'bg-coral text-white' : 'bg-white'}`}
            >
              <blockquote
                className={`font-sans leading-relaxed flex-1 text-[14.5px] ${isDark ? 'text-white/70' : isAccent ? 'text-white/80' : 'text-ink/65'}`}
              >
                "{item.quote}"
              </blockquote>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold font-sans flex-shrink-0 ${isDark ? 'bg-white/10 text-white' : isAccent ? 'bg-white/20 text-white' : 'bg-coral/12 text-coral'}`}>
                    {item.initials}
                  </div>
                  <div>
                    <div className={`text-[13px] font-semibold font-sans ${isDark || isAccent ? 'text-white' : 'text-ink'}`}>{item.name}</div>
                    <div className={`text-[12px] font-sans ${isDark ? 'text-white/40' : isAccent ? 'text-white/50' : 'text-ink/40'}`}>{item.trip}</div>
                  </div>
                </div>
                <span className={`text-[12px] font-semibold font-sans px-2.5 py-1 rounded-full whitespace-nowrap ${isAccent ? 'bg-white/20 text-white' : 'bg-lime text-ink'}`}>
                  {item.tag}
                </span>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const CREDIT_PACKS = [
  { checks: 5,   price: 10,  discount: 0 },
  { checks: 10,  price: 18,  discount: 10 },
  { checks: 20,  price: 30,  discount: 25 },
  { checks: 50,  price: 50,  discount: 50 },
  { checks: 100, price: 100, discount: 50 },
]

function Pricing({ tx, onAuth }: { tx: Tx; onAuth: () => void }) {
  const p = tx.pricing
  const [packIdx, setPackIdx] = useState(0)
  const [dropOpen, setDropOpen] = useState(false)
  const pack = CREDIT_PACKS[packIdx]
  const perCheck = (pack.price / pack.checks).toFixed(2)

  return (
    <section id="pricing" className="bg-ink px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — what you get */}
          <div>
            <span className="text-[12px] text-white/30 uppercase tracking-[0.14em] font-sans">{p.label}</span>
            <h2 className="font-display italic text-white leading-tight mt-3 mb-5"
              style={{ fontSize: 'clamp(34px, 4.2vw, 58px)' }}>
              {p.h2}
            </h2>
            <p className="text-white/45 font-sans leading-relaxed mb-10 max-w-md"
              style={{ fontSize: 'clamp(14px, 1.3vw, 16px)' }}>
              {p.sub}
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-10">
              {p.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2.5 text-[13.5px] font-sans text-white/65">
                  <span className="text-white/35 font-semibold text-[13px] flex-shrink-0">✓</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button onClick={onAuth} className="h-12 bg-coral text-white text-[13.5px] font-bold font-sans px-8 rounded-full hover:bg-[#e54d49] transition-colors">
              {p.cta}
            </button>
          </div>

          {/* Right — credits selector */}
          <div className="lg:pt-16">
            <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-8">
              <p className="text-white/70 text-[13px] font-sans mb-6">{p.creditsLabel}</p>

              {/* Custom dropdown */}
              <div className="relative mb-6">
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="w-full h-12 bg-white/[0.07] border border-white/15 text-white text-[14px] font-sans font-medium rounded-full px-5 flex items-center justify-between cursor-pointer hover:border-white/25 transition-colors"
                >
                  <span>{pack.checks} {p.creditsCheckLabel}</span>
                  <span className={`text-white/40 text-[12px] transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {dropOpen && (
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#2A2522] border border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl">
                    {CREDIT_PACKS.map((pk, i) => (
                      <button
                        key={i}
                        onClick={() => { setPackIdx(i); setDropOpen(false) }}
                        className={`w-full px-5 py-3 text-left text-[14px] font-sans flex items-center justify-between hover:bg-white/8 transition-colors ${i === packIdx ? 'text-white' : 'text-white/55'}`}
                      >
                        <span>{pk.checks} {p.creditsCheckLabel}</span>
                        {i === packIdx && <span className="text-white/40 text-[12px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Price display */}
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-[52px] font-bold font-sans text-white leading-none">${pack.price}</span>
                {pack.discount > 0 && (
                  <span className="text-lime text-[13px] font-semibold font-sans">{pack.discount}% off</span>
                )}
              </div>
              <p className="text-white/55 text-[12px] font-sans mb-1">${perCheck} {p.creditsPerCheck}</p>
              <p className="text-white/45 text-[12px] font-sans mb-0">{p.creditsNote}</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-ink/[0.09]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 py-6 text-left group"
      >
        <span className="font-medium font-sans text-ink text-[15px] group-hover:text-coral transition-colors">{q}</span>
        <span
          className={`text-coral text-xl flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : 'rotate-0'}`}
        >+</span>
      </button>
      {open && (
        <p className="pb-6 text-ink/55 font-sans leading-relaxed text-[14px] pr-10">{a}</p>
      )}
    </div>
  )
}

function Faq({ tx }: { tx: Tx }) {
  const f = tx.faq
  return (
    <section id="faq" className="bg-white px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[300px_1fr] xl:grid-cols-[360px_1fr] gap-16 items-start">
          <div className="lg:sticky lg:top-28">
            <span className="text-[12px] text-ink/35 uppercase tracking-[0.14em] font-sans">{f.label}</span>
            <h2 className="font-display italic text-ink leading-tight mt-3"
              style={{ fontSize: 'clamp(34px, 4.8vw, 62px)' }}>
              {f.h2}
            </h2>
          </div>
          <div>
            {f.items.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer CTA ───────────────────────────────────────────────────────────────

function FooterCta({ tx, onAuth }: { tx: Tx; onAuth: () => void }) {
  const fc = tx.footerCta
  return (
    <section className="px-6 lg:px-10 py-28 lg:py-36">
      <div className="max-w-4xl mx-auto text-center">
        <img src={aiBlob} alt="" className="w-48 h-48 object-contain mx-auto mb-6" />
        <h2 className="font-display italic text-ink leading-[0.93] tracking-[-0.01em] mb-6"
          style={{ fontSize: 'clamp(38px, 6vw, 80px)' }}>
          {fc.h2}
        </h2>
        <p className="text-ink/50 font-sans text-[16px] mb-10">{fc.sub}</p>
        <button
          onClick={onAuth}
          className="inline-flex items-center gap-2 bg-coral text-white font-bold font-sans px-8 h-12 rounded-full text-[15px] hover:bg-[#e54d49] transition-colors shadow-sm"
        >
          {fc.cta}
          <span>→</span>
        </button>
        <p className="mt-5 text-[12.5px] font-sans text-ink/30">{fc.note}</p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ tx }: { tx: Tx }) {
  const f = tx.footer
  return (
    <footer className="border-t border-ink/[0.08] px-6 lg:px-10 py-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Logo />
          <p className="text-[12.5px] font-sans text-ink/38 mt-1 max-w-xs">{f.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[13px] font-sans text-ink/45">
          {f.nav.map((link) => (
            <a key={link} href="#" className="hover:text-ink transition-colors">{link}</a>
          ))}
          <span className="w-px h-3.5 bg-ink/15 hidden md:block" />
          {f.legal.map((link) => (
            <a key={link} href="#" className="hover:text-ink transition-colors">{link}</a>
          ))}
        </div>
        <div className="text-[12px] font-sans text-ink/28">{f.copy}</div>
      </div>
    </footer>
  )
}

// ─── Auth page ────────────────────────────────────────────────────────────────

type AuthMode = 'login' | 'register'

function AuthPage({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const isUA = lang === 'ua'
  const copy = {
    login: {
      title: isUA ? 'Увійти до fitstay.' : 'Sign in to fitstay.',
      sub: isUA ? 'Продовжте — ваш перший аналіз готелю безкоштовний.' : 'Continue — your first hotel analysis is free.',
      google: isUA ? 'Увійти через Google' : 'Continue with Google',
      facebook: isUA ? 'Увійти через Facebook' : 'Continue with Facebook',
      or: isUA ? 'або через email' : 'or with email',
      emailLabel: 'Email',
      emailPlaceholder: isUA ? 'ваш@email.com' : 'your@email.com',
      passwordLabel: isUA ? 'Пароль' : 'Password',
      passwordPlaceholder: isUA ? 'Ваш пароль' : 'Your password',
      submit: isUA ? 'Увійти' : 'Sign in',
      switchText: isUA ? 'Ще немає акаунту?' : "Don't have an account?",
      switchCta: isUA ? 'Зареєструватися' : 'Create one',
      forgot: isUA ? 'Забули пароль?' : 'Forgot password?',
    },
    register: {
      title: isUA ? 'Створити акаунт' : 'Create your account',
      sub: isUA ? 'Почніть безкоштовно — 2 перевірки готелів включено.' : 'Start free — 2 hotel checks included.',
      google: isUA ? 'Зареєструватися через Google' : 'Continue with Google',
      facebook: isUA ? 'Зареєструватися через Facebook' : 'Continue with Facebook',
      or: isUA ? 'або через email' : 'or with email',
      nameLabel: isUA ? "Ім'я" : 'Name',
      namePlaceholder: isUA ? "Ваше ім'я" : 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: isUA ? 'ваш@email.com' : 'your@email.com',
      passwordLabel: isUA ? 'Пароль' : 'Password',
      passwordPlaceholder: isUA ? 'Мінімум 8 символів' : 'At least 8 characters',
      submit: isUA ? 'Створити акаунт' : 'Create account',
      switchText: isUA ? 'Вже є акаунт?' : 'Already have an account?',
      switchCta: isUA ? 'Увійти' : 'Sign in',
      terms: isUA
        ? 'Реєструючись, ви погоджуєтесь з умовами використання та політикою конфіденційності.'
        : 'By creating an account you agree to our Terms of Service and Privacy Policy.',
    },
  }
  const c = mode === 'login' ? copy.login : copy.register

  const SocialBtn = ({ icon, label }: { icon: 'google' | 'facebook'; label: string }) => (
    <button className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-ink/10 rounded-full text-[14px] font-medium font-sans text-ink hover:bg-ivory transition-colors">
      {icon === 'google' && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      )}
      {icon === 'facebook' && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="18" height="18" rx="9" fill="#1877F2"/>
          <path d="M12.5 9H10.5V15H8V9H6.5V7H8V5.5C8 4.12 8.88 3 10.5 3H12.5V5H11C10.72 5 10.5 5.22 10.5 5.5V7H12.5L12.5 9Z" fill="white"/>
        </svg>
      )}
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-ivory font-sans flex flex-col relative">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-5 left-4 sm:left-6 inline-flex items-center gap-2 text-[13px] font-medium text-ink/55 hover:text-ink transition-colors"
        aria-label={isUA ? 'Повернутися на головну' : 'Back to home'}
      >
        <span aria-hidden="true">←</span>
        <Logo />
      </button>
      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          {/* Blob */}
          <img src={aiBlob} alt="" className="w-24 h-24 object-contain mb-8 mx-auto" />

          <h1 className="font-display italic text-ink leading-tight mb-6 text-center" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>
            {c.title}
          </h1>

          {/* Social buttons */}
          <div className="space-y-3 mb-6">
            <SocialBtn icon="google" label={c.google} />
            <SocialBtn icon="facebook" label={c.facebook} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-ink/10" />
            <span className="text-[12px] text-ink/35 font-sans">{c.or}</span>
            <div className="flex-1 h-px bg-ink/10" />
          </div>

          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-[12px] font-medium font-sans text-ink/50 mb-1.5">{'nameLabel' in c ? c.nameLabel : ''}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={'namePlaceholder' in c ? c.namePlaceholder : ''}
                  className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-[12px] font-medium font-sans text-ink/50 mb-1.5">{c.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={c.emailPlaceholder}
                className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-medium font-sans text-ink/50">{c.passwordLabel}</label>
                {mode === 'login' && (
                  <button type="button" className="text-[12px] font-sans text-ink/40 hover:text-ink transition-colors">
                    {'forgot' in c ? c.forgot : ''}
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={c.passwordPlaceholder}
                className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-coral text-white text-[14px] font-bold font-sans rounded-full hover:bg-[#e54d49] transition-colors mt-1"
            >
              {c.submit}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-[13px] font-sans text-ink/40 mt-6">
            {c.switchText}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-ink font-medium hover:text-coral transition-colors">
              {c.switchCta}
            </button>
          </p>

          {mode === 'register' && (
            <p className="text-center text-[12px] font-sans text-ink/30 mt-5 leading-relaxed">
              {'terms' in c ? c.terms : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Page = 'landing' | 'auth'

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [page, setPage] = useState<Page>('landing')
  const tx = T[lang]

  if (window.location.pathname.replace(/\/$/, '') === '/design-lab') {
    return <VisualLab />
  }

  const goAuth = () => { setPage('auth'); window.scrollTo(0, 0) }
  const goBack = () => { setPage('landing'); window.scrollTo(0, 0) }

  if (page === 'auth') {
    return <AuthPage lang={lang} onBack={goBack} />
  }

  return (
    <div className="bg-ivory text-ink min-h-screen font-sans">
      <Nav lang={lang} setLang={setLang} tx={tx} onAuth={goAuth} />
      <main>
        <Hero tx={tx} onAuth={goAuth} />
        <Marquee tx={tx} />
        <Editorial tx={tx} onAuth={goAuth} />
        <HowItWorks tx={tx} />
        <Features tx={tx} onAuth={goAuth} />
        <Testimonials tx={tx} />
        <Pricing tx={tx} onAuth={goAuth} />
        <Faq tx={tx} />
        <FooterCta tx={tx} onAuth={goAuth} />
      </main>
      <Footer tx={tx} />
    </div>
  )
}
