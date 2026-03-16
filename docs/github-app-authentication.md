# GitHub App Authentication & Workspace Management

The agent can now clone repos and authenticate as a GitHub App instead of using a personal access token.

## Why GitHub App?

**Benefits over PAT:**
- ✅ Unique identity - Shows as "[bot]oncall-agent" instead of your username
- ✅ Scoped permissions - Only access configured repos
- ✅ Better audit trail - Clear distinction between human and agent actions
- ✅ No user impersonation - Agent has its own identity
- ✅ Revocable per-installation - Can revoke access without affecting other apps

## Setup

### 1. Create GitHub App

1. Go to https://github.com/settings/apps (or your org settings)
2. Click "New GitHub App"
3. Fill in:
   - **Name**: `oncall-agent` (or your preferred name)
   - **Homepage URL**: Your repo URL
   - **Webhook**: Uncheck "Active" (not needed)
4. **Repository permissions**:
   - Contents: Read & write
   - Pull requests: Read & write
   - Metadata: Read-only
5. Click "Create GitHub App"

### 2. Generate Private Key

1. In your app settings, scroll to "Private keys"
2. Click "Generate a private key"
3. Save the downloaded `.pem` file

### 3. Install App

1. In app settings, click "Install App"
2. Select your account/org
3. Choose "Only select repositories" and pick your target repo
4. Click "Install"
5. Note the installation ID from the URL: `https://github.com/settings/installations/INSTALLATION_ID`

### 4. Configure Agent

Add to `.env`:

```bash
# GitHub App Authentication
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=789012
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"
```

**Or** use file path:
```bash
GITHUB_APP_PRIVATE_KEY=$(cat path/to/private-key.pem)
```

## Workspace Mode

When enabled, the agent:
1. Clones the configured repo to `.workspace/<owner>/<repo>`
2. Authenticates using GitHub App token
3. Performs all git operations in the workspace
4. Reuses the workspace on subsequent runs (fetches updates)

**Enable workspace mode:**
```bash
# Already enabled by default in runtime
# The agent passes useWorkspace: true automatically
```

**Workspace location:**
- Default: `.workspace/` in current directory
- Customizable via `WorkspaceOptions.baseDir`

## How GitHub App Token Generation Works

GitHub Apps use a two-step authentication process:

### Step 1: Generate JWT (JSON Web Token)

The agent creates a short-lived JWT signed with your app's private key:

```typescript
// 1. Load the RSA private key from your .pem file
const key = await importPKCS8(privateKey, "RS256");

// 2. Create a JWT with these claims:
const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "RS256" })     // Algorithm: RSA with SHA-256
  .setIssuedAt()                             // Current timestamp
  .setIssuer(appId)                          // Your GitHub App ID
  .setExpirationTime("10m")                  // Valid for 10 minutes
  .sign(key);                                // Sign with private key
```

**This JWT proves**: "I am GitHub App #123456 and I have the private key to prove it"

### Step 2: Exchange JWT for Installation Token

The agent sends the JWT to GitHub to get an installation access token:

```typescript
// 3. Call GitHub API with the JWT
POST https://api.github.com/app/installations/{installation_id}/access_tokens
Headers:
  Authorization: Bearer <JWT from step 1>
  Accept: application/vnd.github+json

// 4. GitHub responds with:
{
  "token": "ghs_16C7e42F292c6912E7710c838347Ae178B4a",
  "expires_at": "2026-03-13T16:53:00Z",
  "permissions": {
    "contents": "write",
    "pull_requests": "write"
  }
}
```

**This token**:
- ✅ Works like a PAT for git operations
- ✅ Scoped to only the repos where your app is installed
- ✅ Has only the permissions you configured in the app
- ✅ Expires after 1 hour (GitHub's default)
- ✅ Identifies as `[bot]oncall-agent` in commits/PRs

### Step 3: Use Token for Git Operations

```bash
# Agent configures git remote with the token
git remote set-url origin https://x-access-token:TOKEN@github.com/owner/repo.git

# Now all git operations authenticate as the app
git push origin my-branch
```

### Why This Is Secure

1. **Private key never leaves your server** - Only the JWT is sent to GitHub
2. **JWT expires in 10 minutes** - Can't be reused if intercepted
3. **Installation token expires in 1 hour** - Limited blast radius
4. **Tokens are generated fresh per operation** - No long-lived credentials
5. **Scoped to specific repos** - Can't access repos where app isn't installed

### Token Lifecycle

```
Agent starts remediation
    ↓
Generate JWT (10min TTL) using private key
    ↓
Exchange JWT for installation token (1hr TTL)
    ↓
Configure git with token
    ↓
Push branch & create PR
    ↓
Token expires (automatically cleaned up)
```

The agent generates a fresh token for each remediation operation, so you never have to worry about token rotation or expiration during normal operation.

## How It Works

```typescript
// 1. Agent starts processing incident
// 2. When remediation is needed:
const execution = await executeRemediationProposal(proposal, {
  config: this.config,           // Provides GitHub App credentials
  useWorkspace: true,             // Enables cloning
  openPullRequest: true,          // Creates PR
  expectedRepo: "owner/repo",     // Validates correct repo
  baseBranch: "main",
});

// Behind the scenes:
// 1. Clone/update repo to .workspace/owner/repo
// 2. Generate GitHub App installation token (1 hour TTL)
// 3. Configure git remote with token
// 4. Create branch, commit, push
// 5. Use `gh` CLI to create PR (authenticated as app)
```

## PR Attribution

PRs created by the agent will show:
- **Author**: `[bot]oncall-agent`
- **Committer**: `[bot]oncall-agent`

This makes it clear the changes came from automation, not a human developer.

## Fallback to PAT

If GitHub App is not configured, the agent falls back to:
1. Local git credentials (if running in a repo)
2. `gh` CLI authentication (uses your PAT)

## Security Notes

- Private key is sensitive - store securely
- Token expires after 1 hour (automatically refreshed per operation)
- App only has access to repos where it's installed
- Can be revoked at any time from GitHub settings

## Troubleshooting

**"GitHub App token request failed: 401"**
- Check `GITHUB_APP_ID` is correct
- Verify private key format (should include BEGIN/END markers)
- Ensure app is installed on the target repo

**"Repository binding mismatch"**
- Workspace repo doesn't match configured `GITHUB_OWNER/GITHUB_REPO`
- Delete `.workspace/` and let agent re-clone

**"gh pr create failed"**
- Ensure `gh` CLI is installed and authenticated
- GitHub App needs "Pull requests: Read & write" permission
