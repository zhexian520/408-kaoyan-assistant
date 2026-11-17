import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "408 计算机考研智能体引擎"
    APP_VERSION: str = "1.0.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # MySQL Database Config
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 3306))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "123456")
    DB_NAME: str = os.getenv("DB_NAME", "mcs_postgrad_helper")
    
    # LLM API Config (Supports DeepSeek, Qwen, OpenAI, etc.)
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek-chat")

    # 与 Java 主项目共享的 JWT 密钥（用于校验前端登录态）
    MCS_JWT_SECRET: str = os.getenv("MCS_JWT_SECRET", "mcs_postgrad_helper_jwt_secret_key_2026_super_safe_token!")
    # Java 内部调用 Python 服务时使用的服务间令牌
    INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "mcs-internal-2026")
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

