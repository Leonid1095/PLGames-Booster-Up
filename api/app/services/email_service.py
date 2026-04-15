import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.smtp_host:
        logger.warning("SMTP not configured, skipping email to %s: %s", to, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


def render_password_reset_email(username: str, reset_url: str) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A14;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#12121F;border-radius:12px;
              border:1px solid #1E1E2E;padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:700;color:#6C63FF;">PLGames</span>
      <span style="font-size:24px;font-weight:700;color:#E8E8F0;"> Booster UP</span>
    </div>
    <p style="color:#E8E8F0;font-size:16px;margin-bottom:8px;">
      Привет, {username}!
    </p>
    <p style="color:#9999AA;font-size:14px;line-height:1.6;margin-bottom:24px;">
      Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы установить новый пароль.
      Ссылка действительна <strong style="color:#E8E8F0;">1 час</strong>.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="{reset_url}"
         style="display:inline-block;background:#6C63FF;color:#fff;text-decoration:none;
                padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
        Сбросить пароль
      </a>
    </div>
    <p style="color:#666;font-size:12px;line-height:1.5;">
      Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      Ваш аккаунт в безопасности.
    </p>
  </div>
</body>
</html>"""


def render_welcome_email(username: str) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A14;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#12121F;border-radius:12px;
              border:1px solid #1E1E2E;padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:700;color:#6C63FF;">PLGames</span>
      <span style="font-size:24px;font-weight:700;color:#E8E8F0;"> Booster UP</span>
    </div>
    <p style="color:#E8E8F0;font-size:16px;margin-bottom:8px;">
      Добро пожаловать, {username}!
    </p>
    <p style="color:#9999AA;font-size:14px;line-height:1.6;margin-bottom:16px;">
      Ваш аккаунт успешно создан. У вас есть <strong style="color:#E8E8F0;">7 дней
      бесплатного пробного периода</strong>, чтобы оценить все возможности бустера.
    </p>
    <p style="color:#9999AA;font-size:14px;line-height:1.6;margin-bottom:24px;">
      Скачайте клиент, выберите игру и играйте без лагов!
    </p>
    <div style="text-align:center;">
      <a href="{settings.frontend_url}/download"
         style="display:inline-block;background:#6C63FF;color:#fff;text-decoration:none;
                padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
        Скачать клиент
      </a>
    </div>
  </div>
</body>
</html>"""


async def send_password_reset_email(to: str, username: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    if not settings.smtp_host:
        logger.info("DEV MODE — reset link for %s: %s", to, reset_url)
        return
    html = render_password_reset_email(username, reset_url)
    await send_email(to, "PLGames — Сброс пароля", html)


async def send_welcome_email(to: str, username: str) -> None:
    html = render_welcome_email(username)
    await send_email(to, "PLGames — Добро пожаловать!", html)
