# Durcissement du serveur (DOCKER-USER)

## Contexte

Le VPS `15.204.89.37` (hôte `ubuntu-DEV`) héberge plusieurs projets derrière le
conteneur nginx `main-proxy`. UFW était **inactif** et l'hôte n'avait aucune
règle de filtrage : **tous les ports publiés par Docker étaient joignables
depuis Internet**, notamment :

| Port | Service |
|------|---------|
| 3306 | MariaDB |
| 5432 | PostgreSQL |
| 27017 / 27018 | MongoDB |
| 9080 / 9081 / 9082 | phpMyAdmin / pgAdmin / mongo-express |
| 2003 | API Tsena |
| 5175 / 5176 | serveurs de dev Vite |
| 2025-2028 | autres projets |

## Pourquoi UFW ne suffit pas

Docker publie ses ports via des règles `nat`/`FORWARD` et **contourne les règles
`INPUT` d'UFW**. Le seul point d'accroche fiable est le chaînage `DOCKER-USER`,
évalué avant les règles de Docker.

## Correctif

1. UFW est activé (politique entrante `deny`, sortante `allow`, ports 22/80/443
   autorisés, `DEFAULT_FORWARD_POLICY="ACCEPT"` pour ne pas casser Docker).
2. Les règles `DOCKER-USER` (IPv4 + IPv6) n'autorisent depuis l'interface
   publique que :
   - le trafic de retour (`RELATED,ESTABLISHED`),
   - HTTP/HTTPS (`80,443`),
   et **bloquent tout le reste**.

## Installation

```bash
sudo install -m 0755 docker-user-hardening.sh /usr/local/sbin/docker-user-hardening.sh
sudo install -m 0644 docker-user-hardening.service /etc/systemd/system/docker-user-hardening.service
sudo systemctl daemon-reload
sudo systemctl enable --now docker-user-hardening.service
```

Le service est `After=docker.service` : les règles sont donc réappliquées après
un redémarrage de Docker ou de la machine (Docker recrée `DOCKER-USER` à son
démarrage, ce qui efface les règles).

## Vérification

```bash
sudo iptables  -S DOCKER-USER
sudo ip6tables -S DOCKER-USER
```

Attendu (4 règles par famille) : `RELATED,ESTABLISHED RETURN`,
`80,443 RETURN`, `DROP`, puis le `RETURN` final de Docker.

Depuis l'extérieur, seuls 80/443 doivent répondre.

## Note

L'API Tsena joint MariaDB via l'IP publique de l'hôte
(`MYSQL_SERVER=15.204.89.37`, « hairpin » NAT). Ce trafic arrive par le bridge
Docker et n'est donc **pas** concerné par les règles `-i ens3` : le site reste
fonctionnel. Une amélioration possible (non appliquée) serait de pointer
`MYSQL_SERVER` vers le nom de service interne `mariadb`.
