import { MessageSquare, Shield, Database, Clock, Users, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
  const lastUpdated = "January 9, 2025";
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FixAGym Field</h1>
              <p className="text-sm text-muted-foreground">Privacy Policy</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              FixAGym Field ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our field service management platform and related services.
            </p>
          </section>

          <Separator />

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Personal Information</h4>
                <p className="text-muted-foreground text-sm">
                  We may collect personal information that you voluntarily provide, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1 ml-4">
                  <li>Name and contact information (email address, phone number)</li>
                  <li>Service address and location data</li>
                  <li>Communication preferences</li>
                  <li>Service history and appointment details</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Automatically Collected Information</h4>
                <p className="text-muted-foreground text-sm">
                  When you access our services, we may automatically collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1 ml-4">
                  <li>Device information and browser type</li>
                  <li>IP address and location data</li>
                  <li>Usage data and interaction with our platform</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Service Delivery</span>
                    <p className="text-sm text-muted-foreground">
                      To schedule appointments, dispatch technicians, and provide field services
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Communications</span>
                    <p className="text-sm text-muted-foreground">
                      To send appointment reminders, service updates, and respond to inquiries via SMS, email, or phone
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Service Improvement</span>
                    <p className="text-sm text-muted-foreground">
                      To analyze usage patterns and improve our platform and services
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Legal Compliance</span>
                    <p className="text-sm text-muted-foreground">
                      To comply with applicable laws, regulations, and legal processes
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* SMS Communications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                SMS Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you opt in to receive SMS messages, we will use your phone number to send 
                service-related text messages including appointment reminders, technician arrival 
                notifications, and service confirmations.
              </p>
              <p className="text-muted-foreground text-sm">
                <strong>Your phone number will not be shared with third parties for marketing purposes.</strong> 
                You can opt out at any time by replying STOP to any message.
              </p>
              <p className="text-muted-foreground text-sm">
                For complete details about our SMS program, please see our{" "}
                <a href="/sms-terms" className="text-primary hover:underline">SMS Terms & Conditions</a>.
              </p>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Information Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                We do not sell, rent, or trade your personal information. We may share your 
                information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With your service provider who uses our platform to manage appointments</li>
                <li><strong>Third-Party Services:</strong> With service providers who assist in operating our platform (e.g., SMS delivery, hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                We implement appropriate technical and organizational measures to protect your 
                personal information against unauthorized access, alteration, disclosure, or destruction. 
                These measures include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Employee training on data protection</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We retain your personal information only for as long as necessary to fulfill the 
                purposes for which it was collected, including to satisfy legal, accounting, or 
                reporting requirements. When your information is no longer needed, we will securely 
                delete or anonymize it.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Opt-Out:</strong> Opt out of marketing communications or SMS messages</li>
                <li><strong>Portability:</strong> Request a portable copy of your data</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                To exercise any of these rights, please contact us using the information below.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Email: privacy@fixagym.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Phone: Contact your service provider directly</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Changes to This Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new Privacy Policy on this page and updating the 
                "Last Updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center pt-8 pb-4">
            <Separator className="mb-8" />
            <p className="text-sm text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              © {new Date().getFullYear()} FixAGym Field. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
