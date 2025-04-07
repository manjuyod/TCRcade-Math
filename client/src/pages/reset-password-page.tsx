import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import tcLogo from "../assets/tc-logo.png";

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  // If no token is provided, redirect to login page
  useEffect(() => {
    if (!token) {
      navigate("/auth");
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive",
      });
    }
  }, [token, navigate, toast]);

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    try {
      setStatus('loading');
      setError(null);

      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: values.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setStatus('success');
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now log in with your new password.",
      });

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'An unknown error occurred');
      toast({
        title: "Failed to reset password",
        description: err.message || 'An unknown error occurred',
        variant: "destructive",
      });
    }
  };

  if (!token) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="flex min-h-screen bg-light items-center justify-center">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 items-center text-center">
          <div className="flex justify-center mb-6">
            <img src={tcLogo} alt="Tutoring Club Logo" className="h-16" />
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' ? (
            <Alert className="mb-4">
              <AlertTitle>Password Reset Successful</AlertTitle>
              <AlertDescription>
                Your password has been reset successfully. You will be redirected to the login page shortly.
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter your new password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Confirm your new password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full arcade-btn bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : "Reset Password"}
                </Button>
                
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/auth")}
                    className="text-primary"
                  >
                    Return to login
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}