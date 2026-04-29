from pydantic import BaseModel, ConfigDict


class AppModel(BaseModel):
    """Base para todos os schemas. Lê atributos do ORM automaticamente."""

    model_config = ConfigDict(from_attributes=True)
