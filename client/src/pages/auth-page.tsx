import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import tcLogo from "../assets/tc-logo.png";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address").optional(),
  displayName: z.string().optional(),
  grade: z.string().min(1, "Please select a grade"),
  initials: z
    .string()
    .length(3, "Initials must be exactly 3 letters")
    .toUpperCase()
    .optional(),
});

const resetPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, "Please enter your username or email"),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [resetRequestStatus, setResetRequestStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resetError, setResetError] = useState<string | null>(null);

  // Import toast from module to avoid hooks issues
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/modules");
    }
  }, [user, setLocation]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      displayName: "",
      grade: "K",
      initials: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    // Set initials to first 3 chars of username if not provided
    if (!data.initials) {
      data.initials = data.username.substring(0, 3).toUpperCase();
    }
    registerMutation.mutate(data);
  };

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      usernameOrEmail: "",
    },
  });

  const onResetPasswordSubmit = async (
    data: z.infer<typeof resetPasswordSchema>,
  ) => {
    setResetRequestStatus("loading");
    setResetError(null);

    try {
      const response = await fetch("/api/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to request password reset",
        );
      }

      setResetRequestStatus("success");
      toast({
        title: "Reset request sent",
        description:
          "If an account with that username or email exists, you'll receive reset instructions.",
      });
    } catch (error: any) {
      setResetRequestStatus("error");
      setResetError(error?.message || "An unknown error occurred");
      toast({
        title: "Reset request failed",
        description: error?.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-light">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <CardContent>
              <div className="flex justify-center mb-6">
                <img src={tcLogo} alt="Tutoring Club Logo" className="h-16" />
              </div>
              <h1 className="text-3xl font-bold text-center text-primary mb-6">
                TCrcade
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {activeTab === "login"
                  ? "Login to start your math adventure!"
                  : "Create an account to begin learning!"}
              </p>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your password"
                            />
                          </FormControl>
                          <FormMessage />
                          <Button
                            variant="link"
                            onClick={() => setActiveTab("reset")}
                            className="text-primary text-sm mt-1 p-0 h-auto block ml-auto"
                          >
                            Forgot password?
                          </Button>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="arcade-btn w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="reset">
                <div className="mb-6">
                  <CardHeader className="p-0 space-y-1">
                    <CardTitle className="text-xl">
                      Reset Your Password
                    </CardTitle>
                    <CardDescription>
                      Enter your username or email address and we'll send you
                      instructions on how to reset your password.
                    </CardDescription>
                  </CardHeader>

                  {resetRequestStatus === "success" ? (
                    <Alert className="mt-6 border-orange-500">
                      <AlertTitle className="text-orange-600">
                        Testing Mode: Reset Request Sent
                      </AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p className="font-medium">
                          The reset token has been generated and logged to the
                          server console.
                        </p>
                        <p>
                          Since email delivery is not set up yet, you would
                          normally check your email for instructions. For
                          testing purposes, ask the developer to check the
                          server logs for the token and reset link.
                        </p>
                        <p className="italic text-sm">
                          Note: In a production environment, this token would be
                          sent via email.
                        </p>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...resetPasswordForm}>
                      <form
                        onSubmit={resetPasswordForm.handleSubmit(
                          onResetPasswordSubmit,
                        )}
                        className="space-y-4 mt-4"
                      >
                        <FormField
                          control={resetPasswordForm.control}
                          name="usernameOrEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username or Email</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Enter your username or email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {resetError && (
                          <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{resetError}</AlertDescription>
                          </Alert>
                        )}

                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setActiveTab("login")}
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Login
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl"
                            disabled={resetRequestStatus === "loading"}
                          >
                            {resetRequestStatus === "loading" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Send Reset Link"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Create a username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Create a password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Your email address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name (optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Your display name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Level</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="K">Kindergarten</option>
                                <option value="1">Grade 1</option>
                                <option value="2">Grade 2</option>
                                <option value="3">Grade 3</option>
                                <option value="4">Grade 4</option>
                                <option value="5">Grade 5</option>
                                <option value="6">Grade 6</option>
                                <option value="7">Grade 7</option>
                                <option value="8">Grade 8</option>
                                <option value="9">Grade 9</option>
                                <option value="10">Grade 10</option>
                                <option value="11">Grade 11</option>
                                <option value="12">Grade 12</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="initials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arcade Initials (3 letters)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                                placeholder="AAA"
                                maxLength={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="arcade-btn w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending
                        ? "Creating Account..."
                        : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {activeTab !== "reset" && (
                <div className="text-center mt-6">
                  <p className="text-gray-600">
                    {activeTab === "login"
                      ? "Don't have an account?"
                      : "Already have an account?"}
                    <Button
                      variant="link"
                      className="text-primary font-bold"
                      onClick={() =>
                        setActiveTab(
                          activeTab === "login" ? "register" : "login",
                        )
                      }
                    >
                      {activeTab === "login" ? "Register here" : "Login here"}
                    </Button>
                  </p>
                </div>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <div className="hidden md:flex md:flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h1 className="text-4xl font-bold mb-6">Make Learning Math Fun!</h1>
          <p className="text-xl mb-8">
            Join TCrcade and challenge yourself with adaptive questions, earn
            rewards, and track your progress!
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-white font-bold">1</span>
              </div>
              <span>Play fun, interactive math games</span>
            </li>
            <li className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-white font-bold">2</span>
              </div>
              <span>Earn tokens for correct answers</span>
            </li>
            <li className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-white font-bold">3</span>
              </div>
              <span>Compete on the leaderboard with friends</span>
            </li>
            <li className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-white font-bold">4</span>
              </div>
              <span>Track your progress across math topics</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
