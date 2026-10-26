import Link from 'next/link';
import { BrandMark } from '@/components/Brand';
import { Notice } from '@/components/ui';

export default function Legal() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/"><BrandMark /></Link>
      <h1 className="mt-8 text-2xl font-semibold text-gray-900">Terms and privacy</h1>
      <div className="mt-4"><Notice tone="orange">This is a plain-language starter draft written for the project, not reviewed legal advice. Have a Nigerian lawyer review it, including data-protection obligations under the NDPA, before you launch to real users.</Notice></div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Using the service</h2>
          <p>PharmaCycle.AI is a tool for recording pharmacy stock and arranging transfers between pharmacies. Each pharmacy is responsible for the accuracy of what it records, for storing and handling medicines lawfully, and for any agreement it makes with another pharmacy. PharmaCycle.AI does not ship, inspect or guarantee medicines.</p>
        </section>
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Verification</h2>
          <p>Pharmacies start unverified. Verification is a manual check by the operator and is not a guarantee of licence status. A NAFDAC number stored in the app is only what the pharmacy entered; it is not validated against any official register.</p>
        </section>
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">AI and OCR</h2>
          <p>AI insights and label reading are decision support. They can be wrong. They are not medical advice, and you should check results before acting on them.</p>
        </section>
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Data we hold</h2>
          <p>Accounts (name, email, hashed password), pharmacy details, stock and sales records, transfer history, and alerts. Shoppers who search without an account are not asked for personal details. When AI features are on, summaries of a pharmacy&apos;s own stock and sales are sent to the AI provider; scanned label images are sent to the OCR provider if server OCR is enabled.</p>
        </section>
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Your choices</h2>
          <p>Contact the operator to correct or delete your account data.</p>
        </section>
      </div>
      <Link href="/signup" className="btn btn-secondary mt-8">Back to sign up</Link>
    </div>
  );
}
