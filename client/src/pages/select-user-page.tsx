import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PendingLoginOption = {
  key: string;
  username: string;
  displayName: string | null;
};

export default function SelectUserPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [options, setOptions] = useState<PendingLoginOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  useEffect(() => {
    const fetchPendingOptions = async () => {
      if (!token) {
        setError("Login session not found. Please try logging in again.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/login/pending?token=${encodeURIComponent(token)}`,
          { credentials: "include" },
        );

        if (!res.ok) {
          throw new Error("Unable to load available accounts");
        }

        const data = await res.json();
        setOptions(data.options || []);
      } catch (err: any) {
        setError(err?.message || "Unable to load available accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingOptions();
  }, [token]);

  const handleSelect = async (selectionKey: string) => {
    setSelectingKey(selectionKey);
    setError(null);

    try {
      const res = await apiRequest("POST", "/api/login/select", {
        token,
        selectionKey,
      });
      const user = await res.json();

      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName || user.username}!`,
      });
      setLocation("/modules");
    } catch (err: any) {
      setSelectingKey(null);
      const message =
        err?.message || "Could not complete login. Please try again.";
      setError(message);
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });

      // If session is gone, send user back to login
      if (message.includes("401")) {
        setLocation("/auth");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-light">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              Choose Your Account
            </CardTitle>
            <CardDescription className="text-center">
              Multiple accounts use this email. Select which one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-primary">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading accounts...
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTitle>Login issue</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{error}</p>
                  <Button
                    variant="ghost"
                    className="px-0"
                    onClick={() => setLocation("/auth")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                  </Button>
                </AlertDescription>
              </Alert>
            ) : options.length === 0 ? (
              <Alert>
                <AlertTitle>No accounts available</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>The login session expired or has no accounts to select.</p>
                  <Button
                    variant="ghost"
                    className="px-0"
                    onClick={() => setLocation("/auth")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {options.map((option) => (
                  <Button
                    key={option.key}
                    variant="outline"
                    className="w-full justify-start px-4 py-3 border-primary text-left hover:bg-primary/5"
                    onClick={() => handleSelect(option.key)}
                    disabled={!!selectingKey && selectingKey !== option.key}
                  >
                    <UserRound className="h-5 w-5 mr-3 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{option.username}</span>
                      {option.displayName && (
                        <span className="text-sm text-muted-foreground">
                          {option.displayName}
                        </span>
                      )}
                    </div>
                    {selectingKey === option.key && (
                      <Loader2 className="h-4 w-4 ml-auto animate-spin" />
                    )}
                  </Button>
                ))}
              </div>
            )}

            {!loading && !selectingKey && (
              <Button
                variant="link"
                className="text-primary font-bold px-0"
                onClick={() => setLocation("/auth")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use a different account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex md:flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h1 className="text-4xl font-bold mb-6">Stay secure</h1>
          <p className="text-xl mb-8">
            Pick the right account so your progress and rewards stay in sync.
          </p>
        </div>
      </div>
    </div>
  );
}
