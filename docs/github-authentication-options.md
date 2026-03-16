# GitHub Authentication Options

The agent supports three authentication methods, from easiest to most secure:

## Option 1: Personal Access Token (PAT) - Easiest ⭐

**Best for**: Getting started, testing, personal projects

### Setup (2 minutes)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `oncall-agent`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

7. Add to `.env`:
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Done!** The agent will use this token for all git operations.

### Pros & Cons

✅ **Pros:**
- Super simple setup
- Works immediately
- No extra configuration needed

❌ **Cons:**
- Shows as your username in commits/PRs
- Can't distinguish between you and the agent
- If compromised, has access to all your repos
- Expires (need to regenerate periodically)

---

## Option 2: Fine-Grained PAT - Better Security

**Best for**: Production use without GitHub App complexity

### Setup (3 minutes)

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Fill in:
   - **Name**: `oncall-agent`
   - **Expiration**: 90 days (or custom)
   - **Repository access**: Only select repositories → Choose your target repo
   - **Permissions**:
     - Contents: Read and write
     - Pull requests: Read and write
4. Click "Generate token"
5. Copy the token (starts with `github_pat_`)

6. Add to `.env`:
```bash
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Pros & Cons

✅ **Pros:**
- Scoped to specific repos
- Limited permissions
- Can set expiration
- Still simple to set up

❌ **Cons:**
- Still shows as your username
- Need to regenerate when expired

---

## Option 3: GitHub App - Production Grade 🏆

**Best for**: Production deployments, team environments, clear audit trails

### Why Use This?

- ✅ Shows as `[bot]oncall-agent` (unique identity)
- ✅ Never expires (tokens auto-refresh)
- ✅ Scoped to specific repos
- ✅ Can be installed org-wide
- ✅ Clear separation between human and agent actions
- ✅ Revocable without affecting other apps

### Setup (10 minutes)

See full guide: [github-app-authentication.md](./github-app-authentication.md)

**Quick summary:**
1. Create GitHub App
2. Generate private key
3. Install app on your repo
4. Configure agent with app ID, installation ID, and private key

---

## Which Should I Use?

| Scenario | Recommendation |
|----------|---------------|
| Just trying it out | **Option 1: Classic PAT** |
| Personal project | **Option 1 or 2: PAT** |
| Team/production | **Option 3: GitHub App** |
| Need unique bot identity | **Option 3: GitHub App** |
| Want simplest setup | **Option 1: Classic PAT** |

---

## How Authentication Works

All three options work the same way under the hood:

```bash
# Agent configures git remote with token
git remote set-url origin https://x-access-token:TOKEN@github.com/owner/repo.git

# All git operations use this token
git push origin remediation-branch
```

The difference is:
- **PAT**: Token is your personal token (shows as you)
- **Fine-grained PAT**: Token is scoped but still shows as you
- **GitHub App**: Token is generated per-operation and shows as `[bot]oncall-agent`

---

## Switching Between Methods

You can switch at any time by changing your `.env`:

```bash
# Using PAT
GITHUB_TOKEN=ghp_xxx

# Switch to GitHub App (remove GITHUB_TOKEN, add these)
# GITHUB_TOKEN=
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=789012
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
```

The agent automatically detects which method to use based on what's configured.
