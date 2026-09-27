# Ground truth — 07-explainer-docker.md

Pre-registered 2026-07-10, before any benchmark arm ran.

| ID | Type | Claim (must survive) |
|----|------|----------------------|
| C1 | definition | A container is a lightweight, standalone, executable package including code, runtime, system tools, libraries, settings |
| C2 | comparative | Unlike VMs (which virtualize an entire OS), containers share the host OS kernel — and are therefore more efficient (direction: containers win on efficiency) |
| C3 | numbers | Containers start in milliseconds and consume megabytes of memory; VMs can take minutes to boot and require gigabytes of RAM (orders of magnitude must not shift) |
| C4 | definition | Image = read-only template/blueprint; container = running instance of an image |
| C5 | fact | Images are built in layers; each Dockerfile instruction creates a new layer |
| C6 | causal | Layering enables caching: unchanged layers are reused on rebuild, speeding up builds |
| C7 | fact | Each container runs in its own namespace: processes, network interfaces, file systems isolated from host and other containers |
| C8 | causal | Isolation → consistency across environments; same image runs identically on laptop, staging, production |
| C9 | reference | The "it works on my machine" problem is what this consistency solves |

## Hard-failure triggers
- C2 inverted or hedged into "containers and VMs are similar"
- Milliseconds/megabytes vs minutes/gigabytes contrast lost or units changed
- Image/container distinction blurred (calling an image "a running container")
- "Each instruction creates a new layer" weakened to "instructions can create layers"
- New technical facts added (e.g., specific Docker versions, cgroups details not in source)
