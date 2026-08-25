import io

from fastapi import status
from app import crud, schemas
from app.core import security


def _make_user(db):
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="img@test.com",
            password="secret123",
            is_active=True,
            role_id=2,
            phone_numer="0340000099",
        ),
    )
    db.commit()
    token = security.create_access_token(sub={"id": str(user.id), "email": user.email})
    return user, token


def _png(name="a.png"):
    return ("images", (name, io.BytesIO(b"\x89PNG fake"), "image/png"))


def test_product_image_gallery(client, db):
    _, token = _make_user(db)
    headers = {"Authorization": f"Bearer {token}"}
    cat = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name="CatImg")
    )
    db.commit()
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            name="Produit Img",
            sku="IMG-1",
            category_id=cat.id,
            selling_price=1000,
            image="/No_Image_Available.jpg",
        ),
    )
    db.commit()
    product_id = product.id

    # Upload two gallery images at once
    resp = client.post(
        f"/api/v1/products/{product_id}/images",
        files=[_png("one.png"), _png("two.png")],
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    created = resp.json()
    assert len(created) == 2
    img1, img2 = created
    assert img1["position"] == 0 and img2["position"] == 1

    # List gallery
    resp = client.get(f"/api/v1/products/{product_id}/images", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["count"] == 2

    # Replace second image keeping position
    resp = client.put(
        f"/api/v1/products/{product_id}/images/{img2['id']}",
        files={"image": ("new.png", io.BytesIO(b"\x89PNG new"), "image/png")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    replaced = resp.json()
    assert replaced["id"] == img2["id"]
    assert replaced["image"] != img2["image"]
    assert replaced["position"] == 1

    # Set main image then delete it -> product falls back to remaining image
    db.add(product)
    product.image = replaced["image"]
    db.commit()

    resp = client.delete(
        f"/api/v1/products/{product_id}/images/{img2['id']}", headers=headers
    )
    assert resp.status_code == 200, resp.text
    product = db.get(type(product), product_id)
    remaining = crud.product_images.get_multi_by_product(db, product_id=product.id)
    expected = remaining[0].image if remaining else "/No_Image_Available.jpg"
    assert product.image == expected

    # Delete last one -> default placeholder
    if remaining:
        last_id = remaining[0].id
        remaining = None
        resp = client.delete(
            f"/api/v1/products/{product_id}/images/{last_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        product = db.get(type(product), product_id)
        assert product.image == "/No_Image_Available.jpg"

    # 404 on missing image
    resp = client.delete(f"/api/v1/products/{product.id}/images/999999", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND
