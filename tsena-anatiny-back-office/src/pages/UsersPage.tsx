import { useState, useEffect } from "react";
import type { User, CreateUserPayload, UpdateUserPayload } from "../types/user";
import type { Role } from "../types/role";
import type { Column } from "../components/index";
import { usersService } from "../services/users.service";
import { rolesService } from "../services/roles.service";
import { Card, Button, DataTable } from "../components/index";
import { UserForm } from "../components/UserForm";
import { Modal } from "../components/Modal";
import { Layout } from "../components/Layout";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadRoles = async () => {
    try {
      const response = await rolesService.getRoles();
      setRoles(response.items);
    } catch {
      setRoles([]);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await usersService.getUsers(page, pageSize);
      setUsers(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du chargement"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.email} ?`)) {
      return;
    }

    try {
      setIsFormLoading(true);
      await usersService.deleteUser(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateUserPayload | UpdateUserPayload
  ) => {
    try {
      setIsFormLoading(true);
      setError(null);

      if (selectedUser) {
        const updated = await usersService.updateUser(
          selectedUser.id,
          payload as UpdateUserPayload
        );
        setUsers(users.map((u) => (u.id === selectedUser.id ? updated : u)));
      } else {
        const created = await usersService.createUser(
          payload as CreateUserPayload
        );
        setUsers([created, ...users]);
      }

      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<User>[] = [
    {
      header: "Email",
      accessor: "email",
      width: "30%"
    },
    {
      header: "Téléphone",
      accessor: "phone_numer",
      width: "20%"
    },
    {
      header: "Nom",
      accessor: "full_name",
      render: (value) => value || "-",
      width: "20%"
    },
    {
      header: "Rôle",
      accessor: "role_id",
      render: (value) => {
        const role = roles.find((item) => item.id === value);
        return role?.name || `Rôle ${value}`;
      },
      width: "15%"
    },
    {
      header: "Statut",
      accessor: "is_active",
      render: (value) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            value ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
          }`}
        >
          {value ? "Actif" : "Inactif"}
        </span>
      ),
      width: "10%"
    }
  ];

  return (
    <Layout
      title="Utilisateurs"
      subtitle="Gérez les utilisateurs de votre plateforme"
    >
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Users className="h-4 w-4" />
            </span>
            Gestion des comptes
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <Card
          title="Liste des utilisateurs"
          description={`Total: ${total} utilisateurs`}
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button onClick={handleCreate} variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            emptyMessage="Aucun utilisateur trouvé"
            actions={(user) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(user)}
                  disabled={isFormLoading}
                  title="Modifier"
                  aria-label="Modifier"
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(user)}
                  disabled={isFormLoading}
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

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-panel/65 px-2.5 py-2 sm:gap-3 sm:px-3">
          <p className="text-xs font-medium text-muted sm:text-sm">
            Page {page} de {totalPages}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              htmlFor="users-page-size"
            >
              Par page
            </label>
            <select
              id="users-page-size"
              className="h-8 min-w-[68px] rounded-lg border border-border bg-bg px-2 text-xs font-semibold text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 sm:h-9 sm:min-w-[72px] sm:text-sm"
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value) || 20;
                setPageSize(nextSize);
                setPage(1);
              }}
              disabled={isLoading}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          title={
            selectedUser
              ? "Modifier l'utilisateur"
              : "Créer un nouvel utilisateur"
          }
        >
          <UserForm
            user={selectedUser || undefined}
            roles={roles}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
            isLoading={isFormLoading}
          />
        </Modal>
      </div>
    </Layout>
  );
}
