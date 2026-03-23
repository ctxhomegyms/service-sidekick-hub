import { Shield, Database, Clock, Users, Mail, Phone, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
  const lastUpdated = "March 23, 2026";
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fix A Gym Field</h1>
              <p className="text-sm text-muted-foreground">Privacy Policy — CTX Home Gyms</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Privacy Policy</h2>
            <p className="text-sm text-muted-foreground mb-2"><strong>Effective Date:</strong> {lastUpdated}</p>
            <p className="text-muted-foreground leading-relaxed">
              Fix A Gym Field is a field service management tool operated by CTX Home Gyms ("we," "our," or "us"). 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
              interact with our services, including SMS messaging.
            </p>
          </section>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Personal Information You Provide</h4>
                <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1 ml-4">
                  <li>Name, email address, and phone number</li>
                  <li>Service address and location</li>
                  <li>Communication preferences and SMS consent status</li>
                  <li>Service history and appointment details</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Automatically Collected Information</h4>
                <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1 ml-4">
                  <li>Device information, browser type, and operating system</li>
                  <li>IP address</li>
                  <li>Usage data and interaction with our platform</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                2. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  { title: "Service Delivery", desc: "To schedule appointments, dispatch technicians, and deliver field services" },
                  { title: "SMS Communications", desc: "To send appointment reminders, technician en-route alerts, job completion updates, and scheduling notifications (only with your consent)" },
                  { title: "Email Communications", desc: "To send service confirmations and updates" },
                  { title: "Service Improvement", desc: "To analyze usage patterns and improve our platform" },
                  { title: "Legal Compliance", desc: "To comply with applicable laws and regulations" },
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
                <MessageSquare className="w-5 h-5 text-primary" />
                3. SMS Communications &amp; Your Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you opt in to receive SMS messages, we will use your mobile phone number solely to send 
                service-related text messages including appointment reminders, technician arrival notifications, 
                job status updates, and scheduling confirmations.
              </p>
              <p className="text-sm font-semibold">
                We will not sell, rent, share, or disclose your phone number or any personal information 
                to third parties for marketing or promotional purposes.
              </p>
              <p className="text-muted-foreground text-sm">
                Your phone number is shared only with our SMS delivery provider (Twilio) for the sole purpose 
                of delivering your service-related messages. You can opt out at any time by replying{" "}
                <strong>STOP</strong> to any message. For help, reply <strong>HELP</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                For complete details, see our{" "}
                <a href="/sms-terms" className="text-primary hover:underline">SMS Terms &amp; Conditions</a>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                4. Information Sharing &amp; Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold">
                We do not sell, rent, or trade your personal information to any third party.
              </p>
              <p className="text-muted-foreground text-sm">We may share your information only in these limited circumstances:</p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With technology providers who assist in operating our platform (e.g., SMS delivery via Twilio, cloud hosting), contractually bound to use your data solely for delivering our services</li>
                <li><strong>Legal Requirements:</strong> When required by law, regulation, subpoena, or court order</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of CTX Home Gyms, our customers, or the public</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to affected users</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                5. Data Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We implement appropriate technical and organizational measures to protect your personal information, 
                including encryption of data in transit and at rest, secure authentication, role-based access controls, 
                and regular security assessments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                6. Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We retain your personal information only for as long as necessary to fulfill the purposes described 
                in this policy, or as required by law. When your information is no longer needed, we securely delete 
                or anonymize it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                7. Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">You may have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li>Access a copy of the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of SMS communications by replying <strong>STOP</strong></li>
              </ul>
              <p className="text-muted-foreground text-sm">
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:support@ctxhomegyms.com" className="text-primary hover:underline">support@ctxhomegyms.com</a>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                8. Changes to This Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an 
                updated effective date. We encourage you to review this policy periodically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                9. Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you have questions about this Privacy Policy or our data practices:
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

export default Privacy;
