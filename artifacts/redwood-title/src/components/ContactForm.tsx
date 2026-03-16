import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { contactSchema, type ContactInput, useSubmitContact } from "@/hooks/use-contact";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

export function ContactForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { mutate: submitContact, isPending } = useSubmitContact();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactInput) => {
    submitContact(data, {
      onSuccess: () => {
        setIsSuccess(true);
        reset();
        setTimeout(() => setIsSuccess(false), 5000);
      },
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-border">
      <h3 className="text-2xl font-display font-bold text-foreground mb-6">Send us a message</h3>
      
      {isSuccess ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center justify-center text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h4 className="text-lg font-bold text-green-800">Message Sent!</h4>
          <p className="text-green-600 mt-2">We'll be in touch with you shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              className={`mt-1.5 ${errors.name ? "border-red-500" : ""}`}
              {...register("name")} 
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="john@example.com" 
              className={`mt-1.5 ${errors.email ? "border-red-500" : ""}`}
              {...register("email")} 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input 
              id="phone" 
              placeholder="(555) 123-4567" 
              className="mt-1.5"
              {...register("phone")} 
            />
          </div>
          
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message" 
              placeholder="How can we help you?" 
              className={`mt-1.5 min-h-[120px] ${errors.message ? "border-red-500" : ""}`}
              {...register("message")} 
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            disabled={isPending}
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
            ) : "Send Message"}
          </Button>
        </form>
      )}
    </div>
  );
}
