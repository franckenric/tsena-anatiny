import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import type {
  PromoCode
} from "../types/promo";
import type { Column } from "../components/index";
import { promoCodesService } from "../services/promo-codes.service";
import { formatAr } from "../components/OrderFormComponent";
import {
  Card,
  Button,
  DataTable,
  Pagination,
  FloatingActionButton
} from "../components/index";
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";

export function PromoCodesPage() {
  const history = useHistory();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadPromoCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadPromoCodes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await promoCodesService.getPromoCodes(page, pageSize);
      setPromoCodes(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(`Supprimer le code « ${promo.code} » ?`)) return;
    try {
      setIsFormLoading(true);
      await promoCodesService.deletePromoCode(promo.id);
      setPromoCodes((prev) => prev.filter((c) => c.id !== promo.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const renderDiscount = (promo: PromoCode) =>
    promo.discount_type === "percent"
      ? `-${promo.discount_value}%`
      : `-${formatAr(promo.discount_value)}`;

  const columns: Column<PromoCode>[] = [
    {
      header: "Code",
      accessor: "code",
      render: (v) => (
        <span className="rounded-lg bg-brand/10 px-2 py-1 font-mono text-xs font-bold tracking-wider text-brand">
          {v}
        </span>
      ),
      width: "15%"
    },
    {
      header: "Remise",
      accessor: "discount_value",
      render: (_v, row) => (
        <span className="font-semibold text-ink">{renderDiscount(row)}</span>
      ),
      width: "15%"
    },
    {
      header: "Minimum",
      accessor: "min_order_amount",
      render: (v) => (v != null && v > 0 ? formatAr(v) : "-"),
      width: "15%"
    },
    {
      header: "Utilisations",
      accessor: "used_count",
      render: (v, row) => `${v ?? 0}${row.max_uses ? ` / ${row.max_uses}` : ""}`,
      width: "13%"
    },
    {
      header: "Validité",
      accessor: "expires_at",
      render: (_v, row) => {
        if (!row.starts_at && !row.expires_at) return "-";
        const fmt = (d?: string | null) =>
          d ? new Date(d).toLocaleDateString("fr-FR") : "…";
        return (
          <span className="text-xs text-muted">
            {fmt(row.starts_at)} → {fmt(row.expires_at)}
          </span>
        );
      },
      width: "17%"
    },
    {
      header: "Statut",
      accessor: "status",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            v === "active"
              ? "bg-success/20 text-success"
              : "bg-warning/20 text-warning"
          }`}
        >
          {v === "active" ? "Actif" : "Inactif"}
        </span>
      ),
      width: "10%"
    }
  ];

  return (
    <Layout title="Codes promo">
      <FloatingActionButton
        label="Nouveau code"
        onClick={() => history.push("/promo-codes/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <TicketPercent className="h-4 w-4" />
            </span>
            Gestion des codes promo
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Liste des codes promo"
          description={`Total: ${total} codes`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/promo-codes/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un code
            </Button>
          }
        >
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            showCount={false}
            itemLabel="codes promo"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={promoCodes}
            isLoading={isLoading}
            emptyMessage="Aucun code promo trouvé"
            gridCardRender={(promo) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-lg bg-brand/10 px-2 py-1 font-mono text-xs font-bold tracking-wider text-brand">
                      {promo.code}
                    </span>
                    <p className="mt-1.5 text-sm font-semibold text-ink">
                      {renderDiscount(promo)}
                      {promo.description ? (
                        <span className="ml-2 text-xs font-normal text-muted">
                          {promo.description}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Utilisé {promo.used_count ?? 0}
                      {promo.max_uses ? ` / ${promo.max_uses}` : ""} fois
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${promo.status === "active" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                  >
                    {promo.status === "active" ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            )}
            actions={(promo) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => history.push(`/promo-codes/${promo.id}/edit`)}
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
                  onClick={() => handleDelete(promo)}
                  title="Supprimer"
                  aria-label="Supprimer"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          />
        </Card>
      </div>
    </Layout>
  );
}
