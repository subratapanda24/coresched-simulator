import { GitHubLogoIcon } from "@radix-ui/react-icons";

export default function Footer() {
  return (
    <footer className="w-full py-4 text-center text-base">
      <h1>
        Built by{" "}
        <a
          href="https://github.com/subratapanda24"
          target="_blank"
          rel="noreferrer"
          className="underline inline-flex items-center gap-1"
        >
          <span>@subratapanda24</span>
          <GitHubLogoIcon className="h-5 w-5" />
        </a>
      </h1>
      <h2>
        <a
          href="https://github.com/subratapanda24"
          target="_blank"
          rel="noreferrer"
          className="underline inline-flex items-center gap-1"
        >
          Star this on Github⭐
        </a>
      </h2>
    </footer>
  );
}
