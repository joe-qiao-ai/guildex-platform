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
    </div>
  );
}
