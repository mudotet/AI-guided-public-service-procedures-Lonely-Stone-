from app.config import Settings


def test_neon_postgres_url_uses_installed_psycopg3_driver() -> None:
    settings = Settings(database_url="postgresql://user:pass@host/db", _env_file=None)
    assert settings.database_url == "postgresql+psycopg://user:pass@host/db"


def test_neo_connection_overrides_local_database_url() -> None:
    settings = Settings(
        database_url="postgresql://local/db",
        neo_connection="postgresql://neon/db?sslmode=require",
        _env_file=None,
    )
    assert settings.database_url == "postgresql+psycopg://neon/db?sslmode=require"
