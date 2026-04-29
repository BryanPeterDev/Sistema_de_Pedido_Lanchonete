from pydantic import BaseModel, ConfigDict, EmailStr


class Message(BaseModel):
    message: str


class UserSchema(BaseModel, EmailStr):
    username: str
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class UserList(BaseModel):
    users: list[UserPublic]


class Token(BaseModel):
    access_token: str
    token_type: str

#---# 


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: float
    cost: float
    stock: int
    category_id: int


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None
    price: float
    cost: float
    stock: int
    active: bool
    image_url: str | None
    category_id: int
    profit: float

    class Config:
        from_attributes = True

class ProductList(BaseModel):
    products: list[ProductResponse]


class ComboItem(BaseModel):
    product_id: int
    quantity: int


class ComboCreate(BaseModel):
    name: str
    description: str
    price: float
    items: list[ComboItem]


class ComboResponse(BaseModel):
    id: int
    name: str
    description: str
    price: float

    class Config:
        from_attributes = True