from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.promotion import Promotion
from app.schemas.promotion import PromotionCreate, PromotionUpdate

class PromotionService:
    @staticmethod
    def list_all(db: Session) -> list[Promotion]:
        return db.query(Promotion).all()

    @staticmethod
    def get_or_404(db: Session, promo_id: int) -> Promotion:
        promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
        if not promo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Promoção não encontrada"
            )
        return promo

    @staticmethod
    def create(db: Session, payload: PromotionCreate) -> Promotion:
        promo = Promotion(**payload.model_dump())
        db.add(promo)
        db.commit()
        db.refresh(promo)
        return promo

    @staticmethod
    def update(db: Session, promo_id: int, payload: PromotionUpdate) -> Promotion:
        promo = PromotionService.get_or_404(db, promo_id)
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(promo, key, value)
        db.commit()
        db.refresh(promo)
        return promo

    @staticmethod
    def delete(db: Session, promo_id: int) -> None:
        promo = PromotionService.get_or_404(db, promo_id)
        db.delete(promo)
        db.commit()

    @staticmethod
    def get_active_promotions(db: Session) -> list[Promotion]:
        """
        Retorna todas as promoções que estão ativas no exato momento,
        avaliando is_active, active_days, start_time e end_time.
        """
        now = datetime.now()
        current_day = str(now.weekday())  # 0=Monday ... 6=Sunday
        current_time = now.time()

        promotions = db.query(Promotion).filter(Promotion.is_active == True).all()
        
        active_promos = []
        for p in promotions:
            # Verifica dias ativos
            if p.active_days:
                days = [d.strip() for d in p.active_days.split(",") if d.strip()]
                if current_day not in days:
                    continue
            
            # Verifica horário
            if p.start_time and current_time < p.start_time:
                continue
            if p.end_time and current_time > p.end_time:
                continue
                
            active_promos.append(p)
            
        return active_promos
