import os
import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session # Ajuste conforme seu caminho
from models import Product
from schemas import ProductCreate, ProductResponse, Message,ProductList

router = APIRouter(prefix='/products', tags=['products'])

# Definição dos tipos anotados para facilitar o reuso
T_Session = Annotated[Session, Depends(get_session)]

UPLOAD_DIR = "uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post('/', status_code=HTTPStatus.CREATED, response_model=ProductResponse)
async def create_product(
    session: T_Session,
    name: str = Form(...),
    price: float = Form(...),
    cost: float = Form(...),
    stock: int = Form(...),
    category_id: int = Form(...),
    description: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    # Verifica se já existe produto com esse nome
    db_product = session.scalar(select(Product).where(Product.name == name))
    if db_product:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST, 
            detail='Produto com este nome já existe'
        )

    image_path = None
    if image:
        extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{extension}"
        image_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        content = await image.read()
        with open(image_path, "wb") as buffer:
            buffer.write(content)

    new_product = Product(
        name=name,
        price=price,
        cost=cost,
        stock=stock,
        category_id=category_id,
        description=description,
        image_url=image_path
    )

    session.add(new_product)
    session.commit()
    session.refresh(new_product)
    return new_product


@router.get('/', response_model=ProductList)
def read_products(session: T_Session, limit: int = 10, skip: int = 0):
    products = session.scalars(select(Product).limit(limit).offset(skip)).all()
    return {'products': products}


@router.get('/{product_id}', response_model=ProductResponse)
def get_product(product_id: int, session: T_Session):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, 
            detail='Produto não encontrado'
        )
    return db_product


@router.delete('/{product_id}', response_model=Message)
def delete_product(product_id: int, session: T_Session):
    db_product = session.get(Product, product_id)
    
    if not db_product:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, 
            detail='Produto não encontrado'
        )

    session.delete(db_product)
    session.commit()
    return {'message': 'Produto deletado com sucesso'}