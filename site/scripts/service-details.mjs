// Detailed per-service content (audience / problems / included / result),
// indexed to match services.items order in src/messages/{locale}.json.
// Consumed by seed-sanity-content.mjs and seed-service-details.mjs.
export const serviceDetails = {
  ru: [
    {
      audience: 'Компании, где на 1С завязаны бухгалтерия, склад, продажи или производство — и простой программы означает остановку работы. Подходит и тем, у кого нет своего ИТ-специалиста, и тем, чей специалист перегружен текущими задачами.',
      problems: [
        '1С тормозит, отчёты формируются мучительно долго',
        'Обновления откладываются месяцами, потому что «страшно сломать»',
        'Базы растут, и что с ними делать — непонятно',
        'После ухода администратора никто не знает, как всё устроено',
      ],
      included: [
        'Круглосуточное наблюдение за серверами и базами 1С',
        'Обновления в согласованные окна — без остановки работы днём',
        'Контроль резервных копий и регулярные проверки восстановления',
        'Управление правами доступа сотрудников',
        'Консультации по техническим вопросам 1С',
      ],
      result: '1С работает быстро и предсказуемо, обновления ставятся вовремя, а у вас есть понятная картина состояния системы и один ответственный за неё подрядчик.',
    },
    {
      audience: 'Любой бизнес, для которого потеря данных обойдётся дороже их защиты: базы 1С, документы, почта, данные клиентов. Особенно критично для компаний, где копии «вроде бы делаются», но никто их ни разу не проверял.',
      problems: [
        'Копии сохраняются на тот же сервер, где лежат данные',
        'Никто ни разу не пробовал восстановиться из копии',
        'После сбоя выясняется, что свежих копий нет',
        'Вирус-шифровальщик может уничтожить и данные, и копии разом',
      ],
      included: [
        'Автоматическое копирование всех важных систем',
        'Хранение копий отдельно от основных данных',
        'Регулярные тестовые восстановления — с отчётом вам',
        'Защита копий от шифровальщиков',
        'Понятный план действий на случай аварии',
      ],
      result: 'Что бы ни случилось — сбой диска, ошибка сотрудника или вирус — данные восстанавливаются за прогнозируемое время. И вы знаете это заранее, а не выясняете в момент аварии.',
    },
    {
      audience: 'Компании со своими серверами — в офисе или дата-центре: под 1С, файлы, почту или отраслевые программы. А также те, кто планирует покупку или аренду серверов и не хочет переплатить.',
      problems: [
        'Серверы куплены «с запасом», но всё равно всё тормозит',
        'Оборудование стареет, а когда и что менять — непонятно',
        'Выход из строя одного сервера останавливает всю компанию',
        'Затраты на ИТ растут, а отдача не очевидна',
      ],
      included: [
        'Аудит текущих мощностей и реальной нагрузки',
        'План: что купить, что арендовать, что списать',
        'Настройка отказоустойчивости для критичных систем',
        'Постоянное наблюдение и предупреждение проблем',
        'Сопровождение модернизаций и переездов',
      ],
      result: 'Серверы соответствуют реальным задачам бизнеса: ничего не тормозит, нет переплаты за лишнее железо, а отказ одного узла не останавливает работу компании.',
    },
    {
      audience: 'Компании, где сотрудники работают удалённо, есть филиалы или подрядчики с доступом к системам. И все, кто хранит данные клиентов, финансовую информацию или коммерческую тайну.',
      problems: [
        'Уволенные сотрудники сохраняют доступ к системам',
        'Пароли записаны на стикерах и пересылаются в чатах',
        'Удалённый доступ настроен «как получилось» много лет назад',
        'Взлом заметят только тогда, когда будет уже поздно',
      ],
      included: [
        'Наведение порядка в доступах: кто, куда и зачем',
        'Безопасное удалённое подключение для сотрудников и подрядчиков',
        'Двухфакторный вход в критичные системы',
        'Наблюдение за подозрительной активностью',
        'Понятные правила для сотрудников — без лишней бюрократии',
      ],
      result: 'Доступ к системам компании имеют только те, кому он действительно нужен, попытки взлома видны сразу, а увольнение сотрудника не оставляет за собой открытых дверей.',
    },
    {
      audience: 'Компании, которые используют Битрикс24 для продаж, задач или документооборота — или купили его, но используют на десятую часть возможностей.',
      problems: [
        'Портал внедрили, но сотрудники продолжают работать по-старому',
        'Права настроены так, что все видят всё — или никто ничего',
        'Телефония, почта и 1С живут отдельно от портала',
        'Рутинные операции делаются вручную, хотя могли бы сами',
      ],
      included: [
        'Настройка структуры компании и прав под ваши процессы',
        'Подключение телефонии, почты и интеграция с 1С',
        'Автоматизация рутины: согласования, уведомления, задачи',
        'Обучение сотрудников работе с порталом',
        'Поддержка и развитие портала по мере роста',
      ],
      result: 'Битрикс24 из «купленной программы» превращается в рабочий инструмент: сделки не теряются, рутина автоматизирована, а руководитель видит реальную картину работы.',
    },
    {
      audience: 'Компании, где звонки — источник клиентов: продажи, сервис, запись на услуги. И те, кто платит за старую АТС больше, чем стоила бы современная связь.',
      problems: [
        'Пропущенные звонки — потерянные клиенты, и никто это не отслеживает',
        'Непонятно, кто из менеджеров как общается с клиентами',
        'Звонки не связаны с CRM: истории нет, номера теряются',
        'Переезд офиса означает смену привычных номеров',
      ],
      included: [
        'Подбор и настройка офисной телефонии под ваши задачи',
        'Умное распределение звонков: очереди, переадресация, голосовое меню',
        'Запись разговоров и привязка каждого звонка к CRM',
        'Номера, которые переезжают вместе с вами',
        'Поддержка и изменение сценариев по мере роста',
      ],
      result: 'Ни один звонок не теряется, каждый разговор записан и привязан к клиенту в CRM, а качество общения менеджеров можно оценивать по фактам, а не по ощущениям.',
    },
  ],
  en: [
    {
      audience: 'Companies whose accounting, warehouse, sales or production run on 1C — where downtime means the business stops. Fits both companies without their own IT specialist and those whose specialist is overloaded.',
      problems: [
        '1C is slow and reports take painfully long to build',
        'Updates are postponed for months out of fear of breaking things',
        'Databases keep growing with no clear plan',
        'After the administrator left, nobody knows how anything works',
      ],
      included: [
        '24/7 monitoring of 1C servers and databases',
        'Updates in agreed windows — no daytime interruptions',
        'Backup control and regular restore tests',
        'Employee access management',
        'Consulting on technical 1C questions',
      ],
      result: '1C runs fast and predictably, updates land on time, and you get a clear picture of the system with a single contractor accountable for it.',
    },
    {
      audience: 'Any business where losing data costs more than protecting it: 1C databases, documents, email, client records. Especially critical where backups are "probably running" but nobody has ever tested them.',
      problems: [
        'Backups are stored on the same server as the data',
        'Nobody has ever actually tried restoring from a backup',
        'After a failure it turns out there are no recent copies',
        'Ransomware can destroy both the data and the backups at once',
      ],
      included: [
        'Automatic backups of every critical system',
        'Copies stored separately from the primary data',
        'Regular test restores — with a report to you',
        'Ransomware-proof backup protection',
        'A clear action plan for the day something breaks',
      ],
      result: 'Whatever happens — disk failure, employee mistake or a virus — your data is restored within a predictable time. And you know that in advance, not during the incident.',
    },
    {
      audience: 'Companies with their own servers — in the office or a data centre: for 1C, files, email or industry software. Also those planning to buy or rent servers and not overpay.',
      problems: [
        'Servers were bought "with headroom" yet everything is still slow',
        'Hardware is ageing with no clear replacement plan',
        'One server failing stops the whole company',
        'IT costs keep growing while the value is unclear',
      ],
      included: [
        'Audit of current capacity and actual load',
        'A plan: what to buy, what to rent, what to retire',
        'Fault tolerance for business-critical systems',
        'Continuous monitoring and proactive prevention',
        'Support through upgrades and relocations',
      ],
      result: 'Servers match the real needs of the business: nothing is slow, no money wasted on excess hardware, and a single failure does not stop the company.',
    },
    {
      audience: 'Companies with remote employees, branch offices or contractors with system access. And anyone storing client data, financial information or trade secrets.',
      problems: [
        'Former employees still have access to systems',
        'Passwords live on sticky notes and get shared in chats',
        'Remote access was set up "somehow" years ago',
        'A break-in would only be noticed when it is too late',
      ],
      included: [
        'Bringing order to access: who, where and why',
        'Secure remote connection for employees and contractors',
        'Two-factor login for critical systems',
        'Monitoring for suspicious activity',
        'Clear rules for employees — without extra bureaucracy',
      ],
      result: 'Only the people who genuinely need access have it, break-in attempts are visible immediately, and an employee leaving never leaves a door open.',
    },
    {
      audience: 'Companies using Bitrix24 for sales, tasks or document flow — or those who bought it but use a tenth of its capabilities.',
      problems: [
        'The portal was rolled out but staff still work the old way',
        'Permissions let everyone see everything — or nobody see anything',
        'Telephony, email and 1C live separately from the portal',
        'Routine operations are done by hand when they could run themselves',
      ],
      included: [
        'Company structure and permissions tuned to your processes',
        'Telephony and email hookup, 1C integration',
        'Automation of routine: approvals, notifications, tasks',
        'Employee training on the portal',
        'Ongoing support and development as you grow',
      ],
      result: 'Bitrix24 turns from "software we bought" into a working tool: deals stop slipping away, routine is automated, and management sees the real picture of the work.',
    },
    {
      audience: 'Companies where calls bring the clients: sales, service, appointment booking. And those paying more for a legacy PBX than modern telephony would cost.',
      problems: [
        'Missed calls are lost clients — and nobody tracks them',
        'No visibility into how managers talk to clients',
        'Calls are not linked to the CRM: no history, lost numbers',
        'Moving office means changing the numbers clients know',
      ],
      included: [
        'Office telephony selected and configured for your needs',
        'Smart call distribution: queues, forwarding, voice menu',
        'Call recording with every call linked to the CRM',
        'Numbers that move with you',
        'Support and scenario changes as you grow',
      ],
      result: 'No call is ever lost, every conversation is recorded and attached to the client in the CRM, and managers’ communication quality is judged by facts, not feelings.',
    },
  ],
}
