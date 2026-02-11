type Props = {
  title: string;
  icon?: string;
  children: React.ReactNode;
};

export default function CommandCard({ title, icon, children }: Props) {
  return (
    <div className="command-card scanner">
      <h3 className="command-card-title">
        {icon && <span className="icon">{icon}</span>} {title}
      </h3>
      <div className="command-card-body">
        {children}
      </div>
    </div>
  );
}
