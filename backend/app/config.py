from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "dovatech"
    logo_path: str = "./assets/Logo.png"
    # Comma-separated list of origins allowed to call the API from a browser,
    # e.g. "https://dovatech.vercel.app,http://localhost:3000". "*" allows any.
    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()] or ["*"]


settings = Settings()
