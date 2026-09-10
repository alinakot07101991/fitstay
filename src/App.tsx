import { useState, useEffect, useRef } from 'react'
import {
  applyActionCode,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthProvider,
  type User,
} from 'firebase/auth'
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
import { auth } from './firebase'
import { emailForSignInKey, pendingNameKey } from './emailLinkAuth'
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

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.702-1.567 2.684-3.876 2.684-6.616Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.179l-2.91-2.259c-.805.54-1.834.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.579c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579Z" />
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="#1877F2" />
      <path fill="#fff" d="M12.5 9.5h-2.18V17a8.2 8.2 0 0 1-2.64 0V9.5H6V7.2h1.68V5.84c0-1.87.92-3.02 3.42-3.02.47 0 1.27.09 1.6.18v2.08a9.3 9.3 0 0 0-.98-.05c-1.03 0-1.4.34-1.4 1.24v.93h2.28l-.1 2.3Z" />
    </svg>
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
const pendingEmailVerificationKey = 'fitstay.pendingEmailVerification'

async function sendAccountVerification(user: User, lang: Lang) {
  auth.languageCode = lang === 'ua' ? 'uk' : 'en'
  const verificationUrl = new URL('/auth/email-verified', window.location.origin)
  verificationUrl.searchParams.set('lang', lang)
  await sendEmailVerification(user, {
    url: verificationUrl.toString(),
    handleCodeInApp: false,
  })
}

function authErrorCode(authError: unknown) {
  return typeof authError === 'object' && authError && 'code' in authError
    ? String(authError.code)
    : ''
}

function authErrorMessage(authError: unknown, isUA: boolean) {
  const code = authErrorCode(authError)
  if (code === 'auth/invalid-email') return isUA ? 'Введіть коректний email.' : 'Enter a valid email address.'
  if (code === 'auth/email-already-in-use') return isUA ? 'Акаунт із цим email уже існує. Увійдіть до нього.' : 'An account with this email already exists. Log in instead.'
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return isUA ? 'Неправильний email або пароль.' : 'Incorrect email or password.'
  if (code === 'auth/weak-password') return isUA ? 'Пароль має містити щонайменше 6 символів.' : 'Password must be at least 6 characters.'
  if (code === 'auth/missing-password') return isUA ? 'Введіть пароль.' : 'Enter your password.'
  if (code === 'auth/too-many-requests') return isUA ? 'Забагато спроб. Спробуйте пізніше.' : 'Too many attempts. Please try again later.'
  if (code === 'auth/network-request-failed') return isUA ? 'Перевірте інтернет-з’єднання та спробуйте ще раз.' : 'Check your internet connection and try again.'
  if (code === 'auth/operation-not-allowed') return isUA ? 'Цей спосіб входу ще не ввімкнений у Firebase.' : 'This sign-in method is not enabled in Firebase yet.'
  if (code === 'auth/unauthorized-domain') return isUA ? 'Цей домен ще не додано до Authorized domains у Firebase.' : 'This domain is not listed in Firebase Authorized domains yet.'
  if (code === 'auth/popup-blocked') return isUA ? 'Браузер заблокував вікно входу. Дозвольте спливні вікна та повторіть спробу.' : 'The browser blocked the sign-in window. Allow pop-ups and try again.'
  if (code === 'auth/account-exists-with-different-credential') return isUA ? 'Цей email прив’язаний до іншого способу входу.' : 'This email uses a different sign-in method.'
  if (code === 'auth/popup-closed-by-user') return isUA ? 'Вхід було скасовано.' : 'Sign-in was cancelled.'
  return isUA ? 'Не вдалося завершити дію. Спробуйте ще раз.' : 'We could not complete that action. Please try again.'
}

