import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AlertCircle, Loader2, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useJoinWaitlist } from "@workspace/api-client-react";
import { WaitlistEntryUserType } from "@workspace/api-client-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  zip: z.string().optional(),
  userType: z.enum(["homeowner", "broker_agent", "builder"] as const).optional(),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function WaitlistForm() {
  const [joined, setJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: joinWaitlist, isPending } = useJoinWaitlist();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      zip: "",
      userType: "homeowner",
    },
  });

  const onSubmit = (data: FormValues) => {
    setErrorMessage(null);
    joinWaitlist(
      { data },
      {
        onSuccess: () => {
          setJoined(true);
          const duration = 3 * 1000;
          const end = Date.now() + duration;
          const frame = () => {
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#2563eb', '#f59e0b', '#10b981']
            });
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#2563eb', '#f59e0b', '#10b981']
            });
            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };
          frame();
        },
        onError: (error: any) => {
          // Extract specific error message if it's a 409 or similar
          if (error?.response?.data?.error) {
            setErrorMessage(error.response.data.error);
          } else if (error?.response?.status === 409) {
            setErrorMessage("This email is already on the waitlist!");
          } else {
            setErrorMessage("Something went wrong. Please try again.");
          }
        },
      }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {joined ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-primary/10 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400" />
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="w-10 h-10 text-primary" />
            </div>

            <h3 className="text-3xl font-display font-bold mb-3 text-foreground">
              Congratulations!
            </h3>

            <p className="text-lg text-muted-foreground mb-6">
              You've officially joined the MaintainHome.ai waitlist and locked in your <span className="font-semibold text-foreground">early bird discount</span>.
            </p>

            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25">
              <PartyPopper className="w-4 h-4" />
              50% off — yours for life when we launch!
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              We'll be in touch soon with updates and early access details.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 border border-border"
          >
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                Join the Waitlist
              </h2>
              <p className="text-muted-foreground">
                Prevent costly repairs – coming soon.
              </p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-6 bg-red-50 text-red-900 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-left">
              {/* Honeypot — hidden from real users, catches bots */}
              <input
                type="text"
                {...form.register("website")}
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors ${
                    form.formState.errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors ${
                    form.formState.errors.email ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-foreground font-medium">ZIP Code <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input
                    id="zip"
                    placeholder="12345"
                    maxLength={10}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    {...form.register("zip")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType" className="text-foreground font-medium">I'm a...</Label>
                  <Select
                    onValueChange={(value: any) => form.setValue("userType", value)}
                    defaultValue={form.getValues("userType")}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value={WaitlistEntryUserType.homeowner}>Homeowner</SelectItem>
                      <SelectItem value={WaitlistEntryUserType.broker_agent}>Real Estate Agent</SelectItem>
                      <SelectItem value={WaitlistEntryUserType.builder}>Builder / Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-14 mt-4 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving your spot...
                  </>
                ) : (
                  "Get Early Access & Discount"
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
