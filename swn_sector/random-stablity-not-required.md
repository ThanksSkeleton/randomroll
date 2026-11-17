# Random Stability Is Not Required

During development of `swn_sector`, it is totally fine for updates to make the same seed return totally different results. The project is in v0: there are no consumers and no dependencies that require generated results to stay stable across updates.

This is an accepted development tradeoff, not a compatibility guarantee. See also the [SWN Sector milestone summary](CURRENT_DOCS/mega_spec.md) and [Milestone 0](CURRENT_DOCS/Milestone_0.md).
