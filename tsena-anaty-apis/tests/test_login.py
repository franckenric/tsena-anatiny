# begin #
# ---write your code here--- #
# end #


from app import crud
from app import schemas
from app.core import security
from fastapi import status


def test_login_access_token(client, db):
    # Create a test user with hashed password
    password = "securepassword123"
    create_data = schemas.UsersCreate(
        email='testlogin@example.com',
        password='securepassword123',
        is_active=True,
        role_id=19,
        phone_numer='imX6YZiTnA',
    )
    user = crud.users.create(db=db, obj_in=create_data)

    # Verify user was created correctly
    assert user is not None
    assert user.is_active == True
    assert user.role_id == 19
    assert user.phone_numer == 'imX6YZiTnA'
    assert security.verify_password(password, user.hashed_password)

    # Debug: Try authenticating directly
    authenticated_user = crud.users.authenticate(
        db, email='testlogin@example.com', password=password
    )
    assert authenticated_user is not None  # This might fail

    # Test login endpoint
    response = client.post(
        "/api/v1/login/access-token",
        data={
            "username": user.email,
            "password": password,
            "grant_type": "password"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()


# begin #
# ---write your code here--- #
# end #
