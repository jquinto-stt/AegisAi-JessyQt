# webiai kiro login

Wrapper command that instructs the user how to authenticate with Kiro CLI.

## Usage

```bash
webiai kiro login
```

## What It Does

Displays instructions to authenticate with Kiro CLI using the native `kiro-cli login` command.

This is a convenience wrapper that provides a consistent interface within the WebIAI CLI.

## Output

```bash
To authenticate with Kiro, run:

   kiro-cli login

This will open your browser to complete authentication.
```

## Actual Authentication

After running the command, execute:

```bash
kiro-cli login
```

This will:
1. Open your default browser
2. Navigate to the Kiro authentication page
3. Prompt you to sign in with your credentials
4. Complete the authentication flow
5. Store credentials locally

## Verify Authentication

After logging in, verify your authentication status:

```bash
kiro-cli whoami
```

Expected output when authenticated:
```bash
Logged in with IAM Identity Center (https://...)

Profile:
KiroProfile-us-east-1
arn:aws:codewhisperer:us-east-1:...
```

## When to Use

- After installing Kiro CLI for the first time
- When you see "⚠️ Not authenticated with Kiro" warnings
- After running `webiai kiro install --cli`
- When Kiro agents fail to work due to authentication issues

## Related Commands

- `webiai kiro install` — install Kiro agents (checks authentication)
- `webiai kiro install --cli` — install CLI + agents (checks authentication)
- `kiro-cli logout` — sign out from Kiro
- `kiro-cli whoami` — check authentication status

## Why a Wrapper?

This command exists to:
- Provide a consistent CLI experience within WebIAI
- Guide users to the correct authentication command
- Avoid confusion between `webiai` and `kiro-cli` commands
- Make authentication discoverable via `webiai kiro --help`
