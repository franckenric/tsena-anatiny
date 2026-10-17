#!/usr/bin/env bash
# Restreint les ports publies par Docker : seuls 80/443 restent joignables depuis Internet.
#
# Pourquoi DOCKER-USER et pas UFW ? Docker ecrit ses propres regles NAT/FORWARD et
# contourne donc les regles INPUT d'UFW. Le chain DOCKER-USER, lui, est consulte avant
# les regles Docker et permet de filtrer le trafic entrant vers les ports publies.
#
# Rejouable : reconstruit le chain de facon deterministe (idempotent).
set -euo pipefail

IFACE="${HARDEN_IFACE:-ens3}"

echo "[docker-user-hardening] application sur DOCKER-USER (interface $IFACE)"

apply_family() {
  local T="$1"
  "$T" -N DOCKER-USER 2>/dev/null || true
  "$T" -F DOCKER-USER 2>/dev/null || true
  # 1. Autoriser le trafic de retour des connexions initiees par les conteneurs/hote.
  "$T" -I DOCKER-USER 1 -i "$IFACE" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
  # 2. Autoriser HTTP/HTTPS publics (nginx).
  "$T" -I DOCKER-USER 2 -i "$IFACE" -p tcp -m multiport --dports 80,443 -j RETURN
  # 3. Bloquer tout autre flux entrant vers un port publie (BDD, admin, dev...).
  "$T" -I DOCKER-USER 3 -i "$IFACE" -j DROP
  # 4. Comportement Docker par defaut pour le reste.
  "$T" -A DOCKER-USER -j RETURN
}

apply_family iptables
apply_family ip6tables

echo "[docker-user-hardening] termine"