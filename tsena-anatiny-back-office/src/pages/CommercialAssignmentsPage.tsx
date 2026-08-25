import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import type { CommercialAssignment } from "../types/operations";
import type { Column } from "../components/index";
import { assignmentsService } from "../services/operations.service";
import {
  Card,
  Button,
  DataTable,
  Pagination,
  FloatingActionButton
} from "../components/index";
import { Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";

export function CommercialAssignmentsPage() {
  const history = useHistory();
  const [assignments, setAssignments] = useState<CommercialAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await assignmentsService.getAssignments(page, pageSize);
      setAssignments(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (a: CommercialAssignment) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    try {
      setIsFormLoading(true);
      await assignmentsService.deleteAssignment(a.id);
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<CommercialAssignment>[] = [
    {
      header: "Commercial",
      accessor: "user_id",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`,
      width: "30%"
    },
    {
      header: "Produit",
      accessor: "product_id",
      render: (_, r) => r.product?.name ?? `#${r.product_id}`,
      width: "30%"
    },
    {
      header: "SKU",
      accessor: "product_id",
      render: (_, r) => r.product?.sku ?? "-",
      width: "20%"
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "15%",
      render: (v) => <span className="font-semibold">{v}</span>
    }
  ];

  return (
    <Layout
      title="Affectations commerciales"
    >
      <FloatingActionButton
        label="Nouvelle affectation"
        onClick={() => history.push("/commercial-assignments/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Handshake className="h-4 w-4" />
            </span>
            Gestion des affectations
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Affectations"
          description={`Total: ${total} affectations`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/commercial-assignments/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle affectation
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
            itemLabel="affectations"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={assignments}
            isLoading={isLoading}
            emptyMessage="Aucune affectation"
            gridCardRender={(a) => (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {a.user?.email ?? `#${a.user_id}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {a.product?.name ?? `#${a.product_id}`}
                      {a.product?.sku ? ` · ${a.product.sku}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                    {a.quantity} pcs
                  </span>
                </div>
              </div>
            )}
            actions={(a) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() =>
                    history.push(`/commercial-assignments/${a.id}/edit`)
                  }
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
                  onClick={() => handleDelete(a)}
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
