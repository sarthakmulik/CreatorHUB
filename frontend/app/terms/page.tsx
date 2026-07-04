import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-mesh py-16 px-6">
      <div className="max-w-3xl mx-auto glass p-8 md:p-12 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-purple-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-[var(--text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using CreatorHub ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using the Service's specific services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Description of Service</h2>
            <p>
              CreatorHub provides creators with unified analytics, scheduling, and AI-powered insights for their connected social media accounts, including YouTube, Instagram, and TikTok. 
              The Service utilizes third-party APIs, including the YouTube Data API.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Third-Party Services</h2>
            <p>
              By connecting your YouTube account, you agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">YouTube Terms of Service</a>. 
              We are not responsible for the availability or content of these external sites, nor do we endorse, warrant, or guarantee the products, services, or information described or offered at these other internet sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Privacy Policy</h2>
            <p>
              Your use of the Service is also governed by our <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>. Please review it to understand our practices regarding your personal data and the data retrieved from third-party APIs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. User Conduct</h2>
            <p>
              You agree to use the Service only for lawful purposes. You agree not to take any action that might compromise the security of the Service, render the Service inaccessible to others or otherwise cause damage to the Service or the Content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
