"""
test_products_endpoints.py — Testes de integração HTTP para /api/v1/products.

Cobre: GET /, POST /, GET /{id}, PATCH /{id}, DELETE /{id},
       POST /{id}/stock, GET /{id}/stock/logs, GET /low-stock.
"""

from decimal import Decimal

BASE = "/api/v1/products"


def _product_json(category_id: int, name: str = "Produto API") -> dict:
    return {
        "name": name,
        "description": "Desc",
        "price": "20.00",
        "category_id": category_id,
        "stock_quantity": 10,
        "stock_alert_threshold": 2,
        "is_visible": True,
        "is_available": True,
    }


class TestListProducts:
    def test_list_products_returns_200(self, client, sample_product):
        resp = client.get(BASE)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_products_only_visible(self, client, sample_product):
        products = client.get(BASE).json()
        assert all(p["is_visible"] for p in products)


class TestCreateProduct:
    def test_create_product_success(self, client, admin_token, sample_category):
        resp = client.post(
            BASE,
            json=_product_json(sample_category.id),
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Produto API"

    def test_create_product_requires_admin(self, client, atendente_token, sample_category):
        resp = client.post(
            BASE,
            json=_product_json(sample_category.id, "Bloqueado"),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403

    def test_create_product_invalid_category_returns_404(self, client, admin_token):
        resp = client.post(
            BASE,
            json=_product_json(category_id=99999, name="CatInvalida"),
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404


class TestGetProduct:
    def test_get_product_by_id(self, client, sample_product):
        resp = client.get(f"{BASE}/{sample_product.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == sample_product.id

    def test_get_nonexistent_product_returns_404(self, client):
        resp = client.get(f"{BASE}/99999")
        assert resp.status_code == 404


class TestUpdateProduct:
    def test_update_product_name(self, client, admin_token, sample_product):
        resp = client.patch(
            f"{BASE}/{sample_product.id}",
            json={"name": "Nome Atualizado"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Nome Atualizado"

    def test_update_requires_admin(self, client, atendente_token, sample_product):
        resp = client.patch(
            f"{BASE}/{sample_product.id}",
            json={"name": "Bloqueado"},
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403


class TestDeleteProduct:
    def test_delete_product_soft(self, client, admin_token, sample_product):
        resp = client.delete(
            f"{BASE}/{sample_product.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 204

        # Produto não deve aparecer na listagem pública
        list_resp = client.get(BASE)
        ids = [p["id"] for p in list_resp.json()]
        assert sample_product.id not in ids


class TestStockEndpoints:
    def test_adjust_stock_entrada(self, client, admin_token, sample_product, db):
        stock_before = sample_product.stock_quantity
        resp = client.post(
            f"{BASE}/{sample_product.id}/stock",
            json={"delta": 5, "operation": "entrada", "reason": "Reposição"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["stock_quantity"] == stock_before + 5

    def test_adjust_stock_insufficient_returns_409(self, client, admin_token, sample_product):
        resp = client.post(
            f"{BASE}/{sample_product.id}/stock",
            json={"delta": -9999, "operation": "saida", "reason": "Erro"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 409

    def test_stock_logs_returns_list(self, client, admin_token, sample_product):
        resp = client.get(
            f"{BASE}/{sample_product.id}/stock/logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_low_stock_returns_list(self, client, admin_token):
        resp = client.get(
            f"{BASE}/low-stock",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_stock_requires_admin(self, client, atendente_token, sample_product):
        resp = client.post(
            f"{BASE}/{sample_product.id}/stock",
            json={"delta": 1, "operation": "entrada", "reason": "Teste"},
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403
