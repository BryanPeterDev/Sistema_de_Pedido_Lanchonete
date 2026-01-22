from http import HTTPStatus

from schemas import UserPublic


def test_create_user(client):
    response = client.post(
        '/users/', json={'username': 'testusernmae', 'email': 'email@asd.com', 'password': 'password123'})

    assert response.status_code == HTTPStatus.CREATED
    assert response.json() == {'username': 'testusernmae',
                               'email': 'email@asd.com', 'id': 1}


def test_read_users(client):
    response = client.get('/users/')

    assert response.status_code == HTTPStatus.OK
    assert response.json() == {'users': []}


def test_read_user_with_users(client, user):
    user_schema = UserPublic.model_validate(user).model_dump()
    response = client.get('/users/')

    assert response.status_code == HTTPStatus.OK
    assert response.json() == {'users': [user_schema]}


def test_update_user(client, user, token):
    response = client.put(
        f'/users/{user.id}', headers={'Authorization': f'Bearer {token}'},
        json={'username': 'test2', 'email': 'email@asd.com', 'password': '123', 'id': user.id})

    assert response.json() == {'username': 'test2',
                               'email': 'email@asd.com', 'id': user.id}  

def test_update_user_with_wrong_user(client, other_user, token):
    response = client.put(
        f'/users/{other_user.id}', headers={'Authorization': f'Bearer {token}'},
        json={'username': 'test2', 'email': 'email@asd.com', 'password': '123'},
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    assert response.json() == {'detail':'Not enough permissions'}


def test_delete_user(client, user, token):
    response = client.delete(
        f'/users/{user.id}', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == HTTPStatus.OK
    assert response.json() == {'message': 'user Delete'}


def test_delete_wrong_user(client, other_user, token):
    response = client.delete(
        f'/users/{other_user.id}', headers={'Authorization': f'Bearer {token}'})

    assert response.status_code == HTTPStatus.FORBIDDEN
    assert response.json() == {'detail': 'Not enough permissions'}
