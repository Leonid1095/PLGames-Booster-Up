import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — PLGames Booster',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-brand hover:underline text-sm mb-6 inline-block">&larr; На главную</Link>
        <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>
        <p className="text-gray-400 text-sm mb-8">Дата последнего обновления: 28 марта 2026 г.</p>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Какие данные мы собираем</h2>
            <p>При использовании PLGames Booster UP мы собираем следующие данные:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Регистрационные данные:</strong> адрес электронной почты, имя пользователя.</li>
              <li><strong>Данные сессий:</strong> время подключения, выбранная игра, relay-узел, средний пинг, объём переданного трафика.</li>
              <li><strong>Платёжные данные:</strong> информация о транзакциях через DonatePay (мы не храним данные банковских карт).</li>
              <li><strong>Технические данные:</strong> версия клиента, операционная система.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Как мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Предоставление и улучшение Сервиса.</li>
              <li>Обработка платежей и управление подписками.</li>
              <li>Мониторинг производительности relay-узлов.</li>
              <li>Техническая поддержка пользователей.</li>
              <li>Предотвращение мошенничества и злоупотреблений.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Что мы НЕ собираем</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Мы <strong>не</strong> анализируем содержимое игрового трафика.</li>
              <li>Мы <strong>не</strong> логируем IP-адреса назначения (игровых серверов) после завершения сессии.</li>
              <li>Мы <strong>не</strong> передаём данные третьим лицам для рекламных целей.</li>
              <li>Мы <strong>не</strong> храним пароли в открытом виде (используется bcrypt-хеширование).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Хранение данных</h2>
            <p>Данные хранятся на серверах в Европе (Германия). Мы применяем следующие меры защиты:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Шифрование данных при передаче (TLS/HTTPS).</li>
              <li>Хеширование паролей (bcrypt).</li>
              <li>JWT-токены с ограниченным сроком действия.</li>
              <li>Разделение прав доступа к базе данных.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Срок хранения</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Данные аккаунта: до удаления аккаунта пользователем.</li>
              <li>История сессий: 90 дней.</li>
              <li>Метрики производительности: 30 дней (Prometheus).</li>
              <li>Логи: 7 дней.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Права пользователя</h2>
            <p>Вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Запросить копию своих персональных данных.</li>
              <li>Запросить удаление аккаунта и связанных данных.</li>
              <li>Отказаться от получения уведомлений.</li>
            </ul>
            <p className="mt-2">Для реализации этих прав обратитесь к нам по адресу: support@plgames-boost.duckdns.org</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Файлы cookie</h2>
            <p>Мы используем только технические cookie для поддержания сессии авторизации. Мы не используем рекламные или аналитические cookie.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Изменения политики</h2>
            <p>Мы можем обновлять данную политику. Актуальная версия всегда доступна на этой странице. При существенных изменениях мы уведомим пользователей по электронной почте.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex gap-4 text-xs text-gray-500">
          <Link href="/terms" className="hover:text-white">Соглашение</Link>
          <Link href="/" className="hover:text-white">Главная</Link>
        </div>
      </div>
    </main>
  );
}
