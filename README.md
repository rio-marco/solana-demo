# Solana SOL Deposit System Demo

## Installation & Setup Step-by-Step

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Platform & Sender Wallets

Run the wallet generator script to generate test keypairs and populate `.env`:

```bash
npm run create-wallet
```

This will automatically create/update your `.env` file with:
- `SOLANA_PLATFORM_PUBLIC_KEY` & `SOLANA_PLATFORM_PRIVATE_KEY` (Platform receiving address)
- `SOLANA_SENDER_PUBLIC_KEY` & `SOLANA_SENDER_PRIVATE_KEY` (Demo sender wallet)

### 3. Fund the Demo Sender Wallet (Solana Devnet SOL)

Request 1 SOL on Devnet:

```bash
npm run airdrop
```

*(Note: If Devnet RPC is rate-limited, you can also paste your Demo Sender address into the [Solana Devnet Faucet](https://faucet.solana.com/))*

### 4. Start Server

```bash
npm run dev
```

The application will launch on `http://localhost:3000`.

---

## Testing the Demo Flow

1. Open **http://localhost:3000** in your browser.
2. Click **`New Address`**:
   - Displays the **ONE** shared platform deposit address.
   - Subsequent clicks return the exact same receiving address.
3. Click **`Copy`** to verify clipboard copy functionality.
4. Enter a **Memo** (e.g., `TEST-USER-001`).
5. Enter an **Amount (SOL)** (e.g., `0.1`).
6. Click **`Deposit`**:
   - The backend constructs a Solana transaction containing a **SOL Transfer Instruction** AND an **SPL Memo Program Instruction**.
   - The transaction is signed and broadcasted to Solana Devnet.
   - The backend runs `verifyDepositTransaction()` against Solana RPC to verify destination, amount, and memo on-chain.
   - On success, the deposit card transitions to **`CONFIRMED`** with a link to Solana Explorer.
7. Click **`Get Balance`** outside the deposit card:
   - Queries Solana RPC directly to show the updated live SOL balance of the shared platform address.

---