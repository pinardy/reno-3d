// Conventional Commits, enforced on commit-msg by the hook in .husky/commit-msg.
// ESM because package.json sets "type": "module".
//
// Everything else in config-conventional already matches this repo: the standard
// type set (feat, fix, docs, perf, refactor, test, build, ci, chore, style,
// revert), no trailing full stop, and header/body/footer lines capped at 100.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Default forbids sentence-case too, which rejects a subject opening with an
    // acronym — and three commits in this repo's history start with "HDB", the
    // domain this whole app is about. Lowercase is still the house style; this
    // only stops the linter arguing about "HDB" vs "hdb". Start-case, PascalCase
    // and SHOUTING are still rejected.
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
}
