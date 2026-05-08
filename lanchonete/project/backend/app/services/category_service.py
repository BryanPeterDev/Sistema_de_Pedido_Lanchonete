from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class CategoryService:
    @staticmethod
    def list_all(db: Session, only_active: bool = True) -> list[Category]:
        q = db.query(Category)
        if only_active:
            q = q.filter(Category.is_active == True)  # noqa: E712
        return q.order_by(Category.name).all()

    @staticmethod
    def get_or_404(db: Session, category_id: int) -> Category:
        cat = db.get(Category, category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada"
            )
        return cat

    @staticmethod
    def create(db: Session, payload: CategoryCreate) -> Category:
        if db.query(Category).filter(Category.name == payload.name).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Categoria já existe")
        cat = Category(**payload.model_dump())
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return cat

    @staticmethod
    def update(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
        cat = CategoryService.get_or_404(db, category_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(cat, field, value)
        db.commit()
        db.refresh(cat)
        return cat

    @staticmethod
    def delete(db: Session, category_id: int) -> None:
        cat = CategoryService.get_or_404(db, category_id)
        
        # Desvincula produtos automaticamente
        from app.models.product import Product
        db.query(Product).filter(Product.category_id == category_id).update({Product.category_id: None})
        
        db.delete(cat)
        db.commit()
