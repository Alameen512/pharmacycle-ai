
import Link from 'next/link';
import { BrandMark } from '@/components/Brand';
import { Icon, Notice } from '@/components/ui';

const sections = [
  {
    number: '01',
    title: 'Using the service',
    body: 'PharmaCycle.AI is a tool for recording pharmacy stock and arranging transfers between pharmacies. Each pharmacy is responsible for the accuracy of what it records, for storing and handling medicines lawfully, and for any agreement it makes with another pharmacy. PharmaCycle.AI does not ship, inspect or guarantee medicines.',
  },
  {
    number: '02',
    title: 'Verification',
    body: 'Pharmacies start unverified. Verification is a manual check by the operator and is not a guarantee of licence status. A NAFDAC number stored in the app is only what the pharmacy entered; it is not validated against any official register.',
  },
  {
    number: '03',
    title: 'AI and OCR',
    body: 'AI insights and label reading are decision support. They can be wrong. They are not medical advice, and you should check results before acting on them.',
  },
  {
    number: '04',
    title: 'Data we hold',
    body: "Accounts (name, email, hashed password), pharmacy details, stock and sales records, transfer history, and alerts. Shoppers who search without an account are not asked for personal details. When AI features are on, summaries of a pharmacy's own stock and sales are sent to the AI provider; scanned label images are sent to the OCR provider if server OCR is enabled.",
  },
  {
    number: '05',
    title: 'Your choices',
    body: 'Contact the operator to correct or delete your account data.',
  },
];

export default function Legal() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="PharmaCycle home"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          >
            <BrandMark />
          </Link>

          <Link
            href="/signup"
            className="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            Create account
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-brand-700"
          >
            <Icon name="chevronDown" className="h-4 w-4 rotate-90" />
            Back to home
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="file" className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                PharmaCycle.AI
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Terms and privacy
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Understand how PharmaCycle works, the responsibilities of its
            users, and how account and pharmacy information is handled.
          </p>
        </div>

        <div className="mb-8">
          <Notice tone="orange">
            This is a plain-language starter draft written for the project,
            not reviewed legal advice. Have a Nigerian lawyer review it,
            including data-protection obligations under the NDPA, before
            you launch to real users.
          </Notice>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <section
              key={section.number}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                  {section.number}
                </span>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">
                    {section.title}
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {section.body}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Icon
              name="help"
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
            />

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Questions about your data?
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Contact the PharmaCycle operator for requests to correct or
                delete your account information.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            PharmaCycle.AI · Terms and privacy
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-brand-700"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Create account
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
