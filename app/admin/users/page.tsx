import { prisma } from "@/lib/prisma";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { getCurrentUser } from "@/lib/auth/permissions";
const ITEMS_PER_PAGE = 10;

async function getRoles() {
  return prisma.role.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      id: "asc",
    },
  });
}

async function getUsers(page: number = 1, search?: string) {
  const skip = (page - 1) * ITEMS_PER_PAGE;
  
  const where = {
    deleted_at: null,
    ...(search && {
      email: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
  };

  const [users, count] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: { created_at: "desc" },
      include: {
        profile: true,
        roles: {
          where: {
            deleted_at: null,
          },
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, count };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search;
  
  const [{ users, count }, currentUser, roles] = await Promise.all([
    getUsers(page, search),
    getCurrentUser(),
    getRoles(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      <UserManagementPanel
        initialUsers={users}
        totalCount={count}
        currentPage={page}
        itemsPerPage={ITEMS_PER_PAGE}
        currentUserId={currentUser?.id || ""}
        availableRoles={roles}
      />
    </div>
  );
}