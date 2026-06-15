# Troubleshooting

## OneDrive keeps deleting source files (THIS IS THE MAIN ISSUE)

This project lives under `C:\Users\Priyanshu Gautam\OneDrive\Desktop\amazon project`. OneDrive's *Files On-Demand* feature has been quietly converting source files to "online-only", and the next.js dev server then can't read them — which causes the whole thing to stop working.

### Permanent fix (do this once)

**Right-click the project folder in File Explorer → "Always keep on this device"**.

This forces every file under the project to be a real file on disk, never an online-only placeholder. The cloud icon should turn into a green check mark.

### Even better fix

Move the project out of OneDrive entirely:

```powershell
Move-Item "C:\Users\Priyanshu Gautam\OneDrive\Desktop\amazon project" "C:\dev\amazon-pulse-now"
cd "C:\dev\amazon-pulse-now"
npm install
npm run dev
```

A folder like `C:\dev\` is not synced and won't have this problem.

### Verify nothing has been silently dropped

```powershell
# Required components
@(
  "components\HeroBanner.tsx",
  "components\MiniCart.tsx",
  "components\AIStatus.tsx",
  "lib\cart.tsx",
  "lib\aws\bedrockClient.ts",
  "lib\agents\chatAgent.ts",
  "lib\agents\guidedAgent.ts",
  "lib\agents\smartCartAgent.ts",
  "app\api\chat\route.ts",
  "app\api\guided\route.ts",
  "app\api\smart-cart\route.ts",
  "app\api\emergency-tiers\route.ts",
  "app\chat\page.tsx",
  "app\scan\page.tsx",
  "app\emergency\custom\page.tsx",
  "data\recipes.json",
  ".env.local"
) | ForEach-Object { "$_ : $((Test-Path $_))" }
```

If any returns `False`, OneDrive has eaten files again.

---

## Other issues

### "next is not recognized"
The `node_modules` folder was disturbed. Run `npm install` again.

### "Module not found: @aws-sdk/client-bedrock-runtime"
Same fix — `npm install`.

### Bedrock pill shows "Mock mode"
1. Make sure `.env.local` exists with the four `AWS_*` keys.
2. Restart the dev server (env files only load on start).
3. In the AWS Console, verify model access for `amazon.nova-lite-v1:0` is **Granted** in `us-east-1`.

### Port 3000 already in use
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Dev server caches stale errors
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```
