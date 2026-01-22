from http import HTTPStatus
from freezegun import freeze_time

def test_get_token(client, user):
    response = client.post('/auth/token', data={'username': user.email, 'password': user.clean_password})

    token = response.json()

    assert response.status_code == HTTPStatus.OK
    assert token['token_type'] == 'Bearer'
    assert 'access_token' in token

def test_token_expired_after_time(client,user):
    with freeze_time('2026-01-19 10:00:00'):
        response = client.post('/auth/token',data={'username':user.email,'password':user.clean_password},)
        assert response.status_code == HTTPStatus.OK
        token = response.json()['access_token']

    with freeze_time('2026-01-19 10:31:00'):
        response = client.put(f'/users/{user.id}',headers={'Authorization':f'Bearer {token}'},
        json={'username':'tantofaz','email':'tantofaz@gmail.com','password':'tantofaz'})
        assert response.status_code == HTTPStatus.UNAUTHORIZED            
        assert response.json() == {'detail':'Could not validate credentials'}

def  test_token_wrong_password(client,user):
    response = client.post('/auth/token',data={'username':user.email,'password':'wrong_password'})
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json() == {'detail': 'EMAIL OU SENHA INCORRETA'}

def  test_token_wrong_email(client,user):
    response = client.post('/auth/token',data={'username':'wrong_email','password': user.clean_password})
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json() == {'detail': 'EMAIL OU SENHA INCORRETA'}


def test_refresh_token(client,token):
    response = client.post(
        '/auth/refresh_token', 
        headers={'Authorization': f'Bearer {token}'},
    )
    data = response.json()

    assert response.status_code == HTTPStatus.OK
    assert 'access_token' in data 
    assert 'token_type' in data
    assert data['token_type'] == 'bearer'

def test_token_expired_dont_refresh(client,user):
    with freeze_time('2026-01-19 10:00:00'):
        response = client.post('/auth/token',data={'username':user.email,'password':user.clean_password},)
        assert response.status_code == HTTPStatus.OK
        token = response.json()['access_token']

    with freeze_time('2026-01-19 10:31:00'):
        response = client.put(f'/users/refresh_token',headers={'Authorization':f'Bearer {token}'},
        json={'username':'tantofaz','email':'tantofaz@gmail.com','password':'tantofaz'})
        assert response.status_code == HTTPStatus.UNAUTHORIZED            
        assert response.json() == {'detail':'Could not validate credentials'}
