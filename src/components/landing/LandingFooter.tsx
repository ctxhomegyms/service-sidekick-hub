import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-heading text-lg">F</span>
              </div>
              <span className="font-heading text-xl text-white tracking-wide">
                FixAGym Field
              </span>
            </div>
            <p className="text-sidebar-foreground/70 max-w-md mb-6">
              The field service platform built for online fitness equipment retailers. 
              From warehouse to customer's home, we've got you covered.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-sidebar-foreground/60">
                <Mail className="w-4 h-4" />
                <span>hello@fixagym.com</span>
              </div>
              <div className="flex items-center gap-2 text-sidebar-foreground/60">
                <Phone className="w-4 h-4" />
                <span>(555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-heading text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link to="/request-pickup" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  Customer Pickup Form
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-heading text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/sms-terms" className="text-sidebar-foreground/70 hover:text-white transition-colors">
                  SMS Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-sidebar-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sidebar-foreground/50 text-sm">
            © {new Date().getFullYear()} FixAGym Field. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="text-sidebar-foreground/70 hover:text-white transition-colors text-sm">
              Sign In
            </Link>
            <a href="#pricing" className="text-primary hover:text-primary/80 transition-colors text-sm font-medium">
              Get Started
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
