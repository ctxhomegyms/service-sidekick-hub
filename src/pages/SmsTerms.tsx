import { MessageSquare, Phone, Mail, Shield, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SmsTerms = () => {
  const lastUpdated = "January 9, 2025";
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FieldFlow</h1>
              <p className="text-sm text-muted-foreground">SMS Terms & Conditions</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold mb-4">SMS Messaging Program Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By providing your mobile phone number and opting in to receive SMS messages from FieldFlow, 
              you agree to the following terms and conditions. Please read this document carefully as it 
              outlines our SMS messaging practices, your rights, and how to manage your preferences.
            </p>
          </section>

          <Separator />

          {/* Program Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Program Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                FieldFlow provides field service management software that enables businesses to communicate 
                with their customers via SMS text messages. Our SMS messaging program is designed to keep 
                customers informed about their scheduled services, appointments, and job-related updates.
              </p>
              <p className="text-muted-foreground">
                Messages are sent to facilitate efficient communication between service providers and their 
                customers regarding scheduled appointments and service delivery.
              </p>
            </CardContent>
          </Card>

          {/* Message Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Types of Messages You May Receive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Appointment Reminders</span>
                    <p className="text-sm text-muted-foreground">
                      Reminders sent 24 hours and 1 hour before your scheduled appointment
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Service Confirmations</span>
                    <p className="text-sm text-muted-foreground">
                      Confirmation messages when services are scheduled or modified
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Technician En Route Notifications</span>
                    <p className="text-sm text-muted-foreground">
                      Alerts when your service technician is on their way to your location
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Job Completion Updates</span>
                    <p className="text-sm text-muted-foreground">
                      Notifications when your service has been completed
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Scheduling Notifications</span>
                    <p className="text-sm text-muted-foreground">
                      Updates regarding schedule changes or rescheduling requests
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Consent & Opt-In */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Consent & Opt-In
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                By providing your mobile phone number to your service provider who uses FieldFlow, 
                you expressly consent to receive automated SMS text messages related to your service 
                appointments and job-related communications.
              </p>
              <p className="text-muted-foreground">
                Consent is obtained when you:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide your phone number during service booking or account creation</li>
                <li>Verbally consent to receive SMS notifications from your service provider</li>
                <li>Check a consent checkbox on a service agreement or intake form</li>
                <li>Reply to an initial opt-in confirmation message</li>
              </ul>
              <p className="text-muted-foreground">
                <strong>Consent is not required</strong> as a condition of purchasing any goods or services.
              </p>
            </CardContent>
          </Card>

          {/* Opt-Out Instructions */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                How to Opt-Out (Stop Messages)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You can opt out of receiving SMS messages at any time by using one of the following methods:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="font-semibold text-lg mb-2">Text STOP</p>
                <p className="text-muted-foreground">
                  Reply <span className="font-mono bg-background px-2 py-1 rounded">STOP</span> to any 
                  message you receive from us. You will receive a one-time confirmation message that 
                  you have been unsubscribed.
                </p>
              </div>
              <p className="text-muted-foreground">
                After opting out, you will no longer receive SMS messages from FieldFlow. 
                If you wish to re-subscribe, you may text <span className="font-mono bg-muted px-2 py-1 rounded">START</span> to 
                the same number or contact your service provider directly.
              </p>
            </CardContent>
          </Card>

          {/* Help Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="font-semibold text-lg mb-2">Text HELP</p>
                <p className="text-muted-foreground">
                  Reply <span className="font-mono bg-background px-2 py-1 rounded">HELP</span> to any 
                  message for assistance. You will receive instructions on how to manage your SMS preferences.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message Frequency & Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Message Frequency & Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Message Frequency</h4>
                  <p className="text-sm text-muted-foreground">
                    Message frequency varies based on your service activity and appointment schedule. 
                    You may receive multiple messages per appointment, including reminders and status updates.
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Message & Data Rates</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Message and data rates may apply.</strong> Please consult your mobile carrier 
                    for details about your text messaging plan.
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Carriers are not liable for delayed or undelivered messages.
              </p>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We respect your privacy and are committed to protecting your personal information. 
                Your phone number and personal data will be:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Used solely for the purposes outlined in this SMS Terms document</li>
                <li>Never sold, rented, or shared with third parties for marketing purposes</li>
                <li>Protected with industry-standard security measures</li>
                <li>Retained only as long as necessary to provide our services</li>
              </ul>
              <p className="text-muted-foreground">
                For complete details on how we handle your data, please refer to our Privacy Policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you have any questions about our SMS messaging program or these terms, please contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Email: support@fieldflow.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Phone: Contact your service provider directly</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center pt-8 pb-4">
            <Separator className="mb-8" />
            <p className="text-sm text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              © {new Date().getFullYear()} FieldFlow. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmsTerms;
