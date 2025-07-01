import { PrismaClient } from "@prisma/client";
import { RoleManagementPanel } from "@/components/admin/RoleManagementPanel";

const prisma = new PrismaClient();

async function getRoles() {
  const roles = await prisma.role.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      id: "asc",
    },
    include: {
      _count: {
        select: {
          users: {
            where: {
              deleted_at: null,
              user: {
                deleted_at: null,
              },
            },
          },
        },
      },
    },
  });

  return roles;
}

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground">
          Create and manage roles for your application
        </p>
      </div>

      <RoleManagementPanel initialRoles={roles} />
    </div>
  );
}