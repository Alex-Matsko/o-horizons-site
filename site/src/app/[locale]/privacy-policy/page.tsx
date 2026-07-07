import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const h2 = 'text-lg font-semibold text-[#e2e8f0] mt-9 mb-3'
const p = 'text-sm text-[#94a3b8] leading-[1.8]'
const ul = 'list-disc pl-5 my-2 space-y-1 text-sm text-[#94a3b8] leading-[1.8]'
const a = 'text-[#3b82f6] hover:underline'

function PolicyRu() {
  return (
    <>
      <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Политика конфиденциальности</h1>
      <p className="text-xs text-[#475569] mb-10">Последнее обновление: 7 апреля 2026 г.</p>

      <h2 className={h2}>1. Общие положения</h2>
      <p className={p}>Настоящая Политика конфиденциальности (далее — «Политика») описывает, как компания «Открытые Горизонты» (далее — «Оператор», «мы») собирает, использует и защищает персональные данные пользователей сайта <a className={a} href="https://o-horizons.com">o-horizons.com</a> (далее — «Сайт»).</p>
      <p className={p}>Используя Сайт и отправляя формы обратной связи, вы соглашаетесь с условиями настоящей Политики.</p>

      <h2 className={h2}>2. Какие данные мы собираем</h2>
      <p className={p}>При заполнении формы заявки мы можем получать:</p>
      <ul className={ul}>
        <li>имя и фамилию;</li>
        <li>название компании;</li>
        <li>номер телефона;</li>
        <li>адрес электронной почты или контакт в Telegram;</li>
        <li>содержание сообщения (описание задачи).</li>
      </ul>
      <p className={p}>Автоматически собираются технические данные: IP-адрес, тип браузера, страницы, которые вы посещаете, время визита — через сервисы аналитики (см. раздел 4).</p>

      <h2 className={h2}>3. Цели обработки</h2>
      <ul className={ul}>
        <li>Ответ на ваш запрос и консультация по услугам.</li>
        <li>Заключение и исполнение договора об оказании IT-услуг.</li>
        <li>Улучшение качества Сайта и пользовательского опыта.</li>
        <li>Соблюдение требований законодательства РФ.</li>
      </ul>

      <h2 className={h2}>4. Аналитика и файлы cookie</h2>
      <p className={p}>Мы используем следующие сервисы аналитики:</p>
      <ul className={ul}>
        <li><strong className="text-[#cbd5e1]">Google Analytics</strong> (Google LLC) — собирает обезличенную статистику посещаемости. <a className={a} href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Политика Google</a>.</li>
        <li><strong className="text-[#cbd5e1]">Яндекс.Метрика</strong> (ООО «Яндекс») — анализ поведения пользователей, включая Вебвизор. <a className={a} href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener noreferrer">Политика Яндекса</a>.</li>
      </ul>
      <p className={p}>Файлы cookie — небольшие текстовые файлы, сохраняемые в браузере. Вы можете отключить cookie в настройках браузера, однако это может повлиять на работу Сайта.</p>

      <h2 className={h2}>5. Передача данных третьим лицам</h2>
      <p className={p}>Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением:</p>
      <ul className={ul}>
        <li>случаев, предусмотренных законодательством РФ;</li>
        <li>сервисов аналитики, указанных в разделе 4 (данные передаются в обезличенном виде);</li>
        <li>технических подрядчиков, обеспечивающих работу Сайта, при условии соблюдения ими требований конфиденциальности.</li>
      </ul>

      <h2 className={h2}>6. Хранение данных</h2>
      <p className={p}>Данные, полученные через форму заявки, хранятся не дольше, чем это необходимо для обработки запроса, либо до 3 лет — в случае заключения договора. После истечения срока данные удаляются.</p>

      <h2 className={h2}>7. Ваши права</h2>
      <p className={p}>В соответствии с Федеральным законом № 152-ФЗ «О персональных данных» вы вправе:</p>
      <ul className={ul}>
        <li>получить информацию об обработке ваших данных;</li>
        <li>потребовать исправления или удаления данных;</li>
        <li>отозвать согласие на обработку персональных данных.</li>
      </ul>
      <p className={p}>Для реализации прав обратитесь по адресу: <a className={a} href="mailto:info@o-horizons.com">info@o-horizons.com</a>.</p>

      <h2 className={h2}>8. Защита данных</h2>
      <p className={p}>Мы применяем технические и организационные меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>

      <h2 className={h2}>9. Изменения Политики</h2>
      <p className={p}>Мы оставляем за собой право вносить изменения в настоящую Политику. Актуальная версия всегда размещена на этой странице. Продолжение использования Сайта после публикации изменений означает ваше согласие с новой редакцией.</p>

      <h2 className={h2}>10. Контакты</h2>
      <p className={p}>По всем вопросам, связанным с обработкой персональных данных:<br />
        Email: <a className={a} href="mailto:info@o-horizons.com">info@o-horizons.com</a><br />
        Telegram: <a className={a} href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer">@ohorizons</a></p>
    </>
  )
}

