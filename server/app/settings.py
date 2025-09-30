from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    node_env: str = "development"
    public_api_base: str = "http://localhost:3001"

    CLOUDPUB_SERVER_URL: str | None = None
    CLOUDPUB_CLIENT_URL: str | None = None
    CLOUDPUB_ADMIN_URL: str | None = None

    @property
    def api_base(self) -> str:
        base_url = self.CLOUDPUB_SERVER_URL or self.public_api_base or "http://localhost:3001"
        return base_url.rstrip("/")

    @property
    def cors_origins(self) -> List[str]:
        origins: List[str] = []
        if self.CLOUDPUB_CLIENT_URL:
            origins.append(self.CLOUDPUB_CLIENT_URL)
        if self.CLOUDPUB_ADMIN_URL and self.CLOUDPUB_ADMIN_URL not in origins:
            origins.append(self.CLOUDPUB_ADMIN_URL)
        origins.extend([
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
        ])
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
