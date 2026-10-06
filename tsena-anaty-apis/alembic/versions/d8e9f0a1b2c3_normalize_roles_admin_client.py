"""ramene les roles a super_admin + client

L'application ne connait plus que deux roles : `super_admin` et `client`.
Tout role residuel (ex. `commercial`) est supprime et ses utilisateurs sont
reattribues au role `client` — jamais l'inverse : un commercial ne devient
jamais admin.

Sur une base vierge la table `roles` est vide : la migration ne fait rien,
`init_db` cree `super_admin` (id=1) puis `client` (id=2) comme avant.

Revision ID: d8e9f0a1b2c3
Revises: b6c7d8e9f0a1
Create Date: 2026-10-06

"""
from alembic import op
import sqlalchemy as sa


revision = "d8e9f0a1b2c3"
down_revision = "b6c7d8e9f0a1"
branch_labels = None
depends_on = None

ADMIN_ROLE_NAME = "super_admin"
CLIENT_ROLE_NAME = "client"


def _load_roles(conn) -> list[tuple[int, str]]:
    rows = conn.execute(sa.text("SELECT id, name FROM roles ORDER BY id"))
    return [(int(row[0]), row[1]) for row in rows]


def _insert_role(conn, role_id: int, name: str) -> int:
    conn.execute(
        sa.text(
            "INSERT INTO roles (id, name, created_at) "
            "VALUES (:id, :name, CURRENT_TIMESTAMP)"
        ),
        {"id": role_id, "name": name},
    )
    return role_id


def upgrade() -> None:
    conn = op.get_bind()
    roles = _load_roles(conn)
    if not roles:
        # Base vierge : `init_db` seede les deux roles lui-meme.
        return

    ids = [role_id for role_id, _ in roles]
    admin_id = next((i for i, n in roles if n == ADMIN_ROLE_NAME), None)
    client_id = next((i for i, n in roles if n == CLIENT_ROLE_NAME), None)
    residual = [i for i, n in roles if n not in (ADMIN_ROLE_NAME, CLIENT_ROLE_NAME)]

    # 1. Le role client doit exister : c'est lui qui recoit les utilisateurs
    #    bascules depuis un role residuel.
    if client_id is None:
        if 2 in residual:
            # L'id canonique du client est deja pris par un role residuel :
            # on le rebaptise plutot que d'ajouter une ligne.
            conn.execute(
                sa.text("UPDATE roles SET name = :name WHERE id = 2"),
                {"name": CLIENT_ROLE_NAME},
            )
            client_id = 2
            residual.remove(2)
        elif 2 not in ids:
            client_id = _insert_role(conn, 2, CLIENT_ROLE_NAME)
        else:
            client_id = _insert_role(conn, max(ids) + 1, CLIENT_ROLE_NAME)

    # 2. Les utilisateurs des roles residuels deviennent clients.
    #    Avant toute suppression : `users.role_id` est une cle etrangere.
    if residual:
        in_clause = ", ".join(str(role_id) for role_id in residual)
        conn.execute(
            sa.text(
                f"UPDATE users SET role_id = :client WHERE role_id IN ({in_clause})"
            ),
            {"client": client_id},
        )
        conn.execute(sa.text(f"DELETE FROM roles WHERE id IN ({in_clause})"))
        ids = [role_id for role_id in ids if role_id not in residual]

    # 3. Le role admin doit exister.
    if admin_id is not None:
        return

    if 1 not in ids:
        _insert_role(conn, 1, ADMIN_ROLE_NAME)
        return

    # id=1 occupe par le seul role restant : c'est le role client. On echange
    # pour retrouver 1=super_admin / 2=client, les ids attendus par `init_db`
    # et par la diffusion des notifications (STAFF_ROLE_ID).
    role_1_name = conn.execute(
        sa.text("SELECT name FROM roles WHERE id = 1")
    ).scalar()
    if role_1_name == CLIENT_ROLE_NAME and 2 not in ids:
        conn.execute(
            sa.text("UPDATE roles SET name = :name WHERE id = 1"),
            {"name": ADMIN_ROLE_NAME},
        )
        new_client_id = _insert_role(conn, 2, CLIENT_ROLE_NAME)
        conn.execute(
            sa.text("UPDATE users SET role_id = :client WHERE role_id = 1"),
            {"client": new_client_id},
        )
    else:
        # Cas imprevu : on laisse un auto-increment libre plutot que de
        # violer les uniques (id, name).
        _insert_role(conn, max(ids) + 1, ADMIN_ROLE_NAME)


def downgrade() -> None:
    # Irreversible : les roles residuels supprimes (et leurs utilisateurs
    # bascules vers `client`) ne sont pas restaurables.
    pass
