# E2E Networks Cloud & TIR MCP Server

Production-ready [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server providing a complete abstraction layer between **Claude** (or any MCP-compatible AI client) and the **E2E Networks Cloud REST APIs** ([MyAccount](https://docs.e2enetworks.com/api/myaccount/) and [TIR AI/ML Platform](https://docs.e2enetworks.com/api/tir/)).

---

## 🏗️ Architecture & Integration Flow

```
┌─────────────────────────────────┐
│     Claude / AI Assistant       │
│  (Claude Desktop / Web / CLI)   │
└────────────────┬────────────────┘
                 │ MCP Protocol (JSON-RPC over Stdio or SSE)
                 ▼
┌─────────────────────────────────┐
│     E2E Networks MCP Server     │
│   • Request Validation (Zod)    │
│   • Auth & Project Scoping      │
│   • Multi-surface Routing       │
│   • Error Normalization         │
└────────────────┬────────────────┘
                 │ Authenticated HTTPS (API Key + Bearer Token)
                 ▼
┌─────────────────────────────────┐
│    E2E Networks REST APIs       │
│   • /myaccount/api/v1 (Cloud)   │
│   • /myaccount/api/v1/gpu (TIR) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       E2E Cloud Services        │
│ Nodes • GPUs • Storage • DBaaS  │
│ VPC • K8s • TIR AI Labs • SKUs  │
└─────────────────────────────────┘
```

---

## 🚀 Features

- **Dual Transport Support**:
  - **Stdio Mode**: Direct sub-process integration for local Claude Desktop, Claude Code, and Antigravity.
  - **Hosted HTTP / SSE Mode**: Standalone daemon with Server-Sent Events (`/sse`), message processing (`/messages`), health checks (`/health`), and a built-in Web Dashboard (`/`).
- **Comprehensive Cloud Coverage**:
  - **Compute & GPUs**: Provision, manage, reboot, snapshot, resize, and monitor compute nodes and GPU instances.
  - **Storage**: Block storage volumes, attached disks, SFS (shared file system), and EOS object storage buckets.
  - **Networking & Security**: VPCs, subnets, static public reserved IPs, firewalls, security groups, and load balancers (ALB/NLB).
  - **Databases (DBaaS)**: Managed MySQL, PostgreSQL, MariaDB, Kafka, Valkey, OpenSearch clusters.
  - **Kubernetes**: Managed clusters, node pool operations, and kubeconfig retrieval.
  - **TIR AI/ML Cloud**: AI Labs / Jupyter notebooks, NVIDIA GPU SKUs (H100, A100, L40S, L4, etc.), model endpoints, datasets, and distributed training clusters.
  - **Universal Raw Request Tool (`e2e_raw_request`)**: Allows Claude to call **any** of E2E's 450+ REST endpoints with automatic authentication and error handling.
- **Robust Authentication & Error Handling**: Automatically merges API keys, Bearer tokens, project IDs, and locations, translating API responses and error codes into clean, actionable feedback for Claude.

---

## 🛠️ MCP Tools Inventory

### 1. Compute & GPU Nodes (`src/tools/compute.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_nodes` | List all compute nodes and GPU instances with statuses, IPs, and configurations |
| `e2e_get_node` | Retrieve detailed specs, network interfaces, and disk info for a node |
| `e2e_create_node` | Launch a new compute or GPU instance (hourly on-demand or committed) |
| `e2e_node_action` | Perform lifecycle actions: `power_on`, `power_off`, `reboot`, `reinstall`, `rename`, `lock`, `unlock`, `save_images` |
| `e2e_delete_node` | Permanently terminate and delete a compute node |
| `e2e_list_plans` | List available compute hardware plans, CPU/RAM configurations, and pricing |
| `e2e_list_os_images` | List supported operating systems (Ubuntu, Debian, CentOS, Windows, etc.) |
| `e2e_get_node_health` | Retrieve CPU, memory, and disk health metrics for a node |

### 2. Storage (`src/tools/storage.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_volumes` | List all block storage volumes in the project |
| `e2e_create_volume` | Provision a block storage volume with specified size and IOPS |
| `e2e_attach_volume` | Attach an unattached block volume to a compute node |
| `e2e_detach_volume` | Detach a volume from a compute node |
| `e2e_delete_volume` | Delete an unattached block volume |
| `e2e_list_buckets` | List EOS (E2E Object Storage) S3-compatible buckets |
| `e2e_create_bucket` | Create a new object storage bucket |
| `e2e_delete_bucket` | Delete an empty object storage bucket |
| `e2e_list_sfs` | List Shared File System (SFS / EFS) instances |

### 3. Networking & Security (`src/tools/network.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_vpcs` | List Virtual Private Cloud networks |
| `e2e_create_vpc` | Create a new VPC network with custom or automatic CIDR |
| `e2e_delete_vpc` | Delete an existing VPC network |
| `e2e_list_reserved_ips` | List static public reserved IPs |
| `e2e_action_reserved_ip` | Attach, detach, or live-reserve a static public IP |
| `e2e_list_security_groups` | List attached or available security groups for a node |
| `e2e_attach_security_group` | Attach a security group to a node |
| `e2e_detach_security_group` | Detach a security group from a node |
| `e2e_list_load_balancers` | List Application and Network Load Balancers |

### 4. Managed Databases (`src/tools/database.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_databases` | List managed DBaaS database clusters (MySQL, PostgreSQL, MariaDB, etc.) |
| `e2e_get_database` | Get database cluster connection info, topology, and health |
| `e2e_create_database` | Provision a new managed database cluster |
| `e2e_database_action` | Execute actions: `start`, `stop`, `restart` |
| `e2e_list_database_plans` | List available database sizing plans and engine versions |

### 5. Managed Kubernetes (`src/tools/kubernetes.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_k8s_clusters` | List managed Kubernetes clusters |
| `e2e_get_k8s_cluster` | Get cluster details, API endpoint, and status |
| `e2e_list_k8s_node_pools` | List worker node pools associated with a cluster |

### 6. TIR AI/ML Cloud (`src/tools/tir.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_tir_list_notebooks` | List AI Labs and Jupyter notebook instances |
| `e2e_tir_create_notebook` | Launch an AI Lab notebook instance with GPU acceleration |
| `e2e_tir_notebook_action` | Control notebook lifecycle: `start`, `stop`, `reboot` |
| `e2e_tir_list_gpu_skus` | List available NVIDIA GPU hardware SKUs (H100, A100, L40S, L4, etc.) |
| `e2e_tir_list_model_endpoints` | List deployed AI/LLM model inference endpoints |
| `e2e_tir_list_datasets` | List AI training and fine-tuning datasets |
| `e2e_tir_list_training_clusters` | List managed Slurm / distributed training clusters |

### 7. Platform & Universal REST (`src/tools/platform.ts` & `src/tools/raw.ts`)
| Tool Name | Description |
| :--- | :--- |
| `e2e_list_projects` | List IAM projects and access control scopes |
| `e2e_get_billing_summary` | Get monthly estimated usage and billing transactions |
| `e2e_test_connection` | Verify authentication and API connectivity |
| `e2e_raw_request` | Execute direct HTTP requests against **any** of the 450+ E2E REST endpoints |

---

## ⚡ AWS-Style Profile Setup (Recommended)

Just like AWS uses `~/.aws/credentials` and `~/.aws/config` with named profiles (e.g. `[default]`, `[realbetter-account]`), the E2E MCP Server uses `~/.e2e/credentials` and `~/.e2e/config`.

### 1. Configure Credentials (like `aws configure`)
Run the interactive setup wizard:
```bash
# Configure default profile
node dist/index.js configure

# Or configure a specific named profile (e.g. realbetter-account)
node dist/index.js configure --profile realbetter-account
```
You can also set credentials non-interactively via flags:
```bash
node dist/index.js configure \
  --profile realbetter-account \
  --api-key YOUR_E2E_API_KEY \
  --auth-token YOUR_E2E_AUTH_TOKEN \
  --project-id 12345 \
  --location DEL-1
```
This stores your credentials securely in `~/.e2e/credentials` (with `0600` permissions) and configuration in `~/.e2e/config`.

### 2. One-Command Auto-Installation into Claude & Cursor
Just like `aws-mcp` is registered seamlessly in Claude Desktop and Cursor without hardcoding secrets:
```bash
# Auto-configure both Claude Desktop and Cursor
node dist/index.js install --profile realbetter-account
```
This automatically updates:
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json`
(creating automatic timestamped `.bak` backups before modifying).

---

## ⚙️ Alternative Configuration Methods (Environment Variables)

---

## 💻 Setup with Claude Desktop

### Option A: Local Stdio Mode (Recommended for Desktop)
Edit your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "e2e-cloud": {
      "command": "node",
      "args": ["/Users/vinaygupta/Desktop/Projects-Active/e2e-mcp/dist/index.js"],
      "env": {
        "E2E_API_KEY": "YOUR_API_KEY",
        "E2E_AUTH_TOKEN": "YOUR_AUTH_TOKEN",
        "E2E_PROJECT_ID": "YOUR_PROJECT_ID",
        "E2E_LOCATION": "DEL-1"
      }
    }
  }
}
```

### Option B: Hosted SSE Mode
If the server is running as a daemon on `http://localhost:3000`:

```json
{
  "mcpServers": {
    "e2e-cloud": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

---

## 🌐 Running in Hosted Mode

### Start as a Background Daemon
```bash
npm run serve
# or
node dist/index.js --http --port 3000
```

### Endpoints
- **Web Dashboard**: `http://localhost:3000/`
- **MCP SSE Stream**: `http://localhost:3000/sse`
- **MCP Messages Endpoint**: `http://localhost:3000/messages`
- **Health Check**: `http://localhost:3000/health`
- **Connectivity Test**: `http://localhost:3000/api/test`

---

## 🐳 Docker Deployment

Run with Docker:
```bash
docker build -t e2e-mcp-server .
docker run -d -p 3000:3000 --env-file .env e2e-mcp-server
```

Or with Docker Compose:
```bash
docker compose up -d
```

---

## 🧪 Testing

Run the included verification suite:
```bash
npm test
```
The test suite verifies:
- Configuration parsing and default propagation
- Tool registration and schemas
- Unauthenticated request rejection and helpful error messages
- Mock HTTP API request serialization, headers, query parameters, and project scoping
- TIR AI platform routing and error normalization

---

## 📄 License
Apache-2.0
