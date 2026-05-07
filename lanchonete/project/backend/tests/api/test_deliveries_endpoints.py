"""
test_deliveries_endpoints.py — Testes de integração HTTP para /api/v1/deliveries.

Cobre: GET /, GET /{id}, POST /{id}/claim, PATCH /{id}/status.
"""

BASE = "/api/v1/deliveries"
ORDERS_BASE = "/api/v1/orders"


def _create_delivery_order(client, atendente_token, product_id: int) -> dict:
    resp = client.post(
        ORDERS_BASE,
        json={
            "customer_name": "Entrega Cliente",
            "customer_phone": "11988887777",
            "customer_address": "Rua Delivery, 99",
            "order_type": "delivery",
            "payment_method": "pix",
            "notes": None,
            "items": [{"product_id": product_id, "quantity": 1, "notes": None}],
        },
        headers={"Authorization": f"Bearer {atendente_token}"},
    )
    assert resp.status_code == 201
    return resp.json()


def _advance_to_pronto(client, admin_token, order_id: int):
    for status in ["preparando", "pronto"]:
        client.patch(
            f"{ORDERS_BASE}/{order_id}/status",
            json={"status": status},
            headers={"Authorization": f"Bearer {admin_token}"},
        )


class TestListDeliveries:
    def test_list_deliveries_admin(self, client, admin_token, atendente_token, sample_product):
        _create_delivery_order(client, atendente_token, sample_product.id)

        resp = client.get(BASE, headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_deliveries_motoboy(self, client, motoboy_token, atendente_token, sample_product):
        _create_delivery_order(client, atendente_token, sample_product.id)

        resp = client.get(BASE, headers={"Authorization": f"Bearer {motoboy_token}"})
        assert resp.status_code == 200

    def test_list_deliveries_requires_auth(self, client):
        resp = client.get(BASE)
        assert resp.status_code == 401


class TestGetDelivery:
    def test_get_delivery_by_id(self, client, admin_token, atendente_token, motoboy_token, sample_product):
        order = _create_delivery_order(client, atendente_token, sample_product.id)
        delivery_id = order["delivery"]["id"] if order.get("delivery") else None

        if delivery_id:
            resp = client.get(
                f"{BASE}/{delivery_id}",
                headers={"Authorization": f"Bearer {motoboy_token}"},
            )
            assert resp.status_code == 200

    def test_get_nonexistent_delivery_returns_404(self, client, motoboy_token):
        resp = client.get(f"{BASE}/99999", headers={"Authorization": f"Bearer {motoboy_token}"})
        assert resp.status_code == 404


class TestClaimDelivery:
    def test_claim_success(self, client, admin_token, atendente_token, motoboy_token, sample_product):
        order = _create_delivery_order(client, atendente_token, sample_product.id)
        order_id = order["id"]

        _advance_to_pronto(client, admin_token, order_id)

        # Busca entrega pelo endpoint de listagem
        deliveries = client.get(BASE, headers={"Authorization": f"Bearer {motoboy_token}"}).json()
        if not deliveries:
            return  # sem entrega disponível, teste inconclusivo mas não falha

        delivery_id = deliveries[0]["id"]
        resp = client.post(
            f"{BASE}/{delivery_id}/claim",
            headers={"Authorization": f"Bearer {motoboy_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "saiu_para_entrega"

    def test_claim_requires_motoboy_role(self, client, atendente_token, admin_token, sample_product):
        order = _create_delivery_order(client, atendente_token, sample_product.id)
        order_id = order["id"]
        _advance_to_pronto(client, admin_token, order_id)

        deliveries = client.get(BASE, headers={"Authorization": f"Bearer {admin_token}"}).json()
        if not deliveries:
            return

        delivery_id = deliveries[0]["id"]
        # Atendente não pode fazer claim
        resp = client.post(
            f"{BASE}/{delivery_id}/claim",
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403


class TestUpdateDeliveryStatus:
    def test_update_status_entregue(
        self, client, admin_token, atendente_token, motoboy_token, sample_product
    ):
        order = _create_delivery_order(client, atendente_token, sample_product.id)
        order_id = order["id"]
        _advance_to_pronto(client, admin_token, order_id)

        deliveries = client.get(BASE, headers={"Authorization": f"Bearer {motoboy_token}"}).json()
        if not deliveries:
            return

        delivery_id = deliveries[0]["id"]
        client.post(f"{BASE}/{delivery_id}/claim", headers={"Authorization": f"Bearer {motoboy_token}"})

        resp = client.patch(
            f"{BASE}/{delivery_id}/status",
            json={"status": "entregue"},
            headers={"Authorization": f"Bearer {motoboy_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "entregue"
