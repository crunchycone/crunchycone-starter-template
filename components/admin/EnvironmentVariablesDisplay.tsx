"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnvironmentVariable {
  key: string;
  localValue: string;
  crunchyconeValue?: string;
  isSecret: boolean;
  isRemoteSecret?: boolean;
}

export function EnvironmentVariablesDisplay() {
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCrunchyConeConfig, setHasCrunchyConeConfig] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUsingPlatformAPI, setIsUsingPlatformAPI] = useState(false);
  const [crunchyConeStats, setCrunchyConeStats] = useState<{
    envCount: number;
    secretCount: number;
  }>({ envCount: 0, secretCount: 0 });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleLocalValues, setVisibleLocalValues] = useState<Set<string>>(new Set());
  const [clickedTooltips, setClickedTooltips] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    variableKey: string;
    currentValue: string;
    editValue: string;
  }>({
    isOpen: false,
    variableKey: "",
    currentValue: "",
    editValue: "",
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    variableKey: string;
  }>({
    isOpen: false,
    variableKey: "",
  });

  // Add dialog state
  const [addDialog, setAddDialog] = useState<{
    isOpen: boolean;
    name: string;
    value: string;
  }>({
    isOpen: false,
    name: "",
    value: "",
  });

  // Sync dialog state
  const [syncDialog, setSyncDialog] = useState<{
    isOpen: boolean;
    variableKey: string;
    direction: "pull" | "push" | "";
    sourceValue: string;
    targetValue: string;
    isSecret: boolean;
  }>({
    isOpen: false,
    variableKey: "",
    direction: "",
    sourceValue: "",
    targetValue: "",
    isSecret: false,
  });

  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchEnvironmentVariables();
  }, []);

  const fetchEnvironmentVariables = async () => {
    try {
      const response = await fetch("/api/admin/environment");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Environment variables are only available in development mode");
        } else {
          setError("Failed to fetch environment variables");
        }
        return;
      }

      const data = await response.json();
      setEnvVars(data.variables);
      setHasCrunchyConeConfig(data.hasCrunchyConeConfig);
      setIsAuthenticated(data.isAuthenticated || false);
      setIsUsingPlatformAPI(data.platform?.isUsingPlatformAPI || false);

      // Calculate CrunchyCone stats
      if (data.isAuthenticated && data.variables) {
        const envCount = data.variables.filter(
          (v: EnvironmentVariable) => v.crunchyconeValue && !v.isRemoteSecret
        ).length;
        const secretCount = data.variables.filter(
          (v: EnvironmentVariable) => v.crunchyconeValue && v.isRemoteSecret
        ).length;
        setCrunchyConeStats({ envCount, secretCount });
      } else {
        setCrunchyConeStats({ envCount: 0, secretCount: 0 });
      }
    } catch {
      setError("Error loading environment variables");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleLocalValueVisibility = (key: string) => {
    setVisibleLocalValues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleTooltipVisibility = (key: string) => {
    setClickedTooltips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isSensitiveLocalValue = (key: string) => {
    const upperKey = key.toUpperCase();
    return (
      upperKey.includes("KEY") ||
      upperKey.includes("AUTH") ||
      upperKey.includes("SECRET") ||
      upperKey.includes("PASS")
    );
  };

  const isSensitiveKey = (key: string) => {
    const sensitiveKeywords = [
      "secret",
      "key",
      "password",
      "token",
      "auth",
      "api",
      "private",
      "credential",
      "pass",
      "jwt",
      "oauth",
      "github",
      "google",
      "aws",
      "azure",
      "gcp",
      "stripe",
      "paypal",
      "database",
      "db",
      "redis",
      "session",
      "cookie",
      "smtp",
      "email",
      "twilio",
      "sendgrid",
      "crunchycone",
      "do",
      "spaces",
      "bucket",
      "access",
      "client",
    ];
    const lowerKey = key.toLowerCase();
    return sensitiveKeywords.some((keyword) => lowerKey.includes(keyword));
  };

  const isDeploymentSpecific = (key: string) => {
    const deploymentSpecificKeys = [
      "DATABASE_URL",
      "TURSO_AUTH_TOKEN", 
      "TURSO_DATABASE_URL",
      "POSTGRES_URL",
      "MYSQL_URL",
      "REDIS_URL",
      "MONGODB_URL",
      "AUTH_URL",
      "NEXT_PUBLIC_APP_URL",
      "PORT",
      "HOST",
      "NODE_ENV"
    ];
    return deploymentSpecificKeys.includes(key.toUpperCase());
  };

  const getDeploymentMessage = (key: string) => {
    const upperKey = key.toUpperCase();
    switch (upperKey) {
      case "DATABASE_URL":
      case "TURSO_DATABASE_URL":
      case "POSTGRES_URL":
      case "MYSQL_URL":
      case "MONGODB_URL":
        return "In production, this will point to a remote database service rather than local files";
      case "TURSO_AUTH_TOKEN":
        return "In production, this will use the deployment platform's Turso authentication token";
      case "REDIS_URL":
        return "In production, this will connect to a hosted Redis service";
      case "AUTH_URL":
      case "NEXT_PUBLIC_APP_URL":
        return "In production, this will use your actual domain instead of localhost";
      case "PORT":
        return "In production, this will be set by the deployment platform";
      case "HOST":
        return "In production, this will be set to 0.0.0.0 or managed by the platform";
      case "NODE_ENV":
        return "In production, this will be automatically set to 'production'";
      default:
        return "This value may differ in production environments";
    }
  };

  const openEditDialog = (variableKey: string, currentValue: string) => {
    setEditDialog({
      isOpen: true,
      variableKey,
      currentValue,
      editValue: currentValue,
    });
  };

  const closeEditDialog = () => {
    setEditDialog({
      isOpen: false,
      variableKey: "",
      currentValue: "",
      editValue: "",
    });
  };

  const openDeleteDialog = (variableKey: string) => {
    setDeleteDialog({
      isOpen: true,
      variableKey,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      variableKey: "",
    });
  };

  const openAddDialog = () => {
    setAddDialog({
      isOpen: true,
      name: "",
      value: "",
    });
  };

  const closeAddDialog = () => {
    setAddDialog({
      isOpen: false,
      name: "",
      value: "",
    });
  };

  const openPullDialog = (variableKey: string, localValue: string, remoteValue: string) => {
    setSyncDialog({
      isOpen: true,
      variableKey,
      direction: "pull",
      sourceValue: remoteValue || "(not set)",
      targetValue: localValue || "(empty)",
      isSecret: false,
    });
  };

  const openPushDialog = (variableKey: string, localValue: string, remoteValue: string) => {
    // Find the current variable to check if it's already a remote secret
    const currentVar = envVars.find((v) => v.key === variableKey);

    // Default to secret if:
    // 1. Variable is already stored as a secret in CrunchyCone, OR
    // 2. Variable name suggests it's sensitive (fallback)
    const defaultIsSecret = currentVar?.isRemoteSecret || isSensitiveKey(variableKey);

    setSyncDialog({
      isOpen: true,
      variableKey,
      direction: "push",
      sourceValue: localValue || "(empty)",
      targetValue: remoteValue || "(not set)",
      isSecret: defaultIsSecret,
    });
  };

  const closeSyncDialog = () => {
    if (!syncLoading) {
      setSyncDialog({
        isOpen: false,
        variableKey: "",
        direction: "",
        sourceValue: "",
        targetValue: "",
        isSecret: false,
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch("/api/admin/environment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: editDialog.variableKey,
          value: editDialog.editValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update environment variable");
      }

      // Update local state
      setEnvVars((prev) =>
        prev.map((envVar) =>
          envVar.key === editDialog.variableKey
            ? { ...envVar, localValue: editDialog.editValue }
            : envVar
        )
      );

      closeEditDialog();
    } catch (err) {
      console.error("Error updating environment variable:", err);
      // Could add toast notification here
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch("/api/admin/environment", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: deleteDialog.variableKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete environment variable");
      }

      // Update local state
      setEnvVars((prev) => prev.filter((envVar) => envVar.key !== deleteDialog.variableKey));

      closeDeleteDialog();
    } catch (err) {
      console.error("Error deleting environment variable:", err);
      // Could add toast notification here
    }
  };

  const handleAddVariable = async () => {
    try {
      if (!addDialog.name.trim()) {
        return; // Don't add empty names
      }

      const response = await fetch("/api/admin/environment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: addDialog.name,
          value: addDialog.value,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add environment variable");
      }

      // Add to local state
      const newVar: EnvironmentVariable = {
        key: addDialog.name,
        localValue: addDialog.value,
        isSecret: isSensitiveKey(addDialog.name),
      };

      setEnvVars((prev) => {
        const updated = [...prev, newVar];
        // Sort alphabetically
        return updated.sort((a, b) => a.key.localeCompare(b.key));
      });

      closeAddDialog();
    } catch (err) {
      console.error("Error adding environment variable:", err);
      // Could add toast notification here
    }
  };

  const handleSync = async () => {
    try {
      setSyncLoading(true);

      // Use the secret status from the dialog state
      const isSecret = syncDialog.isSecret;

      const response = await fetch("/api/admin/environment/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: syncDialog.variableKey,
          direction: syncDialog.direction,
          isSecret: isSecret,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync environment variable");
      }

      // Refresh the environment variables to show updated values
      await fetchEnvironmentVariables();

      // Small delay to show completion before closing
      setTimeout(() => {
        closeSyncDialog();
        setSyncLoading(false);
      }, 500);
    } catch (err) {
      console.error("Error syncing environment variable:", err);
      setSyncLoading(false);
      closeSyncDialog();
      // Could add toast notification here
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading environment variables...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (envVars.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No .env file found or no variables defined.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Environment Variables</CardTitle>
            <div className="text-sm text-muted-foreground">
              {isUsingPlatformAPI ? (
                <>
                  {envVars.length} variables from CrunchyCone Platform
                  {` • ${crunchyConeStats.envCount} env vars, ${crunchyConeStats.secretCount} secrets`}
                </>
              ) : (
                <>
                  {envVars.length} variables from .env file
                  {hasCrunchyConeConfig &&
                    (isAuthenticated
                      ? ` • CrunchyCone: ${crunchyConeStats.envCount} env vars, ${crunchyConeStats.secretCount} secrets`
                      : " • CrunchyCone project (not authenticated)")}
                </>
              )}
            </div>
          </div>
          {!isUsingPlatformAPI && (
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable Name</TableHead>
              {isUsingPlatformAPI ? (
                <TableHead>Platform Value</TableHead>
              ) : (
                <>
                  <TableHead>Local Value</TableHead>
                  {!isUsingPlatformAPI && hasCrunchyConeConfig && isAuthenticated && <TableHead>Remote Value</TableHead>}
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {envVars.map((envVar) => (
              <TableRow key={envVar.key}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{envVar.key}</code>
                    {isDeploymentSpecific(envVar.key) && (
                      <TooltipProvider>
                        <Tooltip 
                          open={clickedTooltips.has(envVar.key) ? true : undefined}
                          onOpenChange={(open) => {
                            if (!open && clickedTooltips.has(envVar.key)) {
                              setClickedTooltips(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(envVar.key);
                                return newSet;
                              });
                            }
                          }}
                        >
                          <TooltipTrigger asChild>
                            <div 
                              className="relative flex items-center justify-center w-4 h-4 rounded-full border border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-help transition-colors"
                              onClick={() => toggleTooltipVisibility(envVar.key)}
                            >
                              <Cloud className="h-2.5 w-2.5 text-blue-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-sm">
                              {getDeploymentMessage(envVar.key)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(envVar.key, envVar.key)}
                    >
                      {copiedKey === envVar.key ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                {isUsingPlatformAPI ? (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 max-w-xs">
                        <Input
                          type={envVar.isRemoteSecret ? "password" : "text"}
                          value={envVar.crunchyconeValue || ""}
                          readOnly
                          className="h-8 font-mono text-sm bg-muted"
                          placeholder={envVar.crunchyconeValue ? undefined : "(not set)"}
                        />
                      </div>
                      {/* Platform variables are read-only, no edit/delete buttons */}
                    </div>
                  </TableCell>
                ) : (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isSensitiveLocalValue(envVar.key) ? (
                        <div className="relative flex-1 max-w-xs">
                          <Input
                            type={visibleLocalValues.has(envVar.key) ? "text" : "password"}
                            value={envVar.localValue || ""}
                            readOnly
                            className="h-8 font-mono text-sm pr-8"
                            placeholder={envVar.localValue ? undefined : "(empty)"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-0 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => toggleLocalValueVisibility(envVar.key)}
                          >
                            {visibleLocalValues.has(envVar.key) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 max-w-xs">
                          <Input
                            type="text"
                            value={envVar.localValue || ""}
                            readOnly
                            className="h-8 font-mono text-sm"
                            placeholder={envVar.localValue ? undefined : "(empty)"}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {hasCrunchyConeConfig &&
                          isAuthenticated &&
                          envVar.crunchyconeValue &&
                          !envVar.isRemoteSecret && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                              onClick={() =>
                                openPullDialog(
                                  envVar.key,
                                  envVar.localValue,
                                  envVar.crunchyconeValue!
                                )
                              }
                              title="Pull value from CrunchyCone"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(envVar.key, envVar.localValue)}
                          title="Edit variable"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(envVar.key)}
                          title="Delete variable"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                )}
                {!isUsingPlatformAPI && hasCrunchyConeConfig && isAuthenticated && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="font-mono text-sm max-w-xs flex-1">
                        {envVar.isRemoteSecret ? (
                          envVar.crunchyconeValue ? (
                            <Input
                              type="password"
                              value={envVar.crunchyconeValue}
                              readOnly
                              className="h-8 bg-muted"
                              placeholder="••••••••"
                            />
                          ) : (
                            <span className="text-muted-foreground italic">(not set)</span>
                          )
                        ) : (
                          envVar.crunchyconeValue || (
                            <span className="text-muted-foreground italic">(not set)</span>
                          )
                        )}
                      </div>
                      {envVar.localValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          onClick={() =>
                            openPushDialog(
                              envVar.key,
                              envVar.localValue,
                              envVar.crunchyconeValue || ""
                            )
                          }
                          title="Push value to CrunchyCone"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={closeEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Variable</DialogTitle>
            <DialogDescription>
              Modify the value for{" "}
              <code className="bg-muted px-1 rounded">{editDialog.variableKey}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                type={isSensitiveLocalValue(editDialog.variableKey) ? "password" : "text"}
                value={editDialog.editValue}
                onChange={(e) => setEditDialog((prev) => ({ ...prev, editValue: e.target.value }))}
                className="font-mono"
                placeholder="Enter value..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Environment Variable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <code className="bg-muted px-1 rounded">{deleteDialog.variableKey}</code>? This will
              remove it from your .env file and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Variable Dialog */}
      <Dialog open={addDialog.isOpen} onOpenChange={closeAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Environment Variable</DialogTitle>
            <DialogDescription>Add a new variable to your .env file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="variable-name">Variable Name</Label>
              <Input
                id="variable-name"
                type="text"
                value={addDialog.name}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, name: e.target.value }))}
                className="font-mono"
                placeholder="VARIABLE_NAME"
              />
            </div>
            <div>
              <Label htmlFor="variable-value">Value</Label>
              <Input
                id="variable-value"
                type={isSensitiveLocalValue(addDialog.name) ? "password" : "text"}
                value={addDialog.value}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, value: e.target.value }))}
                className="font-mono"
                placeholder="Enter value..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddVariable} disabled={!addDialog.name.trim()}>
              Add Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Confirmation Dialog */}
      <Dialog
        open={syncDialog.isOpen}
        onOpenChange={(open) => {
          if (!open && !syncLoading) {
            closeSyncDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {syncDialog.direction === "pull" ? "Pull from CrunchyCone" : "Push to CrunchyCone"}
            </DialogTitle>
            <DialogDescription>
              {syncDialog.direction === "pull"
                ? `Pull the remote value from CrunchyCone to your local .env file for `
                : `Push the local value from your .env file to CrunchyCone for `}
              <code className="bg-muted px-1 rounded">{syncDialog.variableKey}</code>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">
                {syncDialog.direction === "pull" ? "Source (CrunchyCone):" : "Source (Local):"}
              </Label>
              <div className="bg-muted p-2 rounded font-mono text-sm">{syncDialog.sourceValue}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {syncDialog.direction === "pull" ? "Target (Local):" : "Target (CrunchyCone):"}
              </Label>
              <div className="bg-muted p-2 rounded font-mono text-sm">{syncDialog.targetValue}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {syncDialog.direction === "pull"
                ? "This will overwrite your local value with the CrunchyCone value."
                : "This will overwrite the CrunchyCone value with your local value."}
            </div>
            {syncDialog.direction === "push" && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="secret-checkbox"
                    checked={syncDialog.isSecret}
                    onCheckedChange={(checked) =>
                      setSyncDialog((prev) => ({ ...prev, isSecret: !!checked }))
                    }
                  />
                  <Label htmlFor="secret-checkbox" className="text-sm font-medium">
                    Store as secret
                  </Label>
                </div>
                {syncDialog.isSecret && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-amber-800">
                      <strong>Secret Warning:</strong> This value will be stored as a secret in
                      CrunchyCone. Once saved, you won&apos;t be able to view its value again - it
                      will only display as &quot;••••••••&quot;.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSyncDialog} disabled={syncLoading}>
              Cancel
            </Button>
            <Button onClick={handleSync} disabled={syncLoading}>
              {syncLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {syncDialog.direction === "pull" ? "Pulling..." : "Pushing..."}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {syncDialog.direction === "pull" ? "Pull Value" : "Push Value"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
