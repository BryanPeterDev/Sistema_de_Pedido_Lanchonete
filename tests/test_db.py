from sqlalchemy import select

from models import User


def test_create_user(session):

    user = User(username='teste1', password='senhadb2',
                email='testeddb@gami2l.com')

    session.add(user)
    session.commit()

    result = session.scalar(select(User).where(
        User.email == 'testeddb@gami2l.com'))

    assert result.username == 'teste1'
