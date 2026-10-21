"""repair orphan out_stock movements missing lot attribution

Les lignes de vente creees alors que le stock avait ete recu au niveau
produit (variante NULL) n'etaient rattachees a aucun lot (lot_id NULL) :
le "Total vendu" du lot sous-comptait ces ventes. On rattache ces
sorties au lot de reception du produit, uniquement lorsque le produit
ne possede qu'un seul lot de reception (attribution sans ambiguite).

Revision ID: b8e4f2a1c3d7
Revises: i1a2b3c4d5e6
Create Date: 2026-10-21 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b8e4f2a1c3d7"
down_revision = "i1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Les types d'enum sont persistes sous forme de nom de membre :
    # TypeEnum.in_stoct s'ecrit 'in_stoct' en base, TypeEnum.out_stock
    # s'ecrit 'out_stock'.
    products = bind.execute(
        sa.text(
            """
            SELECT DISTINCT product_id
            FROM stock_movements
            WHERE type = 'out_stock'
              AND lot_id IS NULL
              AND commande_id IS NOT NULL
            """
        )
    ).fetchall()

    for product_row in products:
        lots = bind.execute(
            sa.text(
                """
                SELECT DISTINCT lot_id
                FROM stock_movements
                WHERE product_id = :product_id
                  AND type = 'in_stoct'
                  AND lot_id IS NOT NULL
                """
            ),
            {"product_id": product_row.product_id},
        ).fetchall()

        if len(lots) != 1:
            continue

        bind.execute(
            sa.text(
                """
                UPDATE stock_movements
                SET lot_id = :lot_id
                WHERE product_id = :product_id
                  AND type = 'out_stock'
                  AND lot_id IS NULL
                  AND commande_id IS NOT NULL
                """
            ),
            {"lot_id": lots[0].lot_id, "product_id": product_row.product_id},
        )


def downgrade() -> None:
    # Une attribution reparee n'est pas distinguable d'une attribution
    # d'origine : l'annulation casserait le "Total vendu" des ventes
    # rattachees, aucun retour en arriere n'est possible.
    pass
