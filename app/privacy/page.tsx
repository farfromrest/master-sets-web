export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-text-secondary">Last updated: June 24, 2026</p>
        </div>

        <p className="text-text-secondary">
          Master Setting is a Pokémon TCG master set tracker for iPhone. This policy explains what
          data the app collects and how it is used.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Account and authentication</h2>
          <p className="text-text-secondary">
            Master Setting uses Sign in with Apple for authentication. During sign-in, Apple may
            share your email address with the app. This email is stored by Supabase (our
            authentication provider) and used solely to identify your account. You can use
            Apple&apos;s &ldquo;Hide My Email&rdquo; feature to provide a relay address instead.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Collection data</h2>
          <p className="text-text-secondary">
            Your tracked sets and owned card records are stored in Supabase, a cloud database
            service. This data is linked to your account and synced across your devices. It is not
            shared with or accessible to other users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Card catalogue</h2>
          <p className="text-text-secondary">
            The list of available sets and their card data is fetched from Supabase Storage and
            cached locally on your device. These requests include your Supabase session token but
            contain no other personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Card images</h2>
          <p className="text-text-secondary">
            Card images are fetched from the Pokémon TCG API and scrydex.com, and cached locally on
            your device. These are standard HTTP requests for public image assets and contain no
            personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Analytics and advertising</h2>
          <p className="text-text-secondary">
            Master Setting does not include any analytics SDKs, advertising networks, or crash
            reporting services. No usage data is collected or transmitted beyond what is described
            above.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Third-party services</h2>
          <p className="text-text-secondary">
            Master Setting uses{' '}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-primary underline underline-offset-2 hover:text-brand-cyan transition-colors"
            >
              Supabase
            </a>{' '}
            for authentication and data storage. Supabase&apos;s privacy policy describes how they
            handle data on their infrastructure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Data deletion</h2>
          <p className="text-text-secondary">
            You can delete all your collection data from the app&apos;s Settings screen. To delete
            your account entirely, email{' '}
            <a
              href="mailto:derek@farfromrest.com"
              className="text-text-primary underline underline-offset-2 hover:text-brand-cyan transition-colors"
            >
              derek@farfromrest.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Children&apos;s privacy</h2>
          <p className="text-text-secondary">
            Master Setting does not knowingly collect personal information from anyone, including
            children under 13.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Changes to this policy</h2>
          <p className="text-text-secondary">
            If this policy changes, the updated version will be posted at this URL with a new
            effective date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="text-text-secondary">
            Questions about this privacy policy? Email{' '}
            <a
              href="mailto:derek@farfromrest.com"
              className="text-text-primary underline underline-offset-2 hover:text-brand-cyan transition-colors"
            >
              derek@farfromrest.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