function AuthPage({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    return onAuthStateChanged(auth, (user) => {
      const pendingEmail = window.localStorage.getItem(pendingEmailVerificationKey)
      if (pendingEmail && user && !user.emailVerified) {
        setEmail(user.email || pendingEmail)
        setVerificationEmail(user.email || pendingEmail)
      }
      if (user?.emailVerified) window.localStorage.removeItem(pendingEmailVerificationKey)
    })
  }, [])

  const isUA = lang === 'ua'
  const isRegister = mode === 'register'
  const continueToOnboarding = new URLSearchParams(window.location.search).get('next') === 'onboarding'
  const destination = isRegister || continueToOnboarding ? '/design-lab?preview=onboarding' : '/design-lab?preview=home'
  const title = isRegister ? (isUA ? 'Створити акаунт' : 'Create your account') : (isUA ? 'Увійти до fitstay.' : 'Log in to fitstay.')
  const sub = isRegister
    ? (isUA ? 'Почніть безкоштовно — 2 перевірки готелів включено.' : 'Start free — 2 hotel checks included.')
    : (isUA ? 'Увійдіть, щоб продовжити роботу з перевірками готелів.' : 'Log in to continue to your hotel checks.')

  const handleEmailAuth = async () => {
    if (loading) return
    setError('')
    setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(isUA ? 'Введіть коректний email.' : 'Enter a valid email address.')
      return
    }
    if (isRegister && name.trim().length < 2) {
      setError(isUA ? 'Введіть ваше ім’я.' : 'Enter your name.')
      return
    }
    if (isRegister && !ageConfirmed) {
      setError(isUA ? 'Підтвердьте, що вам виповнилося 18 років.' : 'Confirm that you are at least 18 years old.')
      return
    }
    if (password.length < 6) {
      setError(isUA ? 'Пароль має містити щонайменше 6 символів.' : 'Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLocaleLowerCase()
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
        await updateProfile(credential.user, { displayName: name.trim() })
        await sendAccountVerification(credential.user, lang)
        window.localStorage.setItem(pendingEmailVerificationKey, normalizedEmail)
        setVerificationEmail(normalizedEmail)
        return
      } else {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
        if (!credential.user.emailVerified) {
          window.localStorage.setItem(pendingEmailVerificationKey, normalizedEmail)
          setVerificationEmail(normalizedEmail)
          return
        }
      }
      window.location.assign(destination)
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
    } finally {
      setLoading(false)
    }
  }

  const handleSocialAuth = async (provider: AuthProvider) => {
    if (loading) return
    setError('')
    if (isRegister && !ageConfirmed) {
      setError(isUA ? 'Підтвердьте, що вам виповнилося 18 років.' : 'Confirm that you are at least 18 years old.')
      return
    }
    setLoading(true)
    try {
      const credential = await signInWithPopup(auth, provider)
      if (isRegister && name.trim() && !credential.user.displayName) await updateProfile(credential.user, { displayName: name.trim() })
      if (!credential.user.emailVerified && credential.user.email) {
        await sendAccountVerification(credential.user, lang)
        window.localStorage.setItem(pendingEmailVerificationKey, credential.user.email)
        setVerificationEmail(credential.user.email)
        return
      }
      window.location.assign(destination)
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async () => {
    if (loading || !auth.currentUser) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await sendAccountVerification(auth.currentUser, lang)
      setNotice(isUA ? 'Нове посилання надіслано.' : 'A new verification link was sent.')
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      await signOut(auth)
      window.localStorage.removeItem(pendingEmailVerificationKey)
      setVerificationEmail('')
      setMode('login')
      setPassword('')
      setNotice('')
      setError('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory font-sans flex flex-col relative">
      <button type="button" onClick={onBack} className="absolute top-5 left-4 sm:left-6 inline-flex items-center gap-2 text-[13px] font-medium text-ink/55 hover:text-ink transition-colors" aria-label={isUA ? 'Повернутися на головну' : 'Back to home'}>
        <span aria-hidden="true">←</span><Logo />
      </button>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          <img src={aiBlob} alt="" className="w-24 h-24 object-contain mb-8 mx-auto" />

          {verificationEmail ? (
            <div className="text-center" aria-live="polite">
              <h1 className="font-display italic text-ink leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{isUA ? 'Підтвердьте email' : 'Check your email'}</h1>
              <p className="mt-4 text-[14px] leading-relaxed text-ink/55">{isUA ? 'Ми надіслали посилання для підтвердження на' : 'We sent a verification link to'}</p>
              <p className="mt-1 break-all text-[14px] font-semibold text-ink">{verificationEmail}</p>
              <p className="mt-4 text-[12px] leading-relaxed text-ink/40">{isUA ? 'Відкрийте посилання в листі. Після підтвердження ви перейдете до онбордингу.' : 'Open the link in the email. After verification, you’ll continue to onboarding.'}</p>
              {error && <p role="alert" className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-[12px] font-medium text-[#b74339]">{error}</p>}
              {notice && <p role="status" className="mt-5 rounded-2xl bg-[#edf5ee] px-4 py-3 text-[12px] font-medium text-[#3f6748]">{notice}</p>}
              <button type="button" onClick={() => void resendVerification()} disabled={loading} className="mt-7 w-full h-12 bg-coral text-white text-[14px] font-bold rounded-full hover:bg-[#e54d49] disabled:cursor-wait disabled:opacity-60">
                {loading ? (isUA ? 'Надсилаємо…' : 'Sending…') : (isUA ? 'Надіслати ще раз' : 'Resend email')}
              </button>
              <button type="button" onClick={() => void backToLogin()} disabled={loading} className="mt-3 h-11 px-5 text-[13px] font-semibold text-ink/55 hover:text-ink disabled:opacity-60">
                {isUA ? 'Повернутися до входу' : 'Back to log in'}
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display italic text-ink leading-tight mb-3 text-center" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{title}</h1>
              <p className="mb-7 text-center text-[14px] leading-relaxed text-ink/50">{sub}</p>

              <div className="space-y-3 mb-6">
                <button type="button" onClick={() => void handleSocialAuth(new GoogleAuthProvider())} disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-ink/10 rounded-full text-[14px] font-medium text-ink hover:bg-ivory disabled:opacity-60"><GoogleLogo />Continue with Google</button>
                <button type="button" onClick={() => void handleSocialAuth(new FacebookAuthProvider())} disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-ink/10 rounded-full text-[14px] font-medium text-ink hover:bg-ivory disabled:opacity-60"><FacebookLogo />Continue with Facebook</button>
              </div>
              <div className="flex items-center gap-3 mb-6"><div className="flex-1 h-px bg-ink/10"/><span className="text-[12px] text-ink/35">{isUA ? 'або через email' : 'or with email'}</span><div className="flex-1 h-px bg-ink/10"/></div>

              <form onSubmit={(event) => { event.preventDefault(); void handleEmailAuth() }} className="space-y-3">
                {isRegister && (
                  <div>
                    <label className="block text-[12px] font-medium text-ink/50 mb-1.5">{isUA ? "Ім'я" : 'Name'}</label>
                    <input type="text" value={name} onChange={(event) => setName(event.target.value)} required placeholder={isUA ? "Ваше ім'я" : 'Your name'} className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30" />
                  </div>
                )}
                <div>
                  <label htmlFor="auth-email" className="block text-[12px] font-medium text-ink/50 mb-1.5">Email</label>
                  <input id="auth-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError('') }} required placeholder={isUA ? 'ваш@email.com' : 'your@email.com'} className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30" />
                </div>
                <div>
                  <label htmlFor="auth-password" className="block text-[12px] font-medium text-ink/50 mb-1.5">{isUA ? 'Пароль' : 'Password'}</label>
                  <input id="auth-password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError('') }} required minLength={6} placeholder={isUA ? 'Щонайменше 6 символів' : 'At least 6 characters'} className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30" />
                </div>
                {isRegister && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-2 text-[12px] leading-relaxed text-ink/55">
                    <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-[#f06455]" />
                    <span>{isUA ? 'Підтверджую, що мені виповнилося 18 років.' : 'I confirm that I am at least 18 years old.'}</span>
                  </label>
                )}
                {error && <p role="alert" className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-[12px] font-medium text-[#b74339]">{error}</p>}
                <button type="submit" disabled={loading} className="w-full h-12 bg-coral text-white text-[14px] font-bold rounded-full hover:bg-[#e54d49] disabled:cursor-wait disabled:opacity-60">
                  {loading ? (isRegister ? (isUA ? 'Створюємо…' : 'Creating account…') : (isUA ? 'Входимо…' : 'Logging in…')) : (isRegister ? (isUA ? 'Створити акаунт' : 'Create account') : (isUA ? 'Увійти' : 'Log in'))}
                </button>
              </form>

              <p className="text-center text-[13px] text-ink/40 mt-6">
                {isRegister ? (isUA ? 'Вже є акаунт?' : 'Already have an account?') : (isUA ? 'Ще немає акаунту?' : "Don't have an account?")}{' '}
                <button type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setPassword(''); setError('') }} className="text-ink font-medium hover:text-coral">{isRegister ? (isUA ? 'Увійти' : 'Log in') : (isUA ? 'Зареєструватися' : 'Create one')}</button>
              </p>
              {isRegister && <p className="text-center text-[12px] text-ink/30 mt-5 leading-relaxed">{isUA ? 'Продовжуючи, ви погоджуєтесь з умовами використання та політикою конфіденційності.' : 'By continuing you agree to our Terms of Service and Privacy Policy.'}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

type EmailVerificationState = 'loading' | 'success' | 'sign-in' | 'unverified' | 'expired' | 'invalid' | 'error'

function EmailVerificationCallback({ lang }: { lang: Lang }) {
  const [state, setState] = useState<EmailVerificationState>('loading')
  const [message, setMessage] = useState('')
  const handledRef = useRef(false)
  const isUA = lang === 'ua' || new URLSearchParams(window.location.search).get('lang') === 'ua'

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const completeVerification = async () => {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get('mode')
      const actionCode = params.get('oobCode')

      try {
        if (mode === 'verifyEmail' && actionCode) await applyActionCode(auth, actionCode)
        await auth.authStateReady()

        if (auth.currentUser) {
          await reload(auth.currentUser)
          if (auth.currentUser.emailVerified) {
            window.localStorage.removeItem(pendingEmailVerificationKey)
            setState('success')
            window.setTimeout(() => window.location.replace('/design-lab?preview=onboarding'), 900)
            return
          }
          setState('unverified')
          return
        }

        setState(mode === 'verifyEmail' && actionCode ? 'sign-in' : 'unverified')
      } catch (authError) {
        const code = authErrorCode(authError)
        if (code === 'auth/expired-action-code') setState('expired')
        else if (code === 'auth/invalid-action-code') setState('invalid')
        else {
          setState('error')
          setMessage(authErrorMessage(authError, isUA))
        }
      }
    }

    void completeVerification()
  }, [])

  const title = state === 'loading' ? (isUA ? 'Підтверджуємо email…' : 'Verifying your email…')
    : state === 'success' ? (isUA ? 'Email підтверджено' : 'Email verified')
      : state === 'sign-in' ? (isUA ? 'Email підтверджено' : 'Email verified')
        : state === 'expired' ? (isUA ? 'Посилання застаріло' : 'This link has expired')
          : state === 'invalid' ? (isUA ? 'Недійсне посилання' : 'Invalid verification link')
            : state === 'unverified' ? (isUA ? 'Email ще не підтверджено' : 'Email is not verified yet')
              : (isUA ? 'Не вдалося підтвердити email' : 'Could not verify your email')

  return (
    <div className="min-h-screen bg-ivory font-sans flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px] text-center">
        <img src={aiBlob} alt="" className="w-24 h-24 object-contain mb-8 mx-auto" />
        <h1 className="font-display italic text-ink leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{title}</h1>
        {state === 'loading' && <p className="mt-4 text-[14px] text-ink/50">{isUA ? 'Це займе лише мить.' : 'This will only take a moment.'}</p>}
        {state === 'success' && <p role="status" className="mt-4 text-[14px] text-ink/50">{isUA ? 'Переходимо до налаштування профілю.' : 'Taking you to profile setup.'}</p>}
        {state === 'sign-in' && (
          <div className="mt-5">
            <p className="text-[14px] leading-relaxed text-ink/50">{isUA ? 'Увійдіть у підтверджений акаунт, щоб перейти до онбордингу.' : 'Log in to your verified account to continue to onboarding.'}</p>
            <a href="/?auth=1&next=onboarding" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-coral px-7 text-[14px] font-bold text-white hover:bg-[#e54d49]">{isUA ? 'Увійти' : 'Log in'}</a>
          </div>
        )}
        {(state === 'unverified' || state === 'expired' || state === 'invalid' || state === 'error') && (
          <div className="mt-5">
            <p role="alert" className="text-[14px] leading-relaxed text-ink/50">{message || (state === 'expired' ? (isUA ? 'Запросіть нове посилання для підтвердження.' : 'Request a new verification link.') : state === 'unverified' ? (isUA ? 'Відкрийте посилання з листа або надішліть його повторно.' : 'Open the link from your email or request a new one.') : (isUA ? 'Це посилання неможливо використати.' : 'This verification link cannot be used.'))}</p>
            <a href="/?auth=1&next=onboarding" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-coral px-7 text-[14px] font-bold text-white hover:bg-[#e54d49]">{isUA ? 'Повернутися до входу' : 'Back to log in'}</a>
          </div>
        )}
      </div>
    </div>
  )
}

type EmailLinkState = 'loading' | 'cross-device' | 'invalid' | 'expired' | 'error' | 'success'

function EmailLinkCallback({ lang }: { lang: Lang }) {
  const [state, setState] = useState<EmailLinkState>('loading')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const completingRef = useRef(false)
  const isUA = lang === 'ua'

  const completeSignIn = async (emailAddress: string) => {
    if (completingRef.current) return
    completingRef.current = true
    setState('loading')
    setMessage('')
    try {
      const credential = await signInWithEmailLink(auth, emailAddress.trim().toLocaleLowerCase(), window.location.href)
      const pendingName = window.localStorage.getItem(pendingNameKey)
      if (pendingName && !credential.user.displayName) await updateProfile(credential.user, { displayName: pendingName })
      window.localStorage.removeItem(emailForSignInKey)
      window.localStorage.removeItem(pendingNameKey)
      setState('success')
      window.setTimeout(() => window.location.replace('/design-lab?preview=onboarding'), 900)
    } catch (authError) {
      const code = authErrorCode(authError)
      if (code === 'auth/expired-action-code') setState('expired')
      else if (code === 'auth/invalid-action-code' || code === 'auth/invalid-email') setState('invalid')
      else {
        setState('error')
        setMessage(authErrorMessage(authError, isUA))
      }
      completingRef.current = false
    }
  }

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setState('invalid')
      return
    }
    const storedEmail = window.localStorage.getItem(emailForSignInKey)
    if (storedEmail) void completeSignIn(storedEmail)
    else setState('cross-device')
  }, [])

  const title = state === 'loading' ? (isUA ? 'Входимо…' : 'Signing you in…')
    : state === 'cross-device' ? (isUA ? 'Підтвердьте email' : 'Confirm your email')
      : state === 'success' ? (isUA ? 'Готово' : 'You’re signed in')
        : state === 'expired' ? (isUA ? 'Посилання застаріло' : 'This link has expired')
          : state === 'invalid' ? (isUA ? 'Недійсне посилання' : 'Invalid sign-in link')
            : (isUA ? 'Не вдалося увійти' : 'Could not sign in')

  return (
    <div className="min-h-screen bg-ivory font-sans flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px] text-center">
        <img src={aiBlob} alt="" className="w-24 h-24 object-contain mb-8 mx-auto" />
        <h1 className="font-display italic text-ink leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{title}</h1>
        {state === 'loading' && <p className="mt-4 text-[14px] text-ink/50">{isUA ? 'Перевіряємо безпечне посилання.' : 'Checking your secure sign-in link.'}</p>}
        {state === 'success' && <p role="status" className="mt-4 text-[14px] text-ink/50">{isUA ? 'Переходимо до налаштування профілю.' : 'Taking you to profile setup.'}</p>}
        {state === 'cross-device' && (
          <form onSubmit={(event) => { event.preventDefault(); void completeSignIn(email) }} className="mt-7 text-left">
            <p className="mb-5 text-center text-[14px] leading-relaxed text-ink/50">{isUA ? 'Посилання відкрито в іншому браузері або на іншому пристрої. Введіть email, на який ми його надіслали.' : 'This link was opened in another browser or on another device. Enter the email address that received it.'}</p>
            <label htmlFor="callback-email" className="mb-1.5 block text-[12px] font-medium text-ink/50">Email</label>
            <input id="callback-email" autoFocus type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" className="w-full h-12 bg-white border border-ink/12 rounded-full px-5 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30" />
            <button type="submit" className="mt-3 w-full h-12 bg-coral text-white text-[14px] font-bold rounded-full hover:bg-[#e54d49]">{isUA ? 'Продовжити' : 'Continue'}</button>
          </form>
        )}
        {(state === 'invalid' || state === 'expired' || state === 'error') && (
          <div className="mt-5">
            <p role="alert" className="text-[14px] leading-relaxed text-ink/50">{message || (state === 'expired' ? (isUA ? 'Запросіть нове посилання для входу.' : 'Request a new sign-in link.') : (isUA ? 'Це посилання неможливо використати. Запросіть нове.' : 'This link cannot be used. Request a new one.'))}</p>
            <a href="/?auth=1" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-coral px-7 text-[14px] font-bold text-white hover:bg-[#e54d49]">{isUA ? 'Надіслати нове посилання' : 'Send a new link'}</a>
          </div>
        )}
      </div>
    </div>
  )
}

function EmailVerificationGate({ user, lang }: { user: User; lang: Lang }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isUA = lang === 'ua'

  const resendVerification = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await sendAccountVerification(user, lang)
      window.localStorage.setItem(pendingEmailVerificationKey, user.email || '')
      setNotice(isUA ? 'Нове посилання надіслано.' : 'A new verification link was sent.')
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
    } finally {
      setLoading(false)
    }
  }

  const checkVerification = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await reload(user)
      if (user.emailVerified) {
        window.localStorage.removeItem(pendingEmailVerificationKey)
        window.location.replace('/design-lab?preview=onboarding')
        return
      }
      setError(isUA ? 'Email ще не підтверджено. Відкрийте посилання з листа.' : 'Your email is not verified yet. Open the link from the email.')
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
    } finally {
      setLoading(false)
    }
  }

  const useAnotherAccount = async () => {
    if (loading) return
    setLoading(true)
    try {
      await signOut(auth)
      window.localStorage.removeItem(pendingEmailVerificationKey)
      window.location.replace('/?auth=1')
    } catch (authError) {
      setError(authErrorMessage(authError, isUA))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory font-sans flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px] text-center" aria-live="polite">
        <img src={aiBlob} alt="" className="w-24 h-24 object-contain mb-8 mx-auto" />
        <h1 className="font-display italic text-ink leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{isUA ? 'Підтвердьте email' : 'Check your email'}</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/55">{isUA ? 'Щоб перейти до онбордингу, підтвердьте адресу з листа, надісланого на' : 'Verify your address using the link we sent before continuing to onboarding.'}</p>
        {user.email && <p className="mt-1 break-all text-[14px] font-semibold text-ink">{user.email}</p>}
        {error && <p role="alert" className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-[12px] font-medium text-[#b74339]">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-2xl bg-[#edf5ee] px-4 py-3 text-[12px] font-medium text-[#3f6748]">{notice}</p>}
        <button type="button" onClick={() => void checkVerification()} disabled={loading} className="mt-7 w-full h-12 bg-coral text-white text-[14px] font-bold rounded-full hover:bg-[#e54d49] disabled:cursor-wait disabled:opacity-60">
          {loading ? (isUA ? 'Перевіряємо…' : 'Checking…') : (isUA ? 'Я підтвердив email' : 'I verified my email')}
        </button>
        <button type="button" onClick={() => void resendVerification()} disabled={loading} className="mt-3 w-full h-11 rounded-full bg-[#f3efeb] px-5 text-[13px] font-semibold text-ink hover:bg-[#ece4df] disabled:opacity-60">
          {isUA ? 'Надіслати лист ще раз' : 'Resend email'}
        </button>
        <button type="button" onClick={() => void useAnotherAccount()} disabled={loading} className="mt-2 h-11 px-5 text-[13px] font-semibold text-ink/55 hover:text-ink disabled:opacity-60">
          {isUA ? 'Використати інший акаунт' : 'Use another account'}
        </button>
      </div>
    </div>
  )
}

function ProductRoute({ lang }: { lang: Lang }) {
  const [authReady, setAuthReady] = useState(false)
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null)

  useEffect(() => {
    const applyUser = (user: User | null) => {
      const usesPassword = user?.providerData.some((provider) => provider.providerId === 'password')
      setUnverifiedUser(user && usesPassword && !user.emailVerified ? user : null)
      setAuthReady(true)
    }

    const unsubscribe = onAuthStateChanged(auth, applyUser)
    const refreshOnFocus = async () => {
      if (!auth.currentUser) return
      try {
        await reload(auth.currentUser)
        applyUser(auth.currentUser)
      } catch {
        // The gate remains in place if the verification status cannot be refreshed.
      }
    }
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])

  if (!authReady) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center" aria-label={lang === 'ua' ? 'Завантаження' : 'Loading'}>
        <img src={aiBlob} alt="" className="h-16 w-16 animate-pulse object-contain" />
      </div>
    )
  }

  if (unverifiedUser) return <EmailVerificationGate user={unverifiedUser} lang={lang} />
  return <VisualLab />
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Page = 'landing' | 'auth'

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [page, setPage] = useState<Page>(() => new URLSearchParams(window.location.search).get('auth') === '1' ? 'auth' : 'landing')
  const tx = T[lang]
  const pathname = window.location.pathname.replace(/\/$/, '')

  if (pathname === '/design-lab') {
    return <ProductRoute lang={lang} />
  }
  if (pathname === '/auth/verify') return <EmailLinkCallback lang={lang} />
  if (pathname === '/auth/email-verified') return <EmailVerificationCallback lang={lang} />

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
