#!/bin/bash

# Exécute les tests seulement si TESTING=1
if [ "$TESTING" -eq 1 ]; then
    echo "TESTING=1 → Suppression de test.db..."

    # Chemin du fichier test
    DB_FILE="test.db"

    # Supprimer test.db s'il existe
    if [ -f "$DB_FILE" ]; then
        echo "test.db trouvé → suppression..."
        rm -f "$DB_FILE"
    else
        echo "test.db non trouvé → rien à supprimer."
    fi

    echo "Lancement des tests..."
    pytest tests/ --cov=app -v

    if [ $? -ne 0 ]; then
        echo "Tests échoués, arrêt."
        exit 1
    fi

    echo "Tests réussis !"

else
    echo "TESTING=0 → Tests ignorés."
fi

# Exécu...
