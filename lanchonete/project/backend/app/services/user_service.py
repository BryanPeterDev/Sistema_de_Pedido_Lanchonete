from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserUpdate, UserUpdateRole
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class UserService:
    @staticmethod
    def list_all(db: Session, role: str | None = None) -> list[User]:
        q = db.query(User)
        if role:
            q = q.filter(User.role == role)
        return q.order_by(User.name).all()

    @staticmethod
    def get_or_404(db: Session, user_id: int) -> User:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado"
            )
        return user

    @staticmethod
    def update(db: Session, user_id: int, payload: UserUpdate) -> User:
        user = UserService.get_or_404(db, user_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_role(db: Session, user_id: int, payload: UserUpdateRole) -> User:
        user = UserService.get_or_404(db, user_id)
        user.role = payload.role
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def toggle_active(db: Session, user_id: int) -> User:
        user = UserService.get_or_404(db, user_id)
        user.is_active = not user.is_active
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def reset_password(db: Session, user_id: int, new_password: str) -> None:
        user = UserService.get_or_404(db, user_id)
        user.hashed_password = hash_password(new_password)
        db.commit()
