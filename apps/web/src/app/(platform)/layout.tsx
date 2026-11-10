import './workspace.css';

export default function PlatformLayout({ children }: { readonly children: React.ReactNode }) {
  return <div className="platform-ui">{children}</div>;
}
