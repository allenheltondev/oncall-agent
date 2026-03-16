# GitHub Authentication Setup Examples

## Interactive Setup

### Using Personal Access Token (Easiest)

```bash
$ bun run cli -- setup --modules github

Modules to configure (comma-separated: momento, teleport, identity, github, slack, llm) [all]: github
Profile [dev]: dev
GitHub owner [allenheltondev]: myorg
GitHub repo [oncall-agent]: my-service
GitHub base branch [main]: main
GitHub authentication method (pat/app) [pat]: pat
GitHub Personal Access Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

✓ Configuration written to .env
```

### Using GitHub App

```bash
$ bun run cli -- setup --modules github

Modules to configure (comma-separated: momento, teleport, identity, github, slack, llm) [all]: github
Profile [dev]: prod
GitHub owner [allenheltondev]: myorg
GitHub repo [oncall-agent]: my-service
GitHub base branch [main]: main
GitHub authentication method (pat/app) [pat]: app
GitHub App ID: 123456
GitHub App Installation ID: 789012
GitHub App Private Key (paste full PEM): -----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----

✓ Configuration written to .env
```

## Non-Interactive Setup

### With PAT

```bash
bun run cli -- setup --non-interactive \
  --modules github \
  --github-owner myorg \
  --github-repo my-service \
  --github-base-branch main \
  --github-token ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### With GitHub App

```bash
bun run cli -- setup --non-interactive \
  --modules github \
  --github-owner myorg \
  --github-repo my-service \
  --github-base-branch main \
  --github-app-id 123456 \
  --github-app-installation-id 789012 \
  --github-app-private-key "$(cat private-key.pem)"
```

## What Gets Written to .env

### PAT Configuration

```bash
GITHUB_OWNER=myorg
GITHUB_REPO=my-service
GITHUB_BASE_BRANCH=main
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### GitHub App Configuration

```bash
GITHUB_OWNER=myorg
GITHUB_REPO=my-service
GITHUB_BASE_BRANCH=main
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=789012
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"
```

## Switching Between Methods

You can switch at any time by re-running setup:

```bash
# Switch from PAT to GitHub App
bun run cli -- setup --modules github

# When prompted, choose 'app' instead of 'pat'
```

Or manually edit `.env`:

```bash
# Remove PAT
# GITHUB_TOKEN=ghp_xxx

# Add GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=789012
GITHUB_APP_PRIVATE_KEY="..."
```

## Validation

Check your configuration:

```bash
bun run cli -- doctor
```

This will verify:
- GitHub owner/repo are set
- Authentication method is configured (PAT or App)
- Credentials are valid (if possible to test)
