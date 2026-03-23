type InstallSwitcherProps = {
  exampleSlug?: string;
};

export function InstallSwitcher({ exampleSlug = "elon-musk" }: InstallSwitcherProps) {
  const command = `npx guildex install ${exampleSlug}`;

  return (
    <div className="install-switcher">
      <div className="install-switcher-row">
        <div className="stat">Install any AI talent in one shot:</div>
      </div>
      <div className="hero-install-code mono">{command}</div>
      <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#555", lineHeight: 1.6 }}>
        Use the slug (e.g. <span style={{ color: "#888" }}>elon-musk</span>) or full name in quotes (e.g. <span style={{ color: "#888" }}>"Elon Musk"</span>).
        Run <span style={{ color: "#888" }}>npx guildex list</span> to browse all available AI talent.
      </div>
    </div>
  );
}
