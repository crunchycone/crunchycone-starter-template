"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Mail, Shield, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type User = {
  id: string;
  email: string;
  created_at: string;
  last_signed_in: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  roles: {
    role: {
      name: string;
    };
  }[];
};

type Role = {
  id: string;
  name: string;
};

type UserManagementPanelProps = {
  initialUsers: User[];
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  currentUserId: string;
  availableRoles: Role[];
};

export function UserManagementPanel({
  initialUsers,
  totalCount,
  currentPage,
  itemsPerPage,
  currentUserId,
  availableRoles,
}: UserManagementPanelProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/admin/users?search=${encodeURIComponent(searchQuery)}`);
  }

  async function handlePasswordReset(userId: string, email: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send password reset");
      }

      setActionMessage({
        type: "success",
        message: `Password reset link sent to ${email}`,
      });
    } catch {
      setActionMessage({
        type: "error",
        message: "Failed to send password reset link",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRoleToggle(userId: string, roleName: string, hasRole: boolean) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: hasRole ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleName }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Update the selected user with new role data
      if (selectedUser) {
        const updatedUser = { ...selectedUser };
        if (hasRole) {
          // Remove role
          updatedUser.roles = updatedUser.roles.filter((r) => r.role.name !== roleName);
        } else {
          // Add role
          const newRole = availableRoles.find((r) => r.name === roleName);
          if (newRole) {
            updatedUser.roles.push({ role: newRole });
          }
        }
        setSelectedUser(updatedUser);

        // Update the user in the list
        setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      }

      setActionMessage({
        type: "success",
        message: `Role ${hasRole ? "removed" : "added"} successfully`,
      });
    } catch {
      setActionMessage({
        type: "error",
        message: "Failed to update user role",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {actionMessage && (
        <Alert variant={actionMessage.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{actionMessage.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search users by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.profile?.first_name || user.profile?.last_name
                    ? `${user.profile.first_name || ""} ${user.profile.last_name || ""}`.trim()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.map((r) => (
                      <Badge key={r.role.name} variant="secondary">
                        {r.role.name}
                      </Badge>
                    ))}
                    {user.roles.length === 0 && <Badge variant="outline">user</Badge>}
                  </div>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {user.last_signed_in
                    ? new Date(user.last_signed_in).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDetailsOpen(true);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePasswordReset(user.id, user.email)}
                        disabled={isLoading}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Send Password Reset
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setIsRoleDialogOpen(true);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Manage Roles
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/users?page=${currentPage - 1}`)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/users?page=${currentPage + 1}`)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Detailed information about {selectedUser?.email}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">User ID:</span>
                  <span className="font-mono text-sm">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>
                    {selectedUser.profile?.first_name || selectedUser.profile?.last_name
                      ? `${selectedUser.profile.first_name || ""} ${
                          selectedUser.profile.last_name || ""
                        }`.trim()
                      : "Not provided"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Joined:</span>
                  <span>{new Date(selectedUser.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Sign In:</span>
                  <span>
                    {selectedUser.last_signed_in
                      ? new Date(selectedUser.last_signed_in).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-medium">Roles:</span>
                  <div className="flex gap-1">
                    {selectedUser.roles.map((r) => (
                      <Badge key={r.role.name}>{r.role.name}</Badge>
                    ))}
                    {selectedUser.roles.length === 0 && <Badge variant="outline">user</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>Add or remove roles for {selectedUser?.email}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  ) : (
                    selectedUser.roles.map((userRole) => (
                      <Badge
                        key={userRole.role.name}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {userRole.role.name}
                        {!(selectedUser.id === currentUserId && userRole.role.name === "admin") && (
                          <button
                            onClick={() =>
                              handleRoleToggle(selectedUser.id, userRole.role.name, true)
                            }
                            disabled={isLoading}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
                {selectedUser.id === currentUserId &&
                  selectedUser.roles.some((r) => r.role.name === "admin") && (
                    <p className="text-xs text-muted-foreground mt-1">
                      You cannot remove your own admin role
                    </p>
                  )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Add Role</h4>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(roleName) => {
                      handleRoleToggle(selectedUser.id, roleName, false);
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles
                        .filter(
                          (role) => !selectedUser.roles.some((ur) => ur.role.name === role.name)
                        )
                        .map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
