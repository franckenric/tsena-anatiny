import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import type { DeliveryZone } from "../types/delivery-zone";
import type { Column } from "../components/index";
import { deliveryZonesService } from "../services/delivery-zones.service";
import { formatAr } from "../components/OrderFormComponent";
import {
  Button,
  DataList,
  FloatingActionButton,
  StatusBadge
} from "../components/index";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { useDialog } from "../contexts/DialogContext";

export function DeliveryZonesPage() {
  const history = useHistory();
  const { confirm } = useDialog();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadZones = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await deliveryZonesService.getDeliveryZones(page, pageSize);
      setZones(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (zone: DeliveryZone) => {
    const confirmed = await confirm(`Supprimer la zone « ${zone.name} » ?`, {
      title: "Supprimer la zone",
      confirmLabel: "Supprimer",
      tone: "danger"
    });
    if (!confirmed) return;
    try {
      setIsFormLoading(true);
      await deliveryZonesService.deleteDeliveryZone(zone.id);
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    // Bascule d'un seul clic : desactiver retire la zone du choix client sans
    // effacer l'historique des commandes deja passees dessus.
    try {
      setIsFormLoading(true);
      const updated = await deliveryZonesService.updateDeliveryZone(zone.id, {
        is_active: !zone.is_active
      });
      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, ...updated } : z))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur mise à jour");
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<DeliveryZone>[] = [
    {
      header: "Zone",
      accessor: "name",
      render: (v) => (
        <span className="flex items-center gap-2 font-semibold text-ink">
          <MapPin className="h-4 w-4 shrink-0 text-brand" />
          {v}
        </span>
      ),
      width: "45%"
    },
    {
      header: "Tarif",
      accessor: "fee",
      render: (v) => (
        <span className="font-semibold text-ink">{formatAr(Number(v) || 0)}</span>
      ),
      width: "25%"
    },
    {
      header: "Statut",
      accessor: "is_active",
      render: (v) => (
        <StatusBadge tone={v ? "success" : "warning"} dot>
          {v ? "Active" : "Inactive"}
        </StatusBadge>
      ),
      width: "30%"
    }
  ];

  return (
    <Layout title="Zones de livraison">
      <FloatingActionButton
        label="Nouvelle zone"
        hideOnMobile
        onClick={() => history.push("/delivery-zones/new")}
      />
      <div className="animate-fade-up page-fill">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <DataList
          title="Tarifs de livraison proposés au client"
          itemLabel="zones"
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/delivery-zones/new")}
              aria-label="Ajouter une zone"
              title="Ajouter une zone"
              className="h-9 w-9 shrink-0 p-0 sm:h-12 sm:w-auto sm:px-5"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ajouter une zone</span>
            </Button>
          }
          columns={columns}
          data={zones}
          isLoading={isLoading}
          emptyMessage="Aucune zone de livraison trouvée"
          emptyTitle="Aucune zone de livraison"
          emptyIcon={<MapPin className="h-6 w-6" />}
          gridCardRender={(zone) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {zone.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Tarif : {formatAr(Number(zone.fee) || 0)}
                  </p>
                </div>
                <StatusBadge tone={zone.is_active ? "success" : "warning"} dot>
                  {zone.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              </div>
            </div>
          )}
          actions={(zone) => (
            <>
              <Button
                size="sm"
                variant={zone.is_active ? "secondary" : "primary"}
                disabled={isFormLoading}
                onClick={() => handleToggleActive(zone)}
                title={zone.is_active ? "Désactiver" : "Activer"}
                aria-label={zone.is_active ? "Désactiver" : "Activer"}
              >
                {zone.is_active ? "Désactiver" : "Activer"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isFormLoading}
                onClick={() => history.push(`/delivery-zones/${zone.id}/edit`)}
                title="Modifier"
                aria-label="Modifier"
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={isFormLoading}
                onClick={() => handleDelete(zone)}
                title="Supprimer"
                aria-label="Supprimer"
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        />
      </div>
    </Layout>
  );
}
