// ── CONFIG ─────────────────────────────────────────────────────────────────────

const CONTRACT_ADDRESS = "0x2d67613c758b68e281785999bf2233883d1c25b0";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

// ── STATE ──────────────────────────────────────────────────────────────────────

let tokenDecimals = 18;
let provider;
let signer;
let contract;
let account;

// ── SETUP LISTENERS ────────────────────────────────────────────────────────────

document.getElementById("connectButton")
  .addEventListener("click", connectWallet);

document.getElementById("sendButton")
  .addEventListener("click", sendTokens);

// ── FUNCTIONS ──────────────────────────────────────────────────────────────────

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer   = await provider.getSigner();
    account  = await signer.getAddress();

    // Initialize contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, signer);

    // Fetch token decimals
    tokenDecimals = await contract.decimals();

    // Update UI
    document.getElementById("account")
      .innerText = `Connected: ${account}`;
    document.getElementById("transferSection")
      .style.display = "block";

    // Load balance
    getBalance();
  } catch (err) {
    console.error(err);
    alert("Failed to connect wallet.");
  }
}

async function getBalance() {
  try {
    const raw = await contract.balanceOf(account);
    const formatted = ethers.formatUnits(raw, tokenDecimals);
    document.getElementById("balance")
      .innerText = `Balance: ${formatted} Tokens`;
  } catch (err) {
    console.error(err);
    alert("Error fetching balance. Check network & contract address.");
  }
}

async function sendTokens() {
  const recipient = document.getElementById("recipient").value.trim();
  const amount    = document.getElementById("amount").value.trim();

  // Validate address
  if (!ethers.isAddress(recipient)) {
    alert("Invalid recipient address.");
    return;
  }

  // Prevent sending to the token contract itself
  if (recipient.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    alert("You cannot send tokens to the contract address.");
    return;
  }

  // Validate amount
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    alert("Enter a valid amount.");
    return;
  }

  try {
    // Build the correct value based on decimals
    const value = (tokenDecimals === 0)
      ? BigInt(amount)
      : ethers.parseUnits(amount, tokenDecimals);

    console.log(`Sending ${value} to ${recipient}`);

    // Send transaction (gas will be auto-estimated)
    const tx = await contract.transfer(recipient, value);
    console.log("Tx hash:", tx.hash);

    await tx.wait();
    alert("Transfer successful!");
    getBalance();
  } catch (err) {
    console.error(err);
    // Friendly error messages
    if (err.code === "INSUFFICIENT_FUNDS") {
      alert("Not enough tokens to send that amount.");
    } else if (err.message?.includes("execution reverted")) {
      alert("Transaction reverted. Check your balance & address.");
    } else {
      alert("Error while transferring: " + err.message);
    }
  }
}
