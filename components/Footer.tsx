import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zen-cream/60 backdrop-blur py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between">
        <p className="font-medium">
          © {currentYear} Zensai • Journaling, but with a heart.
        </p>

        <nav className="flex gap-6 flex-wrap justify-center">
          <Link to="/privacy" className="text-sm text-gray-700 hover:underline">
            Privacy&nbsp;Policy
          </Link>
          <Link to="/terms" className="text-sm text-gray-700 hover:underline">
            Terms&nbsp;of&nbsp;Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}