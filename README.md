# E2E Networks Cloud & TIR MCP Server

[![npm version](https://img.shields.io/npm/v/e2e-mcp.svg?color=cb3837)](https://www.npmjs.com/package/e2e-mcp)
[![npm downloads](https://img.shields.io/npm/dm/e2e-mcp.svg)](https://www.npmjs.com/package/e2e-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/vingupta3/e2e-mcp)](https://github.com/vingupta3/e2e-mcp/releases)

The official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **E2E Networks Cloud** and the **TIR AI/ML Platform**. 

Connect **Claude Desktop**, **Cursor**, **Google Antigravity**, and **Codex** directly to your E2E Cloud infrastructure to provision GPUs, manage nodes, control databases, orchestrate Kubernetes, and run AI workloads.

---

## ⚡ Quickstart (`npm install`)

### Step 1: Install globally via npm
```bash
npm install -g e2e-mcp
```

### Step 2: Configure your E2E credentials
Run the interactive setup wizard (like `aws configure`):
```bash
e2e-mcp configure
```
This prompts for:
* **E2E API Key** (from [MyAccount → Security / API Tokens](https://myaccount.e2enetworks.com))
* **E2E Auth Token** (Bearer token)
* **Default Location** (e.g. `DEL-1` or `NCR-1`)
* *Saved securely to `~/.e2e/credentials` (chmod 0600)*.

### Step 3: Auto-register with your AI Assistant
Automatically register the MCP server in Claude Desktop, Cursor, Google Antigravity, and Codex:
```bash
e2e-mcp install
```
Restart your AI assistant, and you're ready!

---

## 💻 Manual Setup in AI Assistants

If you prefer to configure your assistant's JSON file manually:

### 1. Claude Desktop
Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "e2e-cloud": {
      "command": "e2e-mcp"
    }
  }
}
```

> [!TIP]
> If you didn't run `e2e-mcp configure`, you can pass credentials directly in the `env` block:
> ```json
> "env": {
>   "E2E_API_KEY": "YOUR_API_KEY",
>   "E2E_AUTH_TOKEN": "YOUR_AUTH_TOKEN",
>   "E2E_PROJECT_ID": "YOUR_PROJECT_ID",
>   "E2E_LOCATION": "DEL-1"
> }
> ```

### 2. Cursor
Add to `.cursor/mcp.json` or Cursor Settings → MCP:
```json
{
  "mcpServers": {
    "e2e-cloud": {
      "command": "e2e-mcp"
    }
  }
}
```

### 3. Google Antigravity
Add to `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "e2e-cloud": {
      "command": "e2e-mcp"
    }
  }
}
```

---

## 🛠️ Available MCP Tools

Once connected, your AI assistant gains access to **40+ specialized cloud tools**:

### 🖥️ Compute & NVIDIA GPUs
* `e2e_list_nodes` — List all running VMs and GPU instances with IPs, plans, and regions.
* `e2e_get_node` — Get full technical specifications, network interfaces, and disk info for a node.
* `e2e_create_node` — Launch new compute or GPU instances on-demand.
* `e2e_node_action` — Control node lifecycle: `power_on`, `power_off`, `reboot`, `lock`, `unlock`.
* `e2e_delete_node` — Terminate and delete an instance.
* `e2e_list_plans` / `e2e_list_os_images` — Inspect hardware plans, pricing, and operating systems.
* `e2e_get_node_health` — Retrieve live CPU, memory, and disk health metrics.

### 🤖 TIR AI/ML Cloud
* `e2e_tir_list_gpu_skus` — List available NVIDIA GPU hardware (H100 SXM5, A100, L40S, L4).
* `e2e_tir_list_notebooks` / `e2e_tir_create_notebook` — Launch and manage Jupyter AI Labs.
* `e2e_tir_notebook_action` — Start, stop, or reboot AI Lab notebooks.
* `e2e_tir_list_model_endpoints` — Monitor deployed LLM inference endpoints.
* `e2e_tir_list_datasets` — Manage training and fine-tuning datasets.
* `e2e_tir_list_training_clusters` — Manage Slurm & distributed training clusters.

### 💾 Storage & Buckets
* `e2e_list_volumes` / `e2e_create_volume` — Manage block storage volumes (SSD/NVMe).
* `e2e_attach_volume` / `e2e_detach_volume` — Attach or detach block volumes to nodes.
* `e2e_list_buckets` / `e2e_create_bucket` — S3-compatible EOS Object Storage buckets.
* `e2e_list_sfs` — Shared File System (SFS/NFS) storage.

### 🌐 Networking & Security
* `e2e_list_vpcs` / `e2e_create_vpc` — Virtual Private Cloud networks and subnets.
* `e2e_list_reserved_ips` / `e2e_action_reserved_ip` — Manage static public IP addresses.
* `e2e_list_security_groups` — Inspect firewalls and security rules.
* `e2e_list_load_balancers` — Application and Network Load Balancers (ALB / NLB).

### 🗄️ Managed Databases (DBaaS)
* `e2e_list_databases` / `e2e_create_database` — Provision managed PostgreSQL, MySQL, MariaDB, Kafka.
* `e2e_get_database` / `e2e_database_action` — Cluster health, topologies, failover, start/stop.

### ☸️ Managed Kubernetes
* `e2e_list_k8s_clusters` / `e2e_get_k8s_cluster` — Inspect Kubernetes clusters and API endpoints.
* `e2e_list_k8s_node_pools` — Manage cluster worker node pools.

### 🌐 Universal REST Tool (`e2e_raw_request`)
* `e2e_raw_request` — Allows Claude to call **any** of E2E's 450+ REST endpoints with automatic authentication, region normalization, and error handling.

---

## ⚙️ Optional & Advanced Setups

<details>
<summary><b>1. Multiple Credential Profiles (AWS-Style)</b></summary>

You can maintain separate profiles (e.g. `[default]`, `[production]`, `[staging]`):
```bash
e2e-mcp configure --profile staging
e2e-mcp install --profile staging
```
Stored in `~/.e2e/credentials` and `~/.e2e/config`.
</details>

<details>
<summary><b>2. Hosted HTTP / SSE Daemon Mode</b></summary>

Run as a shared HTTP service with SSE and a built-in Web Dashboard:
```bash
e2e-mcp --http --port 3000
```
* **Dashboard**: `http://localhost:3000/`
* **SSE Endpoint**: `http://localhost:3000/sse`
* **Health Check**: `http://localhost:3000/health`
</details>

<details>
<summary><b>3. Docker & Docker Compose</b></summary>

```bash
docker run -d -p 3000:3000 \
  -e E2E_API_KEY="your_key" \
  -e E2E_AUTH_TOKEN="your_token" \
  ghcr.io/vingupta3/e2e-mcp:latest
```
</details>

<details>
<summary><b>4. Running from Source (Contributors)</b></summary>

```bash
git clone https://github.com/vingupta3/e2e-mcp.git
cd e2e-mcp
npm install
npm test
npm run build
```
See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidelines.
</details>

---

## 📄 License
[Apache 2.0](LICENSE) © 2026 Vinay Gupta
