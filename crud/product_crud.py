from sqlalchemy.orm import Session
import models


def create_product(db: Session, data, image_url: str | None = None):
    # Com dataclasses, o construtor é gerado automaticamente.
    # Campos com init=False (como id e relationships) não devem ser passados aqui.
    product = models.Product(
        name=data.name,
        description=data.description,
        price=data.price,
        cost=data.cost,
        stock=data.stock,
        category_id=data.category_id,
        image_url=image_url
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def deactivate_product(db: Session, product_id: int):
    # No SQLAlchemy 2.0, usamos db.get() diretamente na sessão
    product = db.get(models.Product, product_id)

    if product:
        product.active = False
        db.commit()
        # Não é estritamente necessário dar refresh se você só vai retornar o objeto,
        # mas é uma boa prática se houver colunas calculadas no banco.
        db.refresh(product)

    return product