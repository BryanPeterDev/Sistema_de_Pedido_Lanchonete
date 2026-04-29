from sqlalchemy.orm import Session
import models

def create_combo(db: Session, combo_data):
    # 1. Criamos a lista de objetos ComboProduct primeiro
    # Nota: Não precisamos de combo_id aqui, o SQLAlchemy resolverá isso
    items_list = [
        models.ComboProduct(
            product_id=item.product_id,
            quantity=item.quantity
        )
        for item in combo_data.items
    ]

    # 2. Criamos o Combo injetando a lista de itens diretamente
    # Como definimos 'items' como uma relação no modelo, o SQLAlchemy faz o vínculo
    combo = models.Combo(
        name=combo_data.name,
        description=combo_data.description,
        price=combo_data.price,
        items=items_list  # Relacionamento preenchido na criação
    )

    # 3. Um único add e commit resolve toda a estrutura (Combo + Itens)
    db.add(combo)
    db.commit()
    db.refresh(combo)

    return combo