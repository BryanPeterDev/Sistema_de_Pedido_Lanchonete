"""
test_orders_endpoints.py — Testes de integração HTTP para /api/v1/orders.

Cobre: GET /, POST /, GET /{id}, PUT /{id}, PATCH /{id}/status.
"""

BASE = "/api/v1/orders"


def _order_json(product_id: int, order_type: str = "local") -> dict:
    return {
        "customer_name": "Cliente Teste",
        "customer_phone": "11988887777",
        "customer_address": "Rua B, 50" if order_type == "delivery" else None,
        "order_type": order_type,
        "payment_method": "pix",
        "notes": None,
        "items": [{"product_id": product_id, "quantity": 1, "notes": None}],
    }


class TestCreateOrder:
    def test_create_order_success(self, client, atendente_token, sample_product):
        resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["customer_name"] == "Cliente Teste"
        assert data["status"] == "recebido"

    def test_create_order_requires_atendente(self, client, motoboy_token, sample_product):
        resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {motoboy_token}"},
        )
        assert resp.status_code == 403

    def test_create_order_without_token_returns_401(self, client, sample_product):
        resp = client.post(BASE, json=_order_json(sample_product.id))
        assert resp.status_code == 401

    def test_create_delivery_order_returns_delivery(self, client, atendente_token, sample_product):
        resp = client.post(
            BASE,
            json=_order_json(sample_product.id, order_type="delivery"),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 201


class TestListOrders:
    def test_list_orders_returns_200(self, client, atendente_token, atendente_user, sample_product):
        client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        resp = client.get(BASE, headers={"Authorization": f"Bearer {atendente_token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_orders_filter_by_status(self, client, atendente_token, sample_product):
        resp = client.get(
            f"{BASE}?order_status=recebido",
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 200
        for order in resp.json():
            assert order["status"] == "recebido"


class TestGetOrder:
    def test_get_order_by_id(self, client, atendente_token, sample_product):
        create_resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        order_id = create_resp.json()["id"]

        resp = client.get(f"{BASE}/{order_id}", headers={"Authorization": f"Bearer {atendente_token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == order_id

    def test_get_nonexistent_order_returns_404(self, client, atendente_token):
        resp = client.get(f"{BASE}/99999", headers={"Authorization": f"Bearer {atendente_token}"})
        assert resp.status_code == 404


class TestUpdateOrder:
    def test_update_order_success(self, client, atendente_token, admin_token, sample_product):
        create_resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        order_id = create_resp.json()["id"]

        update_payload = {
            "customer_name": "Cliente Editado",
            "customer_phone": "11977776666",
            "customer_address": None,
            "order_type": "local",
            "payment_method": "dinheiro",
            "notes": "Observação",
            "edit_note": "Correção",
            "items": [{"product_id": sample_product.id, "quantity": 2, "notes": None}],
        }
        resp = client.put(
            f"{BASE}/{order_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["customer_name"] == "Cliente Editado"
        assert resp.json()["is_edited"] is True


class TestUpdateOrderStatus:
    def test_update_status_to_preparando(self, client, atendente_token, sample_product):
        create_resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        order_id = create_resp.json()["id"]

        resp = client.patch(
            f"{BASE}/{order_id}/status",
            json={"status": "preparando"},
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "preparando"

    def test_invalid_transition_returns_409(self, client, atendente_token, sample_product):
        create_resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        order_id = create_resp.json()["id"]

        resp = client.patch(
            f"{BASE}/{order_id}/status",
            json={"status": "entregue"},  # pula etapas
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 409

    def test_admin_can_cancel_order(self, client, admin_token, atendente_token, sample_product):
        create_resp = client.post(
            BASE,
            json=_order_json(sample_product.id),
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        order_id = create_resp.json()["id"]

        resp = client.patch(
            f"{BASE}/{order_id}/status",
            json={"status": "cancelado"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelado"
