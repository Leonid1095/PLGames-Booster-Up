from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "plgames"
    postgres_user: str = "plgames"
    postgres_password: str = "changeme"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "changeme-secret"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]

    # PLG Relay
    relay_api_key: str = "changeme-relay-key"
    relay_port: int = 443

    # DonatePay
    donatepay_api_key: str = ""
    donatepay_webhook_secret: str = ""

    # Domain
    domain: str = ""

    # Relay node IPs (for seed data)
    relay_de_public_ip: str = ""
    relay_se_public_ip: str = ""
    relay_us_public_ip: str = ""
    relay_lv_public_ip: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
