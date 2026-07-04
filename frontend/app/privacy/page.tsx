import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mesh py-16 px-6">
      <div className="max-w-3xl mx-auto glass p-8 md:p-12 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-purple-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-[var(--text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to CreatorHub ("we", "our", or "us"). We respect your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Data We Collect</h2>
            <p>
              We collect information you provide directly to us (such as your name and email when creating an account). 
              If you connect third-party platforms like YouTube, Instagram, or TikTok, we collect performance analytics, video metadata, and subscriber counts from those platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use YouTube Data</h2>
            <p>
              Our Service uses the <strong>YouTube Data API</strong> to fetch analytics and video statistics for the channels you explicitly authorize. 
              We use this data exclusively to display your unified dashboard and generate AI insights for your channel's growth. 
              <br /><br />
              <strong>We do not:</strong>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Share your YouTube data with third parties.</li>
                <li>Sell your analytics or personal data.</li>
                <li>Modify your YouTube videos without your explicit permission (via scheduling).</li>
              </ul>
              <br />
              By using our service, you agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">YouTube Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Revoking Access</h2>
            <p>
              You can revoke CreatorHub's access to your YouTube account at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google Security Settings</a>. 
              Once revoked, we will no longer be able to fetch new data from your channel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
            <p>
              We retain your data only for as long as your account is active. If you delete your CreatorHub account, all associated third-party tokens and analytics data will be permanently deleted from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at sarthakmulik16@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
