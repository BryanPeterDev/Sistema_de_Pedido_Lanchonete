"""
test_categories_endpoints.py — Testes de integração HTTP para /api/v1/categories.

Cobre: GET /, POST /, GET /{id}, PATCH /{id}, DELETE /{id}.
"""

BASE = "/api/v1/categories"


class TestListCategories:
    def test_list_categories_returns_200(self, client, sample_category):
        resp = client.get(BASE)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_only_active_by_default(self, client, sample_category):
        resp = client.get(BASE)
        for cat in resp.json():
            assert cat["is_active"] is True


class TestCreateCategory:
    def test_create_category_success(self, client, admin_token):
        resp = client.post(
            BASE,
            json={"name": "Nova Cat API", "is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Nova Cat API"

    def test_create_category_requires_admin(self, client, atendente_token):
        resp = client.post(
            BASE,
            json={"name": "Sem Permissão"},
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403

    def test_create_duplicate_category_returns_409(self, client, admin_token, sample_category):
        resp = client.post(
            BASE,
            json={"name": sample_category.name},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 409


class TestGetCategory:
    def test_get_category_by_id(self, client, sample_category):
        resp = client.get(f"{BASE}/{sample_category.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == sample_category.id

    def test_get_nonexistent_category_returns_404(self, client):
        resp = client.get(f"{BASE}/99999")
        assert resp.status_code == 404


class TestUpdateCategory:
    def test_update_category_name(self, client, admin_token, sample_category):
        resp = client.patch(
            f"{BASE}/{sample_category.id}",
            json={"name": "Atualizado Via API"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Atualizado Via API"

    def test_update_requires_admin(self, client, atendente_token, sample_category):
        resp = client.patch(
            f"{BASE}/{sample_category.id}",
            json={"name": "Bloqueado"},
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403


class TestDeleteCategory:
    def test_delete_category_without_products(self, client, admin_token, db):
        from app.models.category import Category

        cat = Category(name="ParaDeletar_API", is_active=True)
        db.add(cat)
        db.commit()
        db.refresh(cat)

        resp = client.delete(
            f"{BASE}/{cat.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 204

    def test_delete_category_with_products_returns_409(self, client, admin_token, sample_category, sample_product):
        resp = client.delete(
            f"{BASE}/{sample_category.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 409
