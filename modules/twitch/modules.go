package twitch

func (b *Bot) LoadModules() error {
	b.logger.Debug("starting timer module")
	b.Timers = SetupTimers(b)
	b.logger.Debug("starting alerts module")
	b.Alerts = SetupAlerts(b)
	return nil
}