function PolicyEn() {
  return (
    <>
      <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#475569] mb-10">Last updated: 7 April 2026</p>

      <h2 className={h2}>1. General</h2>
      <p className={p}>This Privacy Policy describes how Open Horizons (the &quot;Company&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses and protects personal data of visitors to <a className={a} href="https://o-horizons.com">o-horizons.com</a> (the &quot;Site&quot;). By using the Site and submitting contact forms you agree to this Policy.</p>

      <h2 className={h2}>2. Data we collect</h2>
      <p className={p}>When you submit a contact form we may receive:</p>
      <ul className={ul}>
        <li>your name;</li>
        <li>company name;</li>
        <li>phone number;</li>
        <li>email address or Telegram handle;</li>
        <li>message content (description of your task).</li>
      </ul>
      <p className={p}>Technical data is collected automatically: IP address, browser type, pages visited and visit time — via analytics services (see section 4).</p>

      <h2 className={h2}>3. Purpose of processing</h2>
      <ul className={ul}>
        <li>Responding to your enquiry and consulting on our services.</li>
        <li>Entering into and performing an IT services agreement.</li>
        <li>Improving the Site and user experience.</li>
        <li>Compliance with applicable law.</li>
      </ul>

      <h2 className={h2}>4. Analytics and cookies</h2>
      <p className={p}>We use the following analytics services:</p>
      <ul className={ul}>
        <li><strong className="text-[#cbd5e1]">Google Analytics</strong> (Google LLC) — anonymous traffic statistics. <a className={a} href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
        <li><strong className="text-[#cbd5e1]">Yandex.Metrica</strong> (Yandex LLC) — user behaviour analysis including session recording. <a className={a} href="https://yandex.com/legal/confidential/" target="_blank" rel="noopener noreferrer">Yandex Privacy Policy</a>.</li>
      </ul>
      <p className={p}>Cookies are small text files stored in your browser. You may disable cookies in your browser settings, though this may affect Site functionality.</p>

      <h2 className={h2}>5. Data sharing</h2>
      <p className={p}>We do not sell or transfer your personal data to third parties, except:</p>
      <ul className={ul}>
        <li>as required by applicable law;</li>
        <li>to the analytics providers listed in section 4 (anonymised data only);</li>
        <li>to technical subcontractors who operate the Site, subject to confidentiality obligations.</li>
      </ul>

      <h2 className={h2}>6. Retention</h2>
      <p className={p}>Data received through contact forms is retained no longer than necessary to handle your request, or up to 3 years where a contract is signed. Data is deleted thereafter.</p>

      <h2 className={h2}>7. Your rights</h2>
      <p className={p}>You have the right to access, correct or request deletion of your personal data, and to withdraw consent at any time. To exercise these rights contact us at <a className={a} href="mailto:info@o-horizons.com">info@o-horizons.com</a>.</p>

      <h2 className={h2}>8. Security</h2>
      <p className={p}>We apply technical and organisational measures to protect personal data against unauthorised access, alteration, disclosure or destruction.</p>

      <h2 className={h2}>9. Policy changes</h2>
      <p className={p}>We may update this Policy at any time. The current version is always available on this page. Continued use of the Site after changes are published constitutes acceptance of the revised Policy.</p>

      <h2 className={h2}>10. Contact</h2>
      <p className={p}>For all privacy-related enquiries:<br />
        Email: <a className={a} href="mailto:info@o-horizons.com">info@o-horizons.com</a><br />
        Telegram: <a className={a} href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer">@ohorizons</a></p>
    </>
  )
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {locale === 'en' ? <PolicyEn /> : <PolicyRu />}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
