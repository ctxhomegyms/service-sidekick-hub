import { MessageSquare, Phone, Mail, Shield, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SmsTerms = () => {
  const lastUpdated = "March 23, 2026";
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fix A Gym Field</h1>
              <p className="text-sm text-muted-foreground">SMS Terms &amp; Conditions — CTX Home Gyms</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">SMS Messaging Program Terms &amp; Conditions</h2>
            <p className="text-sm text-muted-foreground mb-2"><strong>Effective Date:</strong> {lastUpdated}</p>
            <p className="text-muted-foreground leading-relaxed">
              By providing your mobile phone number and opting in to receive SMS messages from 
              CTX Home Gyms through the Fix A Gym Field platform, you agree to the following 
              terms and conditions.
            </p>
          </section>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                1. Program Name &amp; Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                <strong>Program Name:</strong> Fix A Gym Field SMS Notifications
              </p>
              <p className="text-muted-foreground text-sm">
                CTX Home Gyms operates the Fix A Gym Field platform, a field service management tool that 
                enables communication with customers via SMS text messages. Messages are sent to keep 
                customers informed about scheduled services, appointments, and job-related updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                2. Types of Messages You May Receive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  { title: "Appointment Reminders", desc: "Sent 24 hours and/or 1 hour before your scheduled appointment" },
                  { title: "Service Confirmations", desc: "Confirmation messages when services are scheduled or modified" },
                  { title: "Technician En-Route Notifications", desc: "Alerts when your service technician is on their way" },
                  { title: "Job Completion Updates", desc: "Notifications when your service has been completed" },
                  { title: "Missed-Call Follow-Ups", desc: "A follow-up message if we missed your call" },
                  { title: "Scheduling Notifications", desc: "Updates regarding schedule changes or rescheduling" },
                ].map(item => (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{item.title}</span>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                3. Consent &amp; Opt-In
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                By providing your mobile phone number to CTX Home Gyms, you expressly consent to receive 
                automated SMS text messages related to your service appointments and job-related communications.
              </p>
              <p className="text-muted-foreground text-sm">Consent may be provided when you:</p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li>Provide your phone number during service booking or account creation</li>
                <li>Verbally consent to receive SMS notifications from your service provider</li>
                <li>Check a consent checkbox on a service agreement or intake form</li>
                <li>Submit a pickup request or service request form online</li>
              </ul>
              <p className="text-sm font-semibold">
                Consent is not required as a condition of purchasing any goods or services.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                4. How to Opt Out — <strong>STOP</strong>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="font-semibold text-lg mb-2">Text <strong>STOP</strong></p>
                <p className="text-muted-foreground text-sm">
                  Reply <span className="font-mono bg-background px-2 py-1 rounded font-bold">STOP</span> to any 
                  message you receive. You will receive a one-time confirmation that you have been unsubscribed, 
                  and no further messages will be sent.
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                Other accepted opt-out keywords:{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">STOPALL</span>,{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">UNSUBSCRIBE</span>,{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">CANCEL</span>,{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">END</span>,{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">QUIT</span>.
              </p>
              <p className="text-muted-foreground text-sm">
                To re-subscribe after opting out, reply{" "}
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-bold">START</span>{" "}
                or contact CTX Home Gyms directly.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                5. Need Help? — <strong>HELP</strong>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="font-semibold text-lg mb-2">Text <strong>HELP</strong></p>
                <p className="text-muted-foreground text-sm">
                  Reply <span className="font-mono bg-background px-2 py-1 rounded font-bold">HELP</span> to any 
                  message for assistance. You will receive our support contact information and opt-out instructions.
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                You can also contact us directly:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-1">
                <p className="text-sm">Email: <a href="mailto:support@ctxhomegyms.com" className="text-primary hover:underline">support@ctxhomegyms.com</a></p>
                <p className="text-sm">Phone: (512) 591-8553</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                6. Message Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Message frequency varies based on your service activity and appointment schedule. You may 
                receive multiple messages per appointment (e.g., a reminder, an en-route alert, and a 
                completion notice). Typical frequency is 2–6 messages per scheduled service visit.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                7. Message &amp; Data Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold">
                Message and data rates may apply.
              </p>
              <p className="text-muted-foreground text-sm">
                Please consult your mobile carrier for details about your text messaging plan. 
                CTX Home Gyms is not responsible for any charges from your carrier.
              </p>
              <p className="text-muted-foreground text-sm">
                Carriers are not liable for delayed or undelivered messages.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                8. Privacy &amp; Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Your phone number and personal information will be used only to provide the SMS 
                communications described above.
              </p>
              <p className="text-sm font-semibold">
                We will not sell, rent, share, or disclose your phone number or personal data to third parties 
                for marketing or promotional purposes.
              </p>
              <p className="text-muted-foreground text-sm">
                For complete details, see our{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                9. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you have questions about this SMS program or these terms:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="font-medium">CTX Home Gyms</p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-sm">
                    Email: <a href="mailto:support@ctxhomegyms.com" className="text-primary hover:underline">support@ctxhomegyms.com</a>
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-sm">Phone: (512) 591-8553</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-8 pb-4">
            <Separator className="mb-8" />
            <p className="text-sm text-muted-foreground">Last Updated: {lastUpdated}</p>
            <p className="text-sm text-muted-foreground mt-2">
              © {new Date().getFullYear()} CTX Home Gyms. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmsTerms;
