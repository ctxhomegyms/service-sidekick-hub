import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-sidebar/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-heading text-sm sm:text-lg">F</span>
            </div>
            <span className="font-heading text-lg sm:text-xl text-white tracking-wide">
              FixAGym
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-sidebar-foreground/80 hover:text-white transition-colors text-sm font-medium"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sidebar-foreground/80 hover:text-white transition-colors text-sm font-medium"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-sidebar-foreground/80 hover:text-white transition-colors text-sm font-medium"
            >
              Pricing
            </button>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent">
                Log In
              </Button>
            </Link>
            <Button
              onClick={() => scrollToSection('pricing')}
              className="bg-primary hover:bg-primary/90"
            >
              Request Demo
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-sidebar border-t border-sidebar-border py-4 animate-fade-in">
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => scrollToSection('features')}
                className="text-sidebar-foreground/80 hover:text-white transition-colors py-3 px-4 text-left"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-sidebar-foreground/80 hover:text-white transition-colors py-3 px-4 text-left"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-sidebar-foreground/80 hover:text-white transition-colors py-3 px-4 text-left"
              >
                Pricing
              </button>
              <div className="border-t border-sidebar-border mt-2 pt-4 px-4 flex flex-col gap-2">
                <Link to="/auth">
                  <Button variant="outline" className="w-full border-sidebar-border text-sidebar-foreground">
                    Log In
                  </Button>
                </Link>
                <Button
                  onClick={() => scrollToSection('pricing')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Request Demo
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
