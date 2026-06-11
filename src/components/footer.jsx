import { Mail, Linkedin, Github, Instagram } from "lucide-react";

// Official X logo SVG component
const XIcon = ({ size = 18, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Footer() {
  const socialLinks = [
    {
      icon: Mail,
      label: "Mail",
      href: "mailto:pandasubrata024@gmail.com",
      isSvg: false,
    },
    {
      icon: Linkedin,
      label: "LinkedIn",
      href: "https://linkedin.com/in/subratapanda",
      isSvg: false,
    },
    {
      icon: XIcon,
      label: "X",
      href: "https://x.com/Subrata024",
      isSvg: true,
    },
    {
      icon: Github,
      label: "GitHub",
      href: "https://github.com/subratapanda24",
      isSvg: false,
    },
    {
      icon: Instagram,
      label: "Instagram",
      href: "https://instagram.com/_subrxta.u",
      isSvg: false,
    }
  ];

  return (
    <footer className="w-full flex justify-center py-6 px-4 bg-transparent select-none z-40">
      <div className="flex items-center gap-6 md:gap-7 px-6 py-3 rounded-full bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-2xl hover:border-zinc-700/80 transition-all duration-300">
        {socialLinks.map((link, index) => {
          const IconComponent = link.icon;
          return (
            <div key={index} className="group relative flex flex-col items-center">
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="relative flex items-center justify-center p-1 text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
                aria-label={link.label}
              >
                <IconComponent size={20} strokeWidth={link.isSvg ? 0 : 2} className="transition-colors" />
              </a>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-3.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                <div className="bg-zinc-900 border border-zinc-800 text-white text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap shadow-xl">
                  {link.label}
                </div>
                <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-800 transform rotate-45 -mt-1"></div>
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}


