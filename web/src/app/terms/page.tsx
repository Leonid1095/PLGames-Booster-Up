import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — PLGames Booster',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-brand hover:underline text-sm mb-6 inline-block">&larr; На главную</Link>
        <h1 className="text-3xl font-bold mb-8">Пользовательское соглашение</h1>
        <p className="text-gray-400 text-sm mb-8">Дата последнего обновления: 28 марта 2026 г.</p>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Общие положения</h2>
            <p>Настоящее Пользовательское соглашение (далее — Соглашение) регулирует отношения между PLGames (далее — Сервис) и пользователем (далее — Пользователь) при использовании программного обеспечения PLGames Booster UP и связанных сервисов.</p>
            <p className="mt-2">Регистрируясь и используя Сервис, Пользователь подтверждает согласие с условиями данного Соглашения.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Описание Сервиса</h2>
            <p>PLGames Booster UP — платформа оптимизации сетевого соединения для онлайн-игр. Сервис маршрутизирует игровой трафик через оптимизированные relay-узлы с использованием собственного протокола PLG Protocol для снижения задержки (пинга) и потерь пакетов.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Регистрация и учётная запись</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Пользователь обязан предоставить достоверные данные при регистрации.</li>
              <li>Пользователь несёт ответственность за сохранность учётных данных.</li>
              <li>Одна учётная запись может использоваться только одним лицом.</li>
              <li>Передача аккаунта третьим лицам запрещена.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Тарифы и оплата</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Сервис предоставляет бесплатный пробный период (7 дней) для новых пользователей.</li>
              <li>Платные подписки оплачиваются через систему DonatePay.</li>
              <li>Стоимость подписки указана на странице тарифов и может изменяться с предварительным уведомлением.</li>
              <li>Возврат средств осуществляется в течение 14 дней с момента оплаты, если Сервис не был использован.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Ограничения использования</h2>
            <p>Пользователю запрещается:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Использовать Сервис для незаконной деятельности.</li>
              <li>Пытаться получить несанкционированный доступ к инфраструктуре Сервиса.</li>
              <li>Перепродавать или передавать доступ к Сервису третьим лицам.</li>
              <li>Использовать Сервис для DDoS-атак или иных вредоносных действий.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Ограничение ответственности</h2>
            <p>Сервис предоставляется «как есть». PLGames не гарантирует определённый уровень снижения пинга, так как результат зависит от множества факторов, включая качество интернет-соединения Пользователя, расположение игровых серверов и текущую нагрузку сети.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Изменение условий</h2>
            <p>PLGames оставляет за собой право изменять условия данного Соглашения. Пользователи будут уведомлены об изменениях по электронной почте или через интерфейс Сервиса.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Контакты</h2>
            <p>По вопросам, связанным с данным Соглашением, обращайтесь: support@plgames-boost.duckdns.org</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex gap-4 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-white">Конфиденциальность</Link>
          <Link href="/" className="hover:text-white">Главная</Link>
        </div>
      </div>
    </main>
  );
}
