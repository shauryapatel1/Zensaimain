import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zen-cream/60 backdrop-blur py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between">
        <p className="font-medium">
          © {currentYear} Zensai • Your Mental Wellness Companion
        </p>

        <nav className="flex gap-6 flex-wrap justify-center">
          <Link href="/privacy" className="text-sm text-gray-700 hover:underline">
            Privacy&nbsp;Policy
          </Link>
          <Link href="/terms" className="text-sm text-gray-700 hover:underline">
            Terms&nbsp;of&nbsp;Service
          </Link>
          <a
            href="https://github.com/shauryapatel1/Zensai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://devpost.com/software/zensai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:underline"
          >
            Devpost
          </a>
        </nav>
      </div>
    </footer>
  );
}