from http import HTTPStatus

from jwt import decode

from security import create_access_token, settings


def teste_jwt():
    data = {'sub': 'testtoken@teste.com'}
    token = create_access_token(data)
    result = decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert result['sub'] == data['sub']
    assert result['exp']


def teste_jwt_invalid_token(client):
    response = client.delete('/users/1', headers={'Authorization': 'Bearer token-invalido'})

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json() == {'detail': 'Could not validate credentials'}
