import Link from 'next/link';
import { ArrowRight, Shield, Smartphone, Clock, TrendingUp, ChevronRight } from 'lucide-react';

const PRODUCTS = [
  { name: 'Personal Loan', rate: 12.5, range: '5,000 – 500,000', icon: '👤' },
  { name: 'Business Loan', rate: 15, range: '5,000 – 500,000', icon: '🏢' },
  { name: 'Emergency Loan', rate: 18, range: '5,000 – 500,000', icon: '🚨' },
  { name: 'Education Loan', rate: 10, range: '5,000 – 500,000', icon: '🎓' },
  { name: 'Asset Financing', rate: 14, range: '5,000 – 500,000', icon: '🚗' },
];

const FEATURES = [
  { icon: Smartphone, title: 'Mobile Money', desc: 'Disbursed via M-Pesa, Airtel Money & more' },
  { icon: Clock, title: 'Fast Approval', desc: 'Get a decision within 24 hours' },
  { icon: Shield, title: 'Secure', desc: '256-bit encryption & data protection' },
  { icon: TrendingUp, title: 'Low Rates', desc: 'Starting from 10% p.a.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-mkopa-green">M-Kopa</span><span>Loans</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/apply" className="hover:text-mkopa-green transition">Apply</Link>
            <Link href="/dashboard" className="hover:text-mkopa-green transition">Dashboard</Link>
            <Link href="/login" className="hover:text-mkopa-green transition">Sign In</Link>
            <Link href="/signup" className="gradient-mkopa text-white px-4 py-2 rounded-lg font-semibold text-sm">Sign Up</Link>
          </div>
          <Link href="/signup" className="md:hidden gradient-mkopa text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-mkopa text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">Affordable Loans,<br />Your Way.</h1>
            <p className="mt-4 text-lg opacity-90 max-w-md">
              From KES 5,000 to 500,000 — personal, business, emergency & education loans with fast mobile money disbursement.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className="bg-mkopa-orange text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition">
                Sign In
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-5">
                <f.icon className="w-8 h-8 mb-2" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm opacity-80 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Loan Products</h2>
          <p className="text-gray-500 text-center mb-12">Choose the loan that fits your needs</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-mkopa-green font-semibold mt-1">{p.rate}% p.a.</p>
                <p className="text-gray-500 text-sm mt-1">KES {p.range}</p>
                <Link href="/signup" className="mt-4 inline-flex items-center text-sm text-mkopa-green font-semibold hover:underline">
                  Apply <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up with your email, phone number and set a password. It takes less than a minute.' },
              { step: '2', title: 'Apply & Upload KYC', desc: 'Choose your loan product, fill in details, and upload your identification documents securely.' },
              { step: '3', title: 'Get Funded', desc: 'Receive approval within 24 hours. Funds are disbursed directly to your M-Pesa or mobile money account.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 gradient-mkopa rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 gradient-mkopa text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ['15,000+', 'Customers Served'],
            ['KES 2B+', 'Loans Disbursed'],
            ['24hrs', 'Average Approval'],
            ['98%', 'Satisfaction Rate'],
          ].map(([n, l]) => (
            <div key={l}><div className="text-3xl font-bold">{n}</div><div className="text-sm opacity-80 mt-1">{l}</div></div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-500 mb-8">Create your free account and apply for a loan in minutes. No paperwork, no branch visits.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="gradient-mkopa text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="border border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="font-bold text-xl text-white mb-2"><span className="text-mkopa-green">M-Kopa</span> Loans</div>
            <p className="text-sm max-w-xs">Affordable digital lending for Kenya and Africa. Fast, secure, mobile-first.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="space-y-2">
              <Link href="/signup" className="block hover:text-white">Sign Up</Link>
              <Link href="/login" className="block hover:text-white">Sign In</Link>
              <Link href="/apply" className="block hover:text-white">Apply</Link>
              <Link href="/dashboard" className="block hover:text-white">Dashboard</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} M-Kopa Loans. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
